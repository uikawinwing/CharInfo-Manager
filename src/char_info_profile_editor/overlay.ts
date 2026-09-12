import { createApp, type App as VueApp } from 'vue';

import { createScriptIdIframe, teleportStyle } from '@util/script';
import { DEFAULT_CHAR_INFO_THEME_MODE, type CharInfoThemeMode } from '../char_info_shared/managerTheme';
import App from './App.vue';

const MANAGER_IFRAME_SRCDOC =
  '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>*,*::before,*::after{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body></body></html>';

export type ProfileEditorOverlay = {
  open(): void;
  close(): void;
  setForceMobileLayout(value: boolean): void;
  destroy(): void;
};

export type ProfileEditorOverlayOptions = {
  forceMobileLayout?: boolean;
  themeMode?: CharInfoThemeMode;
  debugEnabled?: boolean;
  worldbookName?: string;
  entryUid?: number;
  flashCharacterName?: string;
  onForceRefresh?: () => void | Promise<void>;
  onReturnToWorldbookLibrary?: () => void;
  onReturnToCurrentLibrary?: () => void;
};

type ProfileEditorController = {
  resetToInitialView(): void;
};

export function createProfileEditorOverlay(
  options: ProfileEditorOverlayOptions = {},
): ProfileEditorOverlay {
  let mountedApp: VueApp<Element> | null = null;
  let $managerOverlay: JQuery<HTMLDivElement> | null = null;
  let $managerIframe: JQuery<HTMLIFrameElement> | null = null;
  let teleportedStyle: { destroy: () => void } | null = null;
  let managerViewportCleanup: (() => void) | null = null;
  let managerController: ProfileEditorController | null = null;
  let managerRootElement: HTMLElement | null = null;
  let forceMobileLayout = options.forceMobileLayout ?? false;

  const getHostWindow = (): Window => (window.parent !== window ? window.parent : window);

  const syncManagerOverlayViewport = () => {
    if (!$managerOverlay) return;

    const hostWindow = getHostWindow();
    const viewport = hostWindow.visualViewport;
    $managerOverlay.css({
      left: `${viewport?.offsetLeft ?? 0}px`,
      top: `${viewport?.offsetTop ?? 0}px`,
      width: `${viewport?.width ?? hostWindow.innerWidth}px`,
      height: `${viewport?.height ?? hostWindow.innerHeight}px`,
    });
  };

  const startManagerViewportSync = () => {
    managerViewportCleanup?.();
    const hostWindow = getHostWindow();
    const viewport = hostWindow.visualViewport;
    hostWindow.addEventListener('resize', syncManagerOverlayViewport);
    viewport?.addEventListener('resize', syncManagerOverlayViewport);
    viewport?.addEventListener('scroll', syncManagerOverlayViewport);
    syncManagerOverlayViewport();

    managerViewportCleanup = () => {
      hostWindow.removeEventListener('resize', syncManagerOverlayViewport);
      viewport?.removeEventListener('resize', syncManagerOverlayViewport);
      viewport?.removeEventListener('scroll', syncManagerOverlayViewport);
      managerViewportCleanup = null;
    };
  };

  const teardown = () => {
    managerViewportCleanup?.();
    mountedApp?.unmount();
    mountedApp = null;
    managerController = null;
    managerRootElement = null;
    teleportedStyle?.destroy();
    teleportedStyle = null;
    $managerOverlay?.remove();
    $managerOverlay = null;
    $managerIframe = null;
  };

  const close = teardown;
  const destroy = teardown;

  const open = () => {
    if ($managerOverlay) {
      managerController?.resetToInitialView();
      $managerOverlay.show();
      startManagerViewportSync();
      return;
    }

    const hostWindow = getHostWindow();
    const hostDocument = hostWindow.document;
    const host$ = (hostWindow as Window & { $: JQueryStatic }).$;
    const $overlay = host$('<div>')
      .attr({
        'data-char-info-profile-editor': '',
        'data-char-info-manager-view': 'editor',
        role: 'presentation',
      })
      .css({
        position: 'fixed',
        overflow: 'hidden',
        border: '0',
        background: 'transparent',
        zIndex: '2147483000',
      }) as JQuery<HTMLDivElement>;
    const $iframe = createScriptIdIframe()
      .attr({
        title: '角色档案编辑器',
        'aria-label': '角色档案编辑器',
        srcdoc: MANAGER_IFRAME_SRCDOC,
      })
      .css({
        display: 'block',
        width: '100%',
        height: '100%',
        border: '0',
        background: 'transparent',
      })
      .one('load', () => {
        if ($managerIframe?.[0] !== $iframe[0]) return;

        const iframeDocument = $iframe[0].contentDocument;
        if (!iframeDocument) throw new Error('无法建立角色档案编辑界面。');

        teleportedStyle = teleportStyle(iframeDocument.head);
        const mountPoint = iframeDocument.createElement('div');
        mountPoint.id = 'char-info-profile-editor';
        iframeDocument.body.appendChild(mountPoint);

        mountedApp = createApp(App, {
          initialView: 'editor',
          initialWorldbookName: options.worldbookName,
          initialEntryUid: options.entryUid,
          flashCharacterName: options.flashCharacterName,
          themeMode: options.themeMode ?? DEFAULT_CHAR_INFO_THEME_MODE,
          debugEnabled: options.debugEnabled ?? false,
          onForceRefresh: options.onForceRefresh,
          onReturnToWorldbookLibrary: options.onReturnToWorldbookLibrary,
          onReturnToCurrentLibrary: options.onReturnToCurrentLibrary,
          onClose: close,
        });
        managerController = mountedApp.mount(mountPoint) as ProfileEditorController;
        managerRootElement = mountPoint.querySelector<HTMLElement>('.manager-root');
        managerRootElement?.classList.toggle('force-mobile-layout', forceMobileLayout);
      });

    $overlay.append($iframe).appendTo(hostDocument.body);
    $managerOverlay = $overlay;
    $managerIframe = $iframe;
    startManagerViewportSync();
  };

  const setForceMobileLayout = (value: boolean) => {
    forceMobileLayout = value;
    managerRootElement?.classList.toggle('force-mobile-layout', value);
  };

  return { open, close, setForceMobileLayout, destroy };
}
