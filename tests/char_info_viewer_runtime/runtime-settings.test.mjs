import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  defaultRuntimeSettings,
  mergeRuntimeFloatingButtonPosition,
  mergeRuntimeSettings,
  normalizeRuntimeSettings,
  readRuntimeFloatingButtonPosition,
  readRuntimeSettings,
} from '../../src/char_info_viewer_runtime/runtimeSettings.ts';

test('运行时设置使用稳定默认值并修复越界输入', () => {
  assert.deepEqual(defaultRuntimeSettings(), {
    activeFloorLimit: 6,
    maxCardsPerMessage: 4,
    unlimitedCardsPerMessage: false,
    effectsEnabled: true,
    forceMobileLayout: false,
    themeMode: 'dark',
    fontSizeAdjustment: 0,
    debugEnabled: false,
    collapseModeEnabled: false,
    alwaysExpandRules: '',
    autoCollapseRules: '',
    levelGapCollapseEnabled: false,
    levelGapCollapseThreshold: 5,
    imageSourcePriorityEnabled: false,
    imageSourcePriority: ['files.catbox.moe', 'i.ibb.co'],
  });
  assert.deepEqual(
    normalizeRuntimeSettings({
      activeFloorLimit: 99,
      effectsEnabled: 'false',
    }),
    {
      activeFloorLimit: 6,
      maxCardsPerMessage: 4,
      unlimitedCardsPerMessage: false,
      effectsEnabled: true,
      forceMobileLayout: false,
      themeMode: 'dark',
      fontSizeAdjustment: 0,
      debugEnabled: false,
      collapseModeEnabled: false,
      alwaysExpandRules: '',
      autoCollapseRules: '',
      levelGapCollapseEnabled: false,
      levelGapCollapseThreshold: 5,
      imageSourcePriorityEnabled: false,
      imageSourcePriority: ['files.catbox.moe', 'i.ibb.co'],
    },
  );
  assert.deepEqual(
    normalizeRuntimeSettings({
      activeFloorLimit: '12',
      effectsEnabled: false,
      themeMode: 'light',
    }),
    {
      activeFloorLimit: 12,
      maxCardsPerMessage: 4,
      unlimitedCardsPerMessage: false,
      effectsEnabled: false,
      forceMobileLayout: false,
      themeMode: 'light',
      fontSizeAdjustment: 0,
      debugEnabled: false,
      collapseModeEnabled: false,
      alwaysExpandRules: '',
      autoCollapseRules: '',
      levelGapCollapseEnabled: false,
      levelGapCollapseThreshold: 5,
      imageSourcePriorityEnabled: false,
      imageSourcePriority: ['files.catbox.moe', 'i.ibb.co'],
    },
  );
});

test('切换界面主题会同步当前运行时 reactive state，避免浅色立即被旧深色状态覆盖', async () => {
  const runtimeSource = await readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');

  assert.match(runtimeSource, /state\.settings\.themeMode = nextSettings\.themeMode;/u);
});

test('文字大小设置可持久化，并限制在安全的角色卡字号范围', async () => {
  assert.equal(normalizeRuntimeSettings({ fontSizeAdjustment: '4' }).fontSizeAdjustment, 4);
  assert.equal(normalizeRuntimeSettings({ fontSizeAdjustment: -1 }).fontSizeAdjustment, -1);
  assert.equal(normalizeRuntimeSettings({ fontSizeAdjustment: 5 }).fontSizeAdjustment, 0);

  const [runtimeSource, runtimeRootSource, viewerSource] = await Promise.all([
    readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../src/char_info_viewer/App.vue', import.meta.url), 'utf8'),
  ]);
  assert.match(runtimeSource, /state\.settings\.fontSizeAdjustment = nextSettings\.fontSizeAdjustment;/u);
  assert.match(runtimeRootSource, /v-model\.number="fontSizeAdjustmentDraft"/u);
  assert.match(runtimeRootSource, /:font-size-adjustment="state\.settings\.fontSizeAdjustment"/u);
  assert.match(viewerSource, /--ci-font-size-adjust/u);
});

test('悬浮角色按钮位置作为脚本 UI 偏好独立保存', () => {
  const original = {
    unrelated: true,
    char_info_runtime: {
      settings: { activeFloorLimit: 6, effectsEnabled: true },
    },
  };
  const merged = mergeRuntimeFloatingButtonPosition(original, { left: 18, top: 240 });

  assert.deepEqual(readRuntimeFloatingButtonPosition(merged), { left: 18, top: 240 });
  assert.equal(merged.unrelated, true);
  assert.deepEqual(merged.char_info_runtime.settings, original.char_info_runtime.settings);
  assert.equal(
    readRuntimeFloatingButtonPosition({ char_info_runtime: { floatingButtonPosition: { left: 'x' } } }),
    null,
  );
});

test('运行时设置只读写脚本变量命名空间，并保留其他脚本数据', () => {
  const original = {
    unrelated: { keep: true },
    char_info_runtime: {
      cacheVersion: 3,
      settings: {
        activeFloorLimit: 8,
        effectsEnabled: false,
      },
    },
  };

  assert.deepEqual(readRuntimeSettings(original), {
    activeFloorLimit: 8,
    maxCardsPerMessage: 4,
    unlimitedCardsPerMessage: false,
    effectsEnabled: false,
    forceMobileLayout: false,
    themeMode: 'dark',
    fontSizeAdjustment: 0,
    debugEnabled: false,
    collapseModeEnabled: false,
    alwaysExpandRules: '',
    autoCollapseRules: '',
    levelGapCollapseEnabled: false,
    levelGapCollapseThreshold: 5,
    imageSourcePriorityEnabled: false,
    imageSourcePriority: ['files.catbox.moe', 'i.ibb.co'],
  });
  assert.deepEqual(
    mergeRuntimeSettings(original, {
      activeFloorLimit: 4,
      effectsEnabled: true,
    }),
    {
      unrelated: { keep: true },
      char_info_runtime: {
        cacheVersion: 3,
        settings: {
          activeFloorLimit: 4,
          maxCardsPerMessage: 4,
          unlimitedCardsPerMessage: false,
          effectsEnabled: true,
          forceMobileLayout: false,
          themeMode: 'dark',
          fontSizeAdjustment: 0,
          debugEnabled: false,
          collapseModeEnabled: false,
          alwaysExpandRules: '',
          autoCollapseRules: '',
          levelGapCollapseEnabled: false,
          levelGapCollapseThreshold: 5,
          imageSourcePriorityEnabled: false,
          imageSourcePriority: ['files.catbox.moe', 'i.ibb.co'],
        },
      },
    },
  );
});

test('折叠设置会规范化、保存并限制借过一下的等级差', () => {
  const settings = normalizeRuntimeSettings({
    collapseModeEnabled: true,
    alwaysExpandRules: '种族: 精灵',
    autoCollapseRules: '身份: 魔物',
    levelGapCollapseEnabled: true,
    levelGapCollapseThreshold: '8',
  });

  assert.equal(settings.collapseModeEnabled, true);
  assert.equal(settings.alwaysExpandRules, '种族: 精灵');
  assert.equal(settings.autoCollapseRules, '身份: 魔物');
  assert.equal(settings.levelGapCollapseEnabled, true);
  assert.equal(settings.levelGapCollapseThreshold, 8);

  assert.equal(normalizeRuntimeSettings({ levelGapCollapseThreshold: 0 }).levelGapCollapseThreshold, 5);
  assert.equal(normalizeRuntimeSettings({ levelGapCollapseThreshold: 100 }).levelGapCollapseThreshold, 5);

  const merged = mergeRuntimeSettings({}, settings);
  assert.equal(readRuntimeSettings(merged).alwaysExpandRules, '种族: 精灵');
  assert.equal(readRuntimeSettings(merged).autoCollapseRules, '身份: 魔物');
});
