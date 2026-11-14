import type { CurrentCharacterSnapshot, InnerThoughtUpdate } from './currentCharacterLibrary';
import type { CharInfoFloatingButtonPosition, CharInfoUiSettings } from './runtimeSettings';
import type { PortraitJobStatus } from './portraitJobs';
import type { PortraitFormat } from './portraitPrompt';
import type { StoryPortrait } from './portraitRuntime';

export type RuntimeCardView = {
  key: string;
  renderKey: string;
  yamlText: string;
  host: HTMLElement;
  portrait?: StoryPortrait;
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
  viewerLoading: boolean;
  worldbookOpen: boolean;
  unreadCharacterNames: string[];
  innerThoughtInbox: InnerThoughtUpdate[];
  floatingButtonPosition: CharInfoFloatingButtonPosition | null;
  loading: boolean;
  error: string;
};

export type RuntimeSettingsView = {
  host: HTMLElement;
};

export type RuntimeSaveState = {
  phase: 'pending' | 'success' | 'error';
  label: string;
};

export type RuntimeMountDiagnosticEntry = {
  time: number;
  messageId: number;
  level: 'info' | 'warn' | 'error';
  code: string;
  details: Record<string, unknown>;
};

export type RuntimeViewState = {
  messages: RuntimeMessageView[];
  visualRevision: number;
  library: RuntimeLibraryView | null;
  settings: CharInfoUiSettings;
  settingsView: RuntimeSettingsView | null;
  saveStateByCard: Record<string, RuntimeSaveState>;
  mountDiagnostics: RuntimeMountDiagnosticEntry[];
  portraitRevision: number;
  portraitJobs: PortraitJobStatus[];
  portraitAvailability: { code: string; message: string } | null;
  portraitFormat: PortraitFormat;
};
