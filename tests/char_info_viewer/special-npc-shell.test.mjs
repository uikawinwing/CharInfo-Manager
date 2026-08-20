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
  assert.match(sheet, /v-if="specialNpc"[\s\S]*?:show-import-action="!readOnly"/);
  assert.match(sheet, /'is-special-npc': specialNpc/);
  assert.match(navigation, /\.illustrated-tabs\.is-side-rail/);
  assert.match(navigation, /@media \(min-width: 901px\)/);
  assert.match(navigation, /flex:\s*0 0 72px/);
  assert.match(navigation, /illustrated-tab-icon/);
  assert.match(navigation, /\.illustrated-tabs\.is-side-rail \.illustrated-tab-navigation-group\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?justify-content:\s*center/);
  assert.match(navigation, /\.illustrated-tabs\.is-side-rail \.illustrated-nav-action\s*\{[\s\S]*?margin-top:\s*10px;[\s\S]*?border-top:/);
  assert.match(navigation, /\.illustrated-tabs\.is-side-rail \.illustrated-nav-save-button\s*\{[\s\S]*?flex-direction:\s*column;[\s\S]*?border-radius:\s*10px/);
  assert.match(navigation, /grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(navigation, /\.illustrated-tabs\.is-side-rail \.illustrated-tab-scroll\s*\{[\s\S]*?display:\s*contents/);
  assert.doesNotMatch(navigation, /\b(?:d)?vh\b/);
});

test('Special NPC 手机卡片使用 2:3 固定比例，技能沿用紧凑但可读的移动排版', async () => {
  const [sheet, itemCard] = await Promise.all([readFile(shellPath, 'utf8'), readFile(itemCardPath, 'utf8')]);
  assert.match(sheet, /\.illustrated-wrapper\.is-special-npc\s*\{[\s\S]*?max-width:\s*min\(100%, 414px\)/);
  assert.match(sheet, /\.illustrated-shell\.is-special-npc\s*\{[\s\S]*?aspect-ratio:\s*2 \/ 3/);
  assert.match(sheet, /:variant="specialNpc \? 'skill' : 'item'"/);
  assert.match(sheet, /v-for="group in groupedSkills"/);
  assert.match(sheet, /\{ key: 'active', title: '主动技能', icon: '◆', items: \[\] \}[\s\S]*?\{ key: 'passive', title: '被动技能', icon: '◎', items: \[\] \}[\s\S]*?\{ key: 'other', title: '其他技能', icon: '✦', items: \[\] \}/);
  assert.match(sheet, /if \(type\.includes\('主动'\) \|\| type\.includes\('主動'\)\) return 'active'/);
  assert.match(sheet, /if \(type\.includes\('被动'\) \|\| type\.includes\('被動'\)\) return 'passive'/);
  assert.match(sheet, /class="illustrated-group-icon" aria-hidden="true">\{\{ group\.icon \}\}<\/span>/);
  assert.match(sheet, /class="illustrated-section illustrated-skill-group illustrated-group-panel"/);
  assert.match(sheet, /:aria-expanded="!isGroupCollapsed\(`skill:\$\{group\.key\}`\)"/);
  assert.match(sheet, /v-show="!isGroupCollapsed\(`skill:\$\{group\.key\}`\)" class="illustrated-group-body"/);
  assert.match(sheet, /const collapsedGroupKeys = ref<string\[\]>\(\[\]\)/);
  assert.match(sheet, /function toggleGroup\(key: string\): void/);
  assert.match(sheet, /v-if="hideRedundantDetailTitle" class="illustrated-detail-title-spacer"/);
  assert.match(sheet, /hideRedundantDetailTitle = computed\(\(\) => props\.specialNpc && !isOverviewTab\.value\)/);
  assert.match(itemCard, /'is-compact-skill': isSkillVariant/);
  assert.match(itemCard, /\.illustrated-list-item\.is-compact-row\s*\{[\s\S]*?background:\s*transparent/);
  assert.match(
    itemCard,
    /@media \(max-width: 640px\)[\s\S]*?\.illustrated-list-item\.is-compact-skill h3\s*\{[\s\S]*?font-size:\s*16px/,
  );
  assert.match(itemCard, /if \(type\.includes\('主动'\)\) return 'active'/);
  assert.match(itemCard, /if \(type\.includes\('被动'\)\) return 'passive'/);
  assert.match(itemCard, /if \(skillKind\.value === 'active'\) return '◆'/);
  assert.match(itemCard, /if \(skillKind\.value === 'passive'\) return '◎'/);
  assert.doesNotMatch(itemCard, /\[\{\{\s*typeText\s*\}\}\]/);
  assert.match(itemCard, /class="illustrated-list-item-body"/);
  assert.match(itemCard, /\.illustrated-list-item\.is-compact-row \.illustrated-list-item-body\s*\{[\s\S]*?padding-left:\s*20px/);
  assert.match(itemCard, /\.illustrated-list-item\.is-compact-skill h3::before\s*\{[\s\S]*?content:\s*none/);
  assert.match(
    itemCard,
    /\.illustrated-list-item\.is-compact-skill \.illustrated-effect-item\s*\{[\s\S]*?font-size:\s*12\.5px !important;[\s\S]*?line-height:\s*1\.58 !important/,
  );
  assert.match(
    itemCard,
    /\.illustrated-list-item\.is-compact-skill \.illustrated-description\s*\{[\s\S]*?color:\s*#9ca4ad;[\s\S]*?font-size:\s*10\.5px !important/,
  );
  assert.match(sheet, /\.illustrated-shell\.is-special-npc\.is-skills-tab \.illustrated-data-pane\s*\{[\s\S]*?66%/);
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
  assert.match(sheet, /class="illustrated-section illustrated-holding-section illustrated-group-panel"/);
  assert.match(sheet, /class="illustrated-group-icon" aria-hidden="true">▣<\/span>/);
  assert.match(sheet, /class="illustrated-group-icon" aria-hidden="true">◈<\/span>/);
  assert.match(sheet, /:aria-expanded="!isGroupCollapsed\('holding:equipment'\)"/);
  assert.match(sheet, /v-show="!isGroupCollapsed\('holding:equipment'\)" class="illustrated-group-body"/);
  assert.match(sheet, /\.illustrated-detail-title-spacer\s*\{[\s\S]*?border-bottom:\s*1px solid rgba\(255, 255, 255, 0\.08\)/);
  assert.match(sheet, /\.illustrated-group-panel\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?margin-inline:\s*10px 14px;[\s\S]*?border:\s*1px solid rgba\(var\(--illustrated-tier-accent-rgb\), 0\.2\)/);
  assert.match(sheet, /\.illustrated-group-body\s*\{[\s\S]*?padding:\s*2px 10px 8px/);
  assert.match(sheet, /\.illustrated-group-toggle\s*\{[\s\S]*?grid-template-columns:\s*13px minmax\(0, 1fr\) 18px;[\s\S]*?padding:\s*8px 14px 8px 10px;[\s\S]*?font-size:\s*14px/);
  assert.match(sheet, /class="illustrated-group-chevron" aria-hidden="true"><\/span>/);
  assert.match(sheet, /\.illustrated-group-chevron::before,[\s\S]*?\.illustrated-group-chevron::after\s*\{[\s\S]*?background:\s*currentColor/);
  assert.match(sheet, /\.illustrated-group-panel\.is-collapsed \.illustrated-group-chevron\s*\{[\s\S]*?rotate\(-90deg\)/);
  assert.match(sheet, /\.illustrated-panels::-webkit-scrollbar\s*\{[\s\S]*?display:\s*none/);
  assert.match(sheet, /\.illustrated-panels\s*\{[\s\S]*?overflow-y:\s*auto;[\s\S]*?scrollbar-width:\s*none/);
  assert.match(sheet, /@media \(max-width: 640px\)[\s\S]*?\.illustrated-group-panel\s*\{[\s\S]*?margin-inline:\s*6px/);
  assert.match(sheet, /@media \(max-width: 640px\)[\s\S]*?\.illustrated-group-toggle\s*\{[\s\S]*?padding:\s*7px 12px 7px 28px;[\s\S]*?font-size:\s*12px/);
  assert.match(
    itemCard,
    /@media \(max-width: 640px\)[\s\S]*?\.illustrated-list-item\.is-compact-holding\s*\{[\s\S]*?margin:\s*0 8px;[\s\S]*?padding:\s*14px 14px 15px/,
  );
  assert.match(
    itemCard,
    /\.illustrated-list-item\.is-compact-holding \.illustrated-effect-item\s*\{[\s\S]*?font-size:\s*12\.5px !important;[\s\S]*?line-height:\s*1\.58 !important/,
  );
  assert.match(
    itemCard,
    /\.illustrated-list-item\.is-compact-holding \.illustrated-description\s*\{[\s\S]*?font-size:\s*10\.5px !important;[\s\S]*?font-style:\s*normal/,
  );
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
  assert.match(
    sheet,
    /\.illustrated-shell\.is-special-npc\.is-overview-tab[\s\S]*?:deep\(\.illustrated-subtitle\),[\s\S]*?:deep\(\.illustrated-level-tier\)\s*\{[\s\S]*?display:\s*none/,
  );
});

test('Special NPC 手机详情沿用当前立绘静态快照，并把 Save 收进六项底栏右侧操作位', async () => {
  const [sheet, navigation, panel] = await Promise.all([
    readFile(shellPath, 'utf8'),
    readFile(navigationPath, 'utf8'),
    readFile(panelPath, 'utf8'),
  ]);
  assert.match(sheet, /ref="detailWallpaperCanvas"/);
  assert.match(sheet, /\.illustrated-mobile-detail-wallpaper\s*\{\s*display:\s*none/);
  assert.match(sheet, /@media \(max-width: 900px\)[\s\S]*?\.illustrated-mobile-detail-wallpaper\s*\{[\s\S]*?display:\s*block/);
  assert.match(sheet, /context\.drawImage\(source,/);
  assert.match(sheet, /activeSpecialTab\.value === 'overview' && tab !== 'overview'/);
  assert.match(sheet, /ref="portraitImageElement"/);
  assert.match(sheet, /ref="portraitVideoElement"/);
  assert.match(navigation, /grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\) 44px/);
  assert.match(
    navigation,
    /\.illustrated-tabs\.is-side-rail \.illustrated-nav-action\s*\{[\s\S]*?position:\s*static;[\s\S]*?border-left:/,
  );
  assert.match(navigation, /\.illustrated-nav-save-button > span:last-child\s*\{[\s\S]*?display:\s*none/);
  assert.match(panel, /class="illustrated-mobile-character-summary"/);
  assert.match(panel, /<dt>生命层级<\/dt>/);
  assert.match(panel, /<dt>职业<\/dt>/);
});

test('Special NPC 把装备与背包合并为持有，并把资源集中到第二项角色面板', async () => {
  const [sheet, panel] = await Promise.all([readFile(shellPath, 'utf8'), readFile(panelPath, 'utf8')]);
  assert.match(sheet, /key: 'holdings', label: '持有'/);
  assert.match(sheet, /activeSpecialTab === 'holdings'/);
  assert.match(
    sheet,
    /\{ key: 'overview', label: '首页' \},\s*\{ key: 'characterPanel', label: '面板' \},\s*\{ key: 'profile', label: '档案' \}/,
  );
  assert.match(sheet, /IllustratedOverviewPanel[\s\S]*?:resource-boxes="\[\]"/);
  assert.match(sheet, /activeSpecialTab === 'characterPanel'/);
  assert.match(panel, /class="illustrated-radar"/);
  assert.match(panel, /class="illustrated-panel-resources"/);
  assert.match(panel, /v-if="statusEffects\.length > 0"/);
  assert.doesNotMatch(panel, /illustrated-attribute/);
});

test('Special NPC 手机登神页使用紧凑分隔行', async () => {
  const [sheet, defaultDivinity] = await Promise.all([
    readFile(shellPath, 'utf8'),
    readFile(defaultDivinityPath, 'utf8'),
  ]);
  assert.match(sheet, /<IllustratedDefaultDivinityPanel[\s\S]*?:compact="specialNpc"/);
  assert.match(defaultDivinity, /'is-compact': compact/);
  assert.match(defaultDivinity, /v-if="!compact \|\| vm\.divinityGodTitle \|\| vm\.divinityKingdom" class="default-divinity-hero"/);
  assert.match(defaultDivinity, /<h3 v-if="vm\.divinityGodTitle \|\| !compact">\{\{ vm\.divinityGodTitle \|\| '登神长阶' \}\}<\/h3>/);
  assert.match(
    defaultDivinity,
    /\.illustrated-default-divinity\.is-compact \.default-divinity-card\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none/,
  );
  assert.match(defaultDivinity, /\.illustrated-default-divinity\.is-compact \.default-divinity-card p\s*\{[\s\S]*?font-size:\s*11px !important/);
});

test('App 在 Special NPC 分支复用有立绘页面，而不是挂载独立空壳', async () => {
  const source = await readFile(appPath, 'utf8');
  assert.match(source, /<IllustratedCharacterSheet[\s\S]*?v-if="shouldShowSpecialNpcLayout && vm"/);
  assert.match(source, /:special-npc="shouldShowSpecialNpcLayout"/);
  assert.doesNotMatch(source, /SpecialNpcShell/);
  assert.match(source, /vm\.value\?\.layoutKind === 'special_npc' && !illustratedFallbackActive\.value/);
  assert.match(source, /'special-npc-viewer-root': shouldShowSpecialNpcLayout/);
  assert.match(source, /\.viewer-root\.special-npc-viewer-root\s*\{\s*min-height:\s*0;/);
});
