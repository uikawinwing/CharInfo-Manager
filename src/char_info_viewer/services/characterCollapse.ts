import type { CharacterData } from '../types';

export type CharacterCollapseOptions = {
  enabled: boolean;
  alwaysExpandRules: CollapseRuleSource;
  autoCollapseRules: CollapseRuleSource;
  levelGapEnabled: boolean;
  levelGap: number;
  playerLevel: number | null | undefined;
};

export type CharacterCollapseDecision = {
  collapsed: boolean;
  reason: 'disabled' | 'always-expand' | 'rule' | 'level-gap' | 'none';
};

type CharacterFieldRule = {
  path: string;
  expected: string;
};

export const COLLAPSE_CONDITIONS = ['equals', 'includes', 'excludes', 'pattern'] as const;
export type CollapseRule = { path: string; condition: (typeof COLLAPSE_CONDITIONS)[number]; value: string };
export type CollapseRuleSource = string | CollapseRule[];

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function parseRuleLine(line: string): CharacterFieldRule | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const asciiColon = trimmed.indexOf(':');
  const fullWidthColon = trimmed.indexOf('：');
  const separators = [asciiColon, fullWidthColon].filter(index => index >= 0);
  if (separators.length === 0) return null;

  const separator = Math.min(...separators);
  const path = trimmed.slice(0, separator).trim();
  const expected = trimmed.slice(separator + 1).trim();
  if (!path || !expected) return null;

  return { path, expected };
}

export function parseCharacterFieldRules(source: string): CharacterFieldRule[] {
  return source
    .split(/\r?\n/u)
    .map(parseRuleLine)
    .filter((rule): rule is CharacterFieldRule => rule !== null);
}

export function editableCollapseRules(source: CollapseRuleSource): CollapseRule[] {
  if (Array.isArray(source)) return source.map(rule => ({ ...rule }));
  return parseCharacterFieldRules(source).map(({ path, expected }) => ({
    path,
    condition: expected.includes('*') ? 'pattern' : 'equals',
    value: expected,
  }));
}

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return Object.hasOwn(current, key) ? (current as Record<string, unknown>)[key] : undefined;
  }, source);
}

function escapeRegExp(value: string): string {
  const specialCharacters = new Set(['\\', '^', '$', '.', '|', '?', '*', '+', '(', ')', '[', ']', '{', '}']);
  return Array.from(value, character => (specialCharacters.has(character) ? '\\' + character : character)).join('');
}

function textMatches(actual: string, expected: string): boolean {
  if (!expected.includes('*')) return actual === expected;

  const pattern = expected
    .split('*')
    .map(part => escapeRegExp(part))
    .join('.*');
  return new RegExp('^' + pattern + '$', 'u').test(actual);
}

function valueMatches(value: unknown, expected: string, exact = false): boolean {
  if (Array.isArray(value)) {
    return value.some(item => valueMatches(item, expected, exact));
  }
  if (value === null || value === undefined || typeof value === 'object') return false;
  const text = normalizeText(value);
  return exact ? text === expected : textMatches(text, expected);
}

function fieldContains(value: unknown, expected: string): boolean {
  if (Array.isArray(value)) return value.some(item => fieldContains(item, expected));
  if (value == null || typeof value === 'object') return false;
  const text = normalizeText(value);
  return Boolean(text) && text.includes(expected);
}

export function matchesCharacterFieldRules(data: CharacterData, source: CollapseRuleSource): boolean {
  const rules = typeof source === 'string' ? editableCollapseRules(source) : source;
  return rules.some(({ path, condition, value }) => {
    const expected = value.trim();
    if (!path || !expected) return false;
    const actual = readPath(data, path);
    if (condition === 'equals') return valueMatches(actual, expected, true);
    if (condition === 'pattern') return valueMatches(actual, expected);
    if (condition === 'includes') return fieldContains(actual, expected);
    return fieldContains(actual, '') && !fieldContains(actual, expected);
  });
}

function parseFiniteLevel(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluateCharacterCollapse(
  data: CharacterData,
  options: CharacterCollapseOptions,
): CharacterCollapseDecision {
  if (!options.enabled) return { collapsed: false, reason: 'disabled' };

  if (matchesCharacterFieldRules(data, options.alwaysExpandRules)) {
    return { collapsed: false, reason: 'always-expand' };
  }

  if (matchesCharacterFieldRules(data, options.autoCollapseRules)) {
    return { collapsed: true, reason: 'rule' };
  }

  if (options.levelGapEnabled) {
    const playerLevel = parseFiniteLevel(options.playerLevel);
    const characterLevel = parseFiniteLevel(data.等级);
    const levelGap = Number(options.levelGap);
    if (
      playerLevel !== null &&
      characterLevel !== null &&
      Number.isFinite(levelGap) &&
      levelGap >= 1 &&
      characterLevel <= playerLevel - levelGap
    ) {
      return { collapsed: true, reason: 'level-gap' };
    }
  }

  return { collapsed: false, reason: 'none' };
}
