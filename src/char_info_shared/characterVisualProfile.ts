import {
  normalizeGalleryExtensionReference,
  validateGalleryExtensionReference,
  type GalleryExtensionReference,
} from './galleryPack.ts';

export interface GalleryImage {
  title: string;
  sources: string[];
}

export interface CharacterVisualProfile {
  characterName: string;
  avatarUrl: string;
  raceColor: string;
  tierColor: string;
  entranceQuote: string;
  gallery: GalleryImage[];
  galleryExtension?: GalleryExtensionReference;
}

type StoredGalleryImage = {
  title?: unknown;
  sources?: unknown;
  url?: unknown;
};

type StoredCharacterVisualProfile = Omit<CharacterVisualProfile, 'gallery'> & {
  gallery: StoredGalleryImage[];
};

export type ManagedBlockInspection =
  | { state: 'absent' }
  | { state: 'valid'; profile: CharacterVisualProfile; start: number; end: number }
  | { state: 'malformed'; reason: string }
  | { state: 'multiple'; reason: string };

export const DEFAULT_RACE_COLOR = '#A9DBC3';
export const DEFAULT_TIER_COLOR = '#B7D9E8';
export const CHAR_INFO_PROFILE_SCHEMA_VERSION = 1;
export const MANAGED_BLOCK_START = '<%# char-info-ejs-builder:start:v2 %>';
export const MANAGED_BLOCK_END = '<%# char-info-ejs-builder:end:v2 %>';

const LEGACY_MANAGED_BLOCK_START = '<%# char-info-ejs-builder:start:v1 %>';
const LEGACY_MANAGED_BLOCK_END = '<%# char-info-ejs-builder:end:v1 %>';
const LEGACY_DATA_MARKER_PREFIX = '<%# char-info-ejs-builder:data:v1:';
const HEX_PATTERN = /^#[0-9A-F]{6}$/;
const MAX_CHARACTER_NAME_LENGTH = 80;
const RESERVED_CHARACTER_NAMES = new Set(['__proto__', 'prototype', 'constructor']);

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some(character => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function hasEjsDelimiter(value: string): boolean {
  return value.includes('<%') || value.includes('%>');
}

function validateEjsSafeText(errors: string[], label: string, value: string): void {
  if (hasEjsDelimiter(value)) {
    errors.push(`${label}不能包含 <% 或 %> EJS 模板分隔符。`);
  }
}

export function createEmptyProfile(characterName = ''): CharacterVisualProfile {
  return {
    characterName,
    avatarUrl: '',
    raceColor: '',
    tierColor: '',
    entranceQuote: '',
    gallery: [{ title: '主立绘', sources: [''] }],
  };
}

export function isHttpsUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeHex(value: string): string {
  const normalized = value.trim().toUpperCase();
  return normalized.startsWith('#') ? normalized : `#${normalized}`;
}

export function validateProfile(profile: CharacterVisualProfile): string[] {
  const errors: string[] = [];
  const characterName = profile.characterName.trim();
  if (!characterName) errors.push('角色姓名不能为空。');
  if (characterName.length > MAX_CHARACTER_NAME_LENGTH) {
    errors.push(`角色姓名不能超过 ${MAX_CHARACTER_NAME_LENGTH} 个字符。`);
  }
  if (hasControlCharacter(characterName)) {
    errors.push('角色姓名不能包含换行、制表符或其他控制字符。');
  }
  if (RESERVED_CHARACTER_NAMES.has(characterName)) {
    errors.push(`角色姓名“${characterName}”属于系统保留名称，请更换。`);
  }
  validateEjsSafeText(errors, '角色姓名', profile.characterName);
  validateEjsSafeText(errors, '头像 URL', profile.avatarUrl);
  validateEjsSafeText(errors, '登场台词', profile.entranceQuote);
  if (profile.avatarUrl.trim() && !isHttpsUrl(profile.avatarUrl)) errors.push('头像必须使用有效的 HTTPS URL。');
  if (profile.raceColor.trim() && !HEX_PATTERN.test(normalizeHex(profile.raceColor))) {
    errors.push('种族颜色必须使用 #RRGGBB 格式。');
  }
  if (profile.tierColor.trim() && !HEX_PATTERN.test(normalizeHex(profile.tierColor))) {
    errors.push('阶层颜色必须使用 #RRGGBB 格式。');
  }
  if (profile.gallery.length === 0) errors.push('至少需要一张主立绘。');

  profile.gallery.forEach((image, index) => {
    validateEjsSafeText(errors, `第 ${index + 1} 张立绘标题`, image.title);
    const sources = readGallerySources(image);
    if (sources.length === 0) {
      errors.push(`第 ${index + 1} 张立绘至少需要一个有效的 HTTPS URL。`);
      return;
    }
    sources.forEach((source, sourceIndex) => {
      validateEjsSafeText(errors, `第 ${index + 1} 张立绘的第 ${sourceIndex + 1} 个 URL`, source);
      if (!isHttpsUrl(source)) {
        errors.push(`第 ${index + 1} 张立绘的第 ${sourceIndex + 1} 个 URL 必须使用有效的 HTTPS URL。`);
      }
    });
  });
  if (profile.galleryExtension) {
    errors.push(...validateGalleryExtensionReference(profile.galleryExtension));
  }
  return errors;
}

function readGallerySources(image: StoredGalleryImage): string[] {
  const candidates = Array.isArray(image.sources) ? image.sources : [image.url];
  return candidates.reduce<string[]>((sources, candidate) => {
    if (typeof candidate !== 'string') return sources;
    const source = candidate.trim();
    if (source && !sources.includes(source)) sources.push(source);
    return sources;
  }, []);
}

export function normalizeProfile(
  profile: CharacterVisualProfile | StoredCharacterVisualProfile,
): CharacterVisualProfile {
  const galleryExtension = normalizeGalleryExtensionReference(profile.galleryExtension);
  return {
    characterName: profile.characterName.trim(),
    avatarUrl: profile.avatarUrl.trim(),
    raceColor: profile.raceColor.trim() ? normalizeHex(profile.raceColor) : '',
    tierColor: profile.tierColor.trim() ? normalizeHex(profile.tierColor) : '',
    entranceQuote: profile.entranceQuote.trim(),
    gallery: profile.gallery.map((image, index) => ({
      title:
        (typeof image.title === 'string' ? image.title.trim() : '') ||
        (index === 0 ? '主立绘' : `备用立绘 ${index + 1}`),
      sources: readGallerySources(image),
    })),
    ...(galleryExtension ? { galleryExtension } : {}),
  };
}

function decodeLegacyProfile(value: string): StoredCharacterVisualProfile {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as StoredCharacterVisualProfile;
}

function countOccurrences(content: string, target: string): number {
  if (!target) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = content.indexOf(target, offset)) !== -1) {
    count += 1;
    offset += target.length;
  }
  return count;
}

function extractV2Profile(block: string): StoredCharacterVisualProfile {
  const assignment = 'const profile =';
  if (countOccurrences(block, assignment) !== 1) {
    throw new Error('v2 区块必须包含且只包含一份 profile 配置。');
  }

  let cursor = block.indexOf(assignment) + assignment.length;
  while (cursor < block.length && /\s/.test(block[cursor])) cursor += 1;
  if (block[cursor] !== '{') {
    throw new Error('v2 profile 必须是 JSON 对象。');
  }

  const objectStart = cursor;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let objectEnd = -1;

  for (; cursor < block.length; cursor += 1) {
    const character = block[cursor];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        objectEnd = cursor + 1;
        break;
      }
    }
  }

  if (objectEnd === -1 || inString || depth !== 0) {
    throw new Error('v2 profile JSON 对象没有正确闭合。');
  }

  cursor = objectEnd;
  while (cursor < block.length && /\s/.test(block[cursor])) cursor += 1;
  if (block[cursor] !== ';') {
    throw new Error('v2 profile 配置末尾缺少分号。');
  }

  return JSON.parse(block.slice(objectStart, objectEnd)) as StoredCharacterVisualProfile;
}

export function inspectManagedBlock(content: string): ManagedBlockInspection {
  const v2StartCount = countOccurrences(content, MANAGED_BLOCK_START);
  const v2EndCount = countOccurrences(content, MANAGED_BLOCK_END);
  const v1StartCount = countOccurrences(content, LEGACY_MANAGED_BLOCK_START);
  const v1EndCount = countOccurrences(content, LEGACY_MANAGED_BLOCK_END);
  const startCount = v2StartCount + v1StartCount;
  const endCount = v2EndCount + v1EndCount;

  if (startCount === 0 && endCount === 0) return { state: 'absent' };
  if (startCount !== 1 || endCount !== 1) {
    return {
      state: startCount > 1 || endCount > 1 ? 'multiple' : 'malformed',
      reason:
        startCount > 1 || endCount > 1
          ? '检测到多个自动生成区块，已停止自动编辑。'
          : '自动生成区块的开始或结束标记缺失，已停止自动编辑。',
    };
  }

  const isV2 = v2StartCount === 1;
  if ((isV2 && v2EndCount !== 1) || (!isV2 && v1EndCount !== 1)) {
    return { state: 'malformed', reason: '自动生成区块的版本标记不匹配，已停止自动编辑。' };
  }

  const startMarker = isV2 ? MANAGED_BLOCK_START : LEGACY_MANAGED_BLOCK_START;
  const endMarker = isV2 ? MANAGED_BLOCK_END : LEGACY_MANAGED_BLOCK_END;
  const start = content.indexOf(startMarker);
  const endMarkerStart = content.indexOf(endMarker);
  if (endMarkerStart < start) {
    return { state: 'malformed', reason: '自动生成区块的标记顺序错误，已停止自动编辑。' };
  }

  const end = endMarkerStart + endMarker.length;
  const block = content.slice(start, end);

  try {
    let rawProfile: StoredCharacterVisualProfile;
    if (isV2) {
      rawProfile = extractV2Profile(block);
    } else {
      const dataPattern = new RegExp(
        `${LEGACY_DATA_MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([A-Za-z0-9_-]+)\\s*%>`,
      );
      const dataMatch = block.match(dataPattern);
      if (!dataMatch) {
        return { state: 'malformed', reason: '旧版自动生成区块缺少可编辑资料，已停止自动编辑。' };
      }
      rawProfile = decodeLegacyProfile(dataMatch[1]);
    }

    const profile = normalizeProfile(rawProfile);
    const errors = validateProfile(profile);
    if (errors.length > 0) {
      return { state: 'malformed', reason: `自动生成区块内的资料无效：${errors[0]}` };
    }
    return { state: 'valid', profile, start, end };
  } catch (error) {
    return {
      state: 'malformed',
      reason: `无法读取自动生成区块：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function hasUnmanagedVisualEjs(content: string): boolean {
  if (inspectManagedBlock(content).state !== 'absent') return false;
  return (
    content.includes('char_info.profiles') ||
    content.includes('char_info_visuals') ||
    content.includes('status.externalGalleries.partners')
  );
}

export function buildManagedEjsBlock(input: CharacterVisualProfile): string {
  const profile = normalizeProfile(input);
  const errors = validateProfile(profile);
  if (errors.length > 0) throw new Error(errors[0]);

  const lines = [MANAGED_BLOCK_START, '<%_', '{'];
  const profileLines = JSON.stringify(profile, null, 2).split('\n');
  lines.push(`  const profile = ${profileLines[0]}`);
  profileLines.slice(1).forEach((line, index, remainingLines) => {
    lines.push(`  ${line}${index === remainingLines.length - 1 ? ';' : ''}`);
  });
  lines.push('', '  const npcName = profile.characterName;', '');
  lines.push('  setLocalVar(`char_info.profiles[${JSON.stringify(npcName)}]`, {');
  lines.push(`    schema_version: ${CHAR_INFO_PROFILE_SCHEMA_VERSION},`);
  lines.push('    ...(profile.raceColor ? { custom_racecolor: profile.raceColor } : {}),');
  lines.push('    ...(profile.tierColor ? { custom_tiercolor: profile.tierColor } : {}),');
  lines.push("    ...(profile.entranceQuote ? { '登场台词': profile.entranceQuote } : {}),");
  lines.push('    gallery: profile.gallery.map(image => ({ title: image.title, sources: image.sources })),');
  if (profile.galleryExtension) {
    lines.push('    gallery_extension: profile.galleryExtension,');
  }
  lines.push('  });', '');

  lines.push('  if (profile.avatarUrl) {');
  lines.push('    setLocalVar(');
  lines.push('      `status.externalAvatars.partners[${JSON.stringify(npcName)}].url`,');
  lines.push('      profile.avatarUrl,');
  lines.push('    );');
  lines.push('  }');

  lines.push('}');
  lines.push('_%>');
  lines.push(MANAGED_BLOCK_END);

  return lines.join('\n');
}

function detectLineEnding(content: string): '\r\n' | '\n' {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

function insertAfterDecorators(content: string, block: string, newline: string): string {
  const bom = content.startsWith('\uFEFF') ? '\uFEFF' : '';
  const source = bom ? content.slice(1) : content;
  if (!source) return `${bom}${block}`;

  const lines = source.split(/\r?\n/);
  let decoratorCount = 0;
  while (decoratorCount < lines.length && /^@@\S/.test(lines[decoratorCount])) {
    decoratorCount += 1;
  }

  if (decoratorCount === 0) return `${bom}${block}${newline}${source}`;

  const decorators = lines.slice(0, decoratorCount).join(newline);
  const remainder = lines.slice(decoratorCount).join(newline);
  return `${bom}${decorators}${newline}${block}${remainder ? `${newline}${remainder}` : ''}`;
}

export function upsertManagedEjsBlock(content: string, profile: CharacterVisualProfile): string {
  const inspection = inspectManagedBlock(content);
  if (inspection.state === 'malformed' || inspection.state === 'multiple') {
    throw new Error(inspection.reason);
  }
  if (inspection.state === 'absent' && hasUnmanagedVisualEjs(content)) {
    throw new Error('检测到未标记的旧版角色视觉 EJS。为避免重复写入，请先手动移除旧区块。');
  }

  const newline = detectLineEnding(content);
  const block = buildManagedEjsBlock(profile).replace(/\n/g, newline);
  if (inspection.state === 'valid') {
    return `${content.slice(0, inspection.start)}${block}${content.slice(inspection.end)}`;
  }
  return insertAfterDecorators(content, block, newline);
}
