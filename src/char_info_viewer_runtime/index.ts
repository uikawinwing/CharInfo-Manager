import { createCharInfoRuntime, type CharInfoRuntime } from './runtime';
import './mobileViewerScroll.css';

type CharInfoHostWindow = Window &
  typeof globalThis & {
    CHAR_INFO_VIEWER_RUNTIME?: CharInfoRuntime;
  };

function getHostWindow(): CharInfoHostWindow {
  try {
    return (window.parent && window.parent !== window ? window.parent : window) as CharInfoHostWindow;
  } catch {
    return window as CharInfoHostWindow;
  }
}

const hostWindow = getHostWindow();
let runtime: CharInfoRuntime | null = null;

$(() => {
  hostWindow.CHAR_INFO_VIEWER_RUNTIME?.stop({ restoreNativeMessages: false });
  const nextRuntime = createCharInfoRuntime();
  try {
    nextRuntime.start();
    runtime = nextRuntime;
    hostWindow.CHAR_INFO_VIEWER_RUNTIME = nextRuntime;
    console.info('[CharInfo Runtime] 已连接 SillyTavern 主聊天页面。');
  } catch (error) {
    nextRuntime.stop();
    console.error('[CharInfo Runtime] 启动失败：', error);
  }
});

$(window).on('pagehide', () => {
  runtime?.stop();
  if (hostWindow.CHAR_INFO_VIEWER_RUNTIME === runtime) {
    delete hostWindow.CHAR_INFO_VIEWER_RUNTIME;
  }
  runtime = null;
});
