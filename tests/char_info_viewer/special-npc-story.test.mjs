import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sheetSource = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedDefaultSheet.vue', import.meta.url),
  'utf8',
);
const profileSource = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/IllustratedProfilePanel.vue', import.meta.url),
  'utf8',
);
const controllerSource = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/core/useIllustratedSheetController.ts', import.meta.url),
  'utf8',
);

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `缺少起始标记：${start}`);
  assert.notEqual(endIndex, -1, `缺少结束标记：${end}`);
  return source.slice(startIndex, endIndex);
}

test('立绘角色卡 档案只在有自定义故事时显示资料/故事二级切换，并保持六项主导航', () => {
  // tab 列表已归 core controller 所有，renderer 解构消费同一份六项主导航。
  assert.match(
    controllerSource,
    /const tabs = computed<IllustratedTab\[\]>\(\(\) => \[[\s\S]*?\{ key: 'overview', label: '首页' \},[\s\S]*?\{ key: 'characterPanel', label: '面板' \},[\s\S]*?\{ key: 'profile', label: '档案' \},[\s\S]*?\{ key: 'skills', label: '技能' \},[\s\S]*?\{ key: 'holdings', label: '持有' \},[\s\S]*?\{ key: 'divinity', label: '登神' \},[\s\S]*?\]\);/u,
  );
  assert.match(sheetSource, /^\s+tabs,$/mu);
  assert.match(sheetSource, /v-if="specialNpc && hasCustomStorySections"[\s\S]*?资料[\s\S]*?故事/u);
  assert.match(sheetSource, /@click="selectProfileSubview\('info'\)"/u);
  assert.match(sheetSource, /@click="selectProfileSubview\('story'\)"/u);
  assert.match(controllerSource, /const activeProfileSubview = ref<IllustratedProfileSubview>\('info'\)/u);
  assert.match(controllerSource, /if \(tab === 'profile'\) activeProfileSubview\.value = 'info';/u);
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
    controllerSource,
    /const profileFallbackBackstoryText = computed\(\(\) =>[\s\S]*?readSpecialNpc\(\) && !hasCustomStorySections\.value \? readVm\(\)\.backstoryText : ''/u,
  );
  assert.match(
    controllerSource,
    /hasCustomStorySections = computed\(\(\) => readSpecialNpc\(\) && readVm\(\)\.storySections\.length > 0\)/u,
  );
  assert.match(sheetSource, /^\s+profileFallbackBackstoryText,$/mu);
  assert.match(sheetSource, /^\s+hasCustomStorySections,$/mu);
  assert.match(sheetSource, /:backstory-text="profileFallbackBackstoryText"/u);
  assert.match(profileSource, /backstoryText\?: string/u);
  assert.match(profileSource, /\{ title: '背景故事', text: props\.backstoryText \}/u);
});

test('立绘角色卡 故事页复用 detail panels 整页滚动，并提供 mobile 可读排版', () => {
  assert.match(sheetSource, /\.illustrated-panels\s*\{[\s\S]*?overflow-y:\s*auto;/u);
  assert.match(
    sheetSource,
    /@mixin illustrated-mobile-content[\s\S]*?\.illustrated-profile-story-section\s*\{[\s\S]*?padding:\s*15px 14px;/u,
  );
  assert.match(
    sheetSource,
    /@mixin illustrated-mobile-content[\s\S]*?\.illustrated-profile-story-section p\s*\{[\s\S]*?font-size:\s*calc\(12px \+ var\(--ci-font-size-adjust, 0px\)\);[\s\S]*?line-height:\s*1\.78;/u,
  );
  assert.doesNotMatch(sheetSource, /\.illustrated-profile-story-section\s*\{[^}]*overflow-y:\s*(auto|scroll)/u);
});
