import { createCreatorManagerOverlay, type CreatorManagerOverlay, type CreatorManagerOverlayOptions } from './overlay';

let overlay: CreatorManagerOverlay | null = null;

export function openCreatorManager(options: CreatorManagerOverlayOptions = {}): void {
  closeCreatorManager();
  overlay = createCreatorManagerOverlay(options);
  overlay.open();
}

export function closeCreatorManager(): void {
  overlay?.destroy();
  overlay = null;
}
