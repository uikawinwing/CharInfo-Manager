const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyRemoteGallery,
  clearRemoteGalleryCache,
  REMOTE_GALLERY_REVALIDATE_MS,
  REMOTE_GALLERY_REQUEST_TIMEOUT_MS,
  resolveRemoteGalleryConfig,
  resolveRemoteGalleryPresentation,
  refreshRemoteGallery,
} = require('../../src/char_info_viewer/services/remoteGalleryService.ts');

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

test('Remote Gallery presentation uses dedicated avatar/library thumbnails while keeping the normal gallery thumbnail for cards', async t => {
  clearRemoteGalleryCache();
  const remoteUrl = 'https://img.example.test/api/public/gallery/uika/elfa1';
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
    clearRemoteGalleryCache();
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

test('Remote Gallery revalidates with ETag and replaces only the remote image layer', async () => {
  clearRemoteGalleryCache();
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
    clearRemoteGalleryCache();
  }
});

test('Remote Gallery failure uses local gallery before first success and stale cache after success', async () => {
  clearRemoteGalleryCache();
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
    clearRemoteGalleryCache();
  }
});

test('applyRemoteGallery never spreads arbitrary pack fields into the local profile', () => {
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

  const resolved = applyRemoteGallery(base, remote);
  assert.equal(resolved.safe_local_key, 1);
  assert.deepEqual(resolved.metadata, { author: 'Local' });
  assert.equal(resolved.cover_url, 'https://img.example.test/thumb/portrait.png');
  assert.equal(resolved.gallery.length, 3);
  assert.equal(resolved.skills, undefined);
  assert.equal(resolved.mvu, undefined);
  assert.equal(resolved.worldbook, undefined);
});

test('explicit ImgBed library cover remains selected instead of being replaced by the first image', () => {
  const gallery = realShapeGallery();
  const chosen = 'https://img.example.test/thumb/cresent.png?variant=library&v=3';
  const resolved = applyRemoteGallery({ cover_url: chosen }, pack({ gallery }));
  assert.equal(resolved.cover_url, chosen);
  const removed = applyRemoteGallery({ cover_url: chosen }, pack({ gallery: [gallery[1]] }));
  assert.equal(removed.cover_url, gallery[1].thumbnail);
});

test('刷新远程图库时自动修复旧的 WebP 缩略图版本，不改变用户选定的图片和用途', () => {
  const original = 'https://imgbed-staging.uika.cc.cd/thumb/users/owner/example.png';
  const current = '1793714050906';
  const outdated = '1793714030758';
  const gallery = [{
    title: 'Example',
    thumbnail: `${original}?v=${current}`,
    sources: [`${original}?variant=portrait&v=${current}`, `${original}?v=${current}`],
  }];
  const stored = `${original}?variant=portrait&v=${outdated}`;
  const resolved = applyRemoteGallery({ cover_url: stored, metadata: { safe: true } }, pack({ gallery }));
  assert.equal(resolved.cover_url, `${original}?variant=portrait&v=${current}`);
  assert.deepEqual(resolved.metadata, { safe: true });
  assert.deepEqual(resolved.gallery[0].sources, gallery[0].sources);

  const library = applyRemoteGallery({
    cover_url: `${original}?variant=library&v=${outdated}`,
  }, pack({ gallery }));
  assert.equal(library.cover_url, `${original}?variant=library&v=${current}`);
  const otherImage = applyRemoteGallery({
    cover_url: 'https://imgbed-staging.uika.cc.cd/thumb/users/owner/other.png?variant=library&v=1',
  }, pack({ gallery }));
  assert.equal(otherImage.cover_url, gallery[0].thumbnail);
});

test('explicit refresh bypasses fresh cache for one URL, preserves ETag and leaves other URLs cached', async t => {
  clearRemoteGalleryCache();
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; clearRemoteGalleryCache(); });
  const requests = [];
  const url = 'https://img.example.test/selected';
  const otherUrl = 'https://img.example.test/other';
  global.fetch = async (input, init) => {
    requests.push({ input, init });
    if (requests.length === 3) return new Response(null, { status: 304 });
    return new Response(JSON.stringify(pack({ gallery: realShapeGallery() })), { headers: { ETag: '"v1"' } });
  };
  await resolveRemoteGalleryPresentation(url);
  await resolveRemoteGalleryPresentation(otherUrl);
  const refreshed = await refreshRemoteGallery(url);
  await resolveRemoteGalleryPresentation(otherUrl);
  assert.equal(requests.length, 3);
  assert.equal(refreshed.gallery.length, 3);
  assert.equal(requests[2].input, url);
  assert.equal(requests[2].init.credentials, 'omit');
  assert.equal(requests[2].init.cache, 'no-cache');
  assert.equal(requests[2].init.headers.get('If-None-Match'), '"v1"');
});

test('explicit refresh reports errors and aborts while retaining the last good cache', async t => {
  clearRemoteGalleryCache();
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; clearRemoteGalleryCache(); });
  const url = 'https://img.example.test/selected';
  global.fetch = async () => new Response(JSON.stringify(pack({ gallery: realShapeGallery() })));
  await resolveRemoteGalleryPresentation(url);
  global.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(refreshRemoteGallery(url), /offline/);
  assert.equal((await resolveRemoteGalleryPresentation(url)).gallery.length, 3);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(refreshRemoteGallery(url, controller.signal), { name: 'AbortError' });
  await assert.rejects(refreshRemoteGallery('http://unsafe.test/gallery'), /HTTPS/);
});

test('explicit refresh follows an in-flight read and stores the new response for the viewer', async t => {
  clearRemoteGalleryCache();
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; clearRemoteGalleryCache(); });
  const url = 'https://img.example.test/selected';
  let release;
  let count = 0;
  global.fetch = async () => {
    count += 1;
    if (count === 1) return new Promise(resolve => { release = resolve; });
    return new Response(JSON.stringify(pack({ gallery: [{ title: 'new', sources: ['https://img.example.test/new.png'] }] })));
  };
  const firstRead = resolveRemoteGalleryPresentation(url);
  const refresh = refreshRemoteGallery(url);
  release(new Response(JSON.stringify(pack({ gallery: realShapeGallery() }))));
  await firstRead;
  assert.equal((await refresh).gallery[0].title, 'new');
  assert.equal((await resolveRemoteGalleryPresentation(url)).gallery[0].title, 'new');
  assert.equal(count, 2);
});

test('refresh validates album identity before replacing a good cache, including 304 responses', async t => {
  clearRemoteGalleryCache();
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; clearRemoteGalleryCache(); });
  const url = 'https://img.example.test/selected';
  global.fetch = async () => new Response(JSON.stringify(pack({ gallery: realShapeGallery() })), { headers: { ETag: '"good"' } });
  await resolveRemoteGalleryPresentation(url);
  global.fetch = async () => new Response(JSON.stringify(pack({ characterName: 'wrong', gallery: [] })));
  const validate = payload => {
    if (payload.characterName !== '克瑞西达') throw new Error('identity mismatch');
  };
  await assert.rejects(refreshRemoteGallery(url, undefined, validate), /identity mismatch/);
  assert.equal((await resolveRemoteGalleryPresentation(url)).gallery.length, 3);
  global.fetch = async () => new Response(null, { status: 304 });
  await assert.rejects(refreshRemoteGallery(url, undefined, () => { throw new Error('invalid cached identity'); }), /invalid cached identity/);
  assert.equal((await resolveRemoteGalleryPresentation(url)).gallery.length, 3);
});

test('viewer retains its stale remote cache when sharing a failed explicit refresh', async t => {
  clearRemoteGalleryCache();
  const originalFetch = global.fetch;
  const originalNow = Date.now;
  t.after(() => { global.fetch = originalFetch; Date.now = originalNow; clearRemoteGalleryCache(); });
  let now = 1_000;
  Date.now = () => now;
  const url = 'https://img.example.test/selected';
  global.fetch = async () => new Response(JSON.stringify(pack({ gallery: realShapeGallery() })));
  await resolveRemoteGalleryPresentation(url);
  now += REMOTE_GALLERY_REVALIDATE_MS + 1;
  let rejectRequest;
  global.fetch = () => new Promise((_resolve, reject) => { rejectRequest = reject; });
  const refresh = refreshRemoteGallery(url);
  await Promise.resolve();
  const viewer = resolveRemoteGalleryPresentation(url);
  rejectRequest(new Error('offline'));
  await assert.rejects(refresh, /offline/);
  assert.equal((await viewer).gallery.length, 3);
});

test('refresh claims the request synchronously so a same-turn viewer read cannot bypass identity validation', async t => {
  clearRemoteGalleryCache();
  const originalFetch = global.fetch;
  const originalNow = Date.now;
  t.after(() => { global.fetch = originalFetch; Date.now = originalNow; clearRemoteGalleryCache(); });
  let now = 1_000;
  Date.now = () => now;
  const url = 'https://img.example.test/selected';
  global.fetch = async () => new Response(JSON.stringify(pack({ gallery: realShapeGallery() })));
  await resolveRemoteGalleryPresentation(url);
  now += REMOTE_GALLERY_REVALIDATE_MS + 1;
  global.fetch = async () => new Response(JSON.stringify(pack({ characterName: 'wrong', gallery: [] })));
  const refresh = refreshRemoteGallery(url, undefined, () => { throw new Error('identity mismatch'); });
  const viewer = resolveRemoteGalleryPresentation(url);
  await assert.rejects(refresh, /identity mismatch/);
  assert.equal((await viewer).gallery.length, 3);
  assert.equal((await resolveRemoteGalleryPresentation(url)).gallery.length, 3);
});

test('explicit refresh times out an unresponsive public read', async t => {
  clearRemoteGalleryCache();
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; clearRemoteGalleryCache(); });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  global.fetch = (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
  });
  const refresh = refreshRemoteGallery('https://img.example.test/timeout');
  t.mock.timers.tick(REMOTE_GALLERY_REQUEST_TIMEOUT_MS);
  await assert.rejects(refresh, { name: 'AbortError' });
});
