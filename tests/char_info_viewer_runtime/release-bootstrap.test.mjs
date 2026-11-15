import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeReleaseVersion,
  selectRuntimeVersions,
  startRuntimeWithFallback,
} from '../../src/char_info_viewer_runtime/releaseBootstrap.ts';
import { createUpdateController } from '../../src/char_info_viewer_runtime/selfUpdate.ts';

const cache = (overrides = {}) => ({
  latestVersion: null,
  checkedAt: 0,
  retryAt: 0,
  lastWorkingVersion: null,
  notifiedVersion: null,
  autoUpdateEnabled: true,
  ...overrides,
});
const updates = () => createUpdateController({ storage: { getItem: () => null, setItem: () => {} } });

test('缓存正式新版优先，角色变量中的旧版本只作备用', () => {
  assert.deepEqual(
    selectRuntimeVersions('v0.3.8', cache({ latestVersion: 'v0.3.10', lastWorkingVersion: 'v0.3.9' }), 'v0.3.7', true),
    ['v0.3.10', 'v0.3.9', 'v0.3.7', 'v0.3.8'],
  );
  assert.deepEqual(selectRuntimeVersions('v0.3.8', cache({ latestVersion: 'v0.3.7' }), 'v0.3.7', true), [
    'v0.3.8',
    'v0.3.7',
  ]);
  assert.equal(normalizeReleaseVersion('0.3.7'), 'v0.3.7');
  assert.equal(normalizeReleaseVersion('v0.3.9-preview'), null);
});

test('关闭自动更新保留已成功运行版本，不选择新候选；开发入口始终留在开发版', () => {
  assert.deepEqual(
    selectRuntimeVersions('v0.3.8', cache({ latestVersion: 'v0.4.0', lastWorkingVersion: 'v0.3.9' }), 'v0.3.7', false),
    ['v0.3.9', 'v0.3.7', 'v0.3.8'],
  );
  assert.deepEqual(selectRuntimeVersions(null, cache({ latestVersion: 'v0.4.0' }), 'v0.3.7', true), [null]);
});

test('新模块导入成功但启动失败时清理，再启动上次成功的版本', async () => {
  const calls = [];
  const make = (version, failure = false) => ({
    version,
    createRuntime: () => ({
      start() {
        calls.push(`start:${version}`);
        if (failure) throw Error('mount failed');
      },
      stop() {
        calls.push(`stop:${version}`);
      },
    }),
  });
  const result = await startRuntimeWithFallback({
    initial: make('v0.3.8'),
    versions: ['v0.3.10', 'v0.3.9', 'v0.3.8'],
    updates: updates(),
    load: async version => make(version, version === 'v0.3.10'),
    beforeStart: release => calls.push(`prepare:${release.version}`),
    failed: version => calls.push(`failed:${version}`),
    stopped: () => false,
  });
  assert.equal(result.release.version, 'v0.3.9');
  assert.deepEqual(calls, [
    'prepare:v0.3.10',
    'start:v0.3.10',
    'stop:v0.3.10',
    'failed:v0.3.10',
    'prepare:v0.3.9',
    'start:v0.3.9',
  ]);
});

test('网络故障不会提前停止当前界面，直到备用版本准备好才切换', async () => {
  const calls = [];
  const initial = { version: 'v0.3.8', createRuntime: () => ({ start: () => calls.push('start'), stop() {} }) };
  const result = await startRuntimeWithFallback({
    initial,
    versions: ['v0.3.9', 'v0.3.8'],
    updates: updates(),
    load: async () => {
      calls.push('network');
      throw Error('offline');
    },
    beforeStart: () => calls.push('prepare'),
    failed: () => calls.push('failed'),
    stopped: () => false,
  });
  assert.equal(result.release.version, 'v0.3.8');
  assert.deepEqual(calls, ['network', 'failed', 'prepare', 'start']);
});

test('所有版本失败保留错误；卸载后不再启动候选版本', async () => {
  const options = {
    initial: {
      version: 'v0.3.8',
      createRuntime: () => ({
        start() {
          throw Error('bad runtime');
        },
        stop() {},
      }),
    },
    versions: ['v0.3.8'],
    updates: updates(),
    load: async () => {
      throw Error('unused');
    },
    beforeStart() {},
    failed() {},
    stopped: () => false,
  };
  await assert.rejects(startRuntimeWithFallback(options), AggregateError);
  await assert.rejects(startRuntimeWithFallback({ ...options, stopped: () => true }), /已卸载/);
});
