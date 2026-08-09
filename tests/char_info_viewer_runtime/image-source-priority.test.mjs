import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  normalizeImageSourcePriorityEntries,
  prioritizeImageSourceGroups,
  prioritizeImageSources,
} from '../../src/char_info_viewer/services/imageSourcePriority.ts';
import { mergeRuntimeSettings, readRuntimeSettings } from '../../src/char_info_viewer_runtime/runtimeSettings.ts';

const runtimeRootSource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url),
  'utf8',
);

test('按用户域名优先级稳定重排同一图片的镜像来源', () => {
  const sources = [
    'https://i.ibb.co/example/portrait.webp',
    'https://files.catbox.moe/portrait.webp',
    'https://cdn.example.com/portrait.webp',
  ];

  assert.deepEqual(prioritizeImageSources(sources, ['catbox.moe', 'i.ibb.co']), [
    'https://files.catbox.moe/portrait.webp',
    'https://i.ibb.co/example/portrait.webp',
    'https://cdn.example.com/portrait.webp',
  ]);
  assert.deepEqual(sources, [
    'https://i.ibb.co/example/portrait.webp',
    'https://files.catbox.moe/portrait.webp',
    'https://cdn.example.com/portrait.webp',
  ]);
});

test('无匹配时保留作者原顺序，且不重排不同图片', () => {
  const groups = [
    ['https://one.example/a.webp', 'https://two.example/a.webp'],
    ['https://i.ibb.co/b.webp', 'https://files.catbox.moe/b.webp'],
  ];

  assert.deepEqual(prioritizeImageSourceGroups(groups, ['unmatched.example']), groups);
  assert.deepEqual(prioritizeImageSourceGroups(groups, ['catbox.moe']), [
    ['https://one.example/a.webp', 'https://two.example/a.webp'],
    ['https://files.catbox.moe/b.webp', 'https://i.ibb.co/b.webp'],
  ]);
});

test('完整 URL 会提取 hostname，域名规则可匹配子域名并丢弃无效模式', () => {
  assert.deepEqual(
    normalizeImageSourcePriorityEntries([
      'https://files.catbox.moe/path/portrait.webp',
      'I.ibb.co',
      '*.example.com',
      'images.example.com/path',
      'https://i.ibb.co/duplicate.webp',
    ]),
    { priorities: ['files.catbox.moe', 'i.ibb.co'], rejectedCount: 2 },
  );
  assert.deepEqual(prioritizeImageSources(['https://files.catbox.moe/portrait.webp'], ['catbox.moe']), [
    'https://files.catbox.moe/portrait.webp',
  ]);
});

test('图片源优先级随既有 char_info_runtime.settings 持久化，且保留其他脚本数据', () => {
  const merged = mergeRuntimeSettings(
    { unrelated: true, char_info_runtime: { cacheVersion: 3 } },
    {
      activeFloorLimit: 8,
      effectsEnabled: false,
      imageSourcePriorityEnabled: true,
      imageSourcePriority: ['https://files.catbox.moe/image.webp'],
    },
  );

  assert.deepEqual(readRuntimeSettings(merged), {
    activeFloorLimit: 8,
    effectsEnabled: false,
    forceMobileLayout: false,
    imageSourcePriorityEnabled: true,
    imageSourcePriority: ['files.catbox.moe'],
  });
  assert.equal(merged.unrelated, true);
  assert.equal(merged.char_info_runtime.cacheVersion, 3);
});

test('旧版已填写优先级会自动保持启用，空设置使用关闭的推荐示例', () => {
  assert.equal(
    readRuntimeSettings({ char_info_runtime: { settings: { imageSourcePriority: ['catbox.moe'] } } })
      .imageSourcePriorityEnabled,
    true,
  );
  assert.deepEqual(readRuntimeSettings({}).imageSourcePriority, ['files.catbox.moe', 'i.ibb.co']);
  assert.equal(readRuntimeSettings({}).imageSourcePriorityEnabled, false);
});

test('图片来源优先级使用开关和逐项表单，不暴露自由文本配置', () => {
  assert.match(runtimeRootSource, /v-model="imageSourcePriorityEnabledDraft"/u);
  assert.match(runtimeRootSource, /v-for="\(priority, index\) in imageSourcePriorityDraft"/u);
  assert.match(runtimeRootSource, /添加图片来源/u);
  assert.match(runtimeRootSource, /使用推荐顺序/u);
  assert.match(runtimeRootSource, /上移/u);
  assert.match(runtimeRootSource, /下移/u);
  assert.doesNotMatch(runtimeRootSource, /id="char-info-image-source-priority"[\s\S]*?<textarea/u);
});
