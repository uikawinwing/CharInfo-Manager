<template>
  <header
    ref="headerElement"
    class="illustrated-header"
    :class="{ compact, ornate, 'has-wrapped-name': hasWrappedName }"
    :style="ornate ? venusNameFrameCssVars : undefined"
  >
    <div v-if="ornate" class="illustrated-name-rail top" aria-hidden="true">
      <span class="rail-flourish left"></span>
      <span class="rail-line"></span>
      <span class="rail-center"></span>
      <span class="rail-line"></span>
      <span class="rail-flourish right"></span>
    </div>

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

    <div v-if="ornate" class="illustrated-name-rail bottom" aria-hidden="true">
      <span class="rail-line"></span>
      <span class="rail-center"></span>
      <span class="rail-line"></span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { CharacterViewModel } from '../../services/characterViewModel';
import { venusNameFrameCssVars } from './venusAssets';

const props = withDefaults(
  defineProps<{
    vm: CharacterViewModel;
    compact?: boolean;
    ornate?: boolean;
  }>(),
  {
    compact: false,
    ornate: false,
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

.illustrated-name-rail {
  display: grid;
  width: min(100%, 560px);
  align-items: center;
  pointer-events: none;
}

.illustrated-name-rail.top {
  height: 26px;
  grid-template-columns: minmax(42px, 0.28fr) minmax(34px, 1fr) auto minmax(34px, 1fr) minmax(42px, 0.28fr);
  column-gap: 8px;
  margin-bottom: -4px;
}

.illustrated-name-rail.bottom {
  width: min(86%, 520px);
  height: 24px;
  grid-template-columns: minmax(42px, 1fr) auto minmax(42px, 1fr);
  column-gap: 8px;
  margin-top: -4px;
}

.rail-line {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--illustrated-tier-accent-rgb), 0.88),
    rgba(255, 255, 240, 0.44),
    rgba(var(--illustrated-tier-accent-rgb), 0.72),
    transparent
  );
  filter: drop-shadow(0 0 6px rgba(var(--illustrated-tier-accent-rgb), 0.2)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
  opacity: 0.78;
}

.rail-flourish,
.rail-center {
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  filter: drop-shadow(0 0 7px rgba(var(--illustrated-tier-accent-rgb), 0.24)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
  opacity: 0.78;
}

.rail-flourish {
  height: 18px;
}

.rail-flourish.left {
  background-image: var(--venus-name-left-flourish-url);
}

.rail-flourish.right {
  background-image: var(--venus-name-right-flourish-url);
}

.illustrated-name-rail.top .rail-center {
  width: clamp(118px, 26cqw, 164px);
  height: 26px;
  background-image: var(--venus-name-center-crest-url);
}

.illustrated-name-rail.bottom .rail-center {
  width: clamp(108px, 24cqw, 152px);
  height: 22px;
  background-image: var(--venus-name-bottom-crest-url);
  opacity: 0.66;
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

.illustrated-header.ornate {
  gap: 5px;
}

.illustrated-header.ornate .illustrated-level-tier {
  margin-bottom: -2px;
}

.illustrated-header.ornate .illustrated-level-tier::before,
.illustrated-header.ornate .illustrated-level-tier::after {
  content: none;
}

.illustrated-header.ornate .illustrated-name {
  max-width: 100%;
  overflow: hidden;
  white-space: normal;
  color: #fffdf5;
  letter-spacing: 0;
  text-wrap: balance;
  text-shadow:
    0 2px 0 rgba(12, 22, 34, 0.45),
    0 3px 12px rgba(0, 0, 0, 0.68),
    0 0 18px rgba(var(--illustrated-tier-accent-rgb), 0.22);
}

.illustrated-header.ornate .illustrated-subtitle {
  max-width: 100%;
  color: rgba(255, 255, 246, 0.95);
  font-weight: 700;
  white-space: normal;
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

.illustrated-header.compact.ornate .illustrated-name {
  font-size: clamp(23px, 7cqw, 30px);
}

.illustrated-header.compact.ornate .illustrated-name-rail {
  width: min(100%, 360px);
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
