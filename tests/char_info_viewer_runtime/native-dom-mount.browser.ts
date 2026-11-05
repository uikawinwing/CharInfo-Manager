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

test('never creates a Viewer from a tag mention without qualifying field lines', async () => {
  const raw = '<gametxt><char_info>姓名、生命层级 are mentioned here</char_info></gametxt>';
  const result = await mountInPage(raw, '<char_info>姓名、生命层级 are mentioned here</char_info>');
  assert.equal(result.cards, 0);
  assert.equal(result.hosts, 0);
  assert.equal(result.after, result.before);
});
