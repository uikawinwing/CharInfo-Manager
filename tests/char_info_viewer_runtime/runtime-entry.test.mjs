import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import test from 'node:test';
import { registerRuntimeEntry } from '../../src/char_info_viewer_runtime/runtimeEntry.ts';
import { UPDATE_STORAGE_KEY } from '../../src/char_info_viewer_runtime/selfUpdate.ts';

function fixture(t) {
  const previous = Object.fromEntries(
    ['window', 'document', '$', 'getVariables', 'toastr'].map(key => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const values = new Map([
    [
      UPDATE_STORAGE_KEY,
      JSON.stringify({
        latestVersion: 'v0.3.9',
        lastWorkingVersion: 'v0.3.8',
        checkedAt: Date.now(),
        retryAt: 0,
        autoUpdateEnabled: true,
      }),
    ],
  ]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const active = new Set();
  const calls = [];
  const notices = [];
  const host = { localStorage: storage };
  globalThis.document = { head: { querySelectorAll: () => [], append() {} } };
  globalThis.$ = value => (typeof value === 'function' ? queueMicrotask(value) : { on() {} });
  globalThis.getVariables = () => ({});
  globalThis.toastr = { success: value => notices.push(value), error: value => notices.push(value) };
  const scopes = [];
  function scope() {
    const value = { parent: host, sessionStorage: storage };
    scopes.push(value);
    globalThis.window = value;
    return value;
  }
  function release(name, version, fails = false) {
    return {
      version,
      createRuntime: () => ({
        start() {
          calls.push(`start:${name}`);
          if (fails) throw Error('mount failed');
          active.add(name);
        },
        stop() {
          calls.push(`stop:${name}`);
          active.delete(name);
        },
      }),
    };
  }
  t.after(() => {
    for (const value of scopes) value.__CHARINFO_BOOTSTRAP_V1__?.stop();
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return { scope, release, host, active, calls, notices, values };
}

test('较晚启动的入口取消等待中的旧入口，只保留一个 Runtime 和一次成功提示', async t => {
  const f = fixture(t);
  const first = f.scope();
  let imported;
  registerRuntimeEntry(
    f.release('old anchor', 'v0.3.8'),
    () =>
      new Promise(resolve => {
        imported = resolve;
      }),
  );
  const cancelled = assert.rejects(first.__CHARINFO_BOOTSTRAP_V1__.ready, /取消|未能启动/);
  await setImmediate();
  assert.equal(typeof imported, 'function');
  const second = f.scope();
  registerRuntimeEntry(f.release('second', 'v0.3.9'));
  await second.__CHARINFO_BOOTSTRAP_V1__.ready;
  first.__CHARINFO_BOOTSTRAP_V1__.register(f.release('late first', 'v0.3.9'));
  imported();
  await cancelled;
  assert.deepEqual([...f.active], ['second']);
  assert.deepEqual(
    f.calls.filter(call => call.startsWith('start:')),
    ['start:second'],
  );
  assert.equal(f.notices.length, 1);
  assert.match(f.notices[0], /已更新至 v0.3.9/);
});

test('导入成功但启动抛错不会写入新版运行记录，会清理并恢复保底版本', async t => {
  const f = fixture(t);
  const scope = f.scope();
  registerRuntimeEntry(f.release('anchor', 'v0.3.8'), async () => {
    assert.equal(JSON.parse(f.values.get(UPDATE_STORAGE_KEY)).lastWorkingVersion, 'v0.3.8');
    scope.__CHARINFO_BOOTSTRAP_V1__.register(f.release('bad candidate', 'v0.3.9', true));
  });
  await scope.__CHARINFO_BOOTSTRAP_V1__.ready;
  assert.deepEqual([...f.active], ['anchor']);
  assert.deepEqual(f.calls, ['start:bad candidate', 'stop:bad candidate', 'start:anchor']);
  assert.equal(JSON.parse(f.values.get(UPDATE_STORAGE_KEY)).lastWorkingVersion, 'v0.3.8');
  assert.deepEqual(JSON.parse(f.values.get('destiny:loaded:角色管理库')), {
    version: '0.3.8',
    defaultVersion: '0.3.8',
    ready: true,
  });
  assert.equal(f.notices.length, 0);
});

test('超时模块迟到时不能再次启动或覆盖已经成功运行的备用版本', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture(t);
  const scope = f.scope();
  registerRuntimeEntry(f.release('anchor', 'v0.3.8'), () => new Promise(() => {}));
  await setImmediate();
  for (let index = 0; index < 4; index++) {
    t.mock.timers.tick(12000);
    await setImmediate();
  }
  await scope.__CHARINFO_BOOTSTRAP_V1__.ready;
  assert.deepEqual([...f.active], ['anchor']);
  assert.throws(() => scope.__CHARINFO_BOOTSTRAP_V1__.register(f.release('late', 'v0.3.9')), /版本不匹配/);
  assert.deepEqual([...f.active], ['anchor']);
});
