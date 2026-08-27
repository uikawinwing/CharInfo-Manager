const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { parseCharacterYaml } = require('../../src/char_info_viewer/services/yamlParser.ts');
const {
  importToMvuVariables,
  mergeCharacterIntoMvuData,
  saveToChatWorldbook,
} = require('../../src/char_info_viewer/services/importService.ts');

test('保存到聊天变量时把 YAML flow mapping 标签还原为可读文本', () => {
  const parsed = parseCharacterYaml([
    '姓名: 测试角色',
    '装备:',
    '  - 名称: 测试长剑',
    '    标签: [攻击: 380, 稀有]',
  ].join('\n'));

  assert.equal(parsed.success, true);
  const variables = {};
  mergeCharacterIntoMvuData(parsed.data, variables);

  assert.deepEqual(
    variables.stat_data.关系列表.测试角色.装备.测试长剑.标签,
    ['攻击: 380', '稀有'],
  );
});

test('MVU 写入 Promise 卡住但数据已可读回时仍结束保存状态', async () => {
  const previousMvu = global.Mvu;
  const previousWaitGlobalInitialized = global.waitGlobalInitialized;
  const previousUnderscore = global._;
  const variables = {};

  global.waitGlobalInitialized = async () => {};
  global._ = {
    has(object, pathText) {
      return pathText.split('.').every((key, index, parts) => {
        object = index === 0 ? object : object?.[parts[index - 1]];
        return object != null && key in object;
      });
    },
  };
  global.Mvu = {
    getMvuData: () => variables,
    replaceMvuData: () => new Promise(() => {}),
  };

  try {
    await Promise.race([
      importToMvuVariables({ 姓名: '测试角色' }, { type: 'message', message_id: 7 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('保存状态没有随读回成功结束')), 500)),
    ]);
  } finally {
    if (previousMvu === undefined) delete global.Mvu;
    else global.Mvu = previousMvu;
    if (previousWaitGlobalInitialized === undefined) delete global.waitGlobalInitialized;
    else global.waitGlobalInitialized = previousWaitGlobalInitialized;
    if (previousUnderscore === undefined) delete global._;
    else global._ = previousUnderscore;
  }

  assert.ok(variables.stat_data.关系列表.测试角色);
});

test('保存到聊天世界书时只写 YAML 正文，不保留 char_info wrapper', async () => {
  const previousWindow = global.window;
  let createdEntries = null;

  global.window = {
    TavernHelper: {
      getChatWorldbookName: async () => '测试聊天世界书',
      getOrCreateChatWorldbook: async () => '测试聊天世界书',
      createWorldbookEntries: async (_bookName, entries) => {
        createdEntries = entries;
        return { ok: true };
      },
    },
  };

  try {
    await saveToChatWorldbook(
      { 姓名: '测试角色' },
      '<char_info>\n姓名: 测试角色\n等级: 3\n</char_info>',
    );
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }

  assert.ok(createdEntries);
  assert.equal(createdEntries.length, 1);
  assert.equal(createdEntries[0].content, '---\n姓名: 测试角色\n等级: 3');
  assert.doesNotMatch(createdEntries[0].content, /<\/?char_info>/i);
});

test('世界书写入 Promise 卡住但条目已可读回时仍结束保存状态', async () => {
  const previousWindow = global.window;
  let entries = [];

  global.window = {
    TavernHelper: {
      getChatWorldbookName: async () => '测试聊天世界书',
      getOrCreateChatWorldbook: async () => '测试聊天世界书',
      createWorldbookEntries: async (_bookName, newEntries) => {
        entries = newEntries;
        return new Promise(() => {});
      },
      getWorldbook: async () => entries,
    },
  };

  try {
    const result = await Promise.race([
      saveToChatWorldbook({ 姓名: '测试角色' }, '姓名: 测试角色'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('世界书保存状态没有随读回成功结束')), 500)),
    ]);
    assert.equal(result.apiResult, 'verified-by-readback');
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});

test('Viewer Save 状态跟随真实保存结果，不再使用宿主页顶部 popup', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const appSource = fs.readFileSync(path.join(repoRoot, 'src/char_info_viewer/App.vue'), 'utf8');
  const illustratedSource = fs.readFileSync(
    path.join(repoRoot, 'src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue'),
    'utf8',
  );
  const illustratedNavSource = fs.readFileSync(
    path.join(repoRoot, 'src/char_info_viewer/components/illustrated/IllustratedTabNav.vue'),
    'utf8',
  );
  const runtimeRootSource = fs.readFileSync(path.join(repoRoot, 'src/char_info_viewer_runtime/RuntimeRoot.vue'), 'utf8');
  const runtimeSource = fs.readFileSync(path.join(repoRoot, 'src/char_info_viewer_runtime/runtime.ts'), 'utf8');

  assert.match(appSource, /导入至\[最新消息楼层\]变量/u);
  assert.match(illustratedSource, /导入至\[最新消息楼层\]变量/u);
  assert.match(appSource, /message_id:\s*Math\.max\(0,\s*getLastMessageId\(\)\)/u);
  assert.doesNotMatch(appSource, /message_id:\s*props\.messageId/u);
  assert.doesNotMatch(appSource, /导入到角色状态/u);
  assert.doesNotMatch(illustratedSource, /导入到角色状态/u);
  assert.match(appSource, /target:\s*'chat-variable'[\s\S]*phase:\s*'pending'/u);
  assert.match(appSource, /target:\s*'chat-variable'[\s\S]*phase:\s*'success'/u);
  assert.match(appSource, /target:\s*'worldbook'[\s\S]*phase:\s*'pending'/u);
  assert.match(appSource, /target:\s*'worldbook'[\s\S]*phase:\s*'success'/u);
  assert.match(runtimeRootSource, /:save-state="state\.saveStateByCard\[card\.key\]"/u);
  assert.match(runtimeRootSource, /saveFeedbackHandler\(card\.key, feedback\)/u);
  assert.doesNotMatch(runtimeRootSource, /char-info-save-notice|state\.saveNotice/u);
  assert.match(runtimeSource, /label:\s*phase === 'pending' \? '保存中…' : phase === 'success' \? '✓ 已保存'/u);
  assert.doesNotMatch(runtimeSource, /completePendingChatVariableSave|pendingChatVariableCards/u);
  assert.match(runtimeSource, /saveFeedbackHandler:\s*handleViewerSaveFeedback/u);
  assert.match(illustratedNavSource, /importButtonText === '📥' \? '保存' : importButtonText/u);
});
