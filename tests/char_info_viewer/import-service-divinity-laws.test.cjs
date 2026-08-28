const assert = require('node:assert/strict');
const test = require('node:test');

const { mergeCharacterIntoMvuData } = require('../../src/char_info_viewer/services/importService.ts');

const COMPLETE_CHARACTER_KEYS = [
  '在场',
  '种族',
  '身份',
  '职业',
  '生命层级',
  '等级',
  '属性',
  '生命值',
  '法力值',
  '体力值',
  '状态效果',
  '背包',
  '装备',
  '技能',
  '资产',
  '登神长阶',
  '性格',
  '喜爱',
  '外貌',
  '着装',
  '命定契约',
  '好感度',
  '心里话',
  '背景故事',
];

function expectedResource(value) {
  return {
    当前: value,
    上限: { _基础: value, 额外: 0 },
  };
}

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

  const divinity = currentVars.stat_data.关系列表.第七层测试角色.登神长阶;
  const laws = divinity.法则;
  assert.equal(divinity.是否开启, true);
  assert.deepEqual(Object.keys(laws), ['旧律', '新律']);
  assert.equal(laws.旧律.被动效果, '旧律被动');
  assert.equal(laws.新律.被动效果, '第七层新律被动');
  assert.equal(laws.新律.主动效果, '旧版新律主动');
});

test('导入已有角色时保留未覆盖运行时字段，同时用 CharInfo 资源覆盖三项资源', () => {
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
  assert.deepEqual(character.生命值, expectedResource(1200));
  assert.deepEqual(character.法力值, expectedResource(800));
  assert.deepEqual(character.体力值, expectedResource(700));
  assert.equal(character.登神长阶.是否开启, false);
});

test('新角色始终创建完整关系列表 schema，并把 HP MP SP 同步到当前与基础', () => {
  const currentVars = { stat_data: { 关系列表: {} } };

  mergeCharacterIntoMvuData(
    {
      姓名: '新角色',
      资源: { HP: 1500, MP: 600, SP: 900 },
    },
    currentVars,
  );

  const character = currentVars.stat_data.关系列表.新角色;
  COMPLETE_CHARACTER_KEYS.forEach(key => {
    assert.ok(Object.prototype.hasOwnProperty.call(character, key), `missing schema key: ${key}`);
  });
  assert.deepEqual(character.生命值, expectedResource(1500));
  assert.deepEqual(character.法力值, expectedResource(600));
  assert.deepEqual(character.体力值, expectedResource(900));
  assert.deepEqual(character.资产, {});
  assert.deepEqual(character.登神长阶, {
    是否开启: false,
    神位: '',
    神国: { 名称: '', 描述: '' },
    要素: {},
    权能: {},
    法则: {},
  });
});

test('已有残缺角色也会补齐缺失 schema；CharInfo 没有登神资料时明确写 false', () => {
  const currentVars = {
    stat_data: {
      关系列表: {
        残缺角色: {
          等级: 5,
          _保留字段: 'keep',
          登神长阶: {
            是否开启: true,
            神位: '旧神位',
          },
        },
      },
    },
  };

  mergeCharacterIntoMvuData(
    {
      姓名: '残缺角色',
      性格: '新资料',
    },
    currentVars,
  );

  const character = currentVars.stat_data.关系列表.残缺角色;
  COMPLETE_CHARACTER_KEYS.forEach(key => {
    assert.ok(Object.prototype.hasOwnProperty.call(character, key), `missing schema key: ${key}`);
  });
  assert.equal(character._保留字段, 'keep');
  assert.equal(character.登神长阶.是否开启, false);
  assert.equal(character.登神长阶.神位, '旧神位');
  assert.deepEqual(character.生命值, expectedResource(0));
  assert.deepEqual(character.法力值, expectedResource(0));
  assert.deepEqual(character.体力值, expectedResource(0));
  assert.deepEqual(character.资产, {});
});

test('CharInfo 明确写登神长阶是否开启 false 时，即使有登神资料也保持 false', () => {
  const currentVars = { stat_data: { 关系列表: {} } };

  mergeCharacterIntoMvuData(
    {
      姓名: '未开启登神角色',
      登神长阶: {
        是否开启: false,
        神位: '候补神位',
      },
    },
    currentVars,
  );

  const divinity = currentVars.stat_data.关系列表.未开启登神角色.登神长阶;
  assert.equal(divinity.是否开启, false);
  assert.equal(divinity.神位, '候补神位');
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
