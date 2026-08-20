import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const appSource = await readFile(new URL('src/char_info_viewer/App.vue', repoRoot), 'utf8');
const themeSource = await readFile(new URL('src/char_info_viewer/services/themeService.ts', repoRoot), 'utf8');
const importServiceSource = await readFile(new URL('src/char_info_viewer/services/importService.ts', repoRoot), 'utf8');
const ejsProfileSource = await readFile(new URL('src/char_info_shared/characterVisualProfile.ts', repoRoot), 'utf8');
const creatorManagerSource = await readFile(new URL('src/char_info_creator_manager/App.vue', repoRoot), 'utf8');
const creatorManagerControllerSource = await readFile(new URL('src/char_info_creator_manager/controller.ts', repoRoot), 'utf8');
const viewerRuntimeSource = await readFile(new URL('src/char_info_viewer_runtime/runtime.ts', repoRoot), 'utf8');
const previewBuilderSource = await readFile(new URL('docs/previews/char_info_ejs_builder.html', repoRoot), 'utf8');

test('手动 MVU 导入写回卡片所属消息楼层而不是 latest', () => {
  assert.match(
    appSource,
    /importToMvuVariables\([\s\S]{0,200}?message_id:\s*props\.messageId/,
  );
  assert.doesNotMatch(importServiceSource, /message_id:\s*'latest'/);
  assert.match(importServiceSource, /message_id:\s*number/);
});

test('Viewer 只读取 CharInfo 视觉资料，状态栏只接收单向相簿与头像投影', () => {
  assert.match(themeSource, /chatVariables\.char_info/);
  assert.match(themeSource, /charInfo\?\.profiles/);
  assert.doesNotMatch(themeSource, /externalGalleries/);
  assert.match(ejsProfileSource, /char_info\.profiles/);
  assert.match(ejsProfileSource, /status\.externalAvatars\.partners/);
  assert.doesNotMatch(ejsProfileSource, /setLocalVar\(`status\.externalGalleries/);
  assert.match(creatorManagerSource, /syncStatusGallerySnapshotToCurrentChat/);
  assert.match(previewBuilderSource, /char_info\.profiles/);
  assert.doesNotMatch(previewBuilderSource, /externalGalleries|char_info_visuals|dryRun|merge:/);
});

test('MVU 更新会刷新角色库与聊天视觉卡，资料始终重新读取最新作用域', () => {
  assert.match(
    viewerRuntimeSource,
    /Mvu\.events\.VARIABLE_UPDATE_ENDED,\s*\(variables, variablesBeforeUpdate\)\s*=>\s*\{[\s\S]*?void refreshLibrary\(collectChangedAffinityNames\(variables, variablesBeforeUpdate\)\)[\s\S]*?scheduleVisualCardRefresh\(\)/,
  );
  assert.match(viewerRuntimeSource, /Mvu\.getMvuData\(\{\s*type:\s*'message',\s*message_id:\s*'latest'\s*\}\)/);
  assert.doesNotMatch(
    viewerRuntimeSource,
    /Mvu\.events\.VARIABLE_UPDATE_ENDED,\s*variables\s*=>[\s\S]*?collectCurrentCharacterSnapshots\(variables\)/,
  );
  assert.match(viewerRuntimeSource, /applyLibrarySnapshot\(Mvu\.getMvuData\([\s\S]*?unreadNamesForRefresh\)/);
  assert.match(viewerRuntimeSource, /let libraryRefreshPromise: Promise<void> \| null = null;/);
  assert.match(
    viewerRuntimeSource,
    /while \(libraryRefreshPending \|\| pendingAffinityNames\.size > 0\)[\s\S]*?libraryRefreshPending = false;[\s\S]*?await waitGlobalInitialized\('Mvu'\)[\s\S]*?applyLibrarySnapshot\(/,
  );
  assert.match(
    viewerRuntimeSource,
    /libraryRefreshPending = true;\s*libraryRefreshPromise \?\?= runLibraryRefresh\(library\);\s*return libraryRefreshPromise;/,
  );
  assert.match(
    viewerRuntimeSource,
    /const openLibraryCharacter = async \(name: string\) => \{[\s\S]*?library\.viewerLoading = true;[\s\S]*?await refreshLibrary\(\);[\s\S]*?library\.characters\.some\(character => character\.name === name\)[\s\S]*?library\.viewerLoading = false;/,
  );
  assert.match(
    viewerRuntimeSource,
    /Mvu\.events\.VARIABLE_INITIALIZED,\s*\(\)\s*=>\s*\{[\s\S]*?void refreshLibrary\(\);[\s\S]*?scheduleVisualCardRefresh\(\)/,
  );
  assert.match(
    viewerRuntimeSource,
    /tavern_events\.GENERATION_ENDED,\s*messageId\s*=>\s*\{[\s\S]*?enqueueMessage\(messageId\);[\s\S]*?void refreshLibrary\(\);/,
  );
  assert.match(viewerRuntimeSource, /const scheduleVisualCardRefresh = \(\) => \{[\s\S]*?refreshMountedCharInfoCards\(\)/);
  assert.match(viewerRuntimeSource, /const refreshMountedCharInfoCards = \(\) => \{[\s\S]*?removeMessage\(messageId\)[\s\S]*?renderMessage\(messageId\)/);
  assert.match(viewerRuntimeSource, /if \(visualRefreshTimer\) clearTimeout\(visualRefreshTimer\)/);
  assert.match(viewerRuntimeSource, /const startRevision = \+\+lifecycleRevision/);
  assert.match(viewerRuntimeSource, /!started \|\| lifecycleRevision !== startRevision/);
  assert.match(viewerRuntimeSource, /started = false;\s*lifecycleRevision \+= 1/);
  assert.match(viewerRuntimeSource, /tavern_events\.CHAT_CHANGED[\s\S]*?closeCreatorEditor\(\)/);
  assert.match(creatorManagerControllerSource, /overlay\?\.destroy\(\);[\s\S]*?overlay = null/);
});

test('Creator 首屏优先打开 Viewer 指定的世界书与条目，所有世界书切换路径共用单次读取', () => {
  const selectWorldbookSource = creatorManagerSource.match(
    /function selectWorldbook\(worldbookName: string\) \{([\s\S]*?)\n\}/u,
  )?.[1];
  const loadWorldbooksSource = creatorManagerSource.match(
    /async function loadWorldbooks\(\) \{([\s\S]*?)\n\}\n\nasync function loadEntries/u,
  )?.[1];
  const selectedWorldbookWatcherSource = creatorManagerSource.match(
    /watch\(selectedWorldbookName, worldbookName => \{([\s\S]*?)\n\}\);\nwatch\(selectedEntryUid/u,
  )?.[1];

  assert.match(creatorManagerSource, /let selectedWorldbookEntriesLoad: Promise<void> = Promise\.resolve\(\);/u);
  assert.doesNotMatch(selectWorldbookSource ?? '', /loadEntries\(/u);
  assert.match(
    loadWorldbooksSource ?? '',
    /const requestedWorldbook = props\.initialWorldbookName\.trim\(\);[\s\S]*?const nextWorldbook = worldbooks\.value\.includes\(requestedWorldbook\)[\s\S]*?selectWorldbook\(nextWorldbook\);[\s\S]*?await nextTick\(\);[\s\S]*?await selectedWorldbookEntriesLoad;/u,
  );
  assert.match(
    loadWorldbooksSource ?? '',
    /props\.initialEntryUid !== undefined[\s\S]*?entries\.value\.find\(entry => entry\.uid === props\.initialEntryUid\)[\s\S]*?selectEntry\(requestedEntry\);/u,
  );
  assert.match(selectedWorldbookWatcherSource ?? '', /selectedWorldbookEntriesLoad = loadEntries\(worldbookName\);/u);
  assert.match(creatorManagerSource, /v-model="worldbookSearch"[\s\S]*?@click="selectWorldbook\(worldbook\)"/u);
});

test('快速切换世界书时只采纳最新条目请求，过期成功或失败不得覆盖结果或结束加载', () => {
  const loadEntriesSource = creatorManagerSource.match(
    /async function loadEntries\(worldbookName: string\) \{([\s\S]*?)\n\}\n\nasync function loadSelectedEntryProfile/u,
  )?.[1] ?? '';

  assert.match(creatorManagerSource, /let entriesLoadRevision = 0;/u);
  assert.match(loadEntriesSource, /const loadRevision = \+\+entriesLoadRevision;/u);
  assert.match(
    loadEntriesSource,
    /const loadedEntries = await getWorldbook\(worldbookName\);\s*if \(loadRevision !== entriesLoadRevision \|\| selectedWorldbookName\.value !== worldbookName\) return;\s*entries\.value = loadedEntries;/u,
  );
  assert.match(
    loadEntriesSource,
    /catch \(error\) \{\s*if \(loadRevision !== entriesLoadRevision \|\| selectedWorldbookName\.value !== worldbookName\) return;\s*entries\.value = \[\];/u,
  );
  assert.match(
    loadEntriesSource,
    /finally \{\s*if \(loadRevision === entriesLoadRevision\) loadingEntries\.value = false;/u,
  );
});

test('聊天 DOM 观察器使用 SillyTavern 宿主页的构造器，避免 iframe realm 失配', () => {
  assert.match(viewerRuntimeSource, /new window\.parent\.MutationObserver\(/);
  assert.doesNotMatch(viewerRuntimeSource, /new MutationObserver\(/);
});

test('聊天 DOM 观察器在无已挂载卡片时先于 mutations 遍历返回', () => {
  const observerCallback = viewerRuntimeSource.match(
    /mutationObserver = new window\.parent\.MutationObserver\(mutations => \{([\s\S]*?)\n {4}\}\);/u,
  )?.[1] ?? '';
  const earlyReturnIndex = observerCallback.indexOf('if (mountedMessages.size === 0) return;');
  const mutationTraversalIndex = observerCallback.indexOf('mutations.forEach');

  assert.ok(earlyReturnIndex >= 0);
  assert.ok(mutationTraversalIndex >= 0);
  assert.ok(earlyReturnIndex < mutationTraversalIndex);
});
