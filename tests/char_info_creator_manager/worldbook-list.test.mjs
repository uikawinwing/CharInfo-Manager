import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWorldbookList } from '../../src/char_info_creator_manager/worldbookList.ts';

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
