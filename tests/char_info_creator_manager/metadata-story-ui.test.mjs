import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');
const galleryStepSource = await readFile(
  new URL('../../src/char_info_creator_manager/components/GalleryStep.vue', import.meta.url),
  'utf8',
);

function sectionBetween(start, end) {
  const startIndex = appSource.indexOf(start);
  const endIndex = appSource.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `缺少起始标记：${start}`);
  assert.notEqual(endIndex, -1, `缺少结束标记：${end}`);
  return appSource.slice(startIndex, endIndex);
}

test('Creator Step 2 按角色资料、展示文案、角色故事、作者署名组织字段', () => {
  const stepTwo = sectionBetween('id="manager-step-2"', 'id="manager-step-3"');

  const basicInfoIndex = stepTwo.indexOf('<h3>基本资料</h3>');
  const presentationIndex = stepTwo.indexOf('<h3>角色展示文案</h3>');
  const storyIndex = stepTwo.indexOf('<h3>角色故事</h3>');
  const authorInfoIndex = stepTwo.indexOf('<h3>作者署名</h3>');
  assert.ok(basicInfoIndex >= 0 && basicInfoIndex < presentationIndex);
  assert.ok(presentationIndex < storyIndex);
  assert.ok(storyIndex < authorInfoIndex);

  assert.match(stepTwo, /v-model="profile\.characterName"/u);
  assert.match(stepTwo, /v-model="profile\.metadata\.sex"/u);
  assert.match(stepTwo, /v-model="profile\.metadata\.race"/u);
  assert.match(stepTwo, /v-model="profile\.metadata\.author"/u);
  assert.match(stepTwo, /v-model="profile\.metadata\.version"/u);
  assert.match(stepTwo, /v-model="profile\.metadata\.authorNote"/u);
  assert.doesNotMatch(stepTwo, /v-model="profile\.avatarUrl"/u, '头像应与相册放在同一步，而不是基本资料');
  assert.match(stepTwo, /v-for="\(section, index\) in profile\.metadata\.storySections"/u);
  assert.match(stepTwo, /:key="section\.id"/u);
  assert.match(stepTwo, /@click="addStorySection"/u);
  assert.match(stepTwo, /@click="moveStorySection\(index, -1\)"/u);
  assert.match(stepTwo, /@click="moveStorySection\(index, 1\)"/u);
  assert.match(stepTwo, /@click="removeStorySection\(index\)"/u);
  assert.doesNotMatch(stepTwo, /背景故事/u, 'Creator authoring UI 不应暴露生成的背景故事字段');
  assert.doesNotMatch(stepTwo, /Viewer|story_sections|编辑器内部排序 ID/u, 'Creator 可见文案不应暴露实现术语');
});

test('Creator Step 4 由独立 GalleryStep 管理唯一用途、批量显示范围与用途标签', () => {
  const stepFour = sectionBetween('id="manager-step-4"', 'id="manager-step-5"');

  assert.match(stepFour, /<h2>相册与头像<\/h2>/u);
  assert.match(stepFour, /<GalleryStep/u);
  assert.match(stepFour, /:avatar-url="profile\.avatarUrl"/u);
  assert.match(stepFour, /:cover-url="profile\.coverUrl"/u);
  assert.match(galleryStepSource, /<span class="field-label">主立绘<\/span>/u);
  assert.match(galleryStepSource, /<span class="field-label">状态栏头像<\/span>/u);
  assert.match(galleryStepSource, /<span class="field-label">角色库封面<\/span>/u);
  assert.match(galleryStepSource, /Viewer \+ 相册/u);
  assert.match(galleryStepSource, /仅相册/u);
  assert.match(galleryStepSource, /class="usage-pill/u);
  assert.match(galleryStepSource, /批量选择/u);
});

test('Creator 编辑态 story id 不会进入序列化 metadata', () => {
  const serializer = sectionBetween('function toSerializableMetadata()', 'function toFullSerializableProfile()');

  assert.match(serializer, /storySections\.map\(\(\{ title, content \}\) => \(\{ title, content \}\)\)/u);
  assert.match(serializer, /version:\s*profile\.metadata\.version/u);
  assert.match(serializer, /author_note:\s*profile\.metadata\.authorNote/u);
  assert.match(serializer, /story_sections:\s*storySections/u);
  assert.doesNotMatch(serializer, /\bid\b/u);
  assert.match(appSource, /profile\.metadata\.storySections\.splice\(0, profile\.metadata\.storySections\.length, \.\.\.editable\.metadata\.storySections\)/u);
});

test('Creator metadata/story UI 在 mobile 与 force-mobile 下保持单列和可触控操作', () => {
  assert.match(
    appSource,
    /@mixin mobile-manager-layout[\s\S]*?\.metadata-field-grid,[\s\S]*?grid-template-columns:\s*1fr;/u,
  );
  assert.match(
    galleryStepSource,
    /@media \(max-width: 900px\)[\s\S]*?\.role-grid,[\s\S]*?grid-template-columns:\s*1fr;/u,
  );
  assert.match(
    appSource,
    /@mixin mobile-manager-layout[\s\S]*?\.story-editor-heading\s*\{[\s\S]*?flex-direction:\s*column;/u,
  );
  assert.match(
    appSource,
    /@mixin mobile-manager-layout[\s\S]*?\.story-section-actions button\s*\{[\s\S]*?min-height:\s*40px;/u,
  );
  assert.match(appSource, /\.manager-root\.force-mobile-layout\s*\{[\s\S]*?@include mobile-manager-layout\('&'\);/u);
});
