import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateCharacterCollapse,
  matchesCharacterFieldRules,
  parseCharacterFieldRules,
} from '../../src/char_info_viewer/services/characterCollapse.ts';

const baseOptions = {
  enabled: true,
  alwaysExpandRules: '',
  autoCollapseRules: '',
  levelGapEnabled: false,
  levelGap: 5,
  playerLevel: null,
};

test('折叠条件只匹配结构化字段，不会被背景故事中的文字误触发', () => {
  const data = {
    姓名: '阿尔文',
    种族: '人类',
    背景故事: '他曾经在精灵王国生活十年。',
  };

  assert.equal(matchesCharacterFieldRules(data, '种族: 精灵'), false);
  assert.deepEqual(
    evaluateCharacterCollapse(data, {
      ...baseOptions,
      autoCollapseRules: '种族: 精灵',
    }),
    { collapsed: false, reason: 'none' },
  );
});

test('value 支持显式星号通配，但仍只检查指定 key 的字段值', () => {
  const monster = {
    姓名: '荒原猎兽',
    种族: '魔物-野兽',
    背景故事: '曾被精灵猎人追捕。',
  };
  const highElf = {
    姓名: '赛尔菲',
    种族: '高精灵',
    背景故事: '来自高地森林。',
  };
  const human = {
    姓名: '阿尔文',
    种族: '人类',
    背景故事: '和精灵一起长大。',
  };

  assert.equal(matchesCharacterFieldRules(monster, '种族: 魔物'), false);
  assert.equal(matchesCharacterFieldRules(monster, '种族: 魔物*'), true);

  assert.equal(matchesCharacterFieldRules(highElf, '种族: 精灵'), false);
  assert.equal(matchesCharacterFieldRules(highElf, '种族: *精灵'), true);

  assert.equal(matchesCharacterFieldRules(human, '种族: *精灵*'), false);
  assert.equal(matchesCharacterFieldRules(human, '背景故事: *精灵*'), true);
});

test('key:value 支持数组字段、全角冒号和点路径，多个条件按 OR 匹配', () => {
  const data = {
    身份: ['冒险者', '魔物'],
    属性: { 力量: 7 },
  };

  assert.deepEqual(parseCharacterFieldRules('身份：魔物\n属性.力量: 7'), [
    { path: '身份', expected: '魔物' },
    { path: '属性.力量', expected: '7' },
  ]);
  assert.equal(matchesCharacterFieldRules(data, '身份: 魔物'), true);
  assert.equal(matchesCharacterFieldRules(data, '属性.力量: 7'), true);
});

test('始终展开优先于自动折叠与借过一下', () => {
  const decision = evaluateCharacterCollapse(
    {
      姓名: '小精灵',
      种族: '精灵',
      身份: ['魔物'],
      等级: 3,
    },
    {
      enabled: true,
      alwaysExpandRules: '种族: 精灵',
      autoCollapseRules: '身份: 魔物',
      levelGapEnabled: true,
      levelGap: 5,
      playerLevel: 20,
    },
  );

  assert.deepEqual(decision, { collapsed: false, reason: 'always-expand' });
});

test('自动折叠条件命中时折叠普通角色', () => {
  assert.deepEqual(
    evaluateCharacterCollapse(
      { 姓名: '洞穴哥布林', 种族: '哥布林', 等级: 8 },
      {
        ...baseOptions,
        autoCollapseRules: '种族: 哥布林\n种族: 史莱姆',
      },
    ),
    { collapsed: true, reason: 'rule' },
  );
});

test('借过一下按主角与角色等级差触发，并在等级缺失时 fail-open', () => {
  assert.deepEqual(
    evaluateCharacterCollapse(
      { 姓名: '低阶魔物', 等级: 15 },
      {
        ...baseOptions,
        levelGapEnabled: true,
        levelGap: 5,
        playerLevel: 20,
      },
    ),
    { collapsed: true, reason: 'level-gap' },
  );

  assert.deepEqual(
    evaluateCharacterCollapse(
      { 姓名: '未知等级魔物', 等级: '?' },
      {
        ...baseOptions,
        levelGapEnabled: true,
        levelGap: 5,
        playerLevel: 20,
      },
    ),
    { collapsed: false, reason: 'none' },
  );

  assert.deepEqual(
    evaluateCharacterCollapse(
      { 姓名: '无主角等级', 等级: 1 },
      {
        ...baseOptions,
        levelGapEnabled: true,
        levelGap: 5,
        playerLevel: null,
      },
    ),
    { collapsed: false, reason: 'none' },
  );
});

test('关闭折叠模式时忽略所有规则', () => {
  assert.deepEqual(
    evaluateCharacterCollapse(
      { 姓名: '哥布林', 种族: '哥布林', 等级: 1 },
      {
        enabled: false,
        alwaysExpandRules: '',
        autoCollapseRules: '种族: 哥布林',
        levelGapEnabled: true,
        levelGap: 1,
        playerLevel: 99,
      },
    ),
    { collapsed: false, reason: 'disabled' },
  );
});
