export function buildWorldbookList(
  preferredNames: Array<string | null | undefined>,
  allNames: Array<string | null | undefined>,
): string[] {
  return [...new Set([...preferredNames, ...allNames].filter((name): name is string => !!name?.trim()))];
}
