import assert from 'node:assert/strict';
import test from 'node:test';

import { projectCharInfoMessage } from '../../src/char_info_viewer/runtime/charInfoMessage.ts';
import { selectRecentMessageIds } from '../../src/char_info_viewer/runtime/recentMessages.ts';
import {
  buildRawMessageWithCardSlots,
  injectCardHostsIntoDisplayedHtml,
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

test('replaces raw char_info blocks with private slots before display formatting', () => {
  const source = 'Before\n<char_info>\n姓名: Iris\n技能:\n- 名称: 星光\n</char_info>\nAfter';
  const projection = projectCharInfoMessage({ messageId: 12, swipeId: 2, text: source });
  const prepared = buildRawMessageWithCardSlots(source, projection.cards);

  assert.ok(prepared);
  assert.equal(prepared.slots.length, 1);
  assert.equal(prepared.slots[0].cardId, projection.cards[0].id);
  assert.match(prepared.slots[0].token, /^CHARINFOVIEWERSLOT[A-Z0-9]+ENDX*$/);
  assert.equal(prepared.source, `Before\n${prepared.slots[0].token}\nAfter`);
  assert.doesNotMatch(prepared.source, /<char_info|姓名: Iris|名称: 星光/i);
});

test('keeps identical raw cards in ordinal order without DOM text matching', () => {
  const block = '<char_info>姓名: Iris</char_info>';
  const source = `${block}\n正文\n${block}`;
  const projection = projectCharInfoMessage({ messageId: 4, swipeId: 1, text: source });
  const prepared = buildRawMessageWithCardSlots(source, projection.cards);

  assert.ok(prepared);
  assert.equal(prepared.slots.length, 2);
  assert.notEqual(prepared.slots[0].token, prepared.slots[1].token);
  assert.equal(prepared.source, `${prepared.slots[0].token}\n正文\n${prepared.slots[1].token}`);
});

test('injects card hosts into formatted HTML only through private slot tokens', () => {
  const source = '<char_info>姓名: Iris</char_info>';
  const projection = projectCharInfoMessage({ messageId: 5, swipeId: 0, text: source });
  const prepared = buildRawMessageWithCardSlots(source, projection.cards);

  assert.ok(prepared);
  const html = injectCardHostsIntoDisplayedHtml(`<p>${prepared.slots[0].token}</p>`, prepared.slots);

  assert.ok(html);
  assert.match(html, /class="char-info-runtime-host"/);
  assert.match(html, /data-char-info-runtime-owned="1"/);
  assert.match(html, /data-char-info-card-id="5:0:0"/);
  assert.doesNotMatch(html, new RegExp(prepared.slots[0].token));
});

test('rejects formatted output that loses or duplicates a private slot', () => {
  const slots = [{ cardId: '1:0:0', token: 'CHARINFOVIEWERSLOTTESTX0END' }];

  assert.equal(injectCardHostsIntoDisplayedHtml('<p>missing</p>', slots), null);
  assert.equal(
    injectCardHostsIntoDisplayedHtml(`${slots[0].token}<hr>${slots[0].token}`, slots),
    null,
  );
});
