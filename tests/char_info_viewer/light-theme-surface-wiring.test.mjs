import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const defaultSheet = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedDefaultSheet.vue', import.meta.url),
  'utf8',
);
const itemCard = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedItemCard.vue', import.meta.url),
  'utf8',
);
const profilePanel = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedProfilePanel.vue', import.meta.url),
  'utf8',
);
const divinityPanel = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedDefaultDivinityPanel.vue', import.meta.url),
  'utf8',
);
const characterPanel = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedCharacterPanel.vue', import.meta.url),
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

test('mobile compact skill / holding surfaces consume theme tokens instead of dark literals', () => {
  assert.match(itemCard, /\.illustrated-list-item\.is-compact-skill\s*\{[\s\S]*?background:\s*var\(--illustrated-compact-skill-background\)/u);
  assert.match(itemCard, /\.illustrated-list-item\.is-compact-holding\s*\{[\s\S]*?background:\s*var\(--illustrated-compact-holding-background\)/u);
  assert.match(itemCard, /border-bottom-color:\s*var\(--illustrated-compact-mobile-divider-color\)/u);
  assert.doesNotMatch(itemCard, /rgba\(4, 7, 11, 0\.(?:5|48|26|24)\)/u);
});

test('compact tags and content text no longer hardcode dark-theme mobile colors', () => {
  assert.match(itemCard, /border-color:\s*var\(--illustrated-compact-tag-border-color\)/u);
  assert.match(itemCard, /background:\s*var\(--illustrated-compact-tag-background\)/u);
  assert.match(itemCard, /color:\s*var\(--illustrated-compact-tag-fg\)/u);
  assert.match(itemCard, /color:\s*var\(--illustrated-compact-effect-fg\)/u);
  assert.match(itemCard, /color:\s*var\(--illustrated-compact-effect-text-fg\)/u);
  assert.match(itemCard, /color:\s*var\(--illustrated-compact-description-fg\)/u);
  assert.doesNotMatch(itemCard, /rgba\(3, 5, 8, 0\.32\)|#aeb5bf|#f0f3f7|#edf1f5|#9ca4ad/u);
});

test('profile, divinity and radar compact surfaces share the light-theme visual contract', () => {
  assert.match(profilePanel, /var\(--illustrated-compact-divider-color\)/u);
  assert.match(profilePanel, /var\(--illustrated-compact-profile-body-fg\)/u);
  assert.match(profilePanel, /var\(--illustrated-creator-meta-fg\)/u);
  assert.match(profilePanel, /var\(--illustrated-creator-metadata-fg\)/u);

  assert.match(divinityPanel, /color:\s*var\(--illustrated-divinity-fg\)/u);
  assert.match(divinityPanel, /var\(--illustrated-divinity-meta-fg\)/u);
  assert.match(divinityPanel, /var\(--illustrated-divinity-body-fg\)/u);
  assert.match(divinityPanel, /var\(--illustrated-compact-divider-color\)/u);

  assert.match(characterPanel, /background:\s*var\(--illustrated-radar-card-background\)/u);
  assert.match(characterPanel, /border-top:\s*1px dashed var\(--illustrated-compact-divider-color\)/u);
});

test('Iris and Anastasia provide light compact-surface assignments', () => {
  for (const theme of ['iris', 'anastasia']) {
    const block = themeBlock(theme);
    assert.match(block, /--illustrated-compact-skill-background:\s*var\(--illustrated-compact-row-background\)/u);
    assert.match(block, /--illustrated-compact-holding-background:\s*var\(--illustrated-compact-row-background\)/u);
    assert.match(block, /--illustrated-compact-tag-background:\s*(?:#ffffff|#f8fbfd)/u);
    assert.match(block, /--illustrated-radar-card-background:\s*rgba\(255, 255, 255,/u);
    assert.match(block, /--illustrated-divinity-body-fg:\s*#[0-9a-fA-F]{6}/u);
  }
});

test('default dark renderer keeps explicit fallback values for the same semantic tokens', () => {
  assert.match(defaultSheet, /--illustrated-compact-skill-background:\s*linear-gradient\(90deg, rgba\(4, 7, 11, 0\.5\)/u);
  assert.match(defaultSheet, /--illustrated-compact-tag-background:\s*rgba\(3, 5, 8, 0\.32\)/u);
  assert.match(defaultSheet, /--illustrated-radar-card-background:\s*rgba\(0, 0, 0, 0\.1\)/u);
});
