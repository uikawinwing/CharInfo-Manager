import { normalizePortraitMediaUrlForBrowser } from './imageUrl';

const MAX_CONCURRENT_PRELOADS = 4;
const PRELOAD_TIMEOUT_MS = 8000;

const warmedUrls = new Set<string>();
const inFlightPreloads = new Map<string, Promise<boolean>>();
const preloadQueue: Array<() => void> = [];
let activePreloadCount = 0;

function pumpPreloadQueue(): void {
  while (activePreloadCount < MAX_CONCURRENT_PRELOADS && preloadQueue.length > 0) {
    const start = preloadQueue.shift();
    if (!start) return;
    activePreloadCount += 1;
    start();
  }
}

function scheduleImagePreload(url: string): Promise<boolean> {
  if (warmedUrls.has(url)) return Promise.resolve(true);
  const existing = inFlightPreloads.get(url);
  if (existing) return existing;

  const preload = new Promise<boolean>(resolve => {
    preloadQueue.push(() => {
      if (typeof Image === 'undefined') {
        activePreloadCount -= 1;
        inFlightPreloads.delete(url);
        resolve(false);
        pumpPreloadQueue();
        return;
      }

      const image = new Image();
      image.decoding = 'async';
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        activePreloadCount -= 1;
        inFlightPreloads.delete(url);
        if (success) warmedUrls.add(url);
        resolve(success);
        pumpPreloadQueue();
      };

      timeout = setTimeout(() => finish(false), PRELOAD_TIMEOUT_MS);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = url;
    });
    pumpPreloadQueue();
  });

  inFlightPreloads.set(url, preload);
  return preload;
}

export async function preloadPortraitImages(urls: readonly string[]): Promise<void> {
  const imageUrls = urls
    .map(url => normalizePortraitMediaUrlForBrowser(url))
    .filter(media => media?.kind === 'image')
    .map(media => media!.url)
    .filter((url, index, list) => list.indexOf(url) === index);

  await Promise.all(imageUrls.map(url => scheduleImagePreload(url)));
}
