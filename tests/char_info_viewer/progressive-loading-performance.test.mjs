import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const readSource = path => readFile(new URL(path, repoRoot), 'utf8');

const [appSource, sheetSource, dxCharacterDataSource, runtimeRootSource] = await Promise.all([
  readSource('src/char_info_viewer/App.vue'),
  readSource('src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue'),
  readSource('src/char_info_viewer/dx/loader.ts'),
  readSource('src/char_info_viewer_runtime/RuntimeRoot.vue'),
]);

test('viewer renders a stable local shell while character data is initializing', () => {
  assert.match(appSource, /const initializingViewer = ref\(true\)/);
  assert.match(appSource, /v-else-if="initializingViewer \|\| loadingDxCharacter"/);
  assert.match(appSource, /class="viewer-loading-shell"/);
  assert.match(appSource, /initFromYaml\(\)\.finally\(\(\) =>/);
  assert.match(appSource, /scheduleDxCharacterAutoImport/);
});

test('illustrated character portraits decode progressively without blocking the card frame', () => {
  assert.match(sheetSource, /loading="lazy"/);
  assert.match(sheetSource, /decoding="async"/);
  assert.match(sheetSource, /class="illustrated-portrait-loading"/);
  assert.match(sheetSource, /@load="onPortraitLoaded"/);
});

test('simultaneous DX cards share the in-flight DX profile registry lookup', () => {
  assert.match(dxCharacterDataSource, /__CHAR_INFO_DX_CHARACTER_REGISTRY_CACHE__/);
  assert.match(dxCharacterDataSource, /getSharedRegistryCache/);
  assert.match(dxCharacterDataSource, /cache\.get\(cacheKey\)/);
  assert.match(dxCharacterDataSource, /cache\.set\(cacheKey,/);
});

test('visual effects switch stops non-media UI animation and expensive compositing on mobile', () => {
  assert.match(runtimeRootSource, /<strong>视觉特效<\/strong>/u);
  assert.match(runtimeRootSource, /关闭可降低手机负担。/u);
  assert.doesNotMatch(runtimeRootSource, /粒子特效/u);
  assert.match(appSource, /'viewer-effects-disabled': !props\.effectsEnabled/u);
  assert.match(appSource, /<canvas v-if="props\.effectsEnabled"/u);
  assert.match(
    appSource,
    /\(\) => props\.effectsEnabled,[\s\S]*?engine\?\.destroy\(\);[\s\S]*?if \(!enabled\) return;/u,
  );
  assert.match(
    appSource,
    /\.viewer-effects-disabled :where\(\*\):not\(img\):not\(video\) \{[\s\S]*?animation: none !important;[\s\S]*?backdrop-filter: none !important;[\s\S]*?box-shadow: none !important;[\s\S]*?text-shadow: none !important;[\s\S]*?filter: none !important;/u,
  );
});
