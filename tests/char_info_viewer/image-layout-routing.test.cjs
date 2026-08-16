const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { reactive } = require('vue');

const { buildCreatorViewerPreviewData, buildCreatorViewerVisualOverride } = require('../../src/char_info_creator_manager/viewerPreview.ts');
const { createEmptyProfile } = require('../../src/char_info_shared/characterVisualProfile.ts');
const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const { mergeCharacterIntoMvuData } = require('../../src/char_info_viewer/services/importService.ts');
const {
  cloneLoadedDxCharacterDataWithOverrides,
  dxCharacterRoster,
  findDxCharacterByName,
  isLoadedDxCharacterData,
  loadDxCharacterReference,
  parseDxCharacterReference,
  resolveDxCharacterProfile,
} = require('../../src/char_info_viewer/dx/index.ts');
const {
  cloneCharacterDataWithVisualOverrides,
  resolveCharacterVisualConfig,
  resolveCharacterVisualMetadata,
  resolveCharacterVisualPreview,
} = require('../../src/char_info_viewer/services/themeService.ts');
const { parseCharacterYaml } = require('../../src/char_info_viewer/services/yamlParser.ts');
const appSource = readFileSync(path.join(__dirname, '../../src/char_info_viewer/App.vue'), 'utf8');
const dxRegistrySource = readFileSync(path.join(__dirname, '../../src/char_info_viewer/dx/dx_character_profiles.worldentry.txt'), 'utf8');
const venusWorldentrySource = readFileSync(path.join(__dirname, '../../venus_worldentry.txt'), 'utf8');

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

test('维纳丝世界书只读取 DX 登场变量并输出 DX 占位符', () => {
  assert.match(venusWorldentrySource, /^@@private\r?\n/u);
  assert.match(venusWorldentrySource, /getMessageVar\('\$dx_venus_appear', \{ defaults: 0 \}\)/u);
  assert.match(
    venusWorldentrySource,
    /<char_info>\s*__dx_character_ref: dx_venus\s*<\/char_info>/u,
  );
  assert.doesNotMatch(venusWorldentrySource, /setMessageVar/u);
  assert.doesNotMatch(venusWorldentrySource, /__char_info_ref/u);
});

test('a character without an image uses the normal layout', () => {
  const vm = buildCharacterViewModel({ 姓名: '普通角色' });

  assert.equal(vm.layoutKind, 'default');
  assert.equal(vm.presentationProfile, null);
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

test('非 DX 角色的正文显式图片不再授予 Special NPC 布局', () => {
  const vm = buildCharacterViewModel({
    姓名: '傲雪',
    角色图片: 'https://example.com/aoxue.png',
  });

  assert.equal(vm.layoutKind, 'default');
  assert.equal(vm.imageUrl, '');
  assert.equal(vm.presentationProfile, null);
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

test('普通角色即使姓名与 DX roster 精确相同也不会获得 DX edition', () => {
  const vm = buildCharacterViewModel({ 姓名: '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯' });

  assert.equal(vm.layoutKind, 'default');
  assert.equal(vm.presentationProfile, null);
});

test('普通完整 YAML 中夹带姓名和 roster 都匹配的 DX ref，仍解析为普通有图角色', () => {
  const parsed = parseCharacterYaml([
    '姓名: 维纳丝·珀菈·索伦蒂斯',
    '__dx_character_ref: dx_venus',
  ].join('\n'));
  assert.equal(parsed.success, true);

  const resolved = resolveCharacterVisualConfig(parsed.data, {
    char_info: {
      profiles: {
        '维纳丝·珀菈·索伦蒂斯': {
          custom_racecolor: '#123456',
          登场台词: '普通资料台词',
          gallery: [{ sources: ['https://example.com/ordinary-venus.png'] }],
        },
      },
    },
  });
  const vm = buildCharacterViewModel(resolved);

  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.presentationProfile, null);
  assert.equal(vm.imageUrl, 'https://example.com/ordinary-venus.png');
  assert.equal(vm.storyBookLink, null);
  assert.equal(resolved.custom_racecolor, '#123456');
  assert.equal(resolved.登场台词, '普通资料台词');
});

test('只有可信 DX 维纳丝资料会显示 DX 专属角色故事入口', async t => {
  mockWorldbook(
    t,
    'DX 维纳丝读本测试世界书',
    `<dx_character_registry>
<dx_character id="dx_venus" appear_variable="$dx_venus_appear">
<inject_var>
姓名: 维纳丝·珀菈·索伦蒂斯
</inject_var>
</dx_character>
</dx_character_registry>`,
  );

  const loaded = await loadDxCharacterReference('dx_venus');
  const resolved = resolveCharacterVisualConfig(loaded.data, {
    char_info: {
      profiles: {
        '维纳丝·珀菈·索伦蒂斯': {
          schema_version: 2,
          gallery: [{ sources: ['https://example.com/should-not-replace-dx.png'] }],
          metadata: {
            author: '不应覆盖 DX 的作者',
            story_sections: [{ title: '错误故事', content: '这段 generic metadata 不应进入可信 DX。' }],
          },
        },
      },
    },
  });
  const vm = buildCharacterViewModel(resolved);

  assert.equal(vm.layoutKind, 'illustrated');
  assert.deepEqual(vm.storyBookLink, {
    bookId: '阿芙罗黛蒂之冠',
    title: '阿芙罗黛蒂之冠',
    festivalName: '倾国倾城祭',
  });
  assert.deepEqual(vm.storySections, []);
  assert.equal(resolveCharacterVisualMetadata(resolved), null);
});

test('App 只把保留占位符 loader 产物作为可信 DX 路由', () => {
  assert.match(appSource, /await applyParsedCharacterData\(dxCharacterData\.data, 'builtin'\);/);
  assert.match(appSource, /previewBaseData = stripUntrustedDxReference\(parsed\.data\);/);
  assert.match(
    appSource,
    /await applyParsedCharacterData\(previewBaseData, parsed\.mode \?\? 'strict', parsed\.warnings \?\? \[\]\);/,
  );
  assert.match(appSource, /if \(!props\.previewMode && dxCharacterReference\.kind === 'reference'\)/);
  assert.match(
    appSource,
    /cloneLoadedDxCharacterDataWithOverrides\(resolvedData, \{[\s\S]*?登场台词: props\.entranceQuoteOverride/u,
  );
  assert.match(appSource, /buildCharacterViewModel\(sheetData\.value, props\.imageSourcePriority\)/);
  assert.match(appSource, /isLoadedDxCharacterData\(resolvedData\)[\s\S]*?cloneLoadedDxCharacterDataWithOverrides\(resolvedData/);
  assert.match(appSource, /cloneCharacterDataWithVisualOverrides\(resolvedData, \{[\s\S]*?登场台词: props\.entranceQuoteOverride/);
});

test('未知 DX ref 不会阻止普通同名 profile 的图片、颜色和台词', () => {
  const resolved = resolveCharacterVisualConfig(
    { 姓名: '普通角色', __dx_character_ref: 'dx_unknown' },
    {
      char_info: {
        profiles: {
          普通角色: {
            custom_tiercolor: '#654321',
            登场台词: '普通资料台词',
            gallery: [{ sources: ['https://example.com/ordinary.png'] }],
          },
        },
      },
    },
  );
  const vm = buildCharacterViewModel(resolved);

  assert.equal(vm.layoutKind, 'special_npc');
  assert.equal(vm.presentationProfile, null);
  assert.equal(vm.imageUrl, 'https://example.com/ordinary.png');
  assert.equal(resolved.custom_tiercolor, '#654321');
  assert.equal(resolved.登场台词, '普通资料台词');
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
  assert.deepEqual(vm.imageUrls, [
    'https://example.com/qianyao-main.png',
  ]);
  assert.deepEqual(vm.imageSourceGroups, [
    ['https://example.com/qianyao-main.png', 'https://example.com/qianyao-backup.png'],
  ]);
  assert.equal(overridden.登场台词, '当前心里话');
});

test('DX loader 身份不随对象展开泄露，受控台词 clone 才保留 DX presentation', async t => {
  mockWorldbook(
    t,
    'DX 品牌测试世界书',
    `<dx_character_registry>
<dx_character id="dx_anastasia" appear_variable="$dx_anastasia_appear">
<inject_var>
姓名: 安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯
</inject_var>
</dx_character>
</dx_character_registry>`,
  );
  const loaded = await loadDxCharacterReference('dx_anastasia');
  const mutated = await loadDxCharacterReference('dx_anastasia');
  mutated.data.姓名 = '维纳丝·珀菈·索伦蒂斯';
  mutated.data.__dx_character_ref = 'dx_venus';
  const expanded = { ...loaded.data };
  const expandedAsVenus = {
    ...expanded,
    姓名: '维纳丝·珀菈·索伦蒂斯',
    __dx_character_ref: 'dx_venus',
  };
  const quotedClone = cloneLoadedDxCharacterDataWithOverrides(loaded.data, {
    登场台词: '受控台词',
    姓名: '维纳丝·珀菈·索伦蒂斯',
    __dx_character_ref: 'dx_venus',
  });
  const profile = {
    char_info: {
      profiles: {
        '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯': {
          gallery: [{ sources: ['https://example.com/ordinary-anastasia.png'] }],
        },
        '维纳丝·珀菈·索伦蒂斯': {
          gallery: [{ sources: ['https://example.com/ordinary-venus.png'] }],
        },
        '瑟涟·赛瑞利亚': {
          gallery: [{ sources: ['https://example.com/ordinary-seren.png'] }],
        },
      },
    },
  };
  const resolvedLoaded = resolveCharacterVisualConfig(loaded.data, profile);
  const resolvedMutated = resolveCharacterVisualConfig(mutated.data, profile);
  const resolvedExpanded = resolveCharacterVisualConfig(expanded, profile);
  const resolvedExpandedAsVenus = resolveCharacterVisualConfig(expandedAsVenus, profile);
  const resolvedQuotedClone = resolveCharacterVisualConfig(quotedClone, profile);
  const forgedVenus = resolveCharacterVisualConfig(
    { 姓名: '维纳丝·珀菈·索伦蒂斯', __dx_character_ref: 'dx_venus' },
    profile,
  );
  const forgedSeren = resolveCharacterVisualConfig(
    { 姓名: '瑟涟·赛瑞利亚', __dx_character_ref: 'dx_seren' },
    profile,
  );

  assert.equal(isLoadedDxCharacterData(loaded.data), true);
  assert.equal(isLoadedDxCharacterData(mutated.data), false);
  assert.equal(isLoadedDxCharacterData(expanded), false);
  assert.equal(isLoadedDxCharacterData(expandedAsVenus), false);
  assert.equal(isLoadedDxCharacterData(quotedClone), true);
  assert.equal(quotedClone.姓名, '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯');
  assert.equal(quotedClone.__dx_character_ref, 'dx_anastasia');
  assert.equal(quotedClone.登场台词, '受控台词');
  assert.equal(buildCharacterViewModel(resolvedLoaded).layoutKind, 'illustrated');
  assert.equal(resolvedLoaded.角色图片, undefined);
  assert.equal(buildCharacterViewModel(resolvedMutated).layoutKind, 'special_npc');
  assert.equal(resolvedMutated.角色图片, 'https://example.com/ordinary-venus.png');
  assert.equal(buildCharacterViewModel(resolvedExpanded).layoutKind, 'special_npc');
  assert.equal(resolvedExpanded.角色图片, 'https://example.com/ordinary-anastasia.png');
  assert.equal(buildCharacterViewModel(resolvedExpandedAsVenus).layoutKind, 'special_npc');
  assert.equal(resolvedExpandedAsVenus.角色图片, 'https://example.com/ordinary-venus.png');
  assert.equal(buildCharacterViewModel(resolvedQuotedClone).layoutKind, 'illustrated');
  assert.equal(resolvedQuotedClone.角色图片, undefined);
  assert.equal(buildCharacterViewModel(forgedVenus).layoutKind, 'special_npc');
  assert.equal(forgedVenus.角色图片, 'https://example.com/ordinary-venus.png');
  assert.equal(buildCharacterViewModel(forgedSeren).layoutKind, 'special_npc');
  assert.equal(forgedSeren.角色图片, 'https://example.com/ordinary-seren.png');
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
