import { parseGalleryPackPayload, type GalleryPackImage, type GalleryPackPayload } from '../../char_info_shared/galleryPack.ts';
import { normalizePortraitMediaUrlForBrowser } from './imageUrl.ts';

export const REMOTE_GALLERY_REVALIDATE_MS = 5 * 60 * 1000;
export const REMOTE_GALLERY_REQUEST_TIMEOUT_MS = 10 * 1000;

const pendingRemoteReads = new Map<string, Promise<GalleryPackPayload>>();
const remoteGalleryCache = new Map<
  string,
  { payload: GalleryPackPayload; etag: string | null; checkedAt: number }
>();
const scopedRemoteGalleryReads = new Map<string, Promise<unknown>>();

export type RemoteGalleryPresentation = {
  avatarUrl: string;
  libraryThumbnailUrl: string;
  coverUrl: string;
  gallery: GalleryPackImage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeGalleryPackUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeRemoteGalleryScope(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function previewUrlFromGallery(gallery: readonly GalleryPackImage[]): string {
  for (const image of gallery) {
    if (image.thumbnail) return image.thumbnail;
    for (const source of image.sources) {
      const media = normalizePortraitMediaUrlForBrowser(source);
      if (media?.kind === 'image') return media.url;
    }
  }
  return '';
}

async function fetchRemoteGalleryPack(remoteUrl: string): Promise<GalleryPackPayload> {
  const cached = remoteGalleryCache.get(remoteUrl);
  const now = Date.now();
  if (cached && now - cached.checkedAt < REMOTE_GALLERY_REVALIDATE_MS) return cached.payload;

  const pending = pendingRemoteReads.get(remoteUrl);
  if (pending) return pending;

  const promise = (async () => {
    const headers = new Headers();
    if (cached?.etag) headers.set('If-None-Match', cached.etag);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMOTE_GALLERY_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(remoteUrl, { headers, credentials: 'omit', signal: controller.signal });
      if (response.status === 304) {
        if (!cached) throw new Error('Remote Gallery Pack returned 304 without a local cache');
        cached.checkedAt = Date.now();
        return cached.payload;
      }
      if (!response.ok) throw new Error(`Remote Gallery Pack request failed (${response.status})`);

      const payload = parseGalleryPackPayload(await response.json());
      remoteGalleryCache.set(remoteUrl, {
        payload,
        etag: response.headers.get('ETag'),
        checkedAt: Date.now(),
      });
      return payload;
    } catch (error) {
      if (!cached) throw error;
      cached.checkedAt = Date.now();
      console.warn(`[CharInfo Viewer] 远程 Gallery Pack 刷新失败，继续使用缓存：${remoteUrl}`, error);
      return cached.payload;
    } finally {
      clearTimeout(timeout);
    }
  })();

  pendingRemoteReads.set(remoteUrl, promise);
  try {
    return await promise;
  } finally {
    if (pendingRemoteReads.get(remoteUrl) === promise) pendingRemoteReads.delete(remoteUrl);
  }
}

export async function resolveRemoteGalleryPresentation(remoteUrlValue: unknown): Promise<RemoteGalleryPresentation | null> {
  const remoteUrl = normalizeGalleryPackUrl(remoteUrlValue);
  if (!remoteUrl) return null;
  const payload = await fetchRemoteGalleryPack(remoteUrl);
  const previewUrl = previewUrlFromGallery(payload.gallery);
  return {
    avatarUrl: payload.avatarThumbnail ?? '',
    libraryThumbnailUrl: payload.libraryThumbnail ?? '',
    coverUrl: previewUrl,
    gallery: payload.gallery,
  };
}

export function applyRemoteGalleryPack(visualConfig: unknown, payload: GalleryPackPayload): unknown {
  if (!isRecord(visualConfig)) return visualConfig;
  const previewUrl = previewUrlFromGallery(payload.gallery);
  return {
    ...visualConfig,
    gallery: payload.gallery,
    ...(previewUrl ? { cover_url: previewUrl } : {}),
  };
}

async function resolveRemoteGalleryConfigDirect(visualConfig: unknown): Promise<unknown> {
  if (!isRecord(visualConfig)) return visualConfig;
  const remoteUrl = normalizeGalleryPackUrl(visualConfig.gallery_pack_url);
  if (!remoteUrl) return visualConfig;

  try {
    const payload = await fetchRemoteGalleryPack(remoteUrl);
    return applyRemoteGalleryPack(visualConfig, payload);
  } catch (error) {
    console.warn(`[CharInfo Viewer] 远程 Gallery Pack 读取失败 ${remoteUrl}：`, error);
    return visualConfig;
  }
}

export async function resolveRemoteGalleryConfig(visualConfig: unknown): Promise<unknown> {
  if (!isRecord(visualConfig)) return visualConfig;
  const scope = normalizeRemoteGalleryScope(visualConfig.__char_info_remote_gallery_scope);
  if (!scope) return resolveRemoteGalleryConfigDirect(visualConfig);

  const previous = scopedRemoteGalleryReads.get(scope) ?? Promise.resolve(undefined);
  const current = previous.catch(() => undefined).then(() => resolveRemoteGalleryConfigDirect(visualConfig));
  scopedRemoteGalleryReads.set(scope, current);

  try {
    return await current;
  } finally {
    if (scopedRemoteGalleryReads.get(scope) === current) scopedRemoteGalleryReads.delete(scope);
  }
}

export function clearGalleryPackCache(): void {
  pendingRemoteReads.clear();
  remoteGalleryCache.clear();
  scopedRemoteGalleryReads.clear();
}
