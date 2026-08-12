<template>
  <section class="illustrated-info-grid" :class="{ 'is-compact-profile': !showStats }">
    <IllustratedOverviewPanel
      v-if="showStats"
      class="illustrated-mobile-profile-stats"
      :attributes="attributes"
      :resource-boxes="resourceBoxes"
      @toggle-attribute-formula="$emit('toggleAttributeFormula', $event)"
    />

    <article v-for="block in blocks" :key="block.title" class="illustrated-text-block">
      <h3>{{ block.title }}</h3>
      <p>{{ block.text }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { CharacterViewModel, ResourceBox } from '../../services/characterViewModel';
import IllustratedOverviewPanel from './IllustratedOverviewPanel.vue';
import type { AttributeView } from './types';

const props = withDefaults(
  defineProps<{
    vm: CharacterViewModel;
    attributes: AttributeView[];
    resourceBoxes: ResourceBox[];
    showStats?: boolean;
  }>(),
  {
    showStats: true,
  },
);

defineEmits<{
  toggleAttributeFormula: [key: string];
}>();

const blocks = computed(() =>
  [
    { title: '性格', text: props.vm.personalityText },
    { title: '外貌特质', text: props.vm.appearanceText },
    { title: '喜爱', text: props.vm.likesText },
    { title: '衣物装饰', text: props.vm.attireText },
  ].filter(block => block.text),
);
</script>

<style scoped>
.illustrated-info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.illustrated-mobile-profile-stats {
  display: none;
}

.illustrated-text-block {
  --corner: rgba(var(--illustrated-race-accent-rgb), 0.6);
  position: relative;
  padding: 28px 36px;
  border: 1px solid rgba(255, 255, 255, 0.03);
  background:
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    radial-gradient(ellipse at center, rgba(30, 34, 42, 0.4) 0%, rgba(10, 12, 16, 0.8) 100%);
  background-repeat: no-repeat;
  background-position:
    0 0,
    0 0,
    100% 0,
    100% 0,
    100% 100%,
    100% 100%,
    0 100%,
    0 100%,
    0 0;
  background-size:
    12px 1px,
    1px 12px,
    12px 1px,
    1px 12px,
    12px 1px,
    1px 12px,
    12px 1px,
    1px 12px,
    auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.illustrated-text-block::before,
.illustrated-text-block::after {
  content: '';
  position: absolute;
  right: 15%;
  left: 15%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--illustrated-race-accent-rgb), 0.4), transparent);
}

.illustrated-text-block::before {
  top: 0;
}

.illustrated-text-block::after {
  bottom: 0;
}

.illustrated-text-block h3 {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 18px;
  color: var(--illustrated-race-accent);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-align: center;
  text-shadow: 0 2px 8px rgba(var(--illustrated-race-accent-rgb), 0.3);
}

.illustrated-text-block h3::before,
.illustrated-text-block h3::after {
  content: '◆';
  margin: 0 16px;
  color: rgba(var(--illustrated-race-accent-rgb), 0.45);
  font-size: 10px;
}

.illustrated-text-block p {
  margin: 0;
  color: #e2e8f0;
  font-size: 15px;
  line-height: 1.8;
  white-space: pre-line;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

@media (max-width: 900px) {
  .illustrated-mobile-profile-stats {
    display: flex;
  }

  .illustrated-info-grid.is-compact-profile {
    gap: 0;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-text-block {
    padding: 11px 0 12px;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: transparent;
    box-shadow: none;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-text-block::before,
  .illustrated-info-grid.is-compact-profile .illustrated-text-block::after {
    display: none;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-text-block h3 {
    justify-content: flex-start;
    margin-bottom: 7px;
    font-size: 14px;
    letter-spacing: 0.08em;
    text-align: left;
    text-shadow: none;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-text-block h3::before {
    margin: 0 7px 0 0;
    font-size: 7px;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-text-block h3::after {
    display: none;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-text-block p {
    color: #c9cdd4;
    font-size: 11px !important;
    line-height: 1.65 !important;
    text-shadow: none;
  }
}

@media (max-width: 640px) {
  .illustrated-text-block {
    padding: 22px 20px;
  }
}
</style>
