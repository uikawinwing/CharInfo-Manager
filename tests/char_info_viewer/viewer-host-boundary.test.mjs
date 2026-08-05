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
const divinityPanelSource = await readFile(
  new URL('src/char_info_viewer/components/illustrated/IllustratedDivinityPanel.vue', repoRoot),
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
  assert.match(appSource, /message_id: props\.messageId/);
  assert.match(appSource, /'viewer-root-embedded': props\.embedded/);
});

test('viewer scopes theme variables to its own card root', () => {
  assert.match(appSource, /ref="viewerRootRef"/);
  assert.match(appSource, /if \(viewerRootRef\.value\) applyTheme\(theme\.value, viewerRootRef\.value\)/);
});

test('multiple cards do not repeat static viewer element ids in the host document', () => {
  assert.doesNotMatch(appSource, /id="(?:particle-canvas|import-action-(?:btn|menu))"/);
  assert.doesNotMatch(specialSheetSource, /id="import-action-menu"/);
  assert.match(divinityPanelSource, /const contentId = useId\(\)/);
  assert.match(divinityPanelSource, /:aria-controls="contentId"/);
});

test('vNext runtime mounts cards from raw message text before display formatting', () => {
  assert.equal(runtimeSource.match(/\bcreateApp\(/g)?.length, 1);
  assert.doesNotMatch(runtimeSource, /createElement\(['"]iframe['"]\)|<iframe|srcdoc/i);
  assert.match(runtimeSource, /createScriptIdDiv\(\)\.addClass\('char-info-runtime-root'\)\.appendTo\('body'\)/);
  assert.match(runtimeSource, /destroyTeleportedStyle = teleportStyle\(\)\.destroy/);
  assert.match(runtimeSource, /window\.parent\.document\.querySelector/);
  assert.doesNotMatch(runtimeSource, /mutation\.target instanceof Element/);
  assert.match(runtimeSource, /mountCharInfoCardHosts\(sourceElement, projection\.cards\)/);
  assert.doesNotMatch(runtimeRootSource, /\bv-html\b|char-info-runtime-text|char-info-runtime-source-hidden/);

  assert.match(nativeMountSource, /const message = getChatMessages\(messageId\)\[0\]/);
  assert.match(nativeMountSource, /buildRawMessageWithCardSlots\(rawMessage, cards\)/);
  assert.match(nativeMountSource, /formatAsDisplayedMessage\(prepared\.source, \{ message_id: messageId \}\)/);
  assert.match(nativeMountSource, /injectCardHostsIntoDisplayedHtml\(displayedHtml, prepared\.slots\)/);
  assert.match(nativeMountSource, /while \(root\.firstChild\) originalContent\.appendChild\(root\.firstChild\)/);
  assert.match(nativeMountSource, /root\.replaceChildren\(originalContent\)/);
  assert.doesNotMatch(
    nativeMountSource,
    /createTreeWalker|TreeWalker|findTextRange|findCollapsedTextRange|getCharInfoBoundaryTexts|BLOCKED_NATIVE_SCOPE_SELECTOR/,
  );
});

test('runtime replaces an older loaded instance instead of duplicating cards and observers', () => {
  assert.match(runtimeEntrySource, /hostWindow\.CHAR_INFO_VIEWER_RUNTIME\?\.stop\(\)/);
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
