import { dump } from 'js-yaml';

import {
  parseWorldbookCharacterEntryTitle,
  readCharacterEntryBody,
  readStaticCharacterFields,
  type CharacterEntryLike,
} from '../char_info_shared/characterEntryLibrary.ts';
import {
  CHAR_INFO_PROFILE_SCHEMA_VERSION,
  inspectManagedBlock,
  normalizeProfile,
  type CharacterVisualProfile,
} from '../char_info_shared/characterVisualProfile.ts';
import type { CharacterData } from '../char_info_viewer/types.ts';

export type CreatorViewerVisualOverride = {
  characterName: string;
  config: Record<string, unknown>;
};

export function buildCreatorViewerPreviewYaml(
  entry: Pick<CharacterEntryLike, 'name' | 'content'> | null,
  profile: CharacterVisualProfile,
): string {
  const inspection = entry ? inspectManagedBlock(entry.content) : { state: 'absent' as const };
  const managedRange = inspection.state === 'valid' ? { start: inspection.start, end: inspection.end } : null;
  const body = entry ? readCharacterEntryBody(entry.content, managedRange) : '';
  const staticFields = readStaticCharacterFields(body);
  const title = entry
    ? parseWorldbookCharacterEntryTitle(entry.name, {
        content: body,
        managedProfileName: profile.characterName,
      })
    : null;
  const characterName = profile.characterName.trim() || title?.displayName || '预览角色';
  const race = staticFields.种族 || title?.raceText || '其他';

  const data: CharacterData = {
    姓名: characterName,
    等级: 1,
    种族: race,
    生命层级: '第一层级',
    ...(staticFields.身份 ? { 身份: staticFields.身份 } : {}),
    属性: {
      力量: 10,
      敏捷: 10,
      体质: 10,
      智力: 10,
      精神: 10,
    },
    资源: { HP: 100, SP: 100, MP: 100 },
  };

  return dump(data, { noRefs: true, lineWidth: -1, sortKeys: false });
}

export function buildCreatorViewerVisualOverride(profile: CharacterVisualProfile): CreatorViewerVisualOverride {
  const normalized = normalizeProfile(profile);
  return {
    characterName: normalized.characterName,
    config: {
      schema_version: CHAR_INFO_PROFILE_SCHEMA_VERSION,
      ...(normalized.raceColor ? { custom_racecolor: normalized.raceColor } : {}),
      ...(normalized.tierColor ? { custom_tiercolor: normalized.tierColor } : {}),
      ...(normalized.entranceQuote ? { 登场台词: normalized.entranceQuote } : {}),
      gallery: normalized.gallery.map(image => ({
        title: image.title,
        sources: [...image.sources],
      })),
    },
  };
}
