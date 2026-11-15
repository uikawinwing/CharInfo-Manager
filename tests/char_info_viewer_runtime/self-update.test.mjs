import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareVersions,
  createUpdateController,
  isStableVersion,
  readUpdateCache,
  UPDATE_CHECK_INTERVAL,
  UPDATE_FAILURE_BACKOFF,
  UPDATE_STORAGE_KEY,
  writeUpdateCache,
} from '../../src/char_info_viewer_runtime/selfUpdate.ts';

function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function response(tags = ['v0.3.9', 'v0.3.10'], options = {}) {
  return new Response(JSON.stringify(tags.map(tag => ({ ref: `refs/tags/${tag}` }))), options);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function harness(options = {}) {
  let time = 1_000_000;
  let sequence = 0;
  let requests = 0;
  const timers = new Map();
  const persisted = options.storage ?? storage();
  const deps = {
    storage: persisted,
    now: () => time,
    locks: null,
    fetch: (...args) => {
      requests += 1;
      return options.fetch ? options.fetch(...args) : Promise.resolve(response());
    },
    setTimeout: (callback, delay) => {
      const id = ++sequence;
      timers.set(id, { callback, at: time + delay });
      return id;
    },
    clearTimeout: id => timers.delete(id),
    timeoutMs: 10_000,
  };
  const controller = createUpdateController(deps);
  return {
    controller,
    deps,
    storage: persisted,
    timers,
    requests: () => requests,
    now: () => time,
    advance: milliseconds => {
      time += milliseconds;
    },
    async runDue() {
      const due = [...timers].filter(([, timer]) => timer.at <= time);
      for (const [id, timer] of due) {
        timers.delete(id);
        timer.callback();
      }
      await new Promise(resolve => setImmediate(resolve));
    },
  };
}

test('只识别正式标签，并按数值比较版本而非字符串顺序', async () => {
  assert.equal(compareVersions('v0.3.9', 'v0.3.10'), -1);
  assert.equal(compareVersions('v1.0.0', 'v0.99.99'), 1);
  assert.equal(compareVersions('v0.3.8', 'v0.3.8'), 0);
  for (const tag of ['test-a', '0.3.9', 'v0.3.4-dev1', 'v0.3.2-charlib-ws-compat-20260920.0', 'v0.4.0-preview', null]) {
    assert.equal(isStableVersion(tag), false);
  }
  const env = harness({
    fetch: async () => response(['v0.3.9', 'v0.3.10', 'v8.0.0-preview', 'test-999', 'v0.3.4-dev1']),
  });
  await env.controller.check();
  assert.equal(env.controller.state.latestVersion, 'v0.3.10');
});

test('缓存边界过滤无效标签、时间与非对象，不执行存储里的任意内容', () => {
  const persisted = storage();
  persisted.setItem(
    UPDATE_STORAGE_KEY,
    JSON.stringify({
      latestVersion: 'v0.4.0-preview',
      checkedAt: -10,
      retryAt: 'tomorrow',
      lastWorkingVersion: 'v0.3.8',
      notifiedVersion: 'main',
      autoUpdateEnabled: false,
    }),
  );
  assert.deepEqual(readUpdateCache(persisted), {
    latestVersion: null,
    checkedAt: 0,
    retryAt: 0,
    lastWorkingVersion: 'v0.3.8',
    notifiedVersion: null,
    autoUpdateEnabled: false,
  });
  persisted.setItem(UPDATE_STORAGE_KEY, '{broken');
  assert.equal(readUpdateCache(persisted).autoUpdateEnabled, true);
  persisted.setItem(UPDATE_STORAGE_KEY, '[]');
  assert.equal(readUpdateCache(persisted).latestVersion, null);
});

test('成功检查后24小时内重用缓存，到期重新请求，手动检查可提前请求', async () => {
  const env = harness();
  await env.controller.check();
  assert.equal(env.requests(), 1);
  assert.equal(env.controller.state.lastCheckedAt, env.now());
  env.advance(UPDATE_CHECK_INTERVAL - 1);
  await env.controller.check();
  assert.equal(env.requests(), 1);
  await env.controller.check(true);
  assert.equal(env.requests(), 2);
  env.advance(UPDATE_CHECK_INTERVAL);
  await env.controller.check();
  assert.equal(env.requests(), 3);
});

test('请求失败不更新成功时间，并限制自动和手动重试频率', async t => {
  t.mock.method(console, 'warn', () => {});
  const env = harness({ fetch: async () => response([], { status: 503 }) });
  await env.controller.check();
  assert.equal(env.controller.state.lastCheckedAt, null);
  assert.match(env.controller.state.error, /HTTP 503/);
  assert.equal(readUpdateCache(env.storage).retryAt, env.now() + UPDATE_FAILURE_BACKOFF);
  await env.controller.check(true);
  assert.equal(env.requests(), 1);
  assert.match(env.controller.state.error, /稍后重试/);
  env.advance(UPDATE_FAILURE_BACKOFF);
  await env.controller.check();
  assert.equal(env.requests(), 2);
});

test('GitHub限流头优先于最短退避，不能用按钮绕过服务端限制', async t => {
  t.mock.method(console, 'warn', () => {});
  const env = harness({ fetch: async () => response([], { status: 429, headers: { 'retry-after': '1800' } }) });
  await env.controller.check(true);
  assert.equal(readUpdateCache(env.storage).retryAt, env.now() + 1_800_000);
  env.advance(UPDATE_FAILURE_BACKOFF);
  await env.controller.check(true);
  assert.equal(env.requests(), 1);
});

test('同一个入口的重复点击共用请求，状态向订阅者反馈检查中与完成', async () => {
  const pending = deferred();
  const env = harness({ fetch: () => pending.promise });
  const changes = [];
  const unsubscribe = env.controller.subscribe(state => changes.push(state));
  const first = env.controller.check(true);
  const second = env.controller.check(true);
  assert.equal(first, second);
  assert.equal(env.controller.state.checking, true);
  await Promise.resolve();
  assert.equal(env.requests(), 1);
  pending.resolve(response());
  await first;
  assert.equal(env.controller.state.checking, false);
  assert.equal(env.controller.state.error, '');
  assert.ok(changes.some(state => state.checking));
  assert.equal(changes.at(-1).latestVersion, 'v0.3.10');
  unsubscribe();
});

test('多个控制器或页面入口共用持久检查租约，成功后共用缓存', async () => {
  const pending = deferred();
  const env = harness({ fetch: () => pending.promise });
  const other = createUpdateController(env.deps);
  const first = env.controller.check();
  await Promise.resolve();
  await other.check();
  assert.equal(env.requests(), 1);
  pending.resolve(response());
  await first;
  await other.check();
  assert.equal(other.state.latestVersion, 'v0.3.10');
  assert.equal(env.requests(), 1);
});

test('长期开启页面到期自动检查，关闭控制器清理计时器', async () => {
  const env = harness();
  env.controller.start();
  await env.controller.check();
  assert.equal(env.requests(), 1);
  assert.equal(env.timers.size, 1);
  env.advance(UPDATE_CHECK_INTERVAL);
  await env.runDue();
  assert.equal(env.requests(), 2);
  assert.equal(env.controller.state.lastCheckedAt, env.now());
  env.controller.stop();
  assert.equal(env.timers.size, 0);
});

test('停止时取消正在执行的请求，不写入失败退避或成功记录', async () => {
  const env = harness({
    fetch: (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      }),
  });
  const running = env.controller.check();
  await Promise.resolve();
  env.controller.stop();
  await running;
  assert.equal(env.controller.state.checking, false);
  assert.equal(readUpdateCache(env.storage).checkedAt, 0);
  assert.equal(readUpdateCache(env.storage).retryAt, 0);
  assert.equal(env.timers.size, 0);
});

test('网络超时会终止请求并显示失败，仍可继续使用当前版本', async t => {
  t.mock.method(console, 'warn', () => {});
  const env = harness({
    fetch: (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      }),
  });
  env.controller.setCurrentVersion('v0.3.8');
  const running = env.controller.check(true);
  await Promise.resolve();
  env.advance(10_000);
  await env.runDue();
  await running;
  assert.match(env.controller.state.error, /超时/);
  assert.equal(env.controller.state.currentVersion, 'v0.3.8');
});

test('查询期间设置和运行版本更新不会被响应覆盖，关闭自动更新仍能手动检查', async () => {
  const pending = deferred();
  const env = harness({ fetch: () => pending.promise });
  const running = env.controller.check(true);
  env.controller.setAutoUpdate(false);
  assert.equal(env.controller.markWorking('v0.3.8'), false);
  pending.resolve(response());
  await running;
  const saved = readUpdateCache(env.storage);
  assert.equal(saved.autoUpdateEnabled, false);
  assert.equal(saved.lastWorkingVersion, 'v0.3.8');
  assert.equal(saved.latestVersion, 'v0.3.10');
});

test('只有确认运行新版后记录成功并通知一次，回退版本不提示升级成功', () => {
  const env = harness();
  assert.equal(env.controller.markWorking('v0.3.8'), false);
  assert.equal(env.controller.markWorking('v0.3.9'), true);
  assert.equal(env.controller.markWorking('v0.3.9'), false);
  assert.equal(env.controller.markWorking('v0.3.8'), false);
  assert.equal(env.controller.markWorking('v0.3.9'), false);
  assert.equal(readUpdateCache(env.storage).lastWorkingVersion, 'v0.3.9');
  assert.equal(readUpdateCache(env.storage).notifiedVersion, 'v0.3.9');
});

test('缓存跨控制器和页面重建保留，检查结果不会覆盖备用运行版本', async () => {
  const env = harness();
  writeUpdateCache(env.storage, {
    latestVersion: 'v0.3.9',
    checkedAt: env.now(),
    retryAt: 0,
    lastWorkingVersion: 'v0.3.8',
    notifiedVersion: null,
    autoUpdateEnabled: false,
  });
  const restarted = createUpdateController(env.deps);
  await restarted.check();
  assert.equal(env.requests(), 0);
  assert.equal(restarted.getCache().lastWorkingVersion, 'v0.3.8');
  assert.equal(restarted.getCache().autoUpdateEnabled, false);
});

test('浏览器拒绝存储时仍可检查并显示限制，内存缓存避免重复请求', async t => {
  t.mock.method(console, 'warn', () => {});
  const env = harness({
    storage: {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    },
  });
  await env.controller.check(true);
  assert.equal(env.controller.state.latestVersion, 'v0.3.10');
  assert.match(env.controller.state.error, /无法保存/);
  await env.controller.check();
  assert.equal(env.requests(), 1);
});
