import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const appSource = await readFile(new URL('src/char_info_viewer/App.vue', repoRoot), 'utf8');
const themeSource = await readFile(new URL('src/char_info_viewer/services/themeService.ts', repoRoot), 'utf8');
const importServiceSource = await readFile(new URL('src/char_info_viewer/services/importService.ts', repoRoot), 'utf8');
const ejsProfileSource = await readFile(new URL('src/char_info_creator_manager/ejsProfile.ts', repoRoot), 'utf8');
const creatorManagerSource = await readFile(new URL('src/char_info_creator_manager/App.vue', repoRoot), 'utf8');
const viewerRuntimeSource = await readFile(new URL('src/char_info_viewer_runtime/runtime.ts', repoRoot), 'utf8');
const viewerRuntimeRootSource = await readFile(
  new URL('src/char_info_viewer_runtime/RuntimeRoot.vue', repoRoot),
  'utf8',
);
const previewBuilderSource = await readFile(new URL('docs/previews/char_info_ejs_builder.html', repoRoot), 'utf8');

test('特殊 NPC 自动导入绑定聊天、楼层与 swipe，事件只负责时序且卸载时清理', () => {
  assert.match(appSource, /Mvu\.events\.BEFORE_MESSAGE_UPDATE/);
  assert.match(appSource, /messageContainsSpecialNpcCharacterReference\(context\.message_content, reference\)/);
  assert.match(appSource, /tavern_events\.GENERATION_ENDED/);
  assert.match(appSource, /messageId !== props\.messageId/);
  assert.doesNotMatch(appSource, /Mvu\.events\.VARIABLE_UPDATE_ENDED/);
  assert.doesNotMatch(appSource, /mergeIntoFinalVariables\(context\.variables\)/);
  assert.match(appSource, /enqueueSpecialNpcImport\(queueKey/);
  assert.match(appSource, /Mvu\.getMvuData\(targetScope\)/);
  assert.match(appSource, /Mvu\.replaceMvuData\(currentVariables, targetScope\)/);
  assert.match(appSource, /specialNpcAutoImportDisposed = true/);
  assert.match(appSource, /specialNpcAutoImportEventListener\?\.stop\(\)/);
  assert.match(appSource, /specialNpcGenerationEndedEventListener\?\.stop\(\)/);
  assert.match(appSource, /SillyTavern\.getCurrentChatId\(\) !== chatId/);
  assert.match(appSource, /readActiveSwipeId\(props\.messageId\) !== swipeId/);
});

test('手动 MVU 导入写回卡片所属消息楼层而不是 latest', () => {
  assert.match(
    appSource,
    /importToMvuVariables\(importData,\s*\{\s*type:\s*'message',\s*message_id:\s*props\.messageId\s*\}\)/,
  );
  assert.doesNotMatch(importServiceSource, /message_id:\s*'latest'/);
  assert.match(importServiceSource, /message_id:\s*number/);
});

test('视觉资料只读取 CharInfo 聊天路径，状态栏仅保留头像写入', () => {
  assert.match(themeSource, /chatVariables\.char_info/);
  assert.match(themeSource, /charInfo\?\.profiles/);
  assert.doesNotMatch(themeSource, /externalGalleries/);
  assert.match(ejsProfileSource, /char_info\.profiles/);
  assert.match(ejsProfileSource, /status\.externalAvatars\.partners/);
  assert.doesNotMatch(ejsProfileSource, /setLocalVar\([\s\S]*status\.externalGalleries\.partners/);
  assert.match(previewBuilderSource, /char_info\.profiles/);
  assert.doesNotMatch(previewBuilderSource, /externalGalleries|char_info_visuals|dryRun|merge:/);
});

test('角色库的 MVU 更新事件只触发刷新，资料始终重新读取 latest 消息快照', () => {
  assert.match(
    creatorManagerSource,
    /Mvu\.events\.VARIABLE_UPDATE_ENDED,\s*\(\)\s*=>\s*\{\s*void loadEncounteredCharacterData\(\)/,
  );
  assert.match(
    viewerRuntimeSource,
    /Mvu\.events\.VARIABLE_UPDATE_ENDED,\s*\(variables, variablesBeforeUpdate\)\s*=>\s*\{[\s\S]*?void refreshLibrary\(collectChangedAffinityNames\(variables, variablesBeforeUpdate\)\)/,
  );
  assert.match(creatorManagerSource, /Mvu\.getMvuData\(\{\s*type:\s*'message',\s*message_id:\s*'latest'\s*\}\)/);
  assert.match(viewerRuntimeSource, /Mvu\.getMvuData\(\{\s*type:\s*'message',\s*message_id:\s*'latest'\s*\}\)/);
  assert.doesNotMatch(
    creatorManagerSource,
    /Mvu\.events\.VARIABLE_UPDATE_ENDED,\s*variables\s*=>[\s\S]*?applyEncounteredCharacterData\(variables\)/,
  );
  assert.doesNotMatch(
    viewerRuntimeSource,
    /Mvu\.events\.VARIABLE_UPDATE_ENDED,\s*variables\s*=>[\s\S]*?collectCurrentCharacterSnapshots\(variables\)/,
  );
  assert.match(viewerRuntimeSource, /applyLibrarySnapshot\(Mvu\.getMvuData\([\s\S]*?unreadNamesForRefresh\)/);
  assert.match(creatorManagerSource, /const loadRevision = \+\+encounteredLoadRevision/);
  assert.match(
    creatorManagerSource,
    /loadRevision !== encounteredLoadRevision \|\| SillyTavern\.getCurrentChatId\(\) !== chatId/,
  );
  assert.match(viewerRuntimeSource, /if \(library\.loading\) \{\s*libraryRefreshPending = true/);
  assert.match(viewerRuntimeSource, /const startRevision = \+\+lifecycleRevision/);
  assert.match(viewerRuntimeSource, /!started \|\| lifecycleRevision !== startRevision/);
  assert.match(viewerRuntimeSource, /started = false;\s*lifecycleRevision \+= 1/);
  assert.match(creatorManagerSource, /tavern_events\.CHAT_CHANGED,\s*\(\)\s*=>\s*\{\s*emit\('close'\)/);
  assert.match(
    viewerRuntimeRootSource,
    /\(\) => props\.state\.library,[\s\S]*?searchText\.value = ''[\s\S]*?activeFilter\.value = 'all'/,
  );
});

test('聊天 DOM 观察器使用 SillyTavern 宿主页的构造器，避免 iframe realm 失配', () => {
  assert.match(viewerRuntimeSource, /new window\.parent\.MutationObserver\(/);
  assert.doesNotMatch(viewerRuntimeSource, /new MutationObserver\(/);
});
