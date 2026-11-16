import assert from 'node:assert/strict';
import test from 'node:test';
import { matchCharacterProfile, normalizeCharacterNameForMatch } from '../../src/char_info_shared/characterName.ts';
import { hasStatusPortrait } from '../../src/char_info_shared/characterProfile.ts';
import {
  isSpecialNpcVisualData,
  resolveCharacterVisualConfigWithExtensions,
  resolveCharacterVisualPreloadUrls,
} from '../../src/char_info_viewer/services/themeService.ts';

test('姓名比较统一宽度、分隔符、空白和隐藏字符，保留数字与组合音标', () => {
  for (const name of ['伊莉丝·洛蕾塔', '伊莉丝 ・ 洛蕾塔', '「伊莉丝･洛蕾塔」', '伊莉丝\u200b•洛蕾塔', '伊莉丝❤️・洛蕾塔']) {
    assert.equal(normalizeCharacterNameForMatch(name), '伊莉丝洛蕾塔');
  }
  assert.equal(normalizeCharacterNameForMatch('Ａｌｉｃｅ１２３'), 'Alice123');
  assert.equal(normalizeCharacterNameForMatch('e\u0301'), normalizeCharacterNameForMatch('é'));
  assert.notEqual(normalizeCharacterNameForMatch('é'), normalizeCharacterNameForMatch('e'));
  assert.notEqual(normalizeCharacterNameForMatch('2B'), normalizeCharacterNameForMatch('B'));
  assert.notEqual(normalizeCharacterNameForMatch('伊莉絲'), normalizeCharacterNameForMatch('伊莉丝'));
  assert.notEqual(normalizeCharacterNameForMatch('Alice'), normalizeCharacterNameForMatch('alice'));
});

test('完整姓名优先，唯一归一化命中返回原档案键，多个候选拒绝任选', () => {
  const profiles = { 'A-B': { url: 'https://img.example/one.webp' }, AB: { url: 'https://img.example/two.webp' } };
  assert.deepEqual(matchCharacterProfile(' A-B ', profiles), {
    kind: 'matched',
    mode: 'exact',
    key: 'A-B',
    profile: profiles['A-B'],
  });
  assert.deepEqual(matchCharacterProfile('A B', profiles), { kind: 'ambiguous', keys: ['A-B', 'AB'] });
  assert.deepEqual(matchCharacterProfile('Ａ・Ｂ', { 'A-B': profiles['A-B'] }), {
    kind: 'matched',
    mode: 'normalized',
    key: 'A-B',
    profile: profiles['A-B'],
  });
  assert.deepEqual(matchCharacterProfile('AB', { ABC: {} }), { kind: 'missing' });
});

test('符号姓名只接受精确匹配，空比较结果和继承属性不能误命中', () => {
  assert.equal(matchCharacterProfile('☆', { '☆': {} }).kind, 'matched');
  assert.deepEqual(matchCharacterProfile('★', { '☆': {} }), { kind: 'missing' });
  assert.deepEqual(matchCharacterProfile('☀️', { '⚔️': {} }), { kind: 'missing' });
  assert.deepEqual(matchCharacterProfile(' ', { '': {} }), { kind: 'missing' });
  assert.deepEqual(matchCharacterProfile('Alice', Object.create({ Alice: {} })), { kind: 'missing' });
  assert.deepEqual(matchCharacterProfile('Alice', null), { kind: 'missing' });
  assert.equal(matchCharacterProfile('AB', { AB: undefined, 'A-B': {} }).mode, 'exact');
});

test('真实 Viewer 和图片预读使用同一匹配规则，保持消息姓名和档案原样', async () => {
  const canonical = '伊莉丝·洛蕾塔';
  const input = { 姓名: '伊莉丝 ・ 洛蕾塔', 种族: '人类' };
  const variables = {
    char_info: { profiles: { [canonical]: { gallery: [{ sources: ['https://img.example/iris.webp'] }] } } },
    status: { externalAvatars: { partners: { [canonical]: { url: 'https://img.example/avatar.webp' } } } },
  };
  const before = JSON.stringify({ input, variables });
  const visual = await resolveCharacterVisualConfigWithExtensions(input, variables);
  assert.equal(isSpecialNpcVisualData(visual), true);
  assert.equal(visual.角色图片, 'https://img.example/iris.webp');
  assert.equal(visual.姓名, input.姓名);
  assert.deepEqual(resolveCharacterVisualPreloadUrls(input.姓名, variables), ['https://img.example/iris.webp']);
  assert.equal(hasStatusPortrait(variables, input.姓名), true);
  assert.equal(JSON.stringify({ input, variables }), before);
});

test('冲突时不读取任意档案的图片、颜色或状态栏头像，精确姓名仍可区分', async () => {
  const variables = {
    char_info: {
      profiles: {
        'A-B': { url: 'https://img.example/one.webp', custom_racecolor: '#FF0000' },
        AB: { url: 'https://img.example/two.webp' },
      },
    },
    status: { externalAvatars: { partners: { AB: { url: 'https://img.example/avatar.webp' } } } },
  };
  const ambiguous = await resolveCharacterVisualConfigWithExtensions({ 姓名: 'A B' }, variables);
  assert.equal(isSpecialNpcVisualData(ambiguous), false);
  assert.equal(ambiguous.角色图片, undefined);
  assert.equal(ambiguous.custom_racecolor, undefined);
  assert.deepEqual(resolveCharacterVisualPreloadUrls('A B', variables), []);
  assert.equal(hasStatusPortrait(variables, 'A B'), false);
  const exact = await resolveCharacterVisualConfigWithExtensions({ 姓名: 'AB' }, variables);
  assert.equal(exact.角色图片, 'https://img.example/two.webp');
});
