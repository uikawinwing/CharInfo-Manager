<template>
  <div class="illustrated-v2-surface" :class="`illustrated-v2-theme-${theme}`">
    <IllustratedCharacterSheet v-bind="$attrs" side-rail-navigation />

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
import IllustratedCharacterSheet from './IllustratedCharacterSheet.vue';

export type IllustratedV2Theme = 'default' | 'iris' | 'anastasia' | 'venus' | 'seren';

withDefaults(defineProps<{ theme?: IllustratedV2Theme }>(), { theme: 'default' });
defineOptions({ inheritAttrs: false });
</script>

<style>
.illustrated-v2-surface {
  position: relative;
  width: 100%;
}
.illustrated-v2-theme-iris .illustrated-wrapper {
  color-scheme: light;
  color: #17324a;
  --illustrated-bg: #dce9e7;
  --illustrated-panel: rgba(247, 251, 250, 0.94);
  --illustrated-shell-border-color: rgba(49, 83, 109, 0.58);
  --illustrated-shell-background:
    radial-gradient(circle at 76% 4%, rgba(169, 140, 232, 0.18), transparent 24rem),
    radial-gradient(circle at 18% 92%, rgba(240, 120, 166, 0.13), transparent 28rem),
    linear-gradient(145deg, #edf5f3 0%, #dcefeb 54%, #e9e1f7 100%);
  --illustrated-shell-shadow: 0 0 0 4px rgba(247, 251, 250, 0.78), 0 0 0 5px rgba(66, 169, 150, 0.48), 0 22px 52px rgba(23, 50, 74, 0.2);
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
  --illustrated-fg-dim: #6f8290;
  --illustrated-border-soft: rgba(49, 83, 109, 0.16);
  --illustrated-border-faint: rgba(49, 83, 109, 0.1);
  --illustrated-divider: rgba(66, 169, 150, 0.22);
  --illustrated-surface-subtle: rgba(255, 255, 255, 0.34);
  --illustrated-surface-muted: rgba(247, 251, 250, 0.72);
  --illustrated-surface-card: rgba(247, 251, 250, 0.95);
  --illustrated-surface-tag: #ffffff;
  --illustrated-text-block-background: linear-gradient(145deg, rgba(247, 251, 250, 0.98), rgba(220, 239, 235, 0.92));
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
  --illustrated-overlay-background: rgba(247, 251, 250, 0.76);
  --illustrated-overlay-shadow: 0 8px 24px rgba(23, 50, 74, 0.1);
  --illustrated-overlay-soft-shadow: 0 5px 14px rgba(23, 50, 74, 0.08);
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
  --illustrated-side-rail-background: rgba(247, 251, 250, 0.96);
  --illustrated-side-rail-shadow: -8px 0 20px rgba(23, 50, 74, 0.08);
  --illustrated-v2-side-rail-background: rgba(247, 251, 250, 0.94);
  --illustrated-v2-side-rail-shadow: -8px 0 20px rgba(23, 50, 74, 0.08);
  --illustrated-page-title-fg: #17324a;
  --illustrated-name-shadow: none;
  --illustrated-text-shadow: none;
  --illustrated-heading-shadow: none;
  --illustrated-tier-shadow: none;
  --illustrated-page-title-shadow: none;
  --illustrated-attribute-value-shadow: none;
  --illustrated-mobile-name-shadow: none;
  --illustrated-mobile-subtitle-shadow: none;
  --illustrated-quote-shadow: none;
  --illustrated-mobile-quote-shadow: none;
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
.illustrated-v2-theme-iris .illustrated-shell {
  border-color: rgba(49, 83, 109, 0.58);
  background:
    radial-gradient(circle at 76% 4%, rgba(169, 140, 232, 0.18), transparent 24rem),
    radial-gradient(circle at 18% 92%, rgba(240, 120, 166, 0.13), transparent 28rem),
    linear-gradient(145deg, #edf5f3 0%, #dcefeb 54%, #e9e1f7 100%);
  box-shadow: 0 0 0 4px rgba(247, 251, 250, 0.78), 0 0 0 5px rgba(66, 169, 150, 0.48), 0 22px 52px rgba(23, 50, 74, 0.2);
}
.illustrated-v2-theme-iris .illustrated-portrait-pane { padding: 12px; background: #a8c8c7; }

.illustrated-v2-theme-iris .illustrated-portrait-image,
.illustrated-v2-theme-iris .illustrated-portrait-video {
  border: 1px solid rgba(237, 255, 251, 0.88);
  border-radius: 10px;
  object-position: 50% 48%;
  box-shadow: 0 12px 28px rgba(23, 50, 74, 0.2);
}
.illustrated-v2-theme-iris .illustrated-data-pane {
  color: #17324a;
  background:
    radial-gradient(circle at 15% 16%, rgba(240, 120, 166, 0.13) 0 3px, transparent 4px) 0 0 / 88px 88px,
    radial-gradient(circle at 82% 23%, rgba(169, 140, 232, 0.14) 0 4px, transparent 5px) 0 0 / 126px 126px,
    linear-gradient(135deg, rgba(247, 251, 250, 0.96), #dcefeb 52%, #ebe2fa);
}
.illustrated-v2-theme-iris .illustrated-page-title,
.illustrated-v2-theme-iris .illustrated-page-title h2 { color: #17324a; text-shadow: none; }
.illustrated-v2-theme-iris .illustrated-header .illustrated-level,
.illustrated-v2-theme-iris .illustrated-header .illustrated-tier { color: #7258ba; text-shadow: none; }
.illustrated-v2-theme-iris .illustrated-header .illustrated-subtitle { color: #31536d; text-shadow: none; }
.illustrated-v2-theme-iris .illustrated-attribute {
  border: 1px solid #85b7b0;
  border-radius: 18px 18px 42% 42% / 18px 18px 22% 22%;
  background: linear-gradient(180deg, #f9fcfb 0%, #e6f4f1 58%, #bfe8df 100%);
  clip-path: none;
  color: #17324a;
  box-shadow: 0 8px 14px rgba(23, 50, 74, 0.1), inset 0 0 0 4px rgba(255,255,255,.5);
}
.illustrated-v2-theme-iris .illustrated-attribute-total { color: #be4f79; text-shadow: none; }
.illustrated-v2-theme-iris .illustrated-profile-card,
.illustrated-v2-theme-iris .illustrated-text-block,
.illustrated-v2-theme-iris .illustrated-list-item,
.illustrated-v2-theme-iris .illustrated-story-block,
.illustrated-v2-theme-iris .illustrated-group-panel {
  border-color: #a6c3c0;
  background: rgba(247, 251, 250, 0.95);
  color: #17324a;
  box-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
}
.illustrated-v2-theme-iris .illustrated-effect-item,
.illustrated-v2-theme-iris .illustrated-effect-text,
.illustrated-v2-theme-iris .illustrated-description,
.illustrated-v2-theme-iris .illustrated-line,
.illustrated-v2-theme-iris .illustrated-text-block p { color: #31536d; text-shadow: none; }
.illustrated-v2-theme-iris .illustrated-tag { border-color: #a7c5c1; background: #fff; color: #31536d; }
.illustrated-v2-theme-iris .illustrated-tabs { border-color: #9abbb7; background: rgba(247,251,250,.96); }
.illustrated-v2-theme-iris .illustrated-tab-button { color: #31536d; }
.illustrated-v2-theme-iris .illustrated-tab-button:hover,
.illustrated-v2-theme-iris .illustrated-tab-button.active { background: #d9f0ea; color: #17324a; }
.illustrated-v2-theme-iris .illustrated-tab-button.active::after { background: #f078a6; }

.illustrated-v2-theme-anastasia .illustrated-wrapper {
  color-scheme: dark;
  color: #e8eef2;
  --illustrated-bg: #07182b;
  --illustrated-panel: rgba(8, 29, 51, 0.9);
  --illustrated-fg: #e8eef2;
  --illustrated-fg-soft: #c4d0d9;
  --illustrated-fg-muted: #9fb2c0;
  --illustrated-fg-dim: #8299a9;
  --illustrated-border-soft: rgba(155, 176, 194, 0.28);
  --illustrated-border-faint: rgba(155, 176, 194, 0.18);
  --illustrated-divider: rgba(155, 176, 194, 0.24);
  --illustrated-surface-subtle: rgba(12, 39, 65, 0.48);
  --illustrated-surface-muted: rgba(10, 34, 58, 0.72);
  --illustrated-surface-card: rgba(8, 29, 51, 0.9);
  --illustrated-surface-tag: rgba(15, 51, 82, 0.88);
  --illustrated-text-block-background: linear-gradient(180deg, rgba(18, 49, 78, 0.9), rgba(6, 24, 43, 0.92));
  --illustrated-group-panel-background: rgba(8, 29, 51, 0.88);
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
  --illustrated-overlay-background: rgba(7, 24, 43, 0.82);
  --illustrated-nav-background: rgba(5, 20, 36, 0.94);
  --illustrated-mobile-nav-background: rgba(5, 20, 36, 0.94);
  --illustrated-side-rail-background: rgba(4, 16, 30, 0.96);
  --illustrated-v2-side-rail-background: linear-gradient(180deg, rgba(24, 69, 110, 0.16), transparent 44%), rgba(4, 16, 30, 0.96);
  --illustrated-v2-side-rail-shadow: -8px 0 24px rgba(0, 0, 0, 0.24);
  --illustrated-page-title-fg: #f4f7f9;
  --illustrated-race-accent: #e8eef2;
  --illustrated-race-accent-rgb: 232, 238, 242;
  --illustrated-tier-accent: #d9b56a;
  --illustrated-tier-accent-rgb: 217, 181, 106;
  --illustrated-flag-width: 152px;
  --illustrated-flag-height: 154px;
  --illustrated-flag-gap: 12px;
}

.illustrated-v2-theme-anastasia .illustrated-shell {
  border-color: rgba(232, 238, 242, 0.58);
  background:
    radial-gradient(circle at 48% -8%, rgba(232, 238, 242, 0.18), transparent 28rem),
    radial-gradient(circle at 82% 22%, rgba(95, 159, 189, 0.14), transparent 28rem),
    radial-gradient(circle at 76% 78%, rgba(217, 181, 106, 0.08), transparent 20rem),
    linear-gradient(180deg, #243c53 0%, #0b2948 38%, #061426 72%, #030a13 100%);
  box-shadow:
    0 0 0 2px rgba(232, 238, 242, 0.16),
    0 0 0 4px rgba(24, 69, 110, 0.2),
    0 0 32px rgba(95, 159, 189, 0.18),
    0 24px 64px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

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

.illustrated-v2-theme-anastasia .illustrated-portrait-pane {
  padding: 12px;
  background:
    linear-gradient(180deg, rgba(232, 238, 242, 0.08), transparent 28%),
    #0a2947;
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

.illustrated-v2-theme-anastasia .illustrated-portrait-image,
.illustrated-v2-theme-anastasia .illustrated-portrait-video {
  border-radius: 8px;
  clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px);
  object-position: top center;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.34);
}

.illustrated-v2-theme-anastasia .illustrated-data-pane {
  color: #e8eef2;
  background:
    radial-gradient(ellipse at 50% 6%, rgba(232, 238, 242, 0.09), transparent 25rem),
    radial-gradient(ellipse at 70% 60%, rgba(95, 159, 189, 0.08), transparent 24rem),
    linear-gradient(180deg, rgba(20, 54, 84, 0.54), rgba(4, 15, 31, 0.76));
  isolation: isolate;
}

.illustrated-v2-theme-anastasia .illustrated-data-pane::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: url('../../../../assets/char_info_viewer/materials/anchor.svg') center / 260px 260px repeat;
  opacity: 0.12;
  filter: saturate(0.64) contrast(0.88);
  pointer-events: none;
}

.illustrated-v2-theme-anastasia .illustrated-data-pane > * {
  position: relative;
  z-index: 1;
}

.illustrated-v2-theme-anastasia .illustrated-header .illustrated-name,
.illustrated-v2-theme-anastasia .illustrated-page-title,
.illustrated-v2-theme-anastasia .illustrated-page-title h2 {
  color: #f4f7f9;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.58);
}

.illustrated-v2-theme-anastasia .illustrated-header .illustrated-level,
.illustrated-v2-theme-anastasia .illustrated-header .illustrated-tier { color: #d9b56a; }
.illustrated-v2-theme-anastasia .illustrated-header .illustrated-subtitle { color: #c4d0d9; }

.illustrated-v2-theme-anastasia .illustrated-attribute {
  border: 1px solid rgba(10, 45, 78, 0.14);
  border-top: 2px solid rgba(10, 45, 78, 0.54);
  border-bottom-color: rgba(95, 143, 168, 0.7);
  border-radius: 0;
  background:
    linear-gradient(180deg, transparent 0 11px, rgba(24, 69, 110, 0.9) 11px 13px, transparent 13px 16px, rgba(24, 69, 110, 0.72) 16px 18px, transparent 18px),
    radial-gradient(ellipse at 50% 0, rgba(255, 255, 255, 0.96), transparent 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(232, 241, 248, 0.94) 52%, rgba(95, 143, 168, 0.82) 100%);
  clip-path: polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%);
  color: #0a2d4e;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -14px 24px rgba(95, 143, 168, 0.18),
    0 12px 24px rgba(15, 48, 78, 0.13),
    0 0 0 1px rgba(255, 255, 255, 0.72);
}

.illustrated-v2-theme-anastasia .illustrated-attribute-total {
  color: #b63b49;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92),
    0 6px 14px rgba(182, 59, 73, 0.18);
}

.illustrated-v2-theme-anastasia .illustrated-profile-card,
.illustrated-v2-theme-anastasia .illustrated-text-block,
.illustrated-v2-theme-anastasia .illustrated-list-item,
.illustrated-v2-theme-anastasia .illustrated-story-block,
.illustrated-v2-theme-anastasia .illustrated-group-panel {
  border-color: rgba(155, 176, 194, 0.34);
  background: linear-gradient(180deg, rgba(18, 49, 78, 0.9), rgba(6, 24, 43, 0.92));
  color: #e8eef2;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.illustrated-v2-theme-anastasia .illustrated-effect-item,
.illustrated-v2-theme-anastasia .illustrated-effect-text,
.illustrated-v2-theme-anastasia .illustrated-description,
.illustrated-v2-theme-anastasia .illustrated-line,
.illustrated-v2-theme-anastasia .illustrated-text-block p { color: #c4d0d9; text-shadow: none; }

.illustrated-v2-theme-anastasia .illustrated-tag {
  border-color: rgba(95, 159, 189, 0.46);
  background: rgba(15, 51, 82, 0.88);
  color: #dce6ec;
}

.illustrated-v2-theme-anastasia .illustrated-tabs {
  border-color: rgba(155, 176, 194, 0.28);
  background: rgba(5, 20, 36, 0.94);
}

.illustrated-v2-theme-anastasia .illustrated-tab-button { color: #aebfcb; }
.illustrated-v2-theme-anastasia .illustrated-tab-button:hover,
.illustrated-v2-theme-anastasia .illustrated-tab-button.active {
  background: linear-gradient(90deg, rgba(95, 159, 189, 0.13), rgba(217, 181, 106, 0.07));
  color: #f4f7f9;
}
.illustrated-v2-theme-anastasia .illustrated-tab-button.active::after { background: #d9b56a; }

@media (min-width: 901px) {
  .illustrated-v2-surface .illustrated-tabs.is-side-rail {
    border-left-color: rgba(var(--illustrated-race-accent-rgb), 0.24);
    background: var(--illustrated-side-rail-background);
    box-shadow: var(--illustrated-side-rail-shadow);
  }

  .illustrated-v2-theme-iris .illustrated-tabs.is-side-rail {
    border-left-color: #9abbb7;
    background: rgba(247, 251, 250, 0.94);
    box-shadow: -8px 0 20px rgba(23, 50, 74, 0.08);
  }

  .illustrated-v2-theme-iris .illustrated-tabs.is-side-rail .illustrated-tab-button.active {
    background: linear-gradient(90deg, rgba(131, 220, 203, 0.26), rgba(169, 140, 232, 0.06));
  }

  .illustrated-v2-theme-iris .illustrated-tabs.is-side-rail .illustrated-tab-button.active::after {
    background: #f078a6;
  }

  .illustrated-v2-theme-anastasia .illustrated-tabs.is-side-rail {
    border-left-color: rgba(155, 176, 194, 0.3);
    background:
      linear-gradient(180deg, rgba(24, 69, 110, 0.16), transparent 44%),
      rgba(4, 16, 30, 0.96);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.24);
  }

  .illustrated-v2-theme-anastasia .illustrated-tabs.is-side-rail .illustrated-tab-button.active {
    background: linear-gradient(90deg, rgba(95, 159, 189, 0.18), rgba(217, 181, 106, 0.08));
  }
}

.illustrated-v2-theme-iris .illustrated-attribute {
  position: relative;
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

.iris-v2-decoration-layer {
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

.iris-v2-portrait-bubbles {
  position: absolute;
  inset: 2.1% auto 2.1% 1.3%;
  width: 42.4%;
  overflow: hidden;
  border-radius: 10px;
}

.iris-v2-bubble {
  position: absolute;
  width: var(--iris-bubble-size);
  aspect-ratio: 1;
  border: 1px solid rgba(226, 255, 250, 0.82);
  border-radius: 50%;
  background: rgba(247, 251, 250, 0.08);
  box-shadow: inset -3px -4px 9px rgba(131, 220, 203, 0.24);
  animation: iris-v2-bubble-float 5.8s ease-in-out infinite alternate;
}

.iris-v2-bubble::after {
  content: '';
  position: absolute;
  top: 20%;
  left: 22%;
  width: 22%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.76);
}

.iris-v2-bubble.bubble-one {
  top: 5%;
  left: 7%;
  --iris-bubble-size: 24px;
  animation-delay: -1.2s;
}

.iris-v2-bubble.bubble-two {
  top: 12%;
  left: 16%;
  --iris-bubble-size: 50px;
  animation-delay: -3.8s;
}

.iris-v2-bubble.bubble-three {
  top: 18%;
  right: 5%;
  --iris-bubble-size: 32px;
  animation-delay: -2.4s;
}

.iris-v2-bubble.bubble-four {
  right: 10%;
  bottom: 20%;
  --iris-bubble-size: 55px;
  animation-delay: -4.7s;
}

.iris-v2-bubble.bubble-five {
  bottom: 10%;
  left: 9%;
  --iris-bubble-size: 27px;
  animation-delay: -0.6s;
}

.iris-v2-toy-node {
  position: absolute;
  width: 14px;
  aspect-ratio: 1;
  border: 2px solid #f7fbfa;
  border-radius: 4px;
  background: #f078a6;
  box-shadow: 0 2px 6px rgba(23, 50, 74, 0.24);
}

.iris-v2-toy-node.toy-one {
  top: 14px;
  left: 14px;
  transform: rotate(15deg);
}

.iris-v2-toy-node.toy-two {
  right: 14px;
  bottom: 14px;
  background: #a98ce8;
  transform: rotate(34deg);
}

.iris-v2-jellyfish {
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

.iris-v2-jellyfish-dome {
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

.iris-v2-jellyfish-dome::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 10px;
  width: 8px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #f078a6;
}

.iris-v2-jellyfish-tentacles {
  position: absolute;
  top: 34px;
  left: 13px;
  display: flex;
  gap: 7px;
}

.iris-v2-jellyfish-tentacles i {
  display: block;
  width: 7px;
  height: 24px;
  border-left: 2px solid currentColor;
  border-radius: 50%;
}

.iris-v2-jellyfish-tentacles i:nth-child(1) { transform: rotate(9deg); }
.iris-v2-jellyfish-tentacles i:nth-child(2) { transform: rotate(-8deg); }
.iris-v2-jellyfish-tentacles i:nth-child(3) { transform: rotate(11deg); }

.iris-v2-dream-dice {
  position: absolute;
  top: 8.1%;
  right: 5.7%;
  display: grid;
  grid-template-columns: repeat(2, 18px);
  gap: 6px;
  transform: rotate(8deg);
}

.iris-v2-dream-dice i {
  width: 18px;
  aspect-ratio: 1;
  border: 2px solid #42a996;
  border-radius: 5px;
  background: #f7fbfa;
  box-shadow: 2px 2px 0 rgba(169, 140, 232, 0.28);
}

.iris-v2-dream-dice i:nth-child(2),
.iris-v2-dream-dice i:nth-child(3) {
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

  .iris-v2-jellyfish,
  .iris-v2-dream-dice {
    display: none;
  }

  .iris-v2-portrait-bubbles {
    inset: 1.8% 3.2%;
    width: auto;
  }

  .iris-v2-toy-node.toy-two {
    bottom: 72px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .iris-v2-bubble,
  .iris-v2-jellyfish {
    animation: none;
  }
}
</style>
