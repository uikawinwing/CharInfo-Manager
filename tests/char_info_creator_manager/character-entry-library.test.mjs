import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  collectEncounteredCharacters,
  collectWorldbookCharacterEntries,
  inferCharacterRace,
  parseWorldbookCharacterEntryTitle,
  parseWorldbookCharacterDisplayName,
  readStaticCharacterFields,
  readCharacterEntryBody,
  replaceCharacterEntryBody,
  setCharacterEntryEnabled,
} from '../../src/char_info_creator_manager/characterEntryLibrary.ts';
import {
  buildManagedEjsBlock,
  createEmptyProfile,
  inspectManagedBlock,
} from '../../src/char_info_creator_manager/ejsProfile.ts';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

const irisProfile = {
  ...createEmptyProfile('Iris'),
  gallery: [
    {
      title: '主立绘',
      sources: ['https://files.catbox.moe/iris.webp', 'https://i.ibb.co/iris-mirror.webp'],
    },
  ],
};

const entries = [
  {
    uid: 7,
    name: '[DLC][角色]Iris',
    enabled: false,
    content: `${buildManagedEjsBlock(irisProfile)}\n角色设定正文`,
  },
  {
    uid: 8,
    name: '普通世界设定',
    enabled: true,
    content: '这里没有 CharInfo 视觉配置。',
  },
  {
    uid: 9,
    name: '[DLC][角色]NoVisual',
    enabled: true,
    content: '姓名: NoVisual\n种族: 人类\n这里没有 EJS、图库或头像。',
  },
  {
    uid: 10,
    name: '普通条目但错误地含有视觉区块',
    enabled: true,
    content: buildManagedEjsBlock({ ...irisProfile, characterName: 'NotACharacterEntry' }),
  },
];

test('世界书角色库只收录确定的单角色条目，视觉配置缺失时仍建立无图资料', () => {
  const characters = collectWorldbookCharacterEntries(
    entries,
    content => {
      const inspection = inspectManagedBlock(content);
      return inspection.state === 'valid' ? inspection.profile : null;
    },
    entry => createEmptyProfile(parseWorldbookCharacterDisplayName(entry.name)),
  );

  assert.equal(characters.length, 2);
  assert.equal(characters[0].entry.uid, 7);
  assert.equal(characters[0].hasVisualProfile, true);
  assert.equal(characters[0].profile.characterName, 'Iris');
  assert.deepEqual(characters[0].profile.gallery[0].sources, [
    'https://files.catbox.moe/iris.webp',
    'https://i.ibb.co/iris-mirror.webp',
  ]);
  assert.equal(characters[1].entry.uid, 9);
  assert.equal(characters[1].hasVisualProfile, false);
  assert.equal(characters[1].profile.characterName, 'NoVisual');
  assert.equal(characters[1].profile.avatarUrl, '');
  assert.equal(characters[1].profile.gallery.flatMap(image => image.sources).some(Boolean), false);
});

test('标题解析保留原始名称、方括号标签，并从莉利亚条目拆出元数据', () => {
  assert.deepEqual(
    parseWorldbookCharacterEntryTitle(
      '[DLC][角色][莉利亚・利桑德]莉利亚・利桑德(辻-利桑德家族继承人,活跃于索伦蒂斯)',
      { content: '种族: 利桑德家族继承人' },
    ),
    {
      rawEntryName: '[DLC][角色][莉利亚・利桑德]莉利亚・利桑德(辻-利桑德家族继承人,活跃于索伦蒂斯)',
      displayName: '莉利亚・利桑德',
      metadataText: '辻-利桑德家族继承人,活跃于索伦蒂斯',
      authorText: '辻',
      raceText: '利桑德家族继承人',
      descriptionText: '活跃于索伦蒂斯',
      bracketSegments: ['DLC', '角色', '莉利亚・利桑德'],
      entryKind: 'character',
      nameSource: 'title-heuristic',
    },
  );
});

test('标题解析会跳过傲雪条目中的额外方括号标签', () => {
  const title = parseWorldbookCharacterEntryTitle(
    '[DLC][角色][傲雪][<东方龙裔]傲雪(Hilo-龙裔,寒潭剑姬,活跃于诺斯加德)',
  );

  assert.equal(title.displayName, '傲雪');
  assert.deepEqual(title.bracketSegments, ['DLC', '角色', '傲雪', '<东方龙裔']);
  assert.equal(title.entryKind, 'character');
});

test('澪条目可从前置或尾置角色标签、嵌套括号元数据与正文 YAML 补全种族', () => {
  const metadata = 'glen0822（扭曲亚提）-神造人，走出神殿的人偶/候补圣女/旅行者';
  const body = `澪:\n  基本信息:\n    种族: 神造人`;
  const leading = parseWorldbookCharacterEntryTitle(`[DLC][角色][澪]澪(${metadata})`, { content: body });
  const trailing = parseWorldbookCharacterEntryTitle(`澪(${metadata})[DLC][角色][澪]`, { content: body });

  for (const title of [leading, trailing]) {
    assert.deepEqual(
      {
        displayName: title.displayName,
        metadataText: title.metadataText,
        authorText: title.authorText,
        raceText: title.raceText,
        descriptionText: title.descriptionText,
        entryKind: title.entryKind,
      },
      {
        displayName: '澪',
        metadataText: metadata,
        authorText: 'glen0822（扭曲亚提）',
        raceText: '神造人',
        descriptionText: '走出神殿的人偶/候补圣女/旅行者',
        entryKind: 'character',
      },
    );
  }

  assert.equal(inferCharacterRace(body, leading.displayName), '神造人');
});

test('真实世界书标题不会把分类标签、编者注、旧名或数字误判为姓名和种族', () => {
  const alicia = parseWorldbookCharacterEntryTitle(
    '[DLC][角色][雌小鬼与熟女与龙]艾莉希雅(Spaceperson-新增角色：艾莉希雅和奥希莉雅·骸响龙姬)',
  );
  const hassan = parseWorldbookCharacterEntryTitle(
    '[DLC][角色][哈桑]哈桑(萨赫拉联邦静寂之王-编者注:唉，又一个写自传的...)',
  );
  const siren = parseWorldbookCharacterEntryTitle(
    '[DLC][角色][瑟涟]瑟涟·赛瑞利亚(△一串-旧名塞壬,赛瑞利亚领主,大家的妈妈)',
  );
  const lillias = parseWorldbookCharacterEntryTitle('[DLC][角色][莉莉娅丝]莉莉娅丝(Hilo-1011)');

  assert.equal(alicia.displayName, '艾莉希雅');
  assert.equal(alicia.raceText, null);
  assert.equal(hassan.displayName, '哈桑');
  assert.equal(hassan.raceText, null);
  assert.equal(siren.displayName, '瑟涟·赛瑞利亚');
  assert.equal(siren.raceText, null);
  assert.equal(lillias.displayName, '莉莉娅丝');
  assert.equal(lillias.raceText, null);
});

test('正文只有一个角色根节点时仍可从受控路径读取种族', () => {
  const body = '艾莉希雅·温德米尔:\n  基本信息:\n    种族: 古龙';

  assert.equal(inferCharacterRace(body, '艾莉希雅'), '古龙');
  assert.equal(inferCharacterRace('莉莉娅:\n  种族: 人类', '莉'), '');
});

test('标题种族只接受正文印证或显式种族标记', () => {
  const unverified = parseWorldbookCharacterEntryTitle('[DLC][角色]赫洛(A-史莱姆)');
  const verified = parseWorldbookCharacterEntryTitle('[DLC][角色]赫洛(A-史莱姆)', {
    content: '种族: 史莱姆',
  });
  const explicit = parseWorldbookCharacterEntryTitle('[DLC][角色]赫洛(A-种族:史莱姆)');

  assert.equal(unverified.raceText, null);
  assert.equal(verified.raceText, '史莱姆');
  assert.equal(explicit.raceText, '史莱姆');
});

test('条目元数据外层括号允许同种或另一种括号嵌套', () => {
  const halfwidth = parseWorldbookCharacterEntryTitle('[DLC][角色]赫洛(A(笔名)-人类，旅行者)', {
    content: '种族: 人类',
  });
  const fullwidth = parseWorldbookCharacterEntryTitle('[DLC][角色]晴（B（笔名）－精灵，学者）', {
    content: '种族: 精灵',
  });

  assert.deepEqual(
    { displayName: halfwidth.displayName, authorText: halfwidth.authorText, raceText: halfwidth.raceText },
    { displayName: '赫洛', authorText: 'A(笔名)', raceText: '人类' },
  );
  assert.deepEqual(
    { displayName: fullwidth.displayName, authorText: fullwidth.authorText, raceText: fullwidth.raceText },
    { displayName: '晴', authorText: 'B（笔名）', raceText: '精灵' },
  );
});

test('合集、部分补充与无法确认的标题不会伪装为单角色', () => {
  const supplement = parseWorldbookCharacterEntryTitle('[DLC][角色][雌小鬼与熟女与龙]骸响之都部分补充');
  const unknown = parseWorldbookCharacterEntryTitle('[DLC][角色]');
  const characters = collectWorldbookCharacterEntries(
    [
      { uid: 1, name: supplement.rawEntryName, enabled: true, content: '' },
      { uid: 2, name: unknown.rawEntryName, enabled: true, content: '' },
    ],
    () => null,
    () => createEmptyProfile(),
  );

  assert.deepEqual(
    { displayName: supplement.displayName, entryKind: supplement.entryKind, nameSource: supplement.nameSource },
    { displayName: null, entryKind: 'supplement', nameSource: 'unknown' },
  );
  assert.equal(unknown.entryKind, 'unknown');
  assert.equal(characters.length, 0);
});

test('标题解析优先受管理 profile，其次读取正文顶层静态姓名，且不执行 EJS', () => {
  const profileTitle = parseWorldbookCharacterEntryTitle('[DLC][角色]错误标题', {
    content: '姓名: 正文姓名',
    managedProfileName: '受管理资料姓名',
  });
  const bodyTitle = parseWorldbookCharacterEntryTitle('[DLC][角色]', {
    content: '<%_\n姓名: EJS 中的名字\n_%>\n姓名: 正文姓名',
  });
  const ejsOnlyTitle = parseWorldbookCharacterEntryTitle('[DLC][角色]', {
    content: '<%_\n姓名: EJS 中的名字\n_%>',
  });

  assert.deepEqual(
    { displayName: profileTitle.displayName, nameSource: profileTitle.nameSource },
    { displayName: '受管理资料姓名', nameSource: 'managed-profile' },
  );
  assert.deepEqual(
    { displayName: bodyTitle.displayName, nameSource: bodyTitle.nameSource },
    { displayName: '正文姓名', nameSource: 'body-field' },
  );
  assert.equal(ejsOnlyTitle.entryKind, 'unknown');
});

test('标题解析保留异常括号，并将空元数据归一为 null', () => {
  const malformed = parseWorldbookCharacterEntryTitle('[DLC][角色][莉利亚]莉利亚(未闭合');
  const emptyMetadata = parseWorldbookCharacterEntryTitle('[DLC][角色][莉利亚]莉利亚（）');

  assert.equal(malformed.displayName, '莉利亚');
  assert.equal(malformed.metadataText, null);
  assert.equal(emptyMetadata.displayName, '莉利亚');
  assert.equal(emptyMetadata.metadataText, null);
});

test('兼容旧显示名解析调用', () => {
  assert.equal(parseWorldbookCharacterDisplayName('[DLC][角色]NoVisual'), 'NoVisual');
  assert.equal(
    parseWorldbookCharacterDisplayName('[DLC][角色][莉利亚・利桑德]莉利亚・利桑德(辻-利桑德家族继承人,活跃于索伦蒂斯)'),
    '莉利亚・利桑德',
  );
});

test('角色开关只修改目标 UID 的 enabled 字段', () => {
  const updated = setCharacterEntryEnabled(entries, 7, true);

  assert.equal(updated[0].enabled, true);
  assert.equal(updated[0].content, entries[0].content);
  assert.strictEqual(updated[1], entries[1]);
  assert.equal(entries[0].enabled, false);
});

test('目标 UID 不存在时拒绝写入', () => {
  assert.throws(() => setCharacterEntryEnabled(entries, 999, true), /找不到世界书条目 #999/);
});

test('角色详情移除受管理视觉区块，但保留条目其余正文与 EJS', () => {
  const content = `@@activate\n${buildManagedEjsBlock(irisProfile)}\n<%_ const outside = true; _%>\n角色设定正文`;
  const inspection = inspectManagedBlock(content);
  assert.equal(inspection.state, 'valid');

  const body = readCharacterEntryBody(content, {
    start: inspection.start,
    end: inspection.end,
  });

  assert.equal(body, '@@activate\n\n<%_ const outside = true; _%>\n角色设定正文');
  assert.doesNotMatch(body, /char-info-creator:managed/);
});

test('简单设定编辑只替换正文，并把原受管理区块保留在装饰器之后', () => {
  const managedBlock = buildManagedEjsBlock(irisProfile);
  const content = `@@activate\n@@dont_preload\n${managedBlock}\n旧设定正文\n<% print('保留的其他 EJS') %>\n`;
  const inspection = inspectManagedBlock(content);
  assert.equal(inspection.state, 'valid');

  const updated = replaceCharacterEntryBody(
    content,
    { start: inspection.start, end: inspection.end },
    `@@activate\n@@dont_preload\n新设定正文\n<% print('更新后的其他 EJS') %>`,
  );

  assert.match(updated, /^@@activate\n@@dont_preload\n<%# char-info-ejs-builder:start:v2 %>/);
  assert.equal(updated.split('<%# char-info-ejs-builder:start:v2 %>').length - 1, 1);
  assert.equal(updated.split('<%# char-info-ejs-builder:end:v2 %>').length - 1, 1);
  assert.ok(updated.includes(managedBlock));
  assert.doesNotMatch(updated, /旧设定正文|保留的其他 EJS/);
  assert.match(updated, /新设定正文/);
  assert.match(updated, /更新后的其他 EJS/);
});

test('没有视觉区块的角色也能直接更新其世界书正文', () => {
  const updated = replaceCharacterEntryBody(
    '姓名: NoVisual\r\n种族: 人类\r\n旧设定\r\n',
    null,
    '姓名: NoVisual\n种族: 人类\n新设定',
  );

  assert.equal(updated, '姓名: NoVisual\r\n种族: 人类\r\n新设定\r\n');
});

test('从最新消息 MVU 快照读取当前聊天已遇到角色，不接受错误作用域形状', () => {
  const characters = collectEncounteredCharacters({
    stat_data: {
      关系列表: {
        Iris: { 种族: '星辉水母', 等级: 14 },
        ' 维纳斯 ': { 种族: '神性生命' },
        空值: null,
      },
    },
  });

  assert.deepEqual(
    characters.map(character => ({ name: character.name, race: character.race })),
    [
      { name: 'Iris', race: '星辉水母' },
      { name: '维纳斯', race: '神性生命' },
    ],
  );
  assert.deepEqual(collectEncounteredCharacters({ 关系列表: { Iris: {} } }), []);
});

test('尚未进入变量的角色只从受控 YAML 路径提取静态种族', () => {
  assert.equal(inferCharacterRace('姓名: Iris\n种族: 星辉水母\n等级: 14'), '星辉水母');
  assert.equal(inferCharacterRace('种族: "人类, 半神"\n身份: 学者'), '人类');
  assert.equal(inferCharacterRace('基本信息:\n  种族: 精灵'), '精灵');
  assert.equal(inferCharacterRace('澪:\n  种族: 神造人', '澪'), '神造人');
  assert.equal(inferCharacterRace('澪:\n  基本信息:\n    种族: 神造人', '澪'), '神造人');
  assert.equal(inferCharacterRace('设定:\n  种族: 人类'), '');
  assert.equal(inferCharacterRace('正文没有结构化种族'), '');
  assert.equal(inferCharacterRace('设定:\n  身份:\n    种族: 人类'), '');
  assert.equal(inferCharacterRace('<%_ const flag = true; _%>\n种族: 人类'), '人类');
  assert.equal(inferCharacterRace('种族: 人类\n<%_ const flag = true; _%>\n正文: :'), '人类');
  assert.equal(inferCharacterRace('种族: 人类\n无效 YAML: ['), '人类');
  assert.equal(inferCharacterRace('<%_\n种族: EJS 种族\n_%>'), '');
  assert.equal(inferCharacterRace('种族: <%= npc.race %>'), '');
  assert.equal(inferCharacterRace('种族: ${npc.race}'), '');
  assert.equal(inferCharacterRace('种族: [人类]'), '');
  assert.equal(inferCharacterRace('种族: { 名称: 人类 }'), '');
});

test('角色库种族依次使用聊天变量、世界书正文和标题元数据', () => {
  assert.match(
    appSource,
    /race: encountered\?\.race \|\| inferCharacterRace\(entryBody, character\.title\.displayName\) \|\| character\.title\.raceText \|\| ''/u,
  );
});

test('世界书分类白名单只保留顶层静态字面量', () => {
  assert.deepEqual(
    readStaticCharacterFields('姓名: Iris\n种族: 人类\n性别: 女\n身份: 学者\n活跃区域: 索伦蒂斯'),
    { 姓名: 'Iris', 种族: '人类', 性别: '女', 身份: '学者', 活跃区域: '索伦蒂斯' },
  );
  assert.deepEqual(
    readStaticCharacterFields('姓名: <%= npc.name %>\n种族: {{ race }}\n身份: { 名称: 学者 }\n活跃区域: |\n  索伦蒂斯'),
    {},
  );
});
