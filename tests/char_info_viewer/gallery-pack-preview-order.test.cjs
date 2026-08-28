const assert = require('node:assert/strict');
const test = require('node:test');

const {
  clearGalleryPackCache,
  REMOTE_GALLERY_REQUEST_TIMEOUT_MS,
  resolveRemoteGalleryConfig,
} = require('../../src/char_info_viewer/services/galleryPackService.ts');

function pack(title, source) {
  return {
    format: 'char-info-gallery-pack',
    version: 1,
    packId: 'creator-preview-test',
    profileId: '3f06921a-a41d-41a3-a849-c096ac69743b',
    characterName: '预览角色',
    avatarThumbnail: null,
    libraryThumbnail: null,
    gallery: [{ title, sources: [source] }],
  };
}

function nextTurn() {
  return new Promise(resolve => setImmediate(resolve));
}

test('scoped Creator remote Gallery Pack requests resolve in invocation order', async t => {
  clearGalleryPackCache();
  const originalFetch = global.fetch;
  const requests = [];
  const releases = [];

  t.after(() => {
    global.fetch = originalFetch;
    clearGalleryPackCache();
  });

  global.fetch = (input, init) => {
    const url = String(input);
    requests.push({ url, signal: init?.signal });
    return new Promise(resolve => {
      releases.push(() => {
        const isFirst = url.endsWith('/first');
        resolve(
          new Response(
            JSON.stringify(
              isFirst
                ? pack('first.png', 'https://img.example.test/file/first.png')
                : pack('second.png', 'https://img.example.test/file/second.png'),
            ),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      });
    });
  };

  const scope = 'creator-viewer';
  const firstPromise = resolveRemoteGalleryConfig({
    __char_info_remote_gallery_scope: scope,
    gallery_pack_url: 'https://img.example.test/api/public/gallery/first',
    gallery: [],
  });
  await nextTurn();

  const secondPromise = resolveRemoteGalleryConfig({
    __char_info_remote_gallery_scope: scope,
    gallery_pack_url: 'https://img.example.test/api/public/gallery/second',
    gallery: [],
  });
  await nextTurn();

  assert.equal(requests.length, 1, 'second scoped fetch must wait for the first request');
  releases[0]();
  const first = await firstPromise;
  assert.deepEqual(first.gallery.map(item => item.title), ['first.png']);

  await nextTurn();
  assert.equal(requests.length, 2, 'second scoped fetch starts only after the first request resolves');
  releases[1]();
  const second = await secondPromise;
  assert.deepEqual(second.gallery.map(item => item.title), ['second.png']);
});

test('remote Gallery Pack requests carry an abort signal and a finite timeout policy', async t => {
  clearGalleryPackCache();
  const originalFetch = global.fetch;
  let seenSignal = null;

  t.after(() => {
    global.fetch = originalFetch;
    clearGalleryPackCache();
  });

  global.fetch = async (_input, init) => {
    seenSignal = init?.signal ?? null;
    return new Response(
      JSON.stringify(pack('ok.png', 'https://img.example.test/file/ok.png')),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  await resolveRemoteGalleryConfig({
    gallery_pack_url: 'https://img.example.test/api/public/gallery/timeout-policy',
    gallery: [],
  });

  assert.ok(REMOTE_GALLERY_REQUEST_TIMEOUT_MS > 0);
  assert.ok(seenSignal instanceof AbortSignal);
});
