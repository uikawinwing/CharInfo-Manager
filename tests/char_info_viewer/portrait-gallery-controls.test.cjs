const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const componentPath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/specialNpc/SpecialNpcCharacterSheet.vue',
);

test('special NPC overview provides previous and next portrait controls only for galleries', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.match(source, /v-if="isOverviewTab && hasMultiplePortraits"/);
  assert.match(source, /aria-label="上一张立绘"/);
  assert.match(source, /aria-label="下一张立绘"/);
  assert.match(source, /switchPortrait\(-1\)/);
  assert.match(source, /switchPortrait\(1\)/);
});

test('special NPC chooses image or video from the currently selected portrait URL', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.match(source, /normalizePortraitMediaUrlForBrowser\(activePortraitUrl\.value\)\?\.kind === 'video'/);
  assert.doesNotMatch(source, /specialNpcProfile\?\.portraitKind === 'video'/);
});
