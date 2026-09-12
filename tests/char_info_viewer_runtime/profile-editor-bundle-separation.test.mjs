import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const runtimeSource = await readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const creatorIndexSource = await readFile(new URL('../../src/char_info_profile_editor/index.ts', import.meta.url), 'utf8');
const sharedWebpackSource = await readFile(new URL('../../../../Toolchain/webpack.config.ts', import.meta.url), 'utf8');
const creatorControllerSource = await readFile(
  new URL('../../src/char_info_profile_editor/controller.ts', import.meta.url),
  'utf8',
);
const legacyBridgeSource = await readFile(
  new URL('../../src/char_info_shared/profileEditorHostBridge.ts', import.meta.url),
  'utf8',
);

test('角色查看器与角色档案编辑器合并为一个脚本 entry，但内部模块仍保持分离', () => {
  assert.match(creatorIndexSource, /@no-entry/u);
  assert.match(sharedWebpackSource, /includes\('@no-entry'\)/u);
  assert.match(runtimeSource, /from '\.\.\/char_info_profile_editor\/controller'/u);
  assert.match(creatorControllerSource, /createProfileEditorOverlay/u);
  assert.match(creatorIndexSource, /export \{ closeProfileEditor, openProfileEditor \} from '\.\/controller';/u);
});

test('单脚本通信不再依赖 host window bridge', () => {
  assert.doesNotMatch(runtimeSource, /profileEditorHostBridge|getProfileEditorHostBridge/u);
  assert.doesNotMatch(creatorControllerSource, /window\.|registerProfileEditorHostBridge|HOST_BRIDGE/u);
  assert.doesNotMatch(legacyBridgeSource, /__charInfoProfileEditorHostBridge|registerProfileEditorHostBridge|getProfileEditorHostBridge/u);
});
