const assert = require('node:assert/strict');
const test = require('node:test');

const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const { resolveCharacterVisualConfig } = require('../../src/char_info_viewer/services/themeService.ts');

test('同名 char_info.profiles 的有效立绘授予 Special NPC 路由', () => {
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

test('无立绘角色继续使用普通无图路径，正文显式立绘不得授予 Special NPC', () => {
  const normal = resolveCharacterVisualConfig(
    { 姓名: '特别角色' },
    { char_info: { profiles: { 特别角色: {} } } },
  );
  const portrait = resolveCharacterVisualConfig(
    { 姓名: '普通立绘角色', 角色图片: 'https://example.com/portrait.png' },
    { char_info: { profiles: { 普通立绘角色: {} } } },
  );

  assert.equal(buildCharacterViewModel(normal).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(portrait).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(portrait).imageUrl, 'https://example.com/portrait.png');
});

test('普通变量占位符与其他图片字段可以解析媒体，但不得授予 Special NPC', () => {
  const placeholder = resolveCharacterVisualConfig(
    { 姓名: '占位符角色', 角色图片: '[[some_visual]]' },
    { some_visual: { url: 'https://example.com/placeholder.png' } },
  );
  const alternateField = resolveCharacterVisualConfig(
    { 姓名: '其他字段角色', image: 'https://example.com/other-field.png' },
    {},
  );

  assert.equal(placeholder.角色图片, 'https://example.com/placeholder.png');
  assert.equal(buildCharacterViewModel(placeholder).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(alternateField).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(alternateField).imageUrl, 'https://example.com/other-field.png');
});

test('暂时兼容的 char_info_visuals 同名资料仍可授予 Special NPC', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '旧版特别角色' },
    {
      char_info_visuals: {
        旧版特别角色: { url: 'https://example.com/legacy-special.png' },
      },
    },
  );

  assert.equal(data.角色图片, 'https://example.com/legacy-special.png');
  assert.equal(buildCharacterViewModel(data).layoutKind, 'special_npc');
});

test('status external gallery 单独存在时不得授予 Special NPC', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '状态栏角色' },
    {
      status: {
        externalGalleries: {
          partners: {
            状态栏角色: { images: [{ title: '旧图库', url: 'https://example.com/status-only.png' }] },
          },
        },
      },
    },
  );

  assert.equal(data.角色图片, undefined);
  assert.equal(buildCharacterViewModel(data).layoutKind, 'default');
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
