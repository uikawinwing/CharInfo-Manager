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
  new URL('../../src/char_info_profile_editor/overlay.ts', import.meta.url),
  'utf8',
).catch(() => '');
const profileEditorSource = await readFile(
  new URL('../../src/char_info_profile_editor/App.vue', import.meta.url),
  'utf8',
);
const profileEditorControllerSource = await readFile(
  new URL('../../src/char_info_profile_editor/controller.ts', import.meta.url),
  'utf8',
);
const profileEditorIndexSource = await readFile(
  new URL('../../src/char_info_profile_editor/index.ts', import.meta.url),
  'utf8',
);
const legacyBridgeSource = await readFile(
  new URL('../../src/char_info_shared/profileEditorHostBridge.ts', import.meta.url),
  'utf8',
);

test('角色查看器与角色档案编辑器共用一个脚本，但运行时只依赖窄 Profile Editor controller', () => {
  assert.doesNotMatch(runtimeSource, /appendInexistentScriptButtons/u);
  assert.doesNotMatch(runtimeSource, /getButtonEvent\('世界书角色库'\)/u);
  assert.doesNotMatch(runtimeSource, /char_info_profile_editor\/overlay/u);
  assert.match(runtimeSource, /openProfileEditor/u);
  assert.match(runtimeSource, /closeProfileEditor/u);
  assert.doesNotMatch(runtimeSource, /getProfileEditorHostBridge|registerProfileEditorHostBridge/u);
  assert.match(profileEditorControllerSource, /createProfileEditorOverlay/u);
  assert.match(profileEditorIndexSource, /export \{ closeProfileEditor, openProfileEditor \} from '\.\/controller';/u);
  assert.doesNotMatch(legacyBridgeSource, /__charInfoProfileEditorHostBridge|registerProfileEditorHostBridge/u);
  assert.match(runtimeRootSource, /<WorldbookCharacterLibrary/u);
  assert.match(runtimeRootSource, /当前聊天角色/u);
  assert.match(runtimeRootSource, /世界书角色/u);
});

test('当前聊天与世界书角色库在同一角色资料库内切换，不依赖角色档案编辑器状态', () => {
  const openCharacter =
    runtimeSource.match(/const openLibraryCharacter = async \(name: string\) => \{([\s\S]*?)\n\s{2}\};/u)?.[1] ?? '';
  const openWorldbook = runtimeSource.match(/const openWorldbookLibrary = \(\) => \{([\s\S]*?)\n\s{2}\};/u)?.[1] ?? '';

  assert.match(openCharacter, /library\.listOpen = true;/u);
  assert.match(openCharacter, /library\.viewerOpen = true;/u);
  assert.doesNotMatch(openCharacter, /library\.listOpen = false;/u);
  assert.match(openWorldbook, /state\.library\.listOpen = true;/u);
  assert.match(openWorldbook, /state\.library\.worldbookOpen = true/u);
  assert.doesNotMatch(openWorldbook, /closeLibrary\(\);/u);
  assert.doesNotMatch(openWorldbook, /openProfileEditor/u);
  assert.match(runtimeSource, /const openCurrentChatLibrary = \(\) => \{[\s\S]*?openLibraryList\(\);/u);
  assert.match(runtimeRootSource, /class="char-info-library-overlay char-info-character-library"/u);
  assert.match(runtimeRootSource, /<WorldbookCharacterLibrary[\s\S]*?v-if="state\.library\.worldbookOpen"[\s\S]*?embedded/u);
  assert.match(runtimeRootSource, /class="char-info-library-current-layout"/u);
  assert.match(runtimeRootSource, /onCloseLibrary: \(\) => void;/u);
  assert.match(runtimeRootSource, /onCloseLibraryViewer: \(\) => void;/u);
});

test('角色档案编辑器 overlay 保持独立 iframe，但生命周期由同 bundle controller 管理', () => {
  assert.doesNotMatch(runtimeRootSource, /ProfileEditor/u);
  assert.doesNotMatch(runtimeRootSource, /state\.creator/u);
  assert.doesNotMatch(runtimeSource, /createProfileEditorOverlay|ProfileEditorOverlay/u);
  assert.match(profileEditorControllerSource, /openProfileEditor/u);
  assert.match(profileEditorControllerSource, /closeProfileEditor\(\);[\s\S]*?createProfileEditorOverlay\(options\)/u);
  assert.match(profileEditorControllerSource, /overlay\?\.destroy\(\);[\s\S]*?overlay = null/u);
  assert.match(runtimeSource, /tavern_events\.CHAT_CHANGED[\s\S]*?closeProfileEditor\(\)/u);
  assert.match(runtimeSource, /stop\(options = \{\}\)[\s\S]*?closeProfileEditor\(\)/u);

  assert.match(overlaySource, /createScriptIdIframe/u);
  assert.match(overlaySource, /zIndex: '2147483000'/u);
  assert.match(overlaySource, /srcdoc: MANAGER_IFRAME_SRCDOC/u);
  assert.match(overlaySource, /teleportStyle\(iframeDocument\.head\)/u);
  assert.match(overlaySource, /visualViewport/u);
  assert.match(overlaySource, /removeEventListener\('scroll'/u);
});

test('关闭角色档案编辑器会真正卸载 Vue、样式和 iframe，不留下常驻 Editor', () => {
  assert.match(overlaySource, /destroy\(\): void;/u);
  assert.match(
    overlaySource,
    /const teardown = \(\) => \{[\s\S]*?mountedApp\?\.unmount\(\);[\s\S]*?teleportedStyle\?\.destroy\(\);[\s\S]*?\$managerOverlay\?\.remove\(\);/u,
  );
  assert.match(overlaySource, /const close = teardown;[\s\S]*?const destroy = teardown;/u);
  assert.doesNotMatch(overlaySource, /\$managerOverlay\?\.hide\(\)/u);
});

test('角色档案编辑器样式不修改 ST 宿主页的 html 或 body', () => {
  assert.doesNotMatch(profileEditorSource, /:global\(html\)/u);
  assert.doesNotMatch(profileEditorSource, /:global\(body\)/u);
  assert.match(profileEditorSource, /:global\(#char-info-profile-editor\)[\s\S]*?width: 100%;[\s\S]*?height: 100%;/u);
  assert.match(profileEditorSource, /\.manager-root \{[\s\S]*?font-family:/u);
});

test('角色档案编辑器桌面模式保持固定窗口高度，步骤内容只在内部滚动', () => {
  assert.match(
    profileEditorSource,
    /\.manager-dialog \{[\s\S]*?height: min\(\d+px, calc\(100% - 8px\)\);[\s\S]*?max-height: calc\(100% - 8px\);/u,
  );
  assert.match(profileEditorSource, /\.dialog-body \{[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/u);
  assert.match(
    profileEditorSource,
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

test('移动端更多菜单中的设置会调用 Runtime 提供的设置回调', () => {
  assert.match(runtimeRootSource, /@click="openSettingsFromCurrentMobileMore"/u);
  assert.match(
    runtimeRootSource,
    /function openSettingsFromCurrentMobileMore\(\): void \{[\s\S]*?currentMobileMoreOpen\.value = false;[\s\S]*?props\.onOpenSettings\(\);[\s\S]*?\}/u,
  );
  assert.doesNotMatch(
    runtimeRootSource,
    /function openSettingsFromCurrentMobileMore\(\): void \{[\s\S]*?\n\s*onOpenSettings\(\);/u,
  );
});

test('悬浮入口打开共享角色资料库，当前聊天使用侧栏与详情区', () => {
  assert.match(runtimeRootSource, /class="char-info-library-floating-button"/u);
  assert.match(runtimeRootSource, /@click="openLibraryFromFloatingButton"/u);
  assert.doesNotMatch(runtimeRootSource, /getAnchoredListWindowPosition|listWindowPosition|listWindowStyle/u);
  assert.match(runtimeRootSource, /v-if="characterLibraryOpen" class="char-info-character-library-backdrop"/u);
  assert.match(runtimeRootSource, /class="char-info-library-current-layout"/u);
  assert.match(
    runtimeRootSource,
    /\.char-info-library-current-layout \{[\s\S]*?grid-template-columns: minmax\(300px, 390px\) minmax\(0, 1fr\);/u,
  );
  assert.match(runtimeRootSource, /state\.library\.unreadCharacterNames\.length/u);
  assert.match(runtimeRootSource, /aria-label="当前聊天角色列表"/u);
  assert.match(
    runtimeRootSource,
    /v-if="!state\.library\.viewerLoading && selectedCharacter && selectedCharacterYaml"/u,
  );
  assert.match(runtimeRootSource, /state\.library\.viewerLoading\s*\?\s*'正在准备最新角色资料…'/u);
  assert.match(runtimeRootSource, /♡\s*\{\{ character\.affinity/u);
  assert.match(runtimeRootSource, /:entrance-quote-override="selectedCharacter\.innerThought"/u);
  assert.match(
    runtimeRootSource,
    /@media \(max-width: 720px\) \{[\s\S]*?\.char-info-library-current-layout\.viewer-open \.char-info-library-list-backdrop \{[\s\S]*?display: none;[\s\S]*?\.char-info-library-current-layout\.viewer-open \.char-info-library-current-viewer \{[\s\S]*?display: flex;/u,
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

test('共享角色资料库是唯一可拖动非模态外窗，当前聊天详情嵌在内容区', () => {
  assert.match(
    runtimeRootSource,
    /ref="viewerWindowRef"[\s\S]*?class="char-info-library-overlay char-info-character-library"[\s\S]*?:style="viewerWindowStyle"/u,
  );
  assert.match(runtimeRootSource, /class="char-info-character-library-header"[\s\S]*?@pointerdown="beginViewerWindowDrag"/u);
  assert.match(runtimeRootSource, /function clampViewerWindowPosition/u);
  assert.match(
    runtimeRootSource,
    /\.char-info-library-overlay \{[\s\S]*?position: absolute;[\s\S]*?width: min\(1800px,[\s\S]*?height: min\(1020px,[\s\S]*?transform: translate\(-50%, -50%\);/u,
  );
  assert.match(runtimeRootSource, /class="char-info-library-current-viewer"/u);
  assert.doesNotMatch(runtimeRootSource, /ref="listWindowRef"|beginListWindowDrag|clampListWindowPosition/u);
  assert.doesNotMatch(runtimeRootSource, /CURRENT CHAT(?: ARCHIVE)?|资料与心里话均读取自最新消息变量/u);
});

test('当前聊天角色库不再注册旧脚本按钮，并按角色清除好感度未读状态', () => {
  assert.doesNotMatch(runtimeSource, /appendInexistentScriptButtons\([\s\S]*CURRENT_LIBRARY_BUTTON_NAME/u);
  assert.doesNotMatch(runtimeSource, /getButtonEvent\(CURRENT_LIBRARY_BUTTON_NAME\)/u);
  assert.match(runtimeSource, /collectChangedAffinityNames/u);
  assert.match(runtimeSource, /unreadCharacterNames\s*=\s*library\.unreadCharacterNames\.filter/u);
});

test('主运行脚本会移除已经失效的旧角色视觉编辑按钮', () => {
  assert.match(runtimeSource, /const LEGACY_PROFILE_EDITOR_BUTTON_NAME = '角色视觉编辑'/u);
  assert.match(runtimeSource, /button\.name !== PROFILE_EDITOR_BUTTON_NAME/u);
  assert.match(runtimeSource, /button\.name !== LEGACY_PROFILE_EDITOR_BUTTON_NAME/u);
  assert.match(runtimeSource, /button\.name !== LEGACY_CURRENT_LIBRARY_BUTTON_NAME/u);
  assert.match(runtimeSource, /button\.name !== SETTINGS_BUTTON_NAME/u);
});
