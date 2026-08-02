import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeImageSourcePriorityEntries,
  prioritizeImageSourceGroups,
  prioritizeImageSources,
} from '../../src/char_info_viewer/services/imageSourcePriority.ts';
import { mergeRuntimeSettings, readRuntimeSettings } from '../../src/char_info_viewer_runtime/runtimeSettings.ts';

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
    { activeFloorLimit: 8, effectsEnabled: false, imageSourcePriority: ['https://files.catbox.moe/image.webp'] },
  );

  assert.deepEqual(readRuntimeSettings(merged), {
    activeFloorLimit: 8,
    effectsEnabled: false,
    imageSourcePriority: ['files.catbox.moe'],
  });
  assert.equal(merged.unrelated, true);
  assert.equal(merged.char_info_runtime.cacheVersion, 3);
});
