/**
 * Opt-in real-browser regression for TavernHelper's srcdoc script environment.
 * CHARINFO_PLAYWRIGHT_MODULE may point at an existing Playwright installation.
 * Run: node --require ./tests/register-ts-node.cjs --test tests/char_info_profile_editor/imgbed-window-ownership.browser.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

const { chromium } = require(process.env.CHARINFO_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../..');
const compile = (relative: string) =>
  ts.transpileModule(readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
const modules = {
  overlay: compile('src/char_info_profile_editor/overlay.ts'),
  popup: compile('src/char_info_profile_editor/services/imgbedBridge.ts'),
  upload: compile('src/char_info_profile_editor/services/imgbedUploadBridge.ts'),
};
const jquery = readFileSync(require.resolve('jquery'), 'utf8');
const imgbedOrigin = 'https://imgbed-staging.uika.cc.cd';

test('ST COOP also severs a popup opened by the ImgBed iframe itself', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext();
    context.setDefaultTimeout(3000);
    await context.route('http://localhost:8000/**', (route: any) =>
      route.fulfill({
        headers: { 'Cross-Origin-Opener-Policy': 'same-origin' },
        contentType: 'text/html; charset=utf-8',
        body: `<iframe src="${imgbedOrigin}/launch"></iframe>`,
      }),
    );
    await context.route(`${imgbedOrigin}/**`, (route: any) =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: route.request().url().endsWith('/launch')
          ? `<button onclick="window.open('/auth')">Connect</button>`
          : `<p id="state"></p><script>document.querySelector('#state').textContent = opener ? 'retained' : 'lost';</script>`,
      }),
    );
    const page = await context.newPage();
    await page.goto('http://localhost:8000/');
    const opened = context.waitForEvent('page');
    await page.frameLocator('iframe').getByRole('button', { name: 'Connect' }).click();
    const popup = await opened;
    await popup.waitForLoadState();
    assert.equal(await popup.locator('#state').textContent(), 'lost');
  } finally {
    await browser.close();
  }
});

for (const fixture of [
  { stOrigin: 'http://localhost:8000', coop: false },
  { stOrigin: 'http://192.168.1.41:8000', coop: true },
  { stOrigin: 'http://100.75.12.3:8000', coop: true },
  { stOrigin: 'http://localhost:8000', coop: true },
]) {
  const { stOrigin, coop } = fixture;
  test(`script receiver and visible launcher retain real parent ownership at ${stOrigin}; COOP=${coop}; simulated consent succeeds`, async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    context.setDefaultTimeout(3000);
    const page = await context.newPage();
    const diagnostic: string[] = [];
    const issued = new Map<string, string>();
    const approved = new Set<string>();
    page.on('console', (message: any) => {
      if (message.text().startsWith('ownership:')) diagnostic.push(message.text());
    });
    page.on('pageerror', (error: Error) => diagnostic.push(error.stack ?? error.message));
    try {
      await context.route(`${stOrigin}/**`, async (route: any) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/jquery.js') return route.fulfill({ contentType: 'text/javascript', body: jquery });
        if (url.pathname === '/script.js')
          return route.fulfill({
            contentType: 'text/javascript',
            body: `
          const bodies = ${JSON.stringify(modules)};
          const cache = {};
          function load(name) {
            if (cache[name]) return cache[name];
            const exports = cache[name] = {};
            const dependencies = {
              'vue': { createApp(_component, props) {
                window.upload = props.imgbedUploadBridge;
                return { mount(point) {
                  const trigger = point.ownerDocument.createElement('button');
                  trigger.textContent = 'Connect';
                  trigger.onclick = () => { window.result = window.upload.connect(point).then(() => 'connected', error => error.code); };
                  point.appendChild(trigger);
                  window.mounted = true;
                  return { resetToInitialView() {} };
                }, unmount() {} };
              } },
              '@util/script': { createScriptIdIframe: () => parent.$('<iframe>'), teleportStyle: () => ({ destroy() {} }) },
              '../char_info_shared/managerTheme': { DEFAULT_CHAR_INFO_THEME_MODE: 'dark' },
              '../char_info_shared/viewerUiDefaults': {},
              './App.vue': { default: {} },
            };
            const aliases = { './services/imgbedBridge': 'popup', './services/imgbedUploadBridge': 'upload', '@/char_info_profile_editor/services/imgbedBridge': 'popup' };
            new Function('require', 'exports', bodies[name])(id => {
              if (id in dependencies) return dependencies[id];
              if (id in aliases) return load(aliases[id]);
              throw new Error('Unexpected import: ' + id);
            }, exports);
            return exports;
          }
          window.overlay = load('overlay').createProfileEditorOverlay();
          window.overlay.open();
        `,
          });
        return route.fulfill({
          headers: coop ? { 'Cross-Origin-Opener-Policy': 'same-origin' } : {},
          contentType: 'text/html; charset=utf-8',
          body: `<!doctype html><script src="/jquery.js"></script><iframe name="tavern-script" srcdoc="&lt;script src='${stOrigin}/script.js'&gt;&lt;/script&gt;"></iframe>`,
        });
      });
      await context.route(`${imgbedOrigin}/**`, async (route: any) => {
        const url = new URL(route.request().url());
        const connectionId = url.searchParams.get('connection_id');
        if (url.pathname === '/mock-status')
          return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ connected: approved.has(connectionId!) }),
          });
        if (url.pathname === '/mock-approve') {
          approved.add(connectionId!);
          return route.fulfill({ contentType: 'application/json', body: '{}' });
        }
        if (url.pathname === '/charinfo-upload/connect') {
          const fields = new URLSearchParams(route.request().postData() ?? '');
          const id = fields.get('connection_id');
          const token = fields.get('ticket');
          const matched = !!id && issued.get(id) === token;
          assert.equal(route.request().method(), 'POST');
          assert.equal(matched, true, 'Only the ImgBed launcher form has the private test ticket');
          return route.fulfill({
            contentType: 'text/html; charset=utf-8',
            body: `
          <p id="status">Matched upload frame; simulated Discord account</p><button id="allow">Allow connection</button>
          <script>
            document.querySelector('#allow').onclick = async () => {
              await fetch('/mock-approve?connection_id=' + ${JSON.stringify(id)});
              document.querySelector('#status').textContent = 'Approved';
            };
          </script>
        `,
          });
        }
        if (url.pathname === '/charinfo-upload/launcher')
          return route.fulfill({
            contentType: 'text/html; charset=utf-8',
            body: `
          <button id="continue" disabled>继续连接 ImgBed</button>
          <script>
            const id = ${JSON.stringify(connectionId)}, origin = ${JSON.stringify(stOrigin)};
            const candidates = new Set();
            const challenge = 'browser-test-challenge';
            let bound = false, ticket;
            function find(frame, depth) {
              if (depth > 3) return;
              try {
                for (let i = 0; i < frame.frames.length; i++) {
                  const child = frame.frames[i];
                  if (child !== window) {
                    candidates.add(child);
                    child.postMessage({ type: 'mock-launcher.challenge', connectionId: id, challenge }, location.origin);
                    find(child, depth + 1);
                  }
                }
              } catch {}
            }
            addEventListener('message', event => {
              if (event.source === parent && event.origin === origin && event.data.protocol === 'charinfo-imgbed-upload'
                  && event.data.version === 1 && event.data.connectionId === id && event.data.type === 'bridge.hello') {
                bound = true;
                parent.postMessage({ protocol: 'charinfo-imgbed-upload', version: 1, connectionId: id, type: 'launcher.ready' }, origin);
                console.log('ownership:launcher real parent=true');
                find(top, 0);
              } else if (bound && candidates.has(event.source) && event.origin === location.origin
                  && event.data.type === 'mock-launcher.ticket' && event.data.connectionId === id && event.data.challenge === challenge) {
                ticket = event.data.ticket;
                document.querySelector('#continue').disabled = false;
              }
            });
            document.querySelector('#continue').onclick = () => {
              if (!bound || !ticket) return;
              const form = document.createElement('form');
              form.method = 'POST'; form.action = '/charinfo-upload/connect'; form.target = '_blank';
              for (const [name, value] of Object.entries({ connection_id: id, ticket })) {
                const field = document.createElement('input'); field.type = 'hidden'; field.name = name; field.value = value; form.append(field);
              }
              document.body.append(form); form.submit();
            };
          </script>
        `,
          });
        const ticket = `private-test-ticket-${connectionId}`;
        issued.set(connectionId!, ticket);
        return route.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: `<!doctype html><script>
          let requestId, bound = false;
          const envelope = { protocol: 'charinfo-imgbed-upload', version: 1, connectionId: ${JSON.stringify(connectionId)} };
          function send(type, fields = {}) { parent.postMessage({ ...envelope, type, ...fields }, ${JSON.stringify(stOrigin)}); }
          async function status() {
            if (!requestId) return;
            const response = await fetch('/mock-status?connection_id=' + envelope.connectionId);
            if ((await response.json()).connected) send('auth.connected', { requestId, sessionId: 'public-session', accountId: 'account', accountName: 'Simulated Discord account' });
            else setTimeout(status, 50);
          }
          addEventListener('message', event => {
            if (bound && event.origin === location.origin && event.source.top === top
                && event.data.type === 'mock-launcher.challenge' && event.data.connectionId === envelope.connectionId) {
              event.source.postMessage({ type: 'mock-launcher.ticket', connectionId: envelope.connectionId,
                challenge: event.data.challenge, ticket: ${JSON.stringify(ticket)} }, location.origin);
              return;
            }
            const valid = event.source === parent && event.origin === ${JSON.stringify(stOrigin)};
            console.log('ownership:message parent matches=' + valid + ' type=' + event.data.type);
            if (!valid || event.data.connectionId !== envelope.connectionId) return;
            if (event.data.type === 'bridge.hello') { bound = true; send('bridge.ready'); }
            if (event.data.type === 'auth.connect') {
              requestId = event.data.requestId;
              void status();
            }
          });
        </script>`,
        });
      });
      await page.goto(stOrigin);
      const script = page.frame({ name: 'tavern-script' });
      try {
        await script.waitForFunction(() => (window as any).mounted, null, { timeout: 3000 });
      } catch {
        assert.fail('Editor did not mount: ' + diagnostic.join('\n'));
      }
      await page
        .frameLocator('iframe[title="角色档案编辑器"]')
        .getByRole('button', { name: 'Connect', exact: true })
        .click({ timeout: 3000 });
      const launcher = page.frameLocator('iframe[title="角色档案编辑器"]').frameLocator('iframe[title="连接 ImgBed"]');
      try {
        await launcher.getByRole('button', { name: '继续连接 ImgBed' }).waitFor();
      } catch {
        const frames = await Promise.all(
          page.frames().map((f: any) =>
            f.evaluate(() => ({
              url: location.href,
              text: document.body.innerText,
              html: document.body.innerHTML.slice(0, 300),
              rect: document.body.getBoundingClientRect().toJSON(),
            })),
          ),
        );
        assert.fail('Launcher did not mount: ' + diagnostic.join('\n') + '\n' + JSON.stringify(frames));
      }
      assert.equal(await script.evaluate(() => (window as any).upload.getState().status), 'connecting');
      const popupCreated = context.waitForEvent('page');
      await launcher.getByRole('button', { name: '继续连接 ImgBed' }).click({ timeout: 3000 });
      const popup = await popupCreated;
      try {
        await popup.getByRole('button', { name: 'Allow connection', exact: true }).waitFor();
        await popup.waitForFunction(() => !(document.querySelector('#allow') as HTMLButtonElement).disabled, null, {
          timeout: 3000,
        });
      } catch (error) {
        assert.fail(`${await popup.locator('#status').textContent()}\n${diagnostic.join('\n')}\n${error}`);
      }
      await popup.getByRole('button', { name: 'Allow connection', exact: true }).click();
      try {
        await script.waitForFunction(() => (window as any).upload.getState().status === 'connected', null, {
          timeout: 3000,
        });
      } catch {
        assert.fail(
          'Handshake did not connect: ' +
            JSON.stringify(await script.evaluate(() => (window as any).upload.getState())) +
            '\n' +
            diagnostic.join('\n'),
        );
      }
      assert.equal(
        await script.evaluate(() => (window as any).upload.getState().accountName),
        'Simulated Discord account',
      );
      assert.equal(
        await page.frameLocator('iframe[title="角色档案编辑器"]').locator('iframe[title="连接 ImgBed"]').count(),
        0,
      );
      assert.ok(diagnostic.includes('ownership:launcher real parent=true'));
      assert.ok(diagnostic.some(message => message === 'ownership:message parent matches=true type=bridge.hello'));
      await script.evaluate(() => (window as any).overlay.destroy());
      assert.equal(await page.locator('[data-char-info-profile-editor]').count(), 0);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
