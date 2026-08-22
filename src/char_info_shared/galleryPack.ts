import { isSupportedRemoteMediaUrl } from './remoteMediaUrl.ts';

export const GALLERY_PACK_FORMAT = 'char-info-gallery-pack';
export const GALLERY_PACK_VERSION = 1;
export const DEFAULT_EMBEDDED_GALLERY_LIMIT = 3;

export type GalleryExtensionReference = {
  worldbookName: string;
  packId: string;
  profileId: string;
};

export type GalleryPackImage = {
  title: string;
  sources: string[];
  viewerVisible?: boolean;
};

export type GalleryPackPayload = {
  format: typeof GALLERY_PACK_FORMAT;
  version: typeof GALLERY_PACK_VERSION;
  packId: string;
  profileId: string;
  characterName: string;
  gallery: GalleryPackImage[];
};

export type GalleryPackEntryLike = {
  uid?: number;
  name?: string;
  content?: string;
};

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
const MAX_WORLDBOOK_NAME_LENGTH = 128;
const MAX_CHARACTER_NAME_LENGTH = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some(character => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

export function createStableGalleryId(value: string, fallback: string): string {
  const source = value.trim();
  if (!source) return fallback;

  const normalized = source
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+|[^a-z0-9._-]+$/g, '')
    .slice(0, 64);
  const containsNonAsciiCharacter = Array.from(source).some(character => (character.codePointAt(0) ?? 0) > 0x7f);
  if (normalized && !containsNonAsciiCharacter) return normalized;

  let hash = 0x811c9dc5;
  Array.from(source).forEach(character => {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  });
  const suffix = (hash >>> 0).toString(36);
  const base = normalized || fallback;
  return `${base.slice(0, 63 - suffix.length)}-${suffix}`;
}

function normalizeSources(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<string[]>((sources, candidate) => {
    if (typeof candidate !== 'string') return sources;
    const source = candidate.trim();
    if (source && !sources.includes(source)) sources.push(source);
    return sources;
  }, []);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeGalleryExtensionReference(value: unknown): GalleryExtensionReference | null {
  if (!isRecord(value)) return null;
  const reference = {
    worldbookName: typeof value.worldbookName === 'string' ? value.worldbookName.trim() : '',
    packId: typeof value.packId === 'string' ? value.packId.trim().toLowerCase() : '',
    profileId: typeof value.profileId === 'string' ? value.profileId.trim().toLowerCase() : '',
  };
  return validateGalleryExtensionReference(reference).length === 0 ? reference : null;
}

export function validateGalleryExtensionReference(reference: GalleryExtensionReference): string[] {
  const errors: string[] = [];
  if (!reference.worldbookName.trim()) errors.push('扩展图库世界书名称不能为空。');
  if (reference.worldbookName.trim().length > MAX_WORLDBOOK_NAME_LENGTH) {
    errors.push(`扩展图库世界书名称不能超过 ${MAX_WORLDBOOK_NAME_LENGTH} 个字符。`);
  }
  if (
    hasControlCharacter(reference.worldbookName) ||
    reference.worldbookName.includes('<%') ||
    reference.worldbookName.includes('%>')
  ) {
    errors.push('扩展图库世界书名称包含不安全字符。');
  }
  if (!ID_PATTERN.test(reference.packId.trim().toLowerCase())) {
    errors.push('图库包 ID 必须以小写字母或数字开头，只能包含小写字母、数字、点、下划线和连字符，且最长 64 个字符。');
  }
  if (!ID_PATTERN.test(reference.profileId.trim().toLowerCase())) {
    errors.push('图库角色 ID 必须以小写字母或数字开头，只能包含小写字母、数字、点、下划线和连字符，且最长 64 个字符。');
  }
  return errors;
}

export function createGalleryPackPayload(
  reference: GalleryExtensionReference,
  characterName: string,
  gallery: GalleryPackImage[],
): GalleryPackPayload {
  const normalizedReference = normalizeGalleryExtensionReference(reference);
  if (!normalizedReference) throw new Error(validateGalleryExtensionReference(reference)[0] || '扩展图库引用无效。');

  const normalizedCharacterName = characterName.trim();
  if (!normalizedCharacterName) throw new Error('扩展图库角色姓名不能为空。');
  if (normalizedCharacterName.length > MAX_CHARACTER_NAME_LENGTH || hasControlCharacter(normalizedCharacterName)) {
    throw new Error('扩展图库角色姓名无效。');
  }

  const normalizedGallery = gallery.map((image, index) => ({
    title: image.title.trim() || `扩展立绘 ${index + 1}`,
    sources: normalizeSources(image.sources),
    ...(image.viewerVisible === false ? { viewerVisible: false } : {}),
  }));
  if (normalizedGallery.length === 0) throw new Error('扩展图库至少需要一张图片。');
  normalizedGallery.forEach((image, imageIndex) => {
    if (hasControlCharacter(image.title)) throw new Error(`第 ${imageIndex + 1} 张扩展图片标题无效。`);
    if (image.sources.length === 0) throw new Error(`第 ${imageIndex + 1} 张扩展图片缺少 URL。`);
    image.sources.forEach((source, sourceIndex) => {
      if (!isHttpsUrl(source)) {
        throw new Error(`第 ${imageIndex + 1} 张扩展图片的第 ${sourceIndex + 1} 个 URL 必须使用 HTTPS。`);
      }
      if (!isSupportedRemoteMediaUrl(source)) {
        throw new Error(
          `第 ${imageIndex + 1} 张扩展图片的第 ${sourceIndex + 1} 个 URL 只支持 PNG / JPG / JPEG / GIF / APNG / WebP / AVIF / MP4 / WebM 直链。`,
        );
      }
    });
  });

  return {
    format: GALLERY_PACK_FORMAT,
    version: GALLERY_PACK_VERSION,
    packId: normalizedReference.packId,
    profileId: normalizedReference.profileId,
    characterName: normalizedCharacterName,
    gallery: normalizedGallery,
  };
}

export function serializeGalleryPackPayload(payload: GalleryPackPayload): string {
  return `${JSON.stringify(
    createGalleryPackPayload(
      {
        worldbookName: 'serialization-placeholder',
        packId: payload.packId,
        profileId: payload.profileId,
      },
      payload.characterName,
      payload.gallery,
    ),
    null,
    2,
  )}\n`;
}

export function parseGalleryPackPayload(value: unknown): GalleryPackPayload {
  const raw = typeof value === 'string' ? JSON.parse(value) : value;
  if (!isRecord(raw)) throw new Error('扩展图库条目必须是 JSON 对象。');
  if (raw.format !== GALLERY_PACK_FORMAT) throw new Error('条目不是 CharInfo 扩展图库。');
  if (raw.version !== GALLERY_PACK_VERSION) throw new Error(`不支持扩展图库版本 ${String(raw.version)}。`);
  if (typeof raw.packId !== 'string' || typeof raw.profileId !== 'string' || typeof raw.characterName !== 'string') {
    throw new Error('扩展图库身份字段不完整。');
  }
  if (!Array.isArray(raw.gallery)) throw new Error('扩展图库缺少 gallery 数组。');

  return createGalleryPackPayload(
    {
      worldbookName: 'parse-placeholder',
      packId: raw.packId,
      profileId: raw.profileId,
    },
    raw.characterName,
    raw.gallery.map((image, index) => {
      if (!isRecord(image)) throw new Error(`第 ${index + 1} 张扩展图片格式无效。`);
      return {
        title: typeof image.title === 'string' ? image.title : '',
        sources: normalizeSources(image.sources),
        ...(image.viewerVisible === false || image.viewer_visible === false ? { viewerVisible: false } : {}),
      };
    }),
  );
}

export function galleryPackEntryName(reference: Pick<GalleryExtensionReference, 'packId' | 'profileId'>): string {
  return `[CharInfo][Gallery][${reference.packId}][${reference.profileId}]`;
}

export function findGalleryPackEntry(
  entries: readonly GalleryPackEntryLike[],
  reference: GalleryExtensionReference,
): { entry: GalleryPackEntryLike; payload: GalleryPackPayload } | null {
  const matches = entries.flatMap(entry => {
    if (typeof entry.content !== 'string') return [];
    try {
      const payload = parseGalleryPackPayload(entry.content);
      return payload.packId === reference.packId && payload.profileId === reference.profileId
        ? [{ entry, payload }]
        : [];
    } catch {
      return [];
    }
  });
  if (matches.length > 1) throw new Error(`扩展图库 ${reference.packId}/${reference.profileId} 存在重复条目。`);
  return matches[0] ?? null;
}
