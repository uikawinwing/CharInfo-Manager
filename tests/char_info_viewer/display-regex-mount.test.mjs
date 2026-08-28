import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const nativeMountSource = await readFile(
  new URL('src/char_info_viewer_runtime/nativeMessageMount.ts', repoRoot),
  'utf8',
);
const runtimeSource = await readFile(new URL('src/char_info_viewer_runtime/runtime.ts', repoRoot), 'utf8');

test('native CharInfo mounting can locate post-regex display text', () => {
  assert.match(nativeMountSource, /const candidates = \[rawBody\]/);
  assert.match(nativeMountSource, /formatAsTavernRegexedString\(rawBody, 'ai_output', 'display', \{ depth \}\)/);
  assert.match(nativeMountSource, /formatAsDisplayedMessage\(rawBody, \{ message_id: messageId \}\)/);
  assert.match(nativeMountSource, /container\.textContent/);
  assert.match(nativeMountSource, /getDisplayLocatorCandidates\(root, body\)/);
});

test('display-only locator fallback does not replace the raw CharInfo payload used by Viewer', () => {
  assert.match(runtimeSource, /yamlText: card\.content/);
  assert.doesNotMatch(runtimeSource, /yamlText:\s*formatAsTavernRegexedString/);
  assert.doesNotMatch(runtimeSource, /yamlText:\s*formatAsDisplayedMessage/);
});
