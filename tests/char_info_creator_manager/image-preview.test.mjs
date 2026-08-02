import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { normalizePortraitMediaUrlForBrowser } from '../../src/char_info_viewer/services/imageUrl.ts';

test('管理器预览会代理 Catbox 静态图片', () => {
  const originalUrl = 'https://files.catbox.moe/nx2kd6.png';
  const previewUrl = normalizePortraitMediaUrlForBrowser(originalUrl)?.url ?? '';

  assert.match(previewUrl, /^https:\/\/wsrv\.nl\/\?url=/);
  assert.match(decodeURIComponent(previewUrl), /files\.catbox\.moe\/nx2kd6\.png/);
});

test('管理器预览保留动态图片与其他图床的原始地址', () => {
  const animatedUrl = 'https://files.catbox.moe/animated.webp';
  const otherHostUrl = 'https://i.ibb.co/example/portrait.png';

  assert.equal(normalizePortraitMediaUrlForBrowser(animatedUrl)?.url, animatedUrl);
  assert.equal(normalizePortraitMediaUrlForBrowser(otherHostUrl)?.url, otherHostUrl);
});

test('管理器相册预览使用统一的图片 URL 规范化函数', () => {
  const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

  assert.match(appSource, /normalizePortraitMediaUrlForBrowser\(value\)/);
  assert.match(appSource, /:src="resolveGalleryPreviewUrl\(image\)"/);
  assert.match(appSource, /@error="onGalleryPreviewError\(image\)"/);
  assert.match(appSource, /image\.sources\[sourceIndex\]/);
});

test('角色封面加载失败时依次尝试备用图床，全部失败后显示占位', () => {
  const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

  assert.match(appSource, /:src="resolveCharacterCoverUrl\(character\)"/);
  assert.match(appSource, /@error="onCharacterCoverError\(character\)"/);
  assert.match(appSource, /characterCoverSourceIndexes\[character\.entry\.uid\] = sourceIndex \+ 1/);
  assert.match(appSource, /return sources\[sourceIndex\] \?\? ''/);
});

test('角色库保留紧凑列表，并提供图片卡片与仅卡片视图可见的列数选择', () => {
  const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

  assert.match(appSource, /characterLibraryLayout = ref<CharacterLibraryLayout>\('compact'\)/);
  assert.match(appSource, /图片卡片/);
  assert.match(appSource, /v-if="characterLibraryLayout === 'cards'" class="character-card-columns"/);
  assert.match(appSource, /characterLibraryCardColumnOptions = \[2, 3, 4, 5, 6\]/);
  assert.match(appSource, /loading="lazy"/);
  assert.match(appSource, /未配置图片/);
  assert.match(appSource, /image-card-view \.character-cover-button[\s\S]*aspect-ratio: 4 \/ 5/);
  assert.match(appSource, /image-card-view\.card-columns-6[\s\S]*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(appSource, /image-card-view\.card-columns-6[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test('相册步骤只提供外部图床快捷入口，不实现自动上传', () => {
  const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

  assert.match(appSource, /href="https:\/\/catbox\.moe\/"/);
  assert.match(appSource, /href="https:\/\/imgbb\.com\/"/);
  assert.match(appSource, /target="_blank"\s+rel="noopener noreferrer"/);
  assert.doesNotMatch(appSource, /\/api\/files|uploadImage|uploadTo/);
});
