import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../../src/char_info_creator_manager/index.ts', import.meta.url), 'utf8');
const overlaySource = readFileSync(new URL('../../src/char_info_creator_manager/overlay.ts', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');

test('世界书角色库与视觉编辑器共用一个 QR 入口和同一管理器', () => {
  assert.match(indexSource, /世界书角色库/);
  assert.match(indexSource, /const manager = createCreatorManagerOverlay\('library'\)/);
  assert.match(indexSource, /'角色视觉编辑器', '角色视觉编辑', '角色资料库', 'CharInfo 设置'/);
  assert.match(indexSource, /const RUNTIME_MANAGER_OWNER_KEY = '__charInfoWorldbookManagerOwner'/);
  assert.match(indexSource, /if \(isOwnedByRuntime\(\)\) return;/);
  assert.doesNotMatch(indexSource, /createCreatorManagerOverlay\('editor'\)/);
  assert.match(overlaySource, /initialView/);
  assert.match(runtimeSource, /const RUNTIME_MANAGER_OWNER_KEY = '__charInfoWorldbookManagerOwner'/);
  assert.match(runtimeSource, /setManagerOwnership\('runtime'\)/);
  assert.match(runtimeSource, /setManagerOwnership\(null\)/);
  assert.match(runtimeSource, /import\('\.\.\/char_info_creator_manager\/overlay'\)/);
  assert.doesNotMatch(runtimeSource, /createCreatorManagerOverlay\('editor'\)/);
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
  assert.match(libraryPageSource, /搜索角色姓名、条目名或种族/);
  assert.match(libraryPageSource, /character-library-filter-buttons/);
  assert.match(libraryPageSource, /toggleCharacterEntry/);
  assert.match(libraryPageSource, /openCharacterDetails/);
});

test('管理器弹窗固定在手机可视视口，不混入页面滚动坐标', () => {
  assert.match(overlaySource, /position:\s*'fixed'/);
  assert.doesNotMatch(overlaySource, /hostWindow\.scroll[XY]/);
});
