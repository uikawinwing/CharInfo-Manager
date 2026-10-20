/**
 * Chat-scoped identity bindings for player-visible character projections.
 *
 * This is a data contract, not authorization from an LLM. Only confirmed
 * worldbook records or explicit user-approved actions may set realName.
 * Unbound/ambiguous aliases must never silently resolve to a real identity.
 */
export type IdentityVisibility = 'masked' | 'partial' | 'revealed';

export type IdentityWorldbookTarget = {
  book: string;
  uid: number;
};

export type CharacterIdentityBinding = {
  id: string;
  realName: string;
  publicName: string;
  aliases: string[];
  visibility: IdentityVisibility;
  knownFields: string[];
  publicFacts: Record<string, unknown>;
  worldbookTargets: IdentityWorldbookTarget[];
};

export type CharacterIdentityRegistry = {
  version: 1;
  byId: Record<string, CharacterIdentityBinding>;
};

export const EMPTY_IDENTITY_REGISTRY: CharacterIdentityRegistry = { version: 1, byId: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isOpaqueIdentityId(id: unknown): id is string {
  return typeof id === 'string' && /^npc_[a-z0-9_-]{4,64}$/i.test(id);
}

function normalizeBinding(id: string, raw: unknown): CharacterIdentityBinding | null {
  if (!isOpaqueIdentityId(id) || !isRecord(raw)) return null;
  const realName = trimText(raw.realName);
  const publicName = trimText(raw.publicName);
  if (!realName || !publicName || id.toLowerCase().includes(realName.toLowerCase())) return null;

  const visibility: IdentityVisibility =
    raw.visibility === 'partial' || raw.visibility === 'revealed' ? raw.visibility : 'masked';
  const aliases = Array.isArray(raw.aliases)
    ? Array.from(new Set(raw.aliases.map(trimText).filter(Boolean)))
    : [];
  const knownFields = Array.isArray(raw.knownFields)
    ? Array.from(new Set(raw.knownFields.map(trimText).filter(Boolean)))
    : [];
  const publicFacts = isRecord(raw.publicFacts) ? { ...raw.publicFacts } : {};
  const worldbookTargets = Array.isArray(raw.worldbookTargets)
    ? raw.worldbookTargets.flatMap(item => {
        if (!isRecord(item)) return [];
        const book = trimText(item.book);
        const uid = Number(item.uid);
        return book && Number.isSafeInteger(uid) && uid >= 0 ? [{ book, uid }] : [];
      })
    : [];
  return { id, realName, publicName, visibility, aliases, knownFields, publicFacts, worldbookTargets };
}

export function readIdentityRegistry(chatVariables: unknown): CharacterIdentityRegistry {
  if (!isRecord(chatVariables) || !isRecord(chatVariables.char_info)) return EMPTY_IDENTITY_REGISTRY;
  const raw = chatVariables.char_info.identityRegistry;
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.byId)) return EMPTY_IDENTITY_REGISTRY;
  const byId: Record<string, CharacterIdentityBinding> = Object.create(null);
  for (const [id, value] of Object.entries(raw.byId)) {
    const binding = normalizeBinding(id, value);
    if (binding) byId[id] = binding;
  }
  return { version: 1, byId };
}

export function putIdentityBinding(
  registry: CharacterIdentityRegistry,
  input: CharacterIdentityBinding,
): CharacterIdentityRegistry {
  const binding = normalizeBinding(input.id, input);
  if (!binding) throw new Error('Identity binding requires an opaque ID, trusted realName and publicName.');
  const collision = Object.values(registry.byId).find(
    item => item.id !== binding.id && item.realName === binding.realName,
  );
  if (collision) throw new Error('The real identity is already bound to another entity ID.');
  return { version: 1, byId: { ...registry.byId, [binding.id]: binding } };
}

export function resolveIdentityBinding(
  registry: CharacterIdentityRegistry,
  query: { id?: string | null; name?: string | null },
): CharacterIdentityBinding | null {
  const id = trimText(query.id);
  if (id) return isOpaqueIdentityId(id) ? registry.byId[id] ?? null : null;
  const name = trimText(query.name);
  if (!name) return null;
  const matches = Object.values(registry.byId).filter(
    record => record.realName === name || record.publicName === name || record.aliases.includes(name),
  );
  return matches.length === 1 ? matches[0] : null;
}

export function resolveIdentityWorldbookTargets(
  registry: CharacterIdentityRegistry,
  id: string,
): IdentityWorldbookTarget[] {
  const record = resolveIdentityBinding(registry, { id });
  if (!record) return [];
  return record.worldbookTargets.map(target => ({ ...target }));
}

const NEVER_PUBLIC_FACT_KEYS = new Set([
  '__entity_id', '__identity_view', 'realName', '真名', '真实姓名', '真实身份',
]);

/**
 * Fail closed: concealed character records expose only approved fields.
 * Non-bound characters retain legacy behavior in their existing callers.
 */
export function projectKnownCharacterData(
  source: Record<string, unknown>,
  binding: CharacterIdentityBinding,
): Record<string, unknown> {
  const known = new Set(binding.knownFields);
  const result: Record<string, unknown> = { 姓名: binding.publicName };
  if (source.在场 !== undefined) result.在场 = source.在场;
  for (const key of known) {
    if (NEVER_PUBLIC_FACT_KEYS.has(key) || key === '姓名') continue;
    if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
  }
  for (const [key, value] of Object.entries(binding.publicFacts)) {
    if (!NEVER_PUBLIC_FACT_KEYS.has(key) && key !== '姓名') result[key] = value;
  }
  if (binding.visibility === 'revealed') result.姓名 = binding.publicName;
  return result;
}
