import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const nativeMountSource = await readFile(
  new URL('src/char_info_viewer_runtime/nativeMessageMount.ts', repoRoot),
  'utf8',
);

test('mounts CharInfo locally without replacing Abby or the whole message root', () => {
  assert.match(nativeMountSource, /const BLOCKED_NATIVE_SCOPE_SELECTOR/);
  assert.match(nativeMountSource, /\.abby-card-shell/);
  assert.match(nativeMountSource, /\[data-abby-foreign="1"\]/);
  assert.match(nativeMountSource, /range\.cloneContents\(\)\.querySelector\(BLOCKED_NATIVE_SCOPE_SELECTOR\)/);
  assert.doesNotMatch(nativeMountSource, /root\.replaceChildren\(/);
});

test('cleanup removes only CharInfo-owned hosts and never restores a stale message snapshot', () => {
  assert.match(nativeMountSource, /host\.replaceWith\(originalContent\)/);
  assert.doesNotMatch(nativeMountSource, /root\.replaceChildren\(/);
});

test('message mounting may read the raw message for display-only location but never rewrites stored chat text', () => {
  assert.match(nativeMountSource, /createTreeWalker\(root, 4\)/);
  assert.match(nativeMountSource, /getChatMessages\(messageId\)/);
  assert.match(nativeMountSource, /formatAsDisplayedMessage\(markedMessage/);
  assert.doesNotMatch(nativeMountSource, /setChatMessages|setChatMessage|createChatMessages|deleteChatMessages/);
});
