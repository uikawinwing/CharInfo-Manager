import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

test('角色库保留紧凑列表，并提供可访问的图片卡片视图切换', () => {
  assert.match(appSource, /const characterLibraryLayout = ref<CharacterLibraryLayout>\('compact'\)/);
  assert.match(appSource, /aria-label="选择角色库显示方式"/);
  assert.match(appSource, /characterLibraryLayout === 'compact'/);
  assert.match(appSource, /characterLibraryLayout === 'cards'/);
  assert.match(appSource, /'image-card-view': characterLibraryLayout === 'cards'/);
});

test('图片卡片支持自动适应与 2 至 6 列，并在窄屏收束为两列', () => {
  assert.match(appSource, /const characterLibraryCardColumnOptions = \[2, 3, 4, 5, 6\]/);
  assert.match(appSource, /<option value="auto">自动适应<\/option>/);
  assert.match(appSource, /v-if="characterLibraryLayout === 'cards'" class="character-card-columns"/);
  assert.match(appSource, /\.character-library-grid\.image-card-view\.card-columns-6/);
  assert.match(appSource, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.doesNotMatch(
    appSource,
    /\.library-dialog \.character-library-grid\.image-card-view,[\s\S]*?\.library-dialog \.character-library-grid\.image-card-view\.card-columns-6\s*\{[\s\S]*?grid-template-columns: repeat\(2/u,
  );
});

test('图片卡片沿用封面懒加载与备用地址回退，并在无图时给出说明', () => {
  assert.match(appSource, /loading="lazy"/);
  assert.match(appSource, /@error="onCharacterCoverError\(character\)"/);
  assert.match(appSource, /characterCoverSourceIndexes\[character\.entry\.uid\] = sourceIndex \+ 1/);
  assert.match(appSource, /class="character-cover-placeholder" aria-hidden="true">[\s\S]*?character-cover-silhouette/u);
  assert.match(appSource, /class="visual-missing">未配置图片/u);
});

test('角色卡片正文也能打开详情，并提供键盘操作', () => {
  assert.match(
    appSource,
    /class="character-library-card-copy"[\s\S]*?role="button"[\s\S]*?tabindex="0"[\s\S]*?@click="openCharacterDetails\(character\)"/u,
  );
  assert.match(appSource, /@keydown\.enter\.prevent="openCharacterDetails\(character\)"/u);
  assert.match(appSource, /@keydown\.space\.prevent="openCharacterDetails\(character\)"/u);
});
