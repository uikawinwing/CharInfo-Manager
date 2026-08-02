import assert from 'node:assert/strict';
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
    parseWorldbookCharacterEntryTitle('[DLC][角色][莉利亚・利桑德]莉利亚・利桑德(辻-利桑德家族继承人,活跃于索伦蒂斯)'),
    {
      rawEntryName: '[DLC][角色][莉利亚・利桑德]莉利亚・利桑德(辻-利桑德家族继承人,活跃于索伦蒂斯)',
      displayName: '莉利亚・利桑德',
      metadataText: '辻-利桑德家族继承人,活跃于索伦蒂斯',
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

test('尚未进入变量的角色只从顶层静态字段提取种族', () => {
  assert.equal(inferCharacterRace('姓名: Iris\n种族: 星辉水母\n等级: 14'), '星辉水母');
  assert.equal(inferCharacterRace('种族: "人类, 半神"\n身份: 学者'), '人类');
  assert.equal(inferCharacterRace('正文没有结构化种族'), '');
  assert.equal(inferCharacterRace('设定:\n  种族: 人类'), '');
  assert.equal(inferCharacterRace('<%_\n种族: EJS 种族\n_%>'), '');
  assert.equal(inferCharacterRace('种族: <%= npc.race %>'), '');
  assert.equal(inferCharacterRace('种族: ${npc.race}'), '');
  assert.equal(inferCharacterRace('种族: [人类]'), '');
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
