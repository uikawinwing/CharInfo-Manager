export const IMG_BED_ORIGIN = 'https://imgbed.uika.cc.cd';
export const IMG_BED_CONNECTION_TIMEOUT_MS = 12 * 60 * 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PROTOCOL = 'charinfo-imgbed-bridge';

// ImgBed file IDs and ComfyUI auto-export filenames are implementation details,
// not labels that help players recognize their gallery pictures.
export function displayImgbedMediaTitle(title: string, index: number): string {
  const name = title.trim();
  const stem = name.replace(/\.[a-z0-9]+$/iu, '');
  return !name || UUID.test(stem.toLowerCase()) || /^ComfyUI[_-]\d+[^/\\]*$/iu.test(name) ? `图片 ${index + 1}` : name;
}
const POLL_MS = 500;

export type ImgbedBridgeErrorCode = 'blocked' | 'closed' | 'cancelled' | 'timeout' | 'unsupported' | 'disposed';

export class ImgbedBridgeError extends Error {
  readonly code: ImgbedBridgeErrorCode;

  constructor(code: ImgbedBridgeErrorCode) {
    super(code);
    this.name = 'ImgbedBridgeError';
    this.code = code;
  }
}

export function canonicalImgbedGalleryUrl(albumId: string): string | null {
  const id = albumId.toLowerCase();
  return UUID.test(id) ? `${IMG_BED_ORIGIN}/api/public/album-gallery/${id}` : null;
}

export function parseImgbedGalleryUrl(value: string): string | null {
  const prefix = `${IMG_BED_ORIGIN}/api/public/album-gallery/`;
  if (!value.startsWith(prefix)) return null;
  const albumId = value.slice(prefix.length);
  return UUID.test(albumId) && canonicalImgbedGalleryUrl(albumId) === value ? albumId : null;
}

export function createImgbedBridge(hostWindow: Window) {
  let disposed = false;
  let cancelPending: ((reason: 'cancelled' | 'disposed') => void) | null = null;

  function select(albumId?: string): Promise<{ albumId: string; remoteGalleryUrl: string }> {
    if (disposed) return Promise.reject(new ImgbedBridgeError('disposed'));
    if (cancelPending || !hostWindow.crypto?.getRandomValues || hostWindow.location.origin === 'null') {
      return Promise.reject(new ImgbedBridgeError('unsupported'));
    }
    const normalizedId = albumId?.toLowerCase();
    if (normalizedId && !UUID.test(normalizedId)) return Promise.reject(new ImgbedBridgeError('unsupported'));

    const bytes = new Uint8Array(32);
    hostWindow.crypto.getRandomValues(bytes);
    const nonce = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const popupUrl = new URL('/account/', IMG_BED_ORIGIN);
    popupUrl.searchParams.set('view', 'albums');
    popupUrl.searchParams.set('bridge', 'charinfo');
    popupUrl.searchParams.set('bridge_version', '1');
    popupUrl.searchParams.set('bridge_nonce', nonce);
    popupUrl.searchParams.set('opener_origin', hostWindow.location.origin);
    if (normalizedId) popupUrl.searchParams.set('album', normalizedId);

    let popup: Window | null;
    try {
      popup = hostWindow.open(popupUrl.href, '_blank', 'popup,width=1000,height=800');
    } catch {
      return Promise.reject(new ImgbedBridgeError('unsupported'));
    }
    if (!popup) return Promise.reject(new ImgbedBridgeError('blocked'));

    return new Promise((resolve, reject) => {
      let ready = false;
      let settled = false;
      const finish = (error?: ImgbedBridgeErrorCode, result?: { albumId: string; remoteGalleryUrl: string }) => {
        if (settled) return;
        settled = true;
        hostWindow.removeEventListener('message', onMessage);
        hostWindow.clearInterval(interval);
        hostWindow.clearTimeout(timeout);
        cancelPending = null;
        if (error) reject(new ImgbedBridgeError(error));
        else resolve(result!);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.origin !== IMG_BED_ORIGIN || event.source !== popup) return;
        const data = event.data;
        if (
          !data ||
          typeof data !== 'object' ||
          Array.isArray(data) ||
          data.protocol !== PROTOCOL ||
          data.version !== 1 ||
          data.nonce !== nonce
        )
          return;
        if (data.type === 'bridge.ready') {
          ready = true;
        } else if (data.type === 'bridge.cancelled') {
          finish('cancelled');
        } else if (
          data.type === 'album.selected' &&
          ready &&
          typeof data.albumId === 'string' &&
          typeof data.remoteGalleryUrl === 'string'
        ) {
          const id = data.albumId;
          if (UUID.test(id) && canonicalImgbedGalleryUrl(id) === data.remoteGalleryUrl) {
            finish(undefined, { albumId: id, remoteGalleryUrl: data.remoteGalleryUrl });
          }
        }
      };
      const poll = () => {
        try {
          if (popup.closed) {
            finish('closed');
          } else if (!ready) {
            popup.postMessage({ protocol: PROTOCOL, version: 1, type: 'bridge.hello', nonce }, IMG_BED_ORIGIN);
          }
        } catch {
          finish('unsupported');
        }
      };
      cancelPending = reason => finish(reason);
      hostWindow.addEventListener('message', onMessage);
      const interval = hostWindow.setInterval(poll, POLL_MS);
      const timeout = hostWindow.setTimeout(() => finish('timeout'), IMG_BED_CONNECTION_TIMEOUT_MS);
      poll();
    });
  }

  return {
    select,
    cancel() {
      cancelPending?.('cancelled');
    },
    destroy() {
      disposed = true;
      cancelPending?.('disposed');
    },
  };
}
