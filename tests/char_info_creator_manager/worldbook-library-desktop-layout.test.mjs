import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

test('桌面打开角色详情时世界书角色库不会变成 390px 移动侧栏', () => {
  assert.doesNotMatch(
    appSource,
    /(?:^|\n)\.manager-dialog\.library-dialog\s*\{\s*width: min\(390px, calc\(100% - 16px\)\);/u,
  );
  assert.doesNotMatch(appSource, /library-detail-open/u);
});

test('角色详情使用独立覆盖层，关闭后仍返回原尺寸角色库', () => {
  assert.match(appSource, /v-if="detailCharacter"\s+class="character-detail-layer"/u);
  assert.match(appSource, /@click\.self="closeCharacterDetails"/u);
  assert.doesNotMatch(appSource, /detailCharacter[^\n]*manager-dialog/u);
});

test('桌面角色库将工具组固定在右上角，并在内容滚动时保留筛选工具栏', () => {
  assert.match(appSource, /\.library-header \.header-actions\s*\{\s*grid-column: 3;\s*grid-row: 1;/u);
  assert.match(appSource, /\.library-header \.character-source-switch\s*\{\s*grid-column: 1 \/ -1;\s*grid-row: 2;/u);
  assert.match(appSource, /\.character-library-toolbar\s*\{[\s\S]*?position: sticky;[\s\S]*?top: 0;/u);
});

test('手机角色库将操作移至安全区外的五键底栏', () => {
  assert.match(appSource, /v-if="!detailCharacter" class="mobile-library-dock" aria-label="角色库操作"/u);
  assert.match(appSource, /aria-label="搜索角色" @click="focusCharacterSearch"/u);
  assert.match(appSource, /aria-label="返回游戏" @click="emit\('close'\)"/u);
  assert.match(appSource, /@click="toggleCharacterLibraryLayout"/u);
  assert.match(appSource, /class="mobile-library-more-menu" role="menu"/u);
  assert.match(appSource, /@click="refreshCharacterLibrary"/u);
  assert.match(appSource, /@click="openCharacterVisualEditor"/u);
  assert.match(appSource, /\.mobile-library-dock\s*\{[\s\S]*?position: fixed;[\s\S]*?env\(safe-area-inset-bottom\)/u);
  assert.match(appSource, /#\{\$root\}\.library-mode\s*\{[\s\S]*?height: 100dvh;/u);
  assert.match(appSource, /\.manager-root\.force-mobile-layout\s*\{\s*@include mobile-manager-layout\('&'\);/u);
});

test('手机角色库保留来源、世界书与同一套筛选状态', () => {
  assert.match(appSource, /class="mobile-library-context"/u);
  assert.match(appSource, /class="mobile-library-worldbook"/u);
  assert.match(appSource, /v-model="selectedWorldbookName"/u);
  assert.match(appSource, /class="mobile-library-filter-panel"/u);
  assert.match(appSource, /mobileCharacterLibraryFilterOpen/u);
  assert.match(appSource, /@click="setMobileCharacterLibraryFilter\(option\.value\)"/u);
  assert.match(appSource, /v-model="characterRaceFilter"/u);
  assert.match(appSource, /function focusCharacterSearch\(\)[\s\S]*?characterSearchInput\.value\?\.focus\(\)/u);
});

test('手机角色库缩短列表卡片，避免工具栏挤掉可阅读的角色数量', () => {
  assert.match(
    appSource,
    /\.character-library-card\s*\{\s*min-height: 82px;\s*padding: 8px;\s*grid-template-columns: 58px minmax\(0, 1fr\) auto;/u,
  );
  assert.match(appSource, /\.character-cover-button\s*\{\s*width: 58px;\s*height: 64px;/u);
});
