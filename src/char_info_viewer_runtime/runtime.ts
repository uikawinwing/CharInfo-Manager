import { createPinia } from 'pinia';
import { createApp, markRaw, reactive, type App } from 'vue';

import { createScriptIdDiv, teleportStyle } from '@util/script';
import { closeCreatorManager, openCreatorManager } from '../char_info_creator_manager/controller';
import { projectCharInfoMessage } from '../char_info_viewer/runtime/charInfoMessage';
import { selectRecentMessageIds } from '../char_info_viewer/runtime/recentMessages';
import RuntimeRoot from './RuntimeRoot.vue';
import { collectChangedAffinityNames, collectCurrentCharacterSnapshots } from './currentCharacterLibrary';
import { mountCharInfoCardHosts, type MountedNativeCardHost } from './nativeMessageMount';
import {
  defaultRuntimeSettings,
  mergeRuntimeFloatingButtonPosition,
  mergeRuntimeSettings,
  normalizeRuntimeSettings,
  readRuntimeFloatingButtonPosition,
  readRuntimeSettings,
  type CharInfoFloatingButtonPosition,
  type CharInfoUiSettings,
} from './runtimeSettings';
import type { RuntimeMessageView, RuntimeViewState } from './types';

const MAX_CARDS_PER_MESSAGE = 4;
const DIRTY_BATCH_SIZE = 3;
const DIRTY_FLUSH_DELAY_MS = 20;
const REMOUNT_LOOP_GUARD_MS = 3000;
const LIBRARY_HOST_CLASS = 'char-info-library-host';
const LEGACY_CURRENT_LIBRARY_BUTTON_NAME = '角色资料库';
const CREATOR_BUTTON_NAME = '角色视觉编辑器';
const LEGACY_CREATOR_BUTTON_NAME = '角色视觉编辑';
const SETTINGS_HOST_CLASS = 'char-info-settings-host';
const SETTINGS_BUTTON_NAME = 'CharInfo 设置';

type MountedMessage = {
  messageId: number;
  swipeId: number;
  sourceText: string;
  sourceElement: HTMLElement;
  cardMounts: MountedNativeCardHost[];
};

type RemountAttempt = {
  signature: string;
  attemptedAt: number;
};

type CharInfoRuntimeStopOptions = {
  restoreNativeMessages?: boolean;
};

export type CharInfoRuntime = {
  start(): void;
  stop(options?: CharInfoRuntimeStopOptions): void;
};

function getMessageElement(messageId: number): HTMLElement | null {
  return window.parent.document.querySelector<HTMLElement>(`#chat > .mes[mesid="${messageId}"]`);
}

function readMessage(messageId: number): { message: ChatMessage; swipeId: number } | null {
  const message = getChatMessages(messageId)[0];
  if (!message || message.role !== 'assistant' || message.is_hidden) return null;

  const swipeMessage = getChatMessages(messageId, { include_swipes: true })[0];
  const swipeId = swipeMessage && 'swipe_id' in swipeMessage ? swipeMessage.swipe_id : 0;
  return { message, swipeId };
}

export function createCharInfoRuntime(): CharInfoRuntime {
  const state = reactive<RuntimeViewState>({
    messages: [],
    library: null,
    settings: readRuntimeSettings(getVariables({ type: 'script' })),
    settingsView: null,
  });
  const mountedMessages = new Map<number, MountedMessage>();
  const remountAttempts = new Map<number, RemountAttempt>();
  const activeFloorIds = new Set<number>();
  const dirtyMessageIds = new Set<number>();
  const eventStops: Array<() => void> = [];

  let app: App<Element> | null = null;
  let appRoot: HTMLElement | null = null;
  let destroyTeleportedStyle: (() => void) | null = null;
  let mutationObserver: MutationObserver | null = null;
  let dirtyFlushTimer: ReturnType<typeof setTimeout> | null = null;
  let rescanTimer: ReturnType<typeof setTimeout> | null = null;
  let libraryRefreshPending = false;
  const pendingAffinityNames = new Set<string>();
  let lifecycleRevision = 0;
  let started = false;
  const closeSettings = () => {
    state.settingsView?.host.remove();
    state.settingsView = null;
  };

  const closeLibrary = () => {
    if (!state.library) return;
    state.library.listOpen = false;
    state.library.viewerOpen = false;
    state.library.worldbookOpen = false;
  };

  const closeLibraryList = () => {
    if (!state.library) return;
    state.library.listOpen = false;
  };

  const closeLibraryViewer = () => {
    if (!state.library) return;
    state.library.viewerOpen = false;
  };

  const closeCreatorEditor = () => {
    closeCreatorManager();
  };

  const resetLibraryForChat = () => {
    const library = state.library;
    if (!library) return;
    libraryRefreshPending = false;
    pendingAffinityNames.clear();
    library.messageId = Math.max(0, getLastMessageId());
    library.revision += 1;
    library.characters = [];
    library.listOpen = false;
    library.viewerOpen = false;
    library.worldbookOpen = false;
    library.unreadCharacterNames = [];
    library.loading = false;
    library.error = '';
  };

  const applyLibrarySnapshot = (mvuData: unknown, changedAffinityNames: readonly string[] = []) => {
    const library = state.library;
    if (!library) return;

    const characters = collectCurrentCharacterSnapshots(mvuData, getVariables({ type: 'chat' }));
    const characterNames = new Set(characters.map(character => character.name));
    const nextUnread = new Set(library.unreadCharacterNames.filter(name => characterNames.has(name)));
    changedAffinityNames.forEach(name => {
      if (characterNames.has(name)) nextUnread.add(name);
    });

    library.messageId = Math.max(0, getLastMessageId());
    library.revision += 1;
    library.characters = characters;
    library.unreadCharacterNames = Array.from(nextUnread);
    library.error = '';
  };

  const refreshLibrary = async (changedAffinityNames: readonly string[] = []) => {
    const library = state.library;
    if (!library) return;
    changedAffinityNames.forEach(name => pendingAffinityNames.add(name));
    if (library.loading) {
      libraryRefreshPending = true;
      return;
    }

    libraryRefreshPending = false;
    const unreadNamesForRefresh = Array.from(pendingAffinityNames);
    pendingAffinityNames.clear();
    library.loading = true;
    library.error = '';
    try {
      await waitGlobalInitialized('Mvu');
      if (!started || state.library !== library) return;

      applyLibrarySnapshot(Mvu.getMvuData({ type: 'message', message_id: 'latest' }), unreadNamesForRefresh);
    } catch (error) {
      if (state.library !== library) return;
      console.error('[CharInfo Runtime] 当前角色资料读取失败：', error);
      library.characters = [];
      library.error = `读取失败：${error instanceof Error ? error.message : String(error)}`;
    } finally {
      if (state.library === library) {
        library.loading = false;
        if (libraryRefreshPending || pendingAffinityNames.size > 0) {
          libraryRefreshPending = false;
          void refreshLibrary();
        }
      }
    }
  };

  const openLibraryList = () => {
    if (!started) return;
    closeCreatorEditor();
    closeSettings();
    if (!state.library) return;
    state.library.worldbookOpen = false;
    state.library.listOpen = true;
    void refreshLibrary();
  };

  const openLibraryCharacter = (name: string) => {
    const library = state.library;
    if (!library?.characters.some(character => character.name === name)) return;
    library.unreadCharacterNames = library.unreadCharacterNames.filter(characterName => characterName !== name);
    library.listOpen = true;
    library.viewerOpen = true;
  };

  const updateLibraryButtonPosition = (position: CharInfoFloatingButtonPosition) => {
    const library = state.library;
    if (!library) return;
    library.floatingButtonPosition = position;
    replaceVariables(mergeRuntimeFloatingButtonPosition(getVariables({ type: 'script' }), position), {
      type: 'script',
    });
  };

  const initializeLibrary = () => {
    if (state.library) return;
    const host = window.parent.document.createElement('div');
    host.className = LIBRARY_HOST_CLASS;
    host.dataset.charInfoLibrary = '';
    window.parent.document.body.appendChild(host);
    state.library = {
      host: markRaw(host),
      messageId: Math.max(0, getLastMessageId()),
      revision: 0,
      characters: [],
      listOpen: false,
      viewerOpen: false,
      worldbookOpen: false,
      unreadCharacterNames: [],
      floatingButtonPosition: readRuntimeFloatingButtonPosition(getVariables({ type: 'script' })),
      loading: false,
      error: '',
    };
  };

  const destroyLibrary = () => {
    libraryRefreshPending = false;
    pendingAffinityNames.clear();
    state.library?.host.remove();
    state.library = null;
  };

  const updateSettings = (value: CharInfoUiSettings): CharInfoUiSettings => {
    const nextSettings = normalizeRuntimeSettings(value);
    state.settings.activeFloorLimit = nextSettings.activeFloorLimit;
    state.settings.effectsEnabled = nextSettings.effectsEnabled;
    state.settings.forceMobileLayout = nextSettings.forceMobileLayout;
    state.settings.debugEnabled = nextSettings.debugEnabled;
    state.settings.imageSourcePriorityEnabled = nextSettings.imageSourcePriorityEnabled;
    state.settings.imageSourcePriority = nextSettings.imageSourcePriority;
    replaceVariables(mergeRuntimeSettings(getVariables({ type: 'script' }), nextSettings), { type: 'script' });
    scanRecentFloors();
    return nextSettings;
  };

  const resetSettings = (): CharInfoUiSettings => updateSettings(defaultRuntimeSettings());

  const openWorldbookLibrary = () => {
    if (!started) return;
    closeLibrary();
    closeSettings();
    if (state.library) state.library.worldbookOpen = true;
  };

  const closeWorldbookLibrary = () => {
    if (state.library) state.library.worldbookOpen = false;
  };

  const openCurrentChatLibrary = () => {
    closeWorldbookLibrary();
    openLibraryList();
  };

  const editWorldbookCharacter = (worldbookName: string, entryUid?: number) => {
    try {
      openCreatorManager({
        worldbookName,
        entryUid,
        forceMobileLayout: state.settings.forceMobileLayout,
        debugEnabled: state.settings.debugEnabled,
      });
      closeWorldbookLibrary();
    } catch (error) {
      console.error('[CharInfo Runtime] 角色资料编辑器打开失败：', error);
      toastr.warning('角色资料编辑器暂时无法打开。');
    }
  };

  const openSettings = () => {
    if (!started) return;
    closeCreatorEditor();
    closeLibrary();
    if (state.settingsView) return;

    const host = window.parent.document.createElement('div');
    host.className = SETTINGS_HOST_CLASS;
    host.dataset.charInfoSettings = '';
    window.parent.document.body.appendChild(host);
    state.settingsView = { host: markRaw(host) };
  };

  const removeMessage = (messageId: number) => {
    const mounted = mountedMessages.get(messageId);
    if (mounted) {
      mountedMessages.delete(messageId);
    }

    const viewIndex = state.messages.findIndex(message => message.messageId === messageId);
    if (viewIndex >= 0) state.messages.splice(viewIndex, 1);
    mounted?.cardMounts
      .slice()
      .reverse()
      .forEach(cardMount => cardMount.restore());
  };

  const clearMessages = () => {
    Array.from(mountedMessages.keys()).forEach(removeMessage);
    remountAttempts.clear();
    activeFloorIds.clear();
    dirtyMessageIds.clear();
  };

  const restoreNativeMessageDisplays = (messageIds: readonly number[]) => {
    messageIds.forEach(messageId => {
      const messageElement = getMessageElement(messageId);
      if (!messageElement || messageElement.querySelector('#curEditTextarea')) return;

      void refreshOneMessage(messageId, $(messageElement)).catch(error => {
        console.warn(`[CharInfo Runtime] 第 ${messageId} 楼关闭后恢复原生显示失败：`, error);
      });
    });
  };

  const upsertView = (view: RuntimeMessageView) => {
    const index = state.messages.findIndex(message => message.messageId === view.messageId);
    if (index >= 0) {
      state.messages[index] = view;
    } else {
      state.messages.push(view);
      state.messages.sort((left, right) => left.messageId - right.messageId);
    }
  };

  const renderMessage = (messageId: number) => {
    if (!activeFloorIds.has(messageId)) {
      removeMessage(messageId);
      return;
    }

    const source = readMessage(messageId);
    const messageElement = getMessageElement(messageId);
    const sourceElement = messageElement?.querySelector<HTMLElement>('.mes_text') ?? null;
    if (!source || !sourceElement) {
      removeMessage(messageId);
      return;
    }
    if (messageElement.querySelector('#curEditTextarea')) {
      removeMessage(messageId);
      return;
    }

    const projection = projectCharInfoMessage({
      messageId,
      swipeId: source.swipeId,
      text: source.message.message,
      maxCards: MAX_CARDS_PER_MESSAGE,
    });
    if (projection.overflow) {
      console.warn(`[CharInfo Runtime] 第 ${messageId} 楼包含过多 char_info，已保留原始消息。`);
      removeMessage(messageId);
      return;
    }
    if (projection.cards.length === 0) {
      removeMessage(messageId);
      return;
    }

    const current = mountedMessages.get(messageId);
    if (
      current &&
      current.sourceElement === sourceElement &&
      current.cardMounts.every(cardMount => cardMount.host.isConnected) &&
      current.swipeId === source.swipeId &&
      current.sourceText === source.message.message
    ) {
      return;
    }

    const sourceSignature = `${source.swipeId}:${source.message.message}`;
    if (current) {
      const previousAttempt = remountAttempts.get(messageId);
      const now = Date.now();
      if (previousAttempt?.signature === sourceSignature && now - previousAttempt.attemptedAt < REMOUNT_LOOP_GUARD_MS) {
        console.warn(`[CharInfo Runtime] 第 ${messageId} 楼在短时间内重复失去挂载点，已停止自动重挂载以避免渲染循环。`);
        removeMessage(messageId);
        return;
      }
      remountAttempts.set(messageId, { signature: sourceSignature, attemptedAt: now });
      removeMessage(messageId);
    } else {
      remountAttempts.delete(messageId);
    }

    const cardMounts = mountCharInfoCardHosts(sourceElement, projection.cards);
    if (!cardMounts) {
      console.warn(`[CharInfo Runtime] 第 ${messageId} 楼无法安全定位 char_info，已保留原生消息。`);
      removeMessage(messageId);
      return;
    }

    const mounted: MountedMessage = {
      messageId,
      swipeId: source.swipeId,
      sourceText: source.message.message,
      sourceElement,
      cardMounts,
    };
    mountedMessages.set(messageId, mounted);

    upsertView({
      messageId,
      renderKey: projection.cards.map(card => card.renderKey).join('|'),
      cards: projection.cards.map((card, index) => ({
        key: card.id,
        renderKey: card.renderKey,
        yamlText: card.content,
        host: markRaw(cardMounts[index].host),
      })),
    });
  };

  const flushDirtyMessages = () => {
    dirtyFlushTimer = null;
    if (!started) return;

    const batch = Array.from(dirtyMessageIds).slice(0, DIRTY_BATCH_SIZE);
    batch.forEach(messageId => dirtyMessageIds.delete(messageId));
    batch.forEach(messageId => {
      try {
        renderMessage(messageId);
      } catch (error) {
        console.error(`[CharInfo Runtime] 第 ${messageId} 楼渲染失败：`, error);
        removeMessage(messageId);
      }
    });

    if (dirtyMessageIds.size > 0) {
      dirtyFlushTimer = setTimeout(flushDirtyMessages, DIRTY_FLUSH_DELAY_MS);
    }
  };

  const enqueueMessage = (messageId: number) => {
    if (!Number.isInteger(messageId) || messageId < 0) return;
    dirtyMessageIds.add(messageId);
    if (!dirtyFlushTimer) {
      dirtyFlushTimer = setTimeout(flushDirtyMessages, DIRTY_FLUSH_DELAY_MS);
    }
  };

  const applyRecentFloorIds = (messageIds: readonly number[]) => {
    const recentIds = selectRecentMessageIds(messageIds, state.settings.activeFloorLimit);
    activeFloorIds.clear();
    recentIds.forEach(messageId => activeFloorIds.add(messageId));
    Array.from(mountedMessages.keys()).forEach(messageId => {
      if (!activeFloorIds.has(messageId)) removeMessage(messageId);
    });
    recentIds.forEach(enqueueMessage);
  };

  const scanRecentFloors = () => {
    const messageIds = Array.from(window.parent.document.querySelectorAll<HTMLElement>('#chat > .mes'))
      .map(element => Number(element.getAttribute('mesid')))
      .filter(Number.isInteger);
    applyRecentFloorIds(messageIds);
  };

  const advanceRecentFloor = (messageId: number) => {
    applyRecentFloorIds([...activeFloorIds, messageId].sort((left, right) => left - right));
  };

  const scheduleRecentScan = () => {
    if (rescanTimer) clearTimeout(rescanTimer);
    rescanTimer = setTimeout(() => {
      rescanTimer = null;
      scanRecentFloors();
    }, 0);
  };

  const listen = <T extends EventType>(event: T, listener: ListenerType[T]) => {
    const subscription = eventOn(event, listener);
    eventStops.push(() => subscription.stop());
  };

  const observeMessageDom = () => {
    const chat = window.parent.document.querySelector('#chat');
    if (!chat) return;

    mutationObserver = new window.parent.MutationObserver(mutations => {
      if (mountedMessages.size === 0) return;
      const changedMessageIds = new Set<number>();

      mutations.forEach(mutation => {
        const target = mutation.target.nodeType === 1 ? (mutation.target as Element) : mutation.target.parentElement;
        if (!target || target.closest('[data-char-info-runtime-owned]')) return;

        const messageElement = target.closest<HTMLElement>('#chat > .mes');
        const messageId = Number(messageElement?.getAttribute('mesid'));
        if (Number.isInteger(messageId)) changedMessageIds.add(messageId);
      });

      changedMessageIds.forEach(messageId => {
        const mounted = mountedMessages.get(messageId);
        if (!mounted) return;
        if (!mounted.sourceElement.isConnected || mounted.cardMounts.some(cardMount => !cardMount.host.isConnected)) {
          enqueueMessage(messageId);
        }
      });
    });
    mutationObserver.observe(chat, { childList: true, subtree: true });
  };

  const bindEvents = () => {
    listen(tavern_events.USER_MESSAGE_RENDERED, messageId => {
      advanceRecentFloor(messageId);
    });
    listen(tavern_events.CHARACTER_MESSAGE_RENDERED, messageId => {
      advanceRecentFloor(messageId);
      enqueueMessage(messageId);
    });
    listen(tavern_events.MESSAGE_RECEIVED, messageId => {
      advanceRecentFloor(messageId);
      enqueueMessage(messageId);
    });
    listen(tavern_events.GENERATION_ENDED, messageId => {
      enqueueMessage(messageId);
    });
    listen(tavern_events.MESSAGE_EDITED, messageId => {
      enqueueMessage(messageId);
    });
    listen(tavern_events.MESSAGE_UPDATED, messageId => {
      enqueueMessage(messageId);
    });
    listen(tavern_events.MESSAGE_SWIPED, messageId => {
      enqueueMessage(messageId);
      void refreshLibrary();
    });
    listen(tavern_events.MESSAGE_DELETED, messageId => {
      removeMessage(messageId);
      scheduleRecentScan();
    });
    listen(tavern_events.CHAT_CHANGED, () => {
      closeCreatorEditor();
      resetLibraryForChat();
      closeSettings();
      clearMessages();
      scheduleRecentScan();
      void refreshLibrary();
    });
    listen(tavern_events.MORE_MESSAGES_LOADED, scheduleRecentScan);
  };

  return {
    start() {
      if (started) return;
      started = true;
      const startRevision = ++lifecycleRevision;

      initializeLibrary();
      const $appRoot = createScriptIdDiv().addClass('char-info-runtime-root').appendTo('body');
      appRoot = $appRoot[0];
      destroyTeleportedStyle = teleportStyle().destroy;
      app = createApp(RuntimeRoot, {
        state,
        onCloseLibraryList: closeLibraryList,
        onCloseLibraryViewer: closeLibraryViewer,
        onRefreshLibrary: () => void refreshLibrary(),
        onOpenLibraryList: openLibraryList,
        onOpenLibraryCharacter: openLibraryCharacter,
        onOpenWorldbookLibrary: openWorldbookLibrary,
        onCloseWorldbookLibrary: closeWorldbookLibrary,
        onOpenCurrentChatLibrary: openCurrentChatLibrary,
        onEditWorldbookCharacter: editWorldbookCharacter,
        onMoveLibraryButton: updateLibraryButtonPosition,
        onOpenSettings: openSettings,
        onCloseSettings: closeSettings,
        onUpdateSettings: updateSettings,
        onResetSettings: resetSettings,
      }).use(createPinia());
      app.mount(appRoot);

      updateScriptButtonsWith(buttons =>
        buttons.filter(
          button =>
            button.name !== CREATOR_BUTTON_NAME &&
            button.name !== LEGACY_CREATOR_BUTTON_NAME &&
            button.name !== LEGACY_CURRENT_LIBRARY_BUTTON_NAME &&
            button.name !== '世界书角色库' &&
            button.name !== SETTINGS_BUTTON_NAME,
        ),
      );
      bindEvents();
      observeMessageDom();
      scanRecentFloors();
      void waitGlobalInitialized('Mvu').then(() => {
        if (!started || lifecycleRevision !== startRevision) return;
        listen(Mvu.events.VARIABLE_INITIALIZED, () => {
          void refreshLibrary();
        });
        listen(Mvu.events.VARIABLE_UPDATE_ENDED, (variables, variablesBeforeUpdate) => {
          void refreshLibrary(collectChangedAffinityNames(variables, variablesBeforeUpdate));
        });
        void refreshLibrary();
      });
    },

    stop(options = {}) {
      if (!started) return;
      started = false;
      lifecycleRevision += 1;
      const mountedMessageIds = options.restoreNativeMessages === false ? [] : Array.from(mountedMessages.keys());

      if (dirtyFlushTimer) clearTimeout(dirtyFlushTimer);
      if (rescanTimer) clearTimeout(rescanTimer);
      dirtyFlushTimer = null;
      rescanTimer = null;
      mutationObserver?.disconnect();
      mutationObserver = null;
      eventStops.splice(0).forEach(stop => stop());
      closeCreatorEditor();
      closeLibrary();
      closeSettings();
      clearMessages();
      app?.unmount();
      app = null;
      destroyLibrary();
      appRoot?.remove();
      appRoot = null;
      destroyTeleportedStyle?.();
      destroyTeleportedStyle = null;
      restoreNativeMessageDisplays(mountedMessageIds);
    },
  };
}
