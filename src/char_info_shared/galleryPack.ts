import { isSupportedRemoteImageUrl, isSupportedRemoteMediaUrl } from './remoteMediaUrl.ts';

export const GALLERY_PACK_FORMAT = 'char-info-gallery-pack';
export const GALLERY_PACK_VERSION = 1;

export type GalleryPackImage = {
  title: string;
  sources: string[];
  thumbnail?: string;
  viewerVisible?: boolean;
};

export type GalleryPackPayload = {
  format: typeof GALLERY_PACK_FORMAT;
  version: typeof GALLERY_PACK_VERSION;
  packId: string;
  profileId: string;
  characterName: string;
  avatarThumbnail: string | null;
  libraryThumbnail: string | null;
  gallery: GalleryPackImage[];
};

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
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

function parsePackThumbnail(value: unknown, fieldName: 'avatarThumbnail' | 'libraryThumbnail'): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(`Gallery Pack ${fieldName} 必须是 HTTPS 图片 URL 或 null。`);
  const normalized = value.trim();
  if (!normalized || !isHttpsUrl(normalized) || !isSupportedRemoteImageUrl(normalized)) {
    throw new Error(`Gallery Pack ${fieldName} 必须是受支持的 HTTPS 图片直链或 null。`);
  }
  return normalized;
}

function parseGalleryImage(value: unknown, index: number): GalleryPackImage {
  if (!isRecord(value)) throw new Error(`第 ${index + 1} 张远程图库图片格式无效。`);

  const title = typeof value.title === 'string' && value.title.trim() ? value.title.trim() : `立绘 ${index + 1}`;
  if (hasControlCharacter(title)) throw new Error(`第 ${index + 1} 张远程图库图片标题无效。`);

  const sources = normalizeSources(value.sources);
  if (sources.length === 0) throw new Error(`第 ${index + 1} 张远程图库图片缺少 URL。`);
  sources.forEach((source, sourceIndex) => {
    if (!isHttpsUrl(source)) {
      throw new Error(`第 ${index + 1} 张远程图库图片的第 ${sourceIndex + 1} 个 URL 必须使用 HTTPS。`);
    }
    if (!isSupportedRemoteMediaUrl(source)) {
      throw new Error(
        `第 ${index + 1} 张远程图库图片的第 ${sourceIndex + 1} 个 URL 只支持 PNG / JPG / JPEG / GIF / APNG / WebP / AVIF / MP4 / WebM 直链。`,
      );
    }
  });

  const thumbnail = typeof value.thumbnail === 'string' ? value.thumbnail.trim() : '';
  if (thumbnail && (!isHttpsUrl(thumbnail) || !isSupportedRemoteImageUrl(thumbnail))) {
    throw new Error(`第 ${index + 1} 张远程图库图片的缩略图必须使用受支持的 HTTPS 图片直链。`);
  }

  return {
    title,
    sources,
    ...(thumbnail ? { thumbnail } : {}),
    ...(value.viewerVisible === false || value.viewer_visible === false ? { viewerVisible: false } : {}),
  };
}

export function parseGalleryPackPayload(value: unknown): GalleryPackPayload {
  const raw = typeof value === 'string' ? JSON.parse(value) : value;
  if (!isRecord(raw)) throw new Error('远程 Gallery Pack 必须是 JSON 对象。');
  if (raw.format !== GALLERY_PACK_FORMAT) throw new Error('不是 CharInfo Gallery Pack。');
  if (raw.version !== GALLERY_PACK_VERSION) throw new Error(`不支持 Gallery Pack 版本 ${String(raw.version)}。`);

  const packId = typeof raw.packId === 'string' ? raw.packId.trim().toLowerCase() : '';
  const profileId = typeof raw.profileId === 'string' ? raw.profileId.trim().toLowerCase() : '';
  const characterName = typeof raw.characterName === 'string' ? raw.characterName.trim() : '';

  if (!ID_PATTERN.test(packId)) throw new Error('Gallery Pack ID 无效。');
  if (!ID_PATTERN.test(profileId)) throw new Error('Gallery Profile ID 无效。');
  if (!characterName || characterName.length > MAX_CHARACTER_NAME_LENGTH || hasControlCharacter(characterName)) {
    throw new Error('Gallery Pack 角色姓名无效。');
  }
  if (!Object.prototype.hasOwnProperty.call(raw, 'avatarThumbnail')) throw new Error('Gallery Pack 缺少 avatarThumbnail。');
  if (!Object.prototype.hasOwnProperty.call(raw, 'libraryThumbnail')) throw new Error('Gallery Pack 缺少 libraryThumbnail。');
  if (!Array.isArray(raw.gallery)) throw new Error('Gallery Pack 缺少 gallery 数组。');

  return {
    format: GALLERY_PACK_FORMAT,
    version: GALLERY_PACK_VERSION,
    packId,
    profileId,
    characterName,
    avatarThumbnail: parsePackThumbnail(raw.avatarThumbnail, 'avatarThumbnail'),
    libraryThumbnail: parsePackThumbnail(raw.libraryThumbnail, 'libraryThumbnail'),
    gallery: raw.gallery.map(parseGalleryImage),
  };
}
