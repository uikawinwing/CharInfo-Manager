import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMediaSourceTimeout,
  nextMediaSourceIndex,
} from '../../src/char_info_viewer/services/mediaSourceFallback.ts';

test('备用媒体来源按顺序前进，最后一个来源失败后才耗尽', () => {
  assert.equal(nextMediaSourceIndex(0, 3), 1);
  assert.equal(nextMediaSourceIndex(1, 3), 2);
  assert.equal(nextMediaSourceIndex(2, 3), null);
  assert.equal(nextMediaSourceIndex(0, 1), null);
});

test('媒体来源加载超时会触发 fallback，成功加载可取消超时', async () => {
  let timeoutCount = 0;
  const timeout = createMediaSourceTimeout(() => {
    timeoutCount += 1;
  }, 20);

  timeout.arm();
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(timeoutCount, 1);

  timeout.arm();
  timeout.clear();
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(timeoutCount, 1);

  timeout.dispose();
  timeout.arm();
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(timeoutCount, 1);
});
