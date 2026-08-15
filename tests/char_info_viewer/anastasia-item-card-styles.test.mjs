import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sheetPath = new URL(
  '../../src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue',
  import.meta.url,
);
const sheetSource = await readFile(sheetPath, 'utf8');
const overviewPath = new URL(
  '../../src/char_info_viewer/components/illustrated/IllustratedOverviewPanel.vue',
  import.meta.url,
);
const overviewSource = await readFile(overviewPath, 'utf8');

test('Anastasia desktop overview uses the shared flag geometry', () => {
  assert.match(
    sheetSource,
    /\.illustrated-wrapper\s*\{[^}]*--illustrated-flag-width:\s*128px;[^}]*--illustrated-flag-height:\s*156px;/,
  );
  assert.doesNotMatch(overviewSource, /illustrated-theme-anastasia[^\n]*illustrated-attributes/);
});

test('Anastasia desktop overview fits without an internal scrollbar', () => {
  assert.match(
    sheetSource,
    /@media \(min-width: 901px\)[\s\S]*?\.illustrated-theme-anastasia \.illustrated-shell\.is-overview-tab \.illustrated-panels\s*\{[\s\S]*?overflow-y:\s*hidden;[\s\S]*?padding-bottom:\s*0;/,
  );
});

test('Anastasia theme targets the rendered illustrated character list item class', () => {
  assert.match(
    sheetSource,
    /\.illustrated-theme-anastasia\s+:deep\(\.illustrated-list-item\)\s*\{[\s\S]*?border-radius:\s*10px;[\s\S]*?background:[\s\S]*?rgba\(255, 255, 255/,
  );
  assert.doesNotMatch(sheetSource, /\.illustrated-theme-anastasia\s+:deep\(\.illustrated-item-card\)/);
});

test('Anastasia mobile item cards use compact readable spacing and type', () => {
  assert.match(
    sheetSource,
    /@media \(max-width: 640px\)[\s\S]*?\.illustrated-theme-anastasia\s+:deep\(\.illustrated-list-item\)\s*\{[\s\S]*?margin-bottom:\s*12px;[\s\S]*?padding:\s*15px;/,
  );
  assert.match(
    sheetSource,
    /@media \(max-width: 640px\)[\s\S]*?\.illustrated-theme-anastasia\s+:deep\(\.illustrated-effect-item\)[\s\S]*?font-size:\s*14px;[\s\S]*?line-height:\s*1\.55;/,
  );
});
