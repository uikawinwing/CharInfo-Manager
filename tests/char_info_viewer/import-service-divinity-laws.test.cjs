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

test('从聊天角色资料导入时完整保留性格文本，不截断英文标识后的正文', () => {
  const currentVars = { stat_data: { 关系列表: {} } };
  const personality =
    'dhAGz(S)。看似悲愤实则刻板冷漠，追求绝对的纯粹与完美。遇到计划外的事物容易在内心产生烦躁，但表面极力维持庄重。';

  mergeCharacterIntoMvuData(
    {
      姓名: '瓦莉·希尔·奥古斯丁',
      性格: personality,
    },
    currentVars,
  );

  assert.equal(currentVars.stat_data.关系列表.瓦莉·希尔·奥古斯丁.性格, personality);
});
