import {
  createGalleryPackPayload,
  findGalleryPackEntry,
  galleryPackEntryName,
  serializeGalleryPackPayload,
  type GalleryExtensionReference,
  type GalleryPackImage,
  type GalleryPackPayload,
} from '../char_info_shared/galleryPack.ts';

export type GalleryPackWorkshopEntry = {
  comment: string;
  enabled: false;
  strategy: {
    type: 'selective';
    keys: string[];
    keys_secondary: { logic: 'and_any'; keys: [] };
    scan_depth: 'same_as_global';
  };
  position: {
    type: 'before_char';
    depth: 4;
    order: 10000;
    role: 'system';
  };
  recursion: {
    prevent_incoming: true;
    prevent_outgoing: true;
    delay_until: null;
  };
  effect: {
    sticky: null;
    cooldown: null;
    delay: null;
  };
  probability: 100;
  content: string;
};

function createWorldbookEntryInput(reference: GalleryExtensionReference, payload: GalleryPackPayload) {
  return {
    name: galleryPackEntryName(reference),
    enabled: false,
    strategy: {
      type: 'selective' as const,
      keys: [`__char_info_gallery_${reference.packId}_${reference.profileId}__`],
      keys_secondary: { logic: 'and_any' as const, keys: [] },
      scan_depth: 'same_as_global' as const,
    },
    position: {
      type: 'before_character_definition' as const,
      role: 'system' as const,
      depth: 4,
      order: 10000,
    },
    content: serializeGalleryPackPayload(payload).trimEnd(),
    probability: 100,
    recursion: {
      prevent_incoming: true,
      prevent_outgoing: true,
      delay_until: null,
    },
    effect: {
      sticky: null,
      cooldown: null,
      delay: null,
    },
    extra: {
      char_info_gallery: {
        format: payload.format,
        version: payload.version,
        packId: payload.packId,
        profileId: payload.profileId,
      },
    },
  };
}

export async function readGalleryPackProfile(reference: GalleryExtensionReference): Promise<GalleryPackPayload | null> {
  const entries = await getWorldbook(reference.worldbookName);
  return findGalleryPackEntry(entries, reference)?.payload ?? null;
}

export async function saveGalleryPackProfile(
  reference: GalleryExtensionReference,
  characterName: string,
  gallery: GalleryPackImage[],
): Promise<GalleryPackPayload> {
  const payload = createGalleryPackPayload(reference, characterName, gallery);
  if (!getWorldbookNames().includes(reference.worldbookName)) {
    await createWorldbook(reference.worldbookName);
  }

  const existingEntries = await getWorldbook(reference.worldbookName);
  const existing = findGalleryPackEntry(existingEntries, reference);
  const entryInput = createWorldbookEntryInput(reference, payload);

  if (existing?.entry.uid !== undefined) {
    await updateWorldbookWith(
      reference.worldbookName,
      entries =>
        entries.map(entry =>
          entry.uid === existing.entry.uid
            ? {
                ...entry,
                ...entryInput,
              }
            : entry,
        ),
      { render: 'immediate' },
    );
  } else {
    await createWorldbookEntries(reference.worldbookName, [entryInput], { render: 'immediate' });
  }

  const verified = findGalleryPackEntry(await getWorldbook(reference.worldbookName), reference);
  if (!verified || JSON.stringify(verified.payload) !== JSON.stringify(payload)) {
    throw new Error('扩展图库保存后的读回验证失败。');
  }
  return verified.payload;
}

export async function deleteGalleryPackProfile(reference: GalleryExtensionReference): Promise<void> {
  const existingEntries = await getWorldbook(reference.worldbookName);
  const existing = findGalleryPackEntry(existingEntries, reference);
  if (!existing) return;
  if (existing.entry.uid === undefined) throw new Error('扩展图库条目缺少 UID，已停止删除。');

  await updateWorldbookWith(
    reference.worldbookName,
    entries => entries.filter(entry => entry.uid !== existing.entry.uid),
    { render: 'immediate' },
  );

  if (findGalleryPackEntry(await getWorldbook(reference.worldbookName), reference)) {
    throw new Error('扩展图库删除后的读回验证失败。');
  }
}

export function serializeGalleryPackWorkshopSource(
  reference: GalleryExtensionReference,
  characterName: string,
  gallery: GalleryPackImage[],
): string {
  const payload = createGalleryPackPayload(reference, characterName, gallery);
  const entry: GalleryPackWorkshopEntry = {
    comment: galleryPackEntryName(reference),
    enabled: false,
    strategy: {
      type: 'selective',
      keys: [`__char_info_gallery_${reference.packId}_${reference.profileId}__`],
      keys_secondary: { logic: 'and_any', keys: [] },
      scan_depth: 'same_as_global',
    },
    position: {
      type: 'before_char',
      depth: 4,
      order: 10000,
      role: 'system',
    },
    recursion: {
      prevent_incoming: true,
      prevent_outgoing: true,
      delay_until: null,
    },
    effect: {
      sticky: null,
      cooldown: null,
      delay: null,
    },
    probability: 100,
    content: serializeGalleryPackPayload(payload).trimEnd(),
  };
  return `${JSON.stringify([entry], null, 2)}\n`;
}
