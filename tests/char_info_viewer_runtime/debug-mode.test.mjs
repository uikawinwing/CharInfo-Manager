import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeRoot = readFileSync(new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const viewerApp = readFileSync(new URL('../../src/char_info_viewer/App.vue', import.meta.url), 'utf8');
const sheet = readFileSync(
  new URL('../../src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue', import.meta.url),
  'utf8',
);
const overlay = readFileSync(new URL('../../src/char_info_creator_manager/overlay.ts', import.meta.url), 'utf8');
const creatorApp = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');
const creatorGallery = readFileSync(
  new URL('../../src/char_info_creator_manager/components/GalleryStep.vue', import.meta.url),
  'utf8',
);

test('Debug 模式从运行时设置传入 Viewer 与 Creator，并默认不输出日志', () => {
  assert.match(runtimeRoot, /v-model="debugEnabledDraft"[\s\S]*?@change="applySettings"/u);
  assert.match(runtimeRoot, /:debug-enabled="state\.settings\.debugEnabled"/u);
  assert.match(runtime, /state\.settings\.debugEnabled = nextSettings\.debugEnabled/u);
  assert.match(runtime, /debugEnabled: state\.settings\.debugEnabled/u);
  assert.match(overlay, /debugEnabled: options\.debugEnabled \?\? false/u);
  assert.match(viewerApp, /debugEnabled\?: boolean/u);
  assert.match(viewerApp, /:debug-enabled="props\.debugEnabled"/u);
  assert.match(sheet, /if \(!props\.debugEnabled\) return;[\s\S]*?\[CharInfo\]\[ImageFallback\]\[Viewer\]/u);
  assert.match(creatorApp, /:debug-enabled="props\.debugEnabled"/u);
  assert.match(creatorGallery, /if \(!props\.debugEnabled\) return;[\s\S]*?\[CharInfo\]\[ImageFallback\]\[Creator\]/u);
});

test('Debug 日志覆盖尝试、失败、超时、切换、成功与全部失败', () => {
  for (const event of ['try', 'error', 'timeout', 'fallback', 'loaded', 'all_failed', 'retry']) {
    assert.match(sheet, new RegExp(`debugPortraitFallback\\('${event}'`, 'u'));
  }
  for (const event of ['try', 'error', 'timeout', 'fallback', 'loaded', 'all_failed']) {
    assert.match(creatorGallery, new RegExp(`debugGalleryPreview\\(image, '${event}'`, 'u'));
  }
});
