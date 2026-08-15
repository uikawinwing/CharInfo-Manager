import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const webpackSource = await readFile(new URL('../../webpack.config.ts', import.meta.url), 'utf8');
const disabledSource = await readFile(new URL('../../src/char_info_viewer/dx/disabled.ts', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../../src/char_info_viewer/App.vue', import.meta.url), 'utf8');
const viewModelSource = await readFile(
  new URL('../../src/char_info_viewer/services/characterViewModel.ts', import.meta.url),
  'utf8',
);
const themeSource = await readFile(new URL('../../src/char_info_viewer/services/themeService.ts', import.meta.url), 'utf8');

const privateSignatures = [
  'dx_venus',
  'dx_anastasia',
  'dx_iris',
  'dx_seren',
  'char_info_dx_characters',
  '__CHAR_INFO_DX_CHARACTER_REGISTRY_CACHE__',
  '维纳丝·珀菈·索伦蒂斯',
  '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯',
  '艾璃丝·赛瑞利亚',
  '瑟涟·赛瑞利亚',
];

test('DX implementation is an internal module and production swaps the stable runtime adapter to disabled', () => {
  assert.match(webpackSource, /'src\/char_info_viewer\/dx\/index\.ts'/u);
  assert.match(
    webpackSource,
    /argv\.mode === 'production'[\s\S]*NormalModuleReplacementPlugin[\s\S]*char_info_viewer\\\/dxRuntime[\s\S]*'src\/char_info_viewer\/dx\/disabled\.ts'/u,
  );
  assert.match(webpackSource, /clean_private_dx_output/u);
  assert.match(webpackSource, /dist\/char_info_viewer\/dx/u);
  assert.match(webpackSource, /assert_no_dx_leaks/u);
  assert.match(webpackSource, /DX_PRIVATE_BUILD_SIGNATURES/u);
});

test('Viewer runtime consumers only use the stable DX adapter', () => {
  for (const source of [appSource, viewModelSource, themeSource]) {
    assert.match(source, /@\/char_info_viewer\/dxRuntime/u);
    assert.doesNotMatch(source, /from ['"](?:\.\.?\/)+dx['"]/u);
  }
});

test('production DX adapter contains no private roster data and cannot activate DX behavior', () => {
  for (const signature of privateSignatures) assert.doesNotMatch(disabledSource, new RegExp(signature, 'u'));
  assert.match(disabledSource, /return \{ kind: 'not_reference' \};/u);
  assert.match(disabledSource, /return false;/u);
  assert.match(disabledSource, /dxCharacterRoster: readonly DxCharacterRosterEntry\[\] = \[\]/u);
  assert.match(disabledSource, /resolveDxCharacterProfile[\s\S]*return null;/u);
});
