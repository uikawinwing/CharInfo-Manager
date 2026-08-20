import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const readSource = path => readFile(new URL(path, repoRoot), 'utf8');

const [overviewSource, sheetSource, headerSource] = await Promise.all([
  readSource('src/char_info_viewer/components/illustrated/IllustratedOverviewPanel.vue'),
  readSource('src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue'),
  readSource('src/char_info_viewer/components/illustrated/IllustratedHeader.vue'),
]);

test('illustrated character overview renders the entrance quote only when display text exists', () => {
  assert.match(sheetSource, /:entrance-quote-text="vm\.entranceQuoteText"/);
  assert.match(overviewSource, /entranceQuoteText\?:\s*string/);
  assert.match(
    overviewSource,
    /<button[\s\S]*?v-if="entranceQuoteText"[\s\S]*?class="illustrated-entrance-quote"[\s\S]*?{{ entranceQuoteText }}[\s\S]*?<\/button>/,
  );
});

test('entrance quote keeps one lead ornament, subtle quotation marks, and a quiet closing line', () => {
  assert.match(overviewSource, /@import url\(['"]https:\/\/fontsapi\.zeoseven\.com\/293\/main\/result\.css['"]\);/);

  const quoteRule = overviewSource.match(/\.illustrated-entrance-quote\s*\{[^}]*\}/)?.[0];
  assert.ok(quoteRule);
  assert.match(quoteRule, /font-family:\s*'LXGW WenKai Mono'/);
  assert.match(quoteRule, /font-style:\s*normal/);
  assert.match(quoteRule, /font-size:\s*clamp\(17px,/);
  assert.match(quoteRule, /border:\s*0/);
  assert.match(quoteRule, /background:\s*none/);
  assert.match(
    overviewSource,
    /class="illustrated-entrance-quote-ornament"\s+aria-hidden="true">[\s\S]*?class="illustrated-entrance-quote-diamond"/,
  );
  assert.equal((overviewSource.match(/class="illustrated-entrance-quote-ornament"/g) ?? []).length, 1);
  assert.match(
    overviewSource,
    /\.illustrated-entrance-quote-ornament::before,[\s\S]*?\.illustrated-entrance-quote-ornament::after/,
  );
  assert.match(overviewSource, /\.illustrated-entrance-quote-text::before\s*\{[^}]*content:\s*'“'/);
  assert.match(overviewSource, /\.illustrated-entrance-quote-text::after\s*\{[^}]*content:\s*'”'/);
  assert.match(overviewSource, /class="illustrated-entrance-quote-tail"\s+aria-hidden="true"/);
  assert.match(overviewSource, /\.illustrated-entrance-quote-tail\s*\{[^}]*linear-gradient/);
  assert.doesNotMatch(overviewSource, /content:\s*'[「」]'/);
});

test('Special NPC attributes always keep a three-over-two flag composition', () => {
  assert.match(
    sheetSource,
    /IllustratedOverviewPanel[\s\S]*?'is-special-npc-overview': specialNpc/,
  );
  assert.match(
    overviewSource,
    /\.illustrated-attributes\s*\{[^}]*max-width:\s*calc\(\(var\(--flag-width\) \* 3\) \+ \(var\(--flag-gap\) \* 2\)\);/,
  );
  assert.match(
    overviewSource,
    /\.illustrated-overview\.is-special-npc-overview \.illustrated-attributes\s*\{[^}]*--flag-width:\s*min\([\s\S]*?calc\(\(100% - var\(--flag-gap\) - var\(--flag-gap\)\) \/ 3\)/,
  );
});

test('Special NPC overview uses the shared geometry scale', () => {
  assert.match(
    sheetSource,
    /\.illustrated-wrapper\s*\{[^}]*--illustrated-flag-width:\s*128px;[^}]*--illustrated-flag-height:\s*156px;[^}]*--illustrated-resource-height:\s*72px;/,
  );
  assert.match(
    overviewSource,
    /\.illustrated-attributes\s*\{[^}]*--flag-width:\s*var\(--illustrated-flag-width\);[^}]*--flag-min-height:\s*var\(--illustrated-flag-height\);/,
  );
  assert.match(overviewSource, /\.illustrated-resource\s*\{[^}]*min-height:\s*var\(--illustrated-resource-height\);/);
});

test('Special NPC desktop header keeps one readable title scale', () => {
  assert.match(
    headerSource,
    /\.illustrated-header:not\(\.compact\)\s*\{[^}]*min-height:\s*var\(--illustrated-header-min-height\);/,
  );
  assert.match(headerSource, /\.illustrated-name\s*\{[^}]*font-size:\s*clamp\(30px, 4\.2cqw, 38px\);/);
});

test('overview stays screenshot-oriented, with a Special NPC scroll fallback only when content overflows', () => {
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
  assert.match(
    overviewSource,
    /\.illustrated-overview\.overview-density-compact \.illustrated-attribute[\s\S]*?min-height:\s*136px;/,
  );
  assert.match(
    overviewSource,
    /\.illustrated-overview\.overview-density-dense \.illustrated-attribute[\s\S]*?min-height:\s*116px;/,
  );
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

test('long overview copy uses whole-block limits instead of shrinking a single wrapped line', () => {
  assert.match(headerSource, /-webkit-line-clamp:\s*2;/);
  assert.match(headerSource, /has-wrapped-name/);
  assert.match(headerSource, /\.illustrated-header\.has-wrapped-name \.illustrated-name\s*\{[^}]*font-size:/);
  assert.match(headerSource, /ref="nameMeasurementElement" class="illustrated-name illustrated-name-measure"/);
  assert.match(headerSource, /measurement\.scrollWidth > header\.clientWidth \+ 1/);
  assert.match(
    headerSource,
    /\.illustrated-header\.has-wrapped-name \.illustrated-name-measure\s*\{[^}]*font-size:\s*clamp\(30px,/,
  );
  assert.match(
    headerSource,
    /\.illustrated-header \.illustrated-name\.illustrated-name-measure\s*\{[^}]*width:\s*max-content;[^}]*max-width:\s*none;[^}]*overflow:\s*visible;[^}]*white-space:\s*nowrap;[^}]*text-wrap:\s*nowrap;/,
  );
  assert.doesNotMatch(headerSource, /offsetHeight > lineHeight/);
  assert.match(headerSource, /\.illustrated-subtitle\s*\{[^}]*max-height:\s*3em;[^}]*overflow:\s*hidden;/);
  assert.match(headerSource, /class="illustrated-meta-item"[\s\S]*?class="illustrated-meta-sep"[\s\S]*?class="illustrated-meta-text"/);
  assert.match(headerSource, /\.illustrated-meta-item\s*\{[^}]*display:\s*inline-flex;[^}]*gap:\s*8px;/);
  assert.match(
    sheetSource,
    /\.illustrated-shell\.is-special-npc\.is-overview-tab :deep\(\.illustrated-desktop-header \.illustrated-subtitle\)\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*font-size:\s*clamp\(11px,\s*2\.8cqw,\s*13px\);[^}]*white-space:\s*nowrap;/,
  );
  assert.match(
    sheetSource,
    /\.illustrated-shell\.is-special-npc\.is-overview-tab :deep\(\.illustrated-desktop-header\)\s*\{[^}]*width:\s*calc\(100% \+ 40px\);[^}]*margin-inline:\s*-20px;/,
  );
  assert.match(overviewSource, /\.illustrated-entrance-quote-text\s*\{[^}]*-webkit-line-clamp:\s*5;/);
});

test('clamped entrance quotes open an accessible full-text dialog on desktop and mobile', () => {
  assert.match(
    overviewSource,
    /<button[\s\S]*?class="illustrated-entrance-quote"[\s\S]*?@click="emit\('openEntranceQuote'\)"/,
  );
  assert.match(overviewSource, /openEntranceQuote:\s*\[\];/);
  assert.match(sheetSource, /class="illustrated-mobile-entrance-quote"[\s\S]*?@click="openEntranceQuoteDialog"/);
  assert.match(sheetSource, /@open-entrance-quote="openEntranceQuoteDialog"/);
  assert.match(sheetSource, /class="illustrated-quote-dialog"[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/);
  assert.doesNotMatch(sheetSource, /<Teleport to="body">/);
  assert.match(sheetSource, /class="illustrated-quote-dialog-text">{{ vm\.entranceQuoteText }}/);
  assert.match(sheetSource, /@click\.self="closeEntranceQuoteDialog"/);
  assert.match(sheetSource, /@keydown\.esc\.stop\.prevent="closeEntranceQuoteDialog"/);
  assert.match(sheetSource, /:inert="isEntranceQuoteDialogOpen \? true : undefined"/);
  assert.match(sheetSource, /@keydown\.tab\.prevent="keepEntranceQuoteDialogFocus"/);
  assert.match(
    sheetSource,
    /function keepEntranceQuoteDialogFocus\(\): void \{[\s\S]*?quoteDialogCloseButton\.value\?\.focus\(\)/,
  );
  assert.match(
    sheetSource,
    /\.illustrated-wrapper\s*\{[^}]*position:\s*relative;[\s\S]*?\.illustrated-quote-dialog-backdrop\s*\{[^}]*position:\s*absolute;/,
  );
});
