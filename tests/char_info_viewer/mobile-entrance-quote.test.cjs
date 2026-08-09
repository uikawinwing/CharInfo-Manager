const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const componentPath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue',
);

test('the illustrated character mobile overview keeps the entrance quote above its header card', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.match(source, /class="illustrated-mobile-overview-overlay"/);
  assert.match(
    source,
    /<button\s+[\s\S]*?v-if="vm\.entranceQuoteText"[\s\S]*?class="illustrated-mobile-entrance-quote"[\s\S]*?@click="openEntranceQuoteDialog"/,
  );
  assert.match(source, /\.illustrated-mobile-overview-overlay\s*\{[\s\S]*?display:\s*flex;/);
  assert.match(source, /\.illustrated-mobile-entrance-quote\s*\{[\s\S]*?background:\s*rgba\([^;]+\);/);
  assert.match(source, /font-size:\s*clamp\(12px,[^;]+14px\)/);
});
