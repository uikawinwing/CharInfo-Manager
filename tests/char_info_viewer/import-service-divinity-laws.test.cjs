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

test('导入已有角色时只覆盖传入字段，并保留新版或运行时状态字段', () => {
  const currentVars = {
    stat_data: {
      关系列表: {
        测试角色: {
          在场: false,
          _隐藏: true,
          标签: ['主线NPC'],
          等级: 5,
          命定契约: true,
          好感度: 72,
          心里话: '保留这句',
          技能: { 旧技能: { 描述: '未传入技能时应保留' } },
          资产: { 私人庄园: { 类型: '领地' } },
          生命值: {
            当前: 480,
            上限: { _基础: 900, 额外: 100 },
          },
        },
      },
    },
  };

  mergeCharacterIntoMvuData(
    {
      姓名: '测试角色',
      等级: 9,
      资源: { HP: 1200, MP: 800, SP: 700 },
    },
    currentVars,
  );

  const character = currentVars.stat_data.关系列表.测试角色;
  assert.equal(character.等级, 9);
  assert.equal(character.在场, false);
  assert.equal(character._隐藏, true);
  assert.deepEqual(character.标签, ['主线NPC']);
  assert.equal(character.命定契约, true);
  assert.equal(character.好感度, 72);
  assert.equal(character.心里话, '保留这句');
  assert.deepEqual(character.技能, { 旧技能: { 描述: '未传入技能时应保留' } });
  assert.deepEqual(character.资产, { 私人庄园: { 类型: '领地' } });
  assert.deepEqual(character.生命值, {
    当前: 480,
    上限: { _基础: 900, 额外: 100 },
  });
  assert.equal(character.法力值, undefined);
  assert.equal(character.体力值, undefined);
});

test('CharInfo 资源只用于展示，不创建 MVU 资源字段', () => {
  const currentVars = { stat_data: { 关系列表: {} } };

  mergeCharacterIntoMvuData(
    {
      姓名: '新角色',
      资源: { HP: 1500, MP: 600, SP: 900 },
    },
    currentVars,
  );

  const character = currentVars.stat_data.关系列表.新角色;
  assert.equal(character.在场, true);
  assert.equal(character.命定契约, false);
  assert.equal(character.好感度, 0);
  assert.equal(character.心里话, '');
  assert.equal(character.生命值, undefined);
  assert.equal(character.法力值, undefined);
  assert.equal(character.体力值, undefined);
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
