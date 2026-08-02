import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createStableGalleryId,
  createGalleryPackPayload,
  findGalleryPackEntry,
  parseGalleryPackPayload,
  serializeGalleryPackPayload,
} from '../../src/char_info_shared/galleryPack.ts';
import {
  buildManagedEjsBlock,
  createEmptyProfile,
  inspectManagedBlock,
} from '../../src/char_info_creator_manager/ejsProfile.ts';
import {
  deleteGalleryPackProfile,
  saveGalleryPackProfile,
} from '../../src/char_info_creator_manager/galleryPackStorage.ts';
import { mergeGalleryExtension } from '../../src/char_info_viewer/services/galleryPackService.ts';

const reference = {
  worldbookName: '命定之诗-CharInfo图库',
  packId: 'poem-of-destiny',
  profileId: 'lilia',
};

function image(index) {
  return {
    title: `立绘 ${index}`,
    sources: [`https://images.example/${index}.webp`, `https://backup.example/${index}.webp`],
  };
}

test('中文世界书与角色名会生成可验证且稳定的 ASCII 图库 ID', () => {
  assert.match(createStableGalleryId('QA角色世界书', 'char-info-gallery'), /^[a-z0-9][a-z0-9._-]{0,63}$/u);
  assert.match(createStableGalleryId('莉利亚・利桑德', 'character'), /^character-[a-z0-9]+$/u);
  assert.match(createStableGalleryId('_lorebook_0712', 'char-info-gallery'), /^[a-z0-9][a-z0-9._-]{0,63}$/u);
  assert.equal(
    createStableGalleryId('莉利亚・利桑德', 'character'),
    createStableGalleryId('莉利亚・利桑德', 'character'),
  );
});

test('普通角色的受管理 EJS 不会生成扩展图库引用', () => {
  const profile = {
    ...createEmptyProfile('莉利亚'),
    gallery: [image(1), image(2), image(3)],
  };
  const block = buildManagedEjsBlock(profile);

  assert.doesNotMatch(block, /gallery_extension/u);
  const inspection = inspectManagedBlock(block);
  assert.equal(inspection.state, 'valid');
  assert.equal(inspection.profile.gallery.length, 3);
  assert.equal(inspection.profile.galleryExtension, undefined);
});

test('扩展模式只在角色 EJS 保存基础图和稳定图库引用', () => {
  const profile = {
    ...createEmptyProfile('莉利亚'),
    gallery: [image(1), image(2), image(3)],
    galleryExtension: reference,
  };
  const block = buildManagedEjsBlock(profile);

  assert.match(block, /gallery_extension/u);
  const inspection = inspectManagedBlock(block);
  assert.equal(inspection.state, 'valid');
  assert.deepEqual(inspection.profile.galleryExtension, reference);
  assert.equal(inspection.profile.gallery.length, 3);
});

test('大型图库 payload 可保存数百张图片并静态读回', () => {
  const gallery = Array.from({ length: 297 }, (_, index) => image(index + 4));
  const payload = createGalleryPackPayload(reference, '莉利亚', gallery);
  const serialized = serializeGalleryPackPayload(payload);
  const parsed = parseGalleryPackPayload(serialized);

  assert.equal(parsed.gallery.length, 297);
  assert.deepEqual(parsed.gallery[0].sources, gallery[0].sources);
  assert.deepEqual(
    findGalleryPackEntry([{ uid: 7, name: 'gallery', content: serialized }], reference)?.payload,
    parsed,
  );
});

test('Viewer 按基础图在前、扩展图在后的顺序归一化图库', () => {
  const embedded = {
    schema_version: 1,
    gallery: [image(1), image(2), image(3)],
    gallery_extension: reference,
  };
  const merged = mergeGalleryExtension(embedded, [image(4), image(5)]);

  assert.deepEqual(
    merged.gallery.map(item => item.title),
    ['立绘 1', '立绘 2', '立绘 3', '立绘 4', '立绘 5'],
  );
  assert.deepEqual(merged.gallery_extension, reference);
});

test('多个重图库角色共享同一个禁用 Gallery Pack 世界书', async t => {
  const books = new Map();
  let nextUid = 1;
  const originalGlobals = Object.fromEntries(
    ['getWorldbookNames', 'createWorldbook', 'getWorldbook', 'createWorldbookEntries', 'updateWorldbookWith'].map(
      key => [key, globalThis[key]],
    ),
  );
  t.after(() => Object.assign(globalThis, originalGlobals));

  globalThis.getWorldbookNames = () => [...books.keys()];
  globalThis.createWorldbook = async name => {
    books.set(name, []);
    return true;
  };
  globalThis.getWorldbook = async name => structuredClone(books.get(name) ?? []);
  globalThis.createWorldbookEntries = async (name, entries) => {
    const created = entries.map(entry => ({ ...entry, uid: nextUid++ }));
    books.set(name, [...(books.get(name) ?? []), ...created]);
    return { worldbook: structuredClone(books.get(name)), new_entries: structuredClone(created) };
  };
  globalThis.updateWorldbookWith = async (name, updater) => {
    const updated = await updater(structuredClone(books.get(name) ?? []));
    books.set(name, updated);
    return structuredClone(updated);
  };

  await saveGalleryPackProfile(reference, '莉利亚', [image(4)]);
  await saveGalleryPackProfile({ ...reference, profileId: 'iris' }, 'Iris', [image(5)]);

  const entries = books.get(reference.worldbookName);
  assert.equal(entries.length, 2);
  assert.ok(entries.every(entry => entry.enabled === false));
  assert.deepEqual(
    entries.map(entry => parseGalleryPackPayload(entry.content).profileId),
    ['lilia', 'iris'],
  );
});

test('删除新建失败事务的图库条目时不会影响同一世界书的其他角色', async t => {
  const books = new Map([
    [
      reference.worldbookName,
      [
        {
          uid: 1,
          content: serializeGalleryPackPayload(createGalleryPackPayload(reference, '莉利亚', [image(4)])).trimEnd(),
        },
        {
          uid: 2,
          content: serializeGalleryPackPayload(
            createGalleryPackPayload({ ...reference, profileId: 'iris' }, 'Iris', [image(5)]),
          ).trimEnd(),
        },
      ],
    ],
  ]);
  const originalGlobals = Object.fromEntries(
    ['getWorldbook', 'updateWorldbookWith'].map(key => [key, globalThis[key]]),
  );
  t.after(() => Object.assign(globalThis, originalGlobals));

  globalThis.getWorldbook = async name => structuredClone(books.get(name) ?? []);
  globalThis.updateWorldbookWith = async (name, updater) => {
    const updated = await updater(structuredClone(books.get(name) ?? []));
    books.set(name, updated);
    return structuredClone(updated);
  };

  await deleteGalleryPackProfile(reference);

  const entries = books.get(reference.worldbookName);
  assert.equal(entries.length, 1);
  assert.equal(parseGalleryPackPayload(entries[0].content).profileId, 'iris');
});
