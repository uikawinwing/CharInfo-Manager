import assert from 'node:assert/strict';
import test from 'node:test';

import { enqueueDxCharacterImport } from '../../src/char_info_viewer/services/dxCharacterImportQueue.ts';

test('同一消息与 swipe 的 DX 角色导入会串行执行', async () => {
  const order = [];
  let releaseFirst;
  const firstGate = new Promise(resolve => {
    releaseFirst = resolve;
  });

  const first = enqueueDxCharacterImport('chat-a\u00002\u00001', async () => {
    order.push('first:start');
    await firstGate;
    order.push('first:end');
  });
  const second = enqueueDxCharacterImport('chat-a\u00002\u00001', async () => {
    order.push('second:start');
  });

  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(order, ['first:start']);

  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first:start', 'first:end', 'second:start']);
});

test('前一个导入失败不会阻塞同键后续导入', async () => {
  const order = [];
  const first = enqueueDxCharacterImport('chat-b\u00003\u00000', async () => {
    order.push('first');
    throw new Error('expected failure');
  });
  const second = enqueueDxCharacterImport('chat-b\u00003\u00000', async () => {
    order.push('second');
  });

  await assert.rejects(first, /expected failure/);
  await second;
  assert.deepEqual(order, ['first', 'second']);
});
