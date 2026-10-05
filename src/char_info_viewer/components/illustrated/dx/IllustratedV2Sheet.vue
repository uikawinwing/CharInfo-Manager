<template>
  <div class="illustrated-v2-surface" :class="`illustrated-v2-theme-${theme}`">
    <IllustratedCharacterSheet v-bind="$attrs" />

    <div v-if="theme === 'iris'" class="iris-v2-decoration-layer" aria-hidden="true">
      <div class="iris-v2-portrait-bubbles">
        <span class="iris-v2-bubble bubble-one"></span>
        <span class="iris-v2-bubble bubble-two"></span>
        <span class="iris-v2-bubble bubble-three"></span>
        <span class="iris-v2-bubble bubble-four"></span>
        <span class="iris-v2-bubble bubble-five"></span>
        <span class="iris-v2-toy-node toy-one"></span>
        <span class="iris-v2-toy-node toy-two"></span>
      </div>

      <div class="iris-v2-jellyfish">
        <span class="iris-v2-jellyfish-dome"></span>
        <span class="iris-v2-jellyfish-tentacles"><i></i><i></i><i></i></span>
      </div>

      <div class="iris-v2-dream-dice">
        <i></i><i></i><i></i><i></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IllustratedCharacterSheet from '../IllustratedCharacterSheet.vue';

/**
 * DX showcase renderer。
 *
 * 定位：**默认 renderer + theme token + DX 私有装饰**。
 * 它不替换任何 module，不使用 Phase 5 的 renderer override seam——
 * 历史 DX 与默认 renderer 的信息架构完全一致，差别只在视觉主题。
 *
 * 不复制 default renderer / controller / portrait state。
 *
 * 历史版本曾传 `side-rail-navigation`，那是 Phase 3 之前的旧架构 prop，
 * 今天 default wrapper 根本不接受它（side rail 由 specialNpc 路由驱动），
 * 因此删除。
 */
export type IllustratedV2Theme = 'default' | 'iris' | 'anastasia' | 'venus' | 'seren';

withDefaults(defineProps<{ theme?: IllustratedV2Theme }>(), { theme: 'default' });
defineOptions({ inheritAttrs: false });
</script>

<style>
/*
 * 故意不加 `scoped`。
 *
 * theme class 在本组件自己的 `.illustrated-v2-surface` 上，而 token 与装饰
 * 需要作用到 `IllustratedCharacterSheet` → `default/` 各 child component 的
 * DOM 内部。`scoped` 会给选择器补 data-v-*，使跨 child 的 `.illustrated-*`
 * 命中失效。
 *
 * 代价是这些规则进入全局样式表 —— 因此**每条规则都必须以
 * `.illustrated-v2-surface` 或 `.illustrated-v2-theme-*` 起头**，
 * 不允许裸 default-class selector 泄漏。
 */
.illustrated-v2-surface {
  position: relative;
  width: 100%;
}

/* ============================================================
 * Iris — 浅色青紫 / 粉色
 * ============================================================ */
.illustrated-v2-theme-iris .illustrated-wrapper {
  color-scheme: light;
  color: #17324a;
  --illustrated-bg: #dce9e7;
  --illustrated-shell-border-color: rgba(49, 83, 109, 0.58);
  --illustrated-shell-background:
    radial-gradient(circle at 76% 4%, rgba(169, 140, 232, 0.18), transparent 24rem),
    radial-gradient(circle at 18% 92%, rgba(240, 120, 166, 0.13), transparent 28rem),
    linear-gradient(145deg, #edf5f3 0%, #dcefeb 54%, #e9e1f7 100%);
  --illustrated-shell-shadow:
    0 0 0 4px rgba(247, 251, 250, 0.78),
    0 0 0 5px rgba(66, 169, 150, 0.48),
    0 22px 52px rgba(23, 50, 74, 0.2);
  --illustrated-portrait-pane-background: #a8c8c7;
  --illustrated-data-pane-background:
    radial-gradient(circle at 15% 16%, rgba(240, 120, 166, 0.13) 0 3px, transparent 4px) 0 0 / 88px 88px,
    radial-gradient(circle at 82% 23%, rgba(169, 140, 232, 0.14) 0 4px, transparent 5px) 0 0 / 126px 126px,
    linear-gradient(135deg, rgba(247, 251, 250, 0.96), #dcefeb 52%, #ebe2fa);
  --illustrated-detail-pane-background: var(--illustrated-data-pane-background);
  --illustrated-detail-wallpaper-filter: saturate(0.94) brightness(1.02);
  --illustrated-detail-wallpaper-opacity: 0.18;
  --illustrated-fg: #17324a;
  --illustrated-fg-soft: #31536d;
  --illustrated-fg-muted: #547083;
  --illustrated-surface-subtle: rgba(255, 255, 255, 0.34);
  --illustrated-surface-muted: rgba(247, 251, 250, 0.72);
  --illustrated-surface-card: rgba(247, 251, 250, 0.95);
  --illustrated-surface-tag: #ffffff;
  --illustrated-group-panel-background: rgba(247, 251, 250, 0.95);
  --illustrated-group-panel-collapsed-background: rgba(247, 251, 250, 0.82);
  --illustrated-group-panel-highlight: rgba(255, 255, 255, 0.5);
  --illustrated-group-toggle-background: linear-gradient(90deg, rgba(169, 140, 232, 0.08), rgba(220, 239, 235, 0.5));
  --illustrated-group-toggle-hover-background: linear-gradient(90deg, rgba(169, 140, 232, 0.13), rgba(217, 240, 234, 0.72));
  --illustrated-profile-subnav-background: rgba(247, 251, 250, 0.72);
  --illustrated-profile-story-background: linear-gradient(180deg, rgba(255, 255, 255, 0.34), transparent 46%), rgba(247, 251, 250, 0.88);
  --illustrated-profile-story-highlight: rgba(255, 255, 255, 0.5);
  --illustrated-profile-story-mobile-background: rgba(247, 251, 250, 0.9);
  --illustrated-mobile-summary-background: rgba(168, 200, 199, 0.38);
  --illustrated-compact-row-background: linear-gradient(90deg, rgba(247, 251, 250, 0.74), rgba(220, 239, 235, 0.56));
  --illustrated-dialog-backdrop: rgba(23, 50, 74, 0.34);
  --illustrated-dialog-depth-shadow: 0 20px 50px rgba(23, 50, 74, 0.14);
  --illustrated-mobile-portrait-overlay: none;
  --illustrated-import-menu-background: rgba(247, 251, 250, 0.97);
  --illustrated-import-menu-border: rgba(49, 83, 109, 0.18);
  --illustrated-import-menu-fg: #17324a;
  --illustrated-import-menu-shadow: 0 12px 30px rgba(23, 50, 74, 0.14);
  --illustrated-import-menu-hover-background: #d9f0ea;
  --illustrated-import-menu-hover-border: rgba(66, 169, 150, 0.42);
  --illustrated-nav-background: rgba(247, 251, 250, 0.96);
  --illustrated-mobile-nav-background: rgba(247, 251, 250, 0.96);
  --illustrated-page-title-fg: #17324a;
  --illustrated-name-shadow: none;
  --illustrated-text-shadow: none;
  --illustrated-heading-shadow: none;
  --illustrated-tier-shadow: none;
  --illustrated-page-title-shadow: none;
  --illustrated-attribute-value-shadow: none;
  --illustrated-panel-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
  --illustrated-item-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
  --illustrated-nav-shadow: 0 -8px 24px rgba(23, 50, 74, 0.08);
  --illustrated-divinity-fg: #17324a;
  --illustrated-divinity-fg-soft: #547083;
  --illustrated-divinity-surface: rgba(247, 251, 250, 0.78);
  --illustrated-divinity-hero-overlay: linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(220, 239, 235, 0.34));
  --illustrated-divinity-card-overlay: linear-gradient(135deg, rgba(255, 255, 255, 0.34), rgba(220, 239, 235, 0.12));
  --illustrated-divinity-inset-highlight: rgba(255, 255, 255, 0.46);
  --illustrated-divinity-heading-shadow: none;
  --illustrated-race-accent: #42a996;
  --illustrated-race-accent-rgb: 66, 169, 150;
  --illustrated-tier-accent: #a98ce8;
  --illustrated-tier-accent-rgb: 169, 140, 232;
}

/* ============================================================
 * Anastasia — 深蓝 / 金色
 * ============================================================ */
.illustrated-v2-theme-anastasia .illustrated-wrapper {
  color-scheme: dark;
  color: #e8eef2;
  --illustrated-bg: #07182b;
  --illustrated-panel: rgba(8, 29, 51, 0.9);
  --illustrated-fg: #e8eef2;
  --illustrated-fg-soft: #c4d0d9;
  --illustrated-fg-muted: #9fb2c0;
  --illustrated-surface-subtle: rgba(12, 39, 65, 0.48);
  --illustrated-surface-muted: rgba(10, 34, 58, 0.72);
  --illustrated-surface-card: rgba(8, 29, 51, 0.9);
  --illustrated-surface-tag: rgba(15, 51, 82, 0.88);
  --illustrated-group-panel-collapsed-background: rgba(7, 24, 43, 0.72);
  --illustrated-group-panel-highlight: rgba(232, 238, 242, 0.04);
  --illustrated-group-toggle-background: linear-gradient(90deg, rgba(217, 181, 106, 0.08), rgba(15, 51, 82, 0.26));
  --illustrated-group-toggle-hover-background: linear-gradient(90deg, rgba(217, 181, 106, 0.13), rgba(24, 69, 110, 0.34));
  --illustrated-profile-subnav-background: rgba(7, 24, 43, 0.72);
  --illustrated-profile-story-background: linear-gradient(180deg, rgba(232, 238, 242, 0.035), transparent 46%), rgba(8, 29, 51, 0.82);
  --illustrated-profile-story-highlight: rgba(232, 238, 242, 0.04);
  --illustrated-profile-story-mobile-background: rgba(8, 29, 51, 0.88);
  --illustrated-mobile-summary-background: rgba(8, 29, 51, 0.78);
  --illustrated-compact-row-background: linear-gradient(90deg, rgba(18, 49, 78, 0.72), rgba(6, 24, 43, 0.56));
  --illustrated-nav-background: rgba(5, 20, 36, 0.94);
  --illustrated-mobile-nav-background: rgba(5, 20, 36, 0.94);
  --illustrated-page-title-fg: #f4f7f9;
  --illustrated-race-accent: #e8eef2;
  --illustrated-race-accent-rgb: 232, 238, 242;
  --illustrated-tier-accent: #d9b56a;
  --illustrated-tier-accent-rgb: 217, 181, 106;
  --illustrated-flag-width: 152px;
  --illustrated-flag-height: 154px;
  --illustrated-flag-gap: 12px;
}

/* ============================================================
 * DX 私有装饰层
 * 这些不是主题表面差异，而是 DX 自己的美术表达，保持 DX-owned。
 * ============================================================ */

/* --- Anastasia：装饰性内框 --- */
.illustrated-v2-theme-anastasia .illustrated-shell::before {
  content: '';
  position: absolute;
  inset: 9px;
  z-index: 9;
  border: 1px solid rgba(232, 238, 242, 0.2);
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(232, 238, 242, 0.88) 0 13px, transparent 13px) top left / 58px 58px no-repeat,
    linear-gradient(225deg, rgba(232, 238, 242, 0.88) 0 13px, transparent 13px) top right / 58px 58px no-repeat,
    linear-gradient(45deg, rgba(217, 181, 106, 0.62) 0 12px, transparent 12px) bottom left / 54px 54px no-repeat,
    linear-gradient(315deg, rgba(217, 181, 106, 0.62) 0 12px, transparent 12px) bottom right / 54px 54px no-repeat;
  box-shadow: inset 0 0 24px rgba(24, 69, 110, 0.08);
  pointer-events: none;
}

/* --- Anastasia：立绘相框 --- */
.illustrated-v2-theme-anastasia .illustrated-portrait-pane {
  padding: 12px;
  background: linear-gradient(180deg, rgba(232, 238, 242, 0.08), transparent 28%), #0a2947;
}

.illustrated-v2-theme-anastasia .illustrated-portrait-pane::before {
  content: '';
  position: absolute;
  inset: 12px;
  z-index: 3;
  border: 2px solid rgba(232, 238, 242, 0.76);
  border-radius: 9px;
  clip-path: polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px);
  box-shadow:
    inset 0 0 0 1px rgba(155, 176, 194, 0.28),
    0 0 16px rgba(232, 238, 242, 0.12);
  pointer-events: none;
}

.illustrated-v2-theme-anastasia .illustrated-portrait-pane::after {
  inset: 12px;
  z-index: 2;
  border-radius: 8px;
  background: linear-gradient(to right, transparent 68%, rgba(7, 24, 43, 0.92) 100%);
}

/* --- Anastasia：资料区锚点底纹 --- */
.illustrated-v2-theme-anastasia .illustrated-data-pane {
  isolation: isolate;
}

.illustrated-v2-theme-anastasia .illustrated-data-pane::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  /* 资产在仓库根 assets/。本文件位于 src/char_info_viewer/components/illustrated/dx/，
     比旧的 illustrated/ 深一层，因此相对路径多一个 ..。 */
  background: url('../../../../../assets/char_info_viewer/materials/anchor.svg') center / 260px 260px repeat;
  opacity: 0.12;
  filter: saturate(0.64) contrast(0.88);
  pointer-events: none;
}

.illustrated-v2-theme-anastasia .illustrated-data-pane > * {
  position: relative;
  z-index: 1;
}

/* --- Iris：属性旗标右下角装饰点 + 其裁切需求 --- */
.illustrated-v2-theme-iris .illustrated-attribute {
  overflow: hidden;
}

.illustrated-v2-theme-iris .illustrated-attribute::after {
  content: '';
  position: absolute;
  right: 12px;
  bottom: 10px;
  width: 20px;
  aspect-ratio: 1;
  border: 1px solid rgba(114, 88, 186, 0.28);
  border-radius: 50%;
  background: rgba(237, 255, 251, 0.14);
  box-shadow: inset -2px -3px 6px rgba(131, 220, 203, 0.18);
  pointer-events: none;
}

/* --- Iris：立绘区装饰层 --- */
.illustrated-v2-surface .iris-v2-decoration-layer {
  position: absolute;
  inset: 0 auto auto 50%;
  z-index: 8;
  width: min(100%, 1200px);
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  pointer-events: none;
  transform: translateX(-50%);
}

.illustrated-v2-surface .iris-v2-portrait-bubbles {
  position: absolute;
  inset: 2.1% auto 2.1% 1.3%;
  width: 42.4%;
  overflow: hidden;
  border-radius: 10px;
}

.illustrated-v2-surface .iris-v2-bubble {
  position: absolute;
  width: var(--iris-bubble-size);
  aspect-ratio: 1;
  border: 1px solid rgba(226, 255, 250, 0.82);
  border-radius: 50%;
  background: rgba(247, 251, 250, 0.08);
  box-shadow: inset -3px -4px 9px rgba(131, 220, 203, 0.24);
  animation: iris-v2-bubble-float 5.8s ease-in-out infinite alternate;
}

.illustrated-v2-surface .iris-v2-bubble::after {
  content: '';
  position: absolute;
  top: 20%;
  left: 22%;
  width: 22%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.76);
}

.illustrated-v2-surface .iris-v2-bubble.bubble-one {
  top: 5%;
  left: 7%;
  --iris-bubble-size: 24px;
  animation-delay: -1.2s;
}

.illustrated-v2-surface .iris-v2-bubble.bubble-two {
  top: 12%;
  left: 16%;
  --iris-bubble-size: 50px;
  animation-delay: -3.8s;
}

.illustrated-v2-surface .iris-v2-bubble.bubble-three {
  top: 18%;
  right: 5%;
  --iris-bubble-size: 32px;
  animation-delay: -2.4s;
}

.illustrated-v2-surface .iris-v2-bubble.bubble-four {
  right: 10%;
  bottom: 20%;
  --iris-bubble-size: 55px;
  animation-delay: -4.7s;
}

.illustrated-v2-surface .iris-v2-bubble.bubble-five {
  bottom: 10%;
  left: 9%;
  --iris-bubble-size: 27px;
  animation-delay: -0.6s;
}

.illustrated-v2-surface .iris-v2-toy-node {
  position: absolute;
  width: 14px;
  aspect-ratio: 1;
  border: 2px solid #f7fbfa;
  border-radius: 4px;
  background: #f078a6;
  box-shadow: 0 2px 6px rgba(23, 50, 74, 0.24);
}

.illustrated-v2-surface .iris-v2-toy-node.toy-one {
  top: 14px;
  left: 14px;
  transform: rotate(15deg);
}

.illustrated-v2-surface .iris-v2-toy-node.toy-two {
  right: 14px;
  bottom: 14px;
  background: #a98ce8;
  transform: rotate(34deg);
}

.illustrated-v2-surface .iris-v2-jellyfish {
  position: absolute;
  top: 7.5%;
  left: 48.8%;
  width: 66px;
  height: 72px;
  color: #7258ba;
  opacity: 0.92;
  filter: drop-shadow(0 5px 8px rgba(114, 88, 186, 0.12));
  animation: iris-v2-jellyfish-bob 4.8s ease-in-out infinite alternate;
}

.illustrated-v2-surface .iris-v2-jellyfish-dome {
  position: absolute;
  top: 5px;
  left: 8px;
  width: 50px;
  height: 33px;
  border: 2px solid currentColor;
  border-bottom: 0;
  border-radius: 28px 28px 10px 10px;
  background: rgba(169, 140, 232, 0.18);
  box-shadow: inset 7px 5px 0 rgba(255, 255, 255, 0.42);
}

.illustrated-v2-surface .iris-v2-jellyfish-dome::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 10px;
  width: 8px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #f078a6;
}

.illustrated-v2-surface .iris-v2-jellyfish-tentacles {
  position: absolute;
  top: 34px;
  left: 13px;
  display: flex;
  gap: 7px;
}

.illustrated-v2-surface .iris-v2-jellyfish-tentacles i {
  display: block;
  width: 7px;
  height: 24px;
  border-left: 2px solid currentColor;
  border-radius: 50%;
}

.illustrated-v2-surface .iris-v2-jellyfish-tentacles i:nth-child(1) { transform: rotate(9deg); }
.illustrated-v2-surface .iris-v2-jellyfish-tentacles i:nth-child(2) { transform: rotate(-8deg); }
.illustrated-v2-surface .iris-v2-jellyfish-tentacles i:nth-child(3) { transform: rotate(11deg); }

.illustrated-v2-surface .iris-v2-dream-dice {
  position: absolute;
  top: 8.1%;
  right: 5.7%;
  display: grid;
  grid-template-columns: repeat(2, 18px);
  gap: 6px;
  transform: rotate(8deg);
}

.illustrated-v2-surface .iris-v2-dream-dice i {
  width: 18px;
  aspect-ratio: 1;
  border: 2px solid #42a996;
  border-radius: 5px;
  background: #f7fbfa;
  box-shadow: 2px 2px 0 rgba(169, 140, 232, 0.28);
}

.illustrated-v2-surface .iris-v2-dream-dice i:nth-child(2),
.illustrated-v2-surface .iris-v2-dream-dice i:nth-child(3) {
  border-color: #be4f79;
  background: #fbe7ef;
}

@keyframes iris-v2-bubble-float {
  from { transform: translateY(0); }
  to { transform: translateY(-7px); }
}

@keyframes iris-v2-jellyfish-bob {
  from { transform: translateY(0) rotate(-1deg); }
  to { transform: translateY(6px) rotate(2deg); }
}

/* --- 移动端：装饰减负 --- */
.illustrated-v2-theme-iris:has(.force-mobile-layout) .iris-v2-jellyfish,
.illustrated-v2-theme-iris:has(.force-mobile-layout) .iris-v2-dream-dice {
  display: none;
}

.illustrated-v2-theme-iris:has(.force-mobile-layout) .iris-v2-portrait-bubbles {
  inset: 1.8% 3.2%;
  width: auto;
}

.illustrated-v2-theme-iris:has(.force-mobile-layout) .iris-v2-toy-node.toy-two {
  bottom: 72px;
}

.illustrated-v2-theme-iris:has(.force-mobile-layout) .iris-v2-bubble.bubble-two {
  --iris-bubble-size: 38px;
}

.illustrated-v2-theme-iris:has(.force-mobile-layout) .iris-v2-bubble.bubble-four {
  --iris-bubble-size: 44px;
}

@media (max-width: 900px) {
  .illustrated-v2-theme-iris
    .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-portrait-pane::after {
    background: none !important;
  }

  .illustrated-v2-surface .iris-v2-jellyfish,
  .illustrated-v2-surface .iris-v2-dream-dice {
    display: none;
  }

  .illustrated-v2-surface .iris-v2-portrait-bubbles {
    inset: 1.8% 3.2%;
    width: auto;
  }

  .illustrated-v2-surface .iris-v2-toy-node.toy-two {
    bottom: 72px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .illustrated-v2-surface .iris-v2-bubble,
  .illustrated-v2-surface .iris-v2-jellyfish {
    animation: none;
  }
}
</style>
