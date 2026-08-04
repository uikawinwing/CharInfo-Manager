import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const runtimeSource = await readFile(new URL('../../src/char_info_viewer_runtime/runtime.ts', import.meta.url), 'utf8');
const runtimeRootSource = await readFile(
  new URL('../../src/char_info_viewer_runtime/RuntimeRoot.vue', import.meta.url),
  'utf8',
);
const viewerSource = await readFile(new URL('../../src/char_info_viewer/App.vue', import.meta.url), 'utf8');
const overlaySource = await readFile(
  new URL('../../src/char_info_creator_manager/overlay.ts', import.meta.url),
  'utf8',
).catch(() => '');
const creatorManagerSource = await readFile(
  new URL('../../src/char_info_creator_manager/App.vue', import.meta.url),
  'utf8',
);
const creatorManagerEntrySource = await readFile(
  new URL('../../src/char_info_creator_manager/index.ts', import.meta.url),
  'utf8',
);

test('主 CharInfo 运行脚本将世界书角色库入口放入当前角色菜单', () => {
  assert.doesNotMatch(runtimeSource, /appendInexistentScriptButtons/u);
  assert.doesNotMatch(runtimeSource, /getButtonEvent\('世界书角色库'\)/u);
  assert.match(runtimeSource, /setManagerOwnership\('runtime'\)/u);
  assert.match(runtimeSource, /setManagerOwnership\(null\)/u);
  assert.match(creatorManagerEntrySource, /'世界书角色库'/u);
  assert.doesNotMatch(creatorManagerEntrySource, /createCreatorManagerOverlay/u);
  assert.match(runtimeRootSource, /当前聊天角色/u);
  assert.match(runtimeRootSource, /世界书角色/u);
  assert.match(runtimeRootSource, /aria-label="打开世界书角色库"[\s\S]*?@click="props\.onOpenWorldbookLibrary"/u);
});

test('角色资料与角色菜单是独立窗口：选择角色和切换世界书不会关闭当前菜单', () => {
  const openCharacter = runtimeSource.match(/const openLibraryCharacter = \(name: string\) => \{([\s\S]*?)\n\s{2}\};/u)?.[1] ?? '';
  const openWorldbook = runtimeSource.match(/const openWorldbookLibrary = \(\) => \{([\s\S]*?)\n\s{2}\};/u)?.[1] ?? '';

  assert.match(openCharacter, /library\.listOpen = true;/u);
  assert.match(openCharacter, /library\.viewerOpen = true;/u);
  assert.doesNotMatch(openCharacter, /library\.listOpen = false;/u);
  assert.doesNotMatch(openWorldbook, /closeLibrary\(\);/u);
  assert.match(openWorldbook, /closeLibraryList\(\);/u);
  assert.match(
    runtimeSource,
    /createCreatorManagerOverlay\('library', \{[\s\S]*?onOpenCurrentChatLibrary: \(\) => \{[\s\S]*?worldbookManager\.close\(\);[\s\S]*?openLibraryList\(\);/u,
  );
  assert.match(runtimeRootSource, /@click="closeListWindow"/u);
  assert.match(runtimeRootSource, /@click="closeViewerWindow"/u);
  assert.match(runtimeRootSource, /onCloseLibraryList: \(\) => void;/u);
  assert.match(runtimeRootSource, /onCloseLibraryViewer: \(\) => void;/u);
  assert.match(runtimeRootSource, /class="char-info-library-list-dialog"[\s\S]*?'with-viewer'/u);
  assert.match(runtimeRootSource, /class="char-info-library-overlay"[\s\S]*?'with-list'/u);
});

test('角色视觉编辑器通过独立全屏 iframe 打开，避免 ST 层级和滚动污染', () => {
  assert.match(runtimeSource, /worldbookManager/u);
  assert.match(
    runtimeSource,
    /import \{ createCreatorManagerOverlay \} from '\.\.\/char_info_creator_manager\/overlay';/u,
  );
  assert.doesNotMatch(runtimeSource, /import\('\.\.\/char_info_creator_manager\/overlay'\)/u);
  assert.doesNotMatch(runtimeSource, /worldbookManagerLoad|managerOpenRevision/u);
  assert.match(runtimeSource, /tavern_events\.CHAT_CHANGED[\s\S]*?destroyWorldbookManager\(\);/u);
  assert.match(runtimeSource, /stop\(\) \{[\s\S]*?destroyWorldbookManager\(\);/u);
  assert.doesNotMatch(runtimeSource, /creatorEditor/u);
  assert.doesNotMatch(runtimeSource, /worldbookLibrary/u);

  assert.doesNotMatch(runtimeRootSource, /CreatorManager/u);
  assert.doesNotMatch(runtimeRootSource, /state\.creator/u);

  assert.match(overlaySource, /createScriptIdIframe/u);
  assert.match(overlaySource, /zIndex: '2147483000'/u);
  assert.match(overlaySource, /srcdoc: MANAGER_IFRAME_SRCDOC/u);
  assert.match(overlaySource, /teleportStyle\(iframeDocument\.head\)/u);
  assert.match(overlaySource, /visualViewport/u);
  assert.match(overlaySource, /removeEventListener\('scroll'/u);
});

test('世界书角色库关闭后复用已挂载界面，聊天切换与运行时停止才彻底销毁', () => {
  assert.match(overlaySource, /destroy\(\): void;/u);
  assert.match(
    overlaySource,
    /const close = \(\) => \{[\s\S]*?managerViewportCleanup\?\.\(\);[\s\S]*?\$managerOverlay\?\.hide\(\);[\s\S]*?\};/u,
  );
  assert.doesNotMatch(
    overlaySource.match(/const close = \(\) => \{[\s\S]*?\n {2}\};/u)?.[0] ?? '',
    /unmount\(\)|teleportedStyle\?\.destroy\(\)|\.remove\(\)/u,
  );
  assert.match(
    overlaySource,
    /const destroy = \(\) => \{[\s\S]*?mountedApp\?\.unmount\(\);[\s\S]*?teleportedStyle\?\.destroy\(\);[\s\S]*?\$managerOverlay\?\.remove\(\);/u,
  );
  assert.match(
    overlaySource,
    /if \(\$managerOverlay\) \{[\s\S]*?\$managerOverlay\.show\(\);[\s\S]*?startManagerViewportSync\(\);[\s\S]*?return;/u,
  );

  assert.match(runtimeSource, /const destroyWorldbookManager = \(\) => \{\s*worldbookManager\.destroy\(\);\s*\};/u);
  assert.match(
    runtimeSource,
    /tavern_events\.CHAT_CHANGED[\s\S]*?destroyWorldbookManager\(\);[\s\S]*?resetLibraryForChat\(\);/u,
  );
  assert.match(runtimeSource, /stop\(\) \{[\s\S]*?destroyWorldbookManager\(\);/u);
  assert.match(runtimeSource, /onOpenCurrentChatLibrary:[\s\S]*?worldbookManager\.close\(\);[\s\S]*?openLibraryList\(\);/u);
});

test('世界书管理器打进主运行脚本，不依赖浏览器无法解析的裸 chunk 路径', () => {
  assert.match(runtimeSource, /const worldbookManager = createCreatorManagerOverlay\('library'(?:,\s*\{)?/u);
  assert.doesNotMatch(runtimeSource, /Promise<CreatorManagerOverlay>|\.then\(manager =>/u);
});

test('Creator Manager 样式不修改 ST 宿主页的 html 或 body', () => {
  assert.doesNotMatch(creatorManagerSource, /:global\(html\)/u);
  assert.doesNotMatch(creatorManagerSource, /:global\(body\)/u);
  assert.match(creatorManagerSource, /:global\(#char-info-creator-manager\)[\s\S]*?width: 100%;[\s\S]*?height: 100%;/u);
  assert.match(creatorManagerSource, /\.manager-root \{[\s\S]*?font-family:/u);
});

test('当前聊天资料库和设置宿主明确使用动态视口尺寸，避免 ST 移动端 html 高度为零', () => {
  assert.match(
    runtimeRootSource,
    /\.char-info-library-host,[\s\S]*?\.char-info-settings-host \{[\s\S]*?width: 100dvw;[\s\S]*?height: 100dvh;/u,
  );
  assert.match(runtimeRootSource, /\.char-info-settings-backdrop \{[\s\S]*?overflow: auto;/u);
});

test('当前聊天资料库由悬浮入口打开角色列表，并完整显示角色立绘', () => {
  assert.match(runtimeRootSource, /class="char-info-library-floating-button"/u);
  assert.doesNotMatch(
    runtimeRootSource,
    /v-if="state\.library\.characters\.length > 0 && !state\.library\.listOpen && !state\.library\.viewerOpen"/u,
  );
  assert.match(runtimeRootSource, /state\.library\.unreadCharacterNames\.length/u);
  assert.match(runtimeRootSource, /class="char-info-library-list-dialog"/u);
  assert.match(
    runtimeRootSource,
    /\.char-info-library-list-backdrop \{[\s\S]*?position: absolute;[\s\S]*?inset: 0;[\s\S]*?pointer-events: none;/u,
  );
  assert.match(
    runtimeRootSource,
    /ref="listWindowRef"[\s\S]*?:style="listWindowStyle"[\s\S]*?@pointerdown="beginListWindowDrag"/u,
  );
  assert.match(
    runtimeRootSource,
    /\.char-info-library-list-dialog \{[\s\S]*?position: absolute;[\s\S]*?transform: translate\(-50%, -50%\);[\s\S]*?pointer-events: auto;/u,
  );
  assert.match(
    runtimeRootSource,
    /\.char-info-library-list-dialog \{[\s\S]*?width: min\(390px,[\s\S]*?height: min\(680px,/u,
  );
  assert.match(runtimeRootSource, /♡\s*\{\{ character\.affinity/u);
  assert.match(runtimeRootSource, /:entrance-quote-override="selectedCharacter\.innerThought"/u);
  assert.match(
    runtimeRootSource,
    /@media \(max-width: 720px\) \{[\s\S]*?\.char-info-library-list-dialog \{[\s\S]*?width: calc\(100% - 16px\);/u,
  );
  assert.match(
    runtimeRootSource,
    /@media \(max-width: 720px\) \{[\s\S]*?\.char-info-library-overlay \{[\s\S]*?inset: 0 !important;[\s\S]*?width: 100%;[\s\S]*?height: 100%;/u,
  );
  assert.match(
    runtimeRootSource,
    /@media \(max-width: 720px\) \{[\s\S]*?\.char-info-library-viewer \{[\s\S]*?overflow-y: auto;/u,
  );
  assert.match(runtimeRootSource, /\.char-info-library-viewer \.illustrated-shell \{[\s\S]*?height: 216\.4251cqw !important;/u);
  assert.match(
    runtimeRootSource,
    /\.char-info-library-viewer \.illustrated-portrait-image,[\s\S]*?\.char-info-library-viewer \.portrait-image \{[\s\S]*?object-fit: contain;/u,
  );
  assert.match(
    viewerSource,
    /props\.entranceQuoteOverride === undefined[\s\S]*?\.\.\.resolvedData,[\s\S]*?登场台词: props\.entranceQuoteOverride/u,
  );
});

test('角色详情是在聊天上方可拖动的非模态窗口，不显示开发说明', () => {
  assert.match(runtimeRootSource, /ref="viewerWindowRef"[\s\S]*?:style="viewerWindowStyle"/u);
  assert.match(runtimeRootSource, /@pointerdown="beginViewerWindowDrag"/u);
  assert.match(runtimeRootSource, /function clampViewerWindowPosition/u);
  assert.match(
    runtimeRootSource,
    /\.char-info-library-overlay \{[\s\S]*?position: absolute;[\s\S]*?width: min\(1240px,[\s\S]*?height: min\(892px,[\s\S]*?transform: translate\(-50%, -50%\);/u,
  );
  assert.match(
    runtimeRootSource,
    /\.char-info-library-viewer \{[\s\S]*?overflow-x: hidden;[\s\S]*?overflow-y: auto;[\s\S]*?padding: 12px;/u,
  );
  assert.match(runtimeRootSource, /class="char-info-library-list-action"[\s\S]*?<svg/u);
  assert.match(runtimeRootSource, /class="char-info-library-icon-action char-info-library-close-action"/u);
  assert.doesNotMatch(runtimeRootSource, /CURRENT CHAT(?: ARCHIVE)?|资料与心里话均读取自最新消息变量/u);
});

test('当前聊天角色库不再注册旧脚本按钮，并按角色清除好感度未读状态', () => {
  assert.doesNotMatch(runtimeSource, /appendInexistentScriptButtons\([\s\S]*CURRENT_LIBRARY_BUTTON_NAME/u);
  assert.doesNotMatch(runtimeSource, /getButtonEvent\(CURRENT_LIBRARY_BUTTON_NAME\)/u);
  assert.match(runtimeSource, /collectChangedAffinityNames/u);
  assert.match(runtimeSource, /unreadCharacterNames\s*=\s*library\.unreadCharacterNames\.filter/u);
});

test('主运行脚本会移除已经失效的旧角色视觉编辑按钮', () => {
  assert.match(runtimeSource, /const LEGACY_CREATOR_BUTTON_NAME = '角色视觉编辑'/u);
  assert.match(runtimeSource, /button\.name !== CREATOR_BUTTON_NAME/u);
  assert.match(runtimeSource, /button\.name !== LEGACY_CREATOR_BUTTON_NAME/u);
  assert.match(runtimeSource, /button\.name !== LEGACY_CURRENT_LIBRARY_BUTTON_NAME/u);
  assert.match(runtimeSource, /button\.name !== SETTINGS_BUTTON_NAME/u);
});
