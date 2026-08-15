import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

test('Creator Step 5 renders a real submit action wired to saveToEntry', () => {
  assert.match(appSource, /<form\s+v-show="activeStep !== 1"[\s\S]*@submit\.prevent="saveToEntry"/u);
  assert.match(appSource, /id="manager-step-5"[\s\S]*class="save-bar"[\s\S]*type="submit"/u);
  assert.match(appSource, /保存并写入所选条目/u);
  assert.match(appSource, /:disabled="!canSave"/u);
});

test('Save bar remains renderable on desktop and responsive layouts', () => {
  const saveBarRules = [...appSource.matchAll(/\.save-bar\s*\{([\s\S]*?)\}/gu)].map(match => match[1]);
  assert.ok(saveBarRules.length >= 2, '应存在基础和响应式 save-bar 规则');
  for (const rule of saveBarRules) assert.doesNotMatch(rule, /display\s*:\s*none/u);
  assert.match(appSource, /\.section-title-row,\s*\.output-heading,\s*\.save-bar\s*\{[\s\S]*display:\s*flex/u);
});
