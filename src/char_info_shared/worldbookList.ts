export type CharacterWorldbookBinding = {
  primary: string | null;
  additional: string[];
};

export type WorldbookEntrySource<T> = {
  worldbookName: string;
  entries: T[];
};

export function buildWorldbookList(
  preferredNames: Array<string | null | undefined>,
  allNames: Array<string | null | undefined>,
): string[] {
  return [...new Set([...preferredNames, ...allNames].filter((name): name is string => !!name?.trim()))];
}

export function buildCurrentWorldbookList(
  characterWorldbooks: CharacterWorldbookBinding,
  globalWorldbooks: Array<string | null | undefined>,
  chatWorldbook: string | null | undefined,
): string[] {
  return buildWorldbookList(
    [characterWorldbooks.primary, ...characterWorldbooks.additional],
    [...globalWorldbooks, chatWorldbook],
  );
}

export async function loadWorldbookEntrySources<T>(
  worldbookNames: readonly string[],
  loadWorldbook: (worldbookName: string) => Promise<T[]>,
): Promise<WorldbookEntrySource<T>[]> {
  return Promise.all(
    worldbookNames.map(async worldbookName => ({
      worldbookName,
      entries: await loadWorldbook(worldbookName),
    })),
  );
}
