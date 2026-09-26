import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const diagnostics = await readFile(
  new URL('../../src/char_info_viewer_runtime/diagnostics.ts', import.meta.url),
  'utf8',
);
const runtimeRoot = await readFile(
  new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url),
  'utf8',
);
const runtime = await readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const editor = await readFile(new URL('../../src/char_info_profile_editor/App.vue', import.meta.url), 'utf8');
const galleryStep = await readFile(
  new URL('../../src/char_info_profile_editor/components/GalleryStep.vue', import.meta.url),
  'utf8',
);

test('故障诊断复用 Viewer 当前消息投影、YAML 与视觉解析链', () => {
  assert.match(diagnostics, /projectCharInfoMessage/u);
  assert.match(diagnostics, /parseCharacterYaml/u);
  assert.match(diagnostics, /resolveCharacterVisualConfigWithExtensions/u);
  assert.match(diagnostics, /isSpecialNpcVisualData/u);
  assert.match(diagnostics, /resolveRemoteGalleryPresentation/u);
});

test('Q1 诊断覆盖 think、gametxt、闭合标签、楼层上限与 mount failure', () => {
  assert.match(diagnostics, /THINK_OPEN_PATTERN/u);
  assert.match(diagnostics, /GAMETXT_OPEN_PATTERN/u);
  assert.match(diagnostics, /CharInfo 没有完整闭合/u);
  assert.match(diagnostics, /单楼层 CharInfo 数量超过设置上限/u);
  assert.match(diagnostics, /CharInfo 不在游戏正文范围内/u);
  assert.match(diagnostics, /CharInfo 已识别，但 Viewer 没有挂载/u);
  assert.match(runtime, /mountDiagnostics/u);
});

test('Q2-Q4 诊断使用精确角色档案路径、旧变量提示与实际媒体探测', () => {
  assert.match(diagnostics, /Object\.hasOwn\(profiles, name\)/u);
  assert.match(diagnostics, /char_info_visuals/u);
  assert.match(diagnostics, /char_info\.visual/u);
  assert.match(diagnostics, /char_info\.visuals/u);
  assert.match(diagnostics, /Viewer 使用角色全名精确匹配/u);
  assert.match(diagnostics, /图片来源实测/u);
  assert.match(diagnostics, /new Image\(\)/u);
  assert.match(diagnostics, /document\.createElement\('video'\)/u);
});

test('设置页提供只读故障诊断入口，不加入 Q5 缓存版本检查', () => {
  assert.match(runtimeRoot, /故障诊断/u);
  assert.match(runtimeRoot, /runCharInfoDiagnostics/u);
  assert.match(runtimeRoot, /只读检查，不会修改聊天变量或世界书/u);
  assert.doesNotMatch(runtimeRoot, /缓存版本诊断|检查更新缓存/u);
});

test('Q6/Q7 在角色档案编辑器提供就地信息气泡', () => {
  assert.match(editor, /aria-label="作者资料说明"/u);
  assert.match(editor, /作者、版本和作者说明都可选，不影响角色卡显示/u);
  assert.match(editor, /aria-label="角色条目搜索说明"/u);
  assert.match(editor, /这里会搜索所选世界书的全部条目/u);
  assert.match(editor, /角色资料库只收录带角色标签的条目/u);
});

test('移动端信息气泡固定在视口内并允许长内容滚动', () => {
  assert.match(editor, /\.info-bubble-panel \{[\s\S]*position: fixed;[\s\S]*right: calc\(16px \+ var\(--ci-mobile-safe-right\)\);[\s\S]*left: calc\(16px \+ var\(--ci-mobile-safe-left\)\);/u);
  assert.match(editor, /max-height: min\(60dvh, 420px\);/u);
  assert.match(editor, /overflow-y: auto;/u);
  assert.match(editor, /touch-action: pan-y;/u);
});

test('移动端上一步保持单行且角色姓名必填标记紧贴标签', () => {
  assert.match(editor, /field-label-main">角色姓名 <b>\*<\/b><\/span>/u);
  assert.match(editor, /\.wizard-step-actions \{[\s\S]*grid-template-columns: minmax\(104px, auto\) minmax\(0, 1fr\);/u);
  assert.match(editor, /\.wizard-step-actions \.wizard-back-button \{[\s\S]*white-space: nowrap;[\s\S]*word-break: keep-all;/u);
  assert.match(editor, /class="secondary-button wizard-back-button"/u);
  assert.match(galleryStep, /class="secondary-button wizard-back-button"/u);
  assert.match(galleryStep, /\.step-actions \.wizard-back-button \{[\s\S]*white-space: nowrap;[\s\S]*word-break: keep-all;/u);
});
