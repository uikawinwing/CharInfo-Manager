const assert = require('node:assert/strict');
const test = require('node:test');

const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const { resolveCharacterVisualConfig } = require('../../src/char_info_viewer/services/themeService.ts');

test('非 DX 角色只要解析到立绘就进入独立 Special NPC 路由', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '特别角色' },
    {
      char_info: {
        profiles: {
          特别角色: { gallery: [{ sources: ['https://example.com/special.png'] }] },
        },
      },
    },
  );

  assert.equal(data.角色图片, 'https://example.com/special.png');
  assert.equal(buildCharacterViewModel(data).layoutKind, 'special_npc');
});

test('无立绘角色继续使用普通无图路径，显式立绘同样是 Special NPC', () => {
  const normal = resolveCharacterVisualConfig(
    { 姓名: '特别角色' },
    { char_info: { profiles: { 特别角色: {} } } },
  );
  const portrait = resolveCharacterVisualConfig(
    { 姓名: '普通立绘角色', 角色图片: 'https://example.com/portrait.png' },
    { char_info: { profiles: { 普通立绘角色: {} } } },
  );

  assert.equal(buildCharacterViewModel(normal).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(portrait).layoutKind, 'special_npc');
});

test('手造 DX 引用仍使用同名立绘的 Special NPC 路由', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '维纳丝·珀菈·索伦蒂斯', __dx_character_ref: 'dx_venus' },
    {
      char_info: {
        profiles: {
          '维纳丝·珀菈·索伦蒂斯': { gallery: [{ sources: ['https://example.com/special.png'] }] },
        },
      },
    },
  );

  assert.equal(buildCharacterViewModel(data).layoutKind, 'special_npc');
});
