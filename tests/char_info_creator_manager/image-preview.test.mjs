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
  assert.match(appSource, /:src="resolveGalleryPreviewUrl\(image\.url\)"/);
});
