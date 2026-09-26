import type { CharacterData } from '../types';

export type CharacterCollapseOptions = {
  enabled: boolean;
  alwaysExpandRules: string;
  autoCollapseRules: string;
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

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
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

function valueMatches(value: unknown, expected: string): boolean {
  if (Array.isArray(value)) {
    return value.some(item => valueMatches(item, expected));
  }
  if (value === null || value === undefined || typeof value === 'object') return false;
  return textMatches(normalizeText(value), expected);
}

export function matchesCharacterFieldRules(data: CharacterData, source: string): boolean {
  const rules = parseCharacterFieldRules(source);
  return rules.some(rule => valueMatches(readPath(data, rule.path), rule.expected));
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
