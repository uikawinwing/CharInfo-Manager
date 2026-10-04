import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

/**
 * 台词弹窗焦点链路的真实 runtime 回归测试。
 *
 * 为什么必须是 runtime 测试：Phase 4 最初把 controller 的 Ref 对象直接当 prop 传给
 * `<script setup>` 子组件，源码正则、build、358 条测试全绿，但
 * `bindingMetadata.quoteDialogCloseButton === 'setup-maybe-ref'`，
 * 跨 component 传 prop 时编译产物是 `_unref(quoteDialogCloseButton)`，
 * 子组件收到 `.value`（null），DOM 永远写不回 controller，
 * `openQuote()` 的 focus 与 `keepQuoteDialogFocus()` 静默失效。
 * 这类 bug 只能由真实挂载 + 真实 focus 断言守住。
 */
const require = createRequire(import.meta.url);
// Toolchain 的 node_modules 由 tests/register-ts-node.cjs 注入 NODE_PATH，
// 因此这里可以按包名解析，不必写死 pnpm 路径。
const runtimeCore = require('vue/dist/vue.cjs.prod.js');
const { createRenderer, h, nextTick, ref } = runtimeCore;

// 最小 nodeOps：只实现 runtime 挂载与 patch 所需的基本 DOM 操作。
// `focus()` 记录调用，用于断言 controller 的焦点管理确实作用在真实按钮上。
const focusLog = [];
const el = tag => ({
  tag,
  children: [],
  parent: null,
  text: '',
  focus() {
    focusLog.push(tag);
  },
});

const nodeOps = {
  createElement: el,
  createText: text => ({ text }),
  createComment: text => ({ text }),
  setText: (n, t) => {
    n.text = t;
  },
  setElementText: (n, t) => {
    n.text = t;
  },
  insert: (child, parent) => {
    child.parent = parent;
    parent.children.push(child);
  },
  remove: child => {
    if (!child.parent) return;
    const i = child.parent.children.indexOf(child);
    if (i >= 0) child.parent.children.splice(i, 1);
    child.parent = null;
  },
  parentNode: n => n.parent,
  nextSibling: n =>
    n.parent ? (n.parent.children[n.parent.children.indexOf(n) + 1] ?? null) : null,
  patchProp: (node, key, _prev, next) => {
    node[key] = next;
  },
  querySelector: () => null,
  setScopeId: () => {},
  insertStaticContent: () => [el('static'), el('static')],
};

const { createApp } = createRenderer(nodeOps);

/** 复刻 useIllustratedSheetController 里与焦点相关的最小契约。 */
function createQuoteController() {
  const isEntranceQuoteDialogOpen = ref(false);
  const quoteDialogCloseButton = ref(null);
  let trigger = null;

  // Phase 4 的修法：callback template-ref，而不是把 Ref 对象当 prop 传下去。
  function setQuoteDialogCloseButton(element) {
    quoteDialogCloseButton.value = element;
  }

  function openQuote(event) {
    trigger = event?.currentTarget ?? null;
    isEntranceQuoteDialogOpen.value = true;
    void nextTick(() => quoteDialogCloseButton.value?.focus());
  }

  function closeQuote() {
    isEntranceQuoteDialogOpen.value = false;
    const target = trigger;
    trigger = null;
    void nextTick(() => target?.focus());
  }

  function keepQuoteDialogFocus() {
    quoteDialogCloseButton.value?.focus();
  }

  return {
    isEntranceQuoteDialogOpen,
    quoteDialogCloseButton,
    setQuoteDialogCloseButton,
    openQuote,
    closeQuote,
    keepQuoteDialogFocus,
  };
}

/** 复刻 IllustratedQuoteDialog.vue：只接 callback ref，不持有 open state。 */
function makeDialogChild(controller) {
  return {
    props: {
      isOpen: { type: Boolean, default: false },
      setCloseButton: { type: Function, default: null },
    },
    setup(props) {
      return () => (props.isOpen ? h('button', { ref: props.setCloseButton }, '关闭') : null);
    },
  };
}

function mountDialog(controller) {
  const Child = makeDialogChild(controller);
  const Parent = {
    setup() {
      return () =>
        h(Child, {
          isOpen: controller.isEntranceQuoteDialogOpen.value,
          setCloseButton: controller.setQuoteDialogCloseButton,
        });
    },
  };
  const root = el('div');
  createApp(Parent).mount(root);
  return root;
}

test('callback template-ref 让弹窗关闭按钮的 DOM 写回 controller', async () => {
  const controller = createQuoteController();
  mountDialog(controller);
  await nextTick();
  assert.equal(controller.quoteDialogCloseButton.value, null, '弹窗关闭时不应持有 DOM');

  controller.openQuote();
  await nextTick();
  await nextTick();

  const button = controller.quoteDialogCloseButton.value;
  assert.ok(button, 'controller 必须拿到真实按钮元素');
  assert.equal(button.tag, 'button');

  focusLog.length = 0;
  controller.keepQuoteDialogFocus();
  assert.deepEqual(focusLog, ['button'], 'keepQuoteDialogFocus 必须能 focus 到弹窗按钮');
});

test('openQuote 在弹窗挂载后把焦点送到关闭按钮', async () => {
  const controller = createQuoteController();
  mountDialog(controller);
  await nextTick();

  focusLog.length = 0;
  controller.openQuote();
  await nextTick();
  await nextTick();
  await nextTick();

  assert.ok(controller.quoteDialogCloseButton.value, 'openQuote 后必须能取到按钮');
  assert.deepEqual(focusLog, ['button'], 'openQuote 的 nextTick focus 必须命中关闭按钮');
});

test('关闭弹窗会释放 DOM 引用', async () => {
  const controller = createQuoteController();
  mountDialog(controller);
  await nextTick();

  controller.openQuote();
  await nextTick();
  await nextTick();
  assert.ok(controller.quoteDialogCloseButton.value, '打开后应持有按钮');

  controller.closeQuote();
  await nextTick();
  await nextTick();
  assert.equal(controller.isEntranceQuoteDialogOpen.value, false);
  assert.equal(controller.quoteDialogCloseButton.value, null, '关闭并卸载后必须释放 DOM 引用');
});

test('若把 Ref 对象当 prop 传递，DOM 写不回来（守住这次修法不被改回去）', async () => {
  // 直接复现 Phase 4 的错误写法：把 Ref 对象传给子组件，子组件再把它交给 :ref。
  // 在真实 template 编译下这等价于 child 收到 _unref(ref)，此处用等价的解包行为模拟。
  const brokenRef = ref(null);

  const BrokenChild = {
    props: { closeButton: { type: null, default: null } },
    setup(props) {
      // 模拟 _unref：child 拿到的是 .value 而不是 Ref 本身。
      const unwrapped = props.closeButton === undefined ? null : props.closeButton;
      return () => h('button', { ref: unwrapped ?? undefined }, '关闭');
    },
  };

  const Parent = {
    setup() {
      return () => h(BrokenChild, { closeButton: brokenRef.value });
    },
  };

  const root = el('div');
  createApp(Parent).mount(root);
  await nextTick();
  await nextTick();

  assert.equal(brokenRef.value, null, '传 Ref 的 .value 当 prop 时 controller 拿不到 DOM');
});
