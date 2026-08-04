const assert = require('node:assert/strict');
const test = require('node:test');

const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const { buildDivinitySections } = require('../../src/char_info_viewer/components/illustrated/divinitySections.ts');

test('keeps the complete law collection when legacy top-level data accompanies the current divinity field', () => {
  const vm = buildCharacterViewModel({
    姓名: '第七层测试角色',
    法则: [
      { 名称: '旧律', 被动效果: '旧律被动', 主动效果: '旧律主动' },
      { 名称: '新律', 被动效果: '旧版新律被动', 主动效果: '旧版新律主动' },
    ],
    登神长阶: {
      法则: [{ 名称: '新律', 被动效果: '第七层新律被动' }],
    },
  });

  assert.deepEqual(vm.divinityLaws.map(law => law.名称), ['旧律', '新律']);
  assert.deepEqual(vm.divinityLaws[1], {
    名称: '新律',
    被动效果: '第七层新律被动',
    主动效果: '旧版新律主动',
  });
  assert.deepEqual(
    buildDivinitySections(vm).map(section => [section.kind, section.title, section.body]),
    [
      ['被动', '旧律', '旧律被动'],
      ['主动', '旧律', '旧律主动'],
      ['被动', '新律', '第七层新律被动'],
      ['主动', '新律', '旧版新律主动'],
    ],
  );
});
