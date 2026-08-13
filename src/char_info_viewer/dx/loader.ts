import { parseCharacterYaml } from '../services/yamlParser';
import type { CharacterData } from '../types';
import { findDxCharacterById } from './roster';

const dxCharacterRegistryEntryName = 'char_info_dx_characters';
const dxCharacterReferencePattern = /^__dx_character_ref\s*:\s*(dx_[a-z0-9][a-z0-9_-]*)\s*$/i;
const charInfoWrapperPattern = /^<char_info>\s*([\s\S]*?)\s*<\/char_info>$/i;
const charInfoBlockPattern = /<char_info\s*>[\s\S]*?<\/char_info\s*>/gi;

export type DxCharacterReference = { kind: 'not_reference' } | { kind: 'reference'; reference: string };

/**
 * 仅用于带 `__dx_character_ref` 的 DX 资料。
 * `data` 是供查看与手动导入使用的完整资料；`injectData` 只用于首次出现时的后台精简注入。
 */
export type DxCharacterReferenceResolution = {
  reference: string;
  data: CharacterData;
  injectData: CharacterData;
  appearVariableName: string;
};

type RegistryEntryLocation = {
  worldbookName: string;
  content: string;
};

type RegistryCacheEntry = {
  promise: Promise<RegistryEntryLocation>;
  expiresAt: number;
};

type RegistryCache = Map<string, RegistryCacheEntry>;

type SharedRegistryCacheWindow = Window &
  typeof globalThis & {
    __CHAR_INFO_DX_CHARACTER_REGISTRY_CACHE__?: RegistryCache;
  };

const sharedRegistryCacheKey = '__CHAR_INFO_DX_CHARACTER_REGISTRY_CACHE__';
const settledRegistryCacheLifetimeMs = 5000;
const localRegistryCache: RegistryCache = new Map();
type LoadedDxIdentity = Readonly<{
  reference: string;
  name: string;
}>;

const loadedDxCharacterData = new WeakMap<object, LoadedDxIdentity>();

export function parseDxCharacterReference(source: string): DxCharacterReference {
  const trimmedSource = source.trim();
  const wrappedMatch = trimmedSource.match(charInfoWrapperPattern);
  const referenceSource = wrappedMatch ? wrappedMatch[1].trim() : trimmedSource;
  const match = referenceSource.match(dxCharacterReferencePattern);
  return match ? { kind: 'reference', reference: match[1] } : { kind: 'not_reference' };
}

export function messageContainsDxCharacterReference(message: string, expectedReference: string): boolean {
  charInfoBlockPattern.lastIndex = 0;
  for (const match of message.matchAll(charInfoBlockPattern)) {
    const parsed = parseDxCharacterReference(match[0]);
    if (parsed.kind === 'reference' && parsed.reference === expectedReference) return true;
  }
  return false;
}

export async function loadDxCharacterReference(
  reference: string,
): Promise<DxCharacterReferenceResolution> {
  const rosterEntry = findDxCharacterById(reference);
  if (!rosterEntry) {
    throw new Error(`未知 DX 角色引用 ${reference}。`);
  }
  if (!rosterEntry.hasRegistryData) {
    throw new Error(`DX 角色 ${reference} 尚未配置注入资料。`);
  }

  const registry = await findDxCharacterRegistry();
  const npcBlock = findDxCharacterBlock(registry.content, reference);
  const appearVariableName = readAttribute(npcBlock.attributes, 'appear_variable');
  if (!appearVariableName) {
    throw new Error(`专属资料 ${reference} 缺少 appear_variable。`);
  }
  if (appearVariableName !== rosterEntry.appearVariableName) {
    throw new Error(
      `DX 角色 ${reference} 的 appear_variable 不匹配：应为 ${rosterEntry.appearVariableName}，实际为 ${appearVariableName}。`,
    );
  }

  const injectData = parseRegistryYaml(reference, 'inject_var', readTagContent(npcBlock.content, 'inject_var', true)!);
  assertRosterName(reference, 'inject_var', injectData, rosterEntry.name);
  const displaySource = readTagContent(npcBlock.content, 'display_only', false);
  const displayData = displaySource
    ? { ...injectData, ...parseRegistryYaml(reference, 'display_only', displaySource) }
    : injectData;
  assertRosterName(reference, 'display_only 合并后', displayData, rosterEntry.name);

  const data: CharacterData = { ...displayData, __dx_character_ref: reference };
  loadedDxCharacterData.set(data, { reference, name: rosterEntry.name });

  return {
    reference,
    data,
    injectData,
    appearVariableName,
  };
}

export function isLoadedDxCharacterData(data: unknown): data is CharacterData {
  if (!data || typeof data !== 'object') return false;
  const loadedIdentity = loadedDxCharacterData.get(data);
  if (!loadedIdentity) return false;
  const candidate = data as CharacterData;
  if (typeof candidate.__dx_character_ref !== 'string' || typeof candidate.姓名 !== 'string') return false;
  if (candidate.__dx_character_ref !== loadedIdentity.reference || candidate.姓名 !== loadedIdentity.name) return false;

  const rosterEntry = findDxCharacterById(loadedIdentity.reference);
  return rosterEntry?.hasRegistryData === true && rosterEntry.name === candidate.姓名;
}

export function cloneLoadedDxCharacterDataWithOverrides(
  data: CharacterData,
  overrides: Pick<CharacterData, '登场台词'>,
): CharacterData {
  const clone: CharacterData = {
    ...data,
    ...(overrides.登场台词 === undefined ? {} : { 登场台词: overrides.登场台词 }),
  };
  const loadedIdentity = loadedDxCharacterData.get(data);
  if (loadedIdentity && isLoadedDxCharacterData(data)) loadedDxCharacterData.set(clone, loadedIdentity);
  return clone;
}

function assertRosterName(reference: string, source: string, data: CharacterData, expectedName: string): void {
  if (data.姓名 === expectedName) return;
  throw new Error(
    `DX 角色 ${reference} 的 ${source} 姓名不匹配：应为 ${expectedName}，实际为 ${String(data.姓名 ?? '')}。`,
  );
}

async function findDxCharacterRegistry(): Promise<RegistryEntryLocation> {
  const worldbookNames = getActiveWorldbookNames();
  const cacheKey = [...worldbookNames].sort().join('\u0000');
  const cache = getSharedRegistryCache();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  if (cached) cache.delete(cacheKey);

  const cacheEntry: RegistryCacheEntry = {
    promise: Promise.resolve(null as unknown as RegistryEntryLocation),
    expiresAt: Number.POSITIVE_INFINITY,
  };
  cacheEntry.promise = readDxCharacterRegistry(worldbookNames)
    .then(registry => {
      cacheEntry.expiresAt = Date.now() + settledRegistryCacheLifetimeMs;
      return registry;
    })
    .catch(error => {
      if (cache.get(cacheKey) === cacheEntry) cache.delete(cacheKey);
      throw error;
    });
  cache.set(cacheKey, cacheEntry);
  return cacheEntry.promise;
}

async function readDxCharacterRegistry(worldbookNames: string[]): Promise<RegistryEntryLocation> {
  const matches = (
    await Promise.all(
      worldbookNames.map(async worldbookName => {
        try {
          const entries = await getWorldbook(worldbookName);
          return entries
            .filter(entry => entry.name === dxCharacterRegistryEntryName)
            .map(entry => ({ worldbookName, content: entry.content }));
        } catch (error) {
          console.warn(`[CharInfo Viewer] Failed to read worldbook ${worldbookName}:`, error);
          return [];
        }
      }),
    )
  ).flat();

  if (matches.length === 0) {
    throw new Error(`未找到禁用资料库条目 ${dxCharacterRegistryEntryName}。`);
  }
  if (matches.length > 1) {
    throw new Error(`找到 ${matches.length} 个同名资料库条目 ${dxCharacterRegistryEntryName}，请只保留一个。`);
  }

  return matches[0];
}

function getSharedRegistryCache(): RegistryCache {
  try {
    const host = window.parent as SharedRegistryCacheWindow;
    if (!host[sharedRegistryCacheKey]) {
      host[sharedRegistryCacheKey] = new Map();
    }
    return host[sharedRegistryCacheKey];
  } catch (_) {
    return localRegistryCache;
  }
}

function getActiveWorldbookNames(): string[] {
  const characterWorldbooks = getCharWorldbookNames('current');
  const names = [
    getChatWorldbookName('current'),
    characterWorldbooks.primary,
    ...characterWorldbooks.additional,
    ...getGlobalWorldbookNames(),
  ].filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

  return [...new Set(names)];
}

function findDxCharacterBlock(content: string, reference: string): { attributes: string; content: string } {
  const registryRoot = /<dx_character_registry\b[^>]*>/i;
  if (!registryRoot.test(content)) {
    throw new Error(`资料库 ${dxCharacterRegistryEntryName} 缺少 <dx_character_registry> 根标签。`);
  }

  const pattern = /<dx_character\b([^>]*)>([\s\S]*?)<\/dx_character>/gi;
  const matches = [...content.matchAll(pattern)].filter(match => readAttribute(match[1], 'id') === reference);
  if (matches.length === 0) {
    throw new Error(`资料库中未找到 ${reference}。`);
  }
  if (matches.length > 1) {
    throw new Error(`资料库中存在重复的 ${reference}。`);
  }

  return { attributes: matches[0][1], content: matches[0][2] };
}

function readAttribute(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match?.[1] ?? match?.[2] ?? null;
}

function readTagContent(source: string, tag: 'inject_var' | 'display_only', required: boolean): string | null {
  const matches = [...source.matchAll(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*<\\/${tag}>`, 'gi'))];
  if (matches.length === 1) return matches[0][1];
  if (matches.length === 0 && !required) return null;
  throw new Error(matches.length === 0 ? `专属资料缺少 <${tag}>。` : `专属资料包含重复的 <${tag}>。`);
}

function parseRegistryYaml(reference: string, blockName: string, source: string): CharacterData {
  const parsed = parseCharacterYaml(source);
  if (parsed.success) return parsed.data;

  const detail = parsed.error.message || '未知 YAML 错误';
  throw new Error(`${reference} 的 <${blockName}> 无法解析：${detail}`);
}
