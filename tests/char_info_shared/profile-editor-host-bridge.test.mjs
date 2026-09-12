import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const bridgeSource = await readFile(
  new URL('../../src/char_info_shared/profileEditorHostBridge.ts', import.meta.url),
  'utf8',
);

test('角色查看器与角色档案编辑器合包后不再保留可调用的全局宿主桥接', () => {
  assert.doesNotMatch(bridgeSource, /__charInfoProfileEditorHostBridge/u);
  assert.doesNotMatch(bridgeSource, /registerProfileEditorHostBridge|getProfileEditorHostBridge/u);
  assert.match(bridgeSource, /Deprecated compatibility stub/u);
});
