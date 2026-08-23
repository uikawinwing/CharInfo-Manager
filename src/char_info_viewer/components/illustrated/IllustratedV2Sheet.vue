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
.illustrated-v2-theme-iris .illustrated-header .illustrated-name,
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

@media (min-width: 901px) {
  .illustrated-v2-surface .illustrated-tabs.is-side-rail {
    border-left-color: rgba(var(--illustrated-race-accent-rgb), 0.24);
    background: color-mix(in srgb, var(--illustrated-bg) 94%, transparent);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.1);
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
