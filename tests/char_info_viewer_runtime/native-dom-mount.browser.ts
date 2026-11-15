import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import ts from 'typescript';

const { chromium } = require(process.env.CHARINFO_PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '../..');

function compile(relativePath: string): string {
  return ts.transpileModule(readFileSync(path.join(repo, relativePath), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
}

const source = {
  projection: compile('src/char_info_viewer/runtime/charInfoMessage.ts'),
  mount: compile('src/char_info_viewer_runtime/nativeMessageMount.ts'),
};
let browser: any;

before(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => {
  await browser?.close();
});

async function mountInPage(raw: string, html: string) {
  const page = await browser.newPage();
  try {
    await page.setContent('<div id="chat"><div class="mes" mesid="0"><div class="mes_text"></div></div></div>');
    return await page.evaluate(
      ({ raw, html, source }) => {
        const w = window as any;
        w.getVariables = () => ({});
        const root = document.querySelector<HTMLElement>('#chat .mes_text')!;
        root.innerHTML = html;
        const before = root.innerHTML;
        const firstTag = root.querySelector('char_info');
        const firstPre = root.querySelector('pre');
        const projectionExports: Record<string, any> = {};
        new Function('require', 'exports', source.projection)(() => {
          throw new Error('unexpected import');
        }, projectionExports);
        const mountExports: Record<string, any> = {};
        new Function('require', 'exports', source.mount)((name: string) => {
          if (name === './runtimeSettings.ts') return { readRuntimeSettings: () => ({ debugEnabled: false }) };
          throw new Error('unexpected import ' + name);
        }, mountExports);
        const projection = projectionExports.projectCharInfoMessage({ messageId: 0, swipeId: 0, text: raw });
        const diagnostics: string[] = [];
        const mounts = mountExports.mountCharInfoCardHosts(root, projection.cards, {
          onDiagnostic: (value: any) => diagnostics.push(value.code),
        });
        const during = root.textContent;
        const duringHtml = root.innerHTML;
        const hosts = root.querySelectorAll('[data-char-info-runtime-owned="1"]').length;
        const modes = mounts?.map((mount: any) => mount.mode) ?? [];
        mounts
          ?.slice()
          .reverse()
          .forEach((mount: any) => mount.restore());
        return {
          cards: projection.cards.length,
          hosts,
          modes,
          diagnostics,
          during,
          duringHtml,
          after: root.innerHTML,
          before,
          tagRestored: firstTag ? root.querySelector('char_info') === firstTag : null,
          prePreserved: firstPre ? root.querySelector('pre') === firstPre : null,
        };
      },
      { raw, html, source },
    );
  } finally {
    await page.close();
  }
}

test('replaces native char_info tag even when markdown rewrites all inner content', async () => {
  const raw = '<char_info>\n姓名: Iris\n生命层级: 3\n装备: [broken\n</char_info>';
  const html = '<p>Before</p><char_info><b>姓名: Iris</b><ul><li>生命层级: 3</li></ul></char_info><p>After</p>';
  const result = await mountInPage(raw, html);
  assert.equal(result.cards, 1);
  assert.equal(result.hosts, 1);
  assert.deepEqual(result.modes, ['dom-element']);
  assert.equal(result.tagRestored, true);
  assert.equal(result.after, result.before);
  assert.match(result.during, /Before/);
  assert.match(result.during, /After/);
});

test('mounts a repairable Viewer anchor when markdown destroys tags and text equality', async () => {
  const raw = '<char_info>\n姓名: Iris\n生命层级: 3\n装备: [broken\n</char_info>';
  const html =
    '<p>Other renderer completely changed the display</p><pre><code>protected block</code></pre><p>After</p>';
  const result = await mountInPage(raw, html);
  assert.equal(result.cards, 1);
  assert.equal(result.hosts, 1);
  assert.deepEqual(result.modes, ['fallback-anchor']);
  assert.ok(result.diagnostics.includes('CARD_MOUNT_FALLBACK'));
  assert.equal(result.after, result.before);
  assert.equal(result.prePreserved, true);
  assert.match(result.during, /Other renderer/);
});

test('ignores char_info elements inside thinking scopes when matching the actual card', async () => {
  const raw =
    '<think><char_info>姓名: Fake\n生命层级: 4</char_info></think><gametxt><char_info>姓名: Iris\n生命层级: 3</char_info></gametxt>';
  const html =
    '<think><char_info>姓名: Fake\n生命层级: 4</char_info></think><char_info>姓名: Iris\n生命层级: 3</char_info>';
  const result = await mountInPage(raw, html);
  assert.equal(result.cards, 1);
  assert.deepEqual(result.modes, ['dom-element']);
  assert.equal(result.after, result.before);
});

test('retains the original text-range mount for flattened but still matching content', async () => {
  const raw = '<char_info>\n姓名: Iris\n生命层级: 3\n</char_info>';
  const html = '<p>Opening</p><p>姓名: Iris 生命层级: 3</p><p>Closing</p>';
  const result = await mountInPage(raw, html);
  assert.equal(result.cards, 1);
  assert.deepEqual(result.modes, ['text-range']);
  assert.match(result.during, /Opening/);
  assert.match(result.during, /Closing/);
  assert.match(result.after, /姓名: Iris/);
});

test('maps two native tags to two cards with the same name without double replacement', async () => {
  const raw = '<char_info>姓名: Iris\n生命层级: 3</char_info>\n<char_info>姓名: Iris\n等级: 12</char_info>';
  const html =
    '<char_info>姓名: Iris\n生命层级: 3</char_info><p>between</p><char_info>姓名: Iris\n等级: 12</char_info>';
  const result = await mountInPage(raw, html);
  assert.equal(result.cards, 2);
  assert.equal(result.hosts, 2);
  assert.deepEqual(result.modes, ['dom-element', 'dom-element']);
  assert.equal(result.after, result.before);
});

test('never replaces an unrelated native tag when its identifying fields are missing', async () => {
  const raw = '<char_info>姓名: Iris\n生命层级: 3</char_info>';
  const html = '<char_info>unrelated snippet without any character key</char_info><p>safe prose</p>';
  const result = await mountInPage(raw, html);
  assert.equal(result.cards, 1);
  assert.deepEqual(result.modes, ['fallback-anchor']);
  assert.equal(result.tagRestored, true);
  assert.equal(result.after, result.before);
});

test('replaces two Markdown-expanded cards at their original narrative positions', async () => {
  const raw = [
    '<gametxt>',
    '布尔柳克村旁的部队正在渡河。',
    '<char_info>',
    '姓名: 第5步兵团1营D连线列集群',
    '生命层级: 第一层级',
    '等级: 2',
    '属性:',
    '  力量: 3 + 0 + 0 = 3',
    '装备:',
    '  - 名称: 斯奈德步枪',
    '    描述: 装备后膛线膛步枪的帝国线列步兵集群。',
    '</char_info>',
    '南岸上空的浓烟越来越重。',
    '<char_info>',
    '姓名: 诺斯加德野战炮兵阵地集群',
    '生命层级: 第一层级',
    '等级: 2',
    '装备:',
    '  - 名称: 炮兵服',
    '    描述: 诺斯加德野战炮兵穿着的灰色厚呢大衣。',
    '    位置: 身体',
    '</char_info>',
    '卡文迪什上尉向前挥动佩刀。',
    '</gametxt>',
  ].join('\n');
  const html = [
    '<p>布尔柳克村旁的部队正在渡河。</p>',
    '<p>姓名: 第5步兵团1营D连线列集群</p>',
    '<p>生命层级: 第一层级</p>',
    '<p>等级: 2</p>',
    '<p>属性:</p>',
    '<p>力量: 3 + 0 + 0 = 3</p>',
    '<p>装备:</p>',
    '<p>名称: 斯奈德步枪</p>',
    '<p>描述: 装备后膛线膛步枪的帝国线列步兵集群。</p>',
    '<p>南岸上空的浓烟越来越重。</p>',
    '<p>姓名: 诺斯加德野战炮兵阵地集群</p>',
    '<p>生命层级: 第一层级</p>',
    '<p>等级: 2</p>',
    '<p>装备:</p>',
    '<p>名称: 炮兵服</p>',
    '<p>描述: 诺斯加德野战炮兵穿着的灰色厚呢大衣。</p>',
    '<p>位置: 身体</p>',
    '<p>卡文迪什上尉向前挥动佩刀。</p>',
  ].join('');

  const result = await mountInPage(raw, html);
  assert.equal(result.cards, 2);
  assert.equal(result.hosts, 2);
  assert.deepEqual(result.modes, ['text-range', 'text-range']);
  const first = result.duringHtml.indexOf('data-char-info-card-id="0:0:0"');
  const second = result.duringHtml.indexOf('data-char-info-card-id="0:0:1"');
  assert.ok(result.duringHtml.indexOf('布尔柳克村旁') < first);
  assert.ok(first < result.duringHtml.indexOf('南岸上空'));
  assert.ok(result.duringHtml.indexOf('南岸上空') < second);
  assert.ok(second < result.duringHtml.indexOf('卡文迪什上尉'));
  assert.doesNotMatch(result.during, /姓名: 第5步兵团|姓名: 诺斯加德/);
  assert.equal(result.after, result.before);
});

test('inserts Viewer at the name when the end of a card cannot be located', async () => {
  const raw = '<char_info>\n姓名: Iris\n生命层级: 第一层级\n装备: [not rendered YAML\n</char_info>';
  const html = '<p>前文</p><p>姓名: Iris</p><p>生命层级: 第一层级</p><p>后文</p>';
  const result = await mountInPage(raw, html);
  assert.deepEqual(result.modes, ['field-anchor']);
  assert.ok(result.duringHtml.indexOf('前文') < result.duringHtml.indexOf('data-char-info-card-id'));
  assert.ok(result.duringHtml.indexOf('data-char-info-card-id') < result.duringHtml.indexOf('姓名: Iris'));
  assert.ok(result.duringHtml.indexOf('data-char-info-card-id') < result.duringHtml.indexOf('后文'));
  assert.equal(result.after, result.before);
});

test('two same-name fallback cards remain next to their respective source fields', async () => {
  const raw = [
    '<char_info>姓名: Iris\n生命层级: 第一层级\n装备: [first omitted</char_info>',
    'Between',
    '<char_info>姓名: Iris\n生命层级: 第二层级\n装备: [second omitted</char_info>',
  ].join('\n');
  const html = [
    '<p>Before</p>',
    '<p>姓名: Iris</p><p>生命层级: 第一层级</p>',
    '<p>Between</p>',
    '<p>姓名: Iris</p><p>生命层级: 第二层级</p>',
    '<p>After</p>',
  ].join('');
  const result = await mountInPage(raw, html);
  assert.deepEqual(result.modes, ['field-anchor', 'field-anchor']);
  const first = result.duringHtml.indexOf('data-char-info-card-id="0:0:0"');
  const second = result.duringHtml.indexOf('data-char-info-card-id="0:0:1"');
  assert.ok(result.duringHtml.indexOf('Before') < first);
  assert.ok(first < result.duringHtml.indexOf('Between'));
  assert.ok(result.duringHtml.indexOf('Between') < second);
  assert.ok(second < result.duringHtml.indexOf('After'));
  assert.equal(result.after, result.before);
});

test('never creates a Viewer from a tag mention without qualifying field lines', async () => {
  const raw = '<gametxt><char_info>姓名、生命层级 are mentioned here</char_info></gametxt>';
  const result = await mountInPage(raw, '<char_info>姓名、生命层级 are mentioned here</char_info>');
  assert.equal(result.cards, 0);
  assert.equal(result.hosts, 0);
  assert.equal(result.after, result.before);
});
