type UnknownRecord = Record<string, unknown>;

export type LegacyGalleryMigrationResult = {
  variables: Record<string, any>;
  migratedNames: string[];
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function migrateGallery(images: unknown): Array<{ title: string; sources: string[] }> {
  if (!Array.isArray(images)) return [];

  return images.reduce<Array<{ title: string; sources: string[] }>>((gallery, image, index) => {
    const entry = asRecord(image);
    const url = normalizeHttpUrl(entry?.url);
    if (!url || gallery.some(item => item.sources[0] === url)) return gallery;

    const title = typeof entry?.title === 'string' && entry.title.trim() ? entry.title.trim() : `立绘 ${index + 1}`;
    gallery.push({ title, sources: [url] });
    return gallery;
  }, []);
}

export function migrateLegacyExternalGalleries(chatVariables: Record<string, any>): LegacyGalleryMigrationResult {
  const status = asRecord(chatVariables.status);
  const externalGalleries = asRecord(status?.externalGalleries);
  const partners = asRecord(externalGalleries?.partners);
  if (!partners) return { variables: chatVariables, migratedNames: [] };

  const charInfoValue = chatVariables.char_info;
  const charInfo = charInfoValue === undefined ? {} : asRecord(charInfoValue);
  if (!charInfo) return { variables: chatVariables, migratedNames: [] };

  const profilesValue = charInfo.profiles;
  const profiles = profilesValue === undefined ? {} : asRecord(profilesValue);
  if (!profiles) return { variables: chatVariables, migratedNames: [] };

  const nextProfiles: UnknownRecord = { ...profiles };
  const migratedNames: string[] = [];

  Object.entries(partners).forEach(([rawName, partner]) => {
    const name = rawName.trim();
    const existingProfileValue = profiles[name];
    const existingProfile = asRecord(existingProfileValue);
    if (
      !name ||
      (Object.hasOwn(profiles, name) && !existingProfile) ||
      (existingProfile && Object.hasOwn(existingProfile, 'gallery'))
    ) {
      return;
    }

    const gallery = migrateGallery(asRecord(partner)?.images);
    if (gallery.length === 0) return;

    nextProfiles[name] = existingProfile
      ? { ...existingProfile, gallery }
      : { schema_version: 1, gallery };
    migratedNames.push(name);
  });

  if (migratedNames.length === 0) return { variables: chatVariables, migratedNames };

  return {
    variables: {
      ...chatVariables,
      char_info: {
        ...charInfo,
        profiles: nextProfiles,
      },
    },
    migratedNames,
  };
}
