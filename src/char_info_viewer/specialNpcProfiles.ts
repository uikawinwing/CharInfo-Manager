import { characterImageMap } from './characterImageMap';
import {
  normalizeImageUrlForBrowser,
  normalizePortraitMediaUrlForBrowser,
  type PortraitMediaKind,
} from './services/imageUrl';

export type SpecialNpcDivinityVariant = 'default' | 'venusCurtain';
export type SpecialNpcVisualTheme = 'default' | 'venus' | 'anastasia' | 'iris';

export type SpecialNpcProfile = {
  name: string;
  imageUrl: string;
  portraitKind: PortraitMediaKind;
  visualTheme: SpecialNpcVisualTheme;
  divinityVariant: SpecialNpcDivinityVariant;
  divinityStageBackgroundUrl?: string;
};

const specialNpcReferenceProfiles: Record<string, Omit<SpecialNpcProfile, 'name' | 'portraitKind'>> = {
  special_npc_01_venus: {
    imageUrl: characterImageMap['维纳丝·珀菈·索伦蒂斯'],
    visualTheme: 'venus',
    divinityVariant: 'venusCurtain',
    divinityStageBackgroundUrl: 'https://files.catbox.moe/3by4cx.png',
  },
  special_npc_02_anastasia: {
    imageUrl: characterImageMap['安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯'],
    visualTheme: 'anastasia',
    divinityVariant: 'default',
  },
  special_npc_03_iris: {
    imageUrl: characterImageMap['艾璃丝·赛瑞利亚'],
    visualTheme: 'iris',
    divinityVariant: 'default',
  },
};

export function resolveSpecialNpcProfile(name: string): SpecialNpcProfile | null {
  const rawImageUrl = characterImageMap[name];
  if (!rawImageUrl) return null;

  const portraitMedia = normalizePortraitMediaUrlForBrowser(rawImageUrl);
  if (!portraitMedia) return null;
  return {
    name,
    imageUrl: portraitMedia.url,
    portraitKind: portraitMedia.kind,
    visualTheme: 'default',
    divinityVariant: 'default',
  };
}

export function resolveSpecialNpcReferenceProfile(reference: string, name: string): SpecialNpcProfile | null {
  const profile = specialNpcReferenceProfiles[reference];
  if (!profile) return null;

  const portraitMedia = normalizePortraitMediaUrlForBrowser(profile.imageUrl);
  if (!portraitMedia) return null;
  const divinityStageBackgroundUrl = profile.divinityStageBackgroundUrl
    ? normalizeImageUrlForBrowser(profile.divinityStageBackgroundUrl)
    : undefined;

  return {
    ...profile,
    name,
    imageUrl: portraitMedia.url,
    portraitKind: portraitMedia.kind,
    divinityStageBackgroundUrl,
  };
}

export function resolveSpecialPortraitProfile(name: string, rawImageUrl: string): SpecialNpcProfile | null {
  const portraitMedia = normalizePortraitMediaUrlForBrowser(rawImageUrl);
  if (!portraitMedia) return null;

  return {
    name,
    imageUrl: portraitMedia.url,
    portraitKind: portraitMedia.kind,
    visualTheme: 'default',
    divinityVariant: 'default',
  };
}
