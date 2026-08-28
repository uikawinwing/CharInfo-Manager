import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const nativeMountSource = await readFile(
  new URL('src/char_info_viewer_runtime/nativeMessageMount.ts', repoRoot),
  'utf8',
);
const runtimeSource = await readFile(new URL('src/char_info_viewer_runtime/runtime.ts', repoRoot), 'utf8');

test('native CharInfo mounting derives post-regex locator text from the whole displayed message', () => {
  assert.match(nativeMountSource, /const message = getChatMessages\(messageId\)\[0\]/);
  assert.match(nativeMountSource, /rawMessage\.slice\(card\.sourceStart, card\.sourceEnd\) !== card\.content/);
  assert.match(nativeMountSource, /const markedCard = `\$\{parts\.openingTag\}\$\{startMarker\}\$\{parts\.body\}\$\{endMarker\}\$\{parts\.closingTag\}`/);
  assert.match(nativeMountSource, /rawMessage\.slice\(0, card\.sourceStart\)/);
  assert.match(nativeMountSource, /rawMessage\.slice\(card\.sourceEnd\)/);
  assert.match(nativeMountSource, /formatAsDisplayedMessage\(markedMessage, \{ message_id: messageId \}\)/);
  assert.match(nativeMountSource, /displayedText\.indexOf\(startMarker\)/);
  assert.match(nativeMountSource, /displayedText\.indexOf\(endMarker, bodyStart\)/);
  assert.match(nativeMountSource, /getDisplayLocatorCandidates\(root, card, body\)/);
  assert.doesNotMatch(nativeMountSource, /formatAsDisplayedMessage\(rawBody/);
  assert.doesNotMatch(nativeMountSource, /formatAsTavernRegexedString\(rawBody/);
});

test('display-only locator fallback does not replace the raw CharInfo payload used by Viewer', () => {
  assert.match(runtimeSource, /yamlText: card\.content/);
  assert.doesNotMatch(runtimeSource, /yamlText:\s*formatAsTavernRegexedString/);
  assert.doesNotMatch(runtimeSource, /yamlText:\s*formatAsDisplayedMessage/);
});

test('mount failures expose gated diagnostics for the real rendered message', () => {
  assert.match(nativeMountSource, /readRuntimeSettings\(getVariables\(\{ type: 'script' \}\)\)\.debugEnabled/);
  assert.match(nativeMountSource, /\[CharInfo Runtime\]\[mount-debug\]/);
  assert.match(nativeMountSource, /rawCandidate:/);
  assert.match(nativeMountSource, /finalDisplayCandidate:/);
  assert.match(nativeMountSource, /mesTextActual:/);
  assert.match(nativeMountSource, /renderableText:/);
  assert.match(nativeMountSource, /charInfoElements,/);
  assert.match(nativeMountSource, /blockedScopes:/);
  assert.match(nativeMountSource, /mesTextHtml:/);
  assert.match(nativeMountSource, /locator-text-not-found/);
  assert.match(nativeMountSource, /candidate-range-crosses-blocked-scope/);
});
