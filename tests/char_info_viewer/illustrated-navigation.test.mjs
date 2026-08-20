import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const navPath = new URL('../../src/char_info_viewer/components/illustrated/IllustratedTabNav.vue', import.meta.url);
const sheetPath = new URL(
  '../../src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue',
  import.meta.url,
);
const [navSource, sheetSource] = await Promise.all([readFile(navPath, 'utf8'), readFile(sheetPath, 'utf8')]);

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

test('Special NPC navigation keeps the current six tabs without DX-only story tabs', () => {
  assert.match(
    sheetSource,
    /const tabs = computed<IllustratedTab\[\]>\(\(\) => \[[\s\S]*?\{ key: 'overview', label: '首页' \},[\s\S]*?\{ key: 'characterPanel', label: '面板' \},[\s\S]*?\{ key: 'profile', label: '档案' \},[\s\S]*?\{ key: 'skills', label: '技能' \},[\s\S]*?\{ key: 'holdings', label: '持有' \},[\s\S]*?\{ key: 'divinity', label: '登神' \},[\s\S]*?\]\);/,
  );
  assert.doesNotMatch(sheetSource, /mergedTabs|characterStory|illustratedTabOrder|availableKeys|available:/);
  assert.doesNotMatch(navSource, /:disabled="!tab\.available"|暂无\$\{tab\.label\}资料/);
});

test('desktop illustrated character navigation uses content-sized buttons in one centered row', () => {
  assert.match(
    navSource,
    /\.illustrated-tabs\s*\{[^}]*width:\s*fit-content;[^}]*max-width:\s*100%;[^}]*justify-content:\s*center;[^}]*margin:\s*0 auto;/,
  );
  assert.match(
    navSource,
    /\.illustrated-tab-scroll\s*\{[^}]*display:\s*flex;[^}]*flex:\s*0 1 auto;[^}]*flex-wrap:\s*nowrap;[^}]*gap:\s*4px;[^}]*overflow-x:\s*auto;/,
  );
  const detailButtonRule = navSource.match(/\.illustrated-tab-scroll \.illustrated-tab-button\s*\{[^}]*\}/)?.[0];
  assert.ok(detailButtonRule);
  assert.match(detailButtonRule, /flex:\s*0 0 auto;/);
  assert.match(detailButtonRule, /width:\s*auto;/);
  assert.match(detailButtonRule, /min-width:\s*56px;/);
  assert.match(detailButtonRule, /justify-content:\s*center;/);
  assert.match(
    navSource,
    /\.illustrated-tab-button\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*text-align:\s*center;/,
  );
});
