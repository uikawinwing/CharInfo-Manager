import { createProfileEditorOverlay, type ProfileEditorOverlay, type ProfileEditorOverlayOptions } from './overlay';

let overlay: ProfileEditorOverlay | null = null;

export function openProfileEditor(options: ProfileEditorOverlayOptions = {}): void {
  closeProfileEditor();
  overlay = createProfileEditorOverlay(options);
  overlay.open();
}

export function closeProfileEditor(): void {
  overlay?.destroy();
  overlay = null;
}
