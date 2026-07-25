const assert = require('node:assert/strict');
const test = require('node:test');

const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const { loadSpecialNpcCharacterReference } = require('../../src/char_info_viewer/specialNpcCharacterData.ts');

test('a character without an image uses the normal layout', () => {
  const vm = buildCharacterViewModel({ 姓名: '普通角色' });

  assert.equal(vm.layoutKind, 'default');
  assert.equal(vm.specialNpcProfile, null);
});

test('角色图片 routes an ordinary character to the generic special NPC layout', () => {
  const vm = buildCharacterViewModel({
    姓名: '傲雪',
    角色图片: 'https://example.com/aoxue.png',
  });

  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.imageUrl, 'https://example.com/aoxue.png');
  assert.equal(vm.specialNpcProfile?.visualTheme, 'default');
});

test('a mapped character name alone only uses the generic special NPC layout', () => {
  const vm = buildCharacterViewModel({ 姓名: '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯' });

  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.specialNpcProfile?.visualTheme, 'default');
});

test('a dedicated special NPC reference enables its DX visual theme', () => {
  const vm = buildCharacterViewModel({
    姓名: '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯',
    __char_info_ref: 'special_npc_02_anastasia',
  });

  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.specialNpcProfile?.visualTheme, 'anastasia');
});

test('an unknown special NPC reference cannot enable a DX visual theme', () => {
  const vm = buildCharacterViewModel({
    姓名: '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯',
    __char_info_ref: 'special_npc_unknown',
  });

  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.specialNpcProfile?.visualTheme, 'default');
});

test('worldbook DX references mark display data without polluting injected character data', async t => {
  const originalGlobals = {
    getCharWorldbookNames: global.getCharWorldbookNames,
    getChatWorldbookName: global.getChatWorldbookName,
    getGlobalWorldbookNames: global.getGlobalWorldbookNames,
    getWorldbook: global.getWorldbook,
  };
  t.after(() => Object.assign(global, originalGlobals));

  global.getCharWorldbookNames = () => ({ primary: '命定之诗', additional: [] });
  global.getChatWorldbookName = () => null;
  global.getGlobalWorldbookNames = () => [];
  global.getWorldbook = async () => [
    {
      name: 'char_info_special_profiles',
      content: `<special_npc_registry>
<special_npc id="special_npc_02_anastasia" appear_variable="$special_npc_02_anastasia_appear">
<inject_var>
姓名: 安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯
等级: 12
</inject_var>
</special_npc>
</special_npc_registry>`,
    },
  ];

  const resolved = await loadSpecialNpcCharacterReference('special_npc_02_anastasia');

  assert.equal(resolved.data.__char_info_ref, 'special_npc_02_anastasia');
  assert.equal(resolved.injectData.__char_info_ref, undefined);
});

test('登场台词 is exposed as optional display text for the special NPC overview', () => {
  const withQuote = buildCharacterViewModel({
    姓名: '傲雪',
    角色图片: 'https://example.com/aoxue.png',
    登场台词: '  霜雪会记住每一道剑痕。  ',
  });
  const withoutQuote = buildCharacterViewModel({
    姓名: '傲雪',
    角色图片: 'https://example.com/aoxue.png',
  });

  assert.equal(withQuote.entranceQuoteText, '霜雪会记住每一道剑痕。');
  assert.equal(withoutQuote.entranceQuoteText, '');
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
