import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const creatorAppSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');
const creatorEntrySource = readFileSync(new URL('../../src/char_info_creator_manager/index.ts', import.meta.url), 'utf8');
const creatorOverlaySource = readFileSync(new URL('../../src/char_info_creator_manager/overlay.ts', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const runtimeRootSource = readFileSync(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8');
const playerLibrarySource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
  'utf8',
);
const creatorBundle = readFileSync(new URL('../../dist/char_info_creator_manager/index.js', import.meta.url), 'utf8');

test('世界书角色库属于 Viewer，未加载 Creator 也可浏览图库和切换条目', () => {
  const openWorldbook = runtimeSource.match(/const openWorldbookLibrary = \(\) => \{([\s\S]*?)\n\s{2}\};/u)?.[1] ?? '';
  assert.match(runtimeRootSource, /<WorldbookCharacterLibrary/u);
  assert.match(runtimeSource, /state\.library\.worldbookOpen = true/u);
  assert.doesNotMatch(openWorldbook, /getCreatorManagerHostBridge|creatorManager/u);
  assert.match(playerLibrarySource, /角色图库/u);
  assert.match(playerLibrarySource, /toggleCharacter/u);
  assert.match(playerLibrarySource, /setCharacterEntryEnabled/u);
  assert.match(playerLibrarySource, /updateWorldbookWith/u);
});

test('Creator Manager 只在玩家选择编辑时打开，并接收准确世界书与条目', () => {
  assert.match(runtimeSource, /creatorManager\.open\(\{ worldbookName, entryUid, forceMobileLayout:/u);
  assert.match(creatorEntrySource, /createCreatorManagerOverlay\(options\)/u);
  assert.match(creatorOverlaySource, /initialWorldbookName: options\.worldbookName/u);
  assert.match(creatorOverlaySource, /initialEntryUid: options\.entryUid/u);
  assert.match(creatorAppSource, /props\.initialWorldbookName/u);
  assert.match(creatorAppSource, /entries\.value\.find\(entry => entry\.uid === props\.initialEntryUid\)/u);
});

test('Creator 的可达界面只有编辑器，不再提供玩家角色库入口', () => {
  assert.doesNotMatch(creatorAppSource, /class="manager-view-switch"/u);
  assert.doesNotMatch(creatorAppSource, /@click="switchManagerView\('library'\)"/u);
  assert.doesNotMatch(creatorBundle, /世界书角色库|条目开关后的读回验证失败/u);
  assert.match(creatorBundle, /角色视觉编辑器/u);
});

test('玩家详情正文只读，只有 Creator 负责资料编辑与保存', () => {
  assert.match(playerLibrarySource, /角色条目内容/u);
  assert.match(playerLibrarySource, /<b>只读<\/b>/u);
  assert.doesNotMatch(playerLibrarySource, /saveToEntry|upsertManagedEjsBlock|保存设定正文/u);
  assert.match(creatorAppSource, /saveToEntry/u);
  assert.match(creatorAppSource, /upsertManagedEjsBlock/u);
});

test('Creator 编辑器仍以独立 iframe 挂载并固定在可视视口', () => {
  assert.match(creatorOverlaySource, /createScriptIdIframe/u);
  assert.match(creatorOverlaySource, /position:\s*'fixed'/u);
  assert.match(creatorOverlaySource, /visualViewport/u);
  assert.doesNotMatch(creatorOverlaySource, /hostWindow\.scroll[XY]/u);
});
