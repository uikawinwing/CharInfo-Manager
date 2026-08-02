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
const trailingHalfwidthMetadataPattern = /\(([^()（）]*)\)\s*$/u;
const trailingFullwidthMetadataPattern = /（([^()（）]*)）\s*$/u;
const staticNameFieldPattern = /^\uFEFF?姓名[ \t]*:[ \t]*(.*?)\s*$/u;
const supplementTitlePattern = /(部分补充|补充设定|补充资料|角色合集|角色集|设定集|资料集|索引|目录|群像)/u;
const staticCharacterFieldNames = ['姓名', '种族', '性别', '身份', '活跃区域'] as const;
const dynamicFieldValuePattern = /<%|%>|\$\{|\{\{|\}\}/u;

export type StaticCharacterFields = Partial<Record<(typeof staticCharacterFieldNames)[number], string>>;

export type CharacterEntryTitle = {
  rawEntryName: string;
  displayName: string | null;
  metadataText: string | null;
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
  return worldbookCharacterEntryPrefix.test(name);
}

export function parseWorldbookCharacterEntryTitle(
  rawEntryName: string,
  { content = '', managedProfileName = null }: CharacterEntryTitleOptions = {},
): CharacterEntryTitle {
  const titleSource = rawEntryName.replace(worldbookCharacterEntryPrefix, '').trim();
  const bracketSegments = readLeadingBracketSegments(rawEntryName.trim());
  const titleBrackets = readLeadingBracketSegments(titleSource);
  const titleRemainder = titleSource.slice(titleBrackets.consumedLength).trim();
  const { titleWithoutMetadata, metadataText } = splitTrailingMetadata(titleRemainder);
  const profileName = normalizeStaticName(managedProfileName);
  const bodyName = readTopLevelStaticName(content);
  const bracketName = titleBrackets.segments.map(normalizeTitleBracketName).find(Boolean) ?? null;
  const titleName = bracketName ?? normalizeTitleName(titleWithoutMetadata);

  if (supplementTitlePattern.test(titleWithoutMetadata)) {
    return {
      rawEntryName,
      displayName: null,
      metadataText,
      bracketSegments: bracketSegments.segments,
      entryKind: 'supplement',
      nameSource: 'unknown',
    };
  }

  if (profileName) {
    return {
      rawEntryName,
      displayName: profileName,
      metadataText,
      bracketSegments: bracketSegments.segments,
      entryKind: 'character',
      nameSource: 'managed-profile',
    };
  }

  if (bodyName) {
    return {
      rawEntryName,
      displayName: bodyName,
      metadataText,
      bracketSegments: bracketSegments.segments,
      entryKind: 'character',
      nameSource: 'body-field',
    };
  }

  if (titleName) {
    return {
      rawEntryName,
      displayName: titleName,
      metadataText,
      bracketSegments: bracketSegments.segments,
      entryKind: 'character',
      nameSource: 'title-heuristic',
    };
  }

  return {
    rawEntryName,
    displayName: null,
    metadataText,
    bracketSegments: bracketSegments.segments,
    entryKind: 'unknown',
    nameSource: 'unknown',
  };
}

export function parseWorldbookCharacterDisplayName(name: string): string {
  const title = parseWorldbookCharacterEntryTitle(name);
  return title.displayName ?? (name.replace(worldbookCharacterEntryPrefix, '').trim() || name.trim());
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

function splitTrailingMetadata(source: string): { titleWithoutMetadata: string; metadataText: string | null } {
  const match = source.match(trailingHalfwidthMetadataPattern) ?? source.match(trailingFullwidthMetadataPattern);
  if (!match) return { titleWithoutMetadata: source.trim(), metadataText: null };

  return {
    titleWithoutMetadata: source.slice(0, match.index).trim(),
    metadataText: match[1].trim() || null,
  };
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

export function inferCharacterRace(entryBody: string): string {
  return readStaticCharacterFields(entryBody).种族?.split(/[，,]/u)[0]?.trim() ?? '';
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
