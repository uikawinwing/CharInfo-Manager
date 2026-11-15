export const UPDATE_STORAGE_KEY = 'charinfo:stable-updates:v1';
export const UPDATE_CHECK_INTERVAL = 24 * 60 * 60_000;
export const UPDATE_FAILURE_BACKOFF = 5 * 60_000;

const CHECK_LEASE_KEY = `${UPDATE_STORAGE_KEY}:checking`;
const CHECK_LEASE_DURATION = 30_000;
const TAGS_URL = 'https://api.github.com/repos/uikawinwing/CharInfo-Manager/git/matching-refs/tags/v';
const STOPPED_CHECK = Symbol('stopped update check');

export type UpdateCache = {
  latestVersion: string | null;
  checkedAt: number;
  retryAt: number;
  lastWorkingVersion: string | null;
  notifiedVersion: string | null;
  autoUpdateEnabled: boolean;
};

export type UpdateView = {
  currentVersion: string | null;
  latestVersion: string | null;
  checking: boolean;
  lastCheckedAt: number | null;
  error: string;
};

export type UpdateController = {
  state: UpdateView;
  check(force?: boolean): Promise<void>;
  subscribe(listener: (state: UpdateView) => void): () => void;
  start(): void;
  stop(): void;
  setCurrentVersion(version: string | null): void;
  setAutoUpdate(enabled: boolean): void;
  markWorking(version: string, previousVersion?: string | null): boolean;
  getCache(): UpdateCache;
};

type UpdateStorage = Pick<Storage, 'getItem' | 'setItem'>;
type UpdateOptions = {
  storage: UpdateStorage;
  fetch?: typeof fetch;
  now?: () => number;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  locks?: Pick<LockManager, 'request'> | null;
  timeoutMs?: number;
};

export function isStableVersion(value: unknown): value is string {
  return typeof value === 'string' && /^v\d+\.\d+\.\d+$/.test(value);
}

export function compareVersions(a: string, b: string): number {
  const left = a.slice(1).split('.').map(BigInt);
  const right = b.slice(1).split('.').map(BigInt);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}

function emptyCache(): UpdateCache {
  return {
    latestVersion: null,
    checkedAt: 0,
    retryAt: 0,
    lastWorkingVersion: null,
    notifiedVersion: null,
    autoUpdateEnabled: true,
  };
}

export function readUpdateCache(storage: Pick<Storage, 'getItem'>): UpdateCache {
  const raw = storage.getItem(UPDATE_STORAGE_KEY);
  if (!raw) return emptyCache();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptyCache();
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyCache();
  const source = value as Record<string, unknown>;
  const timestamp = (entry: unknown) => (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0 ? entry : 0);
  return {
    latestVersion: isStableVersion(source.latestVersion) ? source.latestVersion : null,
    checkedAt: timestamp(source.checkedAt),
    retryAt: timestamp(source.retryAt),
    lastWorkingVersion: isStableVersion(source.lastWorkingVersion) ? source.lastWorkingVersion : null,
    notifiedVersion: isStableVersion(source.notifiedVersion) ? source.notifiedVersion : null,
    autoUpdateEnabled: typeof source.autoUpdateEnabled === 'boolean' ? source.autoUpdateEnabled : true,
  };
}

export function writeUpdateCache(storage: Pick<Storage, 'setItem'>, cache: UpdateCache): void {
  storage.setItem(UPDATE_STORAGE_KEY, JSON.stringify(cache));
}

export function createUpdateController(options: UpdateOptions): UpdateController {
  const now = options.now ?? Date.now;
  const request = options.fetch ?? globalThis.fetch.bind(globalThis);
  const later = options.setTimeout ?? setTimeout;
  const cancel = options.clearTimeout ?? clearTimeout;
  const locks = options.locks === undefined ? globalThis.navigator?.locks : options.locks;
  const listeners = new Set<(state: UpdateView) => void>();
  const owner = `${now()}:${Math.random()}`;
  let cache = emptyCache();
  let storageIssue = '';
  let started = false;
  let stopped = false;
  let dueTimer: ReturnType<typeof setTimeout> | undefined;
  let active: Promise<void> | undefined;
  let controller: AbortController | undefined;
  let checkAfter = 0;
  const state: UpdateView = {
    currentVersion: null,
    latestVersion: null,
    checking: false,
    lastCheckedAt: null,
    error: '',
  };

  function emit() {
    for (const listener of listeners) listener({ ...state });
  }

  function storageFailed(error: unknown) {
    if (!storageIssue) console.warn('[CharInfo Update] 无法保存更新记录：', error);
    storageIssue = '浏览器无法保存更新记录，本次结果仅在当前页面有效。';
  }

  function readCache() {
    if (storageIssue) return cache;
    try {
      cache = readUpdateCache(options.storage);
    } catch (error) {
      storageFailed(error);
    }
    state.latestVersion = cache.latestVersion;
    state.lastCheckedAt = cache.checkedAt || null;
    return cache;
  }

  function save(next: UpdateCache) {
    cache = next;
    try {
      writeUpdateCache(options.storage, cache);
    } catch (error) {
      storageFailed(error);
    }
    state.latestVersion = cache.latestVersion;
    state.lastCheckedAt = cache.checkedAt || null;
  }

  function schedule() {
    if (dueTimer !== undefined) cancel(dueTimer);
    dueTimer = undefined;
    if (!started) return;
    const next = Math.max(cache.retryAt, cache.checkedAt ? cache.checkedAt + UPDATE_CHECK_INTERVAL : 0, checkAfter);
    dueTimer = later(
      () => {
        dueTimer = undefined;
        void api.check();
      },
      Math.max(1000, next - now()),
    );
  }

  function canCheck(force: boolean) {
    readCache();
    if (cache.retryAt > now()) {
      if (force) state.error = '上次检查失败或请求受限，请稍后重试。';
      return false;
    }
    return force || !cache.checkedAt || now() - cache.checkedAt >= UPDATE_CHECK_INTERVAL;
  }

  async function query(force: boolean) {
    if (!canCheck(force) || stopped) return;
    const abort = new AbortController();
    controller = abort;
    const timeout = later(
      () => abort.abort(new Error('检查更新超时，请检查网络后重试。')),
      options.timeoutMs ?? 10_000,
    );
    let retryAt = now() + UPDATE_FAILURE_BACKOFF;
    try {
      const response = await request(TAGS_URL, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
        signal: abort.signal,
      });
      if (!response.ok) {
        const retry = response.headers.get('retry-after');
        const retryTime = retry && /^\d+$/.test(retry) ? now() + Number(retry) * 1000 : retry ? Date.parse(retry) : 0;
        const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
        if (Number.isFinite(retryTime)) retryAt = Math.max(retryAt, retryTime);
        if ((response.status === 403 || response.status === 429) && Number.isFinite(reset))
          retryAt = Math.max(retryAt, reset);
        throw new Error(
          response.status === 403 || response.status === 429
            ? 'GitHub 暂时限制了请求，请稍后检查更新。'
            : `检查更新失败（HTTP ${response.status}），请稍后重试。`,
        );
      }
      const refs: unknown = await response.json();
      if (!Array.isArray(refs)) throw new Error('GitHub 返回的版本列表格式不正确，请稍后重试。');
      let latestVersion: string | null = null;
      for (const entry of refs) {
        const ref = entry && typeof entry === 'object' && 'ref' in entry ? entry.ref : null;
        const version = typeof ref === 'string' && ref.startsWith('refs/tags/') ? ref.slice(10) : null;
        if (isStableVersion(version) && (!latestVersion || compareVersions(version, latestVersion) > 0))
          latestVersion = version;
      }
      if (stopped || abort.signal.aborted) return;
      save({ ...readCache(), latestVersion, checkedAt: now(), retryAt: 0 });
      state.error = storageIssue;
      checkAfter = 0;
    } catch (error) {
      if (stopped || abort.signal.reason === STOPPED_CHECK) return;
      save({ ...readCache(), retryAt });
      state.error = abort.signal.aborted
        ? '检查更新超时，请检查网络后重试。'
        : error instanceof TypeError
          ? '检查更新失败，请检查网络后重试。'
          : error instanceof Error
            ? error.message
            : '检查更新失败，请检查网络后重试。';
      console.warn('[CharInfo Update] 检查失败：', error);
    } finally {
      cancel(timeout);
      if (controller === abort) controller = undefined;
    }
  }

  async function withLease(force: boolean) {
    let held = false;
    try {
      const raw = options.storage.getItem(CHECK_LEASE_KEY);
      const lease = raw ? (JSON.parse(raw) as { owner?: string; expiresAt?: number }) : null;
      if (lease && typeof lease.expiresAt === 'number' && lease.expiresAt > now()) {
        checkAfter = lease.expiresAt;
        if (force) state.error = '另一个页面正在检查更新，请稍后重试。';
        return;
      }
      options.storage.setItem(CHECK_LEASE_KEY, JSON.stringify({ owner, expiresAt: now() + CHECK_LEASE_DURATION }));
      held = true;
    } catch (error) {
      storageFailed(error);
    }
    try {
      await Promise.resolve();
      if (held) {
        const lease = JSON.parse(options.storage.getItem(CHECK_LEASE_KEY) ?? 'null') as { owner?: string } | null;
        if (lease?.owner !== owner) {
          checkAfter = now() + CHECK_LEASE_DURATION;
          if (force) state.error = '另一个页面正在检查更新，请稍后重试。';
          return;
        }
      }
      await query(force);
    } finally {
      if (held) {
        try {
          const lease = JSON.parse(options.storage.getItem(CHECK_LEASE_KEY) ?? 'null') as { owner?: string } | null;
          if (lease?.owner === owner) options.storage.setItem(CHECK_LEASE_KEY, 'null');
        } catch (error) {
          storageFailed(error);
        }
      }
    }
  }

  readCache();
  state.error = storageIssue;
  const api: UpdateController = {
    state,
    check(force = false) {
      if (active) return active;
      stopped = false;
      if (!canCheck(force)) {
        emit();
        schedule();
        return Promise.resolve();
      }
      state.checking = true;
      state.error = '';
      emit();
      active = (async () => {
        if (locks) {
          await locks.request('charinfo:stable-update-check', { ifAvailable: true }, async lock => {
            if (lock) await query(force);
            else {
              checkAfter = now() + CHECK_LEASE_DURATION;
              if (force) state.error = '另一个页面正在检查更新，请稍后重试。';
            }
          });
        } else await withLease(force);
      })()
        .catch(error => {
          if (stopped) return;
          save({ ...readCache(), retryAt: now() + UPDATE_FAILURE_BACKOFF });
          state.error = error instanceof Error ? error.message : '检查更新失败，请稍后重试。';
          console.warn('[CharInfo Update] 检查失败：', error);
        })
        .finally(() => {
          active = undefined;
          state.checking = false;
          emit();
          schedule();
        });
      return active;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener({ ...state });
      return () => listeners.delete(listener);
    },
    start() {
      if (started) return;
      started = true;
      stopped = false;
      void api.check();
    },
    stop() {
      started = false;
      stopped = true;
      if (dueTimer !== undefined) cancel(dueTimer);
      dueTimer = undefined;
      controller?.abort(STOPPED_CHECK);
    },
    setCurrentVersion(version) {
      state.currentVersion = version;
      emit();
    },
    setAutoUpdate(enabled) {
      save({ ...readCache(), autoUpdateEnabled: enabled });
      if (storageIssue) state.error = storageIssue;
      emit();
    },
    markWorking(version, previousVersion) {
      const current = readCache();
      const previous = previousVersion ?? current.lastWorkingVersion;
      const notify =
        isStableVersion(previous) && compareVersions(version, previous) > 0 && current.notifiedVersion !== version;
      save({ ...current, lastWorkingVersion: version, notifiedVersion: notify ? version : current.notifiedVersion });
      state.currentVersion = version;
      if (storageIssue) state.error = storageIssue;
      emit();
      return notify;
    },
    getCache() {
      return { ...readCache() };
    },
  };
  return api;
}
