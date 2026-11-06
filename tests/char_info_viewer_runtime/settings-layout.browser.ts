import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';

const { chromium } = require(process.env.CHARINFO_PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '../..');

function styleOf(relativePath: string, scoped = false): string {
  const source = readFileSync(path.join(repo, relativePath), 'utf8');
  const pattern = scoped ? /<style scoped>([\s\S]*?)<\/style>/ : /<style>([\s\S]*?)<\/style>/;
  const result = source.match(pattern)?.[1];
  assert.ok(result, 'Expected settings stylesheet in ' + relativePath);
  return result;
}

const rootCss = styleOf('src/char_info_viewer_runtime/RuntimeRoot.vue');
const wizardCss = styleOf('src/char_info_viewer_runtime/TroubleshootingWizard.vue', true);
let browser: any;

before(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); });

async function measure(width: number) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    const html = [
      '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>',
      rootCss, wizardCss,
      '</style></head><body>',
      '<div class="char-info-settings-backdrop char-info-theme-dark">',
      '<section class="char-info-settings-dialog">',
      '<header><h2>查看器设置</h2><button>×</button></header>',
      '<div class="char-info-settings-fields">',
      '<section class="ci-help">',
      '<div class="ci-help-header"><span><strong>遇到问题？帮我检查</strong>',
      '<small>选出看到的现象，由脚本读取这条聊天的实际配置，再给出解决办法。</small>',
      '</span><button type="button">开始排查</button></div>',
      '</section>',
      '<label class="char-info-settings-unlimited"><span><strong>不限单楼层数量</strong>',
      '<small>大量 Viewer 同时渲染可能增加手机性能与内存负担。</small></span>',
      '<button type="button">已开启无限制</button></label>',
      '<section class="char-info-settings-priority">',
      '<label class="char-info-settings-switch char-info-settings-priority-switch">',
      '<span><strong>折叠模式</strong>',
      '<small>当普通角色卡可按字段规则或等级差自动显示紧凑卡；立绘角色卡不受影响。</small></span>',
      '<span class="char-info-settings-priority-toggle-wrap"><small>已关闭</small>',
      '<input class="char-info-settings-priority-toggle" type="checkbox"></span>',
      '</label></section>',
      '<section class="char-info-settings-priority">',
      '<label class="char-info-settings-switch char-info-settings-priority-switch">',
      '<span><strong>图片来源优先级</strong>',
      '<small>开启后，查看器会优先尝试排在前面的图片。</small></span>',
      '<span class="char-info-settings-priority-toggle-wrap"><small>已关闭</small>',
      '<input class="char-info-settings-priority-toggle" type="checkbox"></span>',
      '</label></section>',
      '</div><footer><button>恢复默认</button><button>完成</button></footer>',
      '</section></div></body></html>',
    ].join('');
    await page.setContent(html);
    return await page.evaluate(() => {
      const doc = document;
      const dialog = doc.querySelector<HTMLElement>('.char-info-settings-dialog')!;
      const help = doc.querySelector<HTMLElement>('.ci-help')!;
      const button = doc.querySelector<HTMLElement>('.ci-help-header button')!;
      const statuses = [...doc.querySelectorAll<HTMLElement>('.char-info-settings-priority-toggle-wrap small')];
      const unlimited = doc.querySelector<HTMLElement>('.char-info-settings-unlimited button')!;
      const bounds = (node: Element) => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width, height: box.height };
      };
      const textRects = (node: HTMLElement) => {
        const range = doc.createRange();
        range.selectNodeContents(node);
        const count = range.getClientRects().length;
        range.detach();
        return count;
      };
      return {
        dialog: bounds(dialog),
        help: bounds(help),
        button: bounds(button),
        buttonLines: textRects(button),
        buttonWhiteSpace: getComputedStyle(button).whiteSpace,
        unlimited: { ...bounds(unlimited), lines: textRects(unlimited), whitespace: getComputedStyle(unlimited).whiteSpace },
        status: statuses.map(node => ({
          ...bounds(node),
          lines: textRects(node),
          whitespace: getComputedStyle(node).whiteSpace,
          fontSize: parseFloat(getComputedStyle(node).fontSize),
        })),
        overflow: Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth),
      };
    });
  } finally { await page.close(); }
}

for (const width of [1680, 390, 320]) {
  test('settings text remains horizontal without horizontal overflow at viewport ' + width, async () => {
    const result = await measure(width);
    assert.equal(result.buttonLines, 1, 'Help entry button wrapped into columns');
    assert.equal(result.buttonWhiteSpace, 'nowrap');
    assert.ok(result.button.width >= 95, 'Help entry button shrank');
    assert.ok(result.button.right <= result.dialog.right + 1);
    assert.ok(result.help.right <= result.dialog.right + 1);
    assert.equal(result.unlimited.whitespace, 'nowrap');
    assert.equal(result.unlimited.lines, 1);
    assert.ok(result.unlimited.right <= result.dialog.right + 1);
    for (const status of result.status) {
      assert.equal(status.whitespace, 'nowrap');
      assert.equal(status.lines, 1, 'Status text wrapped vertically');
      assert.ok(status.fontSize >= 12);
      assert.ok(status.right <= result.dialog.right + 1);
    }
    assert.ok(result.overflow <= width + 1, 'Settings overflowed viewport: ' + JSON.stringify(result));
  });
}
