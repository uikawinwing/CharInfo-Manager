import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

test('Creator Step 5 separates worldbook save from immediate chat/status write', () => {
  assert.match(appSource, /<form\s+v-show="activeStep !== 1"[\s\S]*@submit\.prevent="saveToEntry"/u);
  assert.match(appSource, /id="manager-step-5"[\s\S]*class="save-bar"[\s\S]*type="submit"/u);
  assert.match(appSource, /保存到世界书/u);
  assert.match(appSource, /即时写入变量及状态栏/u);
  assert.match(appSource, /@click="applyCurrentProfileToCurrentChat"/u);
  assert.match(appSource, /title="仅保存到世界书条目，不修改当前聊天变量"/u);
  assert.match(appSource, /title="立即写入当前聊天的 CharInfo 变量、状态栏头像与状态栏相簿"/u);
  assert.match(appSource, /:disabled="!canSave"/u);
});

test('Save bar remains renderable on desktop and responsive layouts', () => {
  const saveBarRules = [...appSource.matchAll(/\.save-bar\s*\{([\s\S]*?)\}/gu)].map(match => match[1]);
  assert.ok(saveBarRules.length >= 2, '应存在基础和响应式 save-bar 规则');
  for (const rule of saveBarRules) assert.doesNotMatch(rule, /display\s*:\s*none/u);
  assert.match(appSource, /\.section-title-row,\s*\.output-heading,\s*\.save-bar\s*\{[\s\S]*display:\s*flex/u);
});
