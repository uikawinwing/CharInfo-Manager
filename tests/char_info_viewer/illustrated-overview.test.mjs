import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const readSource = path => readFile(new URL(path, repoRoot), 'utf8');

const [overviewSource, sheetSource, headerSource, portraitPaneSource, controllerSource, quoteDialogSource] =
  await Promise.all([
    readSource('src/char_info_viewer/components/illustrated/default/IllustratedOverviewPanel.vue'),
    readSource('src/char_info_viewer/components/illustrated/default/IllustratedDefaultSheet.vue'),
    readSource('src/char_info_viewer/components/illustrated/default/IllustratedHeader.vue'),
    readSource('src/char_info_viewer/components/illustrated/default/IllustratedPortraitPane.vue'),
    readSource('src/char_info_viewer/components/illustrated/core/useIllustratedSheetController.ts'),
    readSource('src/char_info_viewer/components/illustrated/default/IllustratedQuoteDialog.vue'),
  ]);

test('illustrated character overview renders the entrance quote only when display text exists', () => {
  assert.match(sheetSource, /:entrance-quote-text="vm\.entranceQuoteText"/);
  assert.match(overviewSource, /entranceQuoteText\?:\s*string/);
  assert.match(
    overviewSource,
    /<button[\s\S]*?v-if="entranceQuoteText"[\s\S]*?class="illustrated-entrance-quote"[\s\S]*?{{ entranceQuoteText }}[\s\S]*?<\/button>/,
  );
});

test('overview stays screenshot-oriented, with a 立绘角色卡 scroll fallback only when content overflows', () => {
  assert.match(
    sheetSource,
    /\.illustrated-panels\s*\{[^}]*overflow-y:\s*auto;[\s\S]*?\.illustrated-shell\.is-overview-tab \.illustrated-panels\s*\{[^}]*overflow-y:\s*hidden;[^}]*padding-bottom:\s*0;/,
  );
  assert.match(
    sheetSource,
    /\.illustrated-shell\.is-special-npc\.is-overview-tab \.illustrated-panels\s*\{[^}]*overflow-y:\s*auto;/,
  );
  assert.match(
    sheetSource,
    /\.illustrated-data-pane\s*\{[^}]*box-sizing:\s*border-box;[^}]*min-height:\s*0;[^}]*max-height:\s*100%;/,
  );
  assert.match(
    overviewSource,
    /\.illustrated-overview\.is-special-npc-overview\s*\{[^}]*height:\s*auto;[^}]*min-height:\s*100%;/,
  );
  assert.match(sheetSource, /isOverviewTab \? overviewDensityClass : null/);
});

test('overview density progresses from normal through compact to dense using measured overflow', () => {
  assert.match(sheetSource, /const overviewDensity = ref<'normal' \| 'compact' \| 'dense'>\('normal'\);/);
  assert.match(sheetSource, /new ResizeObserver\(updateOverviewDensity\)/);
  assert.match(sheetSource, /panels\.scrollHeight <= panels\.clientHeight/);
  assert.match(sheetSource, /overviewDensity\.value = 'compact';/);
  assert.match(sheetSource, /overviewDensity\.value = 'dense';/);
  assert.match(sheetSource, /overviewResizeObserver\?\.disconnect\(\);/);
});

test('overview density classes stay on their target components instead of leaking onto the shell', () => {
  assert.doesNotMatch(headerSource, /:global\(\.overview-density-/);
  assert.doesNotMatch(overviewSource, /:global\(\.overview-density-/);
  assert.match(sheetSource, /IllustratedHeader[\s\S]*?:class="\['illustrated-desktop-header', overviewDensityClass\]"/);
  assert.match(
    sheetSource,
    /IllustratedOverviewPanel[\s\S]*?:class="\[overviewDensityClass, \{ 'is-special-npc-overview': specialNpc \}\]"/,
  );
});

test('long overview copy keeps measured wrapping and bounded text instead of relying on fixed line height guesses', () => {
  assert.match(headerSource, /-webkit-line-clamp:\s*2;/);
  assert.match(headerSource, /has-wrapped-name/);
  assert.match(headerSource, /ref="nameMeasurementElement" class="illustrated-name illustrated-name-measure"/);
  assert.match(headerSource, /measurement\.scrollWidth > header\.clientWidth \+ 1/);
  assert.doesNotMatch(headerSource, /offsetHeight > lineHeight/);
  assert.match(headerSource, /class="illustrated-meta-item"[\s\S]*?class="illustrated-meta-sep"[\s\S]*?class="illustrated-meta-text"/);
  assert.match(overviewSource, /\.illustrated-entrance-quote-text\s*\{[^}]*-webkit-line-clamp:\s*5;/);
});

test('clamped entrance quotes open an accessible full-text dialog on desktop and mobile', () => {
  assert.match(
    overviewSource,
    /<button[\s\S]*?class="illustrated-entrance-quote"[\s\S]*?@click="emit\('openEntranceQuote'\)"/,
  );
  assert.match(overviewSource, /openEntranceQuote:\s*\[\];/);
  // 移动端入口台词已随立绘面板迁到 child：child 只 emit，父级 renderer 独占 dialog。
  assert.match(portraitPaneSource, /class="illustrated-mobile-entrance-quote"[\s\S]*?@click="\$emit\('openEntranceQuote', \$event\)"/);
  // 台词弹窗已抽成独立 renderer，但 open / close / focus 仍由 sheet controller 独占：
  // sheet 只透传 controller 字段与回调，dialog 自身不持有任何 open state。
  assert.match(sheetSource, /@open-entrance-quote="openQuote"/);
  assert.match(sheetSource, /<IllustratedQuoteDialog[\s\S]*?:is-open="isEntranceQuoteDialogOpen"/);
  // 关闭按钮必须走 callback template-ref：`<script setup>` 的 binding 是
  // `setup-maybe-ref`，跨 component 传 Ref 对象会被编译成 `_unref(x)`，
  // 子组件只拿到 `.value`，DOM 永远写不回 controller（Phase 4 曾因此让 focus 静默失效）。
  assert.match(sheetSource, /:set-close-button="setQuoteDialogCloseButton"/);
  assert.doesNotMatch(sheetSource, /:close-button="/);
  assert.match(quoteDialogSource, /:ref="setCloseButton"/);
  assert.match(quoteDialogSource, /setCloseButton:\s*\(element:\s*HTMLButtonElement \| null\)\s*=>\s*void;/);
  assert.doesNotMatch(quoteDialogSource, /import type \{ Ref \}/);
  assert.match(sheetSource, /@close="closeQuote"/);
  assert.match(sheetSource, /@keep-focus="keepQuoteDialogFocus"/);
  assert.doesNotMatch(sheetSource, /class="illustrated-quote-dialog"/);
  assert.doesNotMatch(quoteDialogSource, /ref\(false\)|const isOpen\s*=/);
  assert.match(quoteDialogSource, /class="illustrated-quote-dialog"[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/);
  assert.doesNotMatch(quoteDialogSource, /<Teleport to="body">/);
  assert.match(quoteDialogSource, /class="illustrated-quote-dialog-text">\{\{ quoteText \}\}/);
  assert.match(quoteDialogSource, /@click\.self="\$emit\('close'\)"/);
  assert.match(quoteDialogSource, /@keydown\.esc\.stop\.prevent="\$emit\('close'\)"/);
  assert.match(sheetSource, /:inert="isEntranceQuoteDialogOpen \? true : undefined"/);
  assert.match(quoteDialogSource, /@keydown\.tab\.prevent="\$emit\('keepFocus'\)"/);
  assert.match(sheetSource, /^\s+keepQuoteDialogFocus,$/m);
  assert.match(
    controllerSource,
    /function setQuoteDialogCloseButton\(element: HTMLButtonElement \| null\): void \{[\s\S]*?quoteDialogCloseButton\.value = element;/,
  );
  assert.match(
    controllerSource,
    /function keepQuoteDialogFocus\(\): void \{[\s\S]*?quoteDialogCloseButton\.value\?\.focus\(\)/,
  );
  // 弹窗仍然挂在 shell 内的普通渲染路径（不 teleport），backdrop 相对 wrapper 定位。
  assert.match(
    sheetSource,
    /\.illustrated-wrapper\s*\{[^}]*position:\s*relative/,
  );
  assert.match(quoteDialogSource, /\.illustrated-quote-dialog-backdrop\s*\{[^}]*position:\s*absolute;/);
});

test('story 与 quote 的 domain markup 已迁出默认 renderer，且不自行持有状态', async () => {
  const [storySource, controller] = await Promise.all([
    readSource('src/char_info_viewer/components/illustrated/default/IllustratedStoryPanel.vue'),
    readSource('src/char_info_viewer/components/illustrated/core/useIllustratedSheetController.ts'),
  ]);

  // story 模块只吃纯文本，不解析 VM / YAML / Worldbook。
  assert.match(sheetSource, /<IllustratedStoryPanel v-else :text="vm\.backstoryText" \/>/);
  assert.doesNotMatch(sheetSource, /class="illustrated-story-block"/);
  assert.match(storySource, /text:\s*string;/);
  assert.match(storySource, /\{\{ text \|\| '暂无故事' \}\}/);
  assert.doesNotMatch(storySource, /CharacterViewModel|characterViewModel|storySections|backstoryText/);

  // 台词弹窗的 open state 与 focus ref 只有一个 owner：core controller。
  assert.match(controller, /const isEntranceQuoteDialogOpen = ref\(false\);/);
  assert.match(controller, /const quoteDialogCloseButton = ref<HTMLButtonElement \| null>\(null\);/);
  // raw DOM ref 保持 controller 私有：对外只暴露 callback，避免 DX 把它当 platform contract。
  const controllerReturn = controller.slice(controller.indexOf('return {'));
  assert.doesNotMatch(controllerReturn, /^\s+quoteDialogCloseButton,$/m);
  for (const fn of ['setQuoteDialogCloseButton', 'openQuote', 'closeQuote', 'keepQuoteDialogFocus']) {
    assert.match(controllerReturn, new RegExp(`^\\s+${fn},$`, 'm'));
  }
  // renderer 只消费 controller 传下来的字段，不得 import controller 或解析数据。
  // 注释里可以解释 ownership，所以只断言 import 语句与 props 形状。
  assert.doesNotMatch(quoteDialogSource, /^\s*import\s+.*(characterViewModel|useIllustratedSheetController)/m);
  assert.doesNotMatch(storySource, /^\s*import\s+.*(characterViewModel|useIllustratedSheetController)/m);
  assert.match(quoteDialogSource, /isOpen:\s*boolean;/);
  assert.doesNotMatch(quoteDialogSource, /isEntranceQuoteDialogOpen/);
});