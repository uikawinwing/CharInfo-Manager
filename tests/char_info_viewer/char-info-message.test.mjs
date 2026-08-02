import assert from 'node:assert/strict';
import test from 'node:test';

import { projectCharInfoMessage } from '../../src/char_info_viewer/runtime/charInfoMessage.ts';
import { selectRecentMessageIds } from '../../src/char_info_viewer/runtime/recentMessages.ts';
import {
  findCollapsedTextRange,
  findTextRange,
  getCharInfoBoundaryTexts,
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

test('extracts only the first and last raw lines as native DOM boundaries', () => {
  assert.deepEqual(getCharInfoBoundaryTexts('<char_info>\n姓名: Iris\n技能:\n- 名称: 星光\n</char_info>'), {
    start: '姓名: Iris',
    end: '名称: 星光',
  });
});

test('locates a char_info body across native message text nodes', () => {
  assert.deepEqual(findTextRange(['故事正文\n', '姓名: Iris\n种族:', ' 人类\n', '后文'], '姓名: Iris\n种族: 人类'), {
    startNodeIndex: 1,
    startOffset: 0,
    endNodeIndex: 2,
    endOffset: 3,
  });
});

test('falls back to whitespace-collapsed matching after Markdown changes text node boundaries', () => {
  assert.deepEqual(findCollapsedTextRange(['姓名:  Iris', '\n种族:\t人类'], '姓名: Iris\n种族: 人类'), {
    startNodeIndex: 0,
    startOffset: 0,
    endNodeIndex: 1,
    endOffset: 7,
  });
});

test('matches YAML list items after Markdown consumes their leading hyphens', () => {
  assert.deepEqual(
    findCollapsedTextRange(
      ['姓名: 图尔\n技能:\n', '名称: 巧舌如簧\n品质: 优良'],
      '姓名: 图尔\n技能:\n- 名称: 巧舌如簧\n  品质: 优良',
    ),
    {
      startNodeIndex: 0,
      startOffset: 0,
      endNodeIndex: 1,
      endOffset: 15,
    },
  );
});
