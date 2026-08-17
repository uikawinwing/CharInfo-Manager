const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const path = require('node:path');

const { preloadPortraitImages } = require('../../src/char_info_viewer/services/imagePreload.ts');
const { resolveCharacterVisualPreloadUrls } = require('../../src/char_info_viewer/services/themeService.ts');

const repoRoot = path.resolve(__dirname, '../..');
const preloadSource = readFileSync(path.join(repoRoot, 'src/char_info_viewer/services/imagePreload.ts'), 'utf8');
const runtimeSource = readFileSync(path.join(repoRoot, 'src/char_info_viewer_runtime/runtime.ts'), 'utf8');
const illustratedSource = readFileSync(
  path.join(repoRoot, 'src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue'),
  'utf8',
);

test('图片预载只温热浏览器正常缓存，不建立独立 Cache Storage 或改变跨域请求模式', () => {
  assert.match(preloadSource, /const MAX_CONCURRENT_PRELOADS = 4;/);
  assert.doesNotMatch(preloadSource, /caches\.open|CacheStorage|fetch\(/);
  assert.doesNotMatch(preloadSource, /crossOrigin/);
});

test('图片预载全局去重、限制四并发，并跳过视频资源', async () => {
  const originalImage = global.Image;
  const requests = [];
  let active = 0;
  let maxActive = 0;

  class FakeImage {
    set src(value) {
      requests.push(value);
      active += 1;
      maxActive = Math.max(maxActive, active);
      setTimeout(() => {
        active -= 1;
        this.onload?.();
      }, 5);
    }
  }

  global.Image = FakeImage;
  try {
    const images = Array.from({ length: 7 }, (_, index) => `https://example.com/preload-${index}.png`);
    await preloadPortraitImages([...images, images[2], 'https://example.com/skip-video.mp4']);
    assert.deepEqual(requests.sort(), images.sort());
    assert.ok(maxActive <= 4, `expected at most 4 concurrent preloads, saw ${maxActive}`);

    await preloadPortraitImages(images);
    assert.equal(requests.length, images.length, 'already warmed URLs should not be requested again');
  } finally {
    global.Image = originalImage;
  }
});

test('角色视觉预载沿用 source priority，并只选择每张图的首选来源', () => {
  const chatVariables = {
    char_info: {
      profiles: {
        千爻: {
          schema_version: 2,
          url: 'https://main.example/primary.png',
          gallery: [
            {
              sources: ['https://slow.example/gallery-1.png', 'https://fast.example/gallery-1.png'],
            },
            {
              sources: ['https://slow.example/gallery-2.png', 'https://fast.example/gallery-2.png'],
            },
          ],
        },
      },
    },
  };

  assert.deepEqual(resolveCharacterVisualPreloadUrls('千爻', chatVariables, 3, ['fast.example']), [
    'https://main.example/primary.png',
    'https://fast.example/gallery-1.png',
    'https://fast.example/gallery-2.png',
  ]);
});

test('当前角色库和立绘 Viewer 只做小窗口预热，不扫描完整图库', () => {
  assert.match(runtimeSource, /characters\.slice\(0, 8\)/);
  assert.match(runtimeSource, /resolveCharacterVisualPreloadUrls\(character\.name, chatVariables, 1, sourcePriorities\)/);
  assert.match(runtimeSource, /resolveCharacterVisualPreloadUrls\(name, chatVariables, 3, sourcePriorities\)/);
  assert.match(illustratedSource, /activePortraitIndex\.value - 1/);
  assert.match(illustratedSource, /activePortraitIndex\.value \+ 1/);
  assert.match(illustratedSource, /void preloadPortraitImages\(urls\)/);
});
