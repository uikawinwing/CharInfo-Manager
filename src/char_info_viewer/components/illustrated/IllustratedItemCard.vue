<template>
  <article
    class="illustrated-list-item"
    :class="[
      qualityClass(item),
      {
        'is-compact-row': isCompactVariant,
        'is-compact-skill': isSkillVariant,
        'is-compact-holding': isHoldingVariant,
      },
    ]"
  >
    <div class="illustrated-list-item-header">
      <h3>
        <span
          v-if="isSkillVariant"
          class="illustrated-skill-kind-marker"
          :class="`is-${skillKind}`"
          :aria-label="skillKindLabel"
          role="img"
        >
          {{ skillKindSymbol }}
        </span>
        {{ itemName(item) }}
      </h3>
      <span v-if="!isSkillVariant && subtitle" class="illustrated-list-item-type">{{ subtitle }}</span>
      <span v-else-if="cost" class="illustrated-skill-cost"><small>消耗</small>{{ cost }}</span>
    </div>

    <div class="illustrated-list-item-body">
      <div v-if="tags.length > 0" class="illustrated-tags">
        <span v-for="tag in tags" :key="tag" class="illustrated-tag">{{ tag }}</span>
      </div>

      <p v-if="cost && !isSkillVariant" class="illustrated-line"><span>消耗</span>{{ cost }}</p>

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
    </div>
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
    variant?: 'item' | 'skill' | 'holding' | 'status';
  }>(),
  {
    showCost: false,
    variant: 'item',
  },
);

const tags = computed(() => itemTags(props.item));
const quality = computed(() => itemQuality(props.item));
const typeText = computed(() => itemType(props.item));
const isSkillVariant = computed(() => props.variant === 'skill');
const isHoldingVariant = computed(() => props.variant === 'holding');
const isCompactVariant = computed(() => isSkillVariant.value || isHoldingVariant.value);
const skillKind = computed<'active' | 'passive' | 'other'>(() => {
  const type = typeText.value.trim();
  if (type.includes('被动')) return 'passive';
  if (type.includes('主动')) return 'active';
  return 'other';
});
const skillKindSymbol = computed(() => {
  if (skillKind.value === 'active') return '◆';
  if (skillKind.value === 'passive') return '◎';
  return '✦';
});
const skillKindLabel = computed(() => {
  const type = typeText.value.trim();
  return type ? `${type}技能` : '技能';
});
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

.illustrated-list-item.is-compact-row {
  margin: 0;
  padding: 13px 0 14px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.illustrated-list-item.is-compact-row .illustrated-list-item-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: start;
  gap: 10px;
  margin-bottom: 7px;
  padding: 0;
  border: 0;
}

.illustrated-list-item.is-compact-row h3 {
  min-width: 0;
  margin: 0 !important;
  font-size: 15px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.illustrated-list-item.is-compact-row h3::before {
  margin-right: 7px;
  font-size: 12px;
}

.illustrated-list-item.is-compact-skill h3::before {
  content: none;
}

.illustrated-skill-kind-marker {
  flex: 0 0 auto;
  margin-right: 7px;
  color: var(--item-color);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  text-shadow: 0 0 10px color-mix(in srgb, var(--item-color) 70%, transparent);
}

.illustrated-skill-kind-marker.is-passive {
  font-size: 14px;
}

.illustrated-skill-cost {
  max-width: 130px;
  color: #a4a09a;
  font-size: 9px;
  line-height: 1.35;
  text-align: right;
}

.illustrated-skill-cost small {
  display: block;
  color: #c3beb6;
  font-size: inherit;
  font-weight: 700;
}

.illustrated-list-item.is-compact-holding .illustrated-list-item-header {
  grid-template-columns: minmax(0, 1fr);
}

.illustrated-list-item.is-compact-holding .illustrated-list-item-type {
  justify-self: start;
  padding: 0 0 0 19px;
  font-size: 9px;
  letter-spacing: 0.06em;
}

.illustrated-list-item.is-compact-holding .illustrated-list-item-type::before,
.illustrated-list-item.is-compact-holding .illustrated-list-item-type::after {
  display: none;
}

.illustrated-list-item.is-compact-row .illustrated-list-item-body {
  padding-left: 20px;
}

.illustrated-list-item.is-compact-row .illustrated-tags {
  gap: 4px;
  margin-bottom: 8px;
}

.illustrated-list-item.is-compact-row .illustrated-tag {
  padding: 2px 6px;
  font-size: 8px;
  line-height: 1.3 !important;
}

.illustrated-list-item.is-compact-row .illustrated-effect-list {
  gap: 6px;
}

.illustrated-list-item.is-compact-row .illustrated-effect-item {
  margin: 0 !important;
  font-size: 11px !important;
  line-height: 1.52 !important;
}

.illustrated-list-item.is-compact-row .illustrated-effect-name,
.illustrated-list-item.is-compact-row .illustrated-effect-text {
  font-size: inherit !important;
  line-height: inherit !important;
}

.illustrated-list-item.is-compact-row .illustrated-description {
  margin: 8px 0 0 !important;
  color: #747980;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 9.3px !important;
  font-style: italic;
  line-height: 1.5 !important;
}

@media (max-width: 640px) {
  .illustrated-list-item {
    padding: 20px;
  }

  .illustrated-list-item-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .illustrated-list-item.is-compact-row {
    padding: 12px 0 13px;
  }

  .illustrated-list-item.is-compact-row .illustrated-list-item-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: start;
    gap: 8px;
  }

  .illustrated-list-item.is-compact-skill {
    margin: 0 8px;
    padding: 14px 14px 15px;
    border-bottom-color: rgba(255, 255, 255, 0.11);
    background: linear-gradient(90deg, rgba(4, 7, 11, 0.5), rgba(4, 7, 11, 0.26));
  }

  .illustrated-list-item.is-compact-skill h3 {
    font-size: 16px;
    line-height: 1.3;
  }

  .illustrated-list-item.is-compact-skill .illustrated-skill-kind-marker {
    margin-right: 7px;
    font-size: 13px;
  }

  .illustrated-list-item.is-compact-skill .illustrated-skill-kind-marker.is-passive {
    font-size: 14px;
  }

  .illustrated-list-item.is-compact-skill .illustrated-skill-cost {
    max-width: 112px;
    padding-top: 1px;
    color: #c7c3bd;
    font-size: 10px;
    line-height: 1.35;
  }

  .illustrated-list-item.is-compact-skill .illustrated-skill-cost small {
    margin-bottom: 1px;
    color: #e4dfd7;
  }

  .illustrated-list-item.is-compact-skill .illustrated-tags {
    gap: 5px;
    margin-bottom: 10px;
  }

  .illustrated-list-item.is-compact-skill .illustrated-tag {
    padding: 2px 6px;
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(3, 5, 8, 0.32);
    color: #aeb5bf;
    font-size: 9.5px;
    line-height: 1.35 !important;
  }

  .illustrated-list-item.is-compact-skill .illustrated-effect-list {
    gap: 8px;
  }

  .illustrated-list-item.is-compact-skill .illustrated-effect-item {
    color: #f0f3f7;
    font-size: 12.5px !important;
    line-height: 1.58 !important;
  }

  .illustrated-list-item.is-compact-skill .illustrated-effect-name {
    margin-right: 6px;
    color: color-mix(in srgb, var(--item-color) 84%, #ffffff);
    font-weight: 750;
  }

  .illustrated-list-item.is-compact-skill .illustrated-effect-text {
    color: #edf1f5;
  }

  .illustrated-list-item.is-compact-skill .illustrated-description {
    margin: 9px 0 0 !important;
    color: #9ca4ad;
    font-size: 10.5px !important;
    font-style: normal;
    line-height: 1.58 !important;
    opacity: 0.9;
  }

  .illustrated-list-item.is-compact-holding {
    margin: 0 8px;
    padding: 14px 14px 15px;
    border-bottom-color: rgba(255, 255, 255, 0.11);
    background: linear-gradient(90deg, rgba(4, 7, 11, 0.48), rgba(4, 7, 11, 0.24));
  }

  .illustrated-list-item.is-compact-holding .illustrated-list-item-header {
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: 8px;
  }

  .illustrated-list-item.is-compact-holding h3 {
    font-size: 16px;
    line-height: 1.3;
  }

  .illustrated-list-item.is-compact-holding h3::before {
    margin-right: 6px;
    font-size: 13px;
  }

  .illustrated-list-item.is-compact-holding .illustrated-list-item-type {
    justify-self: end;
    align-self: start;
    padding: 2px 0 0;
    color: color-mix(in srgb, var(--item-color) 86%, #ffffff);
    font-size: 10px;
    line-height: 1.35;
    letter-spacing: 0.04em;
    text-align: right;
  }

  .illustrated-list-item.is-compact-holding .illustrated-tags {
    gap: 5px;
    margin-bottom: 10px;
  }

  .illustrated-list-item.is-compact-holding .illustrated-tag {
    padding: 2px 6px;
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(3, 5, 8, 0.32);
    color: #aeb5bf;
    font-size: 9.5px;
    line-height: 1.35 !important;
  }

  .illustrated-list-item.is-compact-holding .illustrated-effect-list {
    gap: 8px;
  }

  .illustrated-list-item.is-compact-holding .illustrated-effect-item {
    color: #f0f3f7;
    font-size: 12.5px !important;
    line-height: 1.58 !important;
  }

  .illustrated-list-item.is-compact-holding .illustrated-effect-name {
    margin-right: 6px;
    color: color-mix(in srgb, var(--item-color) 84%, #ffffff);
    font-weight: 750;
  }

  .illustrated-list-item.is-compact-holding .illustrated-effect-text {
    color: #edf1f5;
  }

  .illustrated-list-item.is-compact-holding .illustrated-description {
    margin: 9px 0 0 !important;
    color: #9ca4ad;
    font-size: 10.5px !important;
    font-style: normal;
    line-height: 1.58 !important;
    opacity: 0.9;
  }
}
</style>
