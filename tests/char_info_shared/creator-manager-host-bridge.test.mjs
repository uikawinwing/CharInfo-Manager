import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CREATOR_MANAGER_HOST_BRIDGE_KEY,
  CREATOR_MANAGER_HOST_BRIDGE_VERSION,
  getCreatorManagerHostBridge,
  registerCreatorManagerHostBridge,
} from '../../src/char_info_shared/creatorManagerHostBridge.ts';

test('Creator Manager 宿主桥接只接受当前版本且在注销时不删除后来者', () => {
  const host = {};
  const bridge = {
    version: CREATOR_MANAGER_HOST_BRIDGE_VERSION,
    open() {},
    close() {},
  };

  assert.equal(getCreatorManagerHostBridge(host), null);
  const unregister = registerCreatorManagerHostBridge(host, bridge);
  assert.equal(getCreatorManagerHostBridge(host), bridge);

  host[CREATOR_MANAGER_HOST_BRIDGE_KEY] = { ...bridge, version: CREATOR_MANAGER_HOST_BRIDGE_VERSION + 1 };
  assert.equal(getCreatorManagerHostBridge(host), null);
  unregister();
  assert.ok(host[CREATOR_MANAGER_HOST_BRIDGE_KEY]);
});
