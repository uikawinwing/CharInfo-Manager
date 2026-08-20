import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isViewerVisible,
  preferredStaticImageUrl,
  setMainViewerImage,
  setViewerVisibility,
} from '../../src/char_info_creator_manager/galleryEditor.ts';

function image(id, url, viewerVisible) {
  return {
    id,
    title: `图片 ${id}`,
    sources: [url],
    previewSourceIndex: 0,
    ...(viewerVisible === false ? { viewerVisible: false } : {}),
  };
}

test('批量用途可以把选中图片设为仅相册，并阻止隐藏最后一张 Viewer 立绘', () => {
  const gallery = [
    image(1, 'https://example.com/main.webp'),
    image(2, 'https://example.com/album.webp'),
    image(3, 'https://example.com/extra.webp'),
  ];

  assert.equal(setViewerVisibility(gallery, [2, 3], false), true);
  assert.equal(isViewerVisible(gallery[0]), true);
  assert.equal(isViewerVisible(gallery[1]), false);
  assert.equal(isViewerVisible(gallery[2]), false);

  assert.equal(setViewerVisibility(gallery, [1], false), false);
  assert.equal(isViewerVisible(gallery[0]), true);
});

test('重新设为 Viewer + 相册会移除显式隐藏标记', () => {
  const gallery = [image(1, 'https://example.com/main.webp'), image(2, 'https://example.com/album.webp', false)];

  assert.equal(setViewerVisibility(gallery, [2], true), true);
  assert.equal(gallery[1].viewerVisible, undefined);
  assert.equal(isViewerVisible(gallery[1]), true);
});

test('选择主立绘只调整 Viewer 顺序，并自动让目标图重新参与 Viewer', () => {
  const gallery = [
    image(1, 'https://example.com/one.webp'),
    image(2, 'https://example.com/two.webp', false),
    image(3, 'https://example.com/three.webp'),
  ];

  setMainViewerImage(gallery, 2);

  assert.equal(gallery[0].id, 2);
  assert.equal(gallery[0].viewerVisible, undefined);
  assert.deepEqual(
    gallery.map(item => item.id),
    [2, 1, 3],
  );
});

test('静态用途选择会跳过视频来源并寻找同一项目的静态 fallback', () => {
  const galleryImage = {
    title: '混合媒体',
    sources: ['https://example.com/main.webm', 'https://example.com/fallback.webp'],
  };

  assert.equal(preferredStaticImageUrl(galleryImage), 'https://example.com/fallback.webp');
});
