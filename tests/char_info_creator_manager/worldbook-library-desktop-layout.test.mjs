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

test('手机角色库将状态筛选收进箭头菜单，并将视图切换收为图标', () => {
  assert.match(
    appSource,
    /\.library-header \.manager-view-switch button:first-child\s*\{\s*display: none;/u,
  );
  assert.match(
    appSource,
    /\.library-header \.manager-view-switch button:nth-child\(2\) svg\s*\{\s*display: block;/u,
  );
  assert.match(appSource, /class="mobile-character-library-filter"/u);
  assert.match(appSource, /mobileCharacterLibraryFilterOpen/u);
  assert.match(appSource, /@click="setMobileCharacterLibraryFilter\(option\.value\)"/u);
  assert.match(appSource, /\.mobile-character-library-filter\s*\{[\s\S]*?display: block;/u);
  assert.match(appSource, /\.character-library-filter-buttons\s*\{\s*display: none;/u);
  assert.match(
    appSource,
    /\.character-library-control-row\s*\{\s*grid-template-columns: 96px minmax\(0, 1fr\) auto;/u,
  );
  assert.match(appSource, /\.character-library-layout-switch span\s*\{\s*display: none;/u);
  assert.match(appSource, /\.character-card-columns\s*\{\s*display: none;/u);
});

test('手机角色库缩短列表卡片，避免工具栏挤掉可阅读的角色数量', () => {
  assert.match(
    appSource,
    /\.character-library-card\s*\{\s*min-height: 82px;\s*padding: 8px;\s*grid-template-columns: 58px minmax\(0, 1fr\) auto;/u,
  );
  assert.match(appSource, /\.character-cover-button\s*\{\s*width: 58px;\s*height: 64px;/u);
});
