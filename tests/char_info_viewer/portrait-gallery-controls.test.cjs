const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const componentPath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue',
);

test('illustrated character overview provides previous and next portrait controls only for galleries', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.match(source, /v-if="isOverviewTab && hasMultiplePortraits"/);
  assert.match(source, /aria-label="上一张立绘"/);
  assert.match(source, /aria-label="下一张立绘"/);
  assert.match(source, /switchPortrait\(-1\)/);
  assert.match(source, /switchPortrait\(1\)/);
});

test('illustrated character chooses image or video from the currently selected portrait URL', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.match(source, /normalizePortraitMediaUrlForBrowser\(activePortraitUrl\.value\)\?\.kind === 'video'/);
  assert.doesNotMatch(source, /presentationProfile\?\.portraitKind === 'video'/);
});

test('同一张立绘失败或卡住时都会按 sources 顺序切换备用图床', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.match(source, /activePortraitSourceIndex/);
  assert.match(source, /activePortraitSources/);
  assert.match(source, /createMediaSourceTimeout/);
  assert.match(source, /nextMediaSourceIndex\(activePortraitSourceIndex\.value, activePortraitSources\.value\.length\)/);
  assert.match(source, /portraitLoadTimeout\.arm\(\)/);
  assert.match(source, /portraitLoadTimeout\.clear\(\)/);
  assert.match(source, /retryPortraitLoad[\s\S]*nextMediaSourceIndex\(activePortraitSourceIndex\.value, activePortraitSources\.value\.length\)/);
});
