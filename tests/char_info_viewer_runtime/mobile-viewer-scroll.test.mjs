import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeEntrySource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/index.ts', import.meta.url),
  'utf8',
);
const mobileScrollSource = readFileSync(
  new URL('../../src/char_info_viewer_runtime/mobileViewerScroll.css', import.meta.url),
  'utf8',
);

test('手机版普通角色详情由 Viewer 根节点接管纵向滚动', () => {
  assert.match(runtimeEntrySource, /import '\.\/mobileViewerScroll\.css';/u);
  assert.match(
    mobileScrollSource,
    /@media \(max-width: 720px\)[\s\S]*?\.char-info-library-viewer > \.viewer-root:not\(\.special-npc-viewer-root\)[\s\S]*?overflow-y:\s*auto;/u,
  );
  assert.match(
    mobileScrollSource,
    /\.char-info-library-overlay\.force-mobile-layout[\s\S]*?> \.viewer-root:not\(\.special-npc-viewer-root\)[\s\S]*?overflow-y:\s*auto;/u,
  );
  assert.match(mobileScrollSource, /overscroll-behavior-y:\s*contain;/u);
});

test('Special NPC 保持固定视口，不被普通卡滚动补丁接管', () => {
  assert.match(mobileScrollSource, /:not\(\.special-npc-viewer-root\)/u);
  assert.doesNotMatch(
    mobileScrollSource,
    /\.viewer-root\.special-npc-viewer-root\s*\{[^}]*overflow-y:\s*auto;/u,
  );
});

test('桌面 Force Mobile 普通卡从顶部开始滚动，避免居中导致顶部内容不可达', () => {
  assert.match(
    mobileScrollSource,
    /@media \(min-width: 721px\)[\s\S]*?\.char-info-library-overlay\.force-mobile-layout[\s\S]*?> \.viewer-root:not\(\.special-npc-viewer-root\)[\s\S]*?align-items:\s*flex-start;/u,
  );
});
