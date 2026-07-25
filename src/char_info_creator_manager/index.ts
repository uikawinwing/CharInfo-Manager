import { createApp, type App as VueApp } from 'vue';

import { createScriptIdIframe, teleportStyle } from '../../util/script';
import App from './App.vue';

const BUTTON_NAME = '角色图片管理';
const MANAGER_IFRAME_SRCDOC =
  '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>*,*::before,*::after{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;padding:0;overflow:hidden}</style></head><body></body></html>';

let mountedApp: VueApp<Element> | null = null;
let $managerOverlay: JQuery<HTMLDivElement> | null = null;
let $managerIframe: JQuery<HTMLIFrameElement> | null = null;
let teleportedStyle: { destroy: () => void } | null = null;
let managerViewportCleanup: (() => void) | null = null;

function getHostWindow(): Window {
  return window.parent !== window ? window.parent : window;
}

function syncManagerOverlayViewport() {
  if (!$managerOverlay) return;

  const hostWindow = getHostWindow();
  const viewport = hostWindow.visualViewport;
  $managerOverlay.css({
    left: `${(viewport?.offsetLeft ?? 0) + hostWindow.scrollX}px`,
    top: `${(viewport?.offsetTop ?? 0) + hostWindow.scrollY}px`,
    width: `${viewport?.width ?? hostWindow.innerWidth}px`,
    height: `${viewport?.height ?? hostWindow.innerHeight}px`,
  });
}

function startManagerViewportSync() {
  managerViewportCleanup?.();
  const hostWindow = getHostWindow();
  const viewport = hostWindow.visualViewport;
  hostWindow.addEventListener('resize', syncManagerOverlayViewport);
  hostWindow.addEventListener('scroll', syncManagerOverlayViewport);
  viewport?.addEventListener('resize', syncManagerOverlayViewport);
  viewport?.addEventListener('scroll', syncManagerOverlayViewport);
  syncManagerOverlayViewport();

  managerViewportCleanup = () => {
    hostWindow.removeEventListener('resize', syncManagerOverlayViewport);
    hostWindow.removeEventListener('scroll', syncManagerOverlayViewport);
    viewport?.removeEventListener('resize', syncManagerOverlayViewport);
    viewport?.removeEventListener('scroll', syncManagerOverlayViewport);
    managerViewportCleanup = null;
  };
}

function closeManager() {
  managerViewportCleanup?.();
  mountedApp?.unmount();
  mountedApp = null;
  teleportedStyle?.destroy();
  teleportedStyle = null;
  $managerOverlay?.remove();
  $managerOverlay = null;
  $managerIframe = null;
}

function openManager() {
  if ($managerOverlay) return;

  const hostWindow = getHostWindow();
  const hostDocument = hostWindow.document;
  const host$ = (hostWindow as Window & { $: JQueryStatic }).$;
  const $overlay = host$('<div>')
    .attr({
      'data-char-info-creator-manager': '',
      role: 'presentation',
    })
    .css({
      position: 'absolute',
      overflow: 'hidden',
      border: '0',
      background: 'transparent',
      zIndex: '2147483000',
    }) as JQuery<HTMLDivElement>;
  const $iframe = createScriptIdIframe()
    .attr({
      title: '角色图片管理',
      'aria-label': '角色图片管理',
      srcdoc: MANAGER_IFRAME_SRCDOC,
    })
    .css({
      display: 'block',
      width: '100%',
      height: '100%',
      border: '0',
      background: 'transparent',
    })
    .on('load', () => {
      const iframe = $iframe[0];
      const iframeDocument = iframe.contentDocument;
      if (!iframeDocument) throw new Error('无法建立角色图片管理界面。');

      teleportedStyle = teleportStyle(iframeDocument.head);
      const mountPoint = iframeDocument.createElement('div');
      mountPoint.id = 'char-info-creator-manager';
      iframeDocument.body.appendChild(mountPoint);

      mountedApp = createApp(App, { onClose: closeManager });
      mountedApp.mount(mountPoint);
    });

  $overlay.append($iframe).appendTo(hostDocument.body);
  $managerOverlay = $overlay;
  $managerIframe = $iframe;
  startManagerViewportSync();
}

$(() => {
  appendInexistentScriptButtons([{ name: BUTTON_NAME, visible: true }]);
  const buttonListener = eventOn(getButtonEvent(BUTTON_NAME), errorCatched(openManager));

  $(window).on('pagehide', () => {
    buttonListener.stop();
    closeManager();
  });
});
