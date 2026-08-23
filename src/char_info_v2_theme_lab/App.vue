<template>
  <div class="theme-lab">
    <header class="theme-lab-toolbar">
      <div>
        <strong>Illustrated V2 Theme Lab</strong>
        <span>DX visual migration preview · standalone</span>
      </div>

      <div class="theme-lab-controls">
        <div class="theme-lab-segment" aria-label="角色">
          <button
            v-for="fixture in fixtures"
            :key="fixture.id"
            type="button"
            :class="{ active: selectedId === fixture.id }"
            @click="selectedId = fixture.id"
          >
            {{ fixture.shortName }}
          </button>
        </div>
        <div class="theme-lab-segment" aria-label="布局">
          <button type="button" :class="{ active: mode === 'desktop' }" @click="mode = 'desktop'">Desktop</button>
          <button type="button" :class="{ active: mode === 'mobile' }" @click="mode = 'mobile'">Mobile</button>
        </div>
      </div>
    </header>

    <section class="theme-lab-status">
      <span>{{ selectedFixture.name }}</span>
      <span>{{ selectedFixture.theme === 'iris' ? 'Iris theme migrated' : 'V2 baseline — theme pending' }}</span>
      <span>{{ mode === 'mobile' ? 'forceMobileLayout' : 'desktop layout' }}</span>
    </section>

    <main class="theme-lab-stage" :class="{ mobile: mode === 'mobile' }">
      <IllustratedV2Sheet
        :key="`${selectedId}-${mode}`"
        :theme="selectedFixture.theme"
        :vm="viewModel"
        :attributes="attributes"
        :importing="false"
        import-button-text="导入角色状态"
        :show-import-menu="false"
        read-only
        :debug-enabled="false"
        :force-mobile-layout="mode === 'mobile'"
        :special-npc="false"
        @toggle-attribute-formula="toggleAttributeFormula"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import IllustratedV2Sheet from '@/char_info_viewer/components/illustrated/IllustratedV2Sheet.vue';
import type { AttributeView } from '@/char_info_viewer/components/illustrated/types';
import { buildCharacterViewModel, type CharacterViewModel } from '@/char_info_viewer/services/characterViewModel';

import { fixtures } from './fixtures';

const selectedId = ref('iris');
const mode = ref<'desktop' | 'mobile'>('desktop');
const formulaState = ref<Record<string, boolean>>({});
const selectedFixture = computed(() => fixtures.find(item => item.id === selectedId.value) ?? fixtures[0]);

const viewModel = computed<CharacterViewModel>(() => {
  const vm = buildCharacterViewModel(selectedFixture.value.data);
  return {
    ...vm,
    imageUrl: selectedFixture.value.imageUrl,
    imageUrls: [selectedFixture.value.imageUrl],
    imageSourceGroups: [[selectedFixture.value.imageUrl]],
    randomizeInitialImage: false,
  };
});

const attributeLabels: Record<string, string> = { 力量: '力', 敏捷: '敏', 体质: '体', 智力: '智', 精神: '精' };
const attributes = computed<AttributeView[]>(() =>
  Object.entries(selectedFixture.value.data.属性 ?? {}).map(([key, raw]) => {
    const source = String(raw ?? '0');
    const [leftSide, rightSide] = source.split('=').map(part => part.trim());
    const parts = leftSide.split('+').map(part => part.trim()).filter(Boolean);
    const explicitTotal = rightSide ? Number(rightSide) : Number.NaN;
    const total = Number.isFinite(explicitTotal)
      ? explicitTotal
      : parts.reduce((sum, part) => sum + (Number(part) || 0), 0);
    const formula = parts.length > 1 || rightSide ? source : '';
    return {
      key,
      short: attributeLabels[key] ?? key,
      total,
      formula,
      formulaParts: parts.map((part, index) => ({ index, text: part, isWarning: false })),
      isTotalAbnormal: false,
      hasFormulaWarning: false,
      showFormula: Boolean(formula && formulaState.value[key]),
    };
  }),
);

function toggleAttributeFormula(key: string): void {
  formulaState.value = { ...formulaState.value, [key]: !formulaState.value[key] };
}
</script>

<style>
* { box-sizing: border-box; }
html, body, #app { min-height: 100%; margin: 0; }
body {
  background: #0c0f14;
  color: #eef2f6;
  font-family: Inter, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
}
button { font: inherit; }
.theme-lab { min-height: 100vh; padding: 20px; }
.theme-lab-toolbar {
  display: flex;
  max-width: 1240px;
  margin: 0 auto 12px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.theme-lab-toolbar > div:first-child { display: grid; gap: 3px; }
.theme-lab-toolbar strong { font-size: 18px; }
.theme-lab-toolbar span { color: #8e9baa; font-size: 12px; }
.theme-lab-controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.theme-lab-segment { display: flex; padding: 3px; gap: 3px; border: 1px solid #2b333d; border-radius: 9px; background: #151a20; }
.theme-lab-segment button {
  padding: 7px 11px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9da9b6;
  cursor: pointer;
}
.theme-lab-segment button.active { background: #e8edf2; color: #151a20; }
.theme-lab-status {
  display: flex;
  max-width: 1240px;
  margin: 0 auto 18px;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: #8794a2;
  font-size: 12px;
}
.theme-lab-status span + span::before { content: '·'; margin-right: 14px; color: #4f5b67; }
.theme-lab-stage { width: min(1240px, 100%); margin: 0 auto; padding: 12px; }
.theme-lab-stage.mobile { width: min(520px, 100%); }
@media (max-width: 760px) {
  .theme-lab { padding: 12px; }
  .theme-lab-toolbar { align-items: flex-start; flex-direction: column; }
  .theme-lab-controls { justify-content: flex-start; }
  .theme-lab-status span + span::before { display: none; }
  .theme-lab-status { display: grid; gap: 4px; }
  .theme-lab-stage { padding: 4px; }
}
</style>
