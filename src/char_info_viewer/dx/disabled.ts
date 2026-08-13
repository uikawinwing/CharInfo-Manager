import type { CharacterData } from '../types';
import type {
  CharacterPresentationProfile,
  CharacterStoryBookLink,
  DxCharacterReference,
  DxCharacterReferenceResolution,
  DxCharacterRosterEntry,
} from './index';

export type {
  CharacterPresentationProfile,
  CharacterStoryBookLink,
  DxCharacterId,
  DxCharacterReference,
  DxCharacterReferenceResolution,
  DxCharacterRosterEntry,
  DxDivinityVariant,
  DxVisualTheme,
} from './index';

export const dxCharacterRoster: readonly DxCharacterRosterEntry[] = [];

export function parseDxCharacterReference(_source: string): DxCharacterReference {
  return { kind: 'not_reference' };
}

export function messageContainsDxCharacterReference(_message: string, _expectedReference: string): boolean {
  return false;
}

export async function loadDxCharacterReference(_reference: string): Promise<DxCharacterReferenceResolution> {
  throw new Error('专属角色资料未包含在公开构建中。');
}

export function isLoadedDxCharacterData(_data: unknown): _data is CharacterData {
  return false;
}

export function cloneLoadedDxCharacterDataWithOverrides(
  data: CharacterData,
  overrides: Pick<CharacterData, '登场台词'>,
): CharacterData {
  return {
    ...data,
    ...(overrides.登场台词 === undefined ? {} : { 登场台词: overrides.登场台词 }),
  };
}

export function enqueueDxCharacterImport(_queueKey: string, _task: () => Promise<void>): Promise<void> {
  return Promise.resolve();
}

export function resolveDxStoryBookLink(_profile: CharacterPresentationProfile | null): CharacterStoryBookLink | null {
  return null;
}

export function findDxCharacterById(_id: string): DxCharacterRosterEntry | null {
  return null;
}

export function findDxCharacterByName(_name: string): DxCharacterRosterEntry | null {
  return null;
}

export function resolveDxCharacterProfile(_reference: string, _name: string): CharacterPresentationProfile | null {
  return null;
}
