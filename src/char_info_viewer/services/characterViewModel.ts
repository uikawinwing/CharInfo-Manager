import {
  resolveDxCharacterProfile,
  resolveDxStoryBookLink,
  type CharacterStoryBookLink,
  type CharacterPresentationProfile,
  isLoadedDxCharacterData,
} from '@/char_info_viewer/dxRuntime';
import type { CharacterData } from '../types';
import { getSmartArray, hasArrayContent, hasText, normalizeDisplayText } from './common';
import { prioritizeImageSourceGroups } from './imageSourcePriority';
import { normalizePortraitMediaUrlForBrowser } from './imageUrl';
import { isSpecialNpcVisualData } from './themeService';

export type TabKey =
  'profile' | 'skills' | 'equipment' | 'inventory' | 'divinity' | 'characterStory' | 'backstory' | 'statusEffects';

export type ViewTab = {
  key: TabKey;
  label: string;
};

export type ItemObject = Record<string, any>;

export type ResourceBox = {
  key: 'HP' | 'SP' | 'MP';
  label: 'HP' | 'SP' | 'MP';
  value: string;
};

export type InventorySection = {
  key: string;
  title: string;
  items: ItemObject[];
};

export type EffectEntry = {
  name: string;
  content: string;
  fallback: boolean;
};

export type DivinityKingdom = {
  name: string;
  description: string;
};

export type CharacterLayoutKind = 'default' | 'illustrated' | 'special_npc';

export type CharacterViewModel = {
  nameText: string;
  levelText: string;
  raceText: string;
  tierText: string;
  identityText: string;
  classText: string;
  personalityText: string;
  likesText: string;
  appearanceText: string;
  attireText: string;
  backstoryText: string;
  entranceQuoteText: string;
  imageUrl: string;
  imageUrls: string[];
  imageSourceGroups: string[][];
  randomizeInitialImage: boolean;
  layoutKind: CharacterLayoutKind;
  presentationProfile: CharacterPresentationProfile | null;
  resourceBoxes: ResourceBox[];
  skills: ItemObject[];
  equipments: ItemObject[];
  inventorySections: InventorySection[];
  statusEffects: ItemObject[];
  divinityGodTitle: string;
  divinityKingdom: DivinityKingdom | null;
  divinityElements: ItemObject[];
  divinityPowers: ItemObject[];
  divinityLaws: ItemObject[];
  storyBookLink: CharacterStoryBookLink | null;
  visibleTabs: ViewTab[];
};

export const tabOrder: ViewTab[] = [
  { key: 'profile', label: '档案' },
  { key: 'skills', label: '技能' },
  { key: 'equipment', label: '装备' },
  { key: 'inventory', label: '背包' },
  { key: 'divinity', label: '登神长阶' },
  { key: 'characterStory', label: '角色故事' },
  { key: 'backstory', label: '背景故事' },
  { key: 'statusEffects', label: '状态效果' },
];

export function pickField(source: unknown, ...keys: string[]): unknown {
  if (!source || typeof source !== 'object') return undefined;
  const obj = source as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

export function textFromUnknown(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return normalizeDisplayText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map(v => textFromUnknown(v))
      .filter(Boolean)
      .join(' / ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const content = textFromUnknown(val);
        return content ? `${key}: ${content}` : '';
      })
      .filter(Boolean);
    return entries.join('； ');
  }
  return String(value);
}

function asObjectArray(input: unknown): ItemObject[] {
  if (!Array.isArray(input)) return [];
  return input.filter(item => item && typeof item === 'object') as ItemObject[];
}

export function asNamedObjectArray(input: unknown): ItemObject[] {
  if (Array.isArray(input)) return asObjectArray(input);
  if (!input || typeof input !== 'object') return [];

  return Object.entries(input as Record<string, unknown>)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([name, value]) => {
      const item = value as Record<string, unknown>;
      return {
        ...item,
        名称: textFromUnknown(item.名称) || name,
      } as ItemObject;
    });
}

function mergeNamedObjectArrays(primary: unknown, legacy: unknown): ItemObject[] {
  const merged = new Map<string, ItemObject>();
  const unnamed: ItemObject[] = [];

  [...asNamedObjectArray(legacy), ...asNamedObjectArray(primary)].forEach(item => {
    const name = textFromUnknown(item.名称);
    if (!name) {
      unnamed.push(item);
      return;
    }

    merged.set(name, { ...merged.get(name), ...item, 名称: name });
  });

  return [...unnamed, ...merged.values()];
}

function parseNamedEffectLine(line: string): EffectEntry | null {
  const normalized = normalizeDisplayText(line);
  if (!normalized) return null;

  const bracketMatch = normalized.match(/^\[([^\]]+)\]\s*[：:]\s*(.*)$/);
  if (bracketMatch) {
    const name = normalizeDisplayText(bracketMatch[1]);
    const content = normalizeDisplayText(bracketMatch[2]);
    if (name && content) return { name, content, fallback: false };
    return null;
  }

  const splitIndex = normalized.search(/[：:]/);
  if (splitIndex <= 0) return null;

  const name = normalizeDisplayText(normalized.slice(0, splitIndex));
  const content = normalizeDisplayText(normalized.slice(splitIndex + 1));
  if (!name || !content) return null;

  return { name, content, fallback: false };
}

function parseEffectTextEntries(raw: string): EffectEntry[] {
  const text = String(raw || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text) return [];

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const entries: EffectEntry[] = [];
  const remains: string[] = [];

  lines.forEach(line => {
    const named = parseNamedEffectLine(line);
    if (named) {
      entries.push(named);
      return;
    }
    remains.push(line);
  });

  if (entries.length === 0) {
    return [{ name: '描述', content: text, fallback: true }];
  }

  if (remains.length > 0) {
    entries.push({ name: '描述', content: remains.join('\n'), fallback: true });
  }

  return entries;
}

function normalizeEffectEntries(value: unknown): EffectEntry[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .map(([name, raw]) => {
        const safeName = normalizeDisplayText(name) || '描述';
        const content = textFromUnknown(raw).trim();
        return {
          name: safeName,
          content,
          fallback: safeName === '描述',
        };
      })
      .filter(entry => entry.content.length > 0);
  }

  return parseEffectTextEntries(textFromUnknown(value));
}

function formatEffectEntries(entries: EffectEntry[]): string {
  if (entries.length === 0) return '无';
  if (entries.length === 1) {
    const entry = entries[0];
    return entry.fallback ? entry.content : `${entry.name}: ${entry.content}`;
  }

  return entries.map(entry => (entry.fallback ? entry.content : `${entry.name}: ${entry.content}`)).join('\n');
}

export function itemEffectEntries(item: ItemObject): EffectEntry[] {
  return normalizeEffectEntries(item?.效果);
}

export function itemEffectEntriesOrDescription(item: ItemObject): EffectEntry[] {
  const entries = itemEffectEntries(item);
  if (entries.length > 0) return entries;

  const description = itemDescription(item);
  if (!description) return [];
  return [{ name: '描述', content: description, fallback: true }];
}

export function itemName(item: ItemObject): string {
  return textFromUnknown(item?.名称) || '未命名';
}

export function itemQuality(item: ItemObject): string {
  return textFromUnknown(item?.品质 || item?.稀有度);
}

export function qualityClass(item: ItemObject): string {
  const quality = itemQuality(item).toLowerCase();
  if (!quality) return '';

  if (quality.includes('神话') || quality.includes('神話') || quality.includes('myth')) return 'quality-mythic';
  if (quality.includes('传说') || quality.includes('傳說') || quality.includes('legend')) return 'quality-legendary';
  if (quality.includes('史诗') || quality.includes('史詩') || quality.includes('epic')) return 'quality-epic';
  if (quality.includes('稀有') || quality.includes('rare')) return 'quality-rare';
  if (
    quality.includes('优良') ||
    quality.includes('優良') ||
    quality.includes('优秀') ||
    quality.includes('優秀') ||
    quality.includes('精良') ||
    quality.includes('uncommon')
  ) {
    return 'quality-uncommon';
  }
  if (quality.includes('普通') || quality.includes('common')) return 'quality-common';

  return '';
}

export function itemType(item: ItemObject): string {
  return textFromUnknown(item?.类型 || item?.分类);
}

export function itemDescription(item: ItemObject): string {
  return textFromUnknown(item?.描述);
}

export function itemEffectOrDescription(item: ItemObject): string {
  return formatEffectEntries(itemEffectEntriesOrDescription(item));
}

export function itemTags(item: ItemObject): string[] {
  const tags = item?.标签;
  if (!Array.isArray(tags)) {
    const tag = tags && typeof tags === 'object' ? textFromUnknown(tags) : '';
    return tag ? [tag] : getSmartArray(tags);
  }

  return tags
    .map(tag => (tag && typeof tag === 'object' ? textFromUnknown(tag) : normalizeDisplayText(tag)))
    .filter(Boolean);
}

export function itemCost(item: ItemObject): string {
  const fromArray = getSmartArray(item?.消耗).join(' / ');
  if (fromArray) return fromArray;
  return textFromUnknown(item?.消耗);
}

export function lawPassive(item: ItemObject): string {
  return textFromUnknown(item?.被动效果);
}

export function lawActive(item: ItemObject): string {
  return textFromUnknown(item?.主动效果);
}

export function statusEffectType(item: ItemObject): string {
  return textFromUnknown(item?.类型);
}

export function statusEffectDescription(item: ItemObject): string {
  return textFromUnknown(item?.效果);
}

export function statusEffectLayers(item: ItemObject): string {
  const value = textFromUnknown(item?.层数);
  return value ? `${value}层` : '';
}

export function statusEffectDuration(item: ItemObject): string {
  return textFromUnknown(item?.剩余时间);
}

export function statusEffectSource(item: ItemObject): string {
  return textFromUnknown(item?.来源);
}

type CharacterImageResolution = {
  url: string;
  urls: string[];
  sourceGroups: string[][];
  randomizeInitialImage: boolean;
  source: 'special_portrait' | 'map' | 'data' | 'none';
};

function resolveConfiguredImageUrls(data: CharacterData): string[] {
  if (!Array.isArray(data.__char_info_image_urls)) return [];

  return data.__char_info_image_urls.reduce<string[]>((urls, candidate) => {
    const normalized = normalizePortraitMediaUrlForBrowser(textFromUnknown(candidate))?.url ?? '';
    if (normalized && !urls.includes(normalized)) urls.push(normalized);
    return urls;
  }, []);
}

function resolveConfiguredImageSourceGroups(data: CharacterData): string[][] {
  if (!Array.isArray(data.__char_info_image_source_groups)) {
    return resolveConfiguredImageUrls(data).map(url => [url]);
  }

  return data.__char_info_image_source_groups.reduce<string[][]>((groups, candidates) => {
    if (!Array.isArray(candidates)) return groups;
    const sources = candidates.reduce<string[]>((urls, candidate) => {
      const normalized = normalizePortraitMediaUrlForBrowser(textFromUnknown(candidate))?.url ?? '';
      if (normalized && !urls.includes(normalized)) urls.push(normalized);
      return urls;
    }, []);
    if (sources.length > 0 && !groups.some(group => group[0] === sources[0])) groups.push(sources);
    return groups;
  }, []);
}

function resolveCharacterPresentationProfileForData(
  data: CharacterData,
  nameText: string,
): CharacterPresentationProfile | null {
  if (!isLoadedDxCharacterData(data)) return null;
  const reference = textFromUnknown(pickField(data, '__dx_character_ref'));
  return resolveDxCharacterProfile(reference, nameText);
}

function resolveCharacterImage(
  data: CharacterData,
  presentationProfile: CharacterPresentationProfile | null,
): CharacterImageResolution {
  const isDxProfile = presentationProfile?.edition === 'dx';
  const configuredSourceGroups =
    isDxProfile || (!presentationProfile && !isSpecialNpcVisualData(data)) ? [] : resolveConfiguredImageSourceGroups(data);
  const configuredUrls = configuredSourceGroups.map(sources => sources[0]);

  if (presentationProfile) {
    const source = textFromUnknown(pickField(data, '特殊立绘')) ? 'special_portrait' : 'map';
    const urls = configuredUrls.length > 0 ? configuredUrls : [presentationProfile.imageUrl];
    return {
      url: urls[0],
      urls,
      sourceGroups: configuredSourceGroups.length > 0 ? configuredSourceGroups : urls.map(url => [url]),
      randomizeInitialImage: configuredUrls.length > 1 && data.__char_info_randomize_initial_image === true,
      source,
    };
  }

  if (configuredUrls.length > 0) {
    return {
      url: configuredUrls[0],
      urls: configuredUrls,
      sourceGroups: configuredSourceGroups,
      randomizeInitialImage: configuredUrls.length > 1 && data.__char_info_randomize_initial_image === true,
      source: 'data',
    };
  }

  return { url: '', urls: [], sourceGroups: [], randomizeInitialImage: false, source: 'none' };
}

export function buildCharacterViewModel(
  data: CharacterData,
  imageSourcePriority: readonly string[] = [],
): CharacterViewModel {
  const nameText = normalizeDisplayText(pickField(data, '姓名') || '未知角色');
  const backstoryText = normalizeDisplayText(pickField(data, '背景故事') || '');
  const resourceObj = (pickField(data, '资源', '资源') || {}) as Record<string, unknown>;
  const resourceBoxes: ResourceBox[] = [
    { key: 'HP', label: 'HP', value: textFromUnknown(resourceObj.HP) },
    { key: 'SP', label: 'SP', value: textFromUnknown(resourceObj.SP) },
    { key: 'MP', label: 'MP', value: textFromUnknown(resourceObj.MP) },
  ].filter(resource => hasText(resource.value));

  const inventorySections: InventorySection[] = [
    { key: 'backpack', title: '背包', items: asNamedObjectArray(data.背包) },
    { key: 'props', title: '道具', items: asNamedObjectArray(data.道具) },
    { key: 'special', title: '特殊物品', items: asNamedObjectArray(data.特殊物品) },
    { key: 'items', title: '物品', items: asNamedObjectArray(data.物品) },
  ].filter(section => section.items.length > 0);

  const statusEffects = asNamedObjectArray(data.状态效果);
  const divinityRoot = data.登神长阶 && typeof data.登神长阶 === 'object' ? data.登神长阶 : {};
  const divinityGodTitle = textFromUnknown(divinityRoot.神位) || textFromUnknown(data.神位);
  const rawKingdom = (divinityRoot.神国 || data.神国) as unknown;
  const divinityKingdom =
    rawKingdom && typeof rawKingdom === 'object'
      ? (() => {
          const obj = rawKingdom as Record<string, unknown>;
          const name = textFromUnknown(obj?.名称);
          const description = textFromUnknown(obj?.描述);
          if (!hasText(name) && !hasText(description)) return null;
          return {
            name: name || '神国',
            description,
          };
        })()
      : null;
  const divinityElements = asNamedObjectArray(divinityRoot.要素 || data.要素);
  const divinityPowers = asNamedObjectArray(divinityRoot.权能 || data.权能);
  const divinityLaws = mergeNamedObjectArrays(divinityRoot.法则, data.法则);
  const skills = asNamedObjectArray(data.技能);
  const equipments = asNamedObjectArray(data.装备);
  const presentationProfile = resolveCharacterPresentationProfileForData(data, nameText);
  const image = resolveCharacterImage(data, presentationProfile);
  const imageSourceGroups = prioritizeImageSourceGroups(image.sourceGroups, imageSourcePriority);
  const imageUrls = imageSourceGroups.map(sources => sources[0]);
  const imageUrl = imageUrls[0] ?? image.url;
  const isSpecialNpc = !presentationProfile && isSpecialNpcVisualData(data) && imageUrls.length > 0;
  const storyBookLink = resolveDxStoryBookLink(presentationProfile);
  const hasDivinity =
    hasText(divinityGodTitle) ||
    !!divinityKingdom ||
    hasArrayContent(divinityElements) ||
    hasArrayContent(divinityPowers) ||
    hasArrayContent(divinityLaws);
  const hasStatusEffects = statusEffects.length > 0;
  const hasInventory = inventorySections.length > 0;
  const visibleTabs = tabOrder.filter(tab => {
    if (tab.key === 'profile') return true;
    if (tab.key === 'skills') return skills.length > 0;
    if (tab.key === 'equipment') return equipments.length > 0;
    if (tab.key === 'inventory') return hasInventory;
    if (tab.key === 'divinity') return hasDivinity;
    if (tab.key === 'characterStory') return storyBookLink !== null;
    if (tab.key === 'backstory') return hasText(backstoryText);
    if (tab.key === 'statusEffects') return hasStatusEffects;
    return false;
  });

  return {
    nameText,
    levelText: normalizeDisplayText(pickField(data, '等级', '等级') ?? '?'),
    raceText: normalizeDisplayText(pickField(data, '种族', '种族') || '其他'),
    tierText: normalizeDisplayText(pickField(data, '生命层级', '生命层级') || '未知层级'),
    identityText: getSmartArray(pickField(data, '身份')).join(' / ') || '-',
    classText: getSmartArray(pickField(data, '职业', '职业')).join(' / ') || '-',
    personalityText: Array.isArray(pickField(data, '性格'))
      ? getSmartArray(pickField(data, '性格')).join('，')
      : normalizeDisplayText(pickField(data, '性格') || ''),
    likesText: getSmartArray(pickField(data, '喜爱', '喜爱'))
      .map(tag => tag.trim().replace(/。+$/g, '').trim())
      .filter(Boolean)
      .join('，'),
    appearanceText: normalizeDisplayText(pickField(data, '外貌特质', '外貌特质') || ''),
    attireText: normalizeDisplayText(pickField(data, '衣物装饰', '衣物装饰') || ''),
    backstoryText,
    entranceQuoteText: normalizeDisplayText(pickField(data, '登场台词') || ''),
    imageUrl,
    imageUrls,
    imageSourceGroups,
    randomizeInitialImage: image.randomizeInitialImage,
    layoutKind: presentationProfile ? 'illustrated' : isSpecialNpc ? 'special_npc' : 'default',
    presentationProfile,
    resourceBoxes,
    skills,
    equipments,
    inventorySections,
    statusEffects,
    divinityGodTitle,
    divinityKingdom,
    divinityElements,
    divinityPowers,
    divinityLaws,
    storyBookLink,
    visibleTabs,
  };
}
