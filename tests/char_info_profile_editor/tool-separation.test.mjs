import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const profileEditorAppSource = readFileSync(new URL('../../src/char_info_profile_editor/App.vue', import.meta.url), 'utf8');
const profileEditorEntrySource = readFileSync(new URL('../../src/char_info_profile_editor/index.ts', import.meta.url), 'utf8');
const profileEditorControllerSource = readFileSync(
  new URL('../../src/char_info_profile_editor/controller.ts', import.meta.url),
  'utf8',
);
const profileEditorOverlaySource = readFileSync(new URL('../../src/char_info_profile_editor/overlay.ts', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const runtimeRootSource = readFileSync(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8');
const playerLibrarySource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
  'utf8',
);

test('世界书角色库属于角色查看器侧，未加载角色档案编辑器也可浏览图库和切换条目', () => {
  const openWorldbook = runtimeSource.match(/const openWorldbookLibrary = \(\) => \{([\s\S]*?)\n\s{2}\};/u)?.[1] ?? '';
  assert.match(runtimeRootSource, /<WorldbookCharacterLibrary/u);
  assert.match(runtimeSource, /state\.library\.worldbookOpen = true/u);
  assert.doesNotMatch(openWorldbook, /openProfileEditor/u);
  assert.match(playerLibrarySource, /角色图库/u);
  assert.match(playerLibrarySource, /toggleCharacter/u);
  assert.match(playerLibrarySource, /setCharacterEntryEnabled/u);
  assert.match(playerLibrarySource, /updateWorldbookWith/u);
});

test('Profile Editor 只在玩家选择编辑时打开，并接收准确世界书与条目', () => {
  assert.match(runtimeSource, /openProfileEditor\(\{[\s\S]*?worldbookName,[\s\S]*?entryUid,[\s\S]*?forceMobileLayout:/u);
  assert.match(profileEditorControllerSource, /createProfileEditorOverlay\(options\)/u);
  assert.match(profileEditorEntrySource, /export \{ closeProfileEditor, openProfileEditor \} from '\.\/controller';/u);
  assert.match(profileEditorOverlaySource, /initialWorldbookName: options\.worldbookName/u);
  assert.match(profileEditorOverlaySource, /initialEntryUid: options\.entryUid/u);
  assert.match(profileEditorAppSource, /props\.initialWorldbookName/u);
  assert.match(profileEditorAppSource, /entries\.value\.find\(entry => entry\.uid === props\.initialEntryUid\)/u);
});

test('角色档案编辑器模块的可达界面只有编辑器，不再提供角色资料库入口', () => {
  assert.doesNotMatch(profileEditorAppSource, /class="manager-view-switch"/u);
  assert.doesNotMatch(profileEditorAppSource, /@click="switchManagerView\('library'\)"/u);
  assert.doesNotMatch(profileEditorAppSource, /WorldbookCharacterLibrary|条目开关后的读回验证失败/u);
  assert.match(profileEditorOverlaySource, /角色档案编辑器/u);
});

test('玩家详情正文只读，只有角色档案编辑器负责档案编辑与保存', () => {
  assert.match(playerLibrarySource, /角色条目内容/u);
  assert.match(playerLibrarySource, /<b>只读<\/b>/u);
  assert.doesNotMatch(playerLibrarySource, /saveToEntry|upsertManagedEjsBlock|保存设定正文/u);
  assert.match(profileEditorAppSource, /saveToEntry/u);
  assert.match(profileEditorAppSource, /upsertManagedEjsBlock/u);
});

test('角色档案编辑器仍以独立 iframe 挂载并固定在可视视口', () => {
  assert.match(profileEditorOverlaySource, /createScriptIdIframe/u);
  assert.match(profileEditorOverlaySource, /position:\s*'fixed'/u);
  assert.match(profileEditorOverlaySource, /visualViewport/u);
  assert.doesNotMatch(profileEditorOverlaySource, /hostWindow\.scroll[XY]/u);
});
