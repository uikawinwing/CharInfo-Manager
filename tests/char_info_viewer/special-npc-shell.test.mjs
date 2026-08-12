import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const shellPath = new URL('../../src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue', import.meta.url);
const navigationPath = new URL('../../src/char_info_viewer/components/illustrated/IllustratedTabNav.vue', import.meta.url);
const itemCardPath = new URL('../../src/char_info_viewer/components/illustrated/IllustratedItemCard.vue', import.meta.url);
const profilePanelPath = new URL(
  '../../src/char_info_viewer/components/illustrated/IllustratedProfilePanel.vue',
  import.meta.url,
);
const panelPath = new URL('../../src/char_info_viewer/components/illustrated/IllustratedCharacterPanel.vue', import.meta.url);
const defaultDivinityPath = new URL(
  '../../src/char_info_viewer/components/illustrated/IllustratedDefaultDivinityPanel.vue',
  import.meta.url,
);
const appPath = new URL('../../src/char_info_viewer/App.vue', import.meta.url);

test('Special NPC 沿用有立绘页面，并将导航作为桌面右侧栏和移动底栏', async () => {
  const [sheet, navigation] = await Promise.all([readFile(shellPath, 'utf8'), readFile(navigationPath, 'utf8')]);
  assert.match(sheet, /<IllustratedTabNav[\s\S]*?v-if="specialNpc"[\s\S]*?side-rail/);
  assert.match(sheet, /'is-special-npc': specialNpc/);
  assert.match(navigation, /\.illustrated-tabs\.is-side-rail/);
  assert.match(navigation, /@media \(min-width: 901px\)/);
  assert.match(navigation, /flex:\s*0 0 72px/);
  assert.match(navigation, /illustrated-tab-icon/);
  assert.match(navigation, /grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(navigation, /\.illustrated-tabs\.is-side-rail \.illustrated-tab-scroll\s*\{[\s\S]*?display:\s*contents/);
  assert.doesNotMatch(navigation, /\b(?:d)?vh\b/);
});

test('Special NPC 手机卡片使用 2:3 固定比例，技能沿用预览的紧凑行式布局', async () => {
  const [sheet, itemCard] = await Promise.all([readFile(shellPath, 'utf8'), readFile(itemCardPath, 'utf8')]);
  assert.match(sheet, /\.illustrated-wrapper\.is-special-npc\s*\{[\s\S]*?max-width:\s*min\(100%, 414px\)/);
  assert.match(sheet, /\.illustrated-shell\.is-special-npc\s*\{[\s\S]*?aspect-ratio:\s*2 \/ 3/);
  assert.match(sheet, /:variant="specialNpc \? 'skill' : 'item'"/);
  assert.match(itemCard, /'is-compact-skill': isSkillVariant/);
  assert.match(itemCard, /\.illustrated-list-item\.is-compact-row\s*\{[\s\S]*?background:\s*transparent/);
});

test('Special NPC 档案隐藏属性与资源，持有沿用技能的紧凑行式布局', async () => {
  const [sheet, profilePanel, itemCard] = await Promise.all([
    readFile(shellPath, 'utf8'),
    readFile(profilePanelPath, 'utf8'),
    readFile(itemCardPath, 'utf8'),
  ]);
  assert.match(sheet, /:show-stats="!specialNpc"/);
  assert.match(profilePanel, /v-if="showStats"[\s\S]*?class="illustrated-mobile-profile-stats"/);
  assert.match(profilePanel, /'is-compact-profile': !showStats/);
  assert.match(
    profilePanel,
    /\.illustrated-info-grid\.is-compact-profile \.illustrated-text-block\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none/,
  );
  assert.equal((sheet.match(/:variant="specialNpc \? 'holding' : 'item'"/g) ?? []).length, 2);
  assert.match(itemCard, /variant\?: 'item' \| 'skill' \| 'holding' \| 'status'/);
  assert.match(itemCard, /'is-compact-holding': isHoldingVariant/);
  assert.match(itemCard, /isCompactVariant = computed\(\(\) => isSkillVariant\.value \|\| isHoldingVariant\.value\)/);
});

test('Special NPC 手机首页将台词与资料直接叠在立绘渐变上，不保留双层矩形卡', async () => {
  const sheet = await readFile(shellPath, 'utf8');
  assert.match(
    sheet,
    /\.illustrated-shell\.is-special-npc\.is-overview-tab \.illustrated-portrait-pane::after\s*\{[\s\S]*?linear-gradient/,
  );
  assert.match(
    sheet,
    /\.illustrated-shell\.is-special-npc\.is-overview-tab \.illustrated-mobile-entrance-quote\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none/,
  );
  assert.match(
    sheet,
    /\.illustrated-shell\.is-special-npc\.is-overview-tab \.illustrated-mobile-header-overlay\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none/,
  );
  assert.match(sheet, /:deep\(\.illustrated-name:not\(\.illustrated-name-measure\)\)\s*\{[\s\S]*?order:\s*1/);
  assert.match(sheet, /:deep\(\.illustrated-subtitle\)\s*\{[\s\S]*?order:\s*2/);
  assert.match(sheet, /:deep\(\.illustrated-level-tier\)\s*\{[\s\S]*?order:\s*3/);
});

test('Special NPC 把装备与背包合并为持有，并在角色面板显示雷达而非首页 flag', async () => {
  const [sheet, panel] = await Promise.all([readFile(shellPath, 'utf8'), readFile(panelPath, 'utf8')]);
  assert.match(sheet, /key: 'holdings', label: '持有'/);
  assert.match(sheet, /activeSpecialTab === 'holdings'/);
  assert.match(sheet, /activeSpecialTab === 'characterPanel'/);
  assert.match(panel, /class="illustrated-radar"/);
  assert.match(panel, /v-if="statusEffects\.length > 0"/);
  assert.doesNotMatch(panel, /illustrated-attribute/);
});

test('Special NPC 手机登神页使用紧凑分隔行，不沿用 DX 的厚重卡片', async () => {
  const [sheet, defaultDivinity] = await Promise.all([
    readFile(shellPath, 'utf8'),
    readFile(defaultDivinityPath, 'utf8'),
  ]);
  assert.match(sheet, /<IllustratedDivinityPanel[\s\S]*?:compact="specialNpc"/);
  assert.match(defaultDivinity, /'is-compact': compact/);
  assert.match(
    defaultDivinity,
    /\.illustrated-default-divinity\.is-compact \.default-divinity-card\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none/,
  );
  assert.match(defaultDivinity, /\.illustrated-default-divinity\.is-compact \.default-divinity-card p\s*\{[\s\S]*?font-size:\s*11px !important/);
});

test('App 在 Special NPC 分支复用有立绘页面，而不是挂载独立空壳', async () => {
  const source = await readFile(appPath, 'utf8');
  assert.match(source, /<IllustratedCharacterSheet[\s\S]*?v-if="\(shouldShowIllustratedLayout \|\| shouldShowSpecialNpcLayout\) && vm"/);
  assert.match(source, /:special-npc="shouldShowSpecialNpcLayout"/);
  assert.doesNotMatch(source, /SpecialNpcShell/);
  assert.match(source, /vm\.value\?\.layoutKind === 'special_npc' && !illustratedFallbackActive\.value/);
  assert.match(source, /'special-npc-viewer-root': shouldShowSpecialNpcLayout/);
  assert.match(source, /\.viewer-root\.special-npc-viewer-root\s*\{\s*min-height:\s*0;/);
});
