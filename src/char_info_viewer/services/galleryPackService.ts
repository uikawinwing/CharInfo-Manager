import {
  findGalleryPackEntry,
  isRemoteGalleryExtensionReference,
  normalizeGalleryExtensionReference,
  parseGalleryPackPayload,
  type GalleryExtensionReference,
  type GalleryPackEntryLike,
  type GalleryPackImage,
  type GalleryPackPayload,
} from '../../char_info_shared/galleryPack.ts';

const pendingWorldbookReads = new Map<string, Promise<GalleryPackEntryLike[]>>();
const pendingRemoteReads = new Map<string, Promise<GalleryPackPayload>>();

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

async function readRemoteGalleryPack(url: string): Promise<GalleryPackPayload> {
  const pending = pendingRemoteReads.get(url);
  if (pending) return pending;

  const promise = fetch(url, { credentials: 'omit' }).then(async response => {
    if (!response.ok) throw new Error(`远端扩展图库请求失败（HTTP ${response.status}）。`);
    if (response.url && new URL(response.url).protocol !== 'https:') {
      throw new Error('远端扩展图库重定向后的 URL 必须使用 HTTPS。');
    }
    return parseGalleryPackPayload(await response.text());
  });
  pendingRemoteReads.set(url, promise);
  try {
    return await promise;
  } finally {
    if (pendingRemoteReads.get(url) === promise) pendingRemoteReads.delete(url);
  }
}

export async function resolveGalleryExtensionPayload(
  reference: GalleryExtensionReference,
): Promise<GalleryPackPayload | null> {
  if (isRemoteGalleryExtensionReference(reference)) return readRemoteGalleryPack(reference.url);
  const entries = await readGalleryWorldbook(reference.worldbookName);
  return findGalleryPackEntry(entries, reference)?.payload ?? null;
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
    const payload = await resolveGalleryExtensionPayload(reference);
    if (!payload) {
      console.warn('[CharInfo Viewer] 未找到扩展图库。', reference);
      return visualConfig;
    }
    return mergeGalleryExtension(visualConfig, payload.gallery);
  } catch (error) {
    console.warn('[CharInfo Viewer] 扩展图库读取失败：', reference, error);
    return visualConfig;
  }
}

export function clearGalleryPackCache(): void {
  pendingWorldbookReads.clear();
  pendingRemoteReads.clear();
}
