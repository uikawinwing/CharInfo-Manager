const assert = require('node:assert/strict');
const test = require('node:test');

const { itemTags } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const { parseCharacterYaml } = require('../../src/char_info_viewer/services/yamlParser.ts');

test('renders YAML mapping tags created by an unquoted English colon', () => {
  const parsed = parseCharacterYaml([
    '姓名: 测试角色',
    '装备:',
    '  - 名称: B级冒险者徽章',
    '    标签: [冒险者: 公会, 稀有]',
  ].join('\n'));

  assert.equal(parsed.success, true);
  assert.deepEqual(itemTags(parsed.data.装备[0]), ['冒险者: 公会', '稀有']);
});
