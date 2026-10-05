import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const defaultSheet = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedDefaultSheet.vue', import.meta.url),
  'utf8',
);
const overviewPanel = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedOverviewPanel.vue', import.meta.url),
  'utf8',
);
const itemCard = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedItemCard.vue', import.meta.url),
  'utf8',
);
const dxSheet = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/dx/IllustratedV2Sheet.vue', import.meta.url),
  'utf8',
);

function themeBlock(theme) {
  const marker = `.illustrated-v2-theme-${theme} .illustrated-wrapper {`;
  const start = dxSheet.indexOf(marker);
  assert.ok(start >= 0, `必须找到 ${theme} theme block`);
  const end = dxSheet.indexOf('\n}', start);
  assert.ok(end > start, `必须找到 ${theme} theme block 结尾`);
  return dxSheet.slice(start, end);
}

test('mobile specialNpc name shadow 由 theme token 控制，不再写死暗底黑影', () => {
  assert.match(defaultSheet, /text-shadow:\s*var\(--illustrated-mobile-name-shadow\)\s*;/u);
  assert.doesNotMatch(
    defaultSheet,
    /\.illustrated-name:not\(\.illustrated-name-measure\)[\s\S]{0,360}?text-shadow:\s*0 3px 16px rgba\(0, 0, 0, 0\.94\)/u,
  );

  assert.match(themeBlock('iris'), /--illustrated-mobile-name-shadow:\s*none\s*;/u);

  const anastasia = themeBlock('anastasia');
  const anastasiaMobileNameShadow = anastasia.match(/--illustrated-mobile-name-shadow:\s*([^;]+);/u)?.[1] ?? '';
  assert.match(anastasiaMobileNameShadow, /rgba\(10, 45, 78, 0\.16\)/u);
  assert.doesNotMatch(anastasiaMobileNameShadow, /rgba\(0, 0, 0,/u);
});

test('light themes can disable resource and item-marker glows without changing dark defaults', () => {
  assert.match(overviewPanel, /text-shadow:\s*var\(--illustrated-resource-value-shadow\)\s*;/u);
  assert.match(itemCard, /text-shadow:\s*var\(--illustrated-item-marker-shadow\)\s*;/u);
  assert.match(itemCard, /text-shadow:\s*var\(--illustrated-skill-marker-shadow\)\s*;/u);

  for (const theme of ['iris', 'anastasia']) {
    const block = themeBlock(theme);
    assert.match(block, /--illustrated-resource-value-shadow:\s*none\s*;/u);
    assert.match(block, /--illustrated-item-marker-shadow:\s*none\s*;/u);
    assert.match(block, /--illustrated-skill-marker-shadow:\s*none\s*;/u);
  }
});

test('light themes remove content heading glow while preserving image-facing contrast effects separately', () => {
  for (const theme of ['iris', 'anastasia']) {
    const block = themeBlock(theme);
    assert.match(block, /--illustrated-profile-heading-shadow:\s*none\s*;/u);
    assert.match(block, /--illustrated-story-heading-shadow:\s*none\s*;/u);
    assert.match(block, /--illustrated-story-link-heading-shadow:\s*none\s*;/u);
  }

  // 立绘上的 mobile quote 有独立 token，不与浅色 nameplate 的文字阴影绑死。
  assert.match(defaultSheet, /--illustrated-mobile-quote-shadow:/u);
});
