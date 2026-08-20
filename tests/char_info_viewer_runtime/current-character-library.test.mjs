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

test('手动刷新会重读变量并强制重挂当前 CharInfo floors', async () => {
  const source = await readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');

  assert.match(source, /const forceRefreshCharInfo = async \(\) => \{/);
  assert.match(source, /await refreshLibrary\(\)/);
  assert.match(source, /const messageIds = Array\.from\(activeFloorIds\)/);
  assert.match(source, /removeMessage\(messageId\)/);
  assert.match(source, /renderMessage\(messageId\)/);
  assert.match(source, /onRefreshLibrary: \(\) => void forceRefreshCharInfo\(\)/);
});

test('Creator 即时写入当前 draft 时强校验 CharInfo、状态栏相簿与头像，并复用同一 Force Refresh callback', async () => {
  const runtimeSource = await readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
  const overlaySource = await readFile(new URL('../../src/char_info_creator_manager/overlay.ts', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

  assert.match(runtimeSource, /onForceRefresh: forceRefreshCharInfo/);
  assert.match(overlaySource, /onForceRefresh: options\.onForceRefresh/);
  assert.match(appSource, /const canApplyCurrentProfile = computed/u);
  assert.match(appSource, /applyCurrentProfileToCurrentChat/u);
  assert.match(appSource, /normalizeProfile\(toFullSerializableProfile\(\)\)/u);
  assert.match(appSource, /buildManagedEjsBlock\(currentProfile\)/u);
  assert.match(appSource, /syncStatusGallerySnapshotToCurrentChat\(currentProfile\.characterName, expectedStatusGalleryImages\)/u);
  assert.match(appSource, /JSON\.stringify\(appliedRecord\.gallery \?\? null\) !== JSON\.stringify\(expectedGallery\)/u);
  assert.match(appSource, /status\.externalGalleries 中的状态栏相簿没有正确写入/u);
  assert.match(appSource, /status\.externalAvatars 中的状态栏头像没有正确写入/u);
  assert.match(appSource, /toastr\.warning/u);
  assert.match(appSource, /状态栏相簿目前仅支援/u);
  assert.match(appSource, /await props\.onForceRefresh\?\.\(\)/);
  assert.match(appSource, /即时写入变量及状态栏/u);
  assert.match(appSource, /当前聊天变量未修改/u);
});

test('从世界书角色库进入 Creator 时提供直接返回角色库的回调', async () => {
  const runtimeSource = await readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
  const overlaySource = await readFile(new URL('../../src/char_info_creator_manager/overlay.ts', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

  assert.match(runtimeSource, /onReturnToWorldbookLibrary: \(\) => \{[\s\S]*?closeCreatorEditor\(\);[\s\S]*?openWorldbookLibrary\(\);/u);
  assert.match(overlaySource, /onReturnToWorldbookLibrary: options\.onReturnToWorldbookLibrary/u);
  assert.match(appSource, /v-if="props\.onReturnToWorldbookLibrary"/u);
  assert.match(appSource, /← 返回角色库/u);
});
