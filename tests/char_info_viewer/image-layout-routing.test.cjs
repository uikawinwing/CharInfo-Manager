const assert = require('node:assert/strict');
const test = require('node:test');
const { reactive } = require('vue');

const { buildCreatorViewerPreviewData, buildCreatorViewerVisualOverride } = require('../../src/char_info_creator_manager/viewerPreview.ts');
const { createEmptyProfile } = require('../../src/char_info_shared/characterVisualProfile.ts');
const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const {
  cloneCharacterDataWithVisualOverrides,
  resolveCharacterVisualConfig,
  resolveCharacterVisualMetadata,
  resolveCharacterVisualPreview,
} = require('../../src/char_info_viewer/services/themeService.ts');

test('a character without an image uses the normal layout', () => {
  const vm = buildCharacterViewModel({ 姓名: '普通角色' });

  assert.equal(vm.layoutKind, 'default');
});

test('Creator 示例资料进入真实 Preview 路由后保留姓名、等级、身份与资源', () => {
  const profile = {
    ...createEmptyProfile('千爻'),
    gallery: [{ title: '主立绘', sources: ['https://example.com/qianyao.png'] }],
  };
  const sampleData = buildCreatorViewerPreviewData(profile);
  const override = buildCreatorViewerVisualOverride(profile);
  const resolved = resolveCharacterVisualPreview(sampleData, override.characterName, override.config);
  const vm = buildCharacterViewModel(resolved);

  assert.equal(vm.nameText, '千爻');
  assert.equal(vm.levelText, '1');
  assert.equal(vm.tierText, '第一层级');
  assert.equal(vm.identityText, '旅人（示例） / 观察者（示例）');
  assert.equal(vm.classText, '剑士（示例） / 术式师（示例）');
  assert.deepEqual(vm.resourceBoxes.map(item => [item.label, item.value]), [
    ['HP', '100'],
    ['SP', '100'],
    ['MP', '100'],
  ]);
  assert.equal(vm.layoutKind, 'special_npc');
});

test('Current Character Viewer reads v1.9.5 MVU resource objects', () => {
  const vm = buildCharacterViewModel({
    姓名: '资源测试角色',
    生命值: { 当前: 480, 上限: { _基础: 900, 额外: 100 } },
    法力值: { 当前: 700, 上限: { _基础: 800, 额外: 50 } },
    体力值: { 当前: 650, 上限: { _基础: 700, 额外: 0 } },
  });

  assert.deepEqual(vm.resourceBoxes.map(item => [item.label, item.value]), [
    ['HP', '480'],
    ['SP', '650'],
    ['MP', '700'],
  ]);
});

test('正文显式图片不会授予 Special NPC 布局', () => {
  const vm = buildCharacterViewModel({
    姓名: '傲雪',
    角色图片: 'https://example.com/aoxue.png',
  });

  assert.equal(vm.layoutKind, 'default');
  assert.equal(vm.imageUrl, '');
});

test('metadata 单独存在不会授予 Special NPC，但会作为只读 presentation metadata 进入 ViewModel', () => {
  const resolved = resolveCharacterVisualConfig(
    { 姓名: '无图故事角色', 背景故事: '原始精简故事。' },
    {
      char_info: {
        profiles: {
          无图故事角色: {
            schema_version: 2,
            metadata: {
              author: '测试作者',
              version: '0816',
              author_note: '给读者的角色介绍。',
              sex: '女',
              race: '龙裔',
              story_sections: [{ title: '第一章', content: '作者展示故事。' }],
            },
          },
        },
      },
    },
  );
  const vm = buildCharacterViewModel(resolved);

  assert.equal(vm.layoutKind, 'default');
  assert.equal(vm.backstoryText, '原始精简故事。');
  assert.equal(vm.storyAuthorText, '测试作者');
  assert.equal(vm.profileVersionText, '0816');
  assert.equal(vm.authorNoteText, '给读者的角色介绍。');
  assert.equal(vm.metadataSexText, '女');
  assert.equal(vm.metadataRaceText, '龙裔');
  assert.deepEqual(vm.storySections, [{ title: '第一章', content: '作者展示故事。' }]);
});

test('Special NPC 保留原始 backstory，同时按作者顺序读取自定义故事，视觉 clone 不丢 metadata', () => {
  const resolved = resolveCharacterVisualConfig(
    { 姓名: '千爻', 背景故事: 'LLM 使用的精简背景。' },
    {
      char_info: {
        profiles: {
          千爻: {
            schema_version: 2,
            gallery: [{ sources: ['https://example.com/qianyao.png'] }],
            metadata: {
              author: '故事作者',
              story_sections: [
                { title: '序章', content: '第一段。' },
                { title: '雪夜', content: '第二段。' },
              ],
            },
          },
        },
      },
    },
  );
  const overridden = cloneCharacterDataWithVisualOverrides(resolved, { 登场台词: '覆盖台词' });
  const vm = buildCharacterViewModel(overridden);

  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.backstoryText, 'LLM 使用的精简背景。');
  assert.equal(vm.storyAuthorText, '故事作者');
  assert.deepEqual(vm.storySections, [
    { title: '序章', content: '第一段。' },
    { title: '雪夜', content: '第二段。' },
  ]);
  assert.deepEqual(resolveCharacterVisualMetadata(overridden)?.story_sections, vm.storySections);
});

test('带 metadata 的 Special NPC 进入 Vue reactive 后仍可读取姓名、视觉身份和未知字段安全忽略', () => {
  const resolved = resolveCharacterVisualConfig(
    { 姓名: '千爻', 等级: 13, 生命层级: '第四层级' },
    {
      char_info: {
        profiles: {
          千爻: {
            schema_version: 2,
            gallery: [{ sources: ['https://example.com/qianyao.png'] }],
            future_profile_field: { nested: true },
            metadata: {
              author: '作者',
              unknown_future_field: { nested: true },
              story_sections: [{ title: '序章', content: '故事正文。' }],
            },
          },
        },
      },
    },
  );

  const vm = buildCharacterViewModel(reactive(resolved));

  assert.equal(vm.nameText, '千爻');
  assert.equal(vm.levelText, '13');
  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.storyAuthorText, '作者');
  assert.deepEqual(vm.storySections, [{ title: '序章', content: '故事正文。' }]);
  assert.equal(resolved.future_profile_field, undefined);
  assert.equal(Object.hasOwn(vm.profileMetadata ?? {}, 'unknown_future_field'), false);
});

test('Current NPC 心里话覆盖后仍保留 Special NPC 视觉身份与图库', () => {
  const resolved = resolveCharacterVisualConfig(
    { 姓名: '千爻', 登场台词: '原始台词' },
    {
      char_info: {
        profiles: {
          千爻: {
            gallery: [
              { sources: ['https://example.com/qianyao-main.png', 'https://example.com/qianyao-backup.png'] },
            ],
          },
        },
      },
    },
  );
  const overridden = cloneCharacterDataWithVisualOverrides(resolved, { 登场台词: '当前心里话' });
  const vm = buildCharacterViewModel(overridden);

  assert.equal(vm.layoutKind, 'special_npc');
  assert.deepEqual(vm.imageUrls, ['https://example.com/qianyao-main.png']);
  assert.deepEqual(vm.imageSourceGroups, [
    ['https://example.com/qianyao-main.png', 'https://example.com/qianyao-backup.png'],
  ]);
  assert.equal(overridden.登场台词, '当前心里话');
});

test('gallery keeps animated GIF and MP4 URLs away from the static Catbox image proxy', () => {
  const gifUrl = 'https://files.catbox.moe/animated.gif';
  const mp4Url = 'https://files.catbox.moe/animated.mp4';
  const data = resolveCharacterVisualConfig(
    { 姓名: '动态媒体角色' },
    {
      char_info: {
        profiles: {
          动态媒体角色: {
            gallery: [
              { sources: ['https://files.catbox.moe/main.png'] },
              { sources: [gifUrl] },
              { sources: [mp4Url] },
            ],
          },
        },
      },
    },
  );
  const vm = buildCharacterViewModel(data);

  assert.equal(vm.imageUrls[1], gifUrl);
  assert.equal(vm.imageUrls[2], mp4Url);
});
