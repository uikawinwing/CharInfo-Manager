import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  buildFlashWorldbookEntry,
  flashEntryName,
  readFlashProfileFromChatVariables,
  saveFlashProfileToCurrentChatWorldbook,
} = require('../../src/char_info_profile_editor/flashProfile.ts');
const { extractManagedEjsBlock } = require('../../src/char_info_shared/characterProfile.ts');

test('快速建立保留现有 CharInfo，并只从当前聊天关系资料补安全 metadata', () => {
  const profile = readFlashProfileFromChatVariables('奥琳科・乌尔芬', {
    char_info: {
      profiles: {
        '奥琳科・乌尔芬': {
          schema_version: 2,
          cover_url: 'https://img.example/cover.webp',
          gallery: [
            {
              title: '雪地立绘',
              sources: ['https://img.example/main.webp'],
              thumbnail: 'https://img.example/thumb.webp',
            },
          ],
        },
      },
    },
    status: {
      externalAvatars: {
        partners: {
          '奥琳科・乌尔芬': { url: 'https://img.example/avatar.webp' },
        },
      },
    },
    stat_data: {
      关系列表: {
        '奥琳科・乌尔芬': {
          性别: '女',
          种族: '狼裔',
          好感度: 88,
          在场: true,
          心里话: '不会进入角色档案',
        },
      },
    },
  });

  assert.ok(profile);
  assert.equal(profile.characterName, '奥琳科・乌尔芬');
  assert.equal(profile.avatarUrl, 'https://img.example/avatar.webp');
  assert.equal(profile.coverUrl, 'https://img.example/cover.webp');
  assert.deepEqual(profile.gallery, [
    {
      title: '雪地立绘',
      sources: ['https://img.example/main.webp'],
      thumbnail: 'https://img.example/thumb.webp',
    },
  ]);
  assert.equal(profile.metadata?.sex, '女');
  assert.equal(profile.metadata?.race, '狼裔');
  assert.equal('affinity' in profile, false);
  assert.equal('好感度' in profile, false);
  assert.equal('心里话' in (profile.metadata ?? {}), false);
});

test('只有 stat_data 关系资料的新角色也能建立可编辑草稿', () => {
  const profile = readFlashProfileFromChatVariables('新人', {
    stat_data: {
      关系列表: {
        新人: { 性别: '男', 种族: '人类', 好感度: 12, 心里话: '不要复制' },
      },
    },
  });

  assert.ok(profile);
  assert.equal(profile.characterName, '新人');
  assert.equal(profile.metadata?.sex, '男');
  assert.equal(profile.metadata?.race, '人类');
  assert.equal(profile.gallery.length, 1);
  assert.equal(profile.gallery[0].sources[0], '');
  assert.equal('好感度' in (profile.metadata ?? {}), false);
  assert.equal('心里话' in (profile.metadata ?? {}), false);
});

test('快速建立自动条目使用 DLC 角色命名与 constant 蓝灯，只保存 managed EJS', () => {
  const entry = buildFlashWorldbookEntry({
    characterName: '奥琳科・乌尔芬',
    avatarUrl: 'https://img.example/main.webp',
    coverUrl: 'https://img.example/main.webp',
    raceColor: '',
    tierColor: '',
    entranceQuote: '',
    gallery: [{ title: '主立绘', sources: ['https://img.example/main.webp'] }],
  });

  assert.equal(flashEntryName('奥琳科・乌尔芬'), '[DLC][角色][奥琳科・乌尔芬]奥琳科・乌尔芬角色档案');
  assert.equal(entry.name, '[DLC][角色][奥琳科・乌尔芬]奥琳科・乌尔芬角色档案');
  assert.deepEqual(entry.strategy, { type: 'constant' });
  assert.equal(entry.position.type, 'after_character_definition');
  assert.doesNotMatch(entry.content, /^姓名\s*:/mu);
  assert.doesNotMatch(entry.content, /好感度|在场|心里话/u);

  const managed = extractManagedEjsBlock(entry.content);
  assert.equal(managed.profile.characterName, '奥琳科・乌尔芬');
  assert.equal(managed.profile.gallery[0].sources[0], 'https://img.example/main.webp');
});

test('快速模式第一次建立条目，之后保存会更新同一条目而不是重复新增', async () => {
  let entries = [];
  let nextUid = 1;

  const previous = {
    getChatWorldbookName: globalThis.getChatWorldbookName,
    getOrCreateChatWorldbook: globalThis.getOrCreateChatWorldbook,
    getWorldbook: globalThis.getWorldbook,
    createWorldbookEntries: globalThis.createWorldbookEntries,
    updateWorldbookWith: globalThis.updateWorldbookWith,
  };

  globalThis.getChatWorldbookName = () => '当前聊天世界书';
  globalThis.getOrCreateChatWorldbook = async () => '当前聊天世界书';
  globalThis.getWorldbook = async () => entries.map(entry => ({ ...entry }));
  globalThis.createWorldbookEntries = async (_bookName, newEntries) => {
    const created = newEntries.map(entry => ({ uid: nextUid++, ...entry }));
    entries = [...entries, ...created];
    return { worldbook: entries, new_entries: created };
  };
  globalThis.updateWorldbookWith = async (_bookName, updater) => {
    entries = await updater(entries.map(entry => ({ ...entry })));
    return entries;
  };

  const makeProfile = url => ({
    characterName: '奥琳科・乌尔芬',
    avatarUrl: url,
    coverUrl: url,
    raceColor: '',
    tierColor: '',
    entranceQuote: '',
    gallery: [{ title: '主立绘', sources: [url] }],
  });

  try {
    const first = await saveFlashProfileToCurrentChatWorldbook(makeProfile('https://img.example/one.webp'));
    assert.equal(first.created, true);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].uid, first.entryUid);

    const second = await saveFlashProfileToCurrentChatWorldbook(makeProfile('https://img.example/two.webp'));
    assert.equal(second.created, false);
    assert.equal(second.entryUid, first.entryUid);
    assert.equal(entries.length, 1);
    const managed = extractManagedEjsBlock(entries[0].content);
    assert.equal(managed.profile.gallery[0].sources[0], 'https://img.example/two.webp');
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    });
  }
});
