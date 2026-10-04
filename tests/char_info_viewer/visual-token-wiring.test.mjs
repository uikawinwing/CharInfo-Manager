import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

/**
 * Phase 6A：visual token 的**消费点语义**。
 *
 * 只断言「哪个 token 被哪个选择器消费」，不比较渲染结果。
 * 动机：336f388 把 `--illustrated-tab-active-background` 挂在 base
 * `.illustrated-tab-button` 上，default 因为 token=transparent 视觉不变，
 * 但 DX 一旦设成实色，所有 idle tab 都会拿到 active 背景。
 * 这类「default 看不出来、接了 DX 才炸」的 wiring 错误必须有断言守住。
 */
const sheet = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedDefaultSheet.vue', import.meta.url),
  'utf8',
);
const tabNav = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedTabNav.vue', import.meta.url),
  'utf8',
);
const header = await readFile(
  new URL('../../src/char_info_viewer/components/illustrated/default/IllustratedHeader.vue', import.meta.url),
  'utf8',
);

/** 取一个选择器规则块的内容；支持跨行 selector 列表。 */
function rule(selectorPattern) {
  // selector 列表可能跨行（`a,\nb { }`），先按行折叠再匹配。
  const flat = tabNav.replace(/\n\s*/g, ' ');
  const re = new RegExp(`(?:^|[};])\\s*${selectorPattern}\\s*\\{([^}]*)\\}`, 's');
  const m = flat.match(re);
  if (m) return m[1];
  const re2 = new RegExp(`(?:^|[};])\\s*${selectorPattern}\\s*\\{([^}]*)\\}`, 's');
  const m2 = header.match(re2) ?? sheet.match(re2);
  return m2 ? m2[1] : null;
}

test('idle tab 不消费 active background', () => {
  const body = rule('\\.illustrated-tab-button');
  assert.ok(body, '必须找到 .illustrated-tab-button 规则');
  assert.match(body, /background:\s*none\s*;/, 'idle tab 的 background 必须是 none');
  assert.doesNotMatch(
    body,
    /--illustrated-tab-active-background/,
    'idle tab 不得消费 active background，否则 DX 设成实色会让所有 idle tab 变色',
  );
  assert.match(body, /color:\s*var\(--illustrated-tab-fg\)\s*;/);
});

test('hover / active 同时消费 active background 与 active foreground', () => {
  // 折叠后是 `.a:hover:not(:disabled), .b.active:not(:disabled) {`
  const body = rule(
    '\\.illustrated-tab-button:hover:not\\(:disabled\\),\\s*\\.illustrated-tab-button\\.active:not\\(:disabled\\)',
  );
  assert.ok(body, '必须找到 hover/active 规则');
  assert.match(body, /background:\s*var\(--illustrated-tab-active-background\)\s*;/);
  assert.match(body, /color:\s*var\(--illustrated-tab-active-fg\)\s*;/);
});

test('active indicator 独立于 active foreground', () => {
  const body = rule('\\.illustrated-tab-button\\.active::after');
  assert.ok(body, '必须找到 active 指示条规则');
  assert.match(body, /background:\s*var\(--illustrated-tab-active-indicator\)\s*;/);
  assert.doesNotMatch(body, /--illustrated-race-accent/);
});

test('desktop side rail active 由独立 token 覆盖，且声明在 base 之后', () => {
  const sideRail = rule(
    '\\.illustrated-tabs\\.is-side-rail \\.illustrated-tab-button\\.active',
  );
  assert.ok(sideRail, '必须找到 side rail active 规则');
  assert.match(sideRail, /background:\s*var\(--illustrated-side-rail-tab-active-background\)\s*;/);
  // cascade：side rail 规则必须晚于 base hover/active，否则覆盖不生效。
  assert.ok(
    tabNav.indexOf('--illustrated-side-rail-tab-active-background') >
      tabNav.indexOf('--illustrated-tab-active-background'),
    'side rail 覆盖必须出现在 base 规则之后',
  );
});

test('side rail border token 只接 desktop，不动 mobile side rail', () => {
  assert.match(tabNav, /border-left:\s*1px solid var\(--illustrated-side-rail-border-color\)\s*;/);
  // mobile side rail 仍用 race-accent 派生的 border —— 旧 DX 没有对应 evidence。
  assert.match(tabNav, /border-top:\s*1px solid rgba\(var\(--illustrated-race-accent-rgb\), 0\.2\)\s*;/);
});

test('每个新增 token 的 default 与迁移前的 literal 等价', () => {
  const tokenDefault = name => {
    const m = sheet.match(new RegExp(`--${name}:\\s*([^;]+);`, 's'));
    return m ? m[1].replace(/\s+/g, ' ').trim() : null;
  };
  // 多行声明折叠后仍可能残留 `linear-gradient( 90deg, ...)` 的括号内空格。
  const norm = s =>
    (s ?? '')
      .replace(/\s*,\s*/g, ',')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\s+/g, ' ')
      .trim();

  // 迁移前这些位置的字面量
  const expected = {
    'illustrated-nav-border-color': 'var(--illustrated-border-soft)',
    'illustrated-tab-fg': 'var(--illustrated-fg-muted)',
    'illustrated-tab-active-fg': 'var(--illustrated-race-accent)',
    'illustrated-tab-active-indicator': 'var(--illustrated-race-accent)',
    'illustrated-tab-active-background': 'transparent',
    'illustrated-side-rail-border-color': 'rgba(255, 255, 255, 0.08)',
    'illustrated-side-rail-tab-active-background':
      'linear-gradient(90deg, rgba(var(--illustrated-race-accent-rgb), 0.12), transparent)',
    'illustrated-tier-shadow': '0 0 8px rgba(var(--illustrated-tier-accent-rgb), 0.4)',
  };

  for (const [name, want] of Object.entries(expected)) {
    assert.equal(
      norm(tokenDefault(name)),
      norm(want),
      `--illustrated-${name} 的 default 必须与迁移前 literal 等价`,
    );
  }
});

test('tier shadow 已 token 化，subtitle 继续复用 heading shadow', () => {
  assert.match(header, /text-shadow:\s*var\(--illustrated-tier-shadow\)\s*;/);
  assert.doesNotMatch(
    header,
    /text-shadow:\s*0 0 8px rgba\(var\(--illustrated-tier-accent-rgb\)/,
    'tier shadow 不应再写死',
  );
  // subtitle 复用既有 token，不新增
  assert.match(header, /\.illustrated-subtitle\s*\{[\s\S]*?text-shadow:\s*var\(--illustrated-heading-shadow\)/);
  assert.doesNotMatch(sheet, /--illustrated-subtitle-shadow:/);
});

test('保存按钮未被 navigation token 污染（DX 无 evidence）', () => {
  const body = rule('\\.illustrated-nav-save-button');
  assert.ok(body, '必须找到保存按钮规则');
  assert.match(body, /color:\s*var\(--illustrated-fg-muted\)\s*;/);
  assert.match(body, /background:\s*none\s*;/);
  assert.doesNotMatch(body, /--illustrated-tab/);
});
