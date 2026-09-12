import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeRootSource = readFileSync(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const overlaySource = readFileSync(new URL('../../src/char_info_profile_editor/overlay.ts', import.meta.url), 'utf8');
const profileEditorSource = readFileSync(new URL('../../src/char_info_profile_editor/App.vue', import.meta.url), 'utf8');

test('当前聊天角色详情直接提供添加或编辑档案入口', () => {
  assert.match(runtimeRootSource, /selectedCharacter\.hasProfileRecord \? '编辑档案' : '添加档案'/u);
  assert.match(runtimeRootSource, /props\.onEditCurrentChatCharacterProfile\(selectedCharacter\.name\)/u);
  assert.match(runtimeSource, /flashCharacterName: name/u);
  assert.match(overlaySource, /flashCharacterName: options\.flashCharacterName/u);
});

test('Flash Mode 只展示图片编辑并用一个保存并应用动作完成世界书与当前聊天同步', () => {
  assert.match(profileEditorSource, /const flashMode = computed\(\(\) => !!props\.flashCharacterName\.trim\(\)\)/u);
  assert.match(profileEditorSource, /flashProfileExists\.value = !!existingProfile/u);
  assert.match(profileEditorSource, /flashMode\.value \|\| !!selectedEntry\.value/u);
  assert.match(profileEditorSource, /v-if="flashMode" class="flash-mode-editor"/u);
  assert.match(profileEditorSource, /角色设定继续读取当前聊天变量；这里只保存立绘、头像与相册到当前聊天世界书/u);
  assert.match(profileEditorSource, /class="flash-mode-url-field"[\s\S]*?type="url"[\s\S]*?placeholder="https:\/\/…\/portrait\.webp"/u);
  assert.match(profileEditorSource, /@input="updateFlashImageUrl\(image, \(\$event\.target as HTMLInputElement\)\.value\)"/u);
  assert.match(profileEditorSource, /function ensureFlashRows\(\)[\s\S]*?sources: \[''\]/u);
  assert.match(profileEditorSource, /function addFlashImage\(\)/u);
  assert.match(profileEditorSource, /function removeFlashImage\(index: number\)/u);
  assert.match(profileEditorSource, /\.dialog-body\.flash-mode\s*\{[\s\S]*?display: flex;[\s\S]*?overflow: hidden;/u);
  assert.match(profileEditorSource, /\.flash-mode-gallery\s*\{[\s\S]*?overflow-y: auto;[\s\S]*?flex: 1 1 auto;/u);
  assert.match(profileEditorSource, /saveFlashProfileToCurrentChatWorldbook\(normalizedProfile\)/u);
  assert.match(profileEditorSource, /const applied = await applyCurrentProfileToCurrentChat\(\)/u);
  assert.match(profileEditorSource, /<h1 id="manager-title">角色档案编辑器<\/h1>/u);
  assert.match(profileEditorSource, /flashMode \? '快速模式'/u);
  assert.match(profileEditorSource, /专业模式 · \$\{activeStep\}\/\$\{steps\.length\}/u);
  assert.match(profileEditorSource, /'save-success': flashSaveCelebrating/u);
  assert.match(profileEditorSource, /flashSaveCelebrating\s*\? '✓ 已保存'/u);
  assert.match(profileEditorSource, /flashProfileExists[\s\S]*?\? '保存并应用'[\s\S]*?: '添加并应用'/u);
  assert.match(profileEditorSource, /function scheduleFlashReturn\(\)[\s\S]*?window\.setTimeout\([\s\S]*?props\.onReturnToCurrentLibrary\(\)[\s\S]*?700\);/u);
  assert.match(profileEditorSource, /saveMessage\.value = `✓ 已\$\{result\.created \? '添加' : '更新'\}[\s\S]*?scheduleFlashReturn\(\);/u);
  assert.match(profileEditorSource, /\.flash-save-button\.save-success[\s\S]*?background: var\(--success\);[\s\S]*?animation: flash-save-success-pop/u);
});
