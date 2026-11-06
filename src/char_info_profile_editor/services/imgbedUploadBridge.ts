import { canonicalImgbedGalleryUrl, IMG_BED_ORIGIN } from '@/char_info_profile_editor/services/imgbedBridge';

export const IMG_BED_UPLOAD_PROTOCOL = 'charinfo-imgbed-upload';
export const IMG_BED_UPLOAD_READY_TIMEOUT_MS = 15_000;
export const IMG_BED_UPLOAD_OPERATION_TIMEOUT_MS = 12 * 60_000;
export const IMG_BED_UPLOAD_CHARACTER_NAME_MAX_LENGTH = 80;
export const IMG_BED_UPLOAD_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
];
const ID = /^[a-zA-Z0-9_-]{1,128}$/;

export type ImgbedUploadState = {
  status: 'idle' | 'loading' | 'required' | 'connecting' | 'connected' | 'error';
  accountName?: string;
  accountId?: string;
  message?: string;
};
export type ImgbedGalleryItem = { id: string; title: string; url: string; kind: 'image' | 'video' };
export type ImgbedGallery = { albumId: string; characterName: string; items: ImgbedGalleryItem[] };
export type ImgbedUploadInput = {
  requestId: string;
  albumId: string | null;
  characterName: string;
  files: { id: string; file: File; title: string }[];
  order: ({ itemId: string } | { uploadId: string })[];
};
export type ImgbedUploadProgress = {
  completed: number;
  total: number;
  fileId?: string;
  phase: 'uploading' | 'saving';
};
export type ImgbedUploadResult = ImgbedGallery & { remoteGalleryUrl: string };
type ErrorCode =
  | 'unavailable'
  | 'login_unavailable'
  | 'timeout'
  | 'required'
  | 'invalid'
  | 'busy'
  | 'disposed'
  | 'cancelled'
  | 'denied'
  | 'revocation_failed'
  | 'failed'
  | 'rejected';
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  unavailable: 'ImgBed 尚未提供上传连接，或浏览器阻止了连接。草稿和所选文件已保留。',
  login_unavailable: '无法加载 ImgBed 登录入口。请检查网络，并确认图床已部署配套上传版本；草稿和所选文件已保留。',
  timeout: 'ImgBed 操作超时。草稿和所选文件已保留，请重试同一操作。',
  required: '请先连接 ImgBed；登录失效时可重新连接，草稿和所选文件会保留。',
  invalid: '图库身份或保存内容不符合要求，未保存角色档案。',
  busy: 'ImgBed 正在处理上一次操作，请等待完成或取消。',
  disposed: '编辑器已关闭。',
  cancelled: '已停止等待 ImgBed。所选文件已保留，重试会核对原操作的结果。',
  denied: '已拒绝 ImgBed 连接。草稿和所选文件已保留，可重新连接。',
  revocation_failed: '尚未确认撤销 ImgBed 授权。请在授权窗口取消，或重新连接后主动断开；草稿和所选文件已保留。',
  failed: 'ImgBed 操作失败。草稿和所选文件已保留，请重试。',
  rejected: '文件或配额未通过检查，本次尚未开始上传。请检查文件及可用空间。',
};

export class ImgbedUploadError extends Error {
  readonly code: ErrorCode;
  readonly fileId?: string;

  constructor(code: ErrorCode, fileId?: string) {
    super(ERROR_MESSAGES[code]);
    this.name = 'ImgbedUploadError';
    this.code = code;
    this.fileId = fileId;
  }
}

export function createImgbedUploadId(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, fields: string[]): boolean {
  return Object.keys(value).every(key => fields.includes(key));
}

function validAlbumId(value: string): boolean {
  return canonicalImgbedGalleryUrl(value)?.endsWith(`/${value}`) === true;
}

function validItems(value: unknown): value is ImgbedGalleryItem[] {
  if (!Array.isArray(value) || value.length > 500) return false;
  const ids = new Set<string>();
  return value.every(item => {
    if (!record(item) || !exact(item, ['id', 'title', 'url', 'kind'])) return false;
    if (typeof item.id !== 'string' || !ID.test(item.id) || ids.has(item.id)) return false;
    if (typeof item.title !== 'string' || item.title.length > 500 || (item.kind !== 'image' && item.kind !== 'video'))
      return false;
    if (typeof item.url !== 'string') return false;
    try {
      const url = new URL(item.url);
      if (url.protocol !== 'https:' || url.username || url.password) return false;
    } catch {
      return false;
    }
    ids.add(item.id);
    return true;
  });
}

// Use the actual script window: postMessage records its execution realm as event.source.
// A srcdoc script inherits ST's origin although its own location.origin is "null".
export function createImgbedUploadBridge(hostWindow: Window, parentOrigin = hostWindow.location.origin) {
  let state: ImgbedUploadState = { status: 'idle' };
  let sessionId: string | null = null;
  let accountId: string | null = null;
  const requestAccounts = new Map<string, string>();
  let disposed = false;
  let frame: HTMLIFrameElement | null = null;
  let connectionId = '';
  let ready = false;
  let readyPromise: Promise<void> | null = null;
  let finishReady: ((error?: ImgbedUploadError) => void) | null = null;
  let launcher: HTMLIFrameElement | null = null;
  let launcherParent: Window | null = null;
  let launcherTimer: number | undefined;
  let launcherReadyTimer: number | undefined;
  let finishLauncher: ((error?: ImgbedUploadError) => void) | null = null;
  let readyTimer: number | undefined;
  let helloTimer: number | undefined;
  const subscribers = new Set<(value: ImgbedUploadState) => void>();
  type Pending = {
    id: string;
    type: string;
    characterName?: string;
    albumId?: string | null;
    sessionId: string | null;
    fileIds?: Set<string>;
    total?: number;
    itemCount?: number;
    progress?: (progress: ImgbedUploadProgress) => void;
    resolve: (value: unknown) => void;
    reject: (error: ImgbedUploadError) => void;
    timer: number;
    cancelError?: ImgbedUploadError;
  };
  let pending: Pending | null = null;

  function setState(value: ImgbedUploadState) {
    state = value;
    for (const subscriber of subscribers) subscriber({ ...state });
  }
  function send(type: string, fields: Record<string, unknown> = {}) {
    frame?.contentWindow?.postMessage(
      { protocol: IMG_BED_UPLOAD_PROTOCOL, version: 1, connectionId, type, ...fields },
      IMG_BED_ORIGIN,
    );
  }
  function settle(error?: ImgbedUploadError, value?: unknown) {
    const operation = pending;
    if (!operation) return;
    pending = null;
    hostWindow.clearTimeout(operation.timer);
    if (error) operation.reject(error);
    else operation.resolve(value);
  }
  function cancelAuthorization(error: ImgbedUploadError) {
    if (!pending || pending.type !== 'auth.connect' || pending.cancelError) return;
    pending.cancelError = error;
    hostWindow.clearTimeout(pending.timer);
    pending.timer = hostWindow.setTimeout(() => {
      const failure = new ImgbedUploadError('revocation_failed');
      setState({ status: 'error', message: failure.message });
      settle(failure);
    }, IMG_BED_UPLOAD_READY_TIMEOUT_MS);
    setState({ status: 'connecting', message: '正在确认取消 ImgBed 授权…' });
    send('bridge.cancel', { requestId: pending.id });
  }
  function onLauncherMessage(event: MessageEvent) {
    if (!disposed && launcher && event.source === launcher.contentWindow && event.origin === IMG_BED_ORIGIN) {
      const data: unknown = event.data;
      if (
        record(data) &&
        exact(data, ['protocol', 'version', 'connectionId', 'type']) &&
        data.protocol === IMG_BED_UPLOAD_PROTOCOL &&
        data.version === 1 &&
        data.connectionId === connectionId &&
        data.type === 'launcher.ready'
      ) {
        launcher.style.visibility = 'visible';
        finishLauncher?.();
      }
      return;
    }
  }
  function onMessage(event: MessageEvent) {
    if (disposed || !frame || event.source !== frame.contentWindow || event.origin !== IMG_BED_ORIGIN) return;
    const data: unknown = event.data;
    if (
      !record(data) ||
      data.protocol !== IMG_BED_UPLOAD_PROTOCOL ||
      data.version !== 1 ||
      data.connectionId !== connectionId
    )
      return;
    const envelope = ['protocol', 'version', 'connectionId', 'type'];
    if (data.type === 'bridge.ready' && exact(data, envelope)) {
      ready = true;
      finishReady?.();
      return;
    }
    const operation = pending;
    if (!ready || !operation || data.requestId !== operation.id) return;
    const fields = [...envelope, 'requestId'];
    if (data.type === 'auth.cancelled' && operation.type === 'auth.connect' && exact(data, fields)) {
      setState({ status: 'required' });
      settle(operation.cancelError ?? new ImgbedUploadError('timeout'));
      return;
    }
    if (operation.cancelError && data.type !== 'auth.failed') return;
    if (data.type === 'auth.required' && exact(data, fields)) {
      sessionId = null;
      setState({ status: 'required' });
      settle(
        operation.type === 'auth.status' || operation.type === 'auth.disconnect'
          ? undefined
          : new ImgbedUploadError('required'),
      );
    } else if (
      data.type === 'auth.connected' &&
      exact(data, [...fields, 'sessionId', 'accountName', 'accountId']) &&
      (operation.type === 'auth.status' || operation.type === 'auth.connect') &&
      typeof data.sessionId === 'string' &&
      ID.test(data.sessionId) &&
      typeof data.accountName === 'string' &&
      data.accountName.length <= 100 &&
      typeof data.accountId === 'string' &&
      ID.test(data.accountId)
    ) {
      sessionId = data.sessionId;
      accountId = data.accountId;
      setState({ status: 'connected', accountName: data.accountName, accountId });
      settle();
    } else if (data.type === 'auth.failed' && exact(data, [...fields, 'code']) && typeof data.code === 'string') {
      const error = new ImgbedUploadError(
        operation.cancelError || data.code === 'REVOCATION_FAILED'
          ? 'revocation_failed'
          : data.code === 'AUTH_DENIED'
            ? 'denied'
            : 'failed',
      );
      if (operation.type !== 'auth.disconnect') {
        sessionId = null;
        setState({ status: 'error', message: error.message });
      }
      settle(error);
    } else if (
      data.type === 'gallery.error' &&
      exact(data, [...fields, 'sessionId', 'code', 'fileId']) &&
      data.sessionId === operation.sessionId &&
      typeof data.code === 'string' &&
      (data.fileId === undefined || (typeof data.fileId === 'string' && operation.fileIds?.has(data.fileId)))
    ) {
      settle(
        new ImgbedUploadError(
          data.code === 'AUTH_REQUIRED' ? 'required' : data.code === 'INPUT_REJECTED' ? 'rejected' : 'failed',
          data.fileId as string | undefined,
        ),
      );
      if (data.code === 'AUTH_REQUIRED') {
        sessionId = null;
        setState({ status: 'required' });
      }
    } else if (
      data.type === 'gallery.progress' &&
      operation.type === 'gallery.save' &&
      exact(data, [...fields, 'sessionId', 'completed', 'total', 'fileId', 'phase']) &&
      data.sessionId === operation.sessionId &&
      Number.isInteger(data.completed) &&
      Number.isInteger(data.total) &&
      data.total === operation.total &&
      (data.completed as number) >= 0 &&
      (data.completed as number) <= (data.total as number) &&
      (data.phase === 'uploading' || data.phase === 'saving') &&
      (data.fileId === undefined || (typeof data.fileId === 'string' && operation.fileIds?.has(data.fileId)))
    ) {
      operation.progress?.({
        completed: data.completed as number,
        total: data.total as number,
        phase: data.phase,
        ...(data.fileId ? { fileId: data.fileId as string } : {}),
      });
    } else if (
      (data.type === 'gallery.loaded' && operation.type === 'gallery.read') ||
      (data.type === 'gallery.saved' && operation.type === 'gallery.save')
    ) {
      const saved = data.type === 'gallery.saved';
      if (
        !exact(data, [
          ...fields,
          'sessionId',
          'albumId',
          'characterName',
          'items',
          ...(saved ? ['remoteGalleryUrl'] : []),
        ]) ||
        data.sessionId !== operation.sessionId ||
        typeof data.albumId !== 'string' ||
        !validAlbumId(data.albumId) ||
        (operation.albumId && data.albumId !== operation.albumId) ||
        data.characterName !== operation.characterName ||
        !validItems(data.items) ||
        (saved && data.items.length !== operation.itemCount) ||
        (saved && data.remoteGalleryUrl !== canonicalImgbedGalleryUrl(data.albumId))
      ) {
        settle(new ImgbedUploadError('invalid'));
        return;
      }
      settle(undefined, {
        albumId: data.albumId,
        characterName: data.characterName,
        items: data.items,
        ...(saved ? { remoteGalleryUrl: data.remoteGalleryUrl } : {}),
      });
    }
  }

  function removeFrame() {
    hostWindow.clearInterval(helloTimer);
    hostWindow.clearTimeout(readyTimer);
    frame?.remove();
    frame = null;
    ready = false;
    readyPromise = null;
    finishReady = null;
    sessionId = null;
  }
  function removeLauncher() {
    hostWindow.clearInterval(launcherTimer);
    hostWindow.clearTimeout(launcherReadyTimer);
    launcherTimer = undefined;
    launcherParent?.removeEventListener('message', onLauncherMessage);
    launcherParent = null;
    launcher?.remove();
    launcher = null;
  }
  function showLauncher(container: HTMLElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const parentWindow = container.ownerDocument.defaultView;
      if (!parentWindow) throw new ImgbedUploadError('unavailable');
      launcherParent = parentWindow;
      launcherParent.addEventListener('message', onLauncherMessage);
      // Execute only this fixed public hello in the visible parent's realm, so
      // postMessage's browser-provided event.source is the launcher's real parent.
      const helloFromParent = (parentWindow as Window & typeof globalThis).Function(
        'target',
        'message',
        'origin',
        'target.postMessage(message, origin);',
      ) as (target: Window, message: Record<string, unknown>, origin: string) => void;
      const url = new URL('/charinfo-upload/launcher', IMG_BED_ORIGIN);
      url.searchParams.set('parent_origin', parentOrigin);
      url.searchParams.set('connection_id', connectionId);
      launcher = container.ownerDocument.createElement('iframe');
      launcher.title = '连接 ImgBed';
      launcher.setAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
      );
      launcher.referrerPolicy = 'no-referrer';
      launcher.style.width = '100%';
      launcher.style.height = '112px';
      launcher.style.border = '0';
      launcher.style.display = 'block';
      launcher.style.visibility = 'hidden';
      launcher.src = url.href;
      const hello = () => {
        if (launcher?.contentWindow)
          helloFromParent(
            launcher.contentWindow,
            { protocol: IMG_BED_UPLOAD_PROTOCOL, version: 1, connectionId, type: 'bridge.hello' },
            IMG_BED_ORIGIN,
          );
      };
      launcher.addEventListener('load', () => {
        hostWindow.clearInterval(launcherTimer);
        launcherTimer = hostWindow.setInterval(hello, 500);
        hello();
      });
      finishLauncher = error => {
        hostWindow.clearTimeout(launcherReadyTimer);
        finishLauncher = null;
        if (error) reject(error);
        else resolve();
      };
      launcherReadyTimer = hostWindow.setTimeout(
        () => finishLauncher?.(new ImgbedUploadError('login_unavailable')),
        IMG_BED_UPLOAD_READY_TIMEOUT_MS,
      );
      container.appendChild(launcher);
    });
  }
  function ensureFrame(): Promise<void> {
    if (disposed) return Promise.reject(new ImgbedUploadError('disposed'));
    if (readyPromise) return readyPromise;
    if (
      !/^https?:\/\//.test(parentOrigin) ||
      new URL(parentOrigin).origin !== parentOrigin ||
      !hostWindow.crypto?.getRandomValues
    ) {
      return Promise.reject(new ImgbedUploadError('unavailable'));
    }
    const bytes = new Uint8Array(24);
    hostWindow.crypto.getRandomValues(bytes);
    connectionId = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const url = new URL('/charinfo-upload/', IMG_BED_ORIGIN);
    url.searchParams.set('parent_origin', parentOrigin);
    url.searchParams.set('connection_id', connectionId);
    frame = hostWindow.document.createElement('iframe');
    frame.title = 'ImgBed 上传连接';
    frame.hidden = true;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.referrerPolicy = 'no-referrer';
    frame.src = url.href;
    setState({ status: 'loading' });
    readyPromise = new Promise<void>((resolve, reject) => {
      finishReady = error => {
        hostWindow.clearInterval(helloTimer);
        hostWindow.clearTimeout(readyTimer);
        finishReady = null;
        if (error) {
          removeFrame();
          setState({ status: 'error', message: error.message });
          reject(error);
        } else resolve();
      };
      readyTimer = hostWindow.setTimeout(
        () => finishReady?.(new ImgbedUploadError('unavailable')),
        IMG_BED_UPLOAD_READY_TIMEOUT_MS,
      );
    });
    frame.addEventListener('load', () => {
      hostWindow.clearInterval(helloTimer);
      if (!ready) helloTimer = hostWindow.setInterval(() => send('bridge.hello'), 500);
      send('bridge.hello');
    });
    hostWindow.document.body.appendChild(frame);
    return readyPromise;
  }

  async function request(
    type: string,
    fields: Record<string, unknown> = {},
    progress?: Pending['progress'],
  ): Promise<unknown> {
    if (pending) throw new ImgbedUploadError('busy');
    await ensureFrame();
    if (disposed) throw new ImgbedUploadError('disposed');
    if (pending) throw new ImgbedUploadError('busy');
    if (type.startsWith('gallery.') && !sessionId) throw new ImgbedUploadError('required');
    const requestId = typeof fields.requestId === 'string' ? fields.requestId : createImgbedUploadId();
    return new Promise((resolve, reject) => {
      pending = {
        id: requestId,
        type,
        sessionId,
        resolve,
        reject,
        progress,
        ...(typeof fields.characterName === 'string' ? { characterName: fields.characterName } : {}),
        ...(fields.albumId !== undefined ? { albumId: fields.albumId as string | null } : {}),
        ...(Array.isArray(fields.files)
          ? { fileIds: new Set(fields.files.map(file => file.id)), total: fields.files.length }
          : {}),
        ...(Array.isArray(fields.order) ? { itemCount: fields.order.length } : {}),
        timer: hostWindow.setTimeout(() => {
          const error = new ImgbedUploadError('timeout');
          if (type === 'auth.connect') {
            cancelAuthorization(error);
            return;
          }
          if (type.startsWith('auth.') && type !== 'auth.disconnect')
            setState({ status: 'error', message: error.message });
          settle(error);
        }, IMG_BED_UPLOAD_OPERATION_TIMEOUT_MS),
      };
      try {
        send(type, { ...fields, requestId, ...(sessionId ? { sessionId } : {}) });
      } catch {
        settle(new ImgbedUploadError('failed'));
      }
    });
  }
  const onFocus = () => {
    if (pending?.type === 'auth.connect') send('auth.resume', { requestId: pending.id });
  };
  hostWindow.addEventListener('message', onMessage);
  hostWindow.addEventListener('focus', onFocus);

  async function verifyAuthorization(expectedAccountId: string) {
    await request('auth.status');
    if (!sessionId || !accountId || state.status !== 'connected') throw new ImgbedUploadError('required');
    if (accountId !== expectedAccountId) throw new ImgbedUploadError('invalid');
  }

  return {
    getState: () => ({ ...state }),
    subscribe(callback: (value: ImgbedUploadState) => void) {
      subscribers.add(callback);
      callback({ ...state });
      return () => {
        subscribers.delete(callback);
      };
    },
    async status() {
      await request('auth.status');
    },
    async connect(container: HTMLElement) {
      if (disposed) throw new ImgbedUploadError('disposed');
      if (pending) throw new ImgbedUploadError('busy');
      if (state.status === 'connected') return;
      try {
        await ensureFrame();
        setState({ status: 'connecting', message: '正在准备 ImgBed 登录入口…' });
        await showLauncher(container);
        setState({ status: 'connecting' });
        await request('auth.connect');
      } catch (error) {
        if (state.status === 'connecting') setState({ status: 'error', message: (error as Error).message });
        removeFrame();
        throw error;
      } finally {
        removeLauncher();
      }
    },
    async disconnect() {
      await request('auth.disconnect');
      sessionId = null;
      accountId = null;
      setState({ status: 'required' });
    },
    async readGallery(albumId: string, characterName: string): Promise<ImgbedGallery> {
      if (
        !validAlbumId(albumId) ||
        !characterName.trim() ||
        characterName.trim().length > IMG_BED_UPLOAD_CHARACTER_NAME_MAX_LENGTH
      )
        throw new ImgbedUploadError('invalid');
      if (!accountId || !sessionId) throw new ImgbedUploadError('required');
      const expectedAccountId = accountId;
      await verifyAuthorization(expectedAccountId);
      return (await request('gallery.read', { albumId, characterName: characterName.trim() })) as ImgbedGallery;
    },
    async save(
      input: ImgbedUploadInput,
      progress?: (value: ImgbedUploadProgress) => void,
    ): Promise<ImgbedUploadResult> {
      if (!accountId || !sessionId) throw new ImgbedUploadError('required');
      if (requestAccounts.has(input.requestId) && requestAccounts.get(input.requestId) !== accountId)
        throw new ImgbedUploadError('invalid');
      const uploadIds = new Set(input.files.map(file => file.id));
      const orderIds = input.order.map(item => ('itemId' in item ? `item:${item.itemId}` : `upload:${item.uploadId}`));
      if (
        !ID.test(input.requestId) ||
        !input.characterName.trim() ||
        input.characterName.trim().length > IMG_BED_UPLOAD_CHARACTER_NAME_MAX_LENGTH ||
        (input.albumId !== null && !validAlbumId(input.albumId)) ||
        input.files.length > 100 ||
        input.order.length > 500 ||
        uploadIds.size !== input.files.length ||
        new Set(orderIds).size !== orderIds.length ||
        input.files.some(
          item =>
            !ID.test(item.id) ||
            typeof item.title !== 'string' ||
            item.title.length > 500 ||
            Object.prototype.toString.call(item.file) !== '[object File]' ||
            item.file.size === 0,
        ) ||
        input.order.some(item =>
          'itemId' in item ? !ID.test(item.itemId) || !input.albumId : !uploadIds.has(item.uploadId),
        ) ||
        input.files.some(file => !input.order.some(item => 'uploadId' in item && item.uploadId === file.id))
      )
        throw new ImgbedUploadError('invalid');
      const expectedAccountId = accountId;
      requestAccounts.set(input.requestId, expectedAccountId);
      await verifyAuthorization(expectedAccountId);
      // We only know that the authenticated request is starting; byte progress is not available.
      progress?.({ completed: 0, total: input.files.length, phase: input.files.length ? 'uploading' : 'saving' });
      return (await request(
        'gallery.save',
        { ...input, characterName: input.characterName.trim() },
        progress,
      )) as ImgbedUploadResult;
    },
    cancel() {
      finishLauncher?.(new ImgbedUploadError('cancelled'));
      if (pending?.type === 'auth.connect') {
        cancelAuthorization(new ImgbedUploadError('cancelled'));
        return;
      }
      if (pending) send('bridge.cancel', { requestId: pending.id });
      settle(new ImgbedUploadError('cancelled'));
      finishReady?.(new ImgbedUploadError('cancelled'));
      if (state.status === 'connecting' || state.status === 'loading') setState({ status: 'required' });
    },
    destroy() {
      if (disposed) return;
      if (pending) send('bridge.cancel', { requestId: pending.id });
      disposed = true;
      finishLauncher?.(new ImgbedUploadError('disposed'));
      settle(new ImgbedUploadError('disposed'));
      finishReady?.(new ImgbedUploadError('disposed'));
      removeFrame();
      removeLauncher();
      hostWindow.removeEventListener('message', onMessage);
      hostWindow.removeEventListener('focus', onFocus);
      subscribers.clear();
    },
  };
}

export type ImgbedUploadBridge = ReturnType<typeof createImgbedUploadBridge>;
