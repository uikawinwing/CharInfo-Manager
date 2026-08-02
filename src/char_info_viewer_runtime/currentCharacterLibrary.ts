export type CurrentCharacterSnapshot = {
  name: string;
  race: string;
  identity: string;
  level: string;
  inScene: boolean;
  affinity: number | null;
  innerThought: string;
  avatarUrl: string;
  data: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatListValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item).trim())
      .filter(Boolean)
      .join(' · ');
  }
  return value == null ? '' : String(value).trim();
}

function normalizeAffinity(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const affinity = Number(value);
  return Number.isFinite(affinity) ? affinity : null;
}

function getRelationshipList(mvuData: unknown): Record<string, unknown> | null {
  if (!isRecord(mvuData) || !isRecord(mvuData.stat_data) || !isRecord(mvuData.stat_data.关系列表)) return null;
  return mvuData.stat_data.关系列表;
}

function clonePlainValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clonePlainValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, clonePlainValue(nestedValue)]));
  }
  return value;
}

function resolveAvatarUrl(chatVariables: unknown, name: string): string {
  if (!isRecord(chatVariables) || !isRecord(chatVariables.status)) return '';
  const externalAvatars = chatVariables.status.externalAvatars;
  if (!isRecord(externalAvatars) || !isRecord(externalAvatars.partners)) return '';
  const avatar = externalAvatars.partners[name];
  if (!isRecord(avatar) || typeof avatar.url !== 'string') return '';

  const url = avatar.url.trim();
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}

export function collectCurrentCharacterSnapshots(
  mvuData: unknown,
  chatVariables: unknown = null,
): CurrentCharacterSnapshot[] {
  const relationshipList = getRelationshipList(mvuData);
  if (!relationshipList) return [];

  return Object.entries(relationshipList)
    .flatMap(([rawName, value]) => {
      const name = rawName.trim();
      if (!name || !isRecord(value)) return [];

      return [
        {
          name,
          race: formatListValue(value.种族),
          identity: formatListValue(value.身份),
          level: formatListValue(value.等级),
          inScene: value.在场 === true,
          affinity: normalizeAffinity(value.好感度),
          innerThought: formatListValue(value.心里话),
          avatarUrl: resolveAvatarUrl(chatVariables, name),
          data: value,
        },
      ];
    })
    .sort((left, right) => {
      if (left.inScene !== right.inScene) return left.inScene ? -1 : 1;
      return left.name.localeCompare(right.name, 'zh-Hans-CN');
    });
}

export function collectChangedAffinityNames(nextMvuData: unknown, previousMvuData: unknown): string[] {
  const nextRelationships = getRelationshipList(nextMvuData);
  const previousRelationships = getRelationshipList(previousMvuData);
  if (!nextRelationships || !previousRelationships) return [];

  return Object.entries(nextRelationships)
    .flatMap(([rawName, nextValue]) => {
      const name = rawName.trim();
      const previousValue = previousRelationships[rawName];
      if (!name || !isRecord(nextValue) || !isRecord(previousValue)) return [];

      const nextAffinity = normalizeAffinity(nextValue.好感度);
      const previousAffinity = normalizeAffinity(previousValue.好感度);
      if (nextAffinity == null || previousAffinity == null || nextAffinity === previousAffinity) return [];
      return [name];
    })
    .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));
}

export function buildCurrentCharacterViewerData(snapshot: CurrentCharacterSnapshot): Record<string, unknown> {
  const viewerData = clonePlainValue({
    ...snapshot.data,
    姓名: snapshot.name,
  }) as Record<string, unknown>;
  if (viewerData.外貌特质 == null && viewerData.外貌 != null) {
    viewerData.外貌特质 = clonePlainValue(viewerData.外貌);
  }
  if (viewerData.衣物装饰 == null && viewerData.着装 != null) {
    viewerData.衣物装饰 = clonePlainValue(viewerData.着装);
  }
  return viewerData;
}
