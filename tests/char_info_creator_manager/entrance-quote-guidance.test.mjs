import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

test('登场台词提供截图友好的软性字数提示，不截断作者内容', () => {
  assert.match(appSource, /建议中文姓名不超过 12 字；英文姓名可适当放宽。/u);
  assert.match(appSource, /建议 12–32 字；超过 48 字时，首页最多显示三行，完整内容仍会保存。/u);
  assert.match(appSource, /profile\.entranceQuote\.length > 48/u);
  assert.doesNotMatch(appSource, /<textarea[^>]*v-model="profile\.entranceQuote"[^>]*maxlength=/u);
});
