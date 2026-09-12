import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeRootSource = readFileSync(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const overlaySource = readFileSync(new URL('../../src/char_info_creator_manager/overlay.ts', import.meta.url), 'utf8');
const creatorSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');
const gallerySource = readFileSync(new URL('../../src/char_info_creator_manager/components/GalleryStep.vue', import.meta.url), 'utf8');

test('当前聊天角色详情直接提供添加或编辑视觉入口', () => {
  assert.match(runtimeRootSource, /selectedCharacter\.hasVisualProfile \? '编辑视觉' : '添加视觉'/u);
  assert.match(runtimeRootSource, /props\.onEditCurrentChatCharacterVisual\(selectedCharacter\.name\)/u);
  assert.match(runtimeSource, /quickCharacterName: name/u);
  assert.match(overlaySource, /quickCharacterName: options\.quickCharacterName/u);
});

test('Quick Mode 只展示图片编辑并用一个保存并应用动作完成世界书与当前聊天同步', () => {
  assert.match(creatorSource, /const quickVisualMode = computed\(\(\) => !!props\.quickCharacterName\.trim\(\)\)/u);
  assert.match(creatorSource, /quickProfileExists\.value = !!existingProfile/u);
  assert.match(creatorSource, /quickVisualMode\.value \|\| !!selectedEntry\.value/u);
  assert.match(creatorSource, /v-if="quickVisualMode" class="quick-visual-editor"/u);
  assert.match(creatorSource, /角色设定继续读取当前聊天变量；这里只保存立绘、头像与相册到当前聊天世界书/u);
  assert.match(creatorSource, /<GalleryStep[\s\S]*?quick-mode/u);
  assert.match(creatorSource, /saveQuickVisualProfileToCurrentChatWorldbook\(normalizedProfile\)/u);
  assert.match(creatorSource, /const applied = await applyCurrentProfileToCurrentChat\(\)/u);
  assert.match(creatorSource, /quickProfileExists \? '保存并应用' : '添加并应用'/u);
  assert.match(gallerySource, /v-if="!props\.quickMode" class="role-panel"/u);
  assert.match(gallerySource, /v-if="!props\.quickMode" class="gallery-storage-panel"/u);
  assert.match(gallerySource, /v-if="!props\.quickMode" class="batch-toolbar"/u);
  assert.match(gallerySource, /props\.quickMode && url/u);
});
