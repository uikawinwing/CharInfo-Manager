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
    debugEnabled: false,
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
      debugEnabled: false,
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
      debugEnabled: false,
      imageSourcePriorityEnabled: false,
      imageSourcePriority: ['files.catbox.moe', 'i.ibb.co'],
    },
  );
});

test('切换界面主题会同步当前运行时 reactive state，避免浅色立即被旧深色状态覆盖', async () => {
  const runtimeSource = await readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');

  assert.match(runtimeSource, /state\.settings\.themeMode = nextSettings\.themeMode;/u);
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
    debugEnabled: false,
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
          debugEnabled: false,
          imageSourcePriorityEnabled: false,
          imageSourcePriority: ['files.catbox.moe', 'i.ibb.co'],
        },
      },
    },
  );
});
