import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';

const { chromium } = require(process.env.CHARINFO_PLAYWRIGHT_MODULE || 'playwright');
const source = readFileSync(path.resolve(__dirname, '../../src/char_info_viewer_runtime/RuntimeRoot.vue'), 'utf8');
const template = source.match(/<Teleport v-if="state\.settingsView"[^>]*>\s*([\s\S]*?)<\/Teleport>/)?.[1];
const css = source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert.ok(template && css, 'Expected the real settings template and stylesheet');
let browser: Awaited<ReturnType<typeof chromium.launch>>;

before(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); });

for (const width of [1680, 1024, 393, 320]) {
  test('settings navigation, controls and layout at ' + width + 'px', async () => {
    const page = await browser.newPage({ viewport: { width, height: width < 720 ? 700 : 900 } });
    const errors: string[] = [];
    page.on('pageerror', (error: Error) => errors.push(error.message));
    try {
      await page.setContent('<!doctype html><meta charset="utf-8"><div class="char-info-settings-host" id="settings"></div>');
      await page.addStyleTag({ content: 'html, body {margin: 0; width: 100%; height: 100%;}' + css });
      await page.addScriptTag({ path: require.resolve('vue/dist/vue.global.js') });
      await page.evaluate((settingsTemplate: string) => {
        const settingsSections = [
          { id: 'library', label: '管理库' },
          { id: 'performance', label: '渲染与性能' },
          { id: 'appearance', label: '界面与外观' },
          { id: 'generation', label: '文生图' },
          { id: 'diagnostics', label: '调试' },
        ];
        const vue = (window as unknown as { Vue: typeof import('vue') }).Vue;
        vue.createApp({
          template: settingsTemplate,
          components: {
            TroubleshootingWizard: { template: '<button type="button">开始排查</button>' },
          },
          data: () => ({
            state: { settings: { themeMode: 'dark' }, portraitAvailability: null, portraitJobs: [] },
            settingsSections,
            activeSettingsSection: 'library',
            floorLimitDraft: 6,
            maxCardsPerMessageDraft: 0,
            MIN_ACTIVE_FLOOR_LIMIT: 0,
            MAX_ACTIVE_FLOOR_LIMIT: 20,
            MIN_MAX_CARDS_PER_MESSAGE: 0,
            MAX_MAX_CARDS_PER_MESSAGE: 20,
            effectsEnabledDraft: true,
            themeModeDraft: 'dark',
            fontSizeAdjustmentDraft: 0,
            forceMobileLayoutDraft: false,
            debugEnabledDraft: false,
            collapseModeEnabledDraft: false,
            levelGapCollapseEnabledDraft: false,
            collapseRuleFields: ['种族', '姓名'],
            collapseRuleGroups: [
              { label: '始终展开', rules: [] },
              { label: '自动折叠', rules: [] },
            ],
            imageSourcePriorityEnabledDraft: false,
            imageSourcePriorityDraft: ['files.catbox.moe', 'i.ibb.co', 'images.example.test'],
            useBaiBaiDraft: false,
            autoGeneratePortraitsDraft: false,
            portraitRewriteInstructionsDraft: 'Design a memorable vertical illustration.',
            portraitOptionsDraft: { independentApi: false, profileId: '', common: '', anima: '', nai: '', positive: '', negative: '' },
            portraitConnections: [{ id: 'portrait-test', name: '测试连接' }],
            portraitPromptFields: [{ key: 'positive', label: '固定正面提示词', hint: '', rows: 3 }],
            portraitHistory: [],
            portraitImageHistory: [],
            diagnosticRunning: false,
            diagnosticError: '',
            diagnosticReport: null,
            settingsMessage: '',
          }),
          computed: {
            activeSettingsLabel() {
              return settingsSections.find(section => section.id === this.activeSettingsSection)?.label;
            },
          },
          methods: {
            managerThemeClass: (theme: string) => 'char-info-theme-' + theme,
            settingsPanelId: (section: string) => 'char-info-settings-panel-' + section,
            selectSettingsSection(section: string) {
              this.activeSettingsSection = section;
              (this.$refs.settingsContent as HTMLElement).scrollTo({ top: 0 });
            },
            applySettings() {
              this.settingsMessage = '设置已保存并立即应用。';
              this.state.settings.themeMode = this.themeModeDraft;
            },
            addCollapseRule(rules: { path: string; condition: string; value: string }[]) {
              rules.push({ path: '种族', condition: 'equals', value: '' });
            },
            removeCollapseRule(rules: unknown[], index: number) { rules.splice(index, 1); },
            refreshPortraitConnections() {},
            toggleImageSourcePriority() {},
            openProfileEditorFromWizard() {},
            restorePortraitRewriteInstructions() {},
            moveImageSourcePriority() {},
            removeImageSourcePriority() {},
            useRecommendedImageSourcePriority() {},
            addImageSourcePriority() {},
            runDiagnostics() {},
            resetSettings() {},
            onCloseSettings() {},
          },
        }).mount('#settings');
      }, template);

      const dialog = page.getByRole('dialog');
      const navigation = page.getByRole('navigation', { name: '设置分类' });
      const initialBounds = await dialog.boundingBox();
      assert.ok(initialBounds);
      assert.equal(await navigation.getByRole('button', { name: '管理库' }).getAttribute('aria-current'), 'true');
      await page.getByLabel('界面主题').selectOption('light');
      assert.equal(await page.getByRole('status').textContent(), '设置已保存并立即应用。');
      assert.ok(await page.locator('.char-info-theme-light').isVisible());
      await page.getByLabel('界面主题').selectOption('dark');

      assert.equal(await page.getByRole('link', { name: '登录 ImgBed' }).getAttribute('href'), 'https://imgbed.uika.cc.cd/account/');
      await page.getByRole('switch', { name: '启用图片来源优先级' }).check();
      assert.ok(await page.getByRole('textbox', { name: '第 1 个图片网站' }).isVisible());
      await navigation.getByRole('button', { name: '渲染与性能' }).click();
      assert.ok(await page.getByLabel('显示楼层数').isVisible());
      assert.equal(await page.getByRole('spinbutton', { name: /单层最大渲染数量/ }).inputValue(), '0');
      assert.equal(await page.getByLabel('界面主题').isVisible(), false);
      await navigation.getByRole('button', { name: '界面与外观' }).click();
      await page.getByRole('switch', { name: '启用角色卡折叠模式' }).check();
      await page.getByRole('button', { name: '添加规则' }).first().click();
      await page.getByRole('combobox', { name: /始终展开.*条件/ }).selectOption('includes');
      await page.getByRole('textbox', { name: /始终展开.*值/ }).fill('精灵');
      assert.equal(await page.getByRole('combobox', { name: /始终展开.*条件/ }).inputValue(), 'includes');

      await navigation.getByRole('button', { name: '文生图' }).click();
      const auto = page.getByRole('checkbox', { name: /自动生成新 NPC 的立绘/ });
      assert.ok(await auto.isDisabled());
      await page.getByRole('switch', { name: '连接柏宝绘' }).check();
      assert.equal(await auto.isDisabled(), false);
      await page.getByRole('switch', { name: /独立 API/ }).check();
      await page.getByRole('combobox', { name: /API 配置/ }).selectOption('portrait-test');
      assert.ok(await page.getByText('提示词历史', { exact: true }).isVisible());
      assert.ok(await page.getByText('图片历史', { exact: true }).isVisible());
      assert.equal(await page.getByText(/智绘姬/).count(), 0);
      if (width === 1680 && process.env.CHARINFO_SETTINGS_SCREENSHOT) {
        await dialog.screenshot({ path: process.env.CHARINFO_SETTINGS_SCREENSHOT });
      }

      const layout = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>('.char-info-settings-nav')!;
        const fields = document.querySelector<HTMLElement>('.char-info-settings-fields')!;
        const first = nav.firstElementChild!.getBoundingClientRect();
        const last = nav.lastElementChild!.getBoundingClientRect();
        return {
          navRight: nav.getBoundingClientRect().right,
          fieldsLeft: fields.getBoundingClientRect().left,
          verticalNavigation: last.top > first.top,
          horizontalOverflow: Math.max(fields.scrollWidth - fields.clientWidth, document.documentElement.scrollWidth - window.innerWidth),
          visiblePanels: [...document.querySelectorAll<HTMLElement>('.char-info-settings-panel')].filter(panel => panel.offsetWidth > 0).length,
        };
      });
      assert.equal(layout.visiblePanels, 1);
      assert.ok(layout.horizontalOverflow <= 1, JSON.stringify(layout));
      if (width > 720) {
        assert.ok(initialBounds.width >= 900);
        assert.equal(layout.verticalNavigation, true);
        assert.ok(layout.navRight <= layout.fieldsLeft + 1);
      } else {
        assert.equal(initialBounds.width, width);
        assert.equal(layout.verticalNavigation, false);
      }

      await navigation.getByRole('button', { name: '调试' }).click();
      assert.ok(await page.getByRole('button', { name: '运行诊断' }).isVisible());
      assert.ok(await page.getByRole('checkbox', { name: /调试日志/ }).isVisible());
      assert.deepEqual(await dialog.boundingBox(), initialBounds);
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });
}
