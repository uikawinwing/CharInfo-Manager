import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const readSource = path => readFile(new URL(path, repoRoot), 'utf8');

const [appSource, sheetSource, dxCharacterDataSource] = await Promise.all([
  readSource('src/char_info_viewer/App.vue'),
  readSource('src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue'),
  readSource('src/char_info_viewer/dxCharacterData.ts'),
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
