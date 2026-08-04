import { characterImageMap } from './characterImageMap';
import {
  normalizeImageUrlForBrowser,
  normalizePortraitMediaUrlForBrowser,
  type PortraitMediaKind,
} from './services/imageUrl';

export type DxCharacterId = 'dx_venus' | 'dx_anastasia' | 'dx_iris' | 'dx_seren';
export type DxDivinityVariant = 'default' | 'venusCurtain';
export type DxVisualTheme = 'default' | 'venus' | 'anastasia' | 'iris';

type DxCharacterRosterEntryBase = {
  id: DxCharacterId;
  name: string;
  imageUrl: string;
  visualTheme: DxVisualTheme;
  divinityVariant: DxDivinityVariant;
  divinityStageBackgroundUrl?: string;
};

export type DxCharacterRosterEntry =
  | (DxCharacterRosterEntryBase & {
      hasRegistryData: true;
      appearVariableName: string;
    })
  | (DxCharacterRosterEntryBase & {
      hasRegistryData: false;
      appearVariableName?: never;
    });

export type CharacterPresentationProfile = {
  edition: 'dx' | 'illustrated';
  name: string;
  imageUrl: string;
  portraitKind: PortraitMediaKind;
  visualTheme: DxVisualTheme;
  divinityVariant: DxDivinityVariant;
  divinityStageBackgroundUrl?: string;
};

export const dxCharacterRoster: readonly DxCharacterRosterEntry[] = [
  {
    id: 'dx_venus',
    name: '维纳丝·珀菈·索伦蒂斯',
    imageUrl: characterImageMap['维纳丝·珀菈·索伦蒂斯'],
    visualTheme: 'venus',
    divinityVariant: 'venusCurtain',
    divinityStageBackgroundUrl: 'https://files.catbox.moe/3by4cx.png',
    hasRegistryData: true,
    appearVariableName: '$dx_venus_appear',
  },
  {
    id: 'dx_anastasia',
    name: '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯',
    imageUrl: characterImageMap['安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯'],
    visualTheme: 'anastasia',
    divinityVariant: 'default',
    hasRegistryData: true,
    appearVariableName: '$dx_anastasia_appear',
  },
  {
    id: 'dx_iris',
    name: '艾璃丝·赛瑞利亚',
    imageUrl: characterImageMap['艾璃丝·赛瑞利亚'],
    visualTheme: 'iris',
    divinityVariant: 'default',
    hasRegistryData: true,
    appearVariableName: '$dx_iris_appear',
  },
  {
    id: 'dx_seren',
    name: '瑟涟·赛瑞利亚',
    imageUrl: characterImageMap['瑟涟·赛瑞利亚'],
    visualTheme: 'default',
    divinityVariant: 'default',
    // TODO(v5.0): 完成瑟涟的完整 inject_var 后再启用自动注入。
    hasRegistryData: false,
  },
];

export function findDxCharacterByName(name: string): DxCharacterRosterEntry | null {
  return dxCharacterRoster.find(entry => entry.name === name) ?? null;
}

export function findDxCharacterById(id: string): DxCharacterRosterEntry | null {
  return dxCharacterRoster.find(entry => entry.id === id) ?? null;
}

export function resolveDxCharacterProfile(reference: string, name: string): CharacterPresentationProfile | null {
  const entry = findDxCharacterById(reference);
  if (!entry || entry.name !== name) return null;

  return createDxCharacterPresentationProfile(entry);
}

export function resolveDxCharacterNameProfile(name: string): CharacterPresentationProfile | null {
  const entry = findDxCharacterByName(name);
  return entry ? createDxCharacterPresentationProfile(entry) : null;
}

function createDxCharacterPresentationProfile(entry: DxCharacterRosterEntry): CharacterPresentationProfile | null {
  const portraitMedia = normalizePortraitMediaUrlForBrowser(entry.imageUrl);
  if (!portraitMedia) return null;
  const divinityStageBackgroundUrl = entry.divinityStageBackgroundUrl
    ? normalizeImageUrlForBrowser(entry.divinityStageBackgroundUrl)
    : undefined;

  return {
    edition: 'dx',
    name: entry.name,
    imageUrl: portraitMedia.url,
    portraitKind: portraitMedia.kind,
    visualTheme: entry.visualTheme,
    divinityVariant: entry.divinityVariant,
    divinityStageBackgroundUrl,
  };
}

export function resolveIllustratedPortraitProfile(
  name: string,
  rawImageUrl: string,
): CharacterPresentationProfile | null {
  const portraitMedia = normalizePortraitMediaUrlForBrowser(rawImageUrl);
  if (!portraitMedia) return null;

  return {
    edition: 'illustrated',
    name,
    imageUrl: portraitMedia.url,
    portraitKind: portraitMedia.kind,
    visualTheme: 'default',
    divinityVariant: 'default',
  };
}
