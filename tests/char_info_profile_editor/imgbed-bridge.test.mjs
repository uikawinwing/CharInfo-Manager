import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalImgbedGalleryUrl,
  createImgbedBridge,
  displayImgbedMediaTitle,
  IMG_BED_CONNECTION_TIMEOUT_MS,
  IMG_BED_ORIGIN,
  parseImgbedGalleryUrl,
} from '../../src/char_info_profile_editor/services/imgbedBridge.ts';

const id = '01234567-89ab-cdef-0123-456789abcdef';
const url = `${IMG_BED_ORIGIN}/api/public/album-gallery/${id}`;

function setup(blocked = false) {
  const listeners = new Set();
  const intervals = new Map();
  const timeouts = new Map();
  const popup = {
    closed: false,
    messages: [],
    postMessage(...args) {
      this.messages.push(args);
    },
  };
  let next = 0;
  let opened;
  let randomValue = 7;
  const host = {
    location: { origin: 'https://st.example:8443' },
    crypto: {
      getRandomValues(bytes) {
        bytes.fill(randomValue++);
        return bytes;
      },
    },
    open(...args) {
      opened = args;
      return blocked ? null : popup;
    },
    addEventListener(_type, listener) {
      listeners.add(listener);
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener);
    },
    setInterval(fn) {
      intervals.set(++next, fn);
      return next;
    },
    clearInterval(key) {
      intervals.delete(key);
    },
    setTimeout(fn) {
      timeouts.set(++next, fn);
      return next;
    },
    clearTimeout(key) {
      timeouts.delete(key);
    },
  };
  const emit = (data, overrides = {}) => {
    for (const listener of listeners) listener({ origin: IMG_BED_ORIGIN, source: popup, data, ...overrides });
  };
  const message = type => ({ protocol: 'charinfo-imgbed-bridge', version: 1, type, nonce: '07'.repeat(32) });
  return {
    host,
    popup,
    listeners,
    intervals,
    timeouts,
    emit,
    message,
    get opened() {
      return opened;
    },
  };
}

test('自动文件名只以图片序号显示，但保留人工命名', () => {
  assert.equal(displayImgbedMediaTitle('a909fbcc-e28e-41bc-ad16-f3259f243966.png', 0), '图片 1');
  assert.equal(displayImgbedMediaTitle('ComfyUI_00311_.png', 1), '图片 2');
  assert.equal(displayImgbedMediaTitle('角色封面', 1), '角色封面');
  assert.equal(displayImgbedMediaTitle('Venus-portrait.webp', 0), 'Venus-portrait.webp');
});

test('规范图库 URL 严格限定小写 UUID 和固定路径', () => {
  assert.equal(canonicalImgbedGalleryUrl(id.toUpperCase()), url);
  assert.equal(parseImgbedGalleryUrl(url), id);
  for (const invalid of [
    url + '?x=1',
    url + '#x',
    url.toUpperCase(),
    url.replace('https:', 'http:'),
    url.replace(id, 'bad'),
  ]) {
    assert.equal(parseImgbedGalleryUrl(invalid), null);
  }
});

test('同步打开宿主弹窗，忽略未握手和伪造消息，成功后清理并阻止重放', async () => {
  const env = setup();
  const bridge = createImgbedBridge(env.host);
  const selection = bridge.select(id.toUpperCase());
  const popupUrl = new URL(env.opened[0]);
  assert.equal(popupUrl.origin, IMG_BED_ORIGIN);
  assert.equal(popupUrl.pathname, '/account/');
  assert.equal(popupUrl.searchParams.get('opener_origin'), env.host.location.origin);
  assert.equal(popupUrl.searchParams.get('album'), id);
  assert.equal(popupUrl.searchParams.get('bridge_nonce'), '07'.repeat(32));
  assert.equal(popupUrl.searchParams.get('view'), 'albums');
  assert.equal(popupUrl.searchParams.get('bridge'), 'charinfo');
  assert.equal(popupUrl.searchParams.get('bridge_version'), '1');
  assert.ok(env.opened[0].includes(`opener_origin=${encodeURIComponent(env.host.location.origin)}`));
  assert.equal(env.popup.messages[0][1], IMG_BED_ORIGIN);
  const selected = { ...env.message('album.selected'), albumId: id, remoteGalleryUrl: url };
  env.emit(selected);
  env.emit(env.message('bridge.ready'), { origin: 'https://evil.example' });
  env.emit(env.message('bridge.ready'), { source: {} });
  env.emit({ ...env.message('bridge.ready'), nonce: 'wrong' });
  env.emit({ ...env.message('bridge.ready'), version: 2 });
  env.emit({ ...env.message('bridge.ready'), protocol: 'other-protocol' });
  env.emit({ ...env.message('bridge.ready'), type: 'wrong' });
  env.emit(selected);
  assert.equal(env.listeners.size, 1);
  [...env.intervals.values()][0]();
  assert.equal(env.popup.messages.length, 2);
  env.emit(env.message('bridge.ready'));
  env.emit(Object.assign([], selected));
  env.emit({ ...selected, remoteGalleryUrl: `${url}?x=1` });
  env.emit({ ...selected, remoteGalleryUrl: `${url}#fragment` });
  env.emit({ ...selected, albumId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' });
  assert.equal(env.listeners.size, 1);
  env.emit(selected);
  assert.deepEqual(await selection, { albumId: id, remoteGalleryUrl: url });
  assert.equal(env.listeners.size + env.intervals.size + env.timeouts.size, 0);
  env.emit(selected);
});

test('HTTP 私网和自定义 HTTPS 来源不需要安全上下文即可完成握手', async () => {
  for (const origin of [
    'http://localhost:8000',
    'http://192.168.1.41:8000',
    'http://100.75.12.3:8000',
    'https://st.example.net:8443',
  ]) {
    const env = setup();
    env.host.location.origin = origin;
    Object.defineProperty(env.host, 'isSecureContext', {
      get() {
        throw new Error('must not inspect secure context');
      },
    });
    Object.defineProperty(env.host.crypto, 'randomUUID', {
      get() {
        throw new Error('must not use randomUUID');
      },
    });
    const getRandomValues = env.host.crypto.getRandomValues;
    let randomCalls = 0;
    env.host.crypto.getRandomValues = bytes => {
      randomCalls++;
      return getRandomValues(bytes);
    };
    const pending = createImgbedBridge(env.host).select();
    assert.equal(randomCalls, 1);
    assert.ok(env.opened[0].includes(`opener_origin=${encodeURIComponent(origin)}`));
    assert.equal(new URL(env.opened[0]).searchParams.get('opener_origin'), origin);
    env.emit(env.message('bridge.ready'));
    env.emit({ ...env.message('album.selected'), albumId: id, remoteGalleryUrl: url });
    assert.deepEqual(await pending, { albumId: id, remoteGalleryUrl: url });
    assert.equal(env.listeners.size + env.intervals.size + env.timeouts.size, 0);
  }
});

function useVirtualTime(env) {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  env.host.setInterval = (fn, delay) => {
    timers.set(++nextId, { fn, delay, at: now + delay });
    return nextId;
  };
  env.host.setTimeout = (fn, delay) => {
    timers.set(++nextId, { fn, at: now + delay });
    return nextId;
  };
  env.host.clearInterval = env.host.clearTimeout = key => {
    timers.delete(key);
  };
  return {
    timers,
    advance(ms) {
      const end = now + ms;
      while (true) {
        const entry = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        const [key, timer] = entry;
        now = timer.at;
        if (timer.delay) timer.at += timer.delay;
        else timers.delete(key);
        timer.fn();
      }
      now = end;
    },
  };
}

test('超过两分钟仍可握手成功，总时限始终从点击开始计算', async () => {
  assert.equal(IMG_BED_CONNECTION_TIMEOUT_MS, 12 * 60 * 1000);
  assert.ok(IMG_BED_CONNECTION_TIMEOUT_MS < 15 * 60 * 1000);
  const env = setup();
  const clock = useVirtualTime(env);
  const pending = createImgbedBridge(env.host).select();
  clock.advance(121_000);
  assert.equal(env.popup.messages.length, 243);
  env.emit(env.message('bridge.ready'));
  clock.advance(1_000);
  assert.equal(env.popup.messages.length, 243);
  env.emit({ ...env.message('album.selected'), albumId: id, remoteGalleryUrl: url });
  assert.deepEqual(await pending, { albumId: id, remoteGalleryUrl: url });
  assert.equal(clock.timers.size + env.listeners.size, 0);

  for (const ready of [false, true]) {
    const later = setup();
    const timer = useVirtualTime(later);
    const result = createImgbedBridge(later.host).select();
    const rejection = assert.rejects(result, { code: 'timeout' });
    timer.advance(IMG_BED_CONNECTION_TIMEOUT_MS - 1);
    if (ready) later.emit(later.message('bridge.ready'));
    assert.equal(later.listeners.size, 1);
    timer.advance(1);
    await rejection;
    assert.equal(timer.timers.size + later.listeners.size, 0);
  }
});

test('虚拟时间下取消或卸载后，旧消息与到期计时不能产生结果', async () => {
  for (const action of ['cancel', 'destroy']) {
    const env = setup();
    const clock = useVirtualTime(env);
    const bridge = createImgbedBridge(env.host);
    const pending = bridge.select();
    let resolved = false;
    pending.then(
      () => {
        resolved = true;
      },
      () => {},
    );
    clock.advance(121_000);
    bridge[action]();
    await assert.rejects(pending, { code: action === 'cancel' ? 'cancelled' : 'disposed' });
    env.emit(env.message('bridge.ready'));
    env.emit({ ...env.message('album.selected'), albumId: id, remoteGalleryUrl: url });
    clock.advance(IMG_BED_CONNECTION_TIMEOUT_MS);
    assert.equal(resolved, false);
    assert.equal(clock.timers.size + env.listeners.size, 0);
  }
});

test('阻止、关闭、取消、超时和卸载均返回可区分错误并清理', async () => {
  await assert.rejects(createImgbedBridge(setup(true).host).select(), { code: 'blocked' });
  for (const reason of ['closed', 'cancelled', 'timeout', 'disposed']) {
    const env = setup();
    const bridge = createImgbedBridge(env.host);
    const pending = bridge.select();
    if (reason === 'closed') {
      env.popup.closed = true;
      [...env.intervals.values()][0]();
    }
    if (reason === 'cancelled') env.emit(env.message('bridge.cancelled'));
    if (reason === 'timeout') [...env.timeouts.values()][0]();
    if (reason === 'disposed') bridge.destroy();
    await assert.rejects(pending, { code: reason });
    assert.equal(env.listeners.size + env.intervals.size + env.timeouts.size, 0);
    if (reason === 'disposed') await assert.rejects(bridge.select(), { code: 'disposed' });
  }
});

test('主动取消后可重新选择，旧随机值的消息不能重放', async () => {
  const env = setup();
  const bridge = createImgbedBridge(env.host);
  const first = bridge.select();
  bridge.cancel();
  await assert.rejects(first, { code: 'cancelled' });
  assert.equal(env.listeners.size + env.intervals.size + env.timeouts.size, 0);
  const second = bridge.select();
  const stale = env.message('bridge.ready');
  env.emit(stale);
  env.emit({ ...stale, type: 'album.selected', albumId: id, remoteGalleryUrl: url });
  assert.equal(env.listeners.size, 1);
  const current = { ...stale, nonce: '08'.repeat(32) };
  env.emit(current);
  env.emit({ ...current, type: 'album.selected', albumId: id, remoteGalleryUrl: url });
  assert.deepEqual(await second, { albumId: id, remoteGalleryUrl: url });
  assert.equal(env.listeners.size + env.intervals.size + env.timeouts.size, 0);
});

test('弹窗访问异常会拒绝并清理所有资源', async () => {
  const openFailure = setup();
  openFailure.host.open = () => {
    throw new Error('open failed');
  };
  await assert.rejects(createImgbedBridge(openFailure.host).select(), { code: 'unsupported' });
  assert.equal(openFailure.listeners.size + openFailure.intervals.size + openFailure.timeouts.size, 0);
  for (const property of ['closed', 'postMessage']) {
    const env = setup();
    const pending = createImgbedBridge(env.host).select();
    if (property === 'closed')
      Object.defineProperty(env.popup, 'closed', {
        get() {
          throw new Error('closed failed');
        },
      });
    else
      env.popup.postMessage = () => {
        throw new Error('postMessage failed');
      };
    [...env.intervals.values()][0]();
    await assert.rejects(pending, { code: 'unsupported' });
    assert.equal(env.listeners.size + env.intervals.size + env.timeouts.size, 0);
  }
});
