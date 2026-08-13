import { createApp, type App as VueApp } from 'vue';

import { createScriptIdIframe, teleportStyle } from '../../util/script';
import App from './App.vue';

const MANAGER_IFRAME_SRCDOC =
  '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>*,*::before,*::after{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body></body></html>';

export type CreatorManagerOverlay = {
  open(): void;
  close(): void;
  setForceMobileLayout(value: boolean): void;
  destroy(): void;
};

export type CreatorManagerOverlayOptions = {
  forceMobileLayout?: boolean;
  worldbookName?: string;
  entryUid?: number;
};

type CreatorManagerController = {
  resetToInitialView(): void;
};

export function createCreatorManagerOverlay(
  options: CreatorManagerOverlayOptions = {},
): CreatorManagerOverlay {
  let mountedApp: VueApp<Element> | null = null;
  let $managerOverlay: JQuery<HTMLDivElement> | null = null;
  let $managerIframe: JQuery<HTMLIFrameElement> | null = null;
  let teleportedStyle: { destroy: () => void } | null = null;
  let managerViewportCleanup: (() => void) | null = null;
  let managerController: CreatorManagerController | null = null;
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

  const close = () => {
    managerViewportCleanup?.();
    $managerOverlay?.hide();
  };

  const destroy = () => {
    close();
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
        'data-char-info-creator-manager': '',
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
        title: '角色视觉编辑器',
        'aria-label': '角色视觉编辑器',
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
        if (!iframeDocument) throw new Error('无法建立角色视觉编辑界面。');

        teleportedStyle = teleportStyle(iframeDocument.head);
        const mountPoint = iframeDocument.createElement('div');
        mountPoint.id = 'char-info-creator-manager';
        iframeDocument.body.appendChild(mountPoint);

        mountedApp = createApp(App, {
          initialView: 'editor',
          initialWorldbookName: options.worldbookName,
          initialEntryUid: options.entryUid,
          onClose: close,
        });
        managerController = mountedApp.mount(mountPoint) as CreatorManagerController;
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
