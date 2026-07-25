import type { CharacterData } from '../types';

export type StatusPartnerVisualPayload = {
  partnerName: string;
  avatarUrl: string;
  images: Array<{ title: string; url: string }>;
};

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? trimmed : null;
  } catch (_) {
    return null;
  }
}

export function buildStatusPartnerVisualPayload(data: CharacterData): StatusPartnerVisualPayload | null {
  if (typeof data.__char_info_ref === 'string' && data.__char_info_ref.trim()) return null;

  const partnerName = typeof data.姓名 === 'string' ? data.姓名.trim() : '';
  if (!partnerName) return null;

  const configuredUrls = Array.isArray(data.__char_info_image_urls) ? data.__char_info_image_urls : [];
  const candidates = [data.角色图片, ...configuredUrls];
  const urls = candidates.reduce<string[]>((result, candidate) => {
    const url = normalizeHttpUrl(candidate);
    if (url && !result.includes(url)) result.push(url);
    return result;
  }, []);
  if (urls.length === 0) return null;

  return {
    partnerName,
    avatarUrl: urls[0],
    images: urls.map((url, index) => ({ title: `image${index + 1}`, url })),
  };
}

export function syncCharacterVisualsToStatusVariables(data: CharacterData): StatusPartnerVisualPayload | null {
  const payload = buildStatusPartnerVisualPayload(data);
  if (!payload) return null;

  let didWrite = false;
  updateVariablesWith(
    variables => {
      const galleryPath = ['status', 'externalGalleries', 'partners', payload.partnerName, 'images'];
      const existingGallery = _.get(variables, galleryPath);
      if (Array.isArray(existingGallery) && existingGallery.length > 0) return variables;

      const avatarPath = ['status', 'externalAvatars', 'partners', payload.partnerName, 'url'];
      const existingAvatar = _.get(variables, avatarPath);
      if (typeof existingAvatar !== 'string' || !existingAvatar.trim()) {
        _.set(variables, avatarPath, payload.avatarUrl);
      }
      _.set(variables, galleryPath, payload.images);
      didWrite = true;
      return variables;
    },
    { type: 'chat' },
  );

  return didWrite ? payload : null;
}
