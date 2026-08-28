import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const appSource = await readFile(new URL('src/char_info_viewer/App.vue', repoRoot), 'utf8');
const runtimeEntrySource = await readFile(new URL('src/char_info_viewer_runtime/index.ts', repoRoot), 'utf8');
const specialSheetSource = await readFile(
  new URL('src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue', repoRoot),
  'utf8',
);
const runtimeSource = await readFile(new URL('src/char_info_viewer_runtime/runtime.ts', repoRoot), 'utf8');
const runtimeRootSource = await readFile(new URL('src/char_info_viewer_runtime/RuntimeRoot.vue', repoRoot), 'utf8');
const nativeMountSource = await readFile(
  new URL('src/char_info_viewer_runtime/nativeMessageMount.ts', repoRoot),
  'utf8',
);

test('viewer requires immutable YAML and message context from the script host', () => {
  assert.match(appSource, /defineProps<\{[\s\S]*?yamlText: string;[\s\S]*?messageId: number;[\s\S]*?\}>/);
  assert.match(appSource, /const yamlText = props\.yamlText\.trim\(\)/);
  assert.doesNotMatch(appSource, /data-source|\$1|props\.yamlText !== undefined/);
  assert.match(appSource, /message_id: Math\.max\(0, getLastMessageId\(\)\)/);
  assert.match(appSource, /'viewer-root-embedded': props\.embedded/);
});

test('viewer scopes theme variables to its own card root', () => {
  assert.match(appSource, /ref="viewerRootRef"/);
  assert.match(appSource, /if \(viewerRootRef\.value\) applyTheme\(theme\.value, viewerRootRef\.value\)/);
});

test('multiple cards do not repeat static viewer element ids in the host document', () => {
  assert.doesNotMatch(appSource, /id="(?:particle-canvas|import-action-(?:btn|menu))"/);
  assert.doesNotMatch(specialSheetSource, /id="import-action-menu"/);
});

test('vNext runtime mounts cards through local displayed-text ranges', () => {
  assert.equal(runtimeSource.match(/\bcreateApp\(/g)?.length, 1);
  assert.doesNotMatch(runtimeSource, /createElement\(['"]iframe['"]\)|<iframe|srcdoc/i);
  assert.match(runtimeSource, /createScriptIdDiv\(\)\.addClass\('char-info-runtime-root'\)\.appendTo\('body'\)/);
  assert.match(runtimeSource, /destroyTeleportedStyle = teleportStyle\(\)\.destroy/);
  assert.match(runtimeSource, /window\.parent\.document\.querySelector/);
  assert.doesNotMatch(runtimeSource, /mutation\.target instanceof Element/);
  assert.match(runtimeSource, /mountCharInfoCardHosts\(sourceElement, projection\.cards\)/);
  assert.doesNotMatch(runtimeRootSource, /\bv-html\b|char-info-runtime-text|char-info-runtime-source-hidden/);

  assert.match(nativeMountSource, /export const BLOCKED_NATIVE_SCOPE_SELECTOR/);
  assert.match(nativeMountSource, /\.abby-card-shell/);
  assert.match(nativeMountSource, /\[data-abby-foreign="1"\]/);
  assert.match(nativeMountSource, /createTreeWalker\(root, 4\)/);
  assert.match(nativeMountSource, /getDisplayLocatorCandidates\(root, card, body\)/);
  assert.match(nativeMountSource, /findCollapsedTextRange\(chunks, candidate\)/);
  assert.match(nativeMountSource, /range\.cloneContents\(\)\.querySelector\(BLOCKED_NATIVE_SCOPE_SELECTOR\)/);
  assert.match(nativeMountSource, /const originalContent = range\.extractContents\(\)/);
  assert.match(nativeMountSource, /host\.replaceWith\(originalContent\)/);
  assert.match(nativeMountSource, /formatAsDisplayedMessage\(markedMessage/);
  assert.doesNotMatch(nativeMountSource, /root\.replaceChildren\(|buildRawMessageWithCardSlots|injectCardHostsIntoDisplayedHtml|setChatMessages|setChatMessage/);
});

test('runtime replaces an older loaded instance without refreshing native messages', () => {
  assert.match(
    runtimeEntrySource,
    /hostWindow\.CHAR_INFO_VIEWER_RUNTIME\?\.stop\(\{ restoreNativeMessages: false \}\)/,
  );
  assert.match(runtimeEntrySource, /hostWindow\.CHAR_INFO_VIEWER_RUNTIME = nextRuntime/);
  assert.match(runtimeEntrySource, /delete hostWindow\.CHAR_INFO_VIEWER_RUNTIME/);
});

test('runtime mutation observer skips all mutation traversal until a card is mounted', () => {
  const observerCallback = runtimeSource.match(
    /mutationObserver = new window\.parent\.MutationObserver\(mutations => \{([\s\S]*?)\n {4}\}\);/u,
  )?.[1];

  assert.match(observerCallback ?? '', /^\s*if \(mountedMessages\.size === 0\) return;/u);
  assert.match(observerCallback ?? '', /target\.closest\('\[data-char-info-runtime-owned\]'\)/u);
  assert.match(
    observerCallback ?? '',
    /!mounted\.sourceElement\.isConnected \|\| mounted\.cardMounts\.some\(cardMount => !cardMount\.host\.isConnected\)/u,
  );
});

test('runtime stops repeated remounts and detects editing at the message boundary', () => {
  assert.match(runtimeSource, /const REMOUNT_LOOP_GUARD_MS = 3000/);
  assert.match(runtimeSource, /messageElement\.querySelector\('#curEditTextarea'\)/);
  assert.match(runtimeSource, /previousAttempt\?\.signature === sourceSignature/);
  assert.match(runtimeSource, /now - previousAttempt\.attemptedAt < REMOUNT_LOOP_GUARD_MS/);
  assert.match(runtimeSource, /已停止自动重挂载以避免渲染循环/);
});

test('runtime restores native message display only after a real script stop', () => {
  assert.match(runtimeSource, /stop\(options = \{\}\)/);
  assert.match(runtimeSource, /options\.restoreNativeMessages === false \? \[\] : Array\.from\(mountedMessages\.keys\(\)\)/);
  assert.match(runtimeSource, /messageElement\.querySelector\('#curEditTextarea'\)/);
  assert.match(runtimeSource, /refreshOneMessage\(messageId, \$\(messageElement\)\)/);
  assert.match(runtimeSource, /destroyTeleportedStyle = null;\s*restoreNativeMessageDisplays\(mountedMessageIds\)/);
});
