<template>
  <nav class="illustrated-tabs" aria-label="角色资料分页">
    <button
      v-if="homeTab"
      class="illustrated-tab-button illustrated-home-button"
      :class="{ active: activeTab === homeTab.key }"
      :aria-current="activeTab === homeTab.key ? 'page' : undefined"
      type="button"
      @click="$emit('setTab', homeTab.key)"
    >
      {{ homeTab.label }}
    </button>

    <div class="illustrated-tab-scroll">
      <button
        v-for="tab in detailTabs"
        :key="tab.key"
        class="illustrated-tab-button"
        :class="{ active: activeTab === tab.key }"
        :aria-current="activeTab === tab.key ? 'page' : undefined"
        type="button"
        @click="$emit('setTab', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <button
      v-if="showImportAction"
      class="illustrated-nav-save-button"
      :disabled="importing"
      type="button"
      aria-label="保存或导入"
      @click.stop="$emit('toggleImportMenu')"
    >
      {{ importing ? '保存中' : '保存' }}
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { IllustratedTab, IllustratedTabKey } from './types';

const props = defineProps<{
  tabs: IllustratedTab[];
  activeTab: IllustratedTabKey;
  importing: boolean;
  importButtonText: string;
  showImportAction: boolean;
}>();

defineEmits<{
  setTab: [tab: IllustratedTabKey];
  toggleImportMenu: [];
}>();

const homeTab = computed(() => props.tabs.find(tab => tab.key === 'overview') ?? null);
const detailTabs = computed(() => props.tabs.filter(tab => tab.key !== 'overview'));
</script>

<style scoped>
.illustrated-tabs {
  position: relative;
  z-index: 5;
  display: flex;
  flex-shrink: 0;
  align-items: stretch;
  align-self: center;
  width: fit-content;
  max-width: 100%;
  justify-content: center;
  min-height: var(--illustrated-tabs-height);
  margin: 0 auto;
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(20, 22, 30, 0.2) 0%, rgba(20, 22, 30, 0.96) 35%);
}

.illustrated-tab-scroll {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: nowrap;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.illustrated-tab-scroll::-webkit-scrollbar {
  display: none;
}

.illustrated-tab-button {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px 8px;
  border: none;
  background: none;
  color: #a0a5b5;
  cursor: pointer;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  font-size: 15px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.illustrated-tab-scroll .illustrated-tab-button {
  flex: 0 0 auto;
  justify-content: center;
  width: auto;
  min-width: 56px;
  padding-right: 12px;
  padding-left: 12px;
}

.illustrated-tab-button:hover:not(:disabled),
.illustrated-tab-button.active:not(:disabled) {
  color: var(--illustrated-race-accent);
}

.illustrated-tab-button.active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--illustrated-race-accent);
}

.illustrated-home-button {
  z-index: 2;
  flex: 0 0 auto;
  min-width: 56px;
  padding-right: 12px;
  padding-left: 12px;
}

.illustrated-nav-save-button {
  position: relative;
  flex: 0 0 auto;
  min-width: 56px;
  min-height: 44px;
  padding: 6px 12px;
  border: none;
  background: none;
  color: #a0a5b5;
  cursor: pointer;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    color 0.2s ease,
    opacity 0.2s ease;
}

.illustrated-nav-save-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.illustrated-nav-save-button:hover:not(:disabled) {
  color: var(--illustrated-race-accent);
}

.illustrated-tab-button:focus-visible,
.illustrated-nav-save-button:focus-visible {
  z-index: 3;
  outline: 2px solid var(--illustrated-race-accent);
  outline-offset: -3px;
}

.illustrated-nav-save-button::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: color-mix(in srgb, var(--illustrated-race-accent) 62%, transparent);
  opacity: 0.42;
}

:global(.illustrated-theme-anastasia .illustrated-tabs) {
  border-top-color: rgba(10, 45, 78, 0.3);
  background: linear-gradient(180deg, rgba(228, 237, 242, 0.94), rgba(190, 210, 221, 0.96));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

:global(.illustrated-theme-anastasia .illustrated-tab-button),
:global(.illustrated-theme-anastasia .illustrated-nav-save-button) {
  color: #315873;
  font-weight: 700;
  text-shadow: none;
}

:global(.illustrated-theme-anastasia .illustrated-tab-button:hover:not(:disabled)),
:global(.illustrated-theme-anastasia .illustrated-tab-button.active:not(:disabled)),
:global(.illustrated-theme-anastasia .illustrated-nav-save-button:hover:not(:disabled)) {
  color: #0a2d4e;
}

:global(.illustrated-theme-anastasia .illustrated-tab-button.active::after),
:global(.illustrated-theme-anastasia .illustrated-nav-save-button::after) {
  background: #bd3b4b;
  opacity: 0.82;
}

@media (max-width: 640px) {
  .illustrated-tabs {
    align-self: stretch;
    justify-content: flex-start;
    width: 100%;
    max-width: none;
    min-height: 48px;
  }

  .illustrated-tab-scroll {
    display: flex;
    flex: 1 1 auto;
    justify-content: flex-start;
    gap: 4px;
    padding: 0 6px;
    overflow-x: auto;
    mask-image: linear-gradient(90deg, transparent, #000 8px, #000 calc(100% - 8px), transparent);
  }

  .illustrated-tab-scroll .illustrated-tab-button {
    flex: 0 0 auto;
    width: auto;
    min-width: 58px;
    font-size: 15px;
  }

  .illustrated-tab-button,
  .illustrated-nav-save-button {
    min-height: 48px;
    padding: 0 10px;
  }

  .illustrated-home-button,
  .illustrated-nav-save-button {
    z-index: 2;
    flex: 0 0 auto;
    min-width: 58px;
    background: color-mix(in srgb, var(--illustrated-bg) 94%, transparent);
  }

  .illustrated-home-button {
    border-right: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.16);
  }

  .illustrated-nav-save-button {
    border-left: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.16);
  }
}
</style>
