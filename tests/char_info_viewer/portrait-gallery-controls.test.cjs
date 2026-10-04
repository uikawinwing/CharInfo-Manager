const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const componentPath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue',
);
const portraitCorePath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/illustrated/core/useIllustratedPortrait.ts',
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
  const source = fs.readFileSync(portraitCorePath, 'utf8');

  assert.match(source, /normalizePortraitMediaUrlForBrowser\(activePortraitUrl\.value\)\?\.kind === 'video'/);
});

test('同一张立绘失败或卡住时都会按 sources 顺序切换备用图床', () => {
  const source = fs.readFileSync(portraitCorePath, 'utf8');

  assert.match(source, /activePortraitSourceIndex/);
  assert.match(source, /activePortraitSources/);
  assert.match(source, /createMediaSourceTimeout/);
  assert.match(source, /nextMediaSourceIndex\(fromIndex, activePortraitSources\.value\.length\)/);
  assert.match(source, /\[CharInfo\]\[ImageFallback\]\[Viewer\]/);
  assert.match(source, /portraitLoadTimeout\.arm\(\)/);
  assert.match(source, /portraitLoadTimeout\.clear\(\)/);
  assert.match(source, /retryPortraitLoad[\s\S]*nextMediaSourceIndex\(fromIndex, activePortraitSources\.value\.length\)/);
});

test('立绘行为已从默认 renderer 迁出到 core，renderer 只消费 controller', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.match(source, /useIllustratedPortrait\(/);
  assert.doesNotMatch(source, /createMediaSourceTimeout/);
  assert.doesNotMatch(source, /nextMediaSourceIndex/);
  assert.doesNotMatch(source, /preloadPortraitImages/);
});
