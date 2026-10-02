import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { copyTextWithFallback } from '../../src/char_info_profile_editor/clipboard.ts';

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

test('Step 5 复制只显示独立反馈，不会把保存流程标记为成功', () => {
  const appSource = readFileSync(new URL('../../src/char_info_profile_editor/App.vue', import.meta.url), 'utf8');
  const copyHandler = appSource.match(/async function copyEjs\(\) \{[\s\S]*?\n\}/u)?.[0] ?? '';

  assert.match(appSource, /copyState === 'success' \? '✓ 已复制' : '复制写入内容'/u);
  assert.match(copyHandler, /copyState\.value = 'success'/u);
  assert.doesNotMatch(copyHandler, /saveState\.value/u);
  assert.doesNotMatch(copyHandler, /saveMessage\.value/u);
  assert.match(copyHandler, /showEditorNotice\('浏览器阻止了自动复制/u);
});
