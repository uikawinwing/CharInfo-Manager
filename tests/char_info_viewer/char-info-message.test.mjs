import assert from 'node:assert/strict';
import test from 'node:test';

import { projectCharInfoMessage } from '../../src/char_info_viewer/runtime/charInfoMessage.ts';
import { selectRecentMessageIds } from '../../src/char_info_viewer/runtime/recentMessages.ts';
import {
  findCollapsedTextRange,
  getCharInfoBody,
} from '../../src/char_info_viewer_runtime/nativeMessageMount.ts';

test('projects one char_info block while preserving surrounding message text', () => {
  const projection = projectCharInfoMessage({
    messageId: 12,
    swipeId: 2,
    text: 'Before\n<char_info>\n姓名: Iris\n</char_info>\nAfter',
  });

  assert.equal(projection.overflow, false);
  assert.deepEqual(
    projection.parts.map(part => ({ kind: part.kind, content: part.content })),
    [
      { kind: 'text', content: 'Before\n' },
      { kind: 'card', content: '<char_info>\n姓名: Iris\n</char_info>' },
      { kind: 'text', content: '\nAfter' },
    ],
  );
  assert.equal(projection.cards[0].id, '12:2:0');
  assert.match(projection.cards[0].renderKey, /^12:2:0:[0-9a-f]{8}$/);
});

test('projects multiple complete blocks case-insensitively with stable ordinals', () => {
  const text = '<CHAR_INFO>姓名: A</CHAR_INFO>\ntext\n<char_info>\n姓名: B\n</char_info>';
  const first = projectCharInfoMessage({ messageId: 7, swipeId: 0, text });
  const second = projectCharInfoMessage({ messageId: 7, swipeId: 0, text });

  assert.deepEqual(
    first.cards.map(card => card.id),
    ['7:0:0', '7:0:1'],
  );
  assert.deepEqual(
    first.cards.map(card => card.renderKey),
    second.cards.map(card => card.renderKey),
  );
});

test('ignores char_info inside think and only captures char_info inside gametxt', () => {
  const text = [
    '<think>',
    '<char_info>姓名: Thought</char_info>',
    '</think>',
    'intermediate text',
    '<gametxt>',
    '<char_info>姓名: Iris</char_info>',
    '</gametxt>',
    '<char_info>姓名: Tail</char_info>',
  ].join('\n');

  const projection = projectCharInfoMessage({ messageId: 20, swipeId: 0, text });

  assert.deepEqual(projection.cards.map(card => card.content), ['<char_info>姓名: Iris</char_info>']);
});

test('ignores char_info after closing gametxt', () => {
  const text = '<gametxt>\n<char_info>姓名: Iris</char_info>\n</gametxt>\n<char_info>姓名: Tail</char_info>';
  const projection = projectCharInfoMessage({ messageId: 21, swipeId: 0, text });

  assert.deepEqual(projection.cards.map(card => card.content), ['<char_info>姓名: Iris</char_info>']);
});

test('does not let a char_info opening tag in think cross into gametxt or later content', () => {
  const text = [
    '<think>',
    '<char_info>',
    'draft only',
    '</think>',
    '<gametxt>',
    '正文',
    '</char_info>',
    '</gametxt>',
  ].join('\n');

  const projection = projectCharInfoMessage({ messageId: 22, swipeId: 0, text });
  assert.deepEqual(projection.cards, []);
});

test('an unclosed think region is never scanned for char_info', () => {
  const text = '<think>\n<char_info>姓名: Thought</char_info>';
  const projection = projectCharInfoMessage({ messageId: 23, swipeId: 0, text });

  assert.deepEqual(projection.cards, []);
});

test('leaves an incomplete streaming block as ordinary text', () => {
  const text = 'streaming\n<char_info>\n姓名: Iris';
  const projection = projectCharInfoMessage({ messageId: 3, swipeId: 0, text });

  assert.deepEqual(projection.cards, []);
  assert.deepEqual(projection.parts, [{ kind: 'text', content: text }]);
});

test('refuses an absurd number of cards instead of partially rendering the message', () => {
  const text = Array.from({ length: 5 }, (_, index) => `<char_info>姓名: ${index}</char_info>`).join('\n');
  const projection = projectCharInfoMessage({ messageId: 9, swipeId: 1, text, maxCards: 4 });

  assert.equal(projection.overflow, true);
  assert.deepEqual(projection.cards, []);
  assert.deepEqual(projection.parts, [{ kind: 'text', content: text }]);
});

test('runtime selects only the latest six loaded floors by default', () => {
  assert.deepEqual(selectRecentMessageIds([0, 1, 2, 3, 4, 5, 6, 7]), [2, 3, 4, 5, 6, 7]);
  assert.deepEqual(selectRecentMessageIds([3, 4]), [3, 4]);
});

test('locates a collapsed body after display formatting changes whitespace and list markers', () => {
  assert.deepEqual(
    findCollapsedTextRange(['姓名: Iris ', '技能: ', '名称: 星光'], '姓名: Iris\n技能:\n- 名称: 星光'),
    {
      startNodeIndex: 0,
      startOffset: 0,
      endNodeIndex: 2,
      endOffset: 6,
    },
  );
});

test('extracts a complete non-empty char_info body', () => {
  const source = '<char_info>\n姓名: Iris\n- 技能: 星光\n</char_info>';

  assert.equal(getCharInfoBody(source), '\n姓名: Iris\n- 技能: 星光\n');
  assert.equal(getCharInfoBody('<char_info>\n\n</char_info>'), null);
});
