const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const componentPath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/specialNpc/SpecialNpcCharacterSheet.vue',
);

test('the special NPC mobile overview keeps the entrance quote above its header card', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.match(source, /class="special-npc-mobile-overview-overlay"/);
  assert.match(source, /v-if="vm\.entranceQuoteText" class="special-npc-mobile-entrance-quote"/);
  assert.match(source, /\.special-npc-mobile-overview-overlay\s*\{[\s\S]*?display:\s*flex;/);
  assert.match(source, /\.special-npc-mobile-entrance-quote\s*\{[\s\S]*?background:\s*rgba\([^;]+\);/);
  assert.match(source, /font-size:\s*clamp\(12px,[^;]+14px\)/);
});
