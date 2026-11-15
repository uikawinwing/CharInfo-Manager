import {
  normalizeReleaseVersion,
  selectRuntimeVersions,
  startRuntimeWithFallback,
  type ManagedRuntime,
  type RuntimeRelease,
} from './releaseBootstrap.ts';
import { createUpdateController, compareVersions, type UpdateController } from './selfUpdate.ts';
import { readRuntimeSettings } from './runtimeSettings.ts';

type Bootstrap = {
  ready: Promise<void>;
  register(release: RuntimeRelease): void;
  stop(replacing?: boolean): void;
  resume(): void;
};
type ScriptWindow = Window &
  typeof globalThis & {
    __CHARINFO_BOOTSTRAP_V1__?: Bootstrap;
    __CHARINFO_LOADER_CONTEXT__?: { roots: string[]; defaultVersion: string; fallbackVersion: string | null };
  };
type HostWindow = Window &
  typeof globalThis & {
    CHAR_INFO_VIEWER_RUNTIME?: ManagedRuntime;
    __CHARINFO_ACTIVE_BOOTSTRAP__?: Bootstrap;
    __CHARINFO_STARTING_BOOTSTRAP__?: Bootstrap;
  };

export function registerRuntimeEntry(
  initial: RuntimeRelease,
  importModule: (url: string) => Promise<unknown> = url => import(/* webpackIgnore: true */ url),
) {
  const scope = window as ScriptWindow;
  const host = (window.parent ?? window) as HostWindow;
  // 被更新器导入的版本只注册工厂，避免新旧入口递归启动。
  if (scope.__CHARINFO_BOOTSTRAP_V1__) {
    scope.__CHARINFO_BOOTSTRAP_V1__.register(initial);
    return;
  }
  const releases = new Map<string | null, RuntimeRelease>();
  let pendingVersion: string | null = null;
  let stopped = false;
  let runtime: ManagedRuntime | null = null;
  let runningRelease: RuntimeRelease | null = null;
  let updates: UpdateController | null = null;
  let complete!: () => void;
  let fail!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    complete = resolve;
    fail = reject;
  });

  function register(release: RuntimeRelease) {
    if (releases.size && release.version !== pendingVersion) {
      throw new Error(`更新产物版本不匹配：需要 ${pendingVersion}，收到 ${release.version ?? '开发版'}。`);
    }
    const knownStyles = new Set([...releases.values()].flatMap(item => item.styles ?? []));
    release.styles = Array.from(document.head.querySelectorAll('style')).filter(style => !knownStyles.has(style));
    releases.set(release.version, release);
  }
  function activateStyles(release: RuntimeRelease) {
    for (const item of releases.values()) for (const style of item.styles ?? []) style.remove();
    for (const style of release.styles ?? []) document.head.append(style);
  }
  const bootstrap: Bootstrap = {
    ready,
    register,
    stop(replacing = false) {
      stopped = true;
      updates?.stop();
      runtime?.stop({ restoreNativeMessages: !replacing });
      if (host.CHAR_INFO_VIEWER_RUNTIME === runtime) delete host.CHAR_INFO_VIEWER_RUNTIME;
      if (host.__CHARINFO_ACTIVE_BOOTSTRAP__ === bootstrap) delete host.__CHARINFO_ACTIVE_BOOTSTRAP__;
      if (host.__CHARINFO_STARTING_BOOTSTRAP__ === bootstrap) delete host.__CHARINFO_STARTING_BOOTSTRAP__;
    },
    resume() {
      if (!runtime || !runningRelease) return;
      stopped = false;
      activateStyles(runningRelease);
      runtime.start();
      updates?.start();
      host.CHAR_INFO_VIEWER_RUNTIME = runtime;
      host.__CHARINFO_ACTIVE_BOOTSTRAP__ = bootstrap;
    },
  };
  scope.__CHARINFO_BOOTSTRAP_V1__ = bootstrap;
  register(initial);
  ready.catch(error => {
    if (stopped) return;
    console.error('[CharInfo Update] 启动失败：', error);
    toastr.error('角色管理库未能启动，请查看控制台中的具体错误。');
  });
  $(window).on('pagehide', () => bootstrap.stop());
  $(() => {
    void begin().then(complete, fail);
  });

  function readCharacterFallback(): unknown {
    const versions = getVariables({ type: 'character' }).资源版本;
    return versions && typeof versions === 'object' ? versions.角色管理库 : null;
  }
  function runtimeRoots(): string[] {
    const defaults = ['testingcf', 'cdn', 'fastly', 'gcore'].map(
      origin => `https://${origin}.jsdelivr.net/gh/uikawinwing/CharInfo-Manager@v{version}`,
    );
    const supplied = scope.__CHARINFO_LOADER_CONTEXT__?.roots;
    const roots = Array.isArray(supplied) ? supplied.filter(root => defaults.includes(root)) : defaults;
    return [...new Set([...roots, ...defaults])];
  }
  function recordLoadedVersion(version: string) {
    try {
      const context = scope.__CHARINFO_LOADER_CONTEXT__;
      scope.sessionStorage.setItem(
        'destiny:loaded:角色管理库',
        JSON.stringify({
          version: version.slice(1),
          defaultVersion: context?.defaultVersion ?? initial.version?.slice(1),
          ready: true,
        }),
      );
    } catch (error) {
      console.warn('[CharInfo Update] 无法保存本次运行版本：', error);
    }
  }
  async function begin() {
    host.__CHARINFO_STARTING_BOOTSTRAP__?.stop(true);
    host.__CHARINFO_STARTING_BOOTSTRAP__ = bootstrap;
    const storage = {
      getItem: (key: string) => host.localStorage.getItem(key),
      setItem: (key: string, value: string) => host.localStorage.setItem(key, value),
    };
    updates = createUpdateController({ storage });
    const settings = readRuntimeSettings(getVariables({ type: 'script' }));
    updates.setAutoUpdate(settings.autoUpdateEnabled);
    updates.setCurrentVersion(initial.version);
    const fallback = normalizeReleaseVersion(
      scope.__CHARINFO_LOADER_CONTEXT__?.fallbackVersion ?? readCharacterFallback(),
    );
    let previousBootstrap: Bootstrap | undefined;
    let previousRuntime: ManagedRuntime | undefined;
    const previousVersion = updates.getCache().lastWorkingVersion ?? initial.version;
    const versions = selectRuntimeVersions(initial.version, updates.getCache(), fallback, settings.autoUpdateEnabled);
    try {
      const started = await startRuntimeWithFallback({
        initial,
        versions,
        updates,
        load: loadRelease,
        stopped: () => stopped,
        beforeStart(release) {
          const activeBootstrap = host.__CHARINFO_ACTIVE_BOOTSTRAP__;
          const activeRuntime = host.CHAR_INFO_VIEWER_RUNTIME;
          if (activeBootstrap) previousBootstrap = activeBootstrap;
          if (activeRuntime) previousRuntime = activeRuntime;
          activeBootstrap?.stop(true);
          if (!activeBootstrap) activeRuntime?.stop({ restoreNativeMessages: false });
          activateStyles(release);
        },
        failed(version, error) {
          console.warn(`[CharInfo Update] ${version ?? '开发版'} 不可用，尝试备用版本：`, error);
        },
      });
      if (stopped) {
        started.runtime.stop();
        return;
      }
      runtime = started.runtime;
      runningRelease = started.release;
      host.CHAR_INFO_VIEWER_RUNTIME = runtime;
      host.__CHARINFO_ACTIVE_BOOTSTRAP__ = bootstrap;
      if (host.__CHARINFO_STARTING_BOOTSTRAP__ === bootstrap) delete host.__CHARINFO_STARTING_BOOTSTRAP__;
      if (started.release.version) {
        const updated = updates.markWorking(started.release.version, previousVersion);
        recordLoadedVersion(started.release.version);
        if (updated) toastr.success(`角色管理库已更新至 ${started.release.version}。`);
      }
      updates.start();
      console.info('[CharInfo Runtime] 已连接 SillyTavern 主聊天页面。', started.release.version ?? '开发版');
    } catch (error) {
      updates.stop();
      if (!stopped) {
        if (previousBootstrap) previousBootstrap.resume();
        else if (previousRuntime) {
          previousRuntime.start();
          host.CHAR_INFO_VIEWER_RUNTIME = previousRuntime;
        }
      }
      if (host.__CHARINFO_STARTING_BOOTSTRAP__ === bootstrap) delete host.__CHARINFO_STARTING_BOOTSTRAP__;
      throw error;
    }
  }
  async function loadRelease(version: string): Promise<RuntimeRelease> {
    if (compareVersions(version, 'v0.3.8') < 0) {
      throw new Error(`${version} 不支持启动确认，仅可作为外层 Loader 的网络故障备用版本。`);
    }
    const registered = releases.get(version);
    if (registered) return registered;
    const errors: unknown[] = [];
    for (const root of runtimeRoots()) {
      if (stopped) throw new Error('角色管理库已卸载。');
      const beforeStyles = new Set(document.head.querySelectorAll('style'));
      const beforeRuntime = host.CHAR_INFO_VIEWER_RUNTIME;
      pendingVersion = version;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const url = `${root.replace('{version}', version.slice(1))}/dist/char_info_viewer_runtime/index.js`;
        await Promise.race([
          importModule(url),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error(`${version} 下载超时。`)), 12000);
          }),
        ]);
        const release = releases.get(version);
        if (release) return release;
        throw new Error(`${version} 没有完成运行时注册或启动确认。`);
      } catch (error) {
        errors.push(error);
        for (const style of document.head.querySelectorAll('style')) if (!beforeStyles.has(style)) style.remove();
        const unexpectedRuntime = host.CHAR_INFO_VIEWER_RUNTIME;
        if (
          !stopped &&
          host.__CHARINFO_STARTING_BOOTSTRAP__ === bootstrap &&
          unexpectedRuntime &&
          unexpectedRuntime !== beforeRuntime
        )
          unexpectedRuntime.stop();
      } finally {
        clearTimeout(timeout);
        pendingVersion = null;
      }
    }
    throw new AggregateError(errors, `${version} 在全部 CDN 上加载失败。`);
  }
}
