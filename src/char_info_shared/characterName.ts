export type CharacterProfileMatch =
  | { kind: 'matched'; mode: 'exact' | 'normalized'; key: string; profile: unknown }
  | { kind: 'ambiguous'; keys: string[] }
  | { kind: 'missing' };

export function normalizeCharacterNameForMatch(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/\p{Variation_Selector}/gu, '')
    .replace(/[^\p{L}\p{N}\p{M}]/gu, '');
}

export function matchCharacterProfile(
  name: string,
  profiles: Record<string, unknown> | null | undefined,
): CharacterProfileMatch {
  const exactName = name.trim();
  if (!profiles || !exactName) return { kind: 'missing' };
  if (Object.hasOwn(profiles, exactName)) {
    return { kind: 'matched', mode: 'exact', key: exactName, profile: profiles[exactName] };
  }
  const normalizedName = normalizeCharacterNameForMatch(exactName);
  if (!/[\p{L}\p{N}]/u.test(normalizedName)) return { kind: 'missing' };
  const keys = Object.keys(profiles).filter(key => normalizeCharacterNameForMatch(key) === normalizedName);
  if (keys.length === 0) return { kind: 'missing' };
  if (keys.length > 1) return { kind: 'ambiguous', keys };
  const key = keys[0];
  return { kind: 'matched', mode: 'normalized', key, profile: profiles[key] };
}
