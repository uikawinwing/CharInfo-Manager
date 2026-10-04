import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const navPath = new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedTabNav.vue', import.meta.url);
const sheetPath = new URL(
  '../../src/char_info_viewer/components/illustrated/default/IllustratedDefaultSheet.vue',
  import.meta.url,
);
const controllerPath = new URL(
  '../../src/char_info_viewer/components/illustrated/core/useIllustratedSheetController.ts',
  import.meta.url,
);
const [navSource, sheetSource, controllerSource] = await Promise.all([
  readFile(navPath, 'utf8'),
  readFile(sheetPath, 'utf8'),
  readFile(controllerPath, 'utf8'),
]);

test('mobile illustrated character navigation keeps the main page outside the scrolling detail tabs', () => {
  assert.match(navSource, /const homeTab = computed\(\(\) => props\.tabs\.find\(tab => tab\.key === 'overview'\)/);
  assert.match(navSource, /const detailTabs = computed\(\(\) => props\.tabs\.filter\(tab => tab\.key !== 'overview'\)/);
  assert.match(
    navSource,
    /<button[\s\S]*?v-if="homeTab"[\s\S]*?class="illustrated-tab-button illustrated-home-button"[\s\S]*?@click="\$emit\('setTab', homeTab\.key\)"[\s\S]*?>[\s\S]*?{{ homeTab\.label }}/,
  );
  assert.match(
    navSource,
    /<div class="illustrated-tab-scroll">[\s\S]*?v-for="tab in detailTabs"[\s\S]*?<\/div>[\s\S]*?illustrated-nav-save-button/,
  );
});

test('mobile illustrated character navigation exposes active state and reliable touch targets', () => {
  assert.match(navSource, /:aria-current="activeTab === [^?]+ \? 'page' : undefined"/);
  assert.match(navSource, /\.illustrated-tab-button\s*\{[^}]*min-height:\s*44px;/);
  assert.match(
    navSource,
    /@mixin illustrated-compact-tabs[\s\S]*?#\{\$root\} \.illustrated-tab-scroll\s*\{[^}]*overflow-x:\s*auto;/,
  );
  assert.match(
    navSource,
    /@mixin illustrated-compact-tabs[\s\S]*?#\{\$root\} \.illustrated-home-button,[\s\S]*?#\{\$root\} \.illustrated-nav-save-button\s*\{[^}]*flex:\s*0 0 auto;/,
  );
});

test('立绘角色卡 navigation keeps the current six tabs without DX-only story tabs', () => {
  // tab 列表已归 core controller 所有，renderer 只解构消费。
  assert.match(
    controllerSource,
    /const tabs = computed<IllustratedTab\[\]>\(\(\) => \[[\s\S]*?\{ key: 'overview', label: '首页' \},[\s\S]*?\{ key: 'characterPanel', label: '面板' \},[\s\S]*?\{ key: 'profile', label: '档案' \},[\s\S]*?\{ key: 'skills', label: '技能' \},[\s\S]*?\{ key: 'holdings', label: '持有' \},[\s\S]*?\{ key: 'divinity', label: '登神' \},[\s\S]*?\]\);/,
  );
  assert.match(sheetSource, /^\s+tabs,$/m);
  assert.doesNotMatch(sheetSource, /mergedTabs|characterStory|illustratedTabOrder|availableKeys|available:/);
  assert.doesNotMatch(navSource, /:disabled="!tab\.available"|暂无\$\{tab\.label\}资料/);
});

test('illustrated navigation keeps one shared responsive navigation template', () => {
  assert.equal((navSource.match(/<nav[\s\S]*?class="illustrated-tabs"/g) ?? []).length, 1);
  assert.match(navSource, /@container char-info-viewer \(min-width: 901px\)/);
  assert.match(navSource, /@mixin illustrated-mobile-side-rail/);
});
