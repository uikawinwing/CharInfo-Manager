const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const componentPath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/illustrated/default/IllustratedPortraitPane.vue',
);

test('the illustrated character mobile overview keeps the entrance quote above its header card', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.match(source, /class="illustrated-mobile-overview-overlay"/);
  assert.match(
    source,
    /<button\s+[\s\S]*?v-if="vm\.entranceQuoteText"[\s\S]*?class="illustrated-mobile-entrance-quote"[\s\S]*?@click="\$emit\('openEntranceQuote', \$event\)"/,
  );
  assert.match(source, /\.illustrated-mobile-overview-overlay\s*\{[\s\S]*?display:\s*flex;/);
  assert.match(source, /\.illustrated-mobile-entrance-quote\s*\{[\s\S]*?background:\s*rgba\([^;]+\);/);
  assert.match(source, /font-size:\s*calc\(clamp\(12px,[^;]+14px\) \+ var\(--ci-font-size-adjust, 0px\)\)/);
});

test('force-mobile portrait mixins keep mobile-only descendants scoped to the portrait root', () => {
  const source = fs.readFileSync(componentPath, 'utf8');
  const mobileStart = source.indexOf('@mixin illustrated-portrait-mobile-content');
  const compactStart = source.indexOf('@mixin illustrated-portrait-compact-content');
  const mobileEnd = compactStart;
  const compactEnd = source.indexOf('@container char-info-viewer', compactStart);

  assert.ok(mobileStart >= 0 && compactStart > mobileStart && compactEnd > compactStart);

  const mobileMixin = source.slice(mobileStart, mobileEnd);
  const compactMixin = source.slice(compactStart, compactEnd);

  assert.match(mobileMixin, /#\{\$root\} \.illustrated-mobile-overview-overlay/);
  assert.match(mobileMixin, /#\{\$root\} \.illustrated-mobile-header-overlay/);
  assert.match(mobileMixin, /#\{\$root\} \.illustrated-mobile-entrance-quote/);
  assert.doesNotMatch(mobileMixin, /\n\s{2}\.illustrated-mobile-overview-overlay\s*\{/);
  assert.doesNotMatch(mobileMixin, /\n\s{2}\.illustrated-mobile-header-overlay\s*\{/);

  assert.match(compactMixin, /#\{\$root\} \.illustrated-mobile-overview-overlay/);
  assert.match(compactMixin, /#\{\$root\} \.illustrated-mobile-header-overlay/);
});
