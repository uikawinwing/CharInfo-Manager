<template>
  <section class="illustrated-overview">
    <div class="illustrated-attributes">
      <button
        v-for="attr in attributes"
        :key="attr.key"
        class="illustrated-attribute"
        :class="{
          'show-formula': attr.showFormula,
          'has-formula': !!attr.formula,
          'has-warning': attr.isTotalAbnormal || attr.hasFormulaWarning,
        }"
        type="button"
        @click="emit('toggleAttributeFormula', attr.key)"
      >
        <span class="illustrated-attribute-name">{{ attr.short }}</span>
        <span class="illustrated-attribute-total" :class="{ warning: attr.isTotalAbnormal }">{{ attr.total }}</span>
        <span v-if="attr.formula" class="illustrated-attribute-formula">
          <template v-for="part in attr.formulaParts" :key="`${attr.key}-${part.index}-${part.text}`">
            <span v-if="part.index > 0">+</span>
            <span :class="{ warning: part.isWarning }">{{ part.text }}</span>
          </template>
        </span>
      </button>
    </div>

    <div v-if="resourceBoxes.length > 0" class="illustrated-resources">
      <div v-for="resource in resourceBoxes" :key="resource.key" class="illustrated-resource">
        <span class="illustrated-resource-name">{{ resource.label }}</span>
        <span class="illustrated-resource-value">{{ resource.value }}</span>
      </div>
    </div>

    <button
      v-if="entranceQuoteText"
      class="illustrated-entrance-quote"
      type="button"
      aria-label="查看完整台词"
      title="查看完整台词"
      @click="emit('openEntranceQuote')"
    >
      <span class="illustrated-entrance-quote-ornament" aria-hidden="true">
        <span class="illustrated-entrance-quote-diamond"></span>
      </span>
      <span class="illustrated-entrance-quote-text">{{ entranceQuoteText }}</span>
      <span class="illustrated-entrance-quote-tail" aria-hidden="true"></span>
      <span class="illustrated-quote-expand-cue" aria-hidden="true">↗</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import type { ResourceBox } from '../../services/characterViewModel';
import type { AttributeView } from './types';

withDefaults(
  defineProps<{
    attributes: AttributeView[];
    resourceBoxes: ResourceBox[];
    entranceQuoteText?: string;
  }>(),
  {
    entranceQuoteText: '',
  },
);

const emit = defineEmits<{
  toggleAttributeFormula: [key: string];
  openEntranceQuote: [];
}>();
</script>

<style scoped>
@import url('https://fontsapi.zeoseven.com/293/main/result.css');

.illustrated-overview {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 20px;
}

.illustrated-attributes {
  --flag-width: var(--illustrated-flag-width);
  --flag-min-height: var(--illustrated-flag-height);
  --flag-gap: var(--illustrated-flag-gap);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--flag-gap);
  width: min(100%, var(--illustrated-overview-width));
  margin: 8px auto 0;
  max-width: calc((var(--flag-width) * 3) + (var(--flag-gap) * 2));
}

.illustrated-overview.is-special-npc-overview {
  height: auto;
  min-height: 100%;
}

.illustrated-overview.is-special-npc-overview .illustrated-attributes {
  --flag-width: min(
    var(--illustrated-flag-width),
    calc((100% - var(--flag-gap) - var(--flag-gap)) / 3)
  );
}

.illustrated-attribute {
  position: relative;
  display: flex;
  flex: 0 0 var(--flag-width);
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: var(--flag-width);
  min-width: var(--flag-width);
  max-width: var(--flag-width);
  min-height: var(--flag-min-height);
  padding: 15px 5px 36px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-top: 2px solid var(--illustrated-race-accent);
  background: rgba(0, 0, 0, 0.3);
  clip-path: polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%);
  color: #ffffff;
  cursor: default;
  text-align: center;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.illustrated-attribute.has-formula {
  cursor: pointer;
}

.illustrated-attribute.has-warning {
  border-top-color: #ff7875;
  box-shadow: 0 0 0 1px rgba(255, 120, 117, 0.16);
}

.illustrated-attribute:hover {
  background: rgba(var(--illustrated-race-accent-rgb), 0.1);
  border-color: rgba(var(--illustrated-race-accent-rgb), 0.4);
  box-shadow: 0 5px 20px rgba(var(--illustrated-race-accent-rgb), 0.15);
  transform: translateY(-3px);
}

.illustrated-attribute-name {
  margin-bottom: 6px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.05;
}

.illustrated-attribute-total {
  color: var(--illustrated-race-accent);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 2px 15px rgba(var(--illustrated-race-accent-rgb), 0.45);
}

.illustrated-attribute-total.warning,
.illustrated-attribute-formula .warning {
  color: #ff9b9b;
  text-shadow: 0 0 10px rgba(255, 77, 77, 0.42);
}

.illustrated-attribute-formula {
  display: none;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  margin-top: 6px;
  color: var(--illustrated-race-accent);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
}

.illustrated-attribute.show-formula .illustrated-attribute-total {
  display: none;
}

.illustrated-attribute.show-formula .illustrated-attribute-formula {
  display: inline-flex;
}

.illustrated-resources {
  position: relative;
  display: grid;
  width: min(100%, var(--illustrated-overview-width));
  align-items: center;
  justify-content: center;
  grid-template-columns: repeat(3, minmax(0, var(--illustrated-resource-width)));
  gap: var(--illustrated-resource-gap);
  margin: 0 auto;
  padding: 12px 0;
}

.illustrated-resources::before,
.illustrated-resources::after {
  content: '';
  position: absolute;
  right: 15%;
  left: 15%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--illustrated-race-accent-rgb), 0.18), transparent);
}

.illustrated-resources::before {
  top: 0;
}

.illustrated-resources::after {
  bottom: 0;
}

.illustrated-resource {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: var(--illustrated-resource-height);
  padding: 8px 12px;
}

.illustrated-resource:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 15%;
  right: calc(var(--illustrated-resource-gap) / -2);
  bottom: 15%;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(var(--illustrated-race-accent-rgb), 0.32), transparent);
}

.illustrated-resource-name {
  color: var(--illustrated-race-accent);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-shadow: 0 0 10px currentColor;
}

.illustrated-resource-value {
  color: #ffffff;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
}

.illustrated-entrance-quote {
  position: relative;
  appearance: none;
  box-sizing: border-box;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: min(94%, 540px);
  min-height: 150px;
  margin: 0 auto 10px;
  padding: 18px 18px 14px;
  border: 0;
  background: none;
  box-shadow: none;
  color: rgba(255, 255, 255, 0.96);
  cursor: pointer;
  font-family: 'LXGW WenKai Mono', 'Kaiti SC', STKaiti, serif;
  font-size: clamp(17px, 1.7cqw, 20px);
  font-style: normal;
  font-weight: normal;
  letter-spacing: 0.06em;
  line-height: 1.6;
  text-align: center;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.illustrated-entrance-quote:hover {
  background: rgba(var(--illustrated-race-accent-rgb), 0.045);
}

.illustrated-entrance-quote:focus-visible {
  outline: 2px solid var(--illustrated-tier-accent);
  outline-offset: 3px;
}

.illustrated-quote-expand-cue {
  position: absolute;
  right: 5px;
  bottom: 3px;
  color: rgba(var(--illustrated-tier-accent-rgb), 0.68);
  font: 11px/1 sans-serif;
}

.illustrated-entrance-quote-ornament {
  display: flex;
  width: min(46%, 180px);
  align-items: center;
  gap: 10px;
  margin-bottom: 11px;
}

.illustrated-entrance-quote-ornament::before,
.illustrated-entrance-quote-ornament::after {
  content: '';
  flex: 1;
  height: 1px;
}

.illustrated-entrance-quote-ornament::before {
  background: linear-gradient(90deg, transparent, rgba(var(--illustrated-race-accent-rgb), 0.58));
}

.illustrated-entrance-quote-ornament::after {
  background: linear-gradient(90deg, rgba(var(--illustrated-race-accent-rgb), 0.58), transparent);
}

.illustrated-entrance-quote-diamond {
  width: 6px;
  height: 6px;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.78);
  background: rgba(var(--illustrated-race-accent-rgb), 0.16);
  box-shadow: 0 0 8px rgba(var(--illustrated-race-accent-rgb), 0.26);
  transform: rotate(45deg);
}

.illustrated-entrance-quote-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.64);
}

.illustrated-entrance-quote-text::before,
.illustrated-entrance-quote-text::after {
  color: currentColor;
  font-size: 0.94em;
  opacity: 0.58;
}

.illustrated-entrance-quote-text::before {
  margin-right: 0.24em;
  content: '“';
}

.illustrated-entrance-quote-text::after {
  margin-left: 0.24em;
  content: '”';
}

.illustrated-entrance-quote-tail {
  width: min(36%, 132px);
  height: 1px;
  margin-top: 11px;
  background: linear-gradient(90deg, transparent, rgba(var(--illustrated-race-accent-rgb), 0.34), transparent);
}

@media (min-width: 901px) {
  .illustrated-overview.overview-density-compact {
    gap: 14px;
  }

  .illustrated-overview.overview-density-compact .illustrated-attributes {
    margin-top: 2px;
  }

  .illustrated-overview.overview-density-compact .illustrated-attribute {
    min-height: 136px;
    padding: 12px 5px 36px;
  }

  .illustrated-overview.overview-density-compact .illustrated-resources {
    padding: 8px 0;
  }

  .illustrated-overview.overview-density-compact .illustrated-resource {
    min-height: 62px;
    padding: 6px 10px;
  }

  .illustrated-overview.overview-density-compact .illustrated-entrance-quote {
    margin-bottom: 4px;
    padding: 2px 14px 6px;
    font-size: clamp(16px, 1.5cqw, 18px);
    line-height: 1.5;
  }

  .illustrated-overview.overview-density-compact .illustrated-entrance-quote-ornament {
    margin-bottom: 7px;
  }

  .illustrated-overview.overview-density-compact .illustrated-entrance-quote-tail {
    margin-top: 7px;
  }

  .illustrated-overview.overview-density-dense {
    gap: 8px;
  }

  .illustrated-overview.overview-density-dense .illustrated-attributes {
    margin-top: 0;
    gap: 8px;
  }

  .illustrated-overview.overview-density-dense .illustrated-attribute {
    min-height: 116px;
    padding: 10px 4px 30px;
  }

  .illustrated-overview.overview-density-dense .illustrated-attribute-name {
    margin-bottom: 3px;
    font-size: 0.9rem;
  }

  .illustrated-overview.overview-density-dense .illustrated-attribute-total {
    font-size: 1.75rem;
  }

  .illustrated-overview.overview-density-dense .illustrated-resources {
    padding: 5px 0;
  }

  .illustrated-overview.overview-density-dense .illustrated-resource {
    min-height: 52px;
    gap: 3px;
    padding: 4px 8px;
  }

  .illustrated-overview.overview-density-dense .illustrated-resource-name {
    font-size: 11px;
  }

  .illustrated-overview.overview-density-dense .illustrated-resource-value {
    font-size: 19px;
  }

  .illustrated-overview.overview-density-dense .illustrated-entrance-quote {
    margin-bottom: 0;
    padding: 0 12px 4px;
    font-size: clamp(15px, 1.35cqw, 16px);
    line-height: 1.42;
  }

  .illustrated-overview.overview-density-dense .illustrated-entrance-quote-ornament {
    width: min(40%, 140px);
    margin-bottom: 5px;
  }

  .illustrated-overview.overview-density-dense .illustrated-entrance-quote-tail {
    margin-top: 5px;
  }
}

@media (max-width: 900px) {
  .illustrated-attributes {
    --flag-width: calc((100% - 16px) / 3);
    --flag-min-height: 104px;
    --flag-gap: 8px;
  }

  .illustrated-attribute {
    min-width: 0;
  }

  .illustrated-resources {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .illustrated-resource {
    padding: 8px;
  }

  .illustrated-resource:not(:last-child)::after {
    content: none;
  }

  .illustrated-entrance-quote {
    width: 100%;
    margin-bottom: 6px;
    padding: 2px 12px 8px;
    font-size: 16px;
    letter-spacing: 0.04em;
  }

  .illustrated-entrance-quote-ornament {
    width: min(42%, 140px);
    gap: 8px;
    margin-bottom: 9px;
  }

  .illustrated-entrance-quote-tail {
    width: min(34%, 112px);
    margin-top: 9px;
  }
}
</style>
