const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildCharacterViewModel,
  itemCost,
  itemEffectOrDescription,
  itemPosition,
  itemQuantity,
  itemTags,
} = require('../../src/char_info_viewer/services/characterViewModel.ts');
const { mergeCharacterIntoMvuData } = require('../../src/char_info_viewer/services/importService.ts');
const { parseCharacterYaml } = require('../../src/char_info_viewer/services/yamlParser.ts');

test('renders YAML mapping tags created by an unquoted English colon', () => {
  const parsed = parseCharacterYaml([
    '姓名: 测试角色',
    '装备:',
    '  - 名称: B级冒险者徽章',
    '    标签: [冒险者: 公会, 稀有]',
  ].join('\n'));

  assert.equal(parsed.success, true);
  assert.deepEqual(itemTags(parsed.data.装备[0]), ['冒险者: 公会', '稀有']);
});

test('renders and imports the supported skill cost formats as readable text', () => {
  for (const [raw, expected] of [
    ['[动作: 15000 MP]', '动作: 15000 MP'],
    ['动作: 15000 MP', '动作: 15000 MP'],
    ['{动作: 15000 MP}', '动作: 15000 MP'],
    ['[动作: 1, MP: 0]', '动作: 1 / MP: 0'],
    ['[动作: 1] [MP: 0]', '动作: 1 / MP: 0'],
  ]) {
    const parsed = parseCharacterYaml(`姓名: 测试\n技能:\n  - 名称: 试招\n    消耗: ${raw}`);
    assert.equal(parsed.success, true, raw);
    assert.equal(itemCost(buildCharacterViewModel(parsed.data).skills[0]), expected);
    const vars = { stat_data: {} };
    mergeCharacterIntoMvuData(parsed.data, vars);
    assert.equal(vars.stat_data.关系列表.测试.技能.试招.消耗, expected);
  }
});

test('retains inventory quantities from generated lists and named records', () => {
  for (const items of [
    '  - 名称: 药水\n    數量: "3"',
    '  名称: 药水\n  持有數量: 3',
    '  药水: {数量: 3}',
    '  药水: 3',
  ]) {
    const parsed = parseCharacterYaml(`姓名: 测试\n道具:\n${items}`);
    assert.equal(parsed.success, true);
    const [item] = buildCharacterViewModel(parsed.data).inventorySections[0].items;
    assert.equal(item.名称, '药水');
    assert.equal(itemQuantity(item), '3');
    const vars = { stat_data: {} };
    mergeCharacterIntoMvuData(parsed.data, vars);
    assert.equal(vars.stat_data.关系列表.测试.背包.药水.数量, 3);
  }

  const parsed = parseCharacterYaml('姓名: 测试\n道具:\n  - 药水\n  - 名称: 试剂\n    数量: 0');
  assert.equal(parsed.success, true);
  const [potion, reagent] = buildCharacterViewModel(parsed.data).inventorySections[0].items;
  assert.equal(potion.名称, '药水');
  assert.equal(itemQuantity(potion), '');
  assert.equal(itemQuantity(reagent), '0');
  const vars = { stat_data: {} };
  mergeCharacterIntoMvuData(parsed.data, vars);
  assert.equal(vars.stat_data.关系列表.测试.背包.试剂.数量, 0);
});

test('renders equipment position, structured appearance, and both forms of ascension effects', () => {
  const parsed = parseCharacterYaml([
    '姓名: 测试',
    '外貌特质: {身高: 1.72米, 嗓音: 清亮}',
    '装备:',
    '  铁剑: {位置: 主手}',
    '登神长阶:',
    '  要素:',
    '    冰: {寒气: 无视严寒}',
    '  权能:',
    '    - 名称: 炎',
    '      效果: 烈焰：操纵火焰',
  ].join('\n'));
  assert.equal(parsed.success, true);
  const vm = buildCharacterViewModel(parsed.data);
  assert.equal(vm.appearanceText, '身高: 1.72米； 嗓音: 清亮');
  assert.equal(itemPosition(vm.equipments[0]), '主手');
  assert.equal(itemEffectOrDescription(vm.divinityElements[0]), '寒气: 无视严寒');
  assert.equal(itemEffectOrDescription(vm.divinityPowers[0]), '烈焰: 操纵火焰');
  const vars = { stat_data: {} };
  mergeCharacterIntoMvuData(parsed.data, vars);
  const character = vars.stat_data.关系列表.测试;
  assert.equal(character.外貌, vm.appearanceText);
  assert.equal(character.装备.铁剑.位置, '主手');
  assert.deepEqual(character.登神长阶.要素, { 冰: { 寒气: '无视严寒' } });
  assert.deepEqual(character.登神长阶.权能, { 炎: { 烈焰: '操纵火焰' } });
});

test('recovers repeated item quantities without guessing when they conflict', () => {
  const parsed = parseCharacterYaml([
    '姓名: 测试',
    '道具:',
    '  - 名称: 药水',
    '    数量: 3',
    '    效果: |',
    '      数量: 剩余剂量',
    '      数量: 推荐剂量',
    '    数量: "3"',
    '  - 名称: 材料',
    '    数量: 4',
    '    描述: 一袋材料',
    '    数量: 5',
    '  - 名称: 护符',
    '    数量: 1',
    '    数量: 2',
  ].join('\n'));

  assert.equal(parsed.success, true);
  const [potion, material, charm] = buildCharacterViewModel(parsed.data).inventorySections[0].items;
  assert.equal(itemQuantity(potion), '3');
  assert.equal(potion.效果, '数量: 剩余剂量\n数量: 推荐剂量\n');
  assert.equal(itemQuantity(material), '未确定');
  assert.equal(material.描述, '一袋材料');
  assert.equal(itemQuantity(charm), '未确定');

  const vars = { stat_data: { 关系列表: { 测试: { 背包: { 材料: { 数量: 9 } } } } } };
  mergeCharacterIntoMvuData(parsed.data, vars);
  const inventory = vars.stat_data.关系列表.测试.背包;
  assert.equal(inventory.药水.数量, 3);
  assert.equal(inventory.材料.数量, 9);
  assert.equal(inventory.护符, undefined);
});
