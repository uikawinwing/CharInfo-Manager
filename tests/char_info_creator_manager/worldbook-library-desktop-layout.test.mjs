import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const librarySource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
  'utf8',
);

test('玩家角色库与角色详情都由 Viewer 提供，详情关闭后仍返回角色库', () => {
  assert.match(librarySource, /v-if="detailCharacter"[\s\S]*?class="character-detail-layer"/u);
  assert.match(librarySource, /@click="closeDetails">返回角色库/u);
  assert.match(librarySource, /<h3[^>]*>角色图库<\/h3>/u);
  assert.match(librarySource, /emit\('edit', selectedWorldbookName, detailCharacter\.entry\.uid\)/u);
});

test('桌面角色库保留来源、世界书、搜索、筛选与显示方式', () => {
  assert.match(librarySource, /\.manager-root \{[\s\S]*?pointer-events: auto;/u);
  assert.match(librarySource, /class="character-source-switch"/u);
  assert.match(librarySource, /v-model="selectedWorldbookName"/u);
  assert.match(librarySource, /v-model="searchText"/u);
  assert.match(librarySource, /class="character-library-filter-buttons"/u);
  assert.match(librarySource, /class="character-library-layout-switch"/u);
  assert.match(librarySource, /\.character-library-toolbar \{ position: sticky;/u);
});

test('玩家可以在角色库中启用或禁用世界书角色条目', () => {
  assert.match(librarySource, /@click="toggleCharacter\(character\)"/u);
  assert.match(librarySource, /setCharacterEntryEnabled/u);
  assert.match(librarySource, /character\.entry\.enabled \? '已启用' : '已禁用'/u);
});

test('手机角色库使用固定宿主坐标系、安全区底栏，并保留来源、世界书、搜索与筛选入口', () => {
  assert.match(librarySource, /\.manager-root \{[^}]*position: absolute;[^}]*inset: 0;/u);
  assert.doesNotMatch(librarySource, /\.manager-root \{[^}]*position: fixed;/u);
  assert.match(librarySource, /@media \(max-width: 720px\)/u);
  assert.match(librarySource, /\.manager-dialog, \.force-mobile-layout \.manager-dialog \{ width: 100%; min-width: 0; max-width: none;[^}]*box-sizing: border-box;/u);
  assert.match(librarySource, /\.library-header, \.force-mobile-layout \.library-header \{ display: block; width: 100%; min-width: 0;/u);
  assert.match(librarySource, /\.mobile-library-worldbook select \{ width: 100%; min-width: 0; max-width: 100%;/u);
  assert.match(librarySource, /class="mobile-library-dock" aria-label="角色库操作"/u);
  assert.match(librarySource, /aria-label="搜索角色" @click="focusSearch"/u);
  assert.match(librarySource, /aria-label="筛选角色"[\s\S]*?<span>筛选<\/span>/u);
  assert.match(librarySource, /aria-label="返回游戏"[^>]*@click="emit\('close'\)"/u);
  assert.match(librarySource, /mobileMoreOpen = false; emit\('editLibrary', selectedWorldbookName\)[\s\S]*?视觉编辑/u);
  assert.match(librarySource, /@click="loadWorldbooks">重新读取角色库/u);
  assert.match(librarySource, /\.mobile-library-dock \{ position: fixed;[\s\S]*?env\(safe-area-inset-bottom\)/u);
  assert.match(librarySource, /\.manager-dialog, \.force-mobile-layout \.manager-dialog \{[^}]*height: 100dvh;/u);
  assert.match(librarySource, /\.force-mobile-layout \.manager-dialog \{ width: 100%; min-width: 0; max-width: none; height: 100dvh;[^}]*box-sizing: border-box;/u);
});

test('手机角色详情将图库和只读条目内容改为单列', () => {
  assert.match(librarySource, /\.character-detail-dialog \{ width: 100%; height: 100%; min-width: 0; min-height: 0; max-width: none; max-height: none; box-sizing: border-box;/u);
  assert.match(librarySource, /\.character-detail-body \{ display: block; overflow-y: auto; \}/u);
  assert.match(librarySource, /class="character-detail-content"/u);
  assert.match(librarySource, /角色条目内容/u);
  assert.match(librarySource, /只读/u);
});
