const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const { mergeCharacterIntoMvuData } = require('../../src/char_info_viewer/services/importService.ts');
const {
  loadDxCharacterReference,
  parseDxCharacterReference,
} = require('../../src/char_info_viewer/dxCharacterData.ts');
const {
  dxCharacterRoster,
  findDxCharacterByName,
  resolveDxCharacterProfile,
} = require('../../src/char_info_viewer/dxCharacterRoster.ts');
const appSource = readFileSync(path.join(__dirname, '../../src/char_info_viewer/App.vue'), 'utf8');
const dxRegistrySource = readFileSync(path.join(__dirname, '../../dx_character_profiles.worldentry.txt'), 'utf8');

function mockWorldbook(t, worldbookName, content) {
  const originalGlobals = {
    getCharWorldbookNames: global.getCharWorldbookNames,
    getChatWorldbookName: global.getChatWorldbookName,
    getGlobalWorldbookNames: global.getGlobalWorldbookNames,
    getWorldbook: global.getWorldbook,
  };
  t.after(() => Object.assign(global, originalGlobals));
  global.getCharWorldbookNames = () => ({ primary: worldbookName, additional: [] });
  global.getChatWorldbookName = () => null;
  global.getGlobalWorldbookNames = () => [];
  global.getWorldbook = async () => [{ name: 'char_info_dx_characters', content }];
}

test('a character without an image uses the normal layout', () => {
  const vm = buildCharacterViewModel({ 姓名: '普通角色' });

  assert.equal(vm.layoutKind, 'default');
  assert.equal(vm.presentationProfile, null);
});

test('非 DX 角色的显式图片使用 Special NPC 布局', () => {
  const vm = buildCharacterViewModel({
    姓名: '傲雪',
    角色图片: 'https://example.com/aoxue.png',
  });

  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.imageUrl, 'https://example.com/aoxue.png');
  assert.equal(vm.presentationProfile, null);
});

test('DX 角色的精确姓名不会误匹配塞壬，瑟涟资料暂列 TODO', () => {
  const expected = [
    ['维纳丝·珀菈·索伦蒂斯', 'dx_venus'],
    ['安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯', 'dx_anastasia'],
    ['艾璃丝·赛瑞利亚', 'dx_iris'],
    ['瑟涟·赛瑞利亚', 'dx_seren'],
  ];

  assert.equal(dxCharacterRoster.length, 4);
  expected.forEach(([name, id]) => {
    assert.equal(findDxCharacterByName(name)?.id, id);
    assert.equal(resolveDxCharacterProfile(id, name)?.edition, 'dx');
  });
  assert.equal(findDxCharacterByName('瑟涟·赛瑞利亚')?.hasRegistryData, false);
  assert.equal(findDxCharacterByName('塞壬·赛瑞利亚'), null);
});

test('瑟涟 DX 注册资料保留为待启用草稿', () => {
  assert.match(dxRegistrySource, /<dx_character id="dx_seren" appear_variable="\$dx_seren_appear">/u);
  assert.match(dxRegistrySource, /<dx_character id="dx_seren"[\s\S]*?姓名: 瑟涟·赛瑞利亚/u);
  assert.match(dxRegistrySource, /<dx_character id="dx_seren"[\s\S]*?等级: 14/u);
});

test('DX roster 的精确姓名会使用 DX edition 与其主题', () => {
  const vm = buildCharacterViewModel({ 姓名: '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯' });

  assert.equal(vm.layoutKind, 'illustrated');
  assert.equal(vm.presentationProfile?.edition, 'dx');
  assert.equal(vm.presentationProfile?.visualTheme, 'anastasia');
});

test('有效 DX 引用使用 DX 主题；未知引用不产生 DX profile', () => {
  const dxVm = buildCharacterViewModel({
    姓名: '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯',
    __dx_character_ref: 'dx_anastasia',
  });
  const unknownVm = buildCharacterViewModel({
    姓名: '普通角色',
    __dx_character_ref: 'dx_unknown',
  });

  assert.equal(dxVm.layoutKind, 'illustrated');
  assert.equal(dxVm.presentationProfile?.edition, 'dx');
  assert.equal(dxVm.presentationProfile?.visualTheme, 'anastasia');
  assert.equal(unknownVm.presentationProfile, null);
  assert.equal(unknownVm.layoutKind, 'default');
});

test('DX 引用只接受新占位符；旧占位符与旧 ID 都不再被识别', () => {
  const legacyId = ['special', 'npc', '01', 'venus'].join('_');
  assert.deepEqual(parseDxCharacterReference('__dx_character_ref: dx_venus'), {
    kind: 'reference',
    reference: 'dx_venus',
  });
  assert.deepEqual(parseDxCharacterReference('__dx_character_ref: dx_unknown'), {
    kind: 'reference',
    reference: 'dx_unknown',
  });
  assert.deepEqual(parseDxCharacterReference(`__char_info_ref: ${legacyId}`), { kind: 'not_reference' });
  assert.deepEqual(parseDxCharacterReference(`__dx_character_ref: ${legacyId}`), { kind: 'not_reference' });
});

test('世界书 DX 引用为显示资料写入新标记，不污染精简注入资料', async t => {
  mockWorldbook(
    t,
    'DX 引用测试世界书',
    `<dx_character_registry>
<dx_character id="dx_anastasia" appear_variable="$dx_anastasia_appear">
<inject_var>
姓名: 安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯
等级: 12
</inject_var>
</dx_character>
</dx_character_registry>`,
  );

  const resolved = await loadDxCharacterReference('dx_anastasia');

  assert.equal(resolved.data.__dx_character_ref, 'dx_anastasia');
  assert.equal(resolved.injectData.__dx_character_ref, undefined);
});

test('未知 DX ID 与暂列 TODO 的瑟涟引用都不会自动读取注入资料', async t => {
  await assert.rejects(() => loadDxCharacterReference('dx_unknown'), /未知 DX 角色引用/);
  await assert.rejects(() => loadDxCharacterReference('dx_seren'), /尚未配置注入资料/);
});

test('DX 注册表区块的合并姓名必须与 roster 精确一致', async t => {
  mockWorldbook(
    t,
    'DX 错误姓名测试世界书',
    `<dx_character_registry>
<dx_character id="dx_venus" appear_variable="$dx_venus_appear">
<inject_var>
姓名: 错误维纳丝
</inject_var>
</dx_character>
</dx_character_registry>`,
  );

  await assert.rejects(() => loadDxCharacterReference('dx_venus'), /inject_var 姓名不匹配/);
});

test('display_only 不能用正确姓名掩盖 inject_var 的错误姓名', async t => {
  mockWorldbook(
    t,
    'DX 注入姓名错配测试世界书',
    `<dx_character_registry>
<dx_character id="dx_venus" appear_variable="$dx_venus_appear">
<display_only>
姓名: 维纳丝·珀菈·索伦蒂斯
</display_only>
<inject_var>
姓名: 艾璃丝·赛瑞利亚
</inject_var>
</dx_character>
</dx_character_registry>`,
  );

  await assert.rejects(() => loadDxCharacterReference('dx_venus'), /inject_var 姓名不匹配/);
});

test('DX 注册表区块的 appear_variable 必须与 roster 精确一致', async t => {
  mockWorldbook(
    t,
    'DX 错误登场变量测试世界书',
    `<dx_character_registry>
<dx_character id="dx_venus" appear_variable="$dx_iris_appear">
<inject_var>
姓名: 维纳丝·珀菈·索伦蒂斯
</inject_var>
</dx_character>
</dx_character_registry>`,
  );

  await assert.rejects(() => loadDxCharacterReference('dx_venus'), /appear_variable 不匹配/);
});

test('inject_var 与 display_only 只由 DX 引用入口解释，手动导入使用完整资料', async t => {
  const fullPersonality = '完整性格文案。';
  mockWorldbook(
    t,
    'DX 完整资料测试世界书',
    `<dx_character_registry>
<dx_character id="dx_anastasia" appear_variable="$dx_anastasia_appear">
<display_only>
性格: |
  ${fullPersonality}
</display_only>
<inject_var>
姓名: 安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯
性格: 精简性格
</inject_var>
</dx_character>
</dx_character_registry>`,
  );

  const resolved = await loadDxCharacterReference('dx_anastasia');
  const variables = { stat_data: { 关系列表: {} } };
  mergeCharacterIntoMvuData(resolved.data, variables);

  assert.equal(resolved.injectData.性格, '精简性格');
  assert.equal(variables.stat_data.关系列表['安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯'].性格, fullPersonality);
  assert.match(appSource, /mvuImportData\.value = dxCharacterData\.data;/);
  assert.match(appSource, /scheduleDxCharacterAutoImport\(\s*dxCharacterData\.injectData,/);
});

test('gallery keeps animated GIF and MP4 URLs away from the static Catbox image proxy', () => {
  const gifUrl = 'https://files.catbox.moe/animated.gif';
  const mp4Url = 'https://files.catbox.moe/animated.mp4';
  const vm = buildCharacterViewModel({
    姓名: '动态媒体角色',
    角色图片: 'https://files.catbox.moe/main.png',
    __char_info_image_urls: ['https://files.catbox.moe/main.png', gifUrl, mp4Url],
  });

  assert.equal(vm.imageUrls[1], gifUrl);
  assert.equal(vm.imageUrls[2], mp4Url);
});
