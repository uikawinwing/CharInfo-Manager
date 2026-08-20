<template>
  <header
    ref="headerElement"
    class="illustrated-header"
    :class="{ compact, 'has-wrapped-name': hasWrappedName }"
  >
    <h1 class="illustrated-name">{{ vm.nameText }}</h1>
    <span ref="nameMeasurementElement" class="illustrated-name illustrated-name-measure" aria-hidden="true">
      {{ vm.nameText }}
    </span>

    <div v-if="metaItems.length > 0" class="illustrated-subtitle">
      <span v-for="(item, index) in metaItems" :key="`${index}-${item}`" class="illustrated-meta-item">
        <span v-if="index > 0" class="illustrated-meta-sep">◆</span>
        <span class="illustrated-meta-text">{{ item }}</span>
      </span>
    </div>

    <div class="illustrated-level-tier">
      <span class="illustrated-level">LV. {{ vm.levelText }}</span>
      <span class="illustrated-badge-separator">✦</span>
      <span class="illustrated-tier">{{ vm.tierText }}</span>
    </div>

  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { CharacterViewModel } from '../../services/characterViewModel';

const props = withDefaults(
  defineProps<{
    vm: CharacterViewModel;
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);

const metaItems = computed(() =>
  [props.vm.raceText, props.vm.identityText, props.vm.classText].filter(item => item && item !== '-'),
);
const emit = defineEmits<{
  layoutChange: [];
}>();
const headerElement = ref<HTMLElement | null>(null);
const nameMeasurementElement = ref<HTMLElement | null>(null);
const hasWrappedName = ref(false);
let nameLayoutFrame: number | undefined;
let nameResizeObserver: ResizeObserver | undefined;

function updateNameLayout(): void {
  if (nameLayoutFrame !== undefined) cancelAnimationFrame(nameLayoutFrame);

  nameLayoutFrame = requestAnimationFrame(() => {
    nameLayoutFrame = undefined;
    const header = headerElement.value;
    const measurement = nameMeasurementElement.value;
    if (!header || !measurement) return;

    const nextHasWrappedName = measurement.scrollWidth > header.clientWidth + 1;
    if (nextHasWrappedName === hasWrappedName.value) return;

    hasWrappedName.value = nextHasWrappedName;
    emit('layoutChange');
  });
}

onMounted(() => {
  nameResizeObserver = new ResizeObserver(updateNameLayout);
  if (headerElement.value) nameResizeObserver.observe(headerElement.value);
  if (nameMeasurementElement.value) nameResizeObserver.observe(nameMeasurementElement.value);
  void nextTick(updateNameLayout);
});

onBeforeUnmount(() => {
  if (nameLayoutFrame !== undefined) cancelAnimationFrame(nameLayoutFrame);
  nameResizeObserver?.disconnect();
});

watch(() => props.vm.nameText, updateNameLayout, { flush: 'post' });
</script>

<style scoped>
.illustrated-header {
  position: relative;
  container-type: inline-size;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  text-align: center;
}

.illustrated-header:not(.compact) {
  min-height: var(--illustrated-header-min-height);
  justify-content: center;
}

.illustrated-level-tier {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  margin-bottom: 2px;
  padding: 4px 0;
}

.illustrated-level-tier::before,
.illustrated-level-tier::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--illustrated-tier-accent), transparent);
  transform: translateY(-50%);
}

.illustrated-level-tier::before {
  right: 100%;
  margin-right: 16px;
}

.illustrated-level-tier::after {
  left: 100%;
  margin-left: 16px;
}

.illustrated-level,
.illustrated-tier {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Noto Sans SC', serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-shadow: 0 0 8px rgba(var(--illustrated-tier-accent-rgb), 0.4);
}

.illustrated-level {
  color: var(--illustrated-tier-accent);
}

.illustrated-tier {
  color: var(--illustrated-tier-accent);
}

.illustrated-badge-separator {
  margin: 0 16px;
  color: rgba(var(--illustrated-tier-accent-rgb), 0.5);
  font-size: 10px;
}

.illustrated-name {
  display: -webkit-box;
  max-width: 100%;
  margin: 0 0 4px;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #ffffff;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Noto Sans SC', serif;
  font-size: clamp(30px, 4.2cqw, 38px);
  font-weight: 700;
  line-height: 1.12;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}

.illustrated-header.has-wrapped-name .illustrated-name {
  font-size: clamp(26px, 3.7cqw, 32px);
}

.illustrated-header.has-wrapped-name .illustrated-name-measure {
  font-size: clamp(30px, 4.2cqw, 38px);
}

.illustrated-subtitle {
  display: flex;
  max-height: 3em;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.illustrated-meta-item {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.illustrated-meta-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.illustrated-meta-sep {
  display: inline-block;
  flex: 0 0 auto;
  color: rgba(var(--illustrated-race-accent-rgb), 0.7);
  font-size: 10px;
  transform: scale(0.8) rotate(45deg);
}

@media (min-width: 901px) {
  .illustrated-header.overview-density-compact:not(.compact) {
    gap: 6px;
    min-height: 128px;
    margin-bottom: 16px;
  }

  .illustrated-header.overview-density-compact:not(.compact) .illustrated-level-tier {
    margin-bottom: 8px;
  }

  .illustrated-header.overview-density-compact:not(.compact) .illustrated-name {
    font-size: clamp(28px, 3.8cqw, 34px);
  }

  .illustrated-header.overview-density-dense:not(.compact) {
    gap: 4px;
    min-height: 104px;
    margin-bottom: 10px;
  }

  .illustrated-header.overview-density-dense:not(.compact) .illustrated-level-tier {
    margin-bottom: 4px;
  }

  .illustrated-header.overview-density-dense:not(.compact) .illustrated-name {
    font-size: clamp(25px, 3.4cqw, 30px);
  }

  .illustrated-header.overview-density-dense:not(.compact) .illustrated-subtitle {
    font-size: 12px;
    line-height: 1.35;
  }
}

@media (max-width: 640px) {
  .illustrated-header {
    margin-bottom: 20px;
  }

  .illustrated-name {
    font-size: 30px;
  }
}

.illustrated-header.compact {
  gap: 8px;
  margin-bottom: 0;
}

.illustrated-header.compact .illustrated-level-tier {
  margin-bottom: 4px;
}

.illustrated-header.compact .illustrated-name {
  font-size: 30px;
}

.illustrated-header.compact .illustrated-subtitle {
  font-size: 12px;
}

@media (max-width: 420px) {
  .illustrated-header.compact .illustrated-name {
    font-size: 26px;
  }

  .illustrated-header.compact .illustrated-level,
  .illustrated-header.compact .illustrated-tier {
    font-size: 12px;
  }
}

.illustrated-header .illustrated-name.illustrated-name-measure {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: max-content;
  max-width: none;
  margin: 0;
  overflow: visible;
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
  text-wrap: nowrap;
  -webkit-line-clamp: unset;
}
</style>
