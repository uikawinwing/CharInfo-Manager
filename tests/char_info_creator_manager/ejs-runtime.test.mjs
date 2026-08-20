import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateManagedEjs,
  writeStatusGallerySnapshotToCurrentChat,
} from '../../src/char_info_creator_manager/ejsRuntime.ts';

async function withFakeWindow(fakeWindow, callback) {
  const previousWindow = globalThis.window;
  globalThis.window = fakeWindow;
  try {
    await callback();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test('精确 EJS 执行优先使用官方 evalTemplate API', async () => {
  const calls = [];
  const fakeWindow = {};
  fakeWindow.parent = fakeWindow;
  fakeWindow.EjsTemplate = {
    async prepareContext() {
      calls.push(['prepareContext']);
      return { marker: 'current-chat' };
    },
    async evalTemplate(code, context, options) {
      calls.push(['evalTemplate', code, context, options]);
      return '';
    },
    async evaltemplate() {
      throw new Error('legacy casing should not be preferred');
    },
    async saveVariables() {
      calls.push(['saveVariables']);
    },
  };

  await withFakeWindow(fakeWindow, () => evaluateManagedEjs('managed-only', true));

  assert.deepEqual(calls[0], ['prepareContext']);
  assert.equal(calls[1][0], 'evalTemplate');
  assert.equal(calls[1][1], 'managed-only');
  assert.deepEqual(calls[1][2], { marker: 'current-chat' });
  assert.equal(calls[1][3].logging, true);
  assert.equal(calls[1][3].when, 'char-info-creator-apply');
  assert.deepEqual(calls[2], ['saveVariables']);
});

test('兼容本地旧 d.ts 的 evaltemplate 大小写', async () => {
  let evaluated = '';
  const fakeWindow = {};
  fakeWindow.parent = fakeWindow;
  fakeWindow.EjsTemplate = {
    async prepareContext() {
      return {};
    },
    async evaltemplate(code) {
      evaluated = code;
      return '';
    },
    async saveVariables() {},
  };

  await withFakeWindow(fakeWindow, () => evaluateManagedEjs('managed-only', false));
  assert.equal(evaluated, 'managed-only');
});

test('即时状态栏相簿写入只修改 externalGalleries 并保存变量', async () => {
  const writes = [];
  const calls = [];
  const fakeWindow = {};
  fakeWindow.parent = fakeWindow;
  fakeWindow.EjsTemplate = {
    async prepareContext() {
      return {
        setLocalVar(path, value) {
          writes.push([path, value]);
        },
      };
    },
    async evalTemplate(code, context, options) {
      calls.push(['evalTemplate', options]);
      const body = code.slice(code.indexOf('<%_') + 3, code.indexOf('_%>'));
      new Function('setLocalVar', body)(context.setLocalVar);
      return '';
    },
    async saveVariables() {
      calls.push(['saveVariables']);
    },
  };

  await withFakeWindow(fakeWindow, () =>
    writeStatusGallerySnapshotToCurrentChat(
      '克瑞西达',
      [{ title: '状态栏立绘', url: 'https://files.catbox.moe/status.png' }],
      true,
    ),
  );

  assert.deepEqual(writes, [
    [
      'status.externalGalleries.partners["克瑞西达"].images',
      [{ title: '状态栏立绘', url: 'https://files.catbox.moe/status.png' }],
    ],
  ]);
  assert.equal(calls[0][1].when, 'char-info-creator-status-gallery-save');
  assert.deepEqual(calls[1], ['saveVariables']);
});

test('缺少 saveVariables 时拒绝假装应用成功', async () => {
  const fakeWindow = {};
  fakeWindow.parent = fakeWindow;
  fakeWindow.EjsTemplate = {
    async prepareContext() {
      return {};
    },
    async evalTemplate() {
      return '';
    },
  };

  await assert.rejects(
    withFakeWindow(fakeWindow, () => evaluateManagedEjs('managed-only', false)),
    /未检测到 ST-Prompt-Template 的 EjsTemplate 接口/,
  );
});
