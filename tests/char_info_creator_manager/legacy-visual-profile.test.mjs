import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildCreatorViewerVisualOverride } from '../../src/char_info_creator_manager/viewerPreview.ts';
import { inspectLegacyVisualProfile } from '../../src/char_info_shared/legacyVisualProfile.ts';

function assertImportable(inspection) {
  assert.equal(inspection.state, 'importable');
  return inspection;
}

test('直接 char_info_visuals[姓名] 静态配置会按新 profile 规则导入并保持 URL 顺序去重', () => {
  const source = `条目前文
<%_
setLocalVar('char_info_visuals["傲雪"]', {
  url: 'https://files.catbox.moe/main.webp',
  gallery: [
    'https://files.catbox.moe/main.webp',
    'https://files.catbox.moe/alternate.webp',
    'http://unsafe.example.com/ignored.webp',
  ],
  custom_racecolor: '#a9dbc3',
  custom_tiercolor: 'b7d9e8',
  登场台词: '霜雪会记住每一道剑痕。',
  legacy_only: '不会被转换',
});
_%>
条目后文`;

  const inspection = assertImportable(inspectLegacyVisualProfile(source, '傲雪'));
  assert.equal(inspection.characterName, '傲雪');
  assert.equal(inspection.profile.avatarUrl, '');
  assert.equal(inspection.profile.raceColor, '#A9DBC3');
  assert.equal(inspection.profile.tierColor, '#B7D9E8');
  assert.equal(inspection.profile.entranceQuote, '霜雪会记住每一道剑痕。');
  assert.deepEqual(inspection.profile.gallery, [
    { title: '主立绘', sources: ['https://files.catbox.moe/main.webp'] },
    { title: '备用立绘 2', sources: ['https://files.catbox.moe/alternate.webp'] },
  ]);
  assert.match(inspection.warnings.join('\n'), /HTTP|HTTPS/);
  assert.match(inspection.warnings.join('\n'), /legacy_only/);
  assert.equal(source.slice(inspection.start, inspection.end).startsWith('setLocalVar('), true);
  assert.equal(source.slice(inspection.start, inspection.end).endsWith(';'), true);
});

test('等价的单双引号 bracket path 可以静态识别', () => {
  const source = `setLocalVar("char_info_visuals['傲雪']", {
    gallery: ['https://files.catbox.moe/snow.webp'],
  });`;
  const inspection = assertImportable(inspectLegacyVisualProfile(source, '傲雪'));
  assert.equal(inspection.profile.gallery[0].sources[0], 'https://files.catbox.moe/snow.webp');
});

test('gallery-only 会把第一张有效图片设为主立绘并提示旧随机首图行为变化', () => {
  const source = `setLocalVar('char_info_visuals["傲雪"]', {
    gallery: [
      'https://files.catbox.moe/one.webp',
      'https://files.catbox.moe/two.webp',
    ],
  });`;
  const inspection = assertImportable(inspectLegacyVisualProfile(source, '傲雪'));
  assert.deepEqual(
    inspection.profile.gallery.map(image => image.sources[0]),
    ['https://files.catbox.moe/one.webp', 'https://files.catbox.moe/two.webp'],
  );
  assert.match(inspection.warnings.join('\n'), /随机显示首图/);
});

test('旧配置姓名必须与当前选中角色精确一致', () => {
  const source = `setLocalVar('char_info_visuals["傲雪"]', {
    url: 'https://files.catbox.moe/main.webp',
  });`;
  const inspection = inspectLegacyVisualProfile(source, '凌霜');
  assert.equal(inspection.state, 'unsupported');
  assert.match(inspection.reason, /傲雪.*凌霜|凌霜.*傲雪/);
});

test('动态路径、动态对象值与多个冲突 assignment 全部保持 blocked', () => {
  const dynamicPath = "setLocalVar(`char_info_visuals[${name}]`, { url: 'https://files.catbox.moe/main.webp' });";
  const dynamicValue = `setLocalVar('char_info_visuals["傲雪"]', { url: getPortraitUrl() });`;
  const multiple = `
setLocalVar('char_info_visuals["傲雪"]', { url: 'https://files.catbox.moe/one.webp' });
setLocalVar('char_info_visuals["傲雪"]', { url: 'https://files.catbox.moe/two.webp' });`;

  for (const source of [dynamicPath, dynamicValue, multiple]) {
    const inspection = inspectLegacyVisualProfile(source, '傲雪');
    assert.equal(inspection.state, 'unsupported');
  }
});

test('只有不安全 URL 时不会生成可迁移 profile', () => {
  const source = `setLocalVar('char_info_visuals["傲雪"]', {
    url: 'http://example.com/main.webp',
    gallery: ['javascript:alert(1)'],
  });`;
  const inspection = inspectLegacyVisualProfile(source, '傲雪');
  assert.equal(inspection.state, 'unsupported');
  assert.match(inspection.reason, /没有可迁移的有效 HTTPS/);
});

test('importer 不执行旧 EJS 或对象表达式', () => {
  globalThis.__charInfoLegacyImporterExecuted = false;
  const source = `<%_
setLocalVar('char_info_visuals["傲雪"]', {
  url: (() => {
    globalThis.__charInfoLegacyImporterExecuted = true;
    return 'https://files.catbox.moe/main.webp';
  })(),
});
_%>`;

  const inspection = inspectLegacyVisualProfile(source, '傲雪');
  assert.equal(inspection.state, 'unsupported');
  assert.equal(globalThis.__charInfoLegacyImporterExecuted, false);
  delete globalThis.__charInfoLegacyImporterExecuted;
});

test('可迁移 draft 可以直接进入现有 Creator Viewer Preview 视觉 override', () => {
  const source = `setLocalVar('char_info_visuals["傲雪"]', {
    url: 'https://files.catbox.moe/main.webp',
    custom_racecolor: '#112233',
    custom_tiercolor: '#445566',
    登场台词: '旧配置预填台词',
  });`;
  const inspection = assertImportable(inspectLegacyVisualProfile(source, '傲雪'));
  const override = buildCreatorViewerVisualOverride(inspection.profile);

  assert.equal(override.characterName, '傲雪');
  assert.equal(override.config.custom_racecolor, '#112233');
  assert.equal(override.config.custom_tiercolor, '#445566');
  assert.equal(override.config.登场台词, '旧配置预填台词');
  assert.deepEqual(override.config.gallery, [{ title: '主立绘', sources: ['https://files.catbox.moe/main.webp'] }]);
});

test('Creator 将 importable legacy 预填进 draft，但 checkpoint 2 仍阻止直接保存', async () => {
  const creatorSource = await readFile(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

  assert.match(creatorSource, /inspectLegacyVisualProfile/);
  assert.match(creatorSource, /legacyVisualInspection\.value\.state === 'importable'/);
  assert.match(creatorSource, /replaceProfile\(legacyInspection\.profile\)/);
  assert.match(creatorSource, /已从旧版 char_info_visuals 安全预填；当前世界书尚未修改/);
  assert.match(creatorSource, /class="migration-banner"/);
  assert.match(creatorSource, /hasLegacyVisualEjs\.value,[\s\S]*\);[\s\S]*const canSave/);
});
