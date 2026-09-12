import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeRootSource = readFileSync(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const overlaySource = readFileSync(new URL('../../src/char_info_profile_editor/overlay.ts', import.meta.url), 'utf8');
const profileEditorSource = readFileSync(new URL('../../src/char_info_profile_editor/App.vue', import.meta.url), 'utf8');

test('两个角色资料库入口都进入同一个角色档案编辑器模式选择页', () => {
  assert.match(runtimeRootSource, /selectedCharacter\.hasProfileRecord \? '编辑档案' : '添加档案'/u);
  assert.match(runtimeRootSource, /props\.onEditCurrentChatCharacterProfile\(selectedCharacter\.name\)/u);
  assert.match(runtimeSource, /editWorldbookCharacter[\s\S]*?openProfileEditor\(\{[\s\S]*?worldbookName,[\s\S]*?entryUid,/u);
  assert.match(runtimeSource, /editCurrentChatCharacterProfile[\s\S]*?openProfileEditor\(\{[\s\S]*?initialCharacterName: name/u);
  assert.match(overlaySource, /initialCharacterName: options\.initialCharacterName/u);
  assert.match(profileEditorSource, /const editorMode = ref<EditorMode \| null>\(null\)/u);
  assert.match(profileEditorSource, /const modeSelection = computed\(\(\) => editorMode\.value === null\)/u);
  assert.match(profileEditorSource, /要怎样建立这个角色档案？/u);
  assert.match(profileEditorSource, /@click="selectEditorMode\('flash'\)"/u);
  assert.match(profileEditorSource, /@click="selectEditorMode\('pro'\)"/u);
});

test('快速模式只要求角色全名和一个图片 URL', () => {
  assert.match(profileEditorSource, /v-else-if="flashMode" class="flash-mode-editor"/u);
  assert.match(profileEditorSource, /<span>角色全名<\/span>[\s\S]*?v-model="profile\.characterName"/u);
  assert.match(profileEditorSource, /<span>图片 URL<\/span>[\s\S]*?:value="primaryFlashImageUrl"/u);
  assert.match(profileEditorSource, /@input="updatePrimaryFlashImageUrl\(\(\$event\.target as HTMLInputElement\)\.value\)"/u);
  assert.match(profileEditorSource, /function updatePrimaryFlashImageUrl\(value: string\)/u);
  assert.doesNotMatch(profileEditorSource, /添加另一张图片/u);
  assert.doesNotMatch(profileEditorSource, /function addFlashImage\(/u);
  assert.doesNotMatch(profileEditorSource, /function removeFlashImage\(/u);
});

test('快速模式按来源写回正确世界书，专业模式继续使用完整 EJS 写入流程', () => {
  assert.match(profileEditorSource, /if \(hasInitialWorldbookTarget\.value\)[\s\S]*?updateWorldbookWith\([\s\S]*?upsertManagedEjsBlockWithLegacyMigration/u);
  assert.match(profileEditorSource, /saveFlashProfileToCurrentChatWorldbook\(normalizedProfile\)/u);
  assert.match(profileEditorSource, /const applied = await applyCurrentProfileToCurrentChat\(\)/u);
  assert.match(profileEditorSource, /async function selectEditorMode\(mode: EditorMode\)[\s\S]*?if \(mode === 'flash'\)[\s\S]*?initializeFlashMode/u);
  assert.match(profileEditorSource, /v-else-if="proMode" class="wizard-step-nav"/u);
  assert.match(profileEditorSource, /<form v-if="proMode" v-show="activeStep !== 1"/u);
  assert.match(profileEditorSource, /async function saveToEntry\(\)[\s\S]*?upsertManagedEjsBlockWithLegacyMigration/u);
});

test('新入口保持移动安全区，并用双色票券卡区分快速与专业模式', () => {
  assert.match(profileEditorSource, /--ci-mobile-safe-top: max\(env\(safe-area-inset-top, 0px\), 28px\);/u);
  assert.match(profileEditorSource, /--ci-mobile-safe-bottom: max\(env\(safe-area-inset-bottom, 0px\), 18px\);/u);
  assert.match(profileEditorSource, /\.mode-choice-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/u);
  assert.match(profileEditorSource, /class="mode-choice-ticket-label">FLASH<\/span>/u);
  assert.match(profileEditorSource, /class="mode-choice-ticket-label">PRO<\/span>/u);
  assert.match(profileEditorSource, /\.mode-choice-card\.flash\s*\{[\s\S]*?--mode-accent-rgb: 225 173 93;/u);
  assert.match(profileEditorSource, /\.mode-choice-card\.pro\s*\{[\s\S]*?--mode-accent-rgb: 143 169 237;/u);
  assert.match(profileEditorSource, /\.mode-choice-stub::before,[\s\S]*?\.mode-choice-stub::after/u);
  assert.match(profileEditorSource, /@mixin mobile-manager-layout[\s\S]*?\.mode-choice-grid \{[\s\S]*?grid-template-columns: 1fr;[\s\S]*?\.mode-choice-card \{[\s\S]*?grid-template-columns: 72px minmax\(0, 1fr\);/u);
  assert.match(profileEditorSource, /@mixin mobile-manager-layout[\s\S]*?\.return-library-button \{[\s\S]*?width: 42px;/u);
  assert.match(profileEditorSource, /\.dialog-header h1 \{[\s\S]*?white-space: nowrap;/u);
  assert.match(profileEditorSource, /function scheduleFlashReturn\(\)[\s\S]*?props\.onReturnToLibrary\(\)[\s\S]*?700\);/u);
});
