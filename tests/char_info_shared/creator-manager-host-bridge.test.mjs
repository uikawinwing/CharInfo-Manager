import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const bridgeSource = await readFile(
  new URL('../../src/char_info_shared/creatorManagerHostBridge.ts', import.meta.url),
  'utf8',
);

test('Viewer 与 Creator 合包后不再保留可调用的全局宿主桥接', () => {
  assert.doesNotMatch(bridgeSource, /__charInfoCreatorManagerHostBridge/u);
  assert.doesNotMatch(bridgeSource, /registerCreatorManagerHostBridge|getCreatorManagerHostBridge/u);
  assert.match(bridgeSource, /Deprecated compatibility stub/u);
});
