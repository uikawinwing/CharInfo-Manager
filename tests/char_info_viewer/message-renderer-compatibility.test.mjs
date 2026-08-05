import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { isTavernHelperFrontendSource } from '../../src/char_info_viewer_runtime/nativeMessageMount.ts';

const repoRoot = new URL('../../', import.meta.url);
const nativeMountSource = await readFile(
  new URL('src/char_info_viewer_runtime/nativeMessageMount.ts', repoRoot),
  'utf8',
);

test('recognizes the same frontend code blocks as Tavern Helper', () => {
  assert.equal(isTavernHelperFrontendSource('<html><body>UI</body></html>'), true);
  assert.equal(isTavernHelperFrontendSource('<head><style>body{}</style></head>'), true);
  assert.equal(isTavernHelperFrontendSource("<body><script>$('body').load('/ui')</script></body>"), true);
  assert.equal(isTavernHelperFrontendSource('ordinary fenced code'), false);
});

test('keeps existing Tavern Helper render roots alive while mounting char info', () => {
  assert.match(nativeMountSource, /const TAVERN_HELPER_RENDER_SELECTOR = 'div\.TH-render'/);
  assert.match(nativeMountSource, /collectPreservableTavernHelperRenders\(root\)/);
  assert.match(
    nativeMountSource,
    /existingRenders\.length > 0 && existingRenders\.length !== frontendMountPoints\.length/,
  );
  assert.match(nativeMountSource, /element\.replaceWith\(originalMarker\)/);
  assert.match(nativeMountSource, /frontendMountPoints\[index\]\.replaceWith\(preserved\.element\)/);
  assert.match(nativeMountSource, /restoreOriginalContent\(root, preparedContent\)/);
  assert.doesNotMatch(nativeMountSource, /\broot\.innerHTML\s*=/);
});

test('notifies downstream message renderers after rebuilding the message body', () => {
  assert.match(nativeMountSource, /scheduleDownstreamRendererRefresh\(messageId, root, hosts\)/);
  assert.match(nativeMountSource, /setTimeout\(\(\) => \{/);
  assert.match(
    nativeMountSource,
    /eventEmit\(tavern_events\.CHARACTER_MESSAGE_RENDERED, messageId\)/,
  );
  assert.match(
    nativeMountSource,
    /hosts\.some\(host => !host\.isConnected \|\| !root\.contains\(host\)\)/,
  );
});
