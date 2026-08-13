import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';

import { buildManagedEjsBlock, createEmptyProfile } from '../../src/char_info_shared/characterVisualProfile.ts';
import { buildCreatorViewerPreviewYaml, buildCreatorViewerVisualOverride } from '../../src/char_info_creator_manager/viewerPreview.ts';

const profile = {
  ...createEmptyProfile('千爻'),
  raceColor: '#11AABB',
  tierColor: '#CC22DD',
  entranceQuote: '这是尚未保存的草稿台词。',
  gallery: [{ title: '主立绘', sources: ['https://example.com/url0.png', 'https://example.com/url1.png'] }],
};

test('Creator Viewer 预览使用最小角色骨架，不把世界书 EJS 当成 Viewer 正文', () => {
  const entry = {
    name: '[DLC][角色]千爻',
    content: `姓名: 千爻\n种族: 天舞龙\n身份: 游历者\n${buildManagedEjsBlock(profile)}\n<%_ const outside = true; _%>`,
  };
  const parsed = load(buildCreatorViewerPreviewYaml(entry, profile));

  assert.equal(parsed.姓名, '千爻');
  assert.equal(parsed.种族, '天舞龙');
  assert.equal(parsed.身份, '游历者');
  assert.deepEqual(parsed.属性, { 力量: 10, 敏捷: 10, 体质: 10, 智力: 10, 精神: 10 });
  assert.equal(JSON.stringify(parsed).includes('outside'), false);
});

test('Creator Viewer 预览直接使用未保存 draft 的颜色、台词和完整 fallback sources', () => {
  const override = buildCreatorViewerVisualOverride(profile);

  assert.equal(override.characterName, '千爻');
  assert.equal(override.config.custom_racecolor, '#11AABB');
  assert.equal(override.config.custom_tiercolor, '#CC22DD');
  assert.equal(override.config.登场台词, '这是尚未保存的草稿台词。');
  assert.deepEqual(override.config.gallery, [{
    title: '主立绘',
    sources: ['https://example.com/url0.png', 'https://example.com/url1.png'],
  }]);
});

test('Creator 挂载真实 Viewer 作为只读草稿预览，并隔离聊天变量与 DX 自动注入', async () => {
  const creatorSource = await readFile(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');
  const viewerSource = await readFile(new URL('../../src/char_info_viewer/App.vue', import.meta.url), 'utf8');

  assert.match(creatorSource, /import ViewerApp from '\.\.\/char_info_viewer\/App\.vue'/);
  assert.match(creatorSource, /<ViewerApp[\s\S]*embedded[\s\S]*read-only[\s\S]*preview-mode/);
  assert.match(creatorSource, /:visual-config-override="viewerPreviewVisualOverride"/);
  assert.match(viewerSource, /props\.previewMode[\s\S]*resolveCharacterVisualPreview/);
  assert.match(viewerSource, /if \(props\.previewMode \|\| props\.readOnly\) return;/);
  assert.match(viewerSource, /watch\([\s\S]*props\.visualConfigOverride[\s\S]*previewBaseData/);
});
