const assert = require('node:assert/strict');
const test = require('node:test');

const { mergeCharacterIntoMvuData } = require('../../src/char_info_viewer/services/importService.ts');

test('导入 MVU 时合并顶层与登神长阶中的法则，并让登神长阶覆盖同名字段', () => {
  const currentVars = { stat_data: { 关系列表: {} } };

  mergeCharacterIntoMvuData(
    {
      姓名: '第七层测试角色',
      法则: [
        { 名称: '旧律', 被动效果: '旧律被动', 主动效果: '旧律主动' },
        { 名称: '新律', 被动效果: '旧版新律被动', 主动效果: '旧版新律主动' },
      ],
      登神长阶: {
        法则: [{ 名称: '新律', 被动效果: '第七层新律被动' }],
      },
    },
    currentVars,
  );

  const laws = currentVars.stat_data.关系列表.第七层测试角色.登神长阶.法则;
  assert.deepEqual(Object.keys(laws), ['旧律', '新律']);
  assert.equal(laws.旧律.被动效果, '旧律被动');
  assert.equal(laws.新律.被动效果, '第七层新律被动');
  assert.equal(laws.新律.主动效果, '旧版新律主动');
});
