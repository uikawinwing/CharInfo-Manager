import type { CharacterPresentationProfile } from './roster';

export type CharacterStoryBookLink = {
  bookId: string;
  title: string;
  festivalName?: string;
};

const dxCharacterStoryBookMap: Record<string, CharacterStoryBookLink> = {
  '维纳丝·珀菈·索伦蒂斯': {
    bookId: '阿芙罗黛蒂之冠',
    title: '阿芙罗黛蒂之冠',
    festivalName: '倾国倾城祭',
  },
};

export function resolveDxStoryBookLink(profile: CharacterPresentationProfile | null): CharacterStoryBookLink | null {
  if (!profile || profile.edition !== 'dx') return null;
  return dxCharacterStoryBookMap[profile.name] ?? null;
}
