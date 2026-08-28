import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';

import { createEmptyProfile } from '../../src/char_info_shared/characterVisualProfile.ts';
import { buildCreatorViewerPreviewData, buildCreatorViewerPreviewYaml, buildCreatorViewerVisualOverride, normalizeCreatorViewerPastedText, resolveCreatorViewerPreviewYaml } from '../../src/char_info_creator_manager/viewerPreview.ts';

const profile = {
  ...createEmptyProfile('千爻'),
  raceColor: '#11AABB',
  tierColor: '#CC22DD',
  entranceQuote: '这是尚未保存的草稿台词。',
  galleryPackUrl: 'https://img.example.test/api/public/gallery/uika/qianyao',
  gallery: [{ title: '主立绘', sources: ['https://example.com/url0.png', 'https://example.com/url1.png'] }],
  metadata: {
    author: '测试作者',
    sex: '女',
    race: '东方龙裔',
    story_sections: [
      { title: '第一章', content: '第一段尚未保存的展示故事。' },
      { title: '第二章', content: '第二段尚未保存的展示故事。' },
    ],
  },
};

test('Creator Viewer 默认示例资料覆盖 Special NPC 每个分页所需的展示内容', () => {
  const direct = buildCreatorViewerPreviewData(profile);
  const parsed = load(buildCreatorViewerPreviewYaml(profile));

  assert.deepEqual(parsed, direct);
  assert.equal(direct.姓名, '千爻');
  assert.equal(parsed.姓名, '千爻');
  assert.equal(parsed.种族, '其他');
  assert.equal(parsed.等级, 1);
  assert.deepEqual(parsed.属性, { 力量: 10, 敏捷: 10, 体质: 10, 智力: 10, 精神: 10 });
  assert.ok(Array.isArray(parsed.身份) && parsed.身份.length > 0);
  assert.ok(Array.isArray(parsed.职业) && parsed.职业.length > 0);
  assert.ok(parsed.性格);
  assert.ok(Array.isArray(parsed.喜爱) && parsed.喜爱.length > 0);
  assert.ok(parsed.外貌特质);
  assert.ok(parsed.衣物装饰);
  assert.ok(Array.isArray(parsed.技能) && parsed.技能.length >= 2);
  assert.ok(Array.isArray(parsed.装备) && parsed.装备.length > 0);
  assert.ok(Array.isArray(parsed.道具) && parsed.道具.length > 0);
  assert.ok(Array.isArray(parsed.状态效果) && parsed.状态效果.length > 0);
  assert.ok(parsed.登神长阶?.神位);
  assert.ok(parsed.登神长阶?.神国?.名称);
  assert.ok(Array.isArray(parsed.登神长阶?.要素) && parsed.登神长阶.要素.length > 0);
  assert.ok(Array.isArray(parsed.登神长阶?.权能) && parsed.登神长阶.权能.length > 0);
  assert.ok(Array.isArray(parsed.登神长阶?.法则) && parsed.登神长阶.法则.length > 0);
});

test('Creator Viewer 预览直接使用未保存 draft 的颜色、台词和完整 fallback sources', () => {
  const override = buildCreatorViewerVisualOverride(profile);

  assert.equal(override.characterName, '千爻');
  assert.equal(override.config.custom_racecolor, '#11AABB');
  assert.equal(override.config.custom_tiercolor, '#CC22DD');
  assert.equal(override.config.登场台词, '这是尚未保存的草稿台词。');
  assert.equal(override.config.gallery_pack_url, 'https://img.example.test/api/public/gallery/uika/qianyao');
  assert.deepEqual(override.config.gallery, [{
    title: '主立绘',
    sources: ['https://example.com/url0.png', 'https://example.com/url1.png'],
  }]);
  assert.deepEqual(override.config.metadata, profile.metadata);
});

test('Creator Viewer 零 metadata 草稿保持干净，不制造空 metadata', () => {
  const emptyOverride = buildCreatorViewerVisualOverride(createEmptyProfile('空资料角色'));
  assert.equal(Object.hasOwn(emptyOverride.config, 'metadata'), false);
});

test('Creator Viewer 预览可直接使用完整 char_info 或纯 YAML 临时资料', () => {
  const wrapped = '<char_info>\n姓名: 千爻\n等级: 13\n</char_info>';
  assert.equal(normalizeCreatorViewerPastedText(wrapped), '姓名: 千爻\n等级: 13');
  assert.equal(normalizeCreatorViewerPastedText('姓名: 千爻\n等级: 13'), '姓名: 千爻\n等级: 13');
  assert.equal(resolveCreatorViewerPreviewYaml(profile, 'pasted', wrapped), '姓名: 千爻\n等级: 13');
});

test('Creator 挂载真实 Viewer 作为只读草稿预览，并隔离聊天视觉变量', async () => {
  const creatorSource = await readFile(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');
  const viewerSource = await readFile(new URL('../../src/char_info_viewer/App.vue', import.meta.url), 'utf8');

  assert.match(creatorSource, /import ViewerApp from '\.\.\/char_info_viewer\/App\.vue'/);
  assert.match(creatorSource, /<ViewerApp[\s\S]*embedded[\s\S]*read-only[\s\S]*preview-mode/);
  assert.match(creatorSource, /:preview-data="viewerPreviewSource === 'sample' \? viewerPreviewSampleData : undefined"/);
  assert.match(creatorSource, /:visual-config-override="viewerPreviewVisualOverride"/);
  assert.match(creatorSource, /v-model="viewerPreviewPastedText"/);
  assert.match(creatorSource, /完整 &lt;char_info&gt; 或纯 YAML/);
  assert.match(creatorSource, /resolveCreatorViewerPreviewYaml/);
  assert.match(viewerSource, /props\.previewMode[\s\S]*resolveRemoteGalleryConfig[\s\S]*resolveCharacterVisualPreview/);
  assert.match(viewerSource, /previewData\?: CharacterData/);
  assert.match(viewerSource, /\[\(\) => props\.yamlText, \(\) => props\.previewData, \(\) => props\.visualConfigOverride\]/);
  assert.match(viewerSource, /if \(props\.previewMode && props\.previewData\)[\s\S]*previewBaseData = props\.previewData;[\s\S]*applyParsedCharacterData/);
  assert.match(creatorSource, /updateViewerPreviewScale/);
  assert.match(creatorSource, /viewerPreviewMobileLayout/);
  assert.match(creatorSource, /if \(mobileLayout\) \{[\s\S]*viewerPreviewScale\.value = 1;[\s\S]*viewerPreviewCanvasWidth\.value = availableWidth;[\s\S]*return;/);
  assert.match(creatorSource, /viewerPreviewMobileLayout\.value[\s\S]*\? \{ width: '100%', transform: 'none' \}/);
  assert.match(creatorSource, /示例资料/);
  assert.match(creatorSource, /粘贴自己的 CharInfo/);
  assert.match(creatorSource, /粘贴完整 &lt;char_info&gt; 或纯 YAML 后，将在这里显示真实角色卡预览/);
  assert.doesNotMatch(creatorSource, /viewerPreviewScaleMode/);
  assert.doesNotMatch(creatorSource, /原始大小 100%|显示比例/);
  assert.match(creatorSource, /\.creator-viewer-preview\s*\{[\s\S]*position:\s*fixed;[\s\S]*width:\s*min\(1400px,[\s\S]*height:\s*calc\(100dvh - 24px\)/);
  assert.match(creatorSource, /\.creator-viewer-preview-canvas\s*\{[\s\S]*width:\s*1200px;[\s\S]*transform-origin:\s*top left;/);
  assert.match(creatorSource, /\.creator-viewer-preview-stage\s*\{[\s\S]*overflow:\s*hidden;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;/);
  assert.match(creatorSource, /@media \(max-width: 900px\)[\s\S]*\.creator-viewer-preview\s*\{[\s\S]*inset:\s*0;[\s\S]*width:\s*100%;[\s\S]*height:\s*100%;[\s\S]*max-width:\s*none;[\s\S]*max-height:\s*none;[\s\S]*transform:\s*none;/);
  assert.match(creatorSource, /@media \(max-width: 900px\)[\s\S]*\.creator-viewer-preview-stage\s*\{[\s\S]*overflow-x:\s*hidden;[\s\S]*overflow-y:\s*auto;[\s\S]*align-items:\s*flex-start;[\s\S]*justify-content:\s*flex-start;/);
});
