import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { normalizePortraitMediaUrlForBrowser } from '../../src/char_info_viewer/services/imageUrl.ts';

test('管理器预览保留 Catbox 静态图片原始 URL，避免绕过浏览器缓存', () => {
  const originalUrl = 'https://files.catbox.moe/nx2kd6.png';
  const previewUrl = normalizePortraitMediaUrlForBrowser(originalUrl)?.url ?? '';

  assert.equal(previewUrl, originalUrl);
});

test('管理器预览保留动态图片与其他图床的原始地址', () => {
  const animatedUrl = 'https://files.catbox.moe/animated.webp';
  const otherHostUrl = 'https://i.ibb.co/example/portrait.png';

  assert.equal(normalizePortraitMediaUrlForBrowser(animatedUrl)?.url, animatedUrl);
  assert.equal(normalizePortraitMediaUrlForBrowser(otherHostUrl)?.url, otherHostUrl);
});

test('管理器 WebM 默认暂停，只在 hover 或触屏操作时播放，并保证单实例播放', () => {
  const galleryStepSource = readFileSync(
    new URL('../../src/char_info_creator_manager/components/GalleryStep.vue', import.meta.url),
    'utf8',
  );

  assert.match(galleryStepSource, /normalizePortraitMediaUrlForBrowser\(value\)/);
  assert.match(galleryStepSource, /resolveGalleryPreviewMedia\(image\)/);
  assert.match(galleryStepSource, /<video[\s\S]*v-if="galleryPreviewMediaKind\(image\) === 'video'"[\s\S]*muted[\s\S]*loop[\s\S]*playsinline[\s\S]*preload="metadata"/u);
  assert.doesNotMatch(galleryStepSource, /\n\s+autoplay\s*\n/u);
  assert.match(galleryStepSource, /@pointerenter="onGalleryVideoPointerEnter\(image, \$event\)"/u);
  assert.match(galleryStepSource, /@pointerup="onGalleryVideoPointerUp\(image, \$event\)"/u);
  assert.match(galleryStepSource, /function pauseOtherGalleryVideos\(exceptImageId: number\)[\s\S]*?element\.pause\(\)/u);
  assert.match(galleryStepSource, /function playGalleryVideo\(image: EditableGalleryImage\)[\s\S]*?pauseOtherGalleryVideos\(image\.id\)[\s\S]*?element\.play\(\)/u);
  const observerBlock = galleryStepSource.slice(
    galleryStepSource.indexOf('function initializeGalleryPreviewObserver()'),
    galleryStepSource.indexOf('onMounted(initializeGalleryPreviewObserver)'),
  );
  assert.doesNotMatch(observerBlock, /playGalleryVideo|\.play\(/u);
  assert.match(observerBlock, /pauseGalleryVideo\(imageId\)/u);
  assert.match(galleryStepSource, /@loadeddata="onGalleryPreviewLoad\(image\)"/);
  assert.match(galleryStepSource, /@load="onGalleryPreviewLoad\(image\)"/);
  assert.match(galleryStepSource, /@error="onGalleryPreviewError\(image\)"/);
  assert.match(galleryStepSource, /nextMediaSourceIndex\(fromIndex, sources\.length\)/);
  assert.match(galleryStepSource, /@click="moveImageSource\(image, sourceIndex, -1\)"/);
  assert.match(galleryStepSource, /@click="moveImageSource\(image, sourceIndex, 1\)"/);
  assert.match(galleryStepSource, /\[CharInfo\]\[ImageFallback\]\[Creator\]/);
});

test('视频主立绘不会被写成头像，Creator 会继续使用可用静态图片', () => {
  const galleryStepSource = readFileSync(
    new URL('../../src/char_info_creator_manager/components/GalleryStep.vue', import.meta.url),
    'utf8',
  );
  const galleryEditorSource = readFileSync(
    new URL('../../src/char_info_creator_manager/galleryEditor.ts', import.meta.url),
    'utf8',
  );

  assert.match(galleryEditorSource, /function preferredStaticImageUrl[\s\S]*?media\?\.kind === 'image'/u);
  assert.match(galleryStepSource, /只列出静态图片；视频不会写入状态栏头像/u);
  assert.match(
    galleryStepSource,
    /if \(avatarMedia\?\.kind === 'video'\)[\s\S]*?firstStaticImage\(gallery\.value\)[\s\S]*?emit\('update:avatarUrl', preferredStaticImageUrl\(fallback\)\)/u,
  );
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

test('世界书角色库封面优先使用显式封面，并跳过视频继续查找静态图片', () => {
  const librarySource = readFileSync(
    new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
    'utf8',
  );

  assert.match(
    librarySource,
    /character\.profile\.coverUrl, character\.profile\.avatarUrl, \.\.\.character\.profile\.gallery\.flatMap\(image => image\.sources\)/u,
  );
  assert.match(librarySource, /media\?\.kind === 'image' \? \[media\.url\] : \[\]/u);
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
  const galleryStepSource = readFileSync(
    new URL('../../src/char_info_creator_manager/components/GalleryStep.vue', import.meta.url),
    'utf8',
  );

  assert.match(galleryStepSource, /href="https:\/\/catbox\.moe\/"/);
  assert.match(galleryStepSource, /href="https:\/\/imgbb\.com\/"/);
  assert.match(galleryStepSource, /target="_blank"\s+rel="noopener noreferrer"/);
  assert.doesNotMatch(galleryStepSource, /\/api\/files|uploadImage|uploadTo/);
});
