<template>
  <section class="illustrated-info-grid" :class="{ 'is-compact-profile': !showStats }">
    <component
      :is="overviewModule"
      v-if="showStats"
      class="illustrated-mobile-profile-stats"
      :attributes="attributes"
      :resource-boxes="resourceBoxes"
      @toggle-attribute-formula="$emit('toggleAttributeFormula', $event)"
    />

    <article v-if="showCreatorMetadata" class="illustrated-creator-metadata">
      <div class="illustrated-creator-meta-line">
        <span v-if="vm.storyAuthorText"><small>作者</small>{{ vm.storyAuthorText }}</span>
        <span v-if="vm.profileVersionText"><small>版本</small>{{ vm.profileVersionText }}</span>
      </div>
      <p v-if="vm.authorNoteText">{{ vm.authorNoteText }}</p>
    </article>

    <article v-for="block in blocks" :key="block.title" class="illustrated-text-block">
      <h3>{{ block.title }}</h3>
      <p>{{ block.text }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { Component } from 'vue';

import type { CharacterViewModel, ResourceBox } from '../../../services/characterViewModel';
import type { AttributeView } from '../types';

/**
 * 档案面板。手机首页的属性统计块用的是**父级已解析好的** `overviewModule`，
 * 本组件不自己决定渲染哪个 overview——否则 `overrides.overview` 只换掉首页，
 * 档案页仍是默认。fallback 只有一个 owner：上层的 `IllustratedDefaultSheet`。
 */
const props = withDefaults(
  defineProps<{
    vm: CharacterViewModel;
    attributes: AttributeView[];
    resourceBoxes: ResourceBox[];
    showStats?: boolean;
    backstoryText?: string;
    /** 上层已解析的 overview renderer（override 或默认）。required：唯一 fallback owner 在上层。 */
    overviewModule: Component;
  }>(),
  {
    showStats: true,
    backstoryText: '',
  },
);

defineEmits<{
  toggleAttributeFormula: [key: string];
}>();

const showCreatorMetadata = computed(
  () => !props.showStats && !!(props.vm.storyAuthorText || props.vm.profileVersionText || props.vm.authorNoteText),
);

const blocks = computed(() =>
  [
    { title: '性格', text: props.vm.personalityText },
    { title: '外貌特质', text: props.vm.appearanceText },
    { title: '喜爱', text: props.vm.likesText },
    { title: '衣物装饰', text: props.vm.attireText },
    { title: '背景故事', text: props.backstoryText },
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

.illustrated-creator-metadata {
  display: grid;
  gap: 12px;
  padding: 18px 22px;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.16);
  border-radius: 6px;
  background: rgba(5, 9, 14, 0.3);
}

.illustrated-creator-meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
}

.illustrated-creator-meta-line span {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  color: #e2e8f0;
  font-size: calc(13px + var(--ci-font-size-adjust, 0px));
}

.illustrated-creator-meta-line small {
  color: var(--illustrated-race-accent);
  font-size: calc(10px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
  letter-spacing: 0.08em;
}

.illustrated-creator-metadata p {
  margin: 0;
  color: #cbd5e1;
  font-size: calc(13px + var(--ci-font-size-adjust, 0px));
  line-height: 1.75;
  white-space: pre-line;
}

.illustrated-text-block {
  /* DX 主题把 corner-color 设为 transparent 即可去掉这 8 层装饰角，
     只替换底层 surface，不会被 8 层 corner 盖住。 */
  --corner: var(--illustrated-text-block-corner-color);
  position: relative;
  padding: 28px 36px;
  border: 1px solid var(--illustrated-text-block-border-color);
  background:
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    linear-gradient(var(--corner), var(--corner)),
    var(--illustrated-text-block-background);
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
  box-shadow: var(--illustrated-panel-shadow);
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
  font-size: calc(18px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
  letter-spacing: 0.15em;
  text-align: center;
  text-shadow: var(--illustrated-profile-heading-shadow);
}

.illustrated-text-block h3::before,
.illustrated-text-block h3::after {
  content: '◆';
  margin: 0 16px;
  color: rgba(var(--illustrated-race-accent-rgb), 0.45);
  font-size: calc(10px + var(--ci-font-size-adjust, 0px));
}

.illustrated-text-block p {
  margin: 0;
  color: var(--illustrated-fg-soft);
  font-size: calc(15px + var(--ci-font-size-adjust, 0px));
  line-height: 1.8;
  white-space: pre-line;
  text-shadow: var(--illustrated-text-shadow);
}

@container char-info-viewer (max-width: 900px) {
  .illustrated-mobile-profile-stats {
    display: flex;
  }

  .illustrated-info-grid.is-compact-profile {
    gap: 0;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-creator-metadata {
    gap: 8px;
    padding: 11px 0 12px;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0;
    background: transparent;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-creator-meta-line span,
  .illustrated-info-grid.is-compact-profile .illustrated-creator-metadata p {
    font-size: calc(11px + var(--ci-font-size-adjust, 0px));
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
    font-size: calc(14px + var(--ci-font-size-adjust, 0px));
    letter-spacing: 0.08em;
    text-align: left;
    text-shadow: none;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-text-block h3::before {
    margin: 0 7px 0 0;
    font-size: calc(7px + var(--ci-font-size-adjust, 0px));
  }

  .illustrated-info-grid.is-compact-profile .illustrated-text-block h3::after {
    display: none;
  }

  .illustrated-info-grid.is-compact-profile .illustrated-text-block p {
    color: #c9cdd4;
    font-size: calc(11px + var(--ci-font-size-adjust, 0px)) !important;
    line-height: 1.65 !important;
    text-shadow: none;
  }
}

@container char-info-viewer (max-width: 640px) {
  .illustrated-text-block {
    padding: 22px 20px;
  }
}
</style>
