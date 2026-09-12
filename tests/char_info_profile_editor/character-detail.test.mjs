import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const librarySource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/WorldbookCharacterLibrary.vue', import.meta.url),
  'utf8',
);
const runtimeSource = readFileSync(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');

test('点击世界书角色库中的角色先打开 Viewer 详情', () => {
  assert.match(librarySource, /@click="openDetails\(character\)"/u);
  assert.match(librarySource, /v-if="detailCharacter"/u);
  assert.match(librarySource, /角色条目内容/u);
  assert.match(librarySource, /\{\{ detailEntryBody \|\|/u);
  assert.doesNotMatch(librarySource, /v-html="detailEntryBody"/u);
});

test('Viewer 详情展示图库并让视频按 hover 或触屏单实例播放', () => {
  assert.match(librarySource, /const remote = remotePresentations\[character\.key\]/u);
  assert.match(librarySource, /if \(remote\) return remote\.gallery/u);
  assert.match(librarySource, /return character\.profile\.gallery/u);
  assert.match(librarySource, /resolveRemoteGalleryPresentation/u);
  assert.match(librarySource, /item\.media\?\.kind === 'video'/u);
  assert.match(librarySource, /v-if="activeDetailVideoIndex === item\.sourceIndex"/u);
  assert.match(librarySource, /v-else[\s\S]*?class="character-detail-video-preview"/u);
  assert.match(librarySource, /:poster="item\.poster \|\| undefined"/u);
  assert.match(librarySource, /function videoPoster\(image: GalleryImage\): string[\s\S]*?image\.thumbnail \?\? ''[\s\S]*?media\?\.kind === 'image'/u);
  assert.match(librarySource, /setDetailVideoPreviewCanvas\(item\.sourceIndex, item\.media\.url, element\)/u);
  assert.match(librarySource, /document\.createElement\('video'\)/u);
  assert.match(librarySource, /video\.addEventListener\(\s*'loadeddata'/u);
  assert.match(librarySource, /video\.addEventListener\('seeked'/u);
  assert.match(librarySource, /context\.drawImage\(video,/u);
  assert.match(librarySource, /detailVideoPreviewReady\.add\(index\)/u);
  assert.match(librarySource, /class="character-detail-media-kind" aria-hidden="true">▶<\/span>/u);
  assert.match(librarySource, /\.character-detail-media-kind \{[^}]*top: 7px;[^}]*right: 7px;[^}]*width: 22px;[^}]*height: 22px;/u);
  assert.match(librarySource, /\.character-detail-video-preview \{[^}]*width: 100%;[^}]*height: 100%;/u);
  assert.match(librarySource, /\.character-detail-video-canvas\.ready \{ opacity: 1; \}/u);
  assert.doesNotMatch(librarySource, /<video\s+v-if="item\.media\?\.kind === 'video'"/u);
  assert.doesNotMatch(librarySource, /\n\s+controls\s*\n/u);
  assert.match(librarySource, /preload="metadata"/u);
  assert.match(librarySource, /@pointerenter="onDetailVideoPointerEnter\(item\.sourceIndex, \$event\)"/u);
  assert.match(librarySource, /@pointerup="onDetailVideoPointerUp\(item\.sourceIndex, \$event\)"/u);
  assert.match(librarySource, /async function playDetailVideo\(index: number\)[\s\S]*?activeDetailVideoIndex\.value = index;[\s\S]*?await nextTick\(\);[\s\S]*?video\.play\(\)/u);
  assert.match(librarySource, /new IntersectionObserver[\s\S]*?pauseDetailVideo\(index\)/u);
  assert.match(librarySource, /function closeDetails\(\)[\s\S]*?pauseAllDetailVideos\(\)/u);
  assert.match(librarySource, /@error="advanceDetailMedia\(item\.sourceIndex\)"/u);
  assert.match(librarySource, /detailGalleryIndexes\[key\] = \(detailGalleryIndexes\[key\] \?\? 0\) \+ 1/u);
});

test('只有编辑角色档案才从角色查看器调用 Profile Editor controller', () => {
  assert.match(
    librarySource,
    /@click="emit\('edit', detailCharacter\.worldbookName, detailCharacter\.entry\.uid\)"/u,
  );
  assert.match(runtimeSource, /openProfileEditor\(\{[\s\S]*?worldbookName,[\s\S]*?entryUid,[\s\S]*?forceMobileLayout:/u);
  assert.doesNotMatch(runtimeSource, /getProfileEditorHostBridge|profileEditor\.open/u);
});

test('玩家详情保持世界书正文只读，不在 Viewer 中写角色资料', () => {
  assert.match(librarySource, /<h3 id="character-detail-content-title">角色条目内容<\/h3>[\s\S]*?<b>只读<\/b>/u);
  assert.doesNotMatch(librarySource, /replaceCharacterEntryBody/u);
  assert.doesNotMatch(librarySource, /v-model="detailEntryDraft"/u);
});
