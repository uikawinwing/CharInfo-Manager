import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const runtimeSource = await readFile(
  new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url),
  'utf8',
);

test('SillyTavern lifecycle events are allowed to remount repeatedly', () => {
  assert.match(runtimeSource, /const lifecycleDrivenMessageIds = new Set<number>\(\);/);
  assert.match(
    runtimeSource,
    /CHARACTER_MESSAGE_RENDERED[\s\S]*?enqueueMessage\(messageId, 'CHARACTER_MESSAGE_RENDERED', \{ lifecycleDriven: true \}\)/,
  );
  assert.match(
    runtimeSource,
    /GENERATION_ENDED[\s\S]*?enqueueMessage\(messageId, 'GENERATION_ENDED', \{ lifecycleDriven: true \}\)/,
  );
  assert.match(runtimeSource, /const lifecycleDriven = lifecycleDrivenMessageIds\.delete\(messageId\);/);
  assert.match(runtimeSource, /renderMessage\(messageId, trigger, lifecycleDriven\);/);
  assert.match(
    runtimeSource,
    /if \(current\) \{[\s\S]*?if \(!lifecycleDriven\) \{[\s\S]*?REMOUNT_LOOP_GUARD_MS[\s\S]*?\} else \{[\s\S]*?remountAttempts\.delete\(messageId\)/,
  );
});

test('MutationObserver remains a guarded fallback instead of a lifecycle source', () => {
  const observerStart = runtimeSource.indexOf('const observeMessageDom = () => {');
  const eventStart = runtimeSource.indexOf('const bindEvents = () => {');
  assert.ok(observerStart >= 0 && eventStart > observerStart);

  const observerSource = runtimeSource.slice(observerStart, eventStart);
  assert.match(observerSource, /enqueueMessage\(messageId, 'dom-host-disconnected'\);/);
  assert.doesNotMatch(observerSource, /lifecycleDriven: true/);
});
