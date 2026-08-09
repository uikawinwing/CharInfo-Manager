import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  defaultRuntimeSettings,
  mergeRuntimeSettings,
  normalizeRuntimeSettings,
  readRuntimeSettings,
} from '../../src/char_info_viewer_runtime/runtimeSettings.ts';

const runtimeRootSource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url),
  'utf8',
);
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const managerOverlaySource = readFileSync(
  new URL('../../src/char_info_creator_manager/overlay.ts', import.meta.url),
  'utf8',
);
const managerAppSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

test('强制移动布局默认关闭，非法值安全归一化为关闭', () => {
  assert.equal(defaultRuntimeSettings().forceMobileLayout, false);
  assert.equal(normalizeRuntimeSettings({ forceMobileLayout: 'true' }).forceMobileLayout, false);
});

test('强制移动布局随运行时设置持久化', () => {
  const merged = mergeRuntimeSettings(
    { char_info_runtime: { cacheVersion: 3 } },
    { activeFloorLimit: 6, effectsEnabled: true, forceMobileLayout: true },
  );

  assert.equal(readRuntimeSettings(merged).forceMobileLayout, true);
  assert.equal(merged.char_info_runtime.cacheVersion, 3);
  assert.match(runtimeSource, /state\.settings\.forceMobileLayout\s*=\s*nextSettings\.forceMobileLayout/u);
});

test('设置开关和角色库强制移动布局沿用 720px 布局契约', () => {
  assert.match(runtimeRootSource, /强制使用移动布局/u);
  assert.match(runtimeRootSource, /v-model="forceMobileLayoutDraft"[\s\S]*?@change="applySettings"/u);
  assert.match(
    runtimeRootSource,
    /class="char-info-library-list-dialog"[\s\S]*?'force-mobile-layout': state\.settings\.forceMobileLayout/u,
  );
  assert.match(
    runtimeRootSource,
    /class="char-info-library-overlay"[\s\S]*?'force-mobile-layout': state\.settings\.forceMobileLayout/u,
  );
  assert.match(
    runtimeRootSource,
    /<h2>角色资料库<\/h2>[\s\S]*?当前聊天角色 · 筛选：\{\{\s*activeFilterLabel\s*\}\} · \{\{\s*filteredCharacters\.length\s*\}\}\/\{\{\s*libraryCharacterCount\s*\}\}\s*位角色/u,
  );
  assert.match(
    runtimeRootSource,
    /class="char-info-library-mobile-dock"[\s\S]*?搜索[\s\S]*?筛选[\s\S]*?返回游戏[\s\S]*?刷新[\s\S]*?设置/u,
  );
  assert.match(
    runtimeRootSource,
    /ref="searchInputRef"[\s\S]*?function focusLibrarySearch\(\): void \{[\s\S]*?searchInputRef\.value\?\.focus\(\)/u,
  );
  assert.match(
    runtimeRootSource,
    /function toggleMobileFilters\(\): void \{[\s\S]*?mobileFiltersExpanded\.value = !mobileFiltersExpanded\.value/u,
  );
  assert.match(
    runtimeRootSource,
    /@media \(max-width: 720px\) \{[\s\S]*?safe-area-inset-top[\s\S]*?safe-area-inset-bottom/u,
  );
  assert.match(
    runtimeRootSource,
    /\.char-info-library-list-dialog\.force-mobile-layout \{[\s\S]*?inset: 0 !important;[\s\S]*?max-height: none;[\s\S]*?transform: none !important;/u,
  );
  assert.match(
    runtimeRootSource,
    /\.char-info-library-list-dialog\.force-mobile-layout \.char-info-library-mobile-dock \{[\s\S]*?display: grid;[\s\S]*?safe-area-inset-bottom/u,
  );
  assert.doesNotMatch(runtimeRootSource, /768\s*[×x]\s*1388/u);
});

test('强制移动布局同步到独立 iframe 中的世界书角色库', () => {
  assert.match(runtimeSource, /forceMobileLayout: state\.settings\.forceMobileLayout/u);
  assert.match(
    runtimeSource,
    /state\.settings\.forceMobileLayout\s*=\s*nextSettings\.forceMobileLayout;[\s\S]*?worldbookManager\.setForceMobileLayout\(nextSettings\.forceMobileLayout\)/u,
  );
  assert.match(managerOverlaySource, /setForceMobileLayout\(value: boolean\): void;/u);
  assert.match(
    managerOverlaySource,
    /managerRootElement\?\.classList\.toggle\('force-mobile-layout', forceMobileLayout\)/u,
  );
  assert.match(managerOverlaySource, /managerRootElement\?\.classList\.toggle\('force-mobile-layout', value\)/u);
  assert.match(managerAppSource, /@mixin mobile-manager-layout\(\$root: '\.manager-root'\)/u);
  assert.match(managerAppSource, /\.manager-root\.force-mobile-layout\s*\{\s*@include mobile-manager-layout\('&'\);/u);
  assert.doesNotMatch(managerAppSource, /768\s*[×x]\s*1388/u);
});
