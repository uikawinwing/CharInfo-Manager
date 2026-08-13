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
  assert.match(appSource, /@load="onGalleryPreviewLoad\(image\)"/);
  assert.match(appSource, /@error="onGalleryPreviewError\(image\)"/);
  assert.match(appSource, /nextMediaSourceIndex\(fromIndex, sources\.length\)/);
  assert.match(appSource, /@click="moveImageSource\(image, sourceIndex, -1\)"/);
  assert.match(appSource, /@click="moveImageSource\(image, sourceIndex, 1\)"/);
  assert.match(appSource, /\[CharInfo\]\[ImageFallback\]\[Creator\]/);
  assert.match(appSource, /IntersectionObserver/u);
  assert.match(appSource, /image\.sources\[sourceIndex\]/);
});

test('Creator 在初始化资料前先建立编辑器状态', () => {
  const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');
  const profileInitialization = appSource.indexOf(
    'const profile = reactive<EditableProfile>(toEditableProfile(createEmptyProfile()));',
  );
  const requiredDeclarations = [
    "const activeStep = ref<StepId>(1);",
    "const furthestStep = ref<StepId>(1);",
    'const customizeColors = ref(false);',
    'const useExtendedGallery = ref(false);',
    "const galleryPackWorldbookName = ref('');",
    "const galleryPackId = ref('');",
    "const galleryProfileId = ref('');",
    'const loadingGalleryExtension = ref(false);',
    "const galleryExtensionMessage = ref('');",
    'const saving = ref(false);',
    "const saveState = ref<'idle' | 'success' | 'error'>('idle');",
    "const saveMessage = ref('选择世界书条目后即可写入。');",
    "const galleryPackDownloadMessage = ref('');",
    'let nextImageId = 1;',
  ];

  for (const declaration of requiredDeclarations) {
    const declarationIndex = appSource.indexOf(declaration);
    assert.notEqual(declarationIndex, -1, `缺少 Creator 编辑器状态：${declaration}`);
    assert.ok(declarationIndex < profileInitialization, `${declaration} 必须在创建初始资料前完成初始化`);
  }
});

test('Viewer 玩家角色封面依次尝试备用图床，全部失败后显示占位', () => {
  const librarySource = readFileSync(
    new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
    'utf8',
  );

  assert.match(librarySource, /:src="coverUrl\(character\)"/u);
  assert.match(librarySource, /@error="advanceCover\(character\)"/u);
  assert.match(librarySource, /coverIndexes\[character\.entry\.uid\] = \(coverIndexes\[character\.entry\.uid\] \?\? 0\) \+ 1/u);
  assert.match(librarySource, /return imageSources\(character\)\[coverIndexes\[character\.entry\.uid\] \?\? 0\] \?\? ''/u);
});

test('Viewer 玩家角色库保留紧凑列表与自适应图片卡片', () => {
  const librarySource = readFileSync(
    new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
    'utf8',
  );

  assert.match(librarySource, /const layout = ref<'list' \| 'cards'>\('list'\)/u);
  assert.match(librarySource, /图片卡片/u);
  assert.match(librarySource, /loading="lazy"/u);
  assert.match(librarySource, /\.character-library-grid\.image-card-view \{ grid-template-columns: repeat\(auto-fit/u);
  assert.match(librarySource, /\.character-library-grid \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/u);
});

test('相册步骤只提供外部图床快捷入口，不实现自动上传', () => {
  const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

  assert.match(appSource, /href="https:\/\/catbox\.moe\/"/);
  assert.match(appSource, /href="https:\/\/imgbb\.com\/"/);
  assert.match(appSource, /target="_blank"\s+rel="noopener noreferrer"/);
  assert.doesNotMatch(appSource, /\/api\/files|uploadImage|uploadTo/);
});
