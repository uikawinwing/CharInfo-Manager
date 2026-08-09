import {
  itemDescription,
  itemEffectOrDescription,
  itemName,
  lawActive,
  lawPassive,
  type CharacterViewModel,
  type ItemObject,
} from '../../services/characterViewModel';

export type DivinityStageSection = {
  kind: string;
  typeLabel: string;
  title: string;
  body: string;
  details?: Array<{
    label: string;
    body: string;
  }>;
};

function createSection(
  kind: string,
  typeLabel: string,
  titleText: string,
  body: string,
  details: DivinityStageSection['details'] = [],
): DivinityStageSection | null {
  const safeTitle = titleText.trim();
  const safeBody = body.trim();
  const safeDetails = details.filter(detail => detail.body.trim());
  if (!safeTitle && !safeBody && safeDetails.length === 0) return null;
  return {
    kind,
    typeLabel,
    title: safeTitle || kind,
    body: safeBody,
    ...(safeDetails.length > 0 ? { details: safeDetails } : {}),
  };
}

function objectSections(items: ItemObject[], kind: string, typeLabel: string): DivinityStageSection[] {
  return items
    .map(item => createSection(kind, typeLabel, itemName(item), itemEffectOrDescription(item)))
    .filter((section): section is DivinityStageSection => !!section);
}

function lawSection(item: ItemObject): DivinityStageSection | null {
  return createSection('法则', 'Divine Law', itemName(item), '', [
    { label: '被动效果', body: lawPassive(item) },
    { label: '主动效果', body: lawActive(item) },
    { label: '描述', body: itemDescription(item) },
  ]);
}

export function buildDivinitySections(vm: CharacterViewModel): DivinityStageSection[] {
  const entries: Array<DivinityStageSection | null> = [
    vm.divinityKingdom
      ? createSection('神国', 'Divine Realm', vm.divinityKingdom.name, vm.divinityKingdom.description)
      : null,
    ...objectSections(vm.divinityElements, '要素', 'Divine Element'),
    ...objectSections(vm.divinityPowers, '权能', 'Authority'),
    ...vm.divinityLaws.map(lawSection),
  ];

  return entries.filter((section): section is DivinityStageSection => !!section);
}
