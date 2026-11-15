import { compareVersions, isStableVersion, type UpdateCache, type UpdateController } from './selfUpdate.ts';

export type ManagedRuntime = {
  start(): void;
  stop(options?: { restoreNativeMessages?: boolean }): void;
};

export type RuntimeRelease = {
  version: string | null;
  createRuntime(updates: UpdateController): ManagedRuntime;
  styles?: HTMLStyleElement[];
};

export function normalizeReleaseVersion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const version = `v${value.replace(/^v/i, '')}`;
  return isStableVersion(version) ? version : null;
}

export function selectRuntimeVersions(
  bundled: string | null,
  cache: UpdateCache,
  fallback: string | null,
  enabled: boolean,
): Array<string | null> {
  if (!bundled) return [null];
  let preferred = cache.lastWorkingVersion ?? bundled;
  if (enabled) {
    for (const version of [bundled, cache.latestVersion]) {
      if (version && compareVersions(version, preferred) > 0) preferred = version;
    }
  }
  return [...new Set([preferred, cache.lastWorkingVersion, fallback, bundled].filter(isStableVersion))];
}

export async function startRuntimeWithFallback(options: {
  initial: RuntimeRelease;
  versions: Array<string | null>;
  updates: UpdateController;
  load(version: string): Promise<RuntimeRelease>;
  beforeStart(release: RuntimeRelease): void;
  failed(version: string | null, error: unknown): void;
  stopped(): boolean;
}): Promise<{ runtime: ManagedRuntime; release: RuntimeRelease }> {
  const errors: unknown[] = [];
  for (const version of options.versions) {
    if (options.stopped()) throw new Error('角色管理库已卸载，取消更新启动。');
    let runtime: ManagedRuntime | null = null;
    try {
      const release = version === options.initial.version ? options.initial : await options.load(version!);
      if (options.stopped()) throw new Error('角色管理库已卸载，取消更新启动。');
      options.beforeStart(release);
      runtime = release.createRuntime(options.updates);
      runtime.start();
      return { runtime, release };
    } catch (error) {
      runtime?.stop();
      errors.push(error);
      options.failed(version, error);
    }
  }
  throw new AggregateError(errors, '角色管理库的可用版本均未能启动。');
}
