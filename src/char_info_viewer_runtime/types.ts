import type { CurrentCharacterSnapshot } from './currentCharacterLibrary';
import type { CharInfoFloatingButtonPosition, CharInfoUiSettings } from './runtimeSettings';

export type RuntimeCardView = {
  key: string;
  renderKey: string;
  yamlText: string;
  host: HTMLElement;
};

export type RuntimeMessageView = {
  messageId: number;
  renderKey: string;
  cards: RuntimeCardView[];
};

export type RuntimeLibraryView = {
  host: HTMLElement;
  messageId: number;
  revision: number;
  characters: CurrentCharacterSnapshot[];
  listOpen: boolean;
  viewerOpen: boolean;
  unreadCharacterNames: string[];
  floatingButtonPosition: CharInfoFloatingButtonPosition | null;
  loading: boolean;
  error: string;
};

export type RuntimeSettingsView = {
  host: HTMLElement;
};

export type RuntimeViewState = {
  messages: RuntimeMessageView[];
  library: RuntimeLibraryView | null;
  settings: CharInfoUiSettings;
  settingsView: RuntimeSettingsView | null;
};
