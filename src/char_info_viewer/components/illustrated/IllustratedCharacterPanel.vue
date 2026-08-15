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

    <dl class="illustrated-mobile-character-summary">
      <div><dt>姓名</dt><dd>{{ vm.nameText }}</dd></div>
      <div><dt>生命层级</dt><dd class="is-tier">{{ vm.tierText }}</dd></div>
      <div><dt>等级</dt><dd>{{ vm.levelText }}</dd></div>
      <div><dt>种族</dt><dd>{{ vm.raceText }}</dd></div>
      <div><dt>身份</dt><dd>{{ vm.identityText }}</dd></div>
      <div><dt>职业</dt><dd>{{ vm.classText }}</dd></div>
    </dl>

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

import type { CharacterViewModel, ItemObject, ResourceBox } from '../../services/characterViewModel';
import IllustratedItemCard from './IllustratedItemCard.vue';
import type { AttributeView } from './types';

const props = defineProps<{
  vm: CharacterViewModel;
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

.illustrated-mobile-character-summary {
  display: none;
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

@media (max-width: 900px) {
  .illustrated-character-panel {
    gap: 14px;
  }

  .illustrated-radar-card {
    padding: 8px 10px 2px;
    border-color: rgba(var(--illustrated-race-accent-rgb), 0.16);
    background: rgba(0, 0, 0, 0.1);
  }

  .illustrated-radar {
    width: min(100%, 300px);
  }

  .illustrated-mobile-character-summary {
    display: grid;
    margin: 0;
    padding: 12px 16px;
    border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.22);
    border-radius: 8px;
    background: rgba(5, 7, 10, 0.28);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  .illustrated-mobile-character-summary > div {
    display: grid;
    grid-template-columns: minmax(82px, 0.8fr) minmax(0, 1.4fr);
    gap: 12px;
    align-items: start;
    padding: 9px 0;
  }

  .illustrated-mobile-character-summary > div + div {
    border-top: 1px dashed rgba(255, 255, 255, 0.09);
  }

  .illustrated-mobile-character-summary dt,
  .illustrated-mobile-character-summary dd {
    margin: 0;
  }

  .illustrated-mobile-character-summary dt {
    color: var(--illustrated-race-accent);
    font-size: 13px;
    font-weight: 700;
  }

  .illustrated-mobile-character-summary dd {
    color: var(--illustrated-fg, #eef3f7);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.45;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .illustrated-mobile-character-summary dd.is-tier {
    color: var(--illustrated-tier-accent);
  }
}
</style>
