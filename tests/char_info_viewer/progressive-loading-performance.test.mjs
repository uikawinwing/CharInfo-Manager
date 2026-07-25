import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const readSource = path => readFile(new URL(path, repoRoot), 'utf8');

const [appSource, sheetSource, specialNpcDataSource] = await Promise.all([
  readSource('src/char_info_viewer/App.vue'),
  readSource('src/char_info_viewer/components/specialNpc/SpecialNpcCharacterSheet.vue'),
  readSource('src/char_info_viewer/specialNpcCharacterData.ts'),
]);

test('viewer renders a stable local shell while character data is initializing', () => {
  assert.match(appSource, /const initializingViewer = ref\(true\)/);
  assert.match(appSource, /v-else-if="initializingViewer \|\| loadingSpecialNpc"/);
  assert.match(appSource, /class="viewer-loading-shell"/);
  assert.match(appSource, /initFromYaml\(\)\.finally\(\(\) =>/);
  assert.match(appSource, /scheduleSpecialNpcAutoImport/);
});

test('special NPC portraits decode progressively without blocking the card frame', () => {
  assert.match(sheetSource, /loading="lazy"/);
  assert.match(sheetSource, /decoding="async"/);
  assert.match(sheetSource, /class="special-npc-portrait-loading"/);
  assert.match(sheetSource, /@load="onPortraitLoaded"/);
});

test('simultaneous DX cards share the in-flight special profile registry lookup', () => {
  assert.match(specialNpcDataSource, /__CHAR_INFO_SPECIAL_NPC_REGISTRY_CACHE__/);
  assert.match(specialNpcDataSource, /getSharedRegistryCache/);
  assert.match(specialNpcDataSource, /cache\.get\(cacheKey\)/);
  assert.match(specialNpcDataSource, /cache\.set\(cacheKey,/);
});
