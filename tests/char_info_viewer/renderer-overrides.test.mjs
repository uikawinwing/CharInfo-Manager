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
