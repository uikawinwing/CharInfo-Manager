import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const viewerBundlePath = new URL('../../dist/char_info_viewer_runtime/index.js', import.meta.url);
const creatorBundlePath = new URL('../../dist/char_info_creator_manager/index.js', import.meta.url);

test('Viewer 包含玩家世界书库但不包含 Creator 编辑器，Creator 只包含编辑实现', () => {
  const viewerBundle = readFileSync(viewerBundlePath, 'utf8');
  const creatorBundle = readFileSync(creatorBundlePath, 'utf8');

  assert.doesNotMatch(viewerBundle, /char_info_creator_manager|data-v-02fe2442/u);
  assert.match(viewerBundle, /世界书角色库/u);
  assert.match(viewerBundle, /条目开关后的读回验证失败/u);
  assert.match(creatorBundle, /char-info-creator-manager/u);
  assert.doesNotMatch(creatorBundle, /世界书角色库|条目开关后的读回验证失败/u);
  assert.ok(statSync(creatorBundlePath).size > 100 * 1024);
  assert.ok(statSync(creatorBundlePath).size < statSync(viewerBundlePath).size);
});
