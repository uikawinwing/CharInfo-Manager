import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateManagedEjs } from '../../src/char_info_creator_manager/ejsRuntime.ts';

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
