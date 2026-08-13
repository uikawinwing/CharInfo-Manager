export const CREATOR_MANAGER_HOST_BRIDGE_KEY = '__charInfoCreatorManagerHostBridge';
export const CREATOR_MANAGER_HOST_BRIDGE_VERSION = 2;

export type CreatorManagerOpenOptions = {
  worldbookName?: string;
  entryUid?: number;
  forceMobileLayout?: boolean;
};

export type CreatorManagerHostBridge = {
  version: typeof CREATOR_MANAGER_HOST_BRIDGE_VERSION;
  open(options?: CreatorManagerOpenOptions): void;
  close(): void;
};

type CreatorManagerHostWindow = Window & Record<string, unknown>;

export function getCreatorManagerHostWindow(currentWindow: Window = window): CreatorManagerHostWindow {
  return (
    currentWindow.parent && currentWindow.parent !== currentWindow ? currentWindow.parent : currentWindow
  ) as CreatorManagerHostWindow;
}

export function getCreatorManagerHostBridge(
  hostWindow: CreatorManagerHostWindow = getCreatorManagerHostWindow(),
): CreatorManagerHostBridge | null {
  const candidate = hostWindow[CREATOR_MANAGER_HOST_BRIDGE_KEY];
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    (candidate as Partial<CreatorManagerHostBridge>).version !== CREATOR_MANAGER_HOST_BRIDGE_VERSION ||
    typeof (candidate as Partial<CreatorManagerHostBridge>).open !== 'function' ||
    typeof (candidate as Partial<CreatorManagerHostBridge>).close !== 'function'
  ) {
    return null;
  }

  return candidate as CreatorManagerHostBridge;
}

export function registerCreatorManagerHostBridge(
  hostWindow: CreatorManagerHostWindow,
  bridge: CreatorManagerHostBridge,
): () => void {
  hostWindow[CREATOR_MANAGER_HOST_BRIDGE_KEY] = bridge;
  return () => {
    if (hostWindow[CREATOR_MANAGER_HOST_BRIDGE_KEY] === bridge) {
      delete hostWindow[CREATOR_MANAGER_HOST_BRIDGE_KEY];
    }
  };
}
