import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildCurrentCharacterViewerData,
  collectChangedAffinityNames,
  collectCurrentCharacterSnapshots,
} from '../../src/char_info_viewer_runtime/currentCharacterLibrary.ts';

test('当前角色资料库只读取最新消息 MVU 的关系列表', () => {
  const result = collectCurrentCharacterSnapshots(
    {
      stat_data: {
        关系列表: {
          维纳斯: { 在场: false, 种族: '神性生命', 身份: ['女神'], 等级: 99, 好感度: -12, 心里话: '别靠近我。' },
          Iris: {
            在场: true,
            种族: '星辉水母',
            身份: ['旅伴', '术士'],
            等级: 14,
            好感度: '50',
            心里话: '今天也要一起旅行。',
          },
        },
      },
    },
    {
      status: {
        externalAvatars: {
          partners: {
            Iris: { url: 'https://example.com/iris-avatar.png' },
          },
        },
      },
    },
  );

  assert.deepEqual(
    result.map(({ name, race, identity, level, inScene, affinity, innerThought }) => ({
      name,
      race,
      identity,
      level,
      inScene,
      affinity,
      innerThought,
    })),
    [
      {
        name: 'Iris',
        race: '星辉水母',
        identity: '旅伴 · 术士',
        level: '14',
        inScene: true,
        affinity: 50,
        innerThought: '今天也要一起旅行。',
      },
      {
        name: '维纳斯',
        race: '神性生命',
        identity: '女神',
        level: '99',
        inScene: false,
        affinity: -12,
        innerThought: '别靠近我。',
      },
    ],
  );
  assert.deepEqual(collectCurrentCharacterSnapshots({ 关系列表: { Iris: {} } }), []);
  assert.equal(result[0].avatarUrl, 'https://example.com/iris-avatar.png');
  assert.equal(result[1].avatarUrl, '');
});

test('只把既有角色实际发生的好感度变化标记为未读', () => {
  const previous = {
    stat_data: {
      关系列表: {
        Iris: { 好感度: 49 },
        维纳斯: { 好感度: -12 },
        已离开: { 好感度: 10 },
      },
    },
  };
  const next = {
    stat_data: {
      关系列表: {
        Iris: { 好感度: 50 },
        维纳斯: { 好感度: -12 },
        新角色: { 好感度: 0 },
      },
    },
  };

  assert.deepEqual(collectChangedAffinityNames(next, previous), ['Iris']);
  assert.deepEqual(collectChangedAffinityNames(next, null), []);
});

test('查看器资料保留当前快照，并把 MVU 外貌/着装字段转换为 Viewer 字段', () => {
  const nested = { 装备: { 武器: ['法杖'] } };
  const snapshot = collectCurrentCharacterSnapshots({
    stat_data: {
      关系列表: {
        Iris: {
          姓名: '错误旧名',
          种族: '星辉水母',
          在场: true,
          外貌: '银色长发',
          着装: '星辉长裙',
          ...nested,
        },
      },
    },
  })[0];

  const viewerData = buildCurrentCharacterViewerData(snapshot);
  assert.deepEqual(viewerData, {
    姓名: 'Iris',
    种族: '星辉水母',
    在场: true,
    外貌: '银色长发',
    着装: '星辉长裙',
    装备: { 武器: ['法杖'] },
    外貌特质: '银色长发',
    衣物装饰: '星辉长裙',
  });
  assert.notEqual(viewerData.装备, nested.装备);
});

test('资料库列表优先使用 avatarUrl 图片，并保留无头像时的姓名首字回退', async () => {
  const source = await readFile(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8');

  assert.match(source, /<img[\s\S]*v-if="character\.avatarUrl[^"]*"[\s\S]*:src="character\.avatarUrl"/);
  assert.match(source, /v-else[\s\S]*character\.name\.slice\(0,\s*1\)/);
});
