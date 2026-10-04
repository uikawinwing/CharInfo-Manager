import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

/**
 * Phase 6A：tab active background 的消费点 wiring。
 *
 * 这条 bug 的特征是：default 值完全等价，CSS 零差异比对抓不到；
 * 错的只是「哪个选择器消费哪个 token」。DX 一旦把 active background
 * 设成实色，idle tab 就会跟着变色。
 *
 * 只守这一条真实 invariant，不冻结当前 token 取值或 design choice。
 */
const tabNav = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedTabNav.vue', import.meta.url),
  'utf8',
);
const header = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedHeader.vue', import.meta.url),
  'utf8',
);

const BASE = /^\.illustrated-tab-button\s*\{([^}]*)\}/m;
const HOVER_ACTIVE =
  /^\.illustrated-tab-button:hover:not\(:disabled\),\s*\n\.illustrated-tab-button\.active:not\(:disabled\)\s*\{([^}]*)\}/m;
const SIDE_RAIL_ACTIVE = /\.illustrated-tabs\.is-side-rail \.illustrated-tab-button\.active\s*\{([^}]*)\}/;

test('idle tab 不消费 active background', () => {
  const body = tabNav.match(BASE)?.[1];
  assert.ok(body, '必须找到 base .illustrated-tab-button 规则');
  assert.match(body, /background:\s*none\s*;/);
  assert.doesNotMatch(body, /--illustrated-tab-active-background/);
});

test('hover / active 消费 active background 与 active foreground', () => {
  const body = tabNav.match(HOVER_ACTIVE)?.[1];
  assert.ok(body, '必须找到 hover/active 规则');
  assert.match(body, /background:\s*var\(--illustrated-tab-active-background\)\s*;/);
  assert.match(body, /color:\s*var\(--illustrated-tab-active-fg\)\s*;/);
});

test('desktop side rail active 用独立 token，且选择器带 side-rail 限定', () => {
  const body = tabNav.match(SIDE_RAIL_ACTIVE)?.[1];
  assert.ok(body, '必须找到 desktop side rail active 规则');
  assert.match(body, /var\(--illustrated-side-rail-tab-active-background\)/);
  // 限定选择器 `.is-side-rail` 带来更高 specificity，因此能覆盖 base active 规则。
  assert.doesNotMatch(body, /--illustrated-tab-active-background/);
});

test('tier shadow token 有真实消费方', () => {
  assert.match(header, /text-shadow:\s*var\(--illustrated-tier-shadow\)\s*;/);
});
