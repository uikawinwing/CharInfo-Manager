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

test('快速模式从当前聊天 CharInfo 读取现有图片配置，不复制角色状态资料', () => {
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
        '奥琳科・乌尔芬': { 好感度: 88, 在场: true, 心里话: '不会进入视觉 profile' },
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
  assert.equal('affinity' in profile, false);
  assert.equal('好感度' in profile, false);
});

test('快速模式世界书条目只保存 managed EJS，并以角色姓名作为关键词', () => {
  const entry = buildFlashWorldbookEntry({
    characterName: '奥琳科・乌尔芬',
    avatarUrl: 'https://img.example/main.webp',
    coverUrl: 'https://img.example/main.webp',
    raceColor: '',
    tierColor: '',
    entranceQuote: '',
    gallery: [{ title: '主立绘', sources: ['https://img.example/main.webp'] }],
  });

  assert.equal(flashEntryName('奥琳科・乌尔芬'), '[CharInfo][视觉] 奥琳科・乌尔芬');
  assert.equal(entry.name, '[CharInfo][视觉] 奥琳科・乌尔芬');
  assert.deepEqual(entry.strategy, { type: 'selective', keys: ['奥琳科・乌尔芬'] });
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
