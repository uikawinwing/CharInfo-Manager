import type { CharacterData, ThemeResolved } from '../types';
import {
  normalizeProfileMetadata,
  type CharacterProfileMetadata,
} from '../../char_info_shared/characterVisualProfile.ts';
import { resolveGalleryExtension } from './galleryPackService.ts';
import { prioritizeImageSourceGroups } from './imageSourcePriority';

const SPECIAL_NPC_VISUAL_BRAND = Symbol('char_info_special_npc_visual');
const DEPRECATED_VISUAL_SYNTAX_BRAND = Symbol('char_info_deprecated_visual_syntax');
const LEGACY_VISUAL_PROFILE_BRAND = Symbol('char_info_legacy_visual_profile');
const VISUAL_PROFILE_METADATA = Symbol('char_info_visual_profile_metadata');
export type LegacyVisualProfileSource = 'char_info_visuals' | 'char_info.visual' | 'char_info.visuals';
type SpecialNpcVisualData = CharacterData & { [SPECIAL_NPC_VISUAL_BRAND]?: true };
type DeprecatedVisualSyntaxData = CharacterData & { [DEPRECATED_VISUAL_SYNTAX_BRAND]?: true };
type LegacyVisualProfileData = CharacterData & { [LEGACY_VISUAL_PROFILE_BRAND]?: LegacyVisualProfileSource };
type CharacterVisualMetadataData = CharacterData & { [VISUAL_PROFILE_METADATA]?: CharacterProfileMetadata };

function brandSpecialNpcVisualData(data: CharacterData): CharacterData {
  Object.defineProperty(data, SPECIAL_NPC_VISUAL_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
  });
  return data;
}

export function isSpecialNpcVisualData(data: CharacterData): boolean {
  return (data as SpecialNpcVisualData)[SPECIAL_NPC_VISUAL_BRAND] === true;
}

function brandDeprecatedVisualSyntaxData(data: CharacterData): CharacterData {
  Object.defineProperty(data, DEPRECATED_VISUAL_SYNTAX_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
  });
  return data;
}

export function hasDeprecatedVisualSyntax(data: CharacterData): boolean {
  return (data as DeprecatedVisualSyntaxData)[DEPRECATED_VISUAL_SYNTAX_BRAND] === true;
}

function brandLegacyVisualProfileData(data: CharacterData, source: LegacyVisualProfileSource): CharacterData {
  Object.defineProperty(data, LEGACY_VISUAL_PROFILE_BRAND, {
    value: source,
    enumerable: false,
    configurable: false,
  });
  return data;
}

export function getLegacyVisualProfileSource(data: CharacterData): LegacyVisualProfileSource | null {
  return (data as LegacyVisualProfileData)[LEGACY_VISUAL_PROFILE_BRAND] ?? null;
}

function attachCharacterVisualMetadata(
  data: CharacterData,
  metadata: CharacterProfileMetadata | undefined,
): CharacterData {
  if (!metadata) return data;
  Object.defineProperty(data, VISUAL_PROFILE_METADATA, {
    value: metadata,
    enumerable: false,
    configurable: true,
  });
  return data;
}

export function resolveCharacterVisualMetadata(data: CharacterData): CharacterProfileMetadata | null {
  return (data as CharacterVisualMetadataData)[VISUAL_PROFILE_METADATA] ?? null;
}

export function cloneCharacterDataWithVisualOverrides(
  data: CharacterData,
  overrides: Pick<CharacterData, '登场台词'>,
): CharacterData {
  const clone: CharacterData = {
    ...data,
    ...(overrides.登场台词 === undefined ? {} : { 登场台词: overrides.登场台词 }),
  };
  if (isSpecialNpcVisualData(data)) brandSpecialNpcVisualData(clone);
  if (hasDeprecatedVisualSyntax(data)) brandDeprecatedVisualSyntaxData(clone);
  const legacySource = getLegacyVisualProfileSource(data);
  if (legacySource) brandLegacyVisualProfileData(clone, legacySource);
  const metadata = resolveCharacterVisualMetadata(data);
  if (metadata) attachCharacterVisualMetadata(clone, metadata);
  return clone;
}

export const raceColorMap: Record<string, string> = {
  神祗: '#FFFFFF',
  龙族: '#FFD700',
  龙姬: '#FFD700',
  龙裔: '#FFA500',
  巨龙: '#FFD700',
  古龙: '#FFD700',
  亚龙: '#FFAE42',
  血姬: '#FF0000',
  血族: '#DC143C',
  亡灵种族: '#32CD32',
  不死生物: '#32CD32',
  翼民: '#00BFFF',
  翼族: '#00BFFF',
  堕羽民: '#9370DB',
  女妖: '#FF1493',
  人类: '#FFDAB9',
  矮人: '#D2691E',
  半身人: '#FFD700',
  精灵: '#00FF7F',
  光翅妖精: '#FFFF00',
  汐海妖精: '#00FFFF',
  妖精: '#FF00FF',
  宁芙: '#FF00FF',
  兽族: '#FF4500',
  黑角民: '#00CED1',
  蛇女: '#00FF7F',
  半人马: '#FF8C00',
  人鱼: '#00FFFF',
  地精: '#32CD32',
  魔物: '#8A2BE2',
  深渊魔族: '#9400D3',
  异域生物: '#FF00FF',
  巨人: '#D2691E',
  半巨人: '#D2691E',
  小巨人: '#D2691E',
  霜巨人: '#00BFFF',
  泰坦人族: '#FFD700',
  山妖: '#DAA520',
  食人魔: '#7CFC00',
  巨魔: '#7CFC00',
  雪怪: '#E0FFFF',
  诗灵: '#EE82EE',
  英灵: '#00BFFF',
  从者: '#00BFFF',
  构装体: '#00CED1',
  人造生物: '#00FF7F',
  元素生物: '#FF0000',
  植物生物: '#00FF00',
  不定形生物: '#7CFC00',
  其他: '#E0E0E0',
};

export const tierColorMap: Record<number, string> = {
  1: '#57595D',
  2: '#50C878',
  3: '#2196F3',
  4: '#9932CC',
  5: '#FFD700',
  6: '#DC143C',
  7: '#00FFFF',
};

const RACE_ALIAS_TO_SIMPLIFIED: Record<string, string> = {
  人類: '人类',
  其它: '其他',
  詩靈: '诗灵',
  器靈: '器灵',
  鑄魂: '铸魂',
  願靈: '愿灵',
  聖靈: '圣灵',
  英靈: '英灵',
  從者: '从者',
  構裝: '构装',
  史萊姆: '史莱姆',
  異域: '异域',
  異界: '异界',
  精靈: '精灵',
  木靈: '木灵',
  天舞龍: '天舞龙',
  魔紋龍: '魔纹龙',
  亞龍: '亚龙',
  北境龍裔: '北境龙裔',
  東方後裔: '东方后裔',
  花靈: '花灵',
  人馬: '人马',
  蠑螈: '蝾螈',
  墮翼: '堕翼',
  墮羽: '堕羽',
  深淵: '深渊',
  小惡魔: '小恶魔',
  惡魔: '恶魔',
  龍: '龙',
  亞: '亚',
  靈: '灵',
  詩: '诗',
  異: '异',
  體: '体',
  構: '构',
  裝: '装',
  祇: '祗',
  魚: '鱼',
  獸: '兽',
  種: '种',
  寧: '宁',
  墮: '堕',
  聖: '圣',
  惡: '恶',
  從: '从',
  願: '愿',
  鑄: '铸',
  機: '机',
  鳥: '鸟',
  馬: '马',
};

function hexToRgbObj(hex: string): { r: number; g: number; b: number } {
  let h = (hex || '#808080').replace(/^#/, '');
  if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return {
    r: Number.isFinite(r) ? r : 128,
    g: Number.isFinite(g) ? g : 128,
    b: Number.isFinite(b) ? b : 128,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): string {
  const { r, g, b } = hexToRgbObj(hex);
  return `${r}, ${g}, ${b}`;
}

export function normalizeCustomHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toUpperCase() : null;
}

function normalizeVisualConfigUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? trimmed : null;
  } catch (_) {
    return null;
  }
}

function normalizeVisualConfigGallery(value: unknown): string[][] {
  const candidates = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\r?\n/) : [];

  return candidates.reduce<string[][]>((groups, candidate) => {
    const record = asRecord(candidate);
    if (record?.viewerVisible === false || record?.viewer_visible === false) return groups;
    const sourceCandidates = Array.isArray(record?.sources) ? record.sources : [record?.url ?? candidate];
    const sources = sourceCandidates.reduce<string[]>((urls, sourceCandidate) => {
      const source = normalizeVisualConfigUrl(sourceCandidate);
      if (source && !urls.includes(source)) urls.push(source);
      return urls;
    }, []);
    if (sources.length > 0 && !groups.some(group => group[0] === sources[0])) groups.push(sources);
    return groups;
  }, []);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function resolveCharacterName(data: CharacterData): string {
  return typeof data.姓名 === 'string' ? data.姓名.trim() : '';
}

function hasUntrustedImageSyntax(data: CharacterData): boolean {
  return [data.角色图片, data.立绘, data.特殊立绘, data.图片, data.portrait, data.image].some(
    value => typeof value === 'string' && value.trim().length > 0,
  );
}

function stripUntrustedImageData(data: CharacterData): CharacterData {
  const resolved = { ...data };
  delete resolved.角色图片;
  delete resolved.立绘;
  delete resolved.特殊立绘;
  delete resolved.图片;
  delete resolved.portrait;
  delete resolved.image;
  delete resolved.__char_info_image_urls;
  delete resolved.__char_info_image_source_groups;
  delete resolved.__char_info_randomize_initial_image;
  return resolved;
}

type NamedVisualConfigResolution = {
  config: unknown;
  legacySource: LegacyVisualProfileSource | null;
};

function resolveNamedVisualConfig(
  data: CharacterData,
  chatVariables: Record<string, unknown>,
): NamedVisualConfigResolution | undefined {
  const name = resolveCharacterName(data);
  if (!name) return undefined;

  const charInfo = asRecord(chatVariables.char_info);
  const profiles = asRecord(charInfo?.profiles);
  const profile = profiles && Object.hasOwn(profiles, name) ? profiles[name] : undefined;
  const legacyCandidates: Array<{ source: LegacyVisualProfileSource; value: unknown }> = [
    { source: 'char_info_visuals', value: asRecord(chatVariables.char_info_visuals)?.[name] },
    { source: 'char_info.visual', value: asRecord(charInfo?.visual)?.[name] },
    { source: 'char_info.visuals', value: asRecord(charInfo?.visuals)?.[name] },
  ];
  const legacyCandidate = legacyCandidates.find(candidate => candidate.value !== undefined && candidate.value !== null);
  const legacyProfile = legacyCandidate?.value;
  const profileRecord = asRecord(profile);
  const legacyRecord = asRecord(legacyProfile);

  if (profileRecord && legacyRecord) {
    const mergedProfile = { ...profileRecord };
    if (mergedProfile.custom_racecolor === undefined) {
      mergedProfile.custom_racecolor = legacyRecord.custom_racecolor;
    }
    if (mergedProfile.custom_tiercolor === undefined) {
      mergedProfile.custom_tiercolor = legacyRecord.custom_tiercolor;
    }
    if (mergedProfile.登场台词 === undefined) mergedProfile.登场台词 = legacyRecord.登场台词;
    return { config: mergedProfile, legacySource: null };
  }
  if (profileRecord) return { config: profileRecord, legacySource: null };
  if (legacyRecord && legacyCandidate) return { config: legacyRecord, legacySource: legacyCandidate.source };
  if (legacyCandidate) return { config: legacyProfile, legacySource: legacyCandidate.source };
  return profile === undefined ? undefined : { config: profile, legacySource: null };
}

export function resolveCharacterVisualPreloadUrls(
  characterName: string,
  chatVariables: Record<string, unknown>,
  limit = 1,
  sourcePriorities: readonly string[] = [],
): string[] {
  const name = characterName.trim();
  if (!name || limit <= 0) return [];

  const visualResolution = resolveNamedVisualConfig({ 姓名: name }, chatVariables);
  const visualConfig = visualResolution?.config;
  if (typeof visualConfig === 'string') {
    const url = normalizeVisualConfigUrl(visualConfig);
    return url ? [url] : [];
  }

  const config = asRecord(visualConfig);
  if (!config) return [];
  const primaryUrl = normalizeVisualConfigUrl(config.url);
  const galleryGroups = normalizeVisualConfigGallery(config.gallery);
  const sourceGroups = [primaryUrl ? [primaryUrl] : null, ...galleryGroups].filter(
    (group): group is string[] => Boolean(group?.length),
  );
  return prioritizeImageSourceGroups(sourceGroups, sourcePriorities)
    .map(sources => sources[0])
    .filter((url, index, urls) => urls.indexOf(url) === index)
    .slice(0, limit);
}

function applyVisualAppearance(data: CharacterData, visualConfig: unknown): CharacterData {
  const config = asRecord(visualConfig);
  if (!config) return data;

  const raceColor = normalizeCustomHexColor(config.custom_racecolor);
  const tierColor = normalizeCustomHexColor(config.custom_tiercolor);
  const entranceQuote = typeof config.登场台词 === 'string' ? config.登场台词.trim() : '';
  if (!raceColor && !tierColor && !entranceQuote) return data;

  const resolved = { ...data };
  if (raceColor) resolved.custom_racecolor = raceColor;
  if (tierColor) resolved.custom_tiercolor = tierColor;
  if (entranceQuote) resolved.登场台词 = entranceQuote;
  return resolved;
}

function applyImageSourceGroups(
  data: CharacterData,
  imageSourceGroups: string[][],
  randomizeInitialImage: boolean,
): CharacterData {
  const imageUrls = imageSourceGroups.map(sources => sources[0]);
  return {
    ...data,
    角色图片: imageUrls[0],
    __char_info_image_urls: imageUrls,
    __char_info_image_source_groups: imageSourceGroups,
    __char_info_randomize_initial_image: randomizeInitialImage && imageUrls.length > 1,
  };
}

function visualConfigHasImage(visualConfig: unknown): boolean {
  if (typeof visualConfig === 'string') return normalizeVisualConfigUrl(visualConfig) !== null;
  const config = asRecord(visualConfig);
  if (!config) return false;
  return normalizeVisualConfigUrl(config.url) !== null || normalizeVisualConfigGallery(config.gallery).length > 0;
}

function applyVisualConfig(data: CharacterData, visualConfig: unknown, clearImageOnFailure: boolean): CharacterData {
  const resolvedAppearance = applyVisualAppearance(data, visualConfig);
  const fallback = clearImageOnFailure ? { ...resolvedAppearance, 角色图片: '' } : resolvedAppearance;

  if (typeof visualConfig === 'string') {
    const url = normalizeVisualConfigUrl(visualConfig);
    return url ? applyImageSourceGroups(resolvedAppearance, [[url]], false) : fallback;
  }

  const config = asRecord(visualConfig);
  if (!config) return fallback;
  const metadata = normalizeProfileMetadata(config.metadata);
  const withMetadata = (resolved: CharacterData) => attachCharacterVisualMetadata(resolved, metadata);

  const url = normalizeVisualConfigUrl(config.url);
  const gallery = normalizeVisualConfigGallery(config.gallery);
  const imageSourceGroups = [url ? [url] : null, ...gallery].reduce<string[][]>((groups, candidate) => {
    if (candidate && !groups.some(group => group[0] === candidate[0])) groups.push(candidate);
    return groups;
  }, []);
  if (imageSourceGroups.length === 0) return withMetadata(fallback);

  const isVersionedProfile = Number(config.schema_version) >= 1;
  return withMetadata(applyImageSourceGroups(resolvedAppearance, imageSourceGroups, !url && !isVersionedProfile));
}

function finalizeNamedVisualResolution(
  baseData: CharacterData,
  visualConfig: unknown,
  legacySource: LegacyVisualProfileSource | null,
  hasLegacySyntax: boolean,
): CharacterData {
  let resolved = applyVisualConfig(baseData, visualConfig, false);
  if (visualConfigHasImage(visualConfig)) resolved = brandSpecialNpcVisualData(resolved);
  if (legacySource) resolved = brandLegacyVisualProfileData(resolved, legacySource);
  if (hasLegacySyntax) resolved = brandDeprecatedVisualSyntaxData(resolved);
  return resolved;
}

export function resolveCharacterVisualPreview(
  data: CharacterData,
  characterName: string,
  visualConfig: unknown,
): CharacterData {
  const baseData = stripUntrustedImageData(data);
  const expectedName = characterName.trim();
  if (!expectedName || resolveCharacterName(baseData) !== expectedName) return baseData;

  const resolved = applyVisualConfig(baseData, visualConfig, false);
  return visualConfigHasImage(visualConfig) ? brandSpecialNpcVisualData(resolved) : resolved;
}

export function resolveCharacterVisualConfig(
  data: CharacterData,
  chatVariables: Record<string, unknown>,
): CharacterData {
  const hasLegacySyntax = hasUntrustedImageSyntax(data);
  const baseData = stripUntrustedImageData(data);
  const namedVisualResolution = resolveNamedVisualConfig(data, chatVariables);
  if (!namedVisualResolution) return hasLegacySyntax ? brandDeprecatedVisualSyntaxData(baseData) : baseData;

  return finalizeNamedVisualResolution(
    baseData,
    namedVisualResolution.config,
    namedVisualResolution.legacySource,
    hasLegacySyntax,
  );
}

export async function resolveCharacterVisualConfigWithExtensions(
  data: CharacterData,
  chatVariables: Record<string, unknown>,
): Promise<CharacterData> {
  const hasLegacySyntax = hasUntrustedImageSyntax(data);
  const baseData = stripUntrustedImageData(data);
  const namedVisualResolution = resolveNamedVisualConfig(data, chatVariables);
  if (!namedVisualResolution) return hasLegacySyntax ? brandDeprecatedVisualSyntaxData(baseData) : baseData;

  const extendedVisualConfig = await resolveGalleryExtension(namedVisualResolution.config);
  return finalizeNamedVisualResolution(
    baseData,
    extendedVisualConfig,
    namedVisualResolution.legacySource,
    hasLegacySyntax,
  );
}

export function harmonizeAccent(
  hex: string,
  mixTarget = '#94a3b8',
  mixRatio = 0.48,
  minLuma = 92,
  maxLuma = 188,
): string {
  const base = hexToRgbObj(hex);
  const target = hexToRgbObj(mixTarget);

  let r = base.r * (1 - mixRatio) + target.r * mixRatio;
  let g = base.g * (1 - mixRatio) + target.g * mixRatio;
  let b = base.b * (1 - mixRatio) + target.b * mixRatio;

  const luma = () => 0.299 * r + 0.587 * g + 0.114 * b;
  let current = luma();

  if (current < minLuma) {
    const t = (minLuma - current) / 255;
    r = r + (255 - r) * t;
    g = g + (255 - g) * t;
    b = b + (255 - b) * t;
    current = luma();
  }

  if (current > maxLuma) {
    const t = (current - maxLuma) / 255;
    r = r * (1 - t);
    g = g * (1 - t);
    b = b * (1 - t);
  }

  return rgbToHex(r, g, b);
}

function resolveTier(raw: unknown): number {
  const tierMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7 };
  const tierText = String(raw || '').trim();

  const tierStr = tierText.match(/第\s*([一二三四五六七1-7])\s*[层層][级級]/);
  if (tierStr) {
    const token = tierStr[1];
    return tierMap[token] || parseInt(token, 10) || 1;
  }

  const directDigit = tierText.match(/[1-7]/);
  if (directDigit) return parseInt(directDigit[0], 10) || 1;

  const directCn = tierText.match(/[一二三四五六七]/);
  if (directCn) return tierMap[directCn[0]] || 1;

  return parseInt(tierText, 10) || 1;
}

function normalizeRaceTextForLookup(race: string): string {
  let normalized = race;

  const aliasEntries = Object.entries(RACE_ALIAS_TO_SIMPLIFIED).sort((a, b) => b[0].length - a[0].length);
  aliasEntries.forEach(([from, to]) => {
    if (normalized.includes(from)) {
      normalized = normalized.split(from).join(to);
    }
  });

  return normalized;
}

function resolveRaceKey(race: string): string {
  const normalizedRace = normalizeRaceTextForLookup(race);

  let raceKey = '其他';
  for (const k of Object.keys(raceColorMap)) {
    if (race.includes(k) || normalizedRace.includes(k)) {
      raceKey = k;
      break;
    }
  }
  return raceKey;
}

export function resolveTheme(data: CharacterData): ThemeResolved {
  const tier = resolveTier(data.生命层级);
  const race = data.种族 || '其他';
  const raceKey = resolveRaceKey(race);

  const raceRawHex = raceColorMap[raceKey] || raceColorMap.其他;
  const tierRawHex = tierColorMap[tier] || tierColorMap[1];

  const raceHex =
    normalizeCustomHexColor(data.custom_racecolor) ?? harmonizeAccent(raceRawHex, '#808080', 0.1, 84, 198);
  const tierHex = normalizeCustomHexColor(data.custom_tiercolor) ?? tierRawHex;

  return {
    tier,
    raceKey,
    raceHex,
    tierHex,
    raceRgb: hexToRgb(raceHex),
    tierRgb: hexToRgb(tierHex),
  };
}

export function applyTheme(theme: ThemeResolved, root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--race-color', theme.raceHex);
  root.style.setProperty('--race-color-rgb', theme.raceRgb);
  root.style.setProperty('--tier-color', theme.tierHex);
  root.style.setProperty('--tier-color-rgb', theme.tierRgb);
}
