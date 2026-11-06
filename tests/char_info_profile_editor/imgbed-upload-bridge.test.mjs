import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createImgbedUploadBridge,
  IMG_BED_UPLOAD_PROTOCOL,
} from '../../src/char_info_profile_editor/services/imgbedUploadBridge.ts';
import { IMG_BED_ORIGIN } from '../../src/char_info_profile_editor/services/imgbedBridge.ts';

const albumId = '01234567-89ab-cdef-0123-456789abcdef';
const remoteGalleryUrl = `${IMG_BED_ORIGIN}/api/public/album-gallery/${albumId}`;
const tick = () => new Promise(resolve => setImmediate(resolve));

function setup(origin = 'http://192.168.1.41:8000', launcherReady = true) {
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0;
  let frame;
  let launcher;
  const opened = [];
  const messages = [];
  const launcherMessages = [];
  const launcherContainer = {
    ownerDocument: {
      defaultView: {
        Function,
        addEventListener(type, fn) {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type).add(fn);
        },
        removeEventListener(type, fn) {
          listeners.get(type)?.delete(fn);
        },
      },
      createElement(tag) {
        assert.equal(tag, 'iframe');
        launcher = {
          attributes: {},
          style: {},
          setAttribute(key, value) {
            this.attributes[key] = value;
          },
          addEventListener(type, callback) {
            this[type] = callback;
          },
          remove() {
            this.removed = true;
          },
          contentWindow: {
            postMessage(data, target) {
              launcherMessages.push({ data, target });
            },
          },
        };
        return launcher;
      },
    },
    appendChild(element) {
      element.load?.();
      if (launcherReady) {
        for (const listener of listeners.get('message') ?? [])
          listener({
            source: element.contentWindow,
            origin: IMG_BED_ORIGIN,
            data: {
              protocol: IMG_BED_UPLOAD_PROTOCOL,
              version: 1,
              connectionId: new URL(element.src).searchParams.get('connection_id'),
              type: 'launcher.ready',
            },
          });
      }
    },
  };
  const host = {
    crypto,
    location: { origin, protocol: new URL(origin).protocol },
    document: {
      createElement(tag) {
        assert.equal(tag, 'iframe');
        frame = {
          attributes: {},
          setAttribute(key, value) {
            this.attributes[key] = value;
          },
          addEventListener(type, callback) {
            this[type] = callback;
          },
          remove() {
            this.removed = true;
          },
          contentWindow: {
            postMessage(data, target) {
              messages.push({ data, target });
            },
          },
        };
        return frame;
      },
      body: {
        appendChild(element) {
          element.load?.();
        },
      },
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    setInterval(fn, ms) {
      timers.set(++timerId, { fn, ms, interval: true });
      return timerId;
    },
    setTimeout(fn, ms) {
      timers.set(++timerId, { fn, ms });
      return timerId;
    },
    clearInterval(id) {
      timers.delete(id);
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    open(...args) {
      opened.push(args);
      throw new Error('ST must not open an authorization popup');
    },
  };
  const bridge = createImgbedUploadBridge(host);
  const env = {
    bridge,
    host,
    timers,
    opened,
    messages,
    launcherContainer,
    launcherMessages,
    get launcher() {
      return launcher;
    },
    get frame() {
      return frame;
    },
    last() {
      return messages.at(-1).data;
    },
    emit(type, fields = {}, overrides = {}) {
      const data = {
        protocol: IMG_BED_UPLOAD_PROTOCOL,
        version: 1,
        connectionId: new URL(frame.src).searchParams.get('connection_id'),
        type,
        ...fields,
      };
      for (const listener of listeners.get('message') ?? [])
        listener({ source: frame.contentWindow, origin: IMG_BED_ORIGIN, data, ...overrides });
    },
    expire() {
      const timeout = [...timers.values()].find(timer => !timer.interval);
      assert.ok(timeout);
      timeout.fn();
    },
    listeners,
  };
  return env;
}

async function connected(env) {
  const status = env.bridge.status();
  env.emit('bridge.ready');
  await tick();
  env.emit('auth.connected', {
    requestId: env.last().requestId,
    sessionId: 'public-session-1',
    accountId: 'account-1',
    accountName: '玩家',
  });
  await status;
}

async function authorizeGalleryRequest(env) {
  await tick();
  assert.equal(env.last().type, 'auth.status');
  env.emit('auth.connected', {
    requestId: env.last().requestId,
    sessionId: 'public-session-1',
    accountId: 'account-1',
    accountName: '玩家',
  });
  await tick();
}

function input(id = 'save-1') {
  const file = new File(['image'], 'portrait.webp', { type: 'image/webp' });
  return {
    requestId: id,
    albumId: null,
    characterName: '爱丽丝',
    files: [{ id: 'file-1', file, title: '立绘' }],
    order: [{ uploadId: 'file-1' }],
  };
}
const items = [{ id: 'stored-1', title: '立绘', url: 'https://media.example/portrait.webp', kind: 'image' }];

test('长期打开后保存与读取先检查授权，使用接收方续期返回的新会话且不打开登录窗口', async () => {
  for (const type of ['gallery.save', 'gallery.read']) {
    const env = setup();
    await connected(env);
    const request = input();
    const operation = type === 'gallery.save' ? env.bridge.save(request) : env.bridge.readGallery(albumId, '爱丽丝');
    await tick();
    assert.equal(env.last().type, 'auth.status');
    assert.equal(env.last().sessionId, 'public-session-1');
    assert.equal(env.messages.some(message => message.data.type.startsWith('gallery.')), false);
    env.emit('auth.connected', {
      requestId: env.last().requestId, sessionId: 'renewed-session', accountId: 'account-1', accountName: '玩家',
    });
    await tick();
    const sent = env.last();
    assert.equal(sent.type, type);
    assert.equal(sent.sessionId, 'renewed-session');
    if (type === 'gallery.save') {
      assert.equal(sent.files[0].file, request.files[0].file);
      assert.ok(structuredClone(sent).files[0].file instanceof Blob);
    }
    env.emit(type === 'gallery.save' ? 'gallery.saved' : 'gallery.loaded', {
      requestId: sent.requestId, sessionId: sent.sessionId, albumId, characterName: '爱丽丝', items,
      ...(type === 'gallery.save' ? { remoteGalleryUrl } : {}),
    });
    await operation;
    assert.equal(env.opened.length, 0);
    assert.equal(env.launcher, undefined);
    env.bridge.destroy();
  }
});

test('保存或读取前发现账号改变、失效或撤销时不发送图库请求及文件', async () => {
  for (const type of ['save', 'read']) {
    for (const outcome of ['changed', 'expired', 'revoked']) {
      const env = setup();
      await connected(env);
      const request = input();
      const operation = type === 'save' ? env.bridge.save(request) : env.bridge.readGallery(albumId, '爱丽丝');
      await tick();
      assert.equal(env.last().type, 'auth.status');
      const requestId = env.last().requestId;
      if (outcome === 'changed') env.emit('auth.connected', {
        requestId, sessionId: 'another-session', accountId: 'account-2', accountName: '另一账号',
      });
      else if (outcome === 'expired') env.emit('auth.required', { requestId });
      else env.emit('auth.failed', { requestId, code: 'AUTH_REQUIRED' });
      await assert.rejects(operation, { code: outcome === 'changed' ? 'invalid' : outcome === 'expired' ? 'required' : 'failed' });
      assert.equal(env.messages.some(message => message.data.type.startsWith('gallery.')), false);
      if (type === 'save' && outcome === 'changed') await assert.rejects(env.bridge.save(request), { code: 'invalid' });
      env.bridge.destroy();
    }
  }
});

test('HTTP localhost、LAN、Tailscale 与 HTTPS 都只嵌入固定专用页面，握手不代表授权', async () => {
  for (const origin of [
    'http://localhost:8000',
    'http://192.168.1.41:8000',
    'http://100.75.12.3:8000',
    'https://st.example:8443',
  ]) {
    const env = setup(origin);
    const operation = env.bridge.status();
    const url = new URL(env.frame.src);
    assert.equal(url.origin, IMG_BED_ORIGIN);
    assert.equal(url.pathname, '/charinfo-upload/');
    assert.equal(url.searchParams.get('parent_origin'), origin);
    assert.equal(env.frame.attributes.sandbox, 'allow-scripts allow-same-origin');
    assert.equal(env.opened.length, 0);
    env.emit('bridge.ready');
    assert.notEqual(env.bridge.getState().status, 'connected');
    await tick();
    env.emit('auth.required', { requestId: env.last().requestId });
    await operation;
    assert.equal(env.bridge.getState().status, 'required');
    await assert.rejects(env.bridge.save(input()), { code: 'required' });
    assert.ok(env.messages.every(message => message.target === IMG_BED_ORIGIN));
    env.bridge.destroy();
  }
});

test('拒绝伪造来源、窗口、连接、版本、请求编号和带额外凭据字段的消息', async () => {
  const env = setup();
  const status = env.bridge.status();
  for (const override of [{ origin: 'https://evil.example' }, { source: {} }]) env.emit('bridge.ready', {}, override);
  env.emit('bridge.ready', { connectionId: 'wrong' });
  env.emit('bridge.ready', { version: 2 });
  env.emit('bridge.ready', { accessToken: 'not-allowed' });
  assert.equal(env.last().type, 'bridge.hello');
  env.emit('bridge.ready');
  await tick();
  const requestId = env.last().requestId;
  env.emit('auth.connected', { requestId: 'wrong', sessionId: 'public', accountId: 'account-1', accountName: 'fake' });
  env.emit('auth.connected', {
    requestId,
    sessionId: 'public',
    accountId: 'account-1',
    accountName: 'fake',
    token: 'not-allowed',
  });
  assert.notEqual(env.bridge.getState().status, 'connected');
  env.emit('auth.connected', { requestId, sessionId: 'public', accountId: 'account-1', accountName: '玩家' });
  await status;
  env.bridge.destroy();
});

test('授权从可见 ImgBed 启动器发起，ST 不打开弹窗；只有接收 iframe 确认授权才显示连接', async () => {
  const env = setup();
  const connection = env.bridge.connect(env.launcherContainer);
  assert.equal(env.opened.length, 0);
  env.emit('bridge.ready');
  await tick();
  assert.equal(new URL(env.launcher.src).pathname, '/charinfo-upload/launcher');
  assert.equal(
    new URL(env.launcher.src).searchParams.get('connection_id'),
    new URL(env.frame.src).searchParams.get('connection_id'),
  );
  assert.equal(
    env.launcher.attributes.sandbox,
    'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
  );
  assert.deepEqual(env.launcherMessages[0], {
    data: {
      protocol: IMG_BED_UPLOAD_PROTOCOL,
      version: 1,
      connectionId: new URL(env.frame.src).searchParams.get('connection_id'),
      type: 'bridge.hello',
    },
    target: IMG_BED_ORIGIN,
  });
  assert.equal(env.last().type, 'auth.connect');
  assert.equal(env.bridge.getState().status, 'connecting');
  env.emit('auth.connected', {
    requestId: env.last().requestId,
    sessionId: 'public-session-1',
    accountId: 'account-1',
    accountName: '玩家',
  });
  await connection;
  assert.equal(env.launcher.removed, true);
  const disconnect = env.bridge.disconnect();
  await tick();
  assert.equal(env.bridge.getState().status, 'connected');
  env.emit('auth.required', { requestId: env.last().requestId });
  await disconnect;
  assert.equal(env.bridge.getState().status, 'required');
  env.bridge.destroy();
});

test('File 直接交给 structured clone，校验进度和结果，超时后复用原请求编号及文件', async () => {
  const env = setup();
  await connected(env);
  const request = input();
  const progress = [];
  const first = env.bridge.save(request, value => progress.push(value));
  await authorizeGalleryRequest(env);
  const sent = env.last();
  assert.equal(sent.files[0].file, request.files[0].file);
  assert.ok(structuredClone(sent).files[0].file instanceof Blob);
  env.emit('gallery.progress', {
    requestId: sent.requestId,
    sessionId: sent.sessionId,
    completed: 1,
    total: 1,
    fileId: 'unknown',
    phase: 'uploading',
  });
  env.emit('gallery.progress', {
    requestId: sent.requestId,
    sessionId: sent.sessionId,
    completed: 1,
    total: 1,
    fileId: 'file-1',
    phase: 'uploading',
  });
  assert.deepEqual(progress.map(({ completed, total, phase }) => ({ completed, total, phase })), [
    { completed: 0, total: 1, phase: 'uploading' },
    { completed: 1, total: 1, phase: 'uploading' },
  ]);
  env.expire();
  await assert.rejects(first, { code: 'timeout' });
  const retry = env.bridge.save(request);
  await authorizeGalleryRequest(env);
  assert.equal(env.last().requestId, sent.requestId);
  assert.equal(env.last().files[0].file, sent.files[0].file);
  env.emit('gallery.saved', {
    requestId: sent.requestId,
    sessionId: sent.sessionId,
    albumId,
    remoteGalleryUrl,
    characterName: '爱丽丝',
    items,
  });
  assert.deepEqual(await retry, { albumId, remoteGalleryUrl, characterName: '爱丽丝', items });
  env.bridge.destroy();
});

test('读取和保存必须保留现有相册身份，姓名、会话及有效媒体不符时拒绝', async () => {
  for (const bad of [
    { albumId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    { characterName: '别的角色' },
    { sessionId: 'other-account' },
    { items: [{ ...items[0], url: 'javascript:alert(1)' }] },
    { items: [] },
    { remoteGalleryUrl: remoteGalleryUrl + '?x=1' },
  ]) {
    const env = setup();
    await connected(env);
    const request = { ...input(), albumId };
    const saving = env.bridge.save(request);
    await authorizeGalleryRequest(env);
    env.emit('gallery.saved', {
      requestId: request.requestId,
      sessionId: 'public-session-1',
      albumId,
      remoteGalleryUrl,
      characterName: '爱丽丝',
      items,
      ...bad,
    });
    await assert.rejects(saving, { code: 'invalid' });
    env.bridge.destroy();
  }
  const env = setup();
  await connected(env);
  const read = env.bridge.readGallery(albumId, '爱丽丝');
  await authorizeGalleryRequest(env);
  env.emit('gallery.loaded', {
    requestId: env.last().requestId,
    sessionId: 'public-session-1',
    albumId,
    characterName: '爱丽丝',
    items,
  });
  assert.deepEqual((await read).items, items);
  env.bridge.destroy();
});

test('重复提交被阻止；取消、销毁和延迟结果不会完成旧请求，所有监听与计时器被清理', async () => {
  const env = setup();
  await connected(env);
  const saving = env.bridge.save(input());
  await tick();
  await assert.rejects(env.bridge.save(input('save-2')), { code: 'busy' });
  env.bridge.cancel();
  await assert.rejects(saving, { code: 'cancelled' });
  assert.equal(env.last().type, 'bridge.cancel');
  env.emit('gallery.saved', {
    requestId: 'save-1',
    sessionId: 'public-session-1',
    albumId,
    remoteGalleryUrl,
    characterName: '爱丽丝',
    items,
  });
  env.bridge.destroy();
  assert.equal(env.timers.size, 0);
  assert.ok([...env.listeners.values()].every(set => set.size === 0));
  assert.equal(env.frame.removed, true);
  await assert.rejects(env.bridge.status(), { code: 'disposed' });
});

test('桥接缺失或授权失败时不会宣称已连接，也不会发送上传请求', async () => {
  const env = setup();
  const status = env.bridge.status();
  env.expire();
  await assert.rejects(status, { code: 'unavailable' });
  assert.equal(env.bridge.getState().status, 'error');
  assert.ok(env.messages.every(message => message.data.type === 'bridge.hello'));
  env.bridge.destroy();
  const denied = setup();
  const connection = denied.bridge.connect(denied.launcherContainer);
  denied.emit('bridge.ready');
  await tick();
  denied.emit('auth.failed', { requestId: denied.last().requestId, code: 'AUTH_FAILED' });
  await assert.rejects(connection, { code: 'failed' });
  assert.notEqual(denied.bridge.getState().status, 'connected');
  assert.equal(denied.launcher.removed, true);
  denied.bridge.destroy();
});

test('账号切换不能将原保存请求重放到新账号；撤销失败不会宣称已经断开', async () => {
  const env = setup();
  await connected(env);
  const saving = env.bridge.save(input());
  await tick();
  env.bridge.cancel();
  await assert.rejects(saving, { code: 'cancelled' });
  const disconnect = env.bridge.disconnect();
  await tick();
  env.emit('auth.failed', { requestId: env.last().requestId, code: 'NETWORK_ERROR' });
  await assert.rejects(disconnect, { code: 'failed' });
  assert.equal(env.bridge.getState().status, 'connected');
  const status = env.bridge.status();
  await tick();
  env.emit('auth.connected', {
    requestId: env.last().requestId,
    sessionId: 'public-session-2',
    accountId: 'account-2',
    accountName: '另一账号',
  });
  await status;
  await assert.rejects(env.bridge.save(input()), { code: 'invalid' });
  env.bridge.destroy();
});

test('状态检查超时或取消后可以再次连接，不会卡在加载中', async () => {
  for (const cancel of [true, false]) {
    const env = setup();
    const status = env.bridge.status();
    env.emit('bridge.ready');
    await tick();
    if (cancel) env.bridge.cancel();
    else env.expire();
    await assert.rejects(status);
    assert.ok(['error', 'required'].includes(env.bridge.getState().status));
    env.bridge.destroy();
  }
});

test('srcdoc 脚本使用继承的 ST 来源，不把 about:srcdoc 的 null 当作实际消息来源', async () => {
  const env = setup();
  env.bridge.destroy();
  const origin = env.host.location.origin;
  env.host.location = { origin: 'null', protocol: 'about:' };
  const bridge = createImgbedUploadBridge(env.host, origin);
  const status = bridge.status();
  assert.equal(new URL(env.frame.src).searchParams.get('parent_origin'), origin);
  env.emit('bridge.ready');
  await tick();
  env.emit('auth.required', { requestId: env.last().requestId });
  await status;
  assert.equal(bridge.getState().status, 'required');
  bridge.destroy();
});

test('COOP 不可见弹窗引用不会干扰授权轮询；取消和超时清理可见启动器', async () => {
  for (const action of ['cancel', 'timeout']) {
    const env = setup();
    const connection = env.bridge.connect(env.launcherContainer);
    env.emit('bridge.ready');
    await tick();
    assert.equal(env.opened.length, 0);
    assert.equal(env.bridge.getState().status, 'connecting');
    if (action === 'cancel') env.bridge.cancel();
    else env.expire();
    assert.equal(env.bridge.getState().status, 'connecting');
    assert.equal(env.last().type, 'bridge.cancel');
    assert.notEqual(env.launcher.removed, true);
    env.emit('auth.cancelled', { requestId: env.last().requestId });
    await assert.rejects(connection, { code: action === 'cancel' ? 'cancelled' : 'timeout' });
    assert.equal(env.launcher.removed, true);
    env.bridge.destroy();
    assert.equal(env.timers.size, 0);
  }
});

test('未部署登录入口时不显示回退首页，且必须核对启动器窗口及来源', async () => {
  const env = setup('http://localhost:8000', false);
  const connection = env.bridge.connect(env.launcherContainer);
  env.emit('bridge.ready');
  await tick();
  assert.equal(env.launcher.style.visibility, 'hidden');
  const data = {
    protocol: IMG_BED_UPLOAD_PROTOCOL,
    version: 1,
    type: 'launcher.ready',
    connectionId: new URL(env.launcher.src).searchParams.get('connection_id'),
  };
  for (const listener of env.listeners.get('message')) {
    listener({ data, origin: IMG_BED_ORIGIN, source: {} });
    listener({ data, origin: 'https://evil.example', source: env.launcher.contentWindow });
  }
  assert.equal(env.launcher.style.visibility, 'hidden');
  env.expire();
  await assert.rejects(connection, { code: 'login_unavailable' });
  assert.equal(env.launcher.removed, true);
  assert.equal(
    env.messages.some(message => message.data.type === 'auth.connect'),
    false,
  );
  env.bridge.destroy();
});

test('授权取消必须确认撤销；迟到成功、旧失败或确认超时均不能宣称已经撤销', async () => {
  for (const failure of ['old-error', 'no-ack']) {
    const env = setup();
    const connection = env.bridge.connect(env.launcherContainer);
    env.emit('bridge.ready');
    await tick();
    const requestId = env.last().requestId;
    env.bridge.cancel();
    env.emit('auth.connected', {
      requestId,
      sessionId: 'late-session',
      accountId: 'late-account',
      accountName: '迟到账号',
    });
    assert.equal(env.bridge.getState().status, 'connecting');
    if (failure === 'old-error') env.emit('auth.failed', { requestId, code: 'AUTH_DENIED' });
    else env.expire();
    await assert.rejects(connection, { code: 'revocation_failed' });
    assert.match(env.bridge.getState().message, /尚未确认撤销/);
    assert.equal(env.frame.removed, true);
    env.bridge.destroy();
  }
});
