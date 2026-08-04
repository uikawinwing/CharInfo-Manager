import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../../src/char_info_creator_manager/App.vue', import.meta.url), 'utf8');

test('桌面独立打开的世界书角色库不会套用详情侧栏的窄屏尺寸', () => {
  assert.doesNotMatch(
    appSource,
    /(?:^|\n)\.manager-dialog\.library-dialog\s*\{\s*width: min\(390px, calc\(100% - 16px\)\);/u,
  );
  assert.match(
    appSource,
    /\.library-detail-open \.manager-dialog\.library-dialog\s*\{\s*width: min\(390px, calc\(100% - 16px\)\);/u,
  );
});

test('桌面角色库将工具组固定在右上角，并在内容滚动时保留筛选工具栏', () => {
  assert.match(
    appSource,
    /\.library-header \.header-actions\s*\{\s*grid-column: 3;\s*grid-row: 1;/u,
  );
  assert.match(
    appSource,
    /\.library-header \.character-source-switch\s*\{\s*grid-column: 1 \/ -1;\s*grid-row: 2;/u,
  );
  assert.match(
    appSource,
    /\.character-library-toolbar\s*\{[\s\S]*?position: sticky;[\s\S]*?top: 0;/u,
  );
});
