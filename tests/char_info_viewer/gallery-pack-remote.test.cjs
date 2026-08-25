const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyRemoteGalleryPack,
  clearGalleryPackCache,
  REMOTE_GALLERY_REVALIDATE_MS,
  resolveRemoteGalleryConfig,
  resolveRemoteGalleryPresentation,
} = require('../../src/char_info_viewer/services/galleryPackService.ts');

function pack({
  gallery = [],
  characterName = '克瑞西达',
  avatarThumbnail = 'https://img.example.test/thumb/portrait.png?variant=avatar',
  libraryThumbnail = 'https://img.example.test/thumb/portrait.png?variant=library',
} = {}) {
  return {
    format: 'char-info-gallery-pack',
    version: 1,
    packId: 'uika',
    profileId: '3f06921a-a41d-41a3-a849-c096ac69743b',
    characterName,
    avatarThumbnail,
    libraryThumbnail,
    gallery,
  };
}

function realShapeGallery() {
  return [
    {
      title: 'dynamic-wallpaper-pocket-watch_3 (3).webm',
      sources: ['https://img.example.test/file/video.webm'],
      thumbnail: null,
    },
    {
      title: 'fe5883b677cbf71049a8b928b68d575d.png',
      sources: ['https://img.example.test/file/portrait.png'],
      thumbnail: 'https://img.example.test/thumb/portrait.png',
    },
    {
      title: 'cresent.png',
      sources: ['https://img.example.test/file/cresent.png'],
      thumbnail: 'https://img.example.test/thumb/cresent.png',
    },
  ];
}

test('Gallery Pack presentation uses dedicated avatar/library thumbnails while keeping the normal gallery thumbnail for cards', async t => {
  clearGalleryPackCache();
  const remoteUrl = 'https://img.example.test/api/public/gallery/uika/elfa1';
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
    clearGalleryPackCache();
  });
  global.fetch = async () =>
    new Response(JSON.stringify(pack({ gallery: realShapeGallery() })), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ETag: '"gallery-v1"' },
    });

  const presentation = await resolveRemoteGalleryPresentation(remoteUrl);
  assert.equal(presentation.avatarUrl, 'https://img.example.test/thumb/portrait.png?variant=avatar');
  assert.equal(presentation.libraryThumbnailUrl, 'https://img.example.test/thumb/portrait.png?variant=library');
  assert.equal(presentation.coverUrl, 'https://img.example.test/thumb/portrait.png');
  assert.equal(presentation.gallery.length, 3);
  assert.equal(presentation.gallery[0].thumbnail, undefined);
  assert.equal(presentation.gallery[1].thumbnail, 'https://img.example.test/thumb/portrait.png');
});

test('remote Gallery Pack revalidates with ETag and replaces only the remote image layer', async () => {
  clearGalleryPackCache();
  const remoteUrl = 'https://img.example.test/api/public/gallery/uika/elfa1';
  const originalFetch = global.fetch;
  const originalNow = Date.now;
  let now = 1_000;
  let requestCount = 0;
  const seenIfNoneMatch = [];

  Date.now = () => now;
  global.fetch = async (_input, init) => {
    requestCount += 1;
    seenIfNoneMatch.push(new Headers(init?.headers).get('If-None-Match'));
    if (requestCount === 1) {
      return new Response(JSON.stringify(pack({ gallery: realShapeGallery() })), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ETag: '"v1"' },
      });
    }
    if (requestCount === 2) return new Response(null, { status: 304, headers: { ETag: '"v1"' } });
    return new Response(
      JSON.stringify(pack({ gallery: [{ title: 'updated.png', sources: ['https://img.example.test/file/updated.png'] }] })),
      { status: 200, headers: { 'Content-Type': 'application/json', ETag: '"v2"' } },
    );
  };

  try {
    const base = {
      schema_version: 2,
      gallery_pack_url: remoteUrl,
      登场台词: 'Local quote',
      custom_racecolor: '#A9DBC3',
      metadata: { author: 'Local Author' },
      gallery: [{ title: 'Local', sources: ['https://img.example.test/local.webp'] }],
      local_only_marker: 'keep me',
    };

    const first = await resolveRemoteGalleryConfig(base);
    assert.deepEqual(first.gallery.map(item => item.title), realShapeGallery().map(item => item.title));
    assert.equal(first.cover_url, 'https://img.example.test/thumb/portrait.png');
    assert.equal(first.登场台词, 'Local quote');
    assert.equal(first.custom_racecolor, '#A9DBC3');
    assert.deepEqual(first.metadata, { author: 'Local Author' });
    assert.equal(first.local_only_marker, 'keep me');
    assert.equal(requestCount, 1);

    now += REMOTE_GALLERY_REVALIDATE_MS - 1;
    await resolveRemoteGalleryConfig(base);
    assert.equal(requestCount, 1);

    now += 2;
    await resolveRemoteGalleryConfig(base);
    assert.equal(requestCount, 2);
    assert.deepEqual(seenIfNoneMatch, [null, '"v1"']);

    now += REMOTE_GALLERY_REVALIDATE_MS + 1;
    const updated = await resolveRemoteGalleryConfig(base);
    assert.deepEqual(updated.gallery.map(item => item.title), ['updated.png']);
    assert.equal(updated.cover_url, 'https://img.example.test/file/updated.png');
    assert.equal(requestCount, 3);
  } finally {
    global.fetch = originalFetch;
    Date.now = originalNow;
    clearGalleryPackCache();
  }
});

test('remote Gallery Pack failure uses local gallery before first success and stale cache after success', async () => {
  clearGalleryPackCache();
  const remoteUrl = 'https://img.example.test/api/public/gallery/uika/elfa1';
  const originalFetch = global.fetch;
  const originalNow = Date.now;
  let now = 10_000;
  let requestCount = 0;

  Date.now = () => now;
  global.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) throw new Error('offline before first success');
    if (requestCount === 2) {
      return new Response(JSON.stringify(pack({ gallery: realShapeGallery() })), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ETag: '"v1"' },
      });
    }
    throw new Error('offline after cache');
  };

  try {
    const base = {
      gallery_pack_url: remoteUrl,
      gallery: [{ title: 'Local', sources: ['https://img.example.test/local.webp'] }],
    };

    const localFallback = await resolveRemoteGalleryConfig(base);
    assert.deepEqual(localFallback.gallery.map(item => item.title), ['Local']);

    now += REMOTE_GALLERY_REVALIDATE_MS + 1;
    const firstSuccess = await resolveRemoteGalleryConfig(base);
    assert.equal(firstSuccess.gallery.length, 3);

    now += REMOTE_GALLERY_REVALIDATE_MS + 1;
    const stale = await resolveRemoteGalleryConfig(base);
    assert.equal(stale.gallery.length, 3);
    assert.equal(requestCount, 3);
  } finally {
    global.fetch = originalFetch;
    Date.now = originalNow;
    clearGalleryPackCache();
  }
});

test('applyRemoteGalleryPack never spreads arbitrary pack fields into the local profile', () => {
  const base = {
    gallery_pack_url: 'https://img.example.test/api/public/gallery/uika/elfa1',
    gallery: [{ title: 'Local', sources: ['https://img.example.test/local.webp'] }],
    metadata: { author: 'Local' },
    safe_local_key: 1,
  };
  const remote = {
    ...pack({ gallery: realShapeGallery() }),
    skills: ['must never be exposed'],
    mvu: { hp: 0 },
    worldbook: 'must never be exposed',
  };

  const resolved = applyRemoteGalleryPack(base, remote);
  assert.equal(resolved.safe_local_key, 1);
  assert.deepEqual(resolved.metadata, { author: 'Local' });
  assert.equal(resolved.cover_url, 'https://img.example.test/thumb/portrait.png');
  assert.equal(resolved.gallery.length, 3);
  assert.equal(resolved.skills, undefined);
  assert.equal(resolved.mvu, undefined);
  assert.equal(resolved.worldbook, undefined);
});
