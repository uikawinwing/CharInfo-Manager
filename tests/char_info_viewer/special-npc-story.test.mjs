import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sheetSource = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue', import.meta.url),
  'utf8',
);
const profileSource = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/IllustratedProfilePanel.vue', import.meta.url),
  'utf8',
);

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `缺少起始标记：${start}`);
  assert.notEqual(endIndex, -1, `缺少结束标记：${end}`);
  return source.slice(startIndex, endIndex);
}

test('Special NPC 档案只在有自定义故事时显示资料/故事二级切换，并保持六项主导航', () => {
  assert.match(
    sheetSource,
    /const tabs = computed<IllustratedTab\[\]>\(\(\) => \[[\s\S]*?\{ key: 'overview', label: '首页' \},[\s\S]*?\{ key: 'characterPanel', label: '面板' \},[\s\S]*?\{ key: 'profile', label: '档案' \},[\s\S]*?\{ key: 'skills', label: '技能' \},[\s\S]*?\{ key: 'holdings', label: '持有' \},[\s\S]*?\{ key: 'divinity', label: '登神' \},[\s\S]*?\]\);/u,
  );
  assert.match(sheetSource, /v-if="specialNpc && hasCustomStorySections"[\s\S]*?资料[\s\S]*?故事/u);
  assert.match(sheetSource, /const activeProfileSubview = ref<'info' \| 'story'>\('info'\)/u);
  assert.match(sheetSource, /if \(tab === 'profile'\) activeProfileSubview\.value = 'info';/u);
});

test('自定义故事严格使用 metadata story sections 和作者署名，不在故事视图重复原始 backstory', () => {
  const profileTemplate = sectionBetween(
    sheetSource,
    '<template v-else-if="activeSpecialTab === \'profile\'">',
    '<template v-else-if="activeSpecialTab === \'skills\'">',
  );
  const storyView = sectionBetween(profileTemplate, '<article v-else class="illustrated-profile-story-view">', '</article>');

  assert.match(storyView, /vm\.storyAuthorText/u);
  assert.match(storyView, /v-for="\(section, index\) in vm\.storySections"/u);
  assert.match(storyView, /\{\{ section\.title \}\}/u);
  assert.match(storyView, /\{\{ section\.content \}\}/u);
  assert.doesNotMatch(storyView, /vm\.backstoryText/u);
});

test('作者、版本和作者说明在资料页使用独立作者信息块，不混入角色设定卡', () => {
  assert.match(profileSource, /v-if="showCreatorMetadata" class="illustrated-creator-metadata"/u);
  assert.match(profileSource, /vm\.storyAuthorText/u);
  assert.match(profileSource, /vm\.profileVersionText/u);
  assert.match(profileSource, /vm\.authorNoteText/u);
  assert.match(
    profileSource,
    /const showCreatorMetadata = computed\([\s\S]*?!props\.showStats[\s\S]*?storyAuthorText[\s\S]*?profileVersionText[\s\S]*?authorNoteText/u,
  );
});

test('没有自定义故事时不显示二级切换，并把原始背景故事作为档案 fallback', () => {
  assert.match(
    sheetSource,
    /const profileFallbackBackstoryText = computed\(\(\) =>[\s\S]*?props\.specialNpc && !hasCustomStorySections\.value \? props\.vm\.backstoryText : ''/u,
  );
  assert.match(sheetSource, /:backstory-text="profileFallbackBackstoryText"/u);
  assert.match(profileSource, /backstoryText\?: string/u);
  assert.match(profileSource, /\{ title: '背景故事', text: props\.backstoryText \}/u);
});

test('Special NPC 故事页复用 detail panels 整页滚动，并提供 mobile 可读排版', () => {
  assert.match(sheetSource, /\.illustrated-panels\s*\{[\s\S]*?overflow-y:\s*auto;/u);
  assert.match(
    sheetSource,
    /@mixin illustrated-mobile-content[\s\S]*?\.illustrated-profile-story-section\s*\{[\s\S]*?padding:\s*15px 14px;/u,
  );
  assert.match(
    sheetSource,
    /@mixin illustrated-mobile-content[\s\S]*?\.illustrated-profile-story-section p\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?line-height:\s*1\.78;/u,
  );
  assert.doesNotMatch(sheetSource, /\.illustrated-profile-story-section\s*\{[^}]*overflow-y:\s*(auto|scroll)/u);
});
