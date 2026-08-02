import {
  findGalleryPackEntry,
  normalizeGalleryExtensionReference,
  type GalleryPackEntryLike,
  type GalleryPackImage,
} from '../../char_info_shared/galleryPack.ts';

const pendingWorldbookReads = new Map<string, Promise<GalleryPackEntryLike[]>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readEmbeddedGallery(config: Record<string, unknown>): unknown[] {
  return Array.isArray(config.gallery) ? config.gallery : [];
}

async function readGalleryWorldbook(worldbookName: string): Promise<GalleryPackEntryLike[]> {
  const pending = pendingWorldbookReads.get(worldbookName);
  if (pending) return pending;

  const promise = getWorldbook(worldbookName);
  pendingWorldbookReads.set(worldbookName, promise);
  try {
    return await promise;
  } finally {
    if (pendingWorldbookReads.get(worldbookName) === promise) {
      pendingWorldbookReads.delete(worldbookName);
    }
  }
}

export function mergeGalleryExtension(
  visualConfig: unknown,
  extensionGallery: readonly GalleryPackImage[],
): unknown {
  if (!isRecord(visualConfig) || extensionGallery.length === 0) return visualConfig;
  return {
    ...visualConfig,
    gallery: [...readEmbeddedGallery(visualConfig), ...extensionGallery],
  };
}

export async function resolveGalleryExtension(visualConfig: unknown): Promise<unknown> {
  if (!isRecord(visualConfig)) return visualConfig;
  const reference = normalizeGalleryExtensionReference(visualConfig.gallery_extension);
  if (!reference) return visualConfig;

  try {
    const entries = await readGalleryWorldbook(reference.worldbookName);
    const match = findGalleryPackEntry(entries, reference);
    if (!match) {
      console.warn(
        `[CharInfo Viewer] 未找到扩展图库 ${reference.packId}/${reference.profileId}（世界书：${reference.worldbookName}）。`,
      );
      return visualConfig;
    }
    return mergeGalleryExtension(visualConfig, match.payload.gallery);
  } catch (error) {
    console.warn(
      `[CharInfo Viewer] 扩展图库读取失败 ${reference.packId}/${reference.profileId}（世界书：${reference.worldbookName}）：`,
      error,
    );
    return visualConfig;
  }
}

export function clearGalleryPackCache(): void {
  pendingWorldbookReads.clear();
}
