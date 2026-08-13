import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const webpackSource = await readFile(new URL('../../webpack.config.ts', import.meta.url), 'utf8');
const runtimeSource = await readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const creatorIndexSource = await readFile(new URL('../../src/char_info_creator_manager/index.ts', import.meta.url), 'utf8');
const creatorControllerSource = await readFile(
  new URL('../../src/char_info_creator_manager/controller.ts', import.meta.url),
  'utf8',
);
const legacyBridgeSource = await readFile(
  new URL('../../src/char_info_shared/creatorManagerHostBridge.ts', import.meta.url),
  'utf8',
);

test('Viewer 与 Creator 合并为一个脚本 entry，但内部模块仍保持分离', () => {
  assert.match(webpackSource, /internalModuleEntries = new Set\(\['src\/char_info_creator_manager\/index\.ts'\]\)/u);
  assert.match(runtimeSource, /from '\.\.\/char_info_creator_manager\/controller'/u);
  assert.match(creatorControllerSource, /createCreatorManagerOverlay/u);
  assert.match(creatorIndexSource, /export \{ closeCreatorManager, openCreatorManager \} from '\.\/controller';/u);
});

test('单脚本通信不再依赖 host window bridge', () => {
  assert.doesNotMatch(runtimeSource, /creatorManagerHostBridge|getCreatorManagerHostBridge/u);
  assert.doesNotMatch(creatorControllerSource, /window\.|registerCreatorManagerHostBridge|HOST_BRIDGE/u);
  assert.doesNotMatch(legacyBridgeSource, /__charInfoCreatorManagerHostBridge|registerCreatorManagerHostBridge|getCreatorManagerHostBridge/u);
});
