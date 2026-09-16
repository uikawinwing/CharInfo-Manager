import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeRootSource = readFileSync(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const overlaySource = readFileSync(new URL('../../src/char_info_profile_editor/overlay.ts', import.meta.url), 'utf8');
const profileEditorSource = readFileSync(new URL('../../src/char_info_profile_editor/App.vue', import.meta.url), 'utf8');

test('两个角色资料库入口都进入同一个角色档案编辑器，并保留快速建立与完整编辑两条路径', () => {
  assert.match(runtimeRootSource, /selectedCharacter\.hasProfileRecord \? '编辑档案' : '添加档案'/u);
  assert.match(runtimeRootSource, /props\.onEditCurrentChatCharacterProfile\(selectedCharacter\.name\)/u);
  assert.match(runtimeSource, /editWorldbookCharacter[\s\S]*?openProfileEditor\(\{[\s\S]*?worldbookName,[\s\S]*?entryUid,/u);
  assert.match(runtimeSource, /editCurrentChatCharacterProfile[\s\S]*?openProfileEditor\(\{[\s\S]*?initialCharacterName: name/u);
  assert.match(overlaySource, /initialCharacterName: options\.initialCharacterName/u);
  assert.match(profileEditorSource, /const editorMode = ref<EditorMode \| null>\(null\)/u);
  assert.match(profileEditorSource, /<strong>快速建立<\/strong>/u);
  assert.match(profileEditorSource, /第一次使用推荐。只需要确认角色和一张图片/u);
  assert.match(profileEditorSource, /<strong>完整编辑<\/strong>/u);
  assert.match(profileEditorSource, /@click="selectEditorMode\('flash'\)"/u);
  assert.match(profileEditorSource, /@click="selectEditorMode\('pro'\)"/u);
});

test('快速建立是三步教学，只暴露角色来源、一张图片直链和最终确认', () => {
  assert.match(profileEditorSource, /1 · 角色/u);
  assert.match(profileEditorSource, /2 · 图片/u);
  assert.match(profileEditorSource, /3 · 完成/u);
  assert.match(profileEditorSource, /从世界书找/u);
  assert.match(profileEditorSource, /当前聊天/u);
  assert.match(profileEditorSource, /没有 \/ 我懒得找/u);
  assert.match(profileEditorSource, /什么是图片直链？/u);
  assert.match(profileEditorSource, /flashSource\.value === 'manual'\) loadProfileFromCurrentChat\(characterName\)/u);
  assert.match(profileEditorSource, /https:\/\/example\.com\/portrait\.png/u);
  assert.match(profileEditorSource, /图床的相册页 \/ 分享页/u);
  assert.match(profileEditorSource, /现有的作者资料、配色和其他图库内容都会保留/u);
  assert.match(profileEditorSource, /function continueFlashImage\(\)[\s\S]*?flashImageReady\.value/u);
  assert.doesNotMatch(profileEditorSource, /function addFlashImage\(/u);
});

test('已知世界书或当前聊天角色时快速建立跳过找角色步骤', () => {
  assert.match(
    profileEditorSource,
    /if \(hasInitialWorldbookTarget\.value\)[\s\S]*?flashSource\.value = 'worldbook'[\s\S]*?flashStep\.value = 2/u,
  );
  assert.match(
    profileEditorSource,
    /const characterName = props\.initialCharacterName\.trim\(\);[\s\S]*?flashSource\.value = 'current-chat'[\s\S]*?loadProfileFromCurrentChat\(characterName\)[\s\S]*?flashStep\.value = 2/u,
  );
});

test('快速建立和完整编辑都支持自动保存位置，并在持久化后立即应用当前聊天', () => {
  assert.match(profileEditorSource, /async function saveFlashProfile\(\)[\s\S]*?hasSelectedWorldbookTarget\.value/u);
  assert.match(profileEditorSource, /saveFlashProfileToCurrentChatWorldbook\(normalizedProfile\)/u);
  assert.match(profileEditorSource, /async function saveFlashProfile\(\)[\s\S]*?const applied = await applyCurrentProfileToCurrentChat\(\)/u);
  assert.match(profileEditorSource, /function useAutomaticProfileTarget\(\)[\s\S]*?proAutoTarget\.value = true/u);
  assert.match(profileEditorSource, /async function saveToEntry\(\)[\s\S]*?saveFlashProfileToCurrentChatWorldbook\(normalizedProfile\)/u);
  assert.match(profileEditorSource, /async function saveToEntry\(\)[\s\S]*?const applied = await applyCurrentProfileToCurrentChat\(\)/u);
  assert.match(profileEditorSource, /保存并立即生效/u);
  assert.match(profileEditorSource, /世界书中的保存内容不会丢失/u);
});

test('完整编辑 Step 1 可从当前聊天选角色或让系统自动建立保存位置', () => {
  assert.match(profileEditorSource, /从当前聊天选角色/u);
  assert.match(profileEditorSource, /没有 \/ 我懒得找 → 自动建立/u);
  assert.match(profileEditorSource, /collectEncounteredCharacters\(getVariables\(\{ type: 'chat' \}\)\)/u);
  assert.match(profileEditorSource, /function chooseCurrentChatCharacter\(character: EncounteredCharacterRecord\)/u);
  assert.match(profileEditorSource, /if \(source !== 'worldbook'\) \{[\s\S]*?selectedEntryUid\.value = null;[\s\S]*?selectedWorldbookName\.value = '';/u);
  assert.match(profileEditorSource, /function canVisitStep\(step: StepId\)[\s\S]*?step === 5[\s\S]*?hasValidProfileMedia\.value/u);
  assert.match(profileEditorSource, /profile\.gallery\.some\(image => image\.sources\.some\(source => isSupportedRemoteMediaUrl\(source\)\)\)/u);
  assert.match(profileEditorSource, /profile\.remoteGalleryUrl\?\.trim\(\) && isHttpsUrl\(profile\.remoteGalleryUrl\)/u);
  assert.match(profileEditorSource, /请先填写角色全名/u);
  assert.match(profileEditorSource, /请先添加至少一张有效图片/u);
});

test('入口和快速建立保持移动安全区，并用双色票券卡区分两种模式', () => {
  assert.match(profileEditorSource, /--ci-mobile-safe-top: max\(env\(safe-area-inset-top, 0px\), 28px\);/u);
  assert.match(profileEditorSource, /--ci-mobile-safe-bottom: max\(env\(safe-area-inset-bottom, 0px\), 18px\);/u);
  assert.match(profileEditorSource, /class="mode-choice-ticket-label">FLASH<\/span>/u);
  assert.match(profileEditorSource, /class="mode-choice-ticket-label">PRO<\/span>/u);
  assert.match(profileEditorSource, /\.mode-choice-card\.flash\s*\{[\s\S]*?--mode-accent-rgb: 225 173 93;/u);
  assert.match(profileEditorSource, /\.mode-choice-card\.pro\s*\{[\s\S]*?--mode-accent-rgb: 143 169 237;/u);
  assert.match(profileEditorSource, /@media \(max-width: 900px\)[\s\S]*?\.flash-source-grid,[\s\S]*?grid-template-columns: 1fr;/u);
  assert.match(profileEditorSource, /function scheduleFlashReturn\(\)[\s\S]*?props\.onReturnToLibrary\(\)[\s\S]*?700\);/u);
});
