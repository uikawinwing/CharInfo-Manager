<template>
  <article class="illustrated-list-item" :class="qualityClass(item)">
    <div class="illustrated-list-item-header">
      <h3>{{ itemName(item) }}</h3>
      <span v-if="subtitle" class="illustrated-list-item-type">{{ subtitle }}</span>
    </div>

    <div v-if="tags.length > 0" class="illustrated-tags">
      <span v-for="tag in tags" :key="tag" class="illustrated-tag">{{ tag }}</span>
    </div>

    <p v-if="cost" class="illustrated-line"><span>消耗</span>{{ cost }}</p>

    <ul v-if="effects.length > 0" class="illustrated-effect-list">
      <li v-for="entry in effects" :key="`${entry.name}-${entry.content}`" class="illustrated-effect-item">
        <span v-if="!entry.fallback" class="illustrated-effect-name">{{ entry.name }}</span>
        <span class="illustrated-effect-text">{{ entry.content }}</span>
      </li>
    </ul>

    <div v-if="statusLines.length > 0" class="illustrated-status-lines">
      <p v-for="line in statusLines" :key="line.label" class="illustrated-line">
        <span>{{ line.label }}</span>{{ line.value }}
      </p>
    </div>

    <p v-if="description" class="illustrated-description">{{ description }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import {
  itemCost,
  itemDescription,
  itemEffectEntriesOrDescription,
  itemName,
  itemQuality,
  itemTags,
  itemType,
  qualityClass,
  statusEffectDuration,
  statusEffectLayers,
  statusEffectSource,
  type ItemObject,
} from '../../services/characterViewModel';

const props = withDefaults(
  defineProps<{
    item: ItemObject;
    showCost?: boolean;
    variant?: 'item' | 'status';
  }>(),
  {
    showCost: false,
    variant: 'item',
  },
);

const tags = computed(() => itemTags(props.item));
const quality = computed(() => itemQuality(props.item));
const typeText = computed(() => itemType(props.item));
const subtitle = computed(() => [quality.value, typeText.value].filter(Boolean).join(' / '));
const effects = computed(() => itemEffectEntriesOrDescription(props.item));
const description = computed(() => {
  const text = itemDescription(props.item);
  if (!text) return '';

  const isDescriptionFallback =
    effects.value.length === 1 && effects.value[0].fallback && effects.value[0].content === text;
  return isDescriptionFallback ? '' : text;
});
const cost = computed(() => (props.showCost ? itemCost(props.item) : ''));
const statusLines = computed(() => {
  if (props.variant !== 'status') return [];
  return [
    { label: '层数', value: statusEffectLayers(props.item) },
    { label: '剩余时间', value: statusEffectDuration(props.item) },
    { label: '来源', value: statusEffectSource(props.item) },
  ].filter(line => line.value);
});
</script>

<style scoped>
.illustrated-list-item {
  position: relative;
  margin-bottom: 24px;
  padding: 24px 32px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  background: rgba(12, 14, 18, 0.85);
  box-shadow:
    inset 0 0 40px rgba(0, 0, 0, 0.8),
    0 10px 20px rgba(0, 0, 0, 0.5);
  --item-color: var(--illustrated-race-accent);
}

.illustrated-list-item.quality-mythic {
  --item-color: #f21455;
}

.illustrated-list-item.quality-legendary {
  --item-color: #d4af37;
}

.illustrated-list-item.quality-epic {
  --item-color: #cf95ff;
}

.illustrated-list-item.quality-rare {
  --item-color: #62bbff;
}

.illustrated-list-item.quality-uncommon {
  --item-color: #7be495;
}

.illustrated-list-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.illustrated-list-item h3 {
  display: flex;
  align-items: center;
  margin: 0;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.illustrated-list-item h3::before {
  content: '✦';
  margin-right: 12px;
  color: var(--item-color);
  font-size: 20px;
  font-weight: 400;
  text-shadow: 0 0 12px var(--item-color);
}

.illustrated-list-item-type {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 20px;
  color: var(--item-color);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.illustrated-list-item-type::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0.15;
}

.illustrated-list-item-type::after {
  content: '';
  position: absolute;
  inset: 0;
  border-top: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  opacity: 0.4;
  mask-image: linear-gradient(90deg, transparent, black 20%, black 80%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, black 20%, black 80%, transparent);
}

.illustrated-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.illustrated-tag {
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.4);
  color: #a0a5b5;
  font-size: 12px;
}

.illustrated-effect-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.illustrated-effect-item {
  color: #e2e8f0;
  line-height: 1.7;
}

.illustrated-effect-name,
.illustrated-line span {
  display: inline-block;
  margin-right: 8px;
  color: var(--item-color);
  font-weight: 700;
}

.illustrated-effect-text,
.illustrated-description,
.illustrated-line {
  color: #e2e8f0;
  white-space: pre-line;
}

.illustrated-description,
.illustrated-line {
  margin: 8px 0 0;
  line-height: 1.7;
}

.illustrated-status-lines {
  margin-top: 10px;
}

@media (max-width: 640px) {
  .illustrated-list-item {
    padding: 20px;
  }

  .illustrated-list-item-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
