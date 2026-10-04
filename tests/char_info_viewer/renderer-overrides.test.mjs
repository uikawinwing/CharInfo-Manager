import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Phase 5：`IllustratedRendererOverrides` 的回落契约。
 *
 * 这里断言的是**解析结果**（用哪个组件），而不是渲染后的 DOM 文本。
 * 理由：默认路径「零行为变化」由 CSS 零差异比对 + 现有 362 条测试保证；
 * 本文件只负责守住 seam 契约本身——未提供 override 必须逐项回落到默认组件。
 */
const sheetSource = await (await import('node:fs/promises')).readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedDefaultSheet.vue', import.meta.url),
  'utf8',
);
const wrapperSource = await (await import('node:fs/promises')).readFile(
  new URL('../../src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue', import.meta.url),
  'utf8',
);
const portraitPaneSource = await (await import('node:fs/promises')).readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedPortraitPane.vue', import.meta.url),
  'utf8',
);
const typesSource = await (await import('node:fs/promises')).readFile(
  new URL('../../src/char_info_viewer/components/illustrated/types.ts', import.meta.url),
  'utf8',
);

const { IllustratedRendererOverrides } = await import(
  '../../src/char_info_viewer/components/illustrated/types.ts'
);
void IllustratedRendererOverrides;

const DEFAULT_MODULES = [
  'IllustratedHeader',
  'IllustratedOverviewPanel',
  'IllustratedPortraitPane',
  'IllustratedItemCard',
  'IllustratedTabNav',
];

/** 复刻 IllustratedDefaultSheet 的 fallback 解析表达式。 */
function resolve(overrides) {
  return {
    headerModule: overrides?.header ?? 'IllustratedHeader',
    overviewModule: overrides?.overview ?? 'IllustratedOverviewPanel',
    portraitModule: overrides?.portrait ?? 'IllustratedPortraitPane',
    itemCardModule: overrides?.itemCard ?? 'IllustratedItemCard',
    navigationModule: overrides?.navigation ?? 'IllustratedTabNav',
  };
}

test('不传 overrides 与传空 overrides 解析到同一组默认模块', () => {
  assert.deepEqual(resolve(undefined), resolve({}));
  assert.deepEqual(Object.values(resolve(undefined)), DEFAULT_MODULES);
});

test('逐项回落：只覆盖 header 时其余四项仍为默认', () => {
  const resolved = resolve({ header: 'CustomHeader' });
  assert.equal(resolved.headerModule, 'CustomHeader');
  assert.equal(resolved.overviewModule, 'IllustratedOverviewPanel');
  assert.equal(resolved.portraitModule, 'IllustratedPortraitPane');
  assert.equal(resolved.itemCardModule, 'IllustratedItemCard');
  assert.equal(resolved.navigationModule, 'IllustratedTabNav');
});

test('五项互相独立，可任意组合覆盖', () => {
  const all = resolve({
    header: 'H',
    overview: 'O',
    portrait: 'P',
    itemCard: 'C',
    navigation: 'N',
  });
  assert.deepEqual(Object.values(all), ['H', 'O', 'P', 'C', 'N']);

  const partial = resolve({ portrait: 'P', navigation: 'N' });
  assert.equal(partial.portraitModule, 'P');
  assert.equal(partial.navigationModule, 'N');
  assert.equal(partial.headerModule, 'IllustratedHeader');
  assert.equal(partial.overviewModule, 'IllustratedOverviewPanel');
  assert.equal(partial.itemCardModule, 'IllustratedItemCard');
});

test('renderer 用逐项 computed 解析，而不是解构或三元表达式散落各处', () => {
  for (const name of [
    'headerModule',
    'overviewModule',
    'portraitModule',
    'itemCardModule',
    'navigationModule',
  ]) {
    assert.match(
      sheetSource,
      new RegExp(`const ${name} = computed\\(\\(\\) => props\\.overrides\\?\\.\\w+ \\?\\? \\w+\\);`),
      `${name} 必须是逐项 computed 回落`,
    );
  }
});

test('模板用 :is 绑定解析结果，不再直接写死五个默认组件标签', () => {
  for (const name of [
    'portraitModule',
    'headerModule',
    'overviewModule',
    'itemCardModule',
    'navigationModule',
  ]) {
    assert.ok(
      sheetSource.includes(`:is="${name}"`),
      `模板必须通过 :is="${name}" 绑定`,
    );
  }
  for (const tag of [
    '<IllustratedHeader',
    '<IllustratedOverviewPanel',
    '<IllustratedPortraitPane',
    '<IllustratedItemCard',
    '<IllustratedTabNav',
  ]) {
    assert.ok(!sheetSource.includes(tag), `${tag} 不应再直接出现在模板里`);
  }
});

test('ItemCard 仍是一个 renderer + variant，不按 tab 分裂', () => {
  // 六个调用点全部指向同一个 itemCardModule，差异只经由 variant 表达。
  const sites = sheetSource.match(/:is="itemCardModule"/g) ?? [];
  assert.equal(sites.length, 6, '六个 ItemCard 调用点都必须走同一个 override 槽位');
  assert.ok(sheetSource.includes(`:variant="specialNpc ? 'skill' : 'item'"`));
  assert.ok(sheetSource.includes(`:variant="specialNpc ? 'holding' : 'item'"`));
  assert.ok(sheetSource.includes('variant="status"'));
  assert.ok(!/SkillItemCard|EquipmentItemCard|InventoryItemCard|StatusItemCard/.test(sheetSource));
});

test('overrides 是可选 prop，默认路径不传', () => {
  assert.match(sheetSource, /overrides\?: IllustratedRendererOverrides;/);
});

test('compatibility wrapper 显式声明 overrides，不依赖 $attrs fallthrough', () => {
  // 历史 DX 正是通过 IllustratedCharacterSheet 进入；seam 建在隐式 fallthrough 上等于没有 seam。
  assert.match(wrapperSource, /overrides\?: IllustratedRendererOverrides;/);
  assert.match(
    wrapperSource,
    /import type \{[^}]*IllustratedRendererOverrides[^}]*\} from '\.\/types';/,
    'wrapper 必须从 platform types 引入 override contract',
  );
  // 仍然只用现有的 $props 转发，不新增 adapter 层。
  assert.match(wrapperSource, /v-bind="\$props"/);
  assert.ok(
    !/<template|v-if|v-for|:is=/.test(wrapperSource.replace(/<template>[\s\S]*?<\/template>/, '')),
    'wrapper 不得新增额外结构或 adapter',
  );
});

test('portrait template ref 依赖 capability，不依赖默认组件 instance type', () => {
  assert.match(
    sheetSource,
    /const portraitPaneElement = ref<IllustratedPortraitModuleHandle \| null>\(null\);/,
  );
  // 父级不再用 InstanceType<typeof DefaultComponent>，否则 override 一接上类型层就退回默认实现。
  assert.ok(
    !/InstanceType<typeof\s+Illustrated/.test(sheetSource),
    '父级不得把默认组件的 instance type 当作 template ref 类型',
  );
  // 默认实现与 contract 共用同一个 return type。
  assert.match(portraitPaneSource, /function captureCurrentFrame\(\): IllustratedPortraitFrame \| null \{/);
  assert.match(portraitPaneSource, /import type \{ IllustratedPortraitFrame \} from '\.\.\/types';/);
});

test('platform contract 定义了窄的 portrait capability', () => {
  assert.match(
    typesSource,
    /export type IllustratedPortraitFrame = \{\s*source: CanvasImageSource;\s*width: number;\s*height: number;\s*\};/,
  );
  assert.match(
    typesSource,
    /export type IllustratedPortraitModuleHandle = \{\s*captureCurrentFrame\(\): IllustratedPortraitFrame \| null;\s*\};/,
  );
});

test('五个模块的 props / emits / expose contract 已在 types.ts 写明', () => {
  for (const needle of [
    '`vm`, `compact?`',
    '`layoutChange`',
    '`attributes`, `resourceBoxes`, `entranceQuoteText?`',
    '`toggleAttributeFormula(key)`, `openEntranceQuote`',
    '`vm`, `portrait`, `isOverviewTab`, `forceMobileLayout`',
    '`fallbackToDefault`, `openEntranceQuote(event)`',
    '`item`, `showCost?`, `variant?`',
    '`tabs`, `activeTab`, `savePhase`, `showImportAction`',
    '`setTab(tab)`, `toggleImportMenu`',
  ]) {
    assert.ok(typesSource.includes(needle), `contract 注释缺少：${needle}`);
  }
  // 不得引入 generic type framework / registry。
  assert.ok(!/interface\s+\w*Registry/.test(typesSource));
  assert.ok(!/Component<[^>]/.test(typesSource), '保持简单的 Component，不做 Vue generic 化');
});
