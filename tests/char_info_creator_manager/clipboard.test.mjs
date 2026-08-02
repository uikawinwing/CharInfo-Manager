import assert from 'node:assert/strict';
import test from 'node:test';

import { copyTextWithFallback } from '../../src/char_info_creator_manager/clipboard.ts';

test('页面失去焦点导致 Clipboard API 失败时，改用兼容复制路径', async () => {
  let fallbackPayload = '';
  const method = await copyTextWithFallback('visual-package-json', {
    writeText: async () => {
      throw new Error("Failed to execute 'writeText' on 'Clipboard': Document is not focused.");
    },
    fallbackCopy: text => {
      fallbackPayload = text;
      return true;
    },
  });

  assert.equal(method, 'fallback');
  assert.equal(fallbackPayload, 'visual-package-json');
});

test('Clipboard API 正常时不调用备用复制', async () => {
  let fallbackCalled = false;
  const method = await copyTextWithFallback('visual-package-json', {
    writeText: async () => {},
    fallbackCopy: () => {
      fallbackCalled = true;
      return true;
    },
  });

  assert.equal(method, 'clipboard');
  assert.equal(fallbackCalled, false);
});
