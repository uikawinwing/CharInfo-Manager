const CATBOX_FILE_HOST = 'files.catbox.moe';
const CATBOX_IMAGE_PROXY_ORIGIN = 'https://wsrv.nl/';

export type PortraitMediaKind = 'image' | 'video';

export type NormalizedPortraitMedia = {
  url: string;
  kind: PortraitMediaKind;
};

function parseAbsoluteImageUrl(url: string): URL | null {
  try {
    if (url.startsWith('//')) return new URL(`https:${url}`);
    return new URL(url);
  } catch (_) {
    return null;
  }
}

export function normalizeImageUrlForBrowser(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  const parsed = parseAbsoluteImageUrl(trimmed);
  if (!parsed || parsed.hostname !== CATBOX_FILE_HOST) return trimmed;

  const proxiedUrl = `${parsed.hostname}${parsed.pathname}${parsed.search}`;
  return `${CATBOX_IMAGE_PROXY_ORIGIN}?url=${encodeURIComponent(proxiedUrl)}`;
}

export function normalizeHttpImageUrlForBrowser(url: string): string {
  const trimmed = url.trim();
  const parsed = parseAbsoluteImageUrl(trimmed);
  if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) return '';

  return normalizeImageUrlForBrowser(trimmed);
}

export function normalizePortraitMediaUrlForBrowser(url: string): NormalizedPortraitMedia | null {
  const trimmed = url.trim();
  const parsed = parseAbsoluteImageUrl(trimmed);
  if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) return null;

  const pathname = parsed.pathname.toLowerCase();
  const kind: PortraitMediaKind = /\.(mp4|webm)$/.test(pathname) ? 'video' : 'image';
  const shouldKeepOriginalImage = /\.(gif|apng|webp|avif)$/.test(pathname);

  return {
    // 图片代理可能压平动画帧，也不能代理视频流。
    url: kind === 'video' || shouldKeepOriginalImage ? trimmed : normalizeImageUrlForBrowser(trimmed),
    kind,
  };
}
