import assert from 'node:assert/strict';
import test from 'node:test';

import { enqueueSpecialNpcImport } from '../../src/char_info_viewer/services/specialNpcImportQueue.ts';

test('同一消息与 swipe 的特殊 NPC 导入会串行执行', async () => {
  const order = [];
  let releaseFirst;
  const firstGate = new Promise(resolve => {
    releaseFirst = resolve;
  });

  const first = enqueueSpecialNpcImport('chat-a\u00002\u00001', async () => {
    order.push('first:start');
    await firstGate;
    order.push('first:end');
  });
  const second = enqueueSpecialNpcImport('chat-a\u00002\u00001', async () => {
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
  const first = enqueueSpecialNpcImport('chat-b\u00003\u00000', async () => {
    order.push('first');
    throw new Error('expected failure');
  });
  const second = enqueueSpecialNpcImport('chat-b\u00003\u00000', async () => {
    order.push('second');
  });

  await assert.rejects(first, /expected failure/);
  await second;
  assert.deepEqual(order, ['first', 'second']);
});
