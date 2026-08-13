import { JSON_SCHEMA, load } from 'js-yaml';

export type CharacterEntryLike = {
  uid: number;
  name: string;
  enabled: boolean;
  content: string;
};

export type WorldbookCharacterEntry<T extends CharacterEntryLike, TProfile> = {
  entry: T;
  profile: TProfile;
  hasVisualProfile: boolean;
  title: CharacterEntryTitle;
};

const worldbookCharacterEntryPrefix = /^\s*\[DLC\]\[角色\]\s*/iu;
const staticNameFieldPattern = /^\uFEFF?姓名[ \t]*:[ \t]*(.*?)\s*$/u;
const supplementTitlePattern = /(部分补充|补充设定|补充资料|角色合集|角色集|设定集|资料集|索引|目录|群像)/u;
const staticCharacterFieldNames = ['姓名', '种族', '性别', '身份', '活跃区域'] as const;
const dynamicFieldValuePattern = /<%|%>|\$\{|\{\{|\}\}/u;

export type StaticCharacterFields = Partial<Record<(typeof staticCharacterFieldNames)[number], string>>;

export type CharacterEntryTitle = {
  rawEntryName: string;
  displayName: string | null;
  metadataText: string | null;
  authorText: string | null;
  raceText: string | null;
  descriptionText: string | null;
  bracketSegments: string[];
  entryKind: 'character' | 'supplement' | 'unknown';
  nameSource: 'managed-profile' | 'body-field' | 'title-heuristic' | 'unknown';
};

export type CharacterEntryTitleOptions = {
  content?: string;
  managedProfileName?: string | null;
};

export type EncounteredCharacterRecord = {
  name: string;
  race: string;
  data: Record<string, unknown>;
};

export function isWorldbookCharacterEntryName(name: string): boolean {
  return splitWorldbookCharacterEntryName(name) !== null;
}

export function parseWorldbookCharacterEntryTitle(
  rawEntryName: string,
  { content = '', managedProfileName = null }: CharacterEntryTitleOptions = {},
): CharacterEntryTitle {
  const entryName = splitWorldbookCharacterEntryName(rawEntryName);
  const titleSource = entryName?.titleSource ?? rawEntryName.replace(worldbookCharacterEntryPrefix, '').trim();
  const bracketSegments = entryName?.bracketSegments ?? readLeadingBracketSegments(rawEntryName.trim()).segments;
  const titleBrackets = readLeadingBracketSegments(titleSource);
  const titleRemainder = titleSource.slice(titleBrackets.consumedLength).trim();
  const { titleWithoutMetadata, metadataText } = splitTrailingMetadata(titleRemainder);
  const parsedMetadata = parseCharacterMetadata(metadataText);
  const profileName = normalizeStaticName(managedProfileName);
  const bodyName = readTopLevelStaticName(content);
  const bracketName = titleBrackets.segments.map(normalizeTitleBracketName).find(Boolean) ?? null;
  const titleName = normalizeTitleName(titleWithoutMetadata) ?? bracketName;
  const metadata = {
    ...parsedMetadata,
    raceText: resolveTrustedTitleRace(parsedMetadata.raceText, content, profileName ?? bodyName ?? titleName),
  };

  if (supplementTitlePattern.test(titleWithoutMetadata)) {
    return {
      rawEntryName,
      displayName: null,
      metadataText,
      ...metadata,
      bracketSegments,
      entryKind: 'supplement',
      nameSource: 'unknown',
    };
  }

  if (profileName) {
    return {
      rawEntryName,
      displayName: profileName,
      metadataText,
      ...metadata,
      bracketSegments,
      entryKind: 'character',
      nameSource: 'managed-profile',
    };
  }

  if (bodyName) {
    return {
      rawEntryName,
      displayName: bodyName,
      metadataText,
      ...metadata,
      bracketSegments,
      entryKind: 'character',
      nameSource: 'body-field',
    };
  }

  if (titleName) {
    return {
      rawEntryName,
      displayName: titleName,
      metadataText,
      ...metadata,
      bracketSegments,
      entryKind: 'character',
      nameSource: 'title-heuristic',
    };
  }

  return {
    rawEntryName,
    displayName: null,
    metadataText,
    ...metadata,
    bracketSegments,
    entryKind: 'unknown',
    nameSource: 'unknown',
  };
}

export function parseWorldbookCharacterDisplayName(name: string): string {
  const title = parseWorldbookCharacterEntryTitle(name);
  const titleSource = splitWorldbookCharacterEntryName(name)?.titleSource ?? name.replace(worldbookCharacterEntryPrefix, '').trim();
  return title.displayName ?? (titleSource || name.trim());
}

export function collectWorldbookCharacterEntries<T extends CharacterEntryLike, TProfile>(
  entries: readonly T[],
  readProfile: (content: string) => TProfile | null,
  createFallbackProfile: (entry: T, title: CharacterEntryTitle) => TProfile,
): WorldbookCharacterEntry<T, TProfile>[] {
  return entries.flatMap(entry => {
    if (!isWorldbookCharacterEntryName(entry.name)) return [];

    const profile = readProfile(entry.content);
    const title = parseWorldbookCharacterEntryTitle(entry.name, {
      content: entry.content,
      managedProfileName: readProfileCharacterName(profile),
    });
    if (title.entryKind !== 'character') return [];

    return [
      {
        entry,
        profile: profile ?? createFallbackProfile(entry, title),
        hasVisualProfile: profile !== null,
        title,
      },
    ];
  });
}

function readLeadingBracketSegments(source: string): { segments: string[]; consumedLength: number } {
  const segments: string[] = [];
  let consumedLength = 0;

  while (source.startsWith('[', consumedLength)) {
    const closingIndex = source.indexOf(']', consumedLength + 1);
    if (closingIndex === -1) break;
    const segment = source.slice(consumedLength + 1, closingIndex).trim();
    if (segment) segments.push(segment);
    consumedLength = closingIndex + 1;
  }

  return { segments, consumedLength };
}

function splitWorldbookCharacterEntryName(
  rawEntryName: string,
): { titleSource: string; bracketSegments: string[] } | null {
  const trimmedName = rawEntryName.trim();
  if (worldbookCharacterEntryPrefix.test(trimmedName)) {
    return {
      titleSource: trimmedName.replace(worldbookCharacterEntryPrefix, '').trim(),
      bracketSegments: readLeadingBracketSegments(trimmedName).segments,
    };
  }

  const trailingBrackets = readTrailingBracketSegments(trimmedName);
  if (trailingBrackets.segments[0] !== 'DLC' || trailingBrackets.segments[1] !== '角色') return null;
  return {
    titleSource: trimmedName.slice(0, trailingBrackets.startIndex).trim(),
    bracketSegments: trailingBrackets.segments,
  };
}

function readTrailingBracketSegments(source: string): { segments: string[]; startIndex: number } {
  const segments: string[] = [];
  let startIndex = source.length;

  while (startIndex > 0 && source[startIndex - 1] === ']') {
    const openingIndex = source.lastIndexOf('[', startIndex - 2);
    if (openingIndex === -1) break;
    const segment = source.slice(openingIndex + 1, startIndex - 1).trim();
    if (!segment) break;
    segments.unshift(segment);
    startIndex = openingIndex;
  }

  return { segments, startIndex };
}

function splitTrailingMetadata(source: string): { titleWithoutMetadata: string; metadataText: string | null } {
  const trimmedSource = source.trim();
  const closingCharacter = trimmedSource.at(-1);
  if (closingCharacter !== ')' && closingCharacter !== '）') return { titleWithoutMetadata: trimmedSource, metadataText: null };

  const closingForOpening: Record<string, string> = { '(': ')', '（': '）' };
  const stack: { index: number; openingCharacter: string }[] = [];
  let metadataStartIndex = -1;

  for (let index = 0; index < trimmedSource.length; index += 1) {
    const character = trimmedSource[index];
    if (character in closingForOpening) {
      stack.push({ index, openingCharacter: character });
      continue;
    }
    if (character !== ')' && character !== '）') continue;

    const opening = stack.pop();
    if (!opening || closingForOpening[opening.openingCharacter] !== character) {
      return { titleWithoutMetadata: trimmedSource, metadataText: null };
    }
    if (stack.length === 0 && index === trimmedSource.length - 1) {
      metadataStartIndex = opening.index;
    }
  }

  if (metadataStartIndex === -1 || stack.length > 0) return { titleWithoutMetadata: trimmedSource, metadataText: null };
  return {
    titleWithoutMetadata: trimmedSource.slice(0, metadataStartIndex).trim(),
    metadataText: trimmedSource.slice(metadataStartIndex + 1, -1).trim() || null,
  };
}

function parseCharacterMetadata(metadataText: string | null): Pick<CharacterEntryTitle, 'authorText' | 'raceText' | 'descriptionText'> {
  if (!metadataText) return { authorText: null, raceText: null, descriptionText: null };

  const separatorIndex = metadataText.search(/[，,]/u);
  const identityText = (separatorIndex === -1 ? metadataText : metadataText.slice(0, separatorIndex)).trim();
  const descriptionText = (separatorIndex === -1 ? '' : metadataText.slice(separatorIndex + 1)).trim() || null;
  const separatorMatches = [...identityText.matchAll(/[-－—]/gu)];
  const authorRaceSeparator = separatorMatches.at(-1);
  if (!authorRaceSeparator || authorRaceSeparator.index === undefined) {
    return { authorText: null, raceText: null, descriptionText };
  }

  const authorText = identityText.slice(0, authorRaceSeparator.index).trim() || null;
  const raceText = identityText.slice(authorRaceSeparator.index + authorRaceSeparator[0].length).trim() || null;
  if (!authorText || !raceText) {
    return { authorText: null, raceText: null, descriptionText };
  }

  return {
    authorText,
    raceText,
    descriptionText,
  };
}

function resolveTrustedTitleRace(candidate: string | null, content: string, characterName: string | null): string | null {
  if (!candidate) return null;
  const explicitRace = candidate.match(/^种族[：:]\s*(.+)$/u)?.[1]?.trim() ?? '';
  if (explicitRace && !/[\r\n]/u.test(explicitRace) && !dynamicFieldValuePattern.test(explicitRace)) return explicitRace;

  const bodyRace = inferCharacterRace(content, characterName);
  return bodyRace && bodyRace === candidate ? candidate : null;
}

function normalizeTitleBracketName(value: string): string | null {
  if (value.startsWith('<')) return null;
  return normalizeStaticName(value);
}

function normalizeTitleName(value: string): string | null {
  if (value.includes('[') || value.includes(']') || /[()（）]/u.test(value)) return null;
  return normalizeStaticName(value);
}

function normalizeStaticName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /[\r\n\t]/u.test(trimmed) || /<%|%>/u.test(trimmed)) return null;
  return trimmed;
}

function readTopLevelStaticName(content: string): string | null {
  let insideEjs = false;
  for (const line of content.split(/\r?\n/u)) {
    if (insideEjs) {
      if (line.includes('%>')) insideEjs = false;
      continue;
    }
    if (line.includes('<%')) {
      if (!line.slice(line.indexOf('<%') + 2).includes('%>')) insideEjs = true;
      continue;
    }

    const match = line.match(staticNameFieldPattern);
    if (!match) continue;
    const value = match[1].trim();
    if (!value || /^[>|[{&*!]/u.test(value)) return null;
    const unquoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1).trim()
        : value;
    return normalizeStaticName(unquoted);
  }
  return null;
}

function readProfileCharacterName(profile: unknown): string | null {
  if (!isRecord(profile)) return null;
  return normalizeStaticName(typeof profile.characterName === 'string' ? profile.characterName : null);
}

export function setCharacterEntryEnabled<T extends CharacterEntryLike>(
  entries: readonly T[],
  targetUid: number,
  enabled: boolean,
): T[] {
  let targetFound = false;
  const updatedEntries = entries.map(entry => {
    if (entry.uid !== targetUid) return entry;
    targetFound = true;
    return { ...entry, enabled };
  });

  if (!targetFound) {
    throw new Error(`找不到世界书条目 #${targetUid}。`);
  }
  return updatedEntries;
}

export function readCharacterEntryBody(content: string, managedRange: { start: number; end: number } | null): string {
  if (!managedRange) return content.trim();
  return `${content.slice(0, managedRange.start)}${content.slice(managedRange.end)}`.trim();
}

export function replaceCharacterEntryBody(
  content: string,
  managedRange: { start: number; end: number } | null,
  nextBody: string,
): string {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const bom = content.startsWith('\uFEFF') ? '\uFEFF' : '';
  const body = nextBody
    .replace(/^\uFEFF/u, '')
    .replace(/\r?\n/g, newline)
    .trim();
  const trailingNewline = content.endsWith('\n') ? newline : '';
  if (!managedRange) return `${bom}${body}${trailingNewline}`;

  const { start, end } = managedRange;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > content.length) {
    throw new Error('受管理视觉区块的位置无效，已停止修改条目正文。');
  }

  const managedBlock = content.slice(start, end);
  const lines = body ? body.split(newline) : [];
  let decoratorCount = 0;
  while (decoratorCount < lines.length && /^@@\S/u.test(lines[decoratorCount])) {
    decoratorCount += 1;
  }

  const parts = [
    lines.slice(0, decoratorCount).join(newline),
    managedBlock,
    lines.slice(decoratorCount).join(newline),
  ].filter(Boolean);
  return `${bom}${parts.join(newline)}${trailingNewline}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function collectEncounteredCharacters(mvuData: unknown): EncounteredCharacterRecord[] {
  if (!isRecord(mvuData) || !isRecord(mvuData.stat_data) || !isRecord(mvuData.stat_data.关系列表)) return [];

  return Object.entries(mvuData.stat_data.关系列表).flatMap(([rawName, value]) => {
    const name = rawName.trim();
    if (!name || !isRecord(value)) return [];
    return [
      {
        name,
        race: typeof value.种族 === 'string' ? value.种族.trim() : '',
        data: value,
      },
    ];
  });
}

export function inferCharacterRace(entryBody: string, characterName?: string | null): string {
  const staticRace = readStaticCharacterFields(entryBody).种族?.split(/[，,]/u)[0]?.trim() ?? '';
  if (!entryBody.trim() || dynamicFieldValuePattern.test(entryBody)) return staticRace;

  let parsedBody: unknown;
  try {
    parsedBody = load(entryBody, { schema: JSON_SCHEMA });
  } catch {
    return staticRace;
  }
  if (!isRecord(parsedBody)) return staticRace;

  const directRace = readRaceAtKnownPaths(parsedBody);
  if (directRace) return directRace;

  const normalizedCharacterName = normalizeStaticName(characterName);
  const characterRoot = normalizedCharacterName ? parsedBody[normalizedCharacterName] : null;
  if (isRecord(characterRoot)) {
    const characterRace = readRaceAtKnownPaths(characterRoot);
    if (characterRace) return characterRace;
  }

  if (normalizedCharacterName) {
    const matchingRoots = Object.entries(parsedBody).filter(
      ([rootName, value]) =>
        isRecord(value) &&
        namesShareQualifiedBoundary(rootName, normalizedCharacterName) &&
        readRaceAtKnownPaths(value),
    );
    if (matchingRoots.length === 1) return readRaceAtKnownPaths(matchingRoots[0][1] as Record<string, unknown>);
  }

  return staticRace;
}

function namesShareQualifiedBoundary(left: string, right: string): boolean {
  if (left === right) return true;
  const [shorter, longer] = left.length < right.length ? [left, right] : [right, left];
  return longer.startsWith(shorter) && /^[·・\s]/u.test(longer.slice(shorter.length));
}

function readRaceAtKnownPaths(value: Record<string, unknown>): string {
  return readRaceScalar(value.种族) || (isRecord(value.基本信息) ? readRaceScalar(value.基本信息.种族) : '');
}

function readRaceScalar(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  if (!normalized || /[\r\n]/u.test(normalized) || dynamicFieldValuePattern.test(normalized)) return '';
  return normalized.split(/[，,]/u)[0]?.trim() ?? '';
}

export function readStaticCharacterFields(entryBody: string): StaticCharacterFields {
  const fields: StaticCharacterFields = {};
  let insideEjs = false;

  for (const line of entryBody.split(/\r?\n/u)) {
    if (insideEjs) {
      if (line.includes('%>')) insideEjs = false;
      continue;
    }
    if (line.includes('<%')) {
      if (!line.slice(line.indexOf('<%') + 2).includes('%>')) insideEjs = true;
      continue;
    }

    const match = line.match(/^([^\s:#][^:]*):[ \t]*(.*?)\s*$/u);
    if (!match) continue;
    const fieldName = match[1].trim() as keyof StaticCharacterFields;
    if (!staticCharacterFieldNames.includes(fieldName)) continue;
    const value = normalizeStaticFieldValue(match[2]);
    if (value) fields[fieldName] = value;
  }

  return fields;
}

function normalizeStaticFieldValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || dynamicFieldValuePattern.test(trimmed) || /^[>|[{&*!]/u.test(trimmed)) return null;

  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"));
  const normalized = quoted ? trimmed.slice(1, -1).trim() : trimmed;
  if (!normalized || dynamicFieldValuePattern.test(normalized)) return null;
  return normalized;
}
