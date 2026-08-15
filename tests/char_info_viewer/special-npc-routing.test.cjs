const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const {
  hasDeprecatedVisualSyntax,
  resolveCharacterVisualConfig,
  resolveCharacterVisualPreview,
} = require('../../src/char_info_viewer/services/themeService.ts');

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
  assert.equal(hasDeprecatedVisualSyntax(data), false);
});

test('Creator 草稿预览只把视觉资料授予同名角色', () => {
  const visualConfig = {
    schema_version: 1,
    custom_racecolor: '#112233',
    custom_tiercolor: '#445566',
    登场台词: '草稿台词',
    gallery: [{ title: '草稿立绘', sources: ['https://example.com/draft.png'] }],
  };
  const matching = resolveCharacterVisualPreview({ 姓名: '预览角色' }, '预览角色', visualConfig);
  const mismatch = resolveCharacterVisualPreview({ 姓名: '另一个角色' }, '预览角色', visualConfig);

  assert.equal(buildCharacterViewModel(matching).layoutKind, 'special_npc');
  assert.equal(matching.角色图片, 'https://example.com/draft.png');
  assert.equal(matching.登场台词, '草稿台词');
  assert.equal(buildCharacterViewModel(mismatch).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(mismatch).imageUrl, '');
});

test('无立绘角色继续使用普通无图路径，正文旧图片语法优先于残留 v2 profile', () => {
  const normal = resolveCharacterVisualConfig(
    { 姓名: '特别角色' },
    { char_info: { profiles: { 特别角色: {} } } },
  );
  const portrait = resolveCharacterVisualConfig(
    { 姓名: '普通立绘角色', 角色图片: 'https://example.com/portrait.png' },
    {
      char_info: {
        profiles: {
          普通立绘角色: { gallery: [{ sources: ['https://example.com/v2.png'] }] },
        },
      },
    },
  );

  assert.equal(buildCharacterViewModel(normal).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(portrait).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(portrait).imageUrl, '');
  assert.equal(hasDeprecatedVisualSyntax(normal), false);
  assert.equal(hasDeprecatedVisualSyntax(portrait), true);
});

test('普通变量占位符与其他图片字段不得进入 Normal Viewer 图片数据', () => {
  const placeholder = resolveCharacterVisualConfig(
    { 姓名: '占位符角色', 角色图片: '[[some_visual]]' },
    { some_visual: { url: 'https://example.com/placeholder.png' } },
  );
  const alternateField = resolveCharacterVisualConfig(
    { 姓名: '其他字段角色', image: 'https://example.com/other-field.png' },
    {},
  );
  const forgedInternal = buildCharacterViewModel({
    姓名: '伪造内部图片角色',
    __char_info_image_urls: ['https://example.com/forged.png'],
    __char_info_image_source_groups: [['https://example.com/forged.png']],
  });

  assert.equal(placeholder.角色图片, undefined);
  assert.equal(buildCharacterViewModel(placeholder).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(placeholder).imageUrl, '');
  assert.equal(buildCharacterViewModel(alternateField).layoutKind, 'default');
  assert.equal(buildCharacterViewModel(alternateField).imageUrl, '');
  assert.equal(forgedInternal.layoutKind, 'default');
  assert.equal(forgedInternal.imageUrl, '');
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

test('旧版视觉语法退回 Normal 时复用解析 warning 样式提示升级 v2', () => {
  const appSource = fs.readFileSync(path.resolve(__dirname, '../../src/char_info_viewer/App.vue'), 'utf8');

  assert.match(appSource, /v-if="deprecatedVisualSyntaxWarning" class="parse-warning-card"/);
  assert.match(appSource, /升级至 v2/);
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
