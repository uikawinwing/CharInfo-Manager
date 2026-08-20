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
const creatorManagerControllerSource = await readFile(
  new URL('../../src/char_info_creator_manager/controller.ts', import.meta.url),
  'utf8',
);
const creatorManagerIndexSource = await readFile(
  new URL('../../src/char_info_creator_manager/index.ts', import.meta.url),
  'utf8',
);
const legacyBridgeSource = await readFile(
  new URL('../../src/char_info_shared/creatorManagerHostBridge.ts', import.meta.url),
  'utf8',
);

test('Viewer 与 Creator 共用一个脚本，但 Viewer 只依赖窄 Creator controller', () => {
  assert.doesNotMatch(runtimeSource, /appendInexistentScriptButtons/u);
  assert.doesNotMatch(runtimeSource, /getButtonEvent\('世界书角色库'\)/u);
  assert.doesNotMatch(runtimeSource, /char_info_creator_manager\/overlay/u);
  assert.match(runtimeSource, /openCreatorManager/u);
  assert.match(runtimeSource, /closeCreatorManager/u);
  assert.doesNotMatch(runtimeSource, /getCreatorManagerHostBridge|registerCreatorManagerHostBridge/u);
  assert.match(creatorManagerControllerSource, /createCreatorManagerOverlay/u);
  assert.match(creatorManagerIndexSource, /export \{ closeCreatorManager, openCreatorManager \} from '\.\/controller';/u);
  assert.doesNotMatch(legacyBridgeSource, /__charInfoCreatorManagerHostBridge|registerCreatorManagerHostBridge/u);
  assert.match(runtimeRootSource, /<WorldbookCharacterLibrary/u);
  assert.match(runtimeRootSource, /当前聊天角色/u);
  assert.match(runtimeRootSource, /世界书角色/u);
});

test('当前聊天与世界书角色库由 Viewer 独立切换，不依赖 Creator 状态', () => {
  const openCharacter =
    runtimeSource.match(/const openLibraryCharacter = async \(name: string\) => \{([\s\S]*?)\n\s{2}\};/u)?.[1] ?? '';
  const openWorldbook = runtimeSource.match(/const openWorldbookLibrary = \(\) => \{([\s\S]*?)\n\s{2}\};/u)?.[1] ?? '';

  assert.match(openCharacter, /library\.listOpen = true;/u);
  assert.match(openCharacter, /library\.viewerOpen = true;/u);
  assert.doesNotMatch(openCharacter, /library\.listOpen = false;/u);
  assert.match(openWorldbook, /closeLibrary\(\);/u);
  assert.match(openWorldbook, /state\.library\.worldbookOpen = true/u);
  assert.doesNotMatch(openWorldbook, /openCreatorManager|closeCreatorManager/u);
  assert.match(
    runtimeSource,
    /const openCurrentChatLibrary = \(\) => \{[\s\S]*?closeWorldbookLibrary\(\);[\s\S]*?openLibraryList\(\);/u,
  );
  assert.match(runtimeRootSource, /@click="closeListWindow"/u);
  assert.match(runtimeRootSource, /@click="closeViewerWindow"/u);
  assert.match(runtimeRootSource, /onCloseLibraryList: \(\) => void;/u);
  assert.match(runtimeRootSource, /onCloseLibraryViewer: \(\) => void;/u);
});

test('Creator overlay 保持独立 iframe，但生命周期由同 bundle controller 管理', () => {
  assert.doesNotMatch(runtimeRootSource, /CreatorManager/u);
  assert.doesNotMatch(runtimeRootSource, /state\.creator/u);
  assert.doesNotMatch(runtimeSource, /createCreatorManagerOverlay|CreatorManagerOverlay/u);
  assert.match(creatorManagerControllerSource, /openCreatorManager/u);
  assert.match(creatorManagerControllerSource, /closeCreatorManager\(\);[\s\S]*?createCreatorManagerOverlay\(options\)/u);
  assert.match(creatorManagerControllerSource, /overlay\?\.destroy\(\);[\s\S]*?overlay = null/u);
  assert.match(runtimeSource, /tavern_events\.CHAT_CHANGED[\s\S]*?closeCreatorEditor\(\)/u);
  assert.match(runtimeSource, /stop\(options = \{\}\)[\s\S]*?closeCreatorEditor\(\)/u);

  assert.match(overlaySource, /createScriptIdIframe/u);
  assert.match(overlaySource, /zIndex: '2147483000'/u);
  assert.match(overlaySource, /srcdoc: MANAGER_IFRAME_SRCDOC/u);
  assert.match(overlaySource, /teleportStyle\(iframeDocument\.head\)/u);
  assert.match(overlaySource, /visualViewport/u);
  assert.match(overlaySource, /removeEventListener\('scroll'/u);
});

test('关闭 Creator 会真正卸载 Vue、样式和 iframe，不留下常驻 Editor', () => {
  assert.match(overlaySource, /destroy\(\): void;/u);
  assert.match(
    overlaySource,
    /const teardown = \(\) => \{[\s\S]*?mountedApp\?\.unmount\(\);[\s\S]*?teleportedStyle\?\.destroy\(\);[\s\S]*?\$managerOverlay\?\.remove\(\);/u,
  );
  assert.match(overlaySource, /const close = teardown;[\s\S]*?const destroy = teardown;/u);
  assert.doesNotMatch(overlaySource, /\$managerOverlay\?\.hide\(\)/u);
});

test('Creator Manager 样式不修改 ST 宿主页的 html 或 body', () => {
  assert.doesNotMatch(creatorManagerSource, /:global\(html\)/u);
  assert.doesNotMatch(creatorManagerSource, /:global\(body\)/u);
  assert.match(creatorManagerSource, /:global\(#char-info-creator-manager\)[\s\S]*?width: 100%;[\s\S]*?height: 100%;/u);
  assert.match(creatorManagerSource, /\.manager-root \{[\s\S]*?font-family:/u);
});

test('Creator 桌面编辑器保持固定窗口高度，步骤内容只在内部滚动', () => {
  assert.match(
    creatorManagerSource,
    /\.manager-dialog \{[\s\S]*?height: min\(\d+px, calc\(100% - 8px\)\);[\s\S]*?max-height: calc\(100% - 8px\);/u,
  );
  assert.match(creatorManagerSource, /\.dialog-body \{[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/u);
  assert.match(
    creatorManagerSource,
    /\.target-panel,[\s\S]*?\.editor-panel \{[\s\S]*?min-height: 0;[\s\S]*?overflow-y: auto;/u,
  );
});

test('当前聊天资料库和设置宿主明确使用动态视口尺寸，避免 ST 移动端 html 高度为零', () => {
  assert.match(
    runtimeRootSource,
    /\.char-info-library-host,[\s\S]*?\.char-info-settings-host \{[\s\S]*?inset: 0;[\s\S]*?width: 100dvw;[\s\S]*?height: 100dvh;[\s\S]*?max-width: 100dvw;[\s\S]*?max-height: 100dvh;/u,
  );
  assert.match(runtimeRootSource, /\.char-info-settings-backdrop \{[\s\S]*?overflow: auto;/u);
  assert.match(
    runtimeRootSource,
    /@media \(max-width: 720px\) \{[\s\S]*?\.char-info-settings-backdrop \{[\s\S]*?padding: 0;[\s\S]*?place-items: stretch;[\s\S]*?\.char-info-settings-dialog \{[\s\S]*?width: 100%;[\s\S]*?height: 100%;[\s\S]*?max-width: none;[\s\S]*?max-height: none;/u,
  );
});

test('当前聊天资料库由悬浮入口打开角色列表，并完整显示角色立绘', () => {
  assert.match(runtimeRootSource, /class="char-info-library-floating-button"/u);
  assert.match(runtimeRootSource, /@click="openLibraryFromFloatingButton\(\$event\)"/u);
  assert.match(runtimeRootSource, /function getAnchoredListWindowPosition\(buttonRect: DOMRect\)/u);
  assert.match(
    runtimeRootSource,
    /listWindowPosition\.value =[\s\S]*?getAnchoredListWindowPosition\(buttonRect\)[\s\S]*?props\.onOpenLibraryList\(\);/u,
  );
  assert.doesNotMatch(
    runtimeRootSource,
    /v-if="state\.library\.characters\.length > 0 && !state\.library\.listOpen && !state\.library\.viewerOpen"/u,
  );
  assert.match(runtimeRootSource, /state\.library\.unreadCharacterNames\.length/u);
  assert.match(runtimeRootSource, /class="char-info-library-list-dialog"/u);
  assert.match(
    runtimeRootSource,
    /v-if="!state\.library\.viewerLoading && selectedCharacter && selectedCharacterYaml"/u,
  );
  assert.match(runtimeRootSource, /state\.library\.viewerLoading\s*\?\s*'正在准备最新角色资料…'/u);
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
    /@media \(max-width: 720px\) \{[\s\S]*?\.char-info-library-list-dialog \{[\s\S]*?inset: 0 !important;[\s\S]*?width: 100%;[\s\S]*?height: 100%;[\s\S]*?max-height: none;/u,
  );
  assert.match(
    runtimeRootSource,
    /@media \(max-width: 720px\) \{[\s\S]*?\.char-info-library-overlay \{[\s\S]*?inset: 0 !important;[\s\S]*?width: 100%;[\s\S]*?height: 100%;/u,
  );
  assert.match(
    runtimeRootSource,
    /@media \(max-width: 720px\) \{[\s\S]*?\.char-info-library-viewer \{[\s\S]*?overflow: hidden;/u,
  );
  assert.match(
    runtimeRootSource,
    /@media \(max-width: 720px\) \{[\s\S]*?\.char-info-library-viewer \.illustrated-shell \{[\s\S]*?height: 100% !important;/u,
  );
  assert.match(
    runtimeRootSource,
    /\.char-info-library-viewer \.illustrated-portrait-image,[\s\S]*?\.char-info-library-viewer \.portrait-image \{[\s\S]*?object-fit: cover;[\s\S]*?object-position: top center;[\s\S]*?background: transparent;/u,
  );
  assert.doesNotMatch(
    runtimeRootSource,
    /\.char-info-library-viewer \.illustrated-portrait-image,[\s\S]*?\.char-info-library-viewer \.portrait-image \{[\s\S]*?object-fit: contain;/u,
  );
  assert.match(
    viewerSource,
    /props\.entranceQuoteOverride === undefined[\s\S]*?cloneCharacterDataWithVisualOverrides\(resolvedData, \{[\s\S]*?登场台词: props\.entranceQuoteOverride/u,
  );
  assert.doesNotMatch(viewerSource, /cloneLoadedDxCharacterDataWithOverrides/u);
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
