import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../../src/char_info_creator_manager/index.ts', import.meta.url), 'utf8');
const overlaySource = readFileSync(new URL('../../src/char_info_creator_manager/overlay.ts', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const runtimeRootSource = readFileSync(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8');

test('世界书角色库只从当前角色悬浮面板进入，并由运行时独占管理器', () => {
  assert.match(indexSource, /'世界书角色库', '角色视觉编辑器', '角色视觉编辑', '角色资料库', 'CharInfo 设置'/);
  assert.doesNotMatch(indexSource, /createCreatorManagerOverlay/);
  assert.doesNotMatch(indexSource, /appendInexistentScriptButtons/);
  assert.match(runtimeSource, /const RUNTIME_MANAGER_OWNER_KEY = '__charInfoWorldbookManagerOwner'/);
  assert.match(runtimeSource, /setManagerOwnership\('runtime'\)/);
  assert.match(runtimeSource, /setManagerOwnership\(null\)/);
  assert.match(runtimeSource, /import \{ createCreatorManagerOverlay \} from '\.\.\/char_info_creator_manager\/overlay';/);
  assert.doesNotMatch(runtimeSource, /import\('\.\.\/char_info_creator_manager\/overlay'\)/);
  assert.doesNotMatch(runtimeSource, /appendInexistentScriptButtons/);
  assert.match(runtimeRootSource, /aria-label="打开世界书角色库"[\s\S]*?@click="props\.onOpenWorldbookLibrary"/);
  assert.match(overlaySource, /initialView/);
  assert.match(appSource, /class="manager-view-switch"/);
  assert.match(appSource, /@click="switchManagerView\('library'\)"/);
  assert.match(appSource, /@click="switchManagerView\('editor'\)"/);
});

test('编辑器五步表单中不再夹入角色封面库', () => {
  const stepOneStart = appSource.indexOf('id="manager-step-1"');
  const editorFormStart = appSource.indexOf('<form', stepOneStart);
  const stepOneSource = appSource.slice(stepOneStart, editorFormStart);

  assert.ok(stepOneStart >= 0 && editorFormStart > stepOneStart);
  assert.doesNotMatch(stepOneSource, /class="character-library"/);
});

test('世界书角色库在独立页面提供搜索、筛选、启停与查看详情', () => {
  const libraryPageStart = appSource.indexOf('class="library-page"');
  const libraryPageEnd = appSource.indexOf('</section>', libraryPageStart);
  const libraryPageSource = appSource.slice(libraryPageStart, libraryPageEnd);

  assert.ok(libraryPageStart >= 0 && libraryPageEnd > libraryPageStart);
  assert.match(libraryPageSource, /搜索角色、条目名或种族/);
  assert.match(libraryPageSource, /character-library-filter-buttons/);
  assert.match(libraryPageSource, /toggleCharacterEntry/);
  assert.match(libraryPageSource, /openCharacterDetails/);
});

test('世界书角色库采用参考图的三段式桌面工具栏与四列紧凑卡片', () => {
  assert.match(appSource, /class="dialog-header"\s*:class="\{ 'library-header': viewMode === 'library' \}"/);
  assert.match(appSource, /class="library-header-worldbook"/);
  assert.match(appSource, /class="library-search-field"/);
  assert.match(appSource, /class="character-library-control-row"/);
  assert.match(appSource, /找到 \{\{ visibleCharacterEntries\.length \}\} 个角色/);
  assert.match(appSource, /class="character-cover-silhouette"/);
  assert.match(appSource, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
});

test('管理器弹窗固定在手机可视视口，不混入页面滚动坐标', () => {
  assert.match(overlaySource, /position:\s*'fixed'/);
  assert.doesNotMatch(overlaySource, /hostWindow\.scroll[XY]/);
});
