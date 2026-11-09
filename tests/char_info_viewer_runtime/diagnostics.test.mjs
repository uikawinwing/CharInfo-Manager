import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { runCharInfoDiagnostics } = require('../../src/char_info_viewer_runtime/diagnostics.ts');
const card = '<char_info>\n姓名: 洛汐\n生命层级: 第一层级\n</char_info>';

function diagnose(text, options = {}) {
  return runCharInfoDiagnostics({
    messageId: 7,
    swipeId: 0,
    text,
    maxCards: 4,
    active: true,
    mounted: true,
    chatVariables: {},
    mountDiagnostics: [],
    ...options,
  });
}

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
  assert.match(runtime, /mountDiagnostics/u);
});

test('Q1 区分正文内未闭合的角色卡与正文外的完整角色卡', async () => {
  const incomplete = await diagnose('<gametxt>\n<char_info>\n姓名: 洛汐\n</gametxt>');
  const unbalanced = incomplete.checks.find(check => check.code === 'TAG_UNBALANCED');
  assert.equal(unbalanced?.status, 'fail');
  assert.equal(unbalanced.location, '原始消息第 2 行');

  for (const text of [
    `${card}\n<gametxt>码头上空无一人。</gametxt>`,
    `<gametxt>码头上空无一人。</gametxt>\n${card}`,
  ]) {
    const report = await diagnose(text);
    assert.equal(report.checks[0].code, 'CHAR_INFO_OUTSIDE_GAMETXT');
    assert.equal(report.checks[0].status, 'fail');
    assert.equal(report.characters.length, 0);
  }

  const hidden = await diagnose(`<think>${card}</think><gametxt>正文</gametxt><!-- ${card} -->`);
  assert.equal(hidden.checks.some(check => check.code === 'CHAR_INFO_OUTSIDE_GAMETXT'), false);
  assert.equal(hidden.characters.length, 0);
});

test('Q1 诊断报告未闭合的推理区、楼层卡片上限与挂载失败', async () => {
  const thinking = await diagnose(`<think><gametxt>${card}</gametxt>`);
  assert.ok(thinking.checks.some(check => check.status === 'fail' && check.title.includes('<think>')));
  assert.equal(thinking.characters.length, 0);

  const overflow = await diagnose(`<gametxt>${card}${card}</gametxt>`, { maxCards: 1 });
  assert.ok(overflow.checks.some(check => check.status === 'fail' && check.title.includes('数量超过设置上限')));
  assert.equal(overflow.characters.length, 0);

  const mount = await diagnose(`<gametxt>${card}</gametxt>`, {
    mounted: false,
    mountDiagnostics: [{ messageId: 7, time: 1, code: 'HOST_DISCONNECTED', details: {} }],
  });
  assert.equal(mount.characters.length, 1);
  assert.ok(mount.checks.some(check => check.status === 'fail' && check.detail.includes('被外部 DOM 更新移除')));
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
  assert.match(editor, /:deep\(\.info-bubble-panel\) \{\s*position: fixed;[^}]*right: calc\(16px \+ var\(--ci-mobile-safe-right\)\);[^}]*left: calc\(16px \+ var\(--ci-mobile-safe-left\)\);/u);
  assert.match(editor, /max-height: min\(60dvh, 420px\);/u);
  assert.match(editor, /overflow-y: auto;/u);
  assert.match(editor, /touch-action: pan-y;/u);
});

test('移动端上一步保持单行且角色姓名必填标记紧贴标签', () => {
  assert.match(editor, /field-label-main">角色姓名 <b aria-hidden="true">\*<\/b><\/span>/u);
  assert.match(editor, /\.wizard-step-actions \{[\s\S]*grid-template-columns: minmax\(104px, auto\) minmax\(0, 1fr\);/u);
  assert.match(editor, /\.wizard-step-actions \.wizard-back-button \{[\s\S]*white-space: nowrap;[\s\S]*word-break: keep-all;/u);
  assert.match(editor, /class="secondary-button wizard-back-button"/u);
  assert.match(galleryStep, /class="secondary-button wizard-back-button"/u);
  assert.match(galleryStep, /\.step-actions \.wizard-back-button \{[\s\S]*white-space: nowrap;[\s\S]*word-break: keep-all;/u);
});
