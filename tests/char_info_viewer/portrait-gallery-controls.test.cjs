const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const componentPath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/illustrated/default/IllustratedDefaultSheet.vue',
);
const portraitCorePath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/illustrated/core/useIllustratedPortrait.ts',
);

const portraitPanePath = path.resolve(
  __dirname,
  '../../src/char_info_viewer/components/illustrated/default/IllustratedPortraitPane.vue',
);

test('illustrated character overview provides previous and next portrait controls only for galleries', () => {
  const source = fs.readFileSync(portraitPanePath, 'utf8');

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

test('移动端姓名条覆盖必须跨组件边界生效：父级不得要求 overlay 携带父级 scope id', () => {
  const sheet = fs.readFileSync(componentPath, 'utf8');
  const pane = fs.readFileSync(portraitPanePath, 'utf8');

  // overlay 已移入 child，只带 child 的 scope id。父级若写成
  // `.shell ... .illustrated-mobile-header-overlay :deep(...)`，
  // 编译后会要求 overlay 带父级 data-v，规则静默失效。
  assert.doesNotMatch(
    sheet,
    /\.illustrated-mobile-header-overlay\s*\n\s*:deep\(/,
    '父级不得对已移入 child 的 overlay 直接施加 scope 选择器，否则移动端姓名条样式会静默失效',
  );
  assert.match(
    sheet,
    /\.illustrated-shell\.is-special-npc\.is-overview-tab\s*\n\s*:deep\(\.illustrated-mobile-header-overlay/u,
  );
  assert.match(pane, /class="illustrated-mobile-header-overlay"/);
});

test('立绘视觉已从默认 renderer 迁出到独立面板，renderer 只组合不拥有立绘样式', () => {
  const sheet = fs.readFileSync(componentPath, 'utf8');
  const pane = fs.readFileSync(portraitPanePath, 'utf8');

  assert.match(sheet, /<IllustratedPortraitPane/);
  assert.doesNotMatch(sheet, /\.illustrated-portrait-(?:image|video|loading|failure|navigation)\s*\{/);
  assert.match(pane, /\.illustrated-portrait-pane\s*\{/);
  assert.match(pane, /\.illustrated-portrait-image\s*\{/);
  assert.match(pane, /\.illustrated-portrait-navigation\s*\{/);
  // 移动端布局必须同时保留 @container 阈值与 force-mobile-layout 触发路径。
  assert.match(pane, /@container char-info-viewer \(max-width: 900px\)/);
  assert.match(pane, /@container char-info-viewer \(max-width: 640px\)/);
  assert.match(pane, /@include illustrated-portrait-mobile-content\('\.illustrated-portrait-pane\.force-mobile-layout'\)/);
  assert.match(pane, /@include illustrated-portrait-compact-content\('\.illustrated-portrait-pane\.force-mobile-layout'\)/);
});

test('立绘面板必须对 controller 整体替换保持安全，且只暴露语义能力', () => {
  const pane = fs.readFileSync(portraitPanePath, 'utf8');

  // 在 setup 里解构 props.portrait 只执行一次；若父级整体替换 controller，
  // 解构出的引用会永久指向旧对象。状态必须经 computed 回到 props.portrait 读取。
  assert.doesNotMatch(
    pane,
    /^\}\s*=\s*props\.portrait;/m,
    '不得在 setup 中解构 props.portrait，否则 controller 被替换后会留下 stale 引用',
  );
  assert.match(pane, /computed\(\(\) => props\.portrait\.portraitMediaUrl\.value\)/);
  assert.match(pane, /computed\(\(\) => props\.portrait\.portraitLoaded\.value\)/);
  assert.match(pane, /@click="props\.portrait\.switchPortrait\(-1\)"/);
  assert.match(pane, /@load="props\.portrait\.onPortraitLoaded"/);

  // 只暴露语义能力，不把 img / video 之类的私有 DOM 交给父级。
  assert.match(pane, /defineExpose\(\{ captureCurrentFrame \}\)/);
  assert.doesNotMatch(pane, /defineExpose\(\{[^}]*mediaElement/s);
});

test('renderer 使用的立绘状态必须在父级有声明，避免移动端快照抛 ReferenceError', () => {
  const sheet = fs.readFileSync(componentPath, 'utf8');

  // captureDetailWallpaper 在离开首页时被调用，若这两个 ref 未解构就会抛
  // ReferenceError；webpack 的 transpile-only 构建与源码正则测试都抓不到。
  assert.match(
    sheet,
    /const \{ portraitLoaded, portraitLoadFailed \} = portrait;/,
    '父级必须从立绘 controller 解构加载状态，captureDetailWallpaper 依赖它',
  );
  assert.match(sheet, /!portraitLoaded\.value \|\| portraitLoadFailed\.value/);
  assert.doesNotMatch(sheet, /^const portraitLoaded = ref\(/m, '加载状态已归 core controller 所有');
});
