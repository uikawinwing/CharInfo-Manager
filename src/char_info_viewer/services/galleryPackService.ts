import {
  findGalleryPackEntry,
  normalizeGalleryExtensionReference,
  parseGalleryPackPayload,
  type GalleryPackEntryLike,
  type GalleryPackImage,
} from '../../char_info_shared/galleryPack.ts';
import {
  normalizeProfileMetadata,
  type CharacterProfileMetadata,
} from '../../char_info_shared/characterVisualProfile.ts';

export const REMOTE_VISUAL_REVALIDATE_MS = 5 * 60 * 1000;

const REMOTE_VISUAL_FORMAT = 'char-info-visual-pack';
const REMOTE_VISUAL_VERSION = 1;
const HEX_PATTERN = /^#[0-9A-F]{6}$/;

const pendingWorldbookReads = new Map<string, Promise<GalleryPackEntryLike[]>>();
const pendingRemoteReads = new Map<string, Promise<RemoteVisualPackPayload>>();
const remoteVisualCache = new Map<
  string,
  { payload: RemoteVisualPackPayload; etag: string | null; checkedAt: number }
>();

type RemoteVisualPayload = {
  entranceQuote: string;
  raceColor: string;
  tierColor: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  metadata?: CharacterProfileMetadata;
};

type RemoteVisualPackPayload = {
  format: typeof REMOTE_VISUAL_FORMAT;
  version: typeof REMOTE_VISUAL_VERSION;
  packId: string;
  profileId: string;
  characterName: string;
  visual: RemoteVisualPayload | null;
  gallery: GalleryPackImage[];
};

export type RemoteVisualPresentation = {
  avatarUrl: string;
  coverUrl: string;
  gallery: GalleryPackImage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readEmbeddedGallery(config: Record<string, unknown>): unknown[] {
  return Array.isArray(config.gallery) ? config.gallery : [];
}

function normalizeRemoteVisualUrl(value: unknown): string | null {
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

function requireText(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Remote visual pack requires ${key}`);
  return value.trim();
}

function normalizeOptionalHttpsUrl(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${label} must be an HTTPS URL or null`);
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS`);
    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message === `${label} must use HTTPS`) throw error;
    throw new Error(`${label} must be an HTTPS URL or null`, { cause: error });
  }
}

function normalizeRemoteColor(value: unknown, label: string): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'string') throw new Error(`${label} must use #RRGGBB`);
  const normalized = value.trim().toUpperCase();
  if (!HEX_PATTERN.test(normalized)) throw new Error(`${label} must use #RRGGBB`);
  return normalized;
}

function parseRemoteGallery(value: Record<string, unknown>): GalleryPackImage[] {
  if (!Array.isArray(value.gallery)) throw new Error('Remote visual pack requires gallery');
  if (value.gallery.length === 0) return [];
  return parseGalleryPackPayload({
    format: 'char-info-gallery-pack',
    version: 1,
    packId: requireText(value, 'packId'),
    profileId: requireText(value, 'profileId'),
    characterName: requireText(value, 'characterName'),
    gallery: value.gallery,
  }).gallery;
}

function parseRemoteVisual(value: unknown): RemoteVisualPayload | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error('Remote visual pack visual must be an object or null');

  const entranceQuote = typeof value.entranceQuote === 'string' ? value.entranceQuote.trim() : '';
  const raceColor = normalizeRemoteColor(value.raceColor, 'raceColor');
  const tierColor = normalizeRemoteColor(value.tierColor, 'tierColor');
  const avatarUrl = normalizeOptionalHttpsUrl(value.avatarUrl, 'avatarUrl');
  const coverUrl = normalizeOptionalHttpsUrl(value.coverUrl, 'coverUrl');
  const metadata = normalizeProfileMetadata(value.metadata);

  return {
    entranceQuote,
    raceColor,
    tierColor,
    avatarUrl,
    coverUrl,
    ...(metadata ? { metadata } : {}),
  };
}

function parseRemoteVisualPackPayload(value: unknown): RemoteVisualPackPayload {
  if (!isRecord(value)) throw new Error('Remote visual pack must be an object');
  if (value.format !== REMOTE_VISUAL_FORMAT || value.version !== REMOTE_VISUAL_VERSION) {
    throw new Error('Unsupported remote visual pack format');
  }

  return {
    format: REMOTE_VISUAL_FORMAT,
    version: REMOTE_VISUAL_VERSION,
    packId: requireText(value, 'packId'),
    profileId: requireText(value, 'profileId'),
    characterName: requireText(value, 'characterName'),
    visual: parseRemoteVisual(value.visual),
    gallery: parseRemoteGallery(value),
  };
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

async function fetchRemoteVisualPack(remoteUrl: string): Promise<RemoteVisualPackPayload> {
  const cached = remoteVisualCache.get(remoteUrl);
  const now = Date.now();
  if (cached && now - cached.checkedAt < REMOTE_VISUAL_REVALIDATE_MS) return cached.payload;

  const pending = pendingRemoteReads.get(remoteUrl);
  if (pending) return pending;

  const promise = (async () => {
    const headers = new Headers();
    if (cached?.etag) headers.set('If-None-Match', cached.etag);

    try {
      const response = await fetch(remoteUrl, { headers, cache: 'no-store' });
      if (response.status === 304) {
        if (!cached) throw new Error('Remote visual pack returned 304 without a local cache');
        cached.checkedAt = Date.now();
        return cached.payload;
      }
      if (!response.ok) throw new Error(`Remote visual pack request failed (${response.status})`);

      const payload = parseRemoteVisualPackPayload(await response.json());
      remoteVisualCache.set(remoteUrl, {
        payload,
        etag: response.headers.get('ETag'),
        checkedAt: Date.now(),
      });
      return payload;
    } catch (error) {
      if (!cached) throw error;
      cached.checkedAt = Date.now();
      console.warn(`[CharInfo Viewer] 远程视觉资料刷新失败，继续使用缓存：${remoteUrl}`, error);
      return cached.payload;
    }
  })();

  pendingRemoteReads.set(remoteUrl, promise);
  try {
    return await promise;
  } finally {
    if (pendingRemoteReads.get(remoteUrl) === promise) pendingRemoteReads.delete(remoteUrl);
  }
}

export async function resolveRemoteVisualPresentation(remoteUrlValue: unknown): Promise<RemoteVisualPresentation | null> {
  const remoteUrl = normalizeRemoteVisualUrl(remoteUrlValue);
  if (!remoteUrl) return null;
  const payload = await fetchRemoteVisualPack(remoteUrl);
  return {
    avatarUrl: payload.visual?.avatarUrl ?? '',
    coverUrl: payload.visual?.coverUrl ?? '',
    gallery: payload.gallery,
  };
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

export function applyRemoteVisualPack(visualConfig: unknown, payload: RemoteVisualPackPayload): unknown {
  if (!isRecord(visualConfig)) return visualConfig;

  const resolved: Record<string, unknown> = {
    ...visualConfig,
    gallery: payload.gallery,
  };

  if (!payload.visual) return resolved;

  // Only the fields already owned by the local EJS visual profile may be replaced remotely.
  delete resolved.custom_racecolor;
  delete resolved.custom_tiercolor;
  delete resolved.登场台词;
  delete resolved.cover_url;
  delete resolved.metadata;

  if (payload.visual.raceColor) resolved.custom_racecolor = payload.visual.raceColor;
  if (payload.visual.tierColor) resolved.custom_tiercolor = payload.visual.tierColor;
  if (payload.visual.entranceQuote) resolved.登场台词 = payload.visual.entranceQuote;
  if (payload.visual.coverUrl) resolved.cover_url = payload.visual.coverUrl;
  if (payload.visual.metadata) resolved.metadata = payload.visual.metadata;

  return resolved;
}

export async function resolveGalleryExtension(visualConfig: unknown): Promise<unknown> {
  if (!isRecord(visualConfig)) return visualConfig;
  let resolvedConfig: unknown = visualConfig;

  const reference = normalizeGalleryExtensionReference(visualConfig.gallery_extension);
  if (reference) {
    try {
      const entries = await readGalleryWorldbook(reference.worldbookName);
      const match = findGalleryPackEntry(entries, reference);
      if (!match) {
        console.warn(
          `[CharInfo Viewer] 未找到扩展图库 ${reference.packId}/${reference.profileId}（世界书：${reference.worldbookName}）。`,
        );
      } else {
        resolvedConfig = mergeGalleryExtension(resolvedConfig, match.payload.gallery);
      }
    } catch (error) {
      console.warn(
        `[CharInfo Viewer] 扩展图库读取失败 ${reference.packId}/${reference.profileId}（世界书：${reference.worldbookName}）：`,
        error,
      );
    }
  }

  const remoteUrl = normalizeRemoteVisualUrl(visualConfig.visual_remote_url);
  if (!remoteUrl) return resolvedConfig;

  try {
    const payload = await fetchRemoteVisualPack(remoteUrl);
    return applyRemoteVisualPack(resolvedConfig, payload);
  } catch (error) {
    console.warn(`[CharInfo Viewer] 远程视觉资料读取失败 ${remoteUrl}：`, error);
    return resolvedConfig;
  }
}

export function clearGalleryPackCache(): void {
  pendingWorldbookReads.clear();
  pendingRemoteReads.clear();
  remoteVisualCache.clear();
}
