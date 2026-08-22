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

test('远程立绘只接受 HTTPS 且必须是明确支持的媒体格式', () => {
  assert.equal(normalizePortraitMediaUrlForBrowser('http://example.com/a.png'), null);
  assert.equal(normalizePortraitMediaUrlForBrowser('javascript:alert(1)'), null);
  assert.equal(normalizePortraitMediaUrlForBrowser('data:image/png;base64,AAAA'), null);
  assert.equal(normalizePortraitMediaUrlForBrowser('https://example.com/a.svg'), null);
  assert.equal(normalizePortraitMediaUrlForBrowser('https://example.com/a.html'), null);
  assert.equal(normalizePortraitMediaUrlForBrowser('https://example.com/file?id=1'), null);
  assert.equal(normalizePortraitMediaUrlForBrowser('https://user:pass@example.com/a.png'), null);
});

test('MP4 与 WebM 仍按视频处理', () => {
  for (const extension of ['mp4', 'webm']) {
    const url = `https://example.com/portrait.${extension}`;
    assert.deepEqual(normalizePortraitMediaUrlForBrowser(url), { url, kind: 'video' });
  }
});
