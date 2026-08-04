import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const readSource = path => readFile(new URL(path, repoRoot), 'utf8');

const [profilesSource, sheetSource] = await Promise.all([
  readSource('src/char_info_viewer/dxCharacterRoster.ts'),
  readSource('src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue'),
]);

test('Iris is registered as a visual-only DX theme', () => {
  assert.match(profilesSource, /DxVisualTheme\s*=\s*[^;]*'iris'/);
  assert.match(profilesSource, /id:\s*'dx_iris',[\s\S]*?visualTheme:\s*'iris'/);
  assert.doesNotMatch(profilesSource, /性格|技能|背景故事|injectData|displayData/);
});

test('Iris production sheet renders stable CSS-only jellyfish and toy decoration', () => {
  assert.match(sheetSource, /const isIrisTheme = computed/);
  assert.match(sheetSource, /'illustrated-theme-iris':\s*isIrisTheme\.value/);
  assert.match(sheetSource, /v-if="isIrisTheme" class="illustrated-iris-portrait-deco"/);
  assert.match(sheetSource, /class="illustrated-iris-jellyfish"/);
  assert.match(sheetSource, /class="illustrated-iris-toy-blocks"/);
  assert.doesNotMatch(sheetSource, /iris[^\n]*(?:\.svg|\?raw)/i);
});

test('Iris light theme targets the rendered production DOM classes', () => {
  assert.match(
    sheetSource,
    /\.illustrated-wrapper\.illustrated-theme-iris\s*\{[\s\S]*?color-scheme:\s*light;[\s\S]*?isolation:\s*isolate;/,
  );
  for (const className of [
    'illustrated-list-item',
    'illustrated-text-block',
    'illustrated-page-title',
    'illustrated-resources',
    'illustrated-tabs',
  ]) {
    assert.match(sheetSource, new RegExp(`illustrated-theme-iris[^\\n]*${className}`));
  }
});

test('Iris mobile layout keeps a compact nameplate without overriding shared attribute geometry', () => {
  assert.match(
    sheetSource,
    /@media \(max-width: 900px\)[\s\S]*?\.illustrated-theme-iris \.illustrated-mobile-header-overlay\s*\{[\s\S]*?max-height:\s*24%;/,
  );
  assert.doesNotMatch(sheetSource, /illustrated-theme-iris[^\n]*illustrated-attributes/);
  assert.doesNotMatch(sheetSource, /illustrated-theme-iris[\s\S]{0,220}--flag-width:/);
  assert.doesNotMatch(sheetSource, /illustrated-theme-iris[\s\S]{0,180}position:\s*(?:fixed|sticky)/);
});
