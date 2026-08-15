export const MEDIA_SOURCE_LOAD_TIMEOUT_MS = 10_000;

export function nextMediaSourceIndex(currentIndex: number, sourceCount: number): number | null {
  if (!Number.isInteger(currentIndex) || currentIndex < 0) return sourceCount > 0 ? 0 : null;
  const nextIndex = currentIndex + 1;
  return nextIndex < sourceCount ? nextIndex : null;
}

export type MediaSourceTimeout = {
  arm: () => void;
  clear: () => void;
  dispose: () => void;
};

export function createMediaSourceTimeout(
  onTimeout: () => void,
  timeoutMs = MEDIA_SOURCE_LOAD_TIMEOUT_MS,
): MediaSourceTimeout {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const clear = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  return {
    arm() {
      clear();
      if (disposed) return;
      timer = setTimeout(() => {
        timer = null;
        if (!disposed) onTimeout();
      }, Math.max(0, timeoutMs));
    },
    clear,
    dispose() {
      disposed = true;
      clear();
    },
  };
}
