import {
  parseRemoteGalleryPayload,
  type RemoteGalleryImage,
  type RemoteGalleryPayload,
} from '../../char_info_shared/remoteGallery.ts';
import { normalizePortraitMediaUrlForBrowser } from './imageUrl.ts';

export const REMOTE_GALLERY_REVALIDATE_MS = 5 * 60 * 1000;
export const REMOTE_GALLERY_REQUEST_TIMEOUT_MS = 10 * 1000;

const pendingRemoteReads = new Map<string, Promise<RemoteGalleryPayload>>();
const remoteGalleryCache = new Map<string, { payload: RemoteGalleryPayload; etag: string | null; checkedAt: number }>();
const scopedRemoteGalleryReads = new Map<string, Promise<unknown>>();

export type RemoteGalleryPresentation = {
  avatarUrl: string;
  libraryThumbnailUrl: string;
  coverUrl: string;
  gallery: RemoteGalleryImage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRemoteGalleryUrl(value: unknown): string | null {
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

function previewUrlFromGallery(gallery: readonly RemoteGalleryImage[]): string {
  for (const image of gallery) {
    if (image.thumbnail) return image.thumbnail;
    for (const source of image.sources) {
      const media = normalizePortraitMediaUrlForBrowser(source);
      if (media?.kind === 'image') return media.url;
    }
  }
  return '';
}

async function fetchRemoteGallery(
  remoteUrl: string,
  refresh = false,
  signal?: AbortSignal,
  validate?: (payload: RemoteGalleryPayload) => void,
): Promise<RemoteGalleryPayload> {
  // An explicit refresh must follow any earlier read, rather than inherit its stale-cache fallback.
  if (refresh) {
    const previous = pendingRemoteReads.get(remoteUrl);
    if (previous) await previous.catch(() => undefined);
  }
  signal?.throwIfAborted();
  const cached = remoteGalleryCache.get(remoteUrl);
  const now = Date.now();
  if (!refresh && cached && now - cached.checkedAt < REMOTE_GALLERY_REVALIDATE_MS) return cached.payload;

  const pending = refresh ? undefined : pendingRemoteReads.get(remoteUrl);
  const promise =
    pending ??
    (async () => {
      const headers = new Headers();
      if (cached?.etag) headers.set('If-None-Match', cached.etag);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REMOTE_GALLERY_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(remoteUrl, {
          headers,
          credentials: 'omit',
          signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
          ...(refresh ? { cache: 'no-cache' as const } : {}),
        });
        if (response.status === 304) {
          if (!cached) throw new Error('Remote Gallery returned 304 without a local cache');
          validate?.(cached.payload);
          cached.checkedAt = Date.now();
          return cached.payload;
        }
        if (!response.ok) throw new Error(`Remote Gallery request failed (${response.status})`);

        const payload = parseRemoteGalleryPayload(await response.json());
        validate?.(payload);
        remoteGalleryCache.set(remoteUrl, {
          payload,
          etag: response.headers.get('ETag'),
          checkedAt: Date.now(),
        });
        return payload;
      } finally {
        clearTimeout(timeout);
      }
    })();

  pendingRemoteReads.set(remoteUrl, promise);
  try {
    return await promise;
  } catch (error) {
    if (refresh || !cached) throw error;
    cached.checkedAt = Date.now();
    console.warn(`[CharInfo Viewer] 远程图库刷新失败，继续使用缓存：${remoteUrl}`, error);
    return cached.payload;
  } finally {
    if (pendingRemoteReads.get(remoteUrl) === promise) pendingRemoteReads.delete(remoteUrl);
  }
}

export async function refreshRemoteGallery(
  remoteUrlValue: string,
  signal?: AbortSignal,
  validate?: (payload: RemoteGalleryPayload) => void,
): Promise<RemoteGalleryPayload> {
  const remoteUrl = normalizeRemoteGalleryUrl(remoteUrlValue);
  if (!remoteUrl) throw new Error('远程图库 URL 必须是有效的 HTTPS 地址。');
  return fetchRemoteGallery(remoteUrl, true, signal, validate);
}

export async function resolveRemoteGalleryPresentation(
  remoteUrlValue: unknown,
): Promise<RemoteGalleryPresentation | null> {
  const remoteUrl = normalizeRemoteGalleryUrl(remoteUrlValue);
  if (!remoteUrl) return null;
  const payload = await fetchRemoteGallery(remoteUrl);
  const previewUrl = previewUrlFromGallery(payload.gallery);
  return {
    avatarUrl: payload.avatarThumbnail ?? '',
    libraryThumbnailUrl: payload.libraryThumbnail ?? '',
    coverUrl: previewUrl,
    gallery: payload.gallery,
  };
}

// A selected cover is identified by its file path and rendition, not by its
// cache version. ImgBed rejects outdated ?v= values with HTTP 404, so rebase
// a persisted selection onto the newest version advertised by Gallery Pack.
function refreshSelectedCoverVersion(url: string, gallery: readonly RemoteGalleryImage[]): string | null {
  if (!url) return null;
  try {
    const selected = new URL(url);
    for (const image of gallery) {
      const candidates = [image.thumbnail, ...image.sources].filter((source): source is string => !!source);
      const matching = candidates.some(source => {
        try {
          const candidate = new URL(source);
          return selected.origin === candidate.origin && selected.pathname === candidate.pathname;
        } catch {
          return false;
        }
      });
      if (!matching) continue;

      // The gallery thumbnail is the canonical version source for all its
      // renditions (avatar, library, gallery, portrait).
      const currentVersion = candidates
        .map(source => {
          try {
            return new URL(source).searchParams.get('v');
          } catch {
            return null;
          }
        })
        .find(value => !!value);
      if (currentVersion && selected.pathname.startsWith('/thumb/')) {
        selected.searchParams.set('v', currentVersion);
        return selected.toString();
      }
      return url;
    }
  } catch {
    return null;
  }
  return null;
}

export function applyRemoteGallery(visualConfig: unknown, payload: RemoteGalleryPayload): unknown {
  if (!isRecord(visualConfig)) return visualConfig;
  const previewUrl = previewUrlFromGallery(payload.gallery);
  const chosenCover = typeof visualConfig.cover_url === 'string' ? visualConfig.cover_url.trim() : '';
  const coverUrl = refreshSelectedCoverVersion(chosenCover, payload.gallery) ?? previewUrl;
  return {
    ...visualConfig,
    gallery: payload.gallery,
    ...(coverUrl ? { cover_url: coverUrl } : {}),
  };
}

async function resolveRemoteGalleryConfigDirect(visualConfig: unknown): Promise<unknown> {
  if (!isRecord(visualConfig)) return visualConfig;
  const remoteUrl = normalizeRemoteGalleryUrl(visualConfig.gallery_pack_url);
  if (!remoteUrl) return visualConfig;

  try {
    const payload = await fetchRemoteGallery(remoteUrl);
    return applyRemoteGallery(visualConfig, payload);
  } catch (error) {
    console.warn(`[CharInfo Viewer] 远程图库读取失败 ${remoteUrl}：`, error);
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

export function clearRemoteGalleryCache(): void {
  pendingRemoteReads.clear();
  remoteGalleryCache.clear();
  scopedRemoteGalleryReads.clear();
}
