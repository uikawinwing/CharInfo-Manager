<template>
  <section class="illustrated-character-panel">
    <div class="illustrated-radar-card">
      <svg class="illustrated-radar" viewBox="0 0 280 260" role="img" aria-label="五维属性雷达图">
        <polygon v-for="grid in radarGrid" :key="grid" :points="radarPoints(grid)" class="illustrated-radar-grid" />
        <line
          v-for="label in radarLabels"
          :key="label.key"
          x1="140"
          y1="130"
          :x2="label.axis.x"
          :y2="label.axis.y"
          class="illustrated-radar-axis"
        />
        <polygon :points="radarValuePoints" class="illustrated-radar-value" />
        <text
          v-for="label in radarLabels"
          :key="`${label.key}-label`"
          :x="label.label.x"
          :y="label.label.y"
          class="illustrated-radar-label"
        >
          {{ label.short }} {{ label.total }}
        </text>
      </svg>
    </div>

    <div v-if="resourceBoxes.length > 0" class="illustrated-panel-resources">
      <article v-for="resource in resourceBoxes" :key="resource.key">
        <span>{{ resource.label }}</span>
        <strong>{{ resource.value }}</strong>
      </article>
    </div>

    <section v-if="statusEffects.length > 0" class="illustrated-panel-statuses">
      <h3>状态</h3>
      <IllustratedItemCard
        v-for="(status, index) in statusEffects"
        :key="`${status.名称 ?? 'status'}-${index}`"
        :item="status"
        variant="status"
      />
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { ItemObject, ResourceBox } from '../../services/characterViewModel';
import IllustratedItemCard from './IllustratedItemCard.vue';
import type { AttributeView } from './types';

const props = defineProps<{
  attributes: AttributeView[];
  resourceBoxes: ResourceBox[];
  statusEffects: ItemObject[];
}>();

const radarGrid = [0.25, 0.5, 0.75, 1];
const radarCenter = { x: 140, y: 130 };
const radarRadius = 90;

function radarPoint(index: number, scale: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 5;
  return {
    x: radarCenter.x + Math.cos(angle) * radarRadius * scale,
    y: radarCenter.y + Math.sin(angle) * radarRadius * scale,
  };
}

function radarPoints(scale: number): string {
  return props.attributes
    .slice(0, 5)
    .map((_, index) => radarPoint(index, scale))
    .map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
}

const radarLabels = computed(() =>
  props.attributes.slice(0, 5).map((attribute, index) => ({
    key: attribute.key,
    short: attribute.short,
    total: attribute.total,
    axis: radarPoint(index, 1),
    label: radarPoint(index, 1.24),
  })),
);
const radarValuePoints = computed(() =>
  props.attributes
    .slice(0, 5)
    .map((attribute, index) => radarPoint(index, Math.max(0, Math.min(attribute.total, 20)) / 20))
    .map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' '),
);
</script>

<style scoped>
.illustrated-character-panel {
  display: grid;
  gap: 20px;
}

.illustrated-radar-card {
  padding: 18px;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.22);
  background: rgba(0, 0, 0, 0.2);
}

.illustrated-radar {
  display: block;
  width: min(100%, 340px);
  margin: 0 auto;
  overflow: visible;
}

.illustrated-radar-grid,
.illustrated-radar-axis {
  fill: none;
  stroke: rgba(var(--illustrated-race-accent-rgb), 0.24);
  stroke-width: 1;
}

.illustrated-radar-value {
  fill: rgba(var(--illustrated-tier-accent-rgb), 0.24);
  stroke: var(--illustrated-tier-accent);
  stroke-width: 2;
}

.illustrated-radar-label {
  fill: var(--illustrated-fg, #e8edf3);
  font-size: 11px;
  text-anchor: middle;
}

.illustrated-panel-resources {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.2);
}

.illustrated-panel-resources article {
  padding: 14px 8px;
  text-align: center;
}

.illustrated-panel-resources article + article {
  border-left: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.16);
}

.illustrated-panel-resources span {
  display: block;
  color: var(--illustrated-race-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.illustrated-panel-resources strong {
  display: block;
  margin-top: 6px;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 20px;
}

.illustrated-panel-statuses {
  display: grid;
  gap: 10px;
}

.illustrated-panel-statuses h3 {
  margin: 0;
  color: var(--illustrated-race-accent);
  font-size: 14px;
  letter-spacing: 0.1em;
}
</style>
