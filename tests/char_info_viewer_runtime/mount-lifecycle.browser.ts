/**
 * Checkpoint 1: opt-in, intentionally red acceptance tests against the current runtime.
 * CHARINFO_PLAYWRIGHT_MODULE points to an existing Playwright installation when it
 * is not on Node's module path. No production bundle or chat server is modified.
 * Run: node --require ./tests/register-ts-node.cjs --test tests/char_info_viewer_runtime/mount-lifecycle.browser.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import ts from 'typescript';

const { chromium } = require(process.env.CHARINFO_PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '../..');
const sourcePaths = {
  runtime: 'src/char_info_viewer_runtime/runtime.ts',
  native: 'src/char_info_viewer_runtime/nativeMessageMount.ts',
  projection: 'src/char_info_viewer/runtime/charInfoMessage.ts',
  recent: 'src/char_info_viewer/runtime/recentMessages.ts',
};
const sources = Object.fromEntries(Object.entries(sourcePaths).map(([name, file]) => [
  name,
  ts.transpileModule(readFileSync(path.join(repo, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText,
]));
const settings = require('../../src/char_info_viewer_runtime/runtimeSettings.ts').defaultRuntimeSettings();
// Use the production inline Teleport template; replace only the leaf Viewer UI.
const rootSource = readFileSync(path.join(repo, 'src/char_info_viewer_runtime/RuntimeRoot.vue'), 'utf8');
const inlineTemplate = rootSource.slice('<template>'.length, rootSource.indexOf('  <Teleport v-if="state.library"'));
let browser: any;

before(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); });

function bootstrap(input: { sources: Record<string, string>; settings: any; inlineTemplate: string }) {
  const w = window as any;
  const { Vue, $ } = w;
  let state: any;
  let now = 0;
  let timerId = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const events = new Map<string, Set<(...args: any[]) => void>>();
  const logs: any[] = [];
  const originals: string[] = [];
  const messages: any[] = [];
  const formatCalls: any[] = [];
  const hostSelector = '[data-char-info-runtime-owned="1"][data-char-info-card-id]';
  const realDateNow = Date.now;
  Date.now = () => now;
  w.setTimeout = (callback: () => void, delay = 0) => {
    const id = ++timerId;
    timers.set(id, { at: now + delay, callback });
    return id;
  };
  w.clearTimeout = (id: number) => timers.delete(id);
  for (const level of ['info', 'warn', 'error']) {
    const original = console[level].bind(console);
    console[level] = (...args: any[]) => {
      if (args[1]?.code) logs.push({ ...args[1], elapsed: now });
      original(...args);
    };
  }
  const eventNames = ['USER_MESSAGE_RENDERED', 'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_RECEIVED',
    'GENERATION_ENDED', 'MESSAGE_EDITED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED',
    'CHAT_CHANGED', 'MORE_MESSAGES_LOADED'];
  w.tavern_events = Object.fromEntries(eventNames.map(name => [name, name]));
  w.eventOn = (event: string, callback: (...args: any[]) => void) => {
    if (!events.has(event)) events.set(event, new Set());
    events.get(event)!.add(callback);
    return { stop: () => events.get(event)!.delete(callback) };
  };
  w.getVariables = () => ({});
  w.getLastMessageId = () => messages.length - 1;
  w.getChatMessages = (id: number) => messages[id] ? [{ ...messages[id] }] : [];
  w.updateScriptButtonsWith = () => {};
  // Keep unrelated MVU initialization pending so its force-refresh does not hide
  // the message renderer's own recovery behavior. No MVU data is exercised here.
  w.waitGlobalInitialized = () => new Promise(() => {});
  w.toastr = { warning: () => {} };
  for (const name of ['setChatMessages', 'createChatMessages', 'deleteChatMessages', 'replaceVariables', 'refreshOneMessage']) {
    w[name] = () => { throw new Error(`Unexpected write/refresh: ${name}`); };
  }
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  // Narrow ST formatting fixture: prose and fenced frontend blocks only. The
  // production token injection, raw projection, DOM mount, queue and guard run unchanged.
  const format = (raw: string) => raw.split(/(```html\n[\s\S]*?\n```)/g).map(part =>
    part.startsWith('```html\n')
      ? `<pre><code>${escape(part.slice(8, -4))}</code></pre>`
      : `<p>${escape(part)}</p>`,
  ).join('');
  w.formatAsDisplayedMessage = (raw: string, options: any) => {
    formatCalls.push({ raw, options });
    return format(raw);
  };
  const modules: Record<string, any> = {};
  const leaf = { props: ['yamlText'], template: '<button class="test-viewer" @click="count++">{{ yamlText }}:{{ count }}</button>', data: () => ({ count: 0 }) };
  const root = {
    inheritAttrs: false,
    props: ['state', 'saveFeedbackHandler'], components: { ViewerApp: leaf },
    template: input.inlineTemplate,
    computed: { activeImageSourcePriority: () => [] },
    setup: (props: any) => ({ props }),
  };
  const dependencies: Record<string, any> = {
    vue: { ...Vue, reactive: (value: any) => { state = Vue.reactive(value); return state; } },
    pinia: { createPinia: () => ({ install() {} }) },
    '@util/script': { createScriptIdDiv: () => $('<div>'), teleportStyle: () => ({ destroy() {} }) },
    '../char_info_creator_manager/controller': { closeCreatorManager() {}, openCreatorManager() {} },
    '../char_info_viewer/services/imagePreload': { preloadPortraitImages: async () => {} },
    '../char_info_viewer/services/themeService': { resolveCharacterVisualPreloadUrls: () => [] },
    './currentCharacterLibrary': { collectChangedAffinityNames: () => [], collectCurrentCharacterSnapshots: () => [] },
    './RuntimeRoot.vue': { default: root },
    './runtimeSettings': {
      readRuntimeSettings: () => structuredClone(input.settings),
      readRuntimeFloatingButtonPosition: () => null,
    },
  };
  const aliases: Record<string, string> = {
    './nativeMessageMount': 'native',
    '../char_info_viewer/runtime/charInfoMessage': 'projection',
    '../char_info_viewer/runtime/recentMessages': 'recent',
  };
  function load(name: string): any {
    if (modules[name]) return modules[name];
    const exports = {};
    modules[name] = exports;
    new Function('require', 'exports', input.sources[name])((request: string) => {
      if (request in dependencies) return dependencies[request];
      if (request in aliases) return load(aliases[request]);
      throw new Error(`Unmocked dependency: ${request}`);
    }, exports);
    return exports;
  }
  const runtime = load('runtime').createCharInfoRuntime();
  const settle = async () => {
    await Vue.nextTick();
    await Promise.resolve();
    await Vue.nextTick();
  };
  w.harness = {
    logs, formatCalls,
    add(raw: string) {
      const id = messages.length;
      originals.push(raw);
      messages.push({ message_id: id, message: raw, role: 'assistant', is_hidden: false, swipe_id: 0 });
      $('#chat').append($('<div class="mes">').attr('mesid', id).append($('<div class="mes_text">').html(format(raw))));
      return id;
    },
    root(id = 0) { return document.querySelector(`#chat > .mes[mesid="${id}"] .mes_text`)!; },
    convert(count: number, id = 0) {
      const root = this.root(id);
      Array.from(root.querySelectorAll('pre')).filter((pre: any) => !pre.closest('.TH-render')).slice(0, count)
        .forEach(pre => $(pre).wrap('<div class="TH-render">'));
    },
    start() { runtime.start(); },
    async advance(ms: number) {
      await settle();
      const target = now + ms;
      let turns = 0;
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        if (++turns > 100) throw new Error('Timer/re-render storm');
        timers.delete(next[0]);
        now = next[1].at;
        next[1].callback();
        await settle();
      }
      now = target;
      await settle();
    },
    emit(name: string, id = 0) { events.get(name)?.forEach(callback => callback(id)); },
    rewrite(id = 0) { $(this.root(id)).html(format(messages[id].message)); },
    ejsRewrite(id = 0) { const root = $(this.root(id)); root.html(root.html().replace('BEFORE', 'AFTER')); },
    snapshot(id = 0) {
      const view = state.messages.find((message: any) => message.messageId === id);
      return {
        now, liveCards: view?.cards.filter((card: any) => card.host.isConnected && card.host.querySelector('.test-viewer')).length ?? 0,
        hosts: this.root(id).querySelectorAll(hostSelector).length,
        domText: this.root(id).textContent,
        cards: view?.cards.map((card: any) => ({ key: card.key, yamlText: card.yamlText })) ?? [],
        rawUnchanged: messages.every((message, index) => message.message === originals[index]),
        attempts: logs.filter(log => log.code === 'MOUNT_ATTEMPT').length,
        successes: logs.filter(log => log.code === 'MOUNT_SUCCESS').length,
        pendingTimers: timers.size,
        codes: logs.map(log => log.code),
      };
    },
    async stop() { runtime.stop({ restoreNativeMessages: false }); await settle(); Date.now = realDateNow; },
  };
}

async function scenario(t: any, run: (h: any) => Promise<any>) {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error: Error) => errors.push(error.message));
  page.on('console', (message: any) => {
    if (message.type() === 'error' || message.text().includes('[Vue warn]')) errors.push(message.text());
  });
  try {
    await page.setContent('<div id="chat"></div>');
    await page.addScriptTag({ path: require.resolve('vue/dist/vue.global.js') });
    await page.addScriptTag({ path: require.resolve('jquery/dist/jquery.js') });
    await page.evaluate(bootstrap, { sources, settings, inlineTemplate });
    const result = await page.evaluate(`(${run.toString()})(window.harness)`);
    assert.equal(await page.evaluate(() => (window as any).harness.snapshot().rawUnchanged), true);
    await page.evaluate(() => (window as any).harness.stop());
    assert.equal(await page.locator('[data-char-info-runtime-owned="1"]').count(), 0, 'Stop removes owned hosts');
    assert.deepEqual(errors, [], 'No unrelated browser or Vue errors');
    t.diagnostic(JSON.stringify(result));
    return result;
  } finally { await page.close(); }
}

test('control: real runtime mounts identical cards from raw source and duplicate events are idempotent', async t => {
  const result = await scenario(t, async h => {
    h.add('<char_info>姓名: A</char_info>\n<char_info>姓名: A</char_info>');
    h.start(); await h.advance(20);
    for (const event of ['CHARACTER_MESSAGE_RENDERED', 'MESSAGE_RECEIVED', 'GENERATION_ENDED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED']) h.emit(event);
    await h.advance(20);
    return h.snapshot();
  });
  assert.equal(result.liveCards, 2);
  assert.equal(result.successes, 1);
  assert.deepEqual(result.cards.map((card: any) => card.key), ['0:0:0', '0:0:1']);
  assert.equal(result.rawUnchanged, true);
});

test('A: one external whole-DOM rewrite disconnects hosts and observer recovers them', async t => {
  const result = await scenario(t, async h => {
    h.add('BEFORE <char_info>姓名: A</char_info>'); h.start(); await h.advance(20);
    h.ejsRewrite();
    const disconnected = h.snapshot();
    await h.advance(20);
    return { disconnected, recovered: h.snapshot() };
  });
  assert.equal(result.disconnected.liveCards, 0);
  assert.equal(result.recovered.liveCards, 1);
  assert.ok(result.recovered.codes.includes('HOST_DISCONNECTED'));
  assert.equal(result.recovered.rawUnchanged, true);
});

test('A acceptance: CharInfo recovery must preserve another renderer\'s transformed prose', async t => {
  const result = await scenario(t, async h => {
    h.add('BEFORE <char_info>姓名: A</char_info>'); h.start(); await h.advance(20);
    h.ejsRewrite(); await h.advance(20);
    return h.snapshot();
  });
  assert.match(result.domText, /AFTER/, 'Remount must not restore pre-EJS prose');
});

test('B control: zero or fully converted frontend blocks permit mounting', async t => {
  const result = await scenario(t, async h => {
    const raw = '<char_info>姓名: A</char_info>\n```html\n<body>one</body>\n```\n```html\n<body>two</body>\n```';
    h.add(raw); h.add(raw); h.convert(2, 1);
    const preserved = Array.from(h.root(1).querySelectorAll('.TH-render'));
    h.start(); await h.advance(20);
    return { zero: h.snapshot(0), full: h.snapshot(1), preserved: preserved.every((node: any) => node.isConnected && h.root(1).contains(node)) };
  });
  assert.equal(result.zero.liveCards, 1);
  assert.equal(result.full.liveCards, 1);
  assert.equal(result.preserved, true);
});

test('B/D acceptance: first failure in partial TH state must recover when conversion finishes', async t => {
  const result = await scenario(t, async h => {
    h.add('<char_info>姓名: A</char_info>\n```html\n<body>one</body>\n```\n```html\n<body>two</body>\n```');
    h.convert(1); h.start(); await h.advance(20);
    const partial = h.snapshot();
    const mismatch = h.logs.find((log: any) => log.code === 'TH_RENDER_COUNT_MISMATCH');
    h.convert(1); await h.advance(10000);
    const completed = h.snapshot();
    h.emit('MESSAGE_UPDATED'); await h.advance(20);
    return { partial, mismatch, completed, afterEvent: h.snapshot() };
  });
  assert.equal(result.partial.liveCards, 0);
  assert.equal(result.mismatch.existingTavernHelperRenders, 1);
  assert.equal(result.mismatch.formattedFrontendMountPoints, 2);
  assert.equal(result.afterEvent.liveCards, 1, 'A later explicit event proves the now-ready DOM can mount');
  assert.equal(result.completed.liveCards, 1, 'Finishing frontend conversion must recover the first failed mount');
});

test('C acceptance: two rewrites within 3 seconds must not leave Viewer absent after renderers stop', async t => {
  const result = await scenario(t, async h => {
    h.add('<char_info>姓名: A</char_info>'); h.start(); await h.advance(20);
    h.rewrite(); await h.advance(20);
    const first = h.snapshot();
    h.rewrite(); await h.advance(20);
    const second = h.snapshot();
    h.root().append(document.createElement('span')); await h.advance(10000);
    const settled = h.snapshot();
    h.emit('MESSAGE_UPDATED'); await h.advance(20);
    return { first, second, settled, afterEvent: h.snapshot() };
  });
  assert.equal(result.first.liveCards, 1);
  assert.ok(result.second.codes.includes('REMOUNT_LOOP_GUARD'));
  assert.equal(result.settled.pendingTimers, 0);
  assert.equal(result.afterEvent.liveCards, 1);
  assert.equal(result.settled.liveCards, 1, 'Cooldown expiry must not leave a recoverable message permanently idle');
});

test('C control: rewrites spaced beyond the guard both recover', async t => {
  const result = await scenario(t, async h => {
    h.add('<char_info>姓名: A</char_info>'); h.start(); await h.advance(20);
    h.rewrite(); await h.advance(20); await h.advance(3001);
    h.rewrite(); await h.advance(20); return h.snapshot();
  });
  assert.equal(result.liveCards, 1);
  assert.equal(result.successes, 3);
  assert.ok(!result.codes.includes('REMOUNT_LOOP_GUARD'));
});

test('E acceptance: the same render events before/after TH completion must have the same outcome', async t => {
  const result = await scenario(t, async h => {
    h.add('<char_info>姓名: A</char_info>\n```html\n<body>one</body>\n```\n```html\n<body>two</body>\n```');
    h.convert(1); h.start(); await h.advance(20);
    for (const event of ['GENERATION_ENDED', 'MESSAGE_RECEIVED', 'MESSAGE_SWIPED', 'MESSAGE_UPDATED', 'CHARACTER_MESSAGE_RENDERED']) h.emit(event);
    await h.advance(20); h.convert(1); await h.advance(10000);
    const eventsBeforeCompletion = h.snapshot();
    for (const event of ['CHARACTER_MESSAGE_RENDERED', 'MESSAGE_UPDATED', 'MESSAGE_RECEIVED', 'GENERATION_ENDED', 'MESSAGE_SWIPED']) h.emit(event);
    await h.advance(20);
    return { eventsBeforeCompletion, eventsAfterCompletion: h.snapshot() };
  });
  assert.equal(result.eventsAfterCompletion.liveCards, 1);
  assert.equal(result.eventsBeforeCompletion.liveCards, 1, 'Ready DOM must not depend on another future Tavern event');
});
