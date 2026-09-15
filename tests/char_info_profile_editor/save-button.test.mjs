import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_profile_editor/App.vue', import.meta.url), 'utf8');

test('角色档案编辑器 Step 5 用一个主 Save 完成持久化、即时同步与刷新', () => {
  assert.match(appSource, /<form\s+v-if="proMode"\s+v-show="activeStep !== 1"[\s\S]*@submit\.prevent="saveToEntry"/u);
  assert.match(appSource, /id="manager-step-5"[\s\S]*class="save-bar"[\s\S]*type="submit"/u);
  assert.match(appSource, /保存并立即生效/u);
  assert.match(appSource, /title="保存角色档案，并立即同步当前聊天变量、状态栏与角色卡"/u);
  assert.doesNotMatch(appSource, />即时写入变量及状态栏</u);
  assert.match(appSource, /async function saveToEntry\(\)[\s\S]*?saveFlashProfileToCurrentChatWorldbook\(normalizedProfile\)/u);
  assert.match(appSource, /async function saveToEntry\(\)[\s\S]*?const applied = await applyCurrentProfileToCurrentChat\(\)/u);
  assert.match(appSource, /await props\.onForceRefresh\?\.\(\)/u);
  assert.match(appSource, /世界书中的保存内容不会丢失/u);
  assert.match(appSource, /:disabled="!canSave"/u);
});

test('Save bar remains renderable on desktop and responsive layouts', () => {
  const saveBarRules = [...appSource.matchAll(/\.save-bar\s*\{([\s\S]*?)\}/gu)].map(match => match[1]);
  assert.ok(saveBarRules.length >= 2, '应存在基础和响应式 save-bar 规则');
  for (const rule of saveBarRules) assert.doesNotMatch(rule, /display\s*:\s*none/u);
  assert.match(appSource, /\.section-title-row,\s*\.output-heading,\s*\.save-bar\s*\{[\s\S]*display:\s*flex/u);
});
