import {
  buildManagedEjsBlock,
  createEmptyProfile,
  inspectManagedBlock,
  normalizeProfile,
  validateProfile,
  type CharacterProfileMetadata,
  type CharacterProfile,
} from '../char_info_shared/characterProfile';

export const FLASH_PROFILE_ENTRY_PREFIX = '[CharInfo][视觉] ';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readAvatarUrl(chatVariables: Record<string, unknown>, characterName: string): string {
  const status = isRecord(chatVariables.status) ? chatVariables.status : null;
  const externalAvatars = status && isRecord(status.externalAvatars) ? status.externalAvatars : null;
  const partners = externalAvatars && isRecord(externalAvatars.partners) ? externalAvatars.partners : null;
  const avatar = partners && isRecord(partners[characterName]) ? partners[characterName] : null;
  return readString(avatar?.url);
}

export function readFlashProfileFromChatVariables(
  characterName: string,
  chatVariables: unknown,
): CharacterProfile | null {
  const name = characterName.trim();
  if (!name || !isRecord(chatVariables)) return null;

  const charInfo = isRecord(chatVariables.char_info) ? chatVariables.char_info : null;
  const profiles = charInfo && isRecord(charInfo.profiles) ? charInfo.profiles : null;
  const stored = profiles && isRecord(profiles[name]) ? profiles[name] : null;
  if (!stored) return null;

  const gallery = Array.isArray(stored.gallery)
    ? stored.gallery.flatMap((value, index) => {
        if (!isRecord(value)) return [];
        const sources = Array.isArray(value.sources)
          ? value.sources.filter((source): source is string => typeof source === 'string')
          : typeof value.url === 'string'
            ? [value.url]
            : [];
        return [
          {
            title: readString(value.title) || (index === 0 ? '主立绘' : `备用立绘 ${index + 1}`),
            sources,
            ...(readString(value.thumbnail) ? { thumbnail: readString(value.thumbnail) } : {}),
            ...(value.viewer_visible === false ? { viewerVisible: false } : {}),
          },
        ];
      })
    : [];

  const profile = normalizeProfile({
    characterName: name,
    avatarUrl: readAvatarUrl(chatVariables, name),
    coverUrl: readString(stored.cover_url),
    raceColor: readString(stored.custom_racecolor),
    tierColor: readString(stored.custom_tiercolor),
    entranceQuote: readString(stored['登场台词']),
    ...(readString(stored.gallery_pack_url) ? { remoteGalleryUrl: readString(stored.gallery_pack_url) } : {}),
    gallery,
    ...(isRecord(stored.metadata) ? { metadata: stored.metadata as CharacterProfileMetadata } : {}),
  });

  if (profile.gallery.length === 0 && !profile.remoteGalleryUrl) {
    profile.gallery = createEmptyProfile(name).gallery;
  }
  return profile;
}

export function flashEntryName(characterName: string): string {
  return `${FLASH_PROFILE_ENTRY_PREFIX}${characterName.trim()}`;
}

export function buildFlashWorldbookEntry(profile: CharacterProfile) {
  const normalized = normalizeProfile(profile);
  const errors = validateProfile(normalized);
  if (errors.length > 0) throw new Error(errors[0]);

  return {
    name: flashEntryName(normalized.characterName),
    enabled: true,
    strategy: { type: 'selective' as const, keys: [normalized.characterName] },
    position: { type: 'after_character_definition' as const, order: 601 },
    recursion: { prevent_incoming: true, prevent_outgoing: true, delay_until: null },
    content: buildManagedEjsBlock(normalized),
  };
}

export async function saveFlashProfileToCurrentChatWorldbook(
  profile: CharacterProfile,
): Promise<{ worldbookName: string; entryUid: number; created: boolean }> {
  const normalized = normalizeProfile(profile);
  const entryInput = buildFlashWorldbookEntry(normalized);
  const worldbookName = getChatWorldbookName('current') ?? (await getOrCreateChatWorldbook('current'));
  const existingEntries = await getWorldbook(worldbookName);
  const existingMatches = existingEntries.filter(entry => entry.name === entryInput.name);
  if (existingMatches.length > 1) {
    throw new Error(`当前聊天世界书里存在多个“${entryInput.name}”条目，请先保留一份再保存。`);
  }

  const existing = existingMatches[0] ?? null;
  if (existing) {
    await updateWorldbookWith(
      worldbookName,
      entries => entries.map(entry => (entry.uid === existing.uid ? { ...entry, ...entryInput } : entry)),
      { render: 'immediate' },
    );
  } else {
    await createWorldbookEntries(worldbookName, [entryInput], { render: 'immediate' });
  }

  const verifiedEntries = await getWorldbook(worldbookName);
  const verified = verifiedEntries.find(entry => entry.name === entryInput.name);
  if (!verified) throw new Error('视觉条目保存后无法从当前聊天世界书读回。');

  const inspection = inspectManagedBlock(verified.content);
  if (inspection.state !== 'valid' || inspection.profile.characterName !== normalized.characterName) {
    throw new Error('视觉条目保存后的 CharInfo EJS 读回验证失败。');
  }

  return { worldbookName, entryUid: verified.uid, created: !existing };
}
