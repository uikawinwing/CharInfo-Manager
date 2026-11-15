import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const repo = path.resolve(import.meta.dirname, '../..');

function loadModule(relativePath, modules = {}) {
  const source = readFileSync(path.join(repo, relativePath), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', output)(name => modules[name] ?? {}, exports);
  return exports;
}

const projection = loadModule('src/char_info_viewer/runtime/charInfoMessage.ts');
const parse = yaml => {
  const name = yaml.match(/(?:姓名|名字)\s*[:：]\s*(.+)/u)?.[1]?.trim() ?? '';
  return { success: true, data: { 姓名: name, 生命层级: '第一层级' } };
};

const diagnostic = loadModule('src/char_info_viewer_runtime/diagnostics.ts', {
  '../char_info_viewer/runtime/charInfoMessage': projection,
  '../char_info_viewer/services/yamlParser': { parseCharacterYaml: parse },
});
const theme = {
  resolveCharacterVisualConfigWithExtensions: async (data, vars) => {
    const profile = vars.char_info?.profiles?.[data.姓名];
    const urls = profile?.gallery?.flatMap(x => x.sources ?? []) ?? [];
    return { ...data, __char_info_image_source_groups: urls.map(url => [url]) };
  },
  isSpecialNpcVisualData: visual => (visual.__char_info_image_source_groups?.length ?? 0) > 0,
  hasDeprecatedVisualSyntax: () => false,
};
const guided = loadModule('src/char_info_viewer_runtime/guidedTroubleshooting.ts', {
  '../char_info_viewer/runtime/charInfoMessage': projection,
  '../char_info_viewer/services/yamlParser': { parseCharacterYaml: parse },
  '../char_info_viewer/services/themeService': theme,
  './diagnostics': {
    runCharInfoDiagnostics: diagnostic.runCharInfoDiagnostics,
    probeMediaSource: async url => ({ url, status: url.includes('ok.webp') ? 'pass' : 'fail', detail: '加载失败' }),
  },
});
const raw = '<gametxt><char_info>\n姓名: Iris\n生命层级: 第一层级\n</char_info></gametxt>';
const candidate = { key: '3:0:0', messageId: 3, swipeId: 0, ordinal: 0, name: 'Iris', yamlText: raw, rawText: raw };
const opts = (overrides = {}) => ({
  symptom: 'portrait_missing', candidate, origin: 'unknown', expectation: 'unknown',
  editorIssue: 'entry', maxCards: 4, active: true, mounted: true,
  chatVariables: {}, mountDiagnostics: [], ...overrides,
});

test('HTML comments mentioning char_info are not counted as missing closing tags', async () => {
  const message = [
    '<gametxt>',
    '<char_info>姓名: Iris\n生命层级: 第一层级</char_info>',
    '<!-- actionSheet SOURCE=<char_info> and SOURCE=<char_info> -->',
    '</gametxt>',
  ].join('\n');
  const report = await diagnostic.runCharInfoDiagnostics({
    messageId: 3, swipeId: 0, text: message, maxCards: 4,
    active: true, mounted: true, chatVariables: {}, mountDiagnostics: [],
  });
  const tags = report.checks.find(x => x.code === 'TAG_BALANCED');
  assert.ok(tags);
  assert.match(tags.detail, /1 对标签/);
  assert.equal(report.checks.some(x => x.code === 'TAG_UNBALANCED'), false);
});

test('a genuinely unclosed card reports a real message location', async () => {
  const report = await diagnostic.runCharInfoDiagnostics({
    messageId: 4, swipeId: 0, text: '<gametxt>\n<char_info>\n姓名: Iris\n生命层级: 第一层级\n</gametxt>',
    maxCards: 4, active: true, mounted: false, chatVariables: {}, mountDiagnostics: [],
  });
  const bad = report.checks.find(x => x.code === 'TAG_UNBALANCED');
  assert.ok(bad);
  assert.match(bad.location, /第 2 行/);
  assert.match(bad.excerpt, /<char_info>/);
});

test('AI-created NPC with no profile is normal and cannot imply automatic image generation', async () => {
  const result = await guided.runWizardAnalysis(opts({ origin: 'llm', expectation: 'no' }));
  assert.equal(result.code, 'NO_IMAGE_PROFILE');
  assert.equal(result.severity, 'expected');
  assert.match(result.reason, /不会自动生成图片/);
});

test('a name differing only in whitespace remains a suspected mismatch', async () => {
  const result = await guided.runWizardAnalysis(opts({
    chatVariables: { char_info: { profiles: { 'Iris ': {} } } },
  }));
  assert.equal(result.code, 'PROFILE_NAME_MISMATCH');
  assert.ok(result.evidence.some(x => x.includes('Iris ')));
});

test('status avatar alone does not count as Viewer illustration', async () => {
  const result = await guided.runWizardAnalysis(opts({
    origin: 'llm', expectation: 'no',
    chatVariables: { status: { externalAvatars: { partners: { Iris: { url: 'https://img.example/face.webp' } } } } },
  }));
  assert.equal(result.code, 'NO_IMAGE_PROFILE');
  assert.equal(result.severity, 'expected');
  assert.ok(result.evidence.some(x => x.includes('状态栏头像')));
});

test('downloaded NPC without image from author is not diagnosed as malfunction', async () => {
  const result = await guided.runWizardAnalysis(opts({ origin: 'downloaded', expectation: 'no' }));
  assert.equal(result.severity, 'expected');
  assert.match(result.reason, /作者没有提供图片/);
  assert.doesNotMatch(result.reason, /AI 临时生成/);
});

test('downloaded character expected to have a picture is asked to verify installation', async () => {
  const result = await guided.runWizardAnalysis(opts({ origin: 'downloaded', expectation: 'yes' }));
  assert.equal(result.severity, 'suspected');
  assert.ok(result.steps.some(x => x.includes('EJS')));
});

test('a similar but non-identical name is shown as a possible mismatch without renaming', async () => {
  const result = await guided.runWizardAnalysis(opts({
    chatVariables: { char_info: { profiles: { 'Iris·S': {} } } },
  }));
  assert.equal(result.code, 'PROFILE_NAME_MISMATCH');
  assert.equal(result.severity, 'suspected');
  assert.ok(result.evidence.some(x => x.includes('Iris·S')));
});

test('configured failing image URL is verified and URL query tokens are never copied', async () => {
  const result = await guided.runWizardAnalysis(opts({
    chatVariables: { char_info: { profiles: { Iris: { gallery: [{ sources: ['https://img.example/test.webp?token=secret'] }] } } } },
  }));
  assert.equal(result.code, 'IMAGE_LOAD_FAILED');
  assert.equal(result.severity, 'confirmed');
  const prompt = guided.createWizardPrompt(opts(), result, '没变化');
  assert.ok(prompt.includes('test.webp'));
  assert.ok(!prompt.includes('token=secret'));
});

test('configured working image overrides the assumption that AI NPCs never have an image', async () => {
  const result = await guided.runWizardAnalysis(opts({
    origin: 'llm', expectation: 'no',
    chatVariables: { char_info: { profiles: { Iris: { gallery: [{ sources: ['https://img.example/ok.webp'] }] } } } },
  }));
  assert.equal(result.code, 'IMAGE_DATA_OK');
  assert.notEqual(result.severity, 'expected');
});

test('technical cache issue does not invent a guaranteed cause', async () => {
  const result = await guided.runWizardAnalysis(opts({ symptom: 'version_cache', candidate: null }));
  assert.equal(result.code, 'VERSION_MANUAL');
  assert.equal(result.severity, 'info');
});

test('missing selected card does not silently use another character', async () => {
  const result = await guided.runWizardAnalysis(opts({ candidate: null }));
  assert.equal(result.code, 'NO_CARD_SELECTED');
});
