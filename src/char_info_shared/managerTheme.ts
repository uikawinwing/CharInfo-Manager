export const CHAR_INFO_THEME_MODES = ['dark', 'light'] as const;

export type CharInfoThemeMode = (typeof CHAR_INFO_THEME_MODES)[number];

export const DEFAULT_CHAR_INFO_THEME_MODE: CharInfoThemeMode = 'dark';

export function managerThemeClass(themeMode: CharInfoThemeMode): string {
  return `char-info-theme-${themeMode}`;
}
