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
  --illustrated-shell-border-color: #31536d;
  --illustrated-shell-background: #edf5f3;
  --illustrated-shell-shadow:
    0 22px 46px rgba(23, 50, 74, 0.2),
    0 0 0 4px rgba(247, 251, 250, 0.82),
    0 0 0 5px #8cb5b0;
  --illustrated-portrait-pane-background: #a8c8c7;
  --illustrated-data-pane-background: #dcefeb;
  --illustrated-detail-pane-background: var(--illustrated-data-pane-background);
  --illustrated-detail-wallpaper-filter: saturate(0.94) brightness(1.02);
  --illustrated-detail-wallpaper-opacity: 0.18;
  --illustrated-fg: #17324a;
  --illustrated-fg-soft: #31536d;
  --illustrated-fg-muted: #547083;
  --illustrated-surface-subtle: rgba(255, 255, 255, 0.34);
  --illustrated-surface-muted: rgba(247, 251, 250, 0.72);
  --illustrated-surface-card: rgba(247, 251, 250, 0.94);
  --illustrated-surface-tag: #ffffff;
  --illustrated-group-panel-background: rgba(247, 251, 250, 0.94);
  --illustrated-group-panel-collapsed-background: rgba(247, 251, 250, 0.82);
  --illustrated-group-panel-highlight: rgba(255, 255, 255, 0.5);
  --illustrated-group-toggle-background: linear-gradient(90deg, rgba(169, 140, 232, 0.08), rgba(220, 239, 235, 0.5));
  --illustrated-group-toggle-hover-background: linear-gradient(90deg, rgba(169, 140, 232, 0.13), rgba(217, 240, 234, 0.72));
  --illustrated-group-chevron-fg: #31536d;
  --illustrated-profile-subnav-background: rgba(247, 251, 250, 0.72);
  --illustrated-profile-story-background: linear-gradient(180deg, rgba(255, 255, 255, 0.34), transparent 46%), rgba(247, 251, 250, 0.88);
  --illustrated-profile-story-highlight: rgba(255, 255, 255, 0.5);
  --illustrated-profile-story-mobile-background: rgba(247, 251, 250, 0.9);
  --illustrated-mobile-summary-background: rgba(168, 200, 199, 0.38);
  --illustrated-compact-row-background: linear-gradient(90deg, rgba(247, 251, 250, 0.74), rgba(220, 239, 235, 0.56));
  --illustrated-tag-border-color: #a7c5c1;
  --illustrated-compact-divider-color: #bfd3d0;
  --illustrated-compact-mobile-divider-color: #bfd3d0;
  --illustrated-compact-skill-background: var(--illustrated-compact-row-background);
  --illustrated-compact-holding-background: var(--illustrated-compact-row-background);
  --illustrated-skill-cost-fg: #547083;
  --illustrated-skill-cost-label-fg: #31536d;
  --illustrated-compact-skill-cost-fg: #547083;
  --illustrated-compact-skill-cost-label-fg: #31536d;
  --illustrated-compact-tag-border-color: #a7c5c1;
  --illustrated-compact-tag-background: #ffffff;
  --illustrated-compact-tag-fg: #31536d;
  --illustrated-compact-effect-fg: #31536d;
  --illustrated-compact-effect-name-fg: color-mix(in srgb, var(--item-color) 72%, #17324a);
  --illustrated-compact-effect-text-fg: #31536d;
  --illustrated-compact-row-description-fg: #547083;
  --illustrated-compact-description-fg: #547083;
  --illustrated-compact-holding-type-fg: color-mix(in srgb, var(--item-color) 72%, #17324a);
  --illustrated-creator-meta-fg: #17324a;
  --illustrated-creator-metadata-fg: #31536d;
  --illustrated-compact-profile-body-fg: #31536d;
  --illustrated-radar-card-background: rgba(255, 255, 255, 0.34);
  --illustrated-dialog-backdrop: rgba(23, 50, 74, 0.34);
  --illustrated-dialog-depth-shadow: 0 20px 50px rgba(23, 50, 74, 0.14);
  --illustrated-mobile-portrait-overlay:
    linear-gradient(180deg, rgba(23, 50, 74, 0.05) 0%, transparent 32%, transparent 62%, rgba(23, 50, 74, 0.2) 100%),
    linear-gradient(90deg, rgba(131, 220, 203, 0.12), transparent 22%, transparent 78%, rgba(169, 140, 232, 0.12));
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
  --illustrated-mobile-name-shadow: none;
  --illustrated-mobile-subtitle-shadow: none;
  --illustrated-resource-label-shadow: none;
  --illustrated-resource-value-shadow: none;
  --illustrated-quote-fg: #31536d;
  --illustrated-quote-shadow: none;
  --illustrated-item-marker-shadow: none;
  --illustrated-skill-marker-shadow: none;
  --illustrated-profile-heading-shadow: none;
  --illustrated-story-heading-shadow: none;
  --illustrated-dialog-fg: #17324a;
  --illustrated-profile-story-body-fg: #31536d;
  --illustrated-story-link-title-fg: #17324a;
  --illustrated-story-link-body-fg: #31536d;
  --illustrated-story-link-button-fg: #17324a;
  --illustrated-story-link-heading-shadow: none;
  --illustrated-tier-shadow: none;
  --illustrated-page-title-shadow: none;
  --illustrated-attribute-value-shadow: none;
  --illustrated-panel-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
  --illustrated-item-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
  --illustrated-nav-shadow: 0 -8px 24px rgba(23, 50, 74, 0.08);
  --illustrated-divinity-fg: #17324a;
  --illustrated-divinity-fg-soft: #547083;
  --illustrated-divinity-meta-fg: #547083;
  --illustrated-divinity-body-fg: #31536d;
  --illustrated-divinity-surface: rgba(247, 251, 250, 0.78);
  --illustrated-divinity-hero-overlay: linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(220, 239, 235, 0.34));
  --illustrated-divinity-card-overlay: linear-gradient(135deg, rgba(255, 255, 255, 0.34), rgba(220, 239, 235, 0.12));
  --illustrated-divinity-inset-highlight: rgba(255, 255, 255, 0.46);
  --illustrated-divinity-heading-shadow: none;
  --illustrated-race-accent: #42a996;
  --illustrated-race-accent-rgb: 66, 169, 150;
  --illustrated-tier-accent: #a98ce8;
  --illustrated-tier-accent-rgb: 169, 140, 232;
  /* --- 6A token assignments：导航 --- */
  --illustrated-nav-border-color: #9abbb7;
  --illustrated-tab-fg: #31536d;
  --illustrated-tab-active-fg: #17324a;
  --illustrated-tab-active-background: #d9f0ea;
  --illustrated-tab-active-indicator: #f078a6;
  --illustrated-side-rail-border-color: #9abbb7;
  /* current preview 的导航表面是 .94；布局继续使用 platform side rail。 */
  --illustrated-side-rail-background: rgba(247, 251, 250, 0.94);
  --illustrated-side-rail-shadow: -8px 0 20px rgba(23, 50, 74, 0.08);
  --illustrated-side-rail-tab-active-background: #d9f0ea;
  /* --- current Iris preview：属性旗标 --- */
  --illustrated-attribute-border: 1px solid #85b7b0;
  --illustrated-attribute-border-top: 1px solid #85b7b0;
  --illustrated-attribute-border-bottom-color: #85b7b0;
  --illustrated-attribute-radius: 18px 18px 46% 46% / 18px 18px 24% 24%;
  --illustrated-attribute-background: linear-gradient(180deg, #f9fcfb 0%, #e6f4f1 58%, #bfe8df 100%);
  --illustrated-attribute-clip-path: none;
  --illustrated-attribute-fg: #17324a;
  --illustrated-attribute-shadow: 0 8px 14px rgba(23, 50, 74, 0.1), inset 0 0 0 4px rgba(255, 255, 255, 0.52);
  --illustrated-attribute-total-fg: #be4f79;
  /* --- current Iris preview：立绘媒体（frame 由 pane pseudo 提供） --- */
  --illustrated-portrait-media-border: none;
  --illustrated-portrait-media-radius: 0;
  --illustrated-portrait-media-object-position: 50% 48%;
  --illustrated-portrait-media-shadow: none;
  --illustrated-portrait-media-clip-path: none;
  /* --- current Iris preview：内容面板 --- */
  --illustrated-border-faint: #a6c3c0;
  --illustrated-surface-card: rgba(247, 251, 250, 0.94);
  --illustrated-item-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
  --illustrated-panel-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
  --illustrated-group-panel-border-color: #a6c3c0;
  --illustrated-group-panel-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
  --illustrated-group-panel-background: rgba(247, 251, 250, 0.94);
  --illustrated-group-panel-mobile-border-color: #a6c3c0;
  --illustrated-group-panel-mobile-background: rgba(247, 251, 250, 0.94);
  --illustrated-story-block-background: rgba(247, 251, 250, 0.94);
  --illustrated-story-block-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
  /* 旧 direct `background:` 会整体替换底层表面，platform 的 8 层 corner
     gradient 必须显式关掉，否则会盖住主题表面。 */
  --illustrated-text-block-corner-color: transparent;
  --illustrated-text-block-background: rgba(247, 251, 250, 0.94);
  --illustrated-text-block-border-color: #a6c3c0;
}

/* ============================================================
 * Anastasia — 当前 preview：浅色银蓝 / 金色
 *
 * 视觉真值取自 docs/previews/char_info_viewer/anastasia-layout-preview.html
 * 的最终 cascade；保留 current platform 的 1200×800 与 desktop side rail，
 * 不倒退复制旧 preview 的横向 tabs / 1200×932 layout。
 * ============================================================ */
.illustrated-v2-theme-anastasia .illustrated-wrapper {
  color-scheme: light;
  color: #14304b;
  --illustrated-bg: #e6edf1;
  --illustrated-panel: rgba(241, 246, 248, 0.88);
  --illustrated-fg: #14304b;
  --illustrated-fg-soft: #315873;
  --illustrated-fg-muted: #547083;
  --illustrated-surface-subtle: rgba(255, 255, 255, 0.58);
  --illustrated-surface-muted: rgba(239, 245, 247, 0.78);
  --illustrated-surface-card:
    radial-gradient(ellipse at 50% 0, rgba(255, 255, 255, 0.9), transparent 62%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(234, 242, 248, 0.76));
  --illustrated-surface-tag: #f8fbfd;
  --illustrated-group-panel-collapsed-background: rgba(239, 245, 247, 0.76);
  --illustrated-group-panel-highlight: rgba(255, 255, 255, 0.94);
  --illustrated-group-toggle-background: linear-gradient(90deg, rgba(10, 45, 78, 0.05), rgba(215, 227, 235, 0.42));
  --illustrated-group-toggle-hover-background: linear-gradient(90deg, rgba(10, 45, 78, 0.08), rgba(215, 227, 235, 0.62));
  --illustrated-group-chevron-fg: #315873;
  --illustrated-profile-subnav-background: rgba(248, 252, 254, 0.82);
  --illustrated-profile-story-background:
    radial-gradient(ellipse at 50% 0, rgba(255, 255, 255, 0.88), transparent 62%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(234, 242, 248, 0.74));
  --illustrated-profile-story-highlight: rgba(255, 255, 255, 0.92);
  --illustrated-profile-story-mobile-background: rgba(239, 245, 247, 0.9);
  --illustrated-mobile-summary-background: rgba(239, 245, 247, 0.9);
  --illustrated-compact-row-background: linear-gradient(90deg, rgba(248, 252, 254, 0.9), rgba(225, 237, 244, 0.72));
  --illustrated-tag-border-color: rgba(10, 45, 78, 0.26);
  --illustrated-compact-divider-color: rgba(10, 45, 78, 0.16);
  --illustrated-compact-mobile-divider-color: rgba(10, 45, 78, 0.16);
  --illustrated-compact-skill-background: var(--illustrated-compact-row-background);
  --illustrated-compact-holding-background: var(--illustrated-compact-row-background);
  --illustrated-skill-cost-fg: #547083;
  --illustrated-skill-cost-label-fg: #315873;
  --illustrated-compact-skill-cost-fg: #547083;
  --illustrated-compact-skill-cost-label-fg: #315873;
  --illustrated-compact-tag-border-color: rgba(10, 45, 78, 0.26);
  --illustrated-compact-tag-background: #f8fbfd;
  --illustrated-compact-tag-fg: #214e6c;
  --illustrated-compact-effect-fg: #315873;
  --illustrated-compact-effect-name-fg: color-mix(in srgb, var(--item-color) 72%, #14304b);
  --illustrated-compact-effect-text-fg: #315873;
  --illustrated-compact-row-description-fg: #547083;
  --illustrated-compact-description-fg: #547083;
  --illustrated-compact-holding-type-fg: color-mix(in srgb, var(--item-color) 72%, #14304b);
  --illustrated-creator-meta-fg: #14304b;
  --illustrated-creator-metadata-fg: #315873;
  --illustrated-compact-profile-body-fg: #315873;
  --illustrated-radar-card-background: rgba(255, 255, 255, 0.42);
  --illustrated-nav-background: rgba(248, 252, 254, 0.9);
  --illustrated-mobile-nav-background: rgba(248, 252, 254, 0.94);
  --illustrated-page-title-fg: #0a2d4e;
  --illustrated-race-accent: #0a2d4e;
  --illustrated-race-accent-rgb: 10, 45, 78;
  --illustrated-tier-accent: #d9b56a;
  --illustrated-tier-accent-rgb: 217, 181, 106;
  --illustrated-shell-border-color: rgba(10, 45, 78, 0.14);
  --illustrated-shell-background:
    radial-gradient(circle at 52% -10%, rgba(247, 250, 251, 0.58), transparent 30rem),
    radial-gradient(circle at 78% 22%, rgba(24, 69, 110, 0.06), transparent 30rem),
    radial-gradient(circle at 86% 46%, rgba(217, 181, 106, 0.08), transparent 17rem),
    linear-gradient(180deg, rgba(239, 245, 247, 0.97) 0%, rgba(229, 237, 241, 0.97) 42%, rgba(214, 226, 233, 0.97) 100%),
    #e6edf1;
  --illustrated-shell-shadow:
    0 18px 46px rgba(15, 48, 78, 0.16),
    0 0 0 1px rgba(10, 45, 78, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --illustrated-portrait-pane-background: transparent;
  --illustrated-data-pane-background:
    linear-gradient(90deg, rgba(10, 45, 78, 0.05), transparent 38%, rgba(10, 45, 78, 0.035)),
    linear-gradient(180deg, rgba(239, 245, 247, 0.54), rgba(220, 231, 237, 0.48));
  --illustrated-detail-pane-background: var(--illustrated-data-pane-background);
  --illustrated-detail-wallpaper-filter: saturate(0.88) brightness(1.04);
  --illustrated-detail-wallpaper-opacity: 0.16;
  --illustrated-flag-width: 152px;
  --illustrated-flag-height: 154px;
  --illustrated-flag-gap: 12px;

  --illustrated-name-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9),
    0 8px 18px rgba(10, 45, 78, 0.16);
  --illustrated-text-shadow: none;
  --illustrated-heading-shadow: none;
  --illustrated-mobile-name-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9),
    0 8px 18px rgba(10, 45, 78, 0.16);
  --illustrated-mobile-subtitle-shadow: none;
  --illustrated-resource-label-shadow: none;
  --illustrated-resource-value-shadow: none;
  --illustrated-quote-fg: #315873;
  --illustrated-quote-shadow: none;
  --illustrated-item-marker-shadow: none;
  --illustrated-skill-marker-shadow: none;
  --illustrated-profile-heading-shadow: none;
  --illustrated-story-heading-shadow: none;
  --illustrated-dialog-fg: #14304b;
  --illustrated-profile-story-body-fg: #315873;
  --illustrated-story-link-title-fg: #14304b;
  --illustrated-story-link-body-fg: #315873;
  --illustrated-story-link-button-fg: #0a2d4e;
  --illustrated-story-link-heading-shadow: none;
  --illustrated-tier-shadow: none;
  --illustrated-page-title-shadow: none;
  --illustrated-attribute-value-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92),
    0 6px 14px rgba(182, 59, 73, 0.18);
  --illustrated-panel-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    0 14px 28px rgba(15, 48, 78, 0.12);
  --illustrated-item-shadow: var(--illustrated-panel-shadow);
  --illustrated-nav-shadow: 0 -8px 20px rgba(15, 48, 78, 0.08);
  --illustrated-divinity-fg: #14304b;
  --illustrated-divinity-fg-soft: #547083;
  --illustrated-divinity-meta-fg: #547083;
  --illustrated-divinity-body-fg: #315873;
  --illustrated-divinity-surface: rgba(248, 252, 254, 0.82);
  --illustrated-divinity-hero-overlay: linear-gradient(180deg, rgba(255, 255, 255, 0.44), rgba(215, 227, 235, 0.34));
  --illustrated-divinity-card-overlay: linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(225, 237, 244, 0.2));
  --illustrated-divinity-inset-highlight: rgba(255, 255, 255, 0.72);
  --illustrated-divinity-heading-shadow: none;

  --illustrated-nav-border-color: rgba(10, 45, 78, 0.16);
  --illustrated-tab-fg: #315873;
  --illustrated-tab-active-fg: #0a2d4e;
  --illustrated-tab-active-background: transparent;
  --illustrated-tab-active-indicator: #d9b56a;
  --illustrated-side-rail-border-color: rgba(10, 45, 78, 0.16);
  --illustrated-side-rail-background: rgba(248, 252, 254, 0.9);
  --illustrated-side-rail-shadow: -8px 0 18px rgba(15, 48, 78, 0.08);
  --illustrated-side-rail-tab-active-background: rgba(10, 45, 78, 0.07);

  --illustrated-attribute-border: 1px solid rgba(10, 45, 78, 0.14);
  --illustrated-attribute-border-top: 2px solid rgba(10, 45, 78, 0.54);
  --illustrated-attribute-border-bottom-color: rgba(95, 143, 168, 0.7);
  --illustrated-attribute-radius: 0;
  --illustrated-attribute-background:
    linear-gradient(180deg, transparent 0 11px, rgba(24, 69, 110, 0.9) 11px 13px, transparent 13px 16px, rgba(24, 69, 110, 0.72) 16px 18px, transparent 18px),
    radial-gradient(ellipse at 50% 0, rgba(255, 255, 255, 0.96), transparent 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(232, 241, 248, 0.94) 52%, rgba(95, 143, 168, 0.82) 100%);
  --illustrated-attribute-clip-path: polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%);
  --illustrated-attribute-fg: #0a2d4e;
  --illustrated-attribute-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -14px 24px rgba(95, 143, 168, 0.18),
    0 12px 24px rgba(15, 48, 78, 0.13),
    0 0 0 1px rgba(255, 255, 255, 0.72);
  --illustrated-attribute-total-fg: #b63b49;

  --illustrated-portrait-media-border: none;
  --illustrated-portrait-media-radius: 8px;
  --illustrated-portrait-media-object-position: top center;
  --illustrated-portrait-media-shadow:
    0 0 0 1px rgba(155, 176, 194, 0.2),
    0 16px 36px rgba(0, 0, 0, 0.28),
    0 0 28px rgba(24, 69, 110, 0.1);
  --illustrated-portrait-media-clip-path: polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px);

  --illustrated-border-faint: rgba(10, 45, 78, 0.16);
  --illustrated-group-panel-border-color: rgba(10, 45, 78, 0.16);
  --illustrated-group-panel-shadow: var(--illustrated-panel-shadow);
  --illustrated-group-panel-background: var(--illustrated-surface-card);
  --illustrated-group-panel-mobile-border-color: rgba(10, 45, 78, 0.18);
  --illustrated-group-panel-mobile-background: rgba(248, 252, 254, 0.9);
  --illustrated-story-block-background: var(--illustrated-surface-card);
  --illustrated-story-block-shadow: var(--illustrated-panel-shadow);
  --illustrated-text-block-corner-color: transparent;
  --illustrated-text-block-background: var(--illustrated-surface-card);
  --illustrated-text-block-border-color: rgba(10, 45, 78, 0.16);
}

/* ============================================================
 * 仍需 direct selector 的视觉差异
 * 这些无法由现有 token 等价表达，保留在 DX。
 * ============================================================ */

/*
 * Iris header 等级条：旧 direct 是 #7258ba，而 --illustrated-tier-accent 是
 * #a98ce8。tier-accent 被 7 个 default 文件消费（含 Story / Quote / Attribute），
 * 改它会把整卡紫色系一起改掉，因此头部这一处保留 direct selector，
 * 而不是新增一个 header-only token。
 */
.illustrated-v2-theme-iris .illustrated-header .illustrated-level,
.illustrated-v2-theme-iris .illustrated-header .illustrated-tier {
  color: #7258ba;
}

/*
 * Anastasia current preview 的 header 等级文字是 #1a4865，而 tier accent 仍是金色。
 * 和 Iris 同理，不能为了 header 这一处改掉全局 tier-accent。
 */
.illustrated-v2-theme-anastasia .illustrated-header .illustrated-level,
.illustrated-v2-theme-anastasia .illustrated-header .illustrated-tier {
  color: #1a4865;
}

.illustrated-v2-theme-anastasia .illustrated-header .illustrated-badge-separator,
.illustrated-v2-theme-anastasia .illustrated-header .illustrated-meta-sep {
  color: #925b18;
}

/* ============================================================
 * DX 私有装饰层
 * 这些不是主题表面差异，而是 DX 自己的美术表达，保持 DX-owned。
 * ============================================================ */

/* --- Anastasia：current preview 的浅色内框 --- */
.illustrated-v2-theme-anastasia .illustrated-shell::before {
  content: '';
  position: absolute;
  inset: 9px;
  z-index: 9;
  border: 1px solid rgba(10, 45, 78, 0.14);
  border-radius: 10px;
  background: none;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.82),
    inset 0 0 26px rgba(10, 45, 78, 0.04);
  pointer-events: none;
}

/*
 * current preview 最终 cascade 明确关闭旧深色版的 portrait frame pseudo。
 * 图像本身仍保留八角 clip 与浅色 shadow，由 portrait media token 表达。
 */
.illustrated-v2-theme-anastasia .illustrated-portrait-pane {
  padding: 14px 10px 14px 14px;
  background: transparent;
}

.illustrated-v2-theme-anastasia .illustrated-portrait-pane::before,
.illustrated-v2-theme-anastasia .illustrated-portrait-pane::after {
  display: none;
}

/* --- Anastasia：current preview 的浅色锚点底纹 --- */
.illustrated-v2-theme-anastasia .illustrated-data-pane {
  isolation: isolate;
}

.illustrated-v2-theme-anastasia .illustrated-data-pane::before,
.illustrated-v2-theme-anastasia .illustrated-data-pane::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.illustrated-v2-theme-anastasia .illustrated-data-pane::before {
  /* 资产在仓库根 assets/。本文件位于 src/char_info_viewer/components/illustrated/dx/，
     比旧的 illustrated/ 深一层，因此相对路径多一个 ..。 */
  background: url('../../../../../assets/char_info_viewer/materials/anchor.svg') center / 260px 260px repeat;
  opacity: 0.12;
  filter: saturate(0.64) contrast(0.88);
  mix-blend-mode: multiply;
}

.illustrated-v2-theme-anastasia .illustrated-data-pane::after {
  background:
    radial-gradient(ellipse at 50% 10%, rgba(246, 249, 250, 0.36), transparent 22rem),
    radial-gradient(ellipse at 50% 62%, rgba(24, 69, 110, 0.07), transparent 24rem);
}

.illustrated-v2-theme-anastasia .illustrated-data-pane > * {
  position: relative;
  z-index: 1;
}

/* --- Iris：current preview 的立绘框 / readability overlay --- */
.illustrated-v2-theme-iris .illustrated-portrait-pane {
  overflow: hidden;
  border-right: 1px solid #8cb5b0;
  background: #a8c8c7;
}

.illustrated-v2-theme-iris .illustrated-portrait-pane::before {
  content: '';
  position: absolute;
  inset: 15px;
  z-index: 3;
  border: 1px solid rgba(231, 255, 251, 0.88);
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 1px rgba(23, 50, 74, 0.22),
    0 0 0 4px rgba(131, 220, 203, 0.1);
  pointer-events: none;
}

.illustrated-v2-theme-iris .illustrated-portrait-pane::after {
  z-index: 2;
  background:
    linear-gradient(180deg, rgba(23, 50, 74, 0.05) 0%, transparent 32%, transparent 62%, rgba(23, 50, 74, 0.2) 100%),
    linear-gradient(90deg, rgba(131, 220, 203, 0.12), transparent 22%, transparent 78%, rgba(169, 140, 232, 0.12));
}

/* --- Iris：current preview 的资料区底纹 --- */
.illustrated-v2-theme-iris .illustrated-data-pane {
  isolation: isolate;
}

.illustrated-v2-theme-iris .illustrated-data-pane::before,
.illustrated-v2-theme-iris .illustrated-data-pane::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.illustrated-v2-theme-iris .illustrated-data-pane::before {
  background-color: #dcefeb;
  background-image:
    radial-gradient(circle at 15% 16%, rgba(240, 120, 166, 0.14) 0 3px, transparent 4px),
    radial-gradient(circle at 82% 23%, rgba(169, 140, 232, 0.15) 0 4px, transparent 5px),
    radial-gradient(circle at 62% 78%, rgba(66, 169, 150, 0.12) 0 5px, transparent 6px),
    radial-gradient(circle at 34% 55%, transparent 0 19px, rgba(114, 88, 186, 0.08) 20px 21px, transparent 22px);
  background-size:
    88px 88px,
    126px 126px,
    148px 148px,
    180px 180px;
}

.illustrated-v2-theme-iris .illustrated-data-pane::after {
  background: linear-gradient(
    135deg,
    rgba(247, 251, 250, 0.76),
    rgba(220, 239, 235, 0.42) 48%,
    rgba(235, 226, 250, 0.4)
  );
}

.illustrated-v2-theme-iris .illustrated-data-pane > * {
  position: relative;
  z-index: 1;
}

/* --- Iris：属性旗标 current preview 顶部色条 + 右下角装饰点 --- */
.illustrated-v2-theme-iris .illustrated-attribute {
  overflow: hidden;
}

.illustrated-v2-theme-iris .illustrated-attribute::before {
  content: '';
  display: block;
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 9px;
  border-bottom: 2px solid #7258ba;
  background: #83dccb;
  pointer-events: none;
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

/*
 * current preview 的 mobile nameplate 是浅色半透明可读性盒。
 * default specialNpc 会把普通 header box 透明化，这里按 Iris 当前设计补回主题自己的 surface。
 */
.illustrated-v2-theme-iris
  .illustrated-shell.is-special-npc.is-overview-tab
  .illustrated-portrait-pane
  .illustrated-mobile-header-overlay,
.illustrated-v2-theme-iris
  .illustrated-shell.is-special-npc.is-overview-tab
  .illustrated-portrait-pane.force-mobile-layout
  .illustrated-mobile-header-overlay {
  padding: 12px 14px 13px;
  border: 1px solid rgba(131, 220, 203, 0.9);
  border-radius: 8px;
  background: rgba(237, 245, 243, 0.94);
  box-shadow: 0 9px 22px rgba(23, 50, 74, 0.22);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
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
  .illustrated-v2-theme-iris .illustrated-portrait-pane::before {
    inset: 11px;
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
