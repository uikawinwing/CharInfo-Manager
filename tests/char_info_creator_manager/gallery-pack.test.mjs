import assert from 'node:assert/strict';
import test from 'node:test';

import { parseGalleryPackPayload } from '../../src/char_info_shared/galleryPack.ts';

test('char-info-gallery-pack v1 保留图片、视频与可选 thumbnail', () => {
  const payload = parseGalleryPackPayload({
    format: 'char-info-gallery-pack',
    version: 1,
    packId: 'uika',
    profileId: '3f06921a-a41d-41a3-a849-c096ac69743b',
    characterName: '克瑞西达',
    avatarThumbnail: 'https://img.example.test/thumb/portrait.png?variant=avatar',
    libraryThumbnail: 'https://img.example.test/thumb/portrait.png?variant=library',
    gallery: [
      {
        title: 'video.webm',
        sources: ['https://img.example.test/file/video.webm'],
        thumbnail: null,
      },
      {
        title: 'portrait.png',
        sources: ['https://img.example.test/file/portrait.png'],
        thumbnail: 'https://img.example.test/thumb/portrait.png',
      },
    ],
  });

  assert.equal(payload.avatarThumbnail, 'https://img.example.test/thumb/portrait.png?variant=avatar');
  assert.equal(payload.libraryThumbnail, 'https://img.example.test/thumb/portrait.png?variant=library');
  assert.equal(payload.gallery.length, 2);
  assert.equal(payload.gallery[0].thumbnail, undefined);
  assert.equal(payload.gallery[1].thumbnail, 'https://img.example.test/thumb/portrait.png');
});

test('Gallery Pack 拒绝旧 visual pack 与非 HTTPS 媒体', () => {
  assert.throws(
    () =>
      parseGalleryPackPayload({
        format: 'char-info-visual-pack',
        version: 1,
        packId: 'uika',
        profileId: 'profile',
        characterName: '克瑞西达',
        gallery: [],
      }),
    /不是 CharInfo Gallery Pack/,
  );

  assert.throws(
    () =>
      parseGalleryPackPayload({
        format: 'char-info-gallery-pack',
        version: 1,
        packId: 'uika',
        profileId: 'profile',
        characterName: '克瑞西达',
        avatarThumbnail: null,
        libraryThumbnail: null,
        gallery: [{ title: 'bad.png', sources: ['http://img.example.test/bad.png'] }],
      }),
    /HTTPS/,
  );
});
