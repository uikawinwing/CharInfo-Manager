import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildCurrentWorldbookList,
  buildWorldbookList,
  loadWorldbookEntrySources,
} from '../../src/char_info_shared/worldbookList.ts';

const librarySource = await readFile(
  new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
  'utf8',
);
const creatorSource = await readFile(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

test('世界书角色库会组合四类当前有效世界书并一次扫描全部内容', () => {
  assert.match(librarySource, /getGlobalWorldbookNames\(\)/u);
  assert.match(librarySource, /getChatWorldbookName\('current'\)/u);
  assert.match(librarySource, /buildCurrentWorldbookList\(binding, globalWorldbooks, chatWorldbook\)/u);
  assert.match(librarySource, /loadWorldbookEntrySources\(worldbooks\.value, getWorldbook\)/u);
  assert.match(librarySource, /updateWorldbookWith\(\s*character\.worldbookName,/u);
  assert.match(
    librarySource,
    /source\.worldbookName === character\.worldbookName \? \{ \.\.\.source, entries: updated \} : source/u,
  );
});

test('Creator 世界书选择只使用当前角色相关、全局与当前聊天世界书', () => {
  assert.match(creatorSource, /getGlobalWorldbookNames\(\)/u);
  assert.match(creatorSource, /getChatWorldbookName\('current'\)/u);
  assert.match(creatorSource, /buildCurrentWorldbookList\(binding, globalWorldbooks, chatWorldbook\)/u);
});

test('当前角色绑定世界书置顶，其余世界书仍然可选', () => {
  assert.deepEqual(
    buildWorldbookList(
      ['角色主世界书', '角色追加世界书'],
      ['其他世界书', '角色主世界书', '公共资料库'],
    ),
    ['角色主世界书', '角色追加世界书', '其他世界书', '公共资料库'],
  );
});

test('忽略空名称并保留酒馆世界书的原有顺序', () => {
  assert.deepEqual(
    buildWorldbookList([null, '', '角色世界书'], ['资料库 B', undefined, '资料库 A']),
    ['角色世界书', '资料库 B', '资料库 A'],
  );
});

test('当前角色库只扫描角色主册、附加册、启用全局册与当前聊天册', () => {
  assert.deepEqual(
    buildCurrentWorldbookList(
      { primary: '角色主世界书', additional: ['角色附加 A', '角色附加 B', '共享册'] },
      ['全局设定', '共享册'],
      '当前聊天世界书',
    ),
    ['角色主世界书', '角色附加 A', '角色附加 B', '共享册', '全局设定', '当前聊天世界书'],
  );
});

test('角色库扫描会读取当前有效范围内的每一本世界书', async () => {
  const calls = [];
  const sources = await loadWorldbookEntrySources(['角色主世界书', '角色附加世界书', '全局世界书', '聊天世界书'], async name => {
    calls.push(name);
    return [{ uid: calls.length, name: `${name}角色` }];
  });

  assert.deepEqual(calls, ['角色主世界书', '角色附加世界书', '全局世界书', '聊天世界书']);
  assert.deepEqual(
    sources.map(source => ({ worldbookName: source.worldbookName, entryName: source.entries[0].name })),
    [
      { worldbookName: '角色主世界书', entryName: '角色主世界书角色' },
      { worldbookName: '角色附加世界书', entryName: '角色附加世界书角色' },
      { worldbookName: '全局世界书', entryName: '全局世界书角色' },
      { worldbookName: '聊天世界书', entryName: '聊天世界书角色' },
    ],
  );
});
