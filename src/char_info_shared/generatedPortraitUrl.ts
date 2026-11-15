export const GENERATED_PORTRAIT_FOLDER = 'charinfo-generated';

const SAVED_PORTRAIT_PATH =
  /^\/?user\/images\/charinfo-generated\/charinfo-[0-9a-f]{32}\.(?:png|jpg|jpeg|gif|webp|avif)$/i;

export function normalizeGeneratedPortraitUrl(value: unknown): string {
  if (typeof value !== 'string' || !SAVED_PORTRAIT_PATH.test(value)) return '';
  return value.startsWith('/') ? value : `/${value}`;
}
