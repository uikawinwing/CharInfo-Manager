import { createCreatorManagerOverlay } from './overlay';

const LIBRARY_BUTTON_NAME = '世界书角色库';
const RUNTIME_MANAGER_OWNER_KEY = '__charInfoWorldbookManagerOwner';
const manager = createCreatorManagerOverlay('library');

function getHostWindow(): Window {
  return window.parent !== window ? window.parent : window;
}

function isOwnedByRuntime(): boolean {
  return (getHostWindow() as Window & Record<string, unknown>)[RUNTIME_MANAGER_OWNER_KEY] === 'runtime';
}

$(() => {
  updateScriptButtonsWith(buttons =>
    buttons.filter(button => !['角色视觉编辑器', '角色视觉编辑', '角色资料库', 'CharInfo 设置'].includes(button.name)),
  );
  appendInexistentScriptButtons([{ name: LIBRARY_BUTTON_NAME, visible: true }]);
  const libraryButtonListener = eventOn(
    getButtonEvent(LIBRARY_BUTTON_NAME),
    errorCatched(() => {
      if (isOwnedByRuntime()) return;
      manager.open();
    }),
  );

  $(window).on('pagehide', () => {
    libraryButtonListener.stop();
    manager.close();
  });
});
