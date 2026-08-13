const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizePortraitMediaUrlForBrowser } = require('../../src/char_info_viewer/services/imageUrl.ts');

test('Catbox 动态 WebP、AVIF、GIF 和 APNG 保留原始 URL，避免代理压平动画帧', () => {
  for (const extension of ['webp', 'avif', 'gif', 'apng']) {
    const url = `https://files.catbox.moe/animated.${extension}`;
    assert.deepEqual(normalizePortraitMediaUrlForBrowser(url), {
      url,
      kind: 'image',
    });
  }
});

test('Catbox 静态立绘保留原始 URL，以复用浏览器缓存与作者 fallback 顺序', () => {
  const url = 'https://files.catbox.moe/static.png';
  const result = normalizePortraitMediaUrlForBrowser(url);

  assert.deepEqual(result, {
    url,
    kind: 'image',
  });
});
