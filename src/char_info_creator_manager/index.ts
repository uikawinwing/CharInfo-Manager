import {
  CREATOR_MANAGER_HOST_BRIDGE_VERSION,
  getCreatorManagerHostWindow,
  registerCreatorManagerHostBridge,
  type CreatorManagerHostBridge,
} from '../char_info_shared/creatorManagerHostBridge';
import { createCreatorManagerOverlay, type CreatorManagerOverlay } from './overlay';

const hostWindow = getCreatorManagerHostWindow();
let overlay: CreatorManagerOverlay | null = null;

const bridge: CreatorManagerHostBridge = {
  version: CREATOR_MANAGER_HOST_BRIDGE_VERSION,
  open(options = {}) {
    overlay?.destroy();
    overlay = createCreatorManagerOverlay(options);
    overlay.open();
  },
  close() {
    overlay?.close();
  },
};

const unregisterBridge = registerCreatorManagerHostBridge(hostWindow, bridge);

const destroyOverlays = () => {
  overlay?.destroy();
  overlay = null;
};

const destroy = () => {
  destroyOverlays();
  unregisterBridge();
  chatChangedSubscription.stop();
};

const chatChangedSubscription = eventOn(tavern_events.CHAT_CHANGED, destroyOverlays);
window.addEventListener('pagehide', destroy, { once: true });
