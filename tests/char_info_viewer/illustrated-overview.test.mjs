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
