import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const packagePath = new URL('../../package.json', import.meta.url);
const configPath = new URL('../../scripts/theme-lab.webpack.config.mjs', import.meta.url);
const appPath = new URL('../../src/char_info_v2_theme_lab/App.vue', import.meta.url);
const v2Path = new URL('../../src/char_info_viewer/components/illustrated/IllustratedV2Sheet.vue', import.meta.url);

test('Theme Lab has a quiet standalone watch entry', async () => {
  const [packageSource, configSource, appSource, v2Source] = await Promise.all([
    readFile(packagePath, 'utf8'),
    readFile(configPath, 'utf8'),
    readFile(appPath, 'utf8'),
    readFile(v2Path, 'utf8'),
  ]);

  const packageJson = JSON.parse(packageSource);
  assert.match(packageJson.scripts['watch:theme-lab'], /theme-lab-build\.mjs watch/);
  assert.match(configSource, /theme-lab\.webpack\.config\.mjs/);
  assert.match(configSource, /src\/char_info_v2_theme_lab\/index\.ts/);
  assert.match(configSource, /watch_tavern_helper/);
  assert.match(configSource, /schema_dump/);
  assert.match(configSource, /tavern_sync/);
  assert.match(configSource, /configuration\.externals = undefined/);
  assert.match(appSource, /<IllustratedV2Sheet/);
  assert.match(v2Source, /IllustratedV2Theme/);
});
