import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const librarySource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
  'utf8',
);
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');

test('点击玩家角色库中的角色先打开 Viewer 详情', () => {
  assert.match(librarySource, /@click="openDetails\(character\)"/u);
  assert.match(librarySource, /v-if="detailCharacter"/u);
  assert.match(librarySource, /角色条目内容/u);
  assert.match(librarySource, /\{\{ detailEntryBody \|\|/u);
  assert.doesNotMatch(librarySource, /v-html="detailEntryBody"/u);
});

test('Viewer 详情展示图库并支持图片、视频和备用源回退', () => {
  assert.match(librarySource, /\.\.\.character\.profile\.gallery/u);
  assert.match(librarySource, /findGalleryPackEntry/u);
  assert.match(librarySource, /item\.media\?\.kind === 'video'/u);
  assert.match(librarySource, /@error="advanceDetailMedia\(item\.sourceIndex\)"/u);
  assert.match(librarySource, /detailGalleryIndexes\[key\] = \(detailGalleryIndexes\[key\] \?\? 0\) \+ 1/u);
});

test('只有编辑角色资料才从 Viewer 调用 Creator controller', () => {
  assert.match(
    librarySource,
    /@click="emit\('edit', selectedWorldbookName, detailCharacter\.entry\.uid\)"/u,
  );
  assert.match(runtimeSource, /openCreatorManager\(\{[\s\S]*?worldbookName,[\s\S]*?entryUid,[\s\S]*?forceMobileLayout:/u);
  assert.doesNotMatch(runtimeSource, /getCreatorManagerHostBridge|creatorManager\.open/u);
});

test('玩家详情保持世界书正文只读，不在 Viewer 中写角色资料', () => {
  assert.match(librarySource, /<h3 id="character-detail-content-title">角色条目内容<\/h3>[\s\S]*?<b>只读<\/b>/u);
  assert.doesNotMatch(librarySource, /replaceCharacterEntryBody/u);
  assert.doesNotMatch(librarySource, /v-model="detailEntryDraft"/u);
});
