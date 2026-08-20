const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const {
  getLegacyVisualProfileSource,
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

test('自定义故事不会参与 YAML 解析或阻止媒体 profile 授予 Special NPC', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '故事角色', 等级: 13 },
    {
      char_info: {
        profiles: {
          故事角色: {
            schema_version: 2,
            gallery: [{ title: '备用立绘', sources: ['https://example.com/story.mp4'] }],
            metadata: {
              story_sections: [
                { title: 'op', content: '123' },
                { title: 'ed', content: '456' },
              ],
            },
          },
        },
      },
    },
  );
  const vm = buildCharacterViewModel(data);

  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.nameText, '故事角色');
  assert.equal(vm.imageUrl, 'https://example.com/story.mp4');
  assert.deepEqual(vm.storySections, [
    { title: 'op', content: '123' },
    { title: 'ed', content: '456' },
  ]);
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

test('无立绘角色继续使用普通无图路径，正文旧图片字段不会压过同名 v2 profile', () => {
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
  assert.equal(buildCharacterViewModel(portrait).layoutKind, 'special_npc');
  assert.equal(buildCharacterViewModel(portrait).imageUrl, 'https://example.com/v2.png');
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

test('暂时兼容的 char_info_visuals 同名资料仍可授予 Special NPC，并标记迁移来源', () => {
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
  assert.equal(getLegacyVisualProfileSource(data), 'char_info_visuals');
});

test('历史 char_info.visual / char_info.visuals 路径只按精确姓名兼容 Special NPC', () => {
  for (const root of ['visual', 'visuals']) {
    const matching = resolveCharacterVisualConfig(
      { 姓名: '旧路径角色' },
      {
        char_info: {
          [root]: {
            旧路径角色: { schema_version: 2, gallery: [{ sources: ['https://example.com/old-path.png'] }] },
          },
        },
      },
    );
    const mismatch = resolveCharacterVisualConfig(
      { 姓名: '其他角色' },
      {
        char_info: {
          [root]: {
            旧路径角色: { schema_version: 2, gallery: [{ sources: ['https://example.com/old-path.png'] }] },
          },
        },
      },
    );

    assert.equal(buildCharacterViewModel(matching).layoutKind, 'special_npc');
    assert.equal(getLegacyVisualProfileSource(matching), `char_info.${root}`);
    assert.equal(buildCharacterViewModel(mismatch).layoutKind, 'default');
    assert.equal(getLegacyVisualProfileSource(mismatch), null);
  }
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

test('旧版视觉兼容继续复用解析 warning 样式，并明确提示迁移与停止维护风险', () => {
  const appSource = fs.readFileSync(path.resolve(__dirname, '../../src/char_info_viewer/App.vue'), 'utf8');

  assert.match(appSource, /v-if="deprecatedVisualSyntaxWarning" class="parse-warning-card"/);
  assert.match(appSource, /后续版本不再保证维护/);
  assert.match(appSource, /char_info\.profiles v2/);
  assert.match(appSource, /正文旧版角色图片字段/);
});

