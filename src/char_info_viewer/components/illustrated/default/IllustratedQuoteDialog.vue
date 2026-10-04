<template>
  <div
    v-if="isOpen"
    class="illustrated-quote-dialog-backdrop"
    @click.self="$emit('close')"
  >
    <div class="illustrated-wrapper illustrated-quote-dialog-theme">
      <section
        class="illustrated-quote-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="`${nameText}的完整台词`"
        @keydown.esc.stop.prevent="$emit('close')"
        @keydown.tab.prevent="$emit('keepFocus')"
      >
        <span class="illustrated-quote-dialog-kicker">CHARACTER VOICE</span>
        <h2>{{ nameText }}的话</h2>
        <span class="illustrated-quote-dialog-ornament" aria-hidden="true"><i></i></span>
        <p class="illustrated-quote-dialog-text">{{ quoteText }}</p>
        <button
          :ref="closeButton"
          class="illustrated-quote-dialog-close"
          type="button"
          @click="$emit('close')"
        >
          关闭
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue';

/**
 * 默认登场的完整台词弹窗，只负责「怎么画」。
 *
 * open / close / focus 三件事的状态全部由 `core/useIllustratedSheetController` 独占：
 * - `isOpen` 是父级传下来的 controller 字段，这里不复制也不 watch 同步。
 * - `closeButton` 直接绑定 controller 持有的 ref 对象，Vue 会把 DOM 写回同一个 ref，
 *   因此焦点管理仍然只有 controller 一个 owner，父子之间没有 ref 复制 + watch 互同步。
 *
 * 弹窗内的 `.illustrated-wrapper` 不是布局壳，而是 `--illustrated-*` visual token 的作用域：
 * 弹窗被 teleport 之外的普通渲染路径挂在同一棵 DOM 子树上，token 由外层 `.illustrated-wrapper` 继承而来。
 * 保留这个 class 是为了让 dialog 内部的 var() 与移动端覆写规则继续命中。
 */
const props = defineProps<{
  isOpen: boolean;
  nameText: string;
  quoteText: string;
  closeButton: Ref<HTMLButtonElement | null>;
}>();

defineEmits<{
  close: [];
  keepFocus: [];
}>();
</script>

<style scoped lang="scss">
.illustrated-quote-dialog-backdrop {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  background: var(--illustrated-dialog-backdrop);
  backdrop-filter: blur(9px);
  -webkit-backdrop-filter: blur(9px);
}

.illustrated-quote-dialog-theme.illustrated-wrapper {
  width: min(100%, 560px);
  max-width: 560px;
  max-height: 100%;
  margin: 0;
  color: #f8f9fa;
  background: transparent;
  container-type: normal;
}

.illustrated-quote-dialog {
  display: flex;
  max-height: 100%;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  overflow: hidden;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.58);
  border-radius: 16px;
  background:
    radial-gradient(circle at 50% 0, rgba(var(--illustrated-tier-accent-rgb), 0.16), transparent 20rem),
    var(--illustrated-bg);
  box-shadow:
    0 0 0 1px rgba(var(--illustrated-race-accent-rgb), 0.2),
    var(--illustrated-dialog-depth-shadow);
  text-align: center;
}

.illustrated-quote-dialog-kicker {
  color: var(--illustrated-tier-accent);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: calc(11px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
  letter-spacing: 0.18em;
}

.illustrated-quote-dialog h2 {
  margin: 8px 0 0;
  color: inherit;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: calc(clamp(23px, 4cqw, 30px) + var(--ci-font-size-adjust, 0px));
}

.illustrated-quote-dialog-ornament {
  display: flex;
  width: min(46%, 180px);
  align-items: center;
  gap: 10px;
  margin: 18px 0;
}

.illustrated-quote-dialog-ornament::before,
.illustrated-quote-dialog-ornament::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--illustrated-tier-accent-rgb), 0.72));
}

.illustrated-quote-dialog-ornament::after {
  transform: rotate(180deg);
}

.illustrated-quote-dialog-ornament i {
  width: 7px;
  height: 7px;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.9);
  background: rgba(var(--illustrated-tier-accent-rgb), 0.18);
  transform: rotate(45deg);
}

.illustrated-quote-dialog-text {
  min-height: 0;
  margin: 0;
  padding: 0 6px;
  overflow-y: auto;
  color: inherit;
  font-family: 'LXGW WenKai Mono', 'Noto Serif SC', 'Songti SC', serif;
  font-size: calc(clamp(16px, 3cqw, 19px) + var(--ci-font-size-adjust, 0px));
  line-height: 1.8;
  overflow-wrap: anywhere;
  text-align: left;
  white-space: pre-wrap;
  scrollbar-width: thin;
}

.illustrated-quote-dialog-close {
  width: 100%;
  min-height: 46px;
  margin-top: 24px;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.66);
  border-radius: 9px;
  background: rgba(var(--illustrated-tier-accent-rgb), 0.14);
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  touch-action: manipulation;
}

.illustrated-quote-dialog-close:hover {
  background: rgba(var(--illustrated-tier-accent-rgb), 0.22);
}

.illustrated-quote-dialog-close:focus-visible {
  outline: 2px solid var(--illustrated-tier-accent);
  outline-offset: 3px;
}

/**
 * 移动端弹窗版式。
 *
 * 注意：拆分前这组规则只是 `@container char-info-viewer (max-width: 900px)` 的直接子规则，
 * 并**不在** `illustrated-mobile-content` mixin 内，因此 `force-mobile-layout` 从来不会触发它们。
 * 本次搬迁保持同一触发条件，不借机改变 force-mobile 下的弹窗版式。
 */
@container char-info-viewer (max-width: 900px) {
  .illustrated-quote-dialog-backdrop {
    align-items: flex-end;
    padding: 12px;
  }

  .illustrated-quote-dialog-theme.illustrated-wrapper {
    width: 100%;
  }

  .illustrated-quote-dialog {
    padding: 24px 20px 18px;
    border-radius: 16px 16px 12px 12px;
  }

  .illustrated-quote-dialog-text {
    font-size: calc(16px + var(--ci-font-size-adjust, 0px));
    line-height: 1.72;
  }

  .illustrated-quote-dialog-close {
    margin-top: 20px;
  }
}
</style>
