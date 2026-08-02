import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

test('点击角色封面先打开详情，而不是直接进入视觉编辑步骤', () => {
  assert.match(appSource, /@click="openCharacterDetails\(character\)"/);
  assert.match(appSource, /v-if="detailCharacter"/);
  assert.match(appSource, /角色条目内容/);
  assert.match(appSource, /\{\{ detailEntryBody \|\|/);
  assert.doesNotMatch(appSource, /v-html="detailEntryBody"/);
});

test('角色详情展示完整图库并支持图片、视频和备用源回退', () => {
  assert.match(
    appSource,
    /detailCharacterGallery\.value\s*\.filter\(image => resolveDetailGallerySources\(image\)\.length > 0\)/,
  );
  assert.match(appSource, /detailCharacterGallery\.value[\s\S]*?\.map\(\(image, index\)/);
  assert.match(appSource, /item\.media\?\.kind === 'video'/);
  assert.match(appSource, /@error="onDetailGalleryMediaError\(index\)"/);
  assert.match(appSource, /detailGallerySourceIndexes\[key\] = sourceIndex \+ 1/);
});

test('详情中的编辑按钮显式进入资料步骤，Esc 优先关闭详情', () => {
  assert.match(appSource, /@click="editDetailCharacter"/);
  assert.match(appSource, /goToStep\(2\)/);
  assert.match(
    appSource,
    /if \(detailCharacter\.value\) \{[\s\S]*?if \(editingDetailBody\.value\)[\s\S]*?closeCharacterDetails\(\)/,
  );
});

test('详情提供简单设定正文编辑，并按世界书名称和 UID 保存后读回验证', () => {
  assert.match(appSource, /@click="startDetailBodyEdit">编辑设定正文/);
  assert.match(appSource, /v-model="detailEntryDraft"/);
  assert.match(appSource, /replaceCharacterEntryBody\(/);
  assert.match(appSource, /updateWorldbookWith\(\s*worldbookName/);
  assert.match(appSource, /entry\.uid === character\.entry\.uid \? \{ \.\.\.entry, content: expectedContent \}/);
  assert.match(appSource, /savedEntry\.content !== expectedContent/);
});
