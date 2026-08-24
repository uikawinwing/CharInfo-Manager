const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyRemoteVisualPack,
  clearGalleryPackCache,
  REMOTE_VISUAL_REVALIDATE_MS,
  resolveGalleryExtension,
} = require('../../src/char_info_viewer/services/galleryPackService.ts');

function pack({ visual = {}, gallery = [], characterName = 'Remote Character', extra = {} } = {}) {
  return {
    format: 'char-info-visual-pack',
    version: 1,
    packId: 'master',
    profileId: 'album-id',
    characterName,
    visual: {
      entranceQuote: '',
      raceColor: '',
      tierColor: '',
      avatarUrl: null,
      coverUrl: null,
      metadata: {},
      ...visual,
    },
    gallery,
    ...extra,
  };
}

test('remote visual pack revalidates with ETag and replaces the EJS-owned visual layer', async () => {
  clearGalleryPackCache();
  const remoteUrl = 'https://img.example.test/api/public/charinfo/album-id';
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
      return new Response(
        JSON.stringify(
          pack({
            visual: {
              entranceQuote: 'Remote quote',
              raceColor: '#A9DBC3',
              tierColor: '#B7D9E8',
              coverUrl: 'https://img.example.test/cover.webp',
              metadata: { author: 'Remote Author', version: 'v1' },
              skills: ['must be ignored'],
              mvu: { hp: 0 },
            },
            gallery: [{ title: 'A', sources: ['https://img.example.test/a.webp'] }],
            characterName: 'Someone Else',
            extra: { personality: 'must be ignored', worldbook: 'must be ignored' },
          }),
        ),
        { status: 200, headers: { 'Content-Type': 'application/json', ETag: '"v1"' } },
      );
    }
    if (requestCount === 2) return new Response(null, { status: 304, headers: { ETag: '"v1"' } });
    if (requestCount === 3) {
      return new Response(
        JSON.stringify(
          pack({
            visual: {
              entranceQuote: 'Updated quote',
              raceColor: '',
              tierColor: '#112233',
              metadata: {},
            },
            gallery: [
              { title: 'B', sources: ['https://img.example.test/b.webm'] },
              { title: 'C', sources: ['https://img.example.test/c.webp'], viewerVisible: false },
            ],
          }),
        ),
        { status: 200, headers: { 'Content-Type': 'application/json', ETag: '"v2"' } },
      );
    }
    return new Response(JSON.stringify(pack({ gallery: [] })), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ETag: '"v3"' },
    });
  };

  try {
    const base = {
      schema_version: 2,
      visual_remote_url: remoteUrl,
      custom_racecolor: '#FFFFFF',
      custom_tiercolor: '#000000',
      登场台词: 'Local quote',
      cover_url: 'https://img.example.test/local-cover.webp',
      metadata: { author: 'Local Author', version: 'local' },
      gallery: [{ title: 'Local', sources: ['https://img.example.test/local.webp'] }],
      local_only_marker: 'keep me',
    };

    const first = await resolveGalleryExtension(base);
    assert.deepEqual(first.gallery.map(item => item.title), ['A']);
    assert.equal(first.custom_racecolor, '#A9DBC3');
    assert.equal(first.custom_tiercolor, '#B7D9E8');
    assert.equal(first.登场台词, 'Remote quote');
    assert.equal(first.cover_url, 'https://img.example.test/cover.webp');
    assert.deepEqual(first.metadata, { author: 'Remote Author', version: 'v1' });
    assert.equal(first.local_only_marker, 'keep me');
    assert.equal(first.characterName, undefined, 'remote characterName is informational and never becomes a local target');
    assert.equal(first.skills, undefined);
    assert.equal(first.mvu, undefined);
    assert.equal(first.personality, undefined);
    assert.equal(first.worldbook, undefined);
    assert.equal(requestCount, 1);
    assert.deepEqual(seenIfNoneMatch, [null]);

    now += REMOTE_VISUAL_REVALIDATE_MS - 1;
    const cached = await resolveGalleryExtension(base);
    assert.deepEqual(cached.gallery.map(item => item.title), ['A']);
    assert.equal(requestCount, 1);

    now += 2;
    const unchanged = await resolveGalleryExtension(base);
    assert.deepEqual(unchanged.gallery.map(item => item.title), ['A']);
    assert.equal(requestCount, 2);
    assert.deepEqual(seenIfNoneMatch, [null, '"v1"']);

    now += REMOTE_VISUAL_REVALIDATE_MS + 1;
    const updated = await resolveGalleryExtension(base);
    assert.deepEqual(updated.gallery.map(item => item.title), ['B', 'C']);
    assert.equal(updated.custom_racecolor, undefined, 'remote blank color clears the local EJS fallback while online');
    assert.equal(updated.custom_tiercolor, '#112233');
    assert.equal(updated.登场台词, 'Updated quote');
    assert.equal(updated.cover_url, undefined);
    assert.equal(updated.metadata, undefined);
    assert.equal(requestCount, 3);

    now += REMOTE_VISUAL_REVALIDATE_MS + 1;
    const emptied = await resolveGalleryExtension(base);
    assert.deepEqual(emptied.gallery, [], 'a successful empty remote gallery must not resurrect stale local images');
    assert.equal(requestCount, 4);
  } finally {
    global.fetch = originalFetch;
    Date.now = originalNow;
    clearGalleryPackCache();
  }
});

test('remote visual failure uses local snapshot first, then stale cache after a successful fetch', async () => {
  clearGalleryPackCache();
  const remoteUrl = 'https://img.example.test/api/public/charinfo/album-id';
  const originalFetch = global.fetch;
  const originalNow = Date.now;
  let now = 10_000;
  let requestCount = 0;

  Date.now = () => now;
  global.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) throw new Error('offline before first success');
    if (requestCount === 2) {
      return new Response(
        JSON.stringify(
          pack({
            visual: { entranceQuote: 'Cached remote' },
            gallery: [{ title: 'Remote', sources: ['https://img.example.test/remote.webp'] }],
          }),
        ),
        { status: 200, headers: { 'Content-Type': 'application/json', ETag: '"v1"' } },
      );
    }
    throw new Error('offline after cache');
  };

  try {
    const base = {
      visual_remote_url: remoteUrl,
      登场台词: 'Local',
      gallery: [{ title: 'Local', sources: ['https://img.example.test/local.webp'] }],
    };

    const localFallback = await resolveGalleryExtension(base);
    assert.deepEqual(localFallback.gallery.map(item => item.title), ['Local']);
    assert.equal(localFallback.登场台词, 'Local');

    now += REMOTE_VISUAL_REVALIDATE_MS + 1;
    const firstSuccess = await resolveGalleryExtension(base);
    assert.deepEqual(firstSuccess.gallery.map(item => item.title), ['Remote']);
    assert.equal(firstSuccess.登场台词, 'Cached remote');

    now += REMOTE_VISUAL_REVALIDATE_MS + 1;
    const stale = await resolveGalleryExtension(base);
    assert.deepEqual(stale.gallery.map(item => item.title), ['Remote']);
    assert.equal(stale.登场台词, 'Cached remote');
    assert.equal(requestCount, 3);
  } finally {
    global.fetch = originalFetch;
    Date.now = originalNow;
    clearGalleryPackCache();
  }
});

test('applyRemoteVisualPack never spreads arbitrary remote fields into the local profile', () => {
  const base = {
    visual_remote_url: 'https://img.example.test/api/public/charinfo/album-id',
    gallery: [{ title: 'Local', sources: ['https://img.example.test/local.webp'] }],
    safe_local_key: 1,
  };
  const remote = pack({
    visual: { entranceQuote: 'Remote', skills: ['evil'], personality: 'evil' },
    gallery: [{ title: 'Remote', sources: ['https://img.example.test/remote.webp'] }],
    extra: { mvu: { hp: 0 }, worldbook: 'evil' },
  });

  const resolved = applyRemoteVisualPack(base, remote);
  assert.equal(resolved.safe_local_key, 1);
  assert.equal(resolved.登场台词, 'Remote');
  assert.deepEqual(resolved.gallery.map(item => item.title), ['Remote']);
  assert.equal(resolved.skills, undefined);
  assert.equal(resolved.personality, undefined);
  assert.equal(resolved.mvu, undefined);
  assert.equal(resolved.worldbook, undefined);
});
