import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const librarySource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
  'utf8',
);

test('Viewer 玩家角色库提供紧凑列表与图片卡片视图', () => {
  assert.match(librarySource, /const layout = ref<'list' \| 'cards'>\('list'\)/u);
  assert.match(librarySource, /@click="layout = 'list'"/u);
  assert.match(librarySource, /@click="layout = 'cards'"/u);
  assert.match(librarySource, /class="character-library-layout-switch"/u);
  assert.match(librarySource, /'image-card-view': layout === 'cards'/u);
});

test('图片卡片自动适应桌面宽度，并在手机收束为单列', () => {
  assert.match(librarySource, /\.character-library-grid\.image-card-view \{ grid-template-columns: repeat\(auto-fit, minmax\(180px, 1fr\)\);/u);
  assert.match(librarySource, /\.character-library-grid\.image-card-view\.card-columns-6/u);
  assert.match(librarySource, /\.character-library-grid \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/u);
});

test('角色封面保留懒加载、备用地址回退与无图占位', () => {
  assert.match(librarySource, /loading="lazy"/u);
  assert.match(librarySource, /@error="advanceCover\(character\)"/u);
  assert.match(librarySource, /coverIndexes\[character\.entry\.uid\] = \(coverIndexes\[character\.entry\.uid\] \?\? 0\) \+ 1/u);
  assert.match(librarySource, /v-else class="character-cover-placeholder" aria-hidden="true"/u);
});

test('角色卡片正文按钮可以打开详情', () => {
  assert.match(librarySource, /class="character-library-card-copy"[\s\S]*?@click="openDetails\(character\)"/u);
  assert.match(librarySource, /class="character-detail-layer"/u);
});
