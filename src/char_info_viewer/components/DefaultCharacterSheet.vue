<template>
  <div
    :class="[
      wrapperClasses,
      { 'compact-card-active': isCardCollapsed, 'viewer-effects-disabled': !props.effectsEnabled },
    ]"
  >
    <div class="frame-layer" :class="{ show: tierNumber >= 5 }" aria-hidden="true">
      <svg class="frame-svg frame-top" viewBox="0 0 400 100" preserveAspectRatio="none">
        <path d="M 5,100 A 195,80 0 0,1 395,100" />
        <path d="M 15,100 A 185,70 0 0,1 385,100" stroke-width="1" opacity="0.6" />
        <line x1="60" y1="60" x2="60" y2="90" stroke-width="1" />
        <line x1="340" y1="60" x2="340" y2="90" stroke-width="1" />
        <circle cx="60" cy="92" r="3" fill="var(--tier-color)" stroke="none" />
        <circle cx="340" cy="92" r="3" fill="var(--tier-color)" stroke="none" />
        <path
          d="M 200,2 L 205,15 L 220,20 L 205,25 L 200,38 L 195,25 L 180,20 L 195,15 Z"
          fill="var(--tier-color)"
          stroke="none"
        />
      </svg>
      <svg class="frame-svg frame-body" viewBox="0 0 400 100" preserveAspectRatio="none">
        <line x1="5" y1="0" x2="5" y2="100" />
        <line x1="395" y1="0" x2="395" y2="100" />
        <line x1="15" y1="0" x2="15" y2="98" stroke-width="1" opacity="0.6" />
        <line x1="385" y1="0" x2="385" y2="98" stroke-width="1" opacity="0.6" />
        <line x1="5" y1="100" x2="395" y2="100" />
      </svg>
    </div>

    <div ref="bgLayerRef" class="card-background-layer">
      <canvas v-if="props.effectsEnabled" ref="canvasRef" class="particle-canvas"></canvas>
    </div>

    <button
      v-if="isCardCollapsed"
      class="compact-character-card"
      type="button"
      :aria-label="compactCardAriaLabel"
      @click="expandCard"
    >
      <span class="compact-card-head">
        <span class="compact-level-tier">Lv.{{ levelText }} · T{{ tierNumber }}</span>
        <span class="compact-character-name">{{ nameText }}</span>
        <span class="compact-expand-chevron" aria-hidden="true">⌄</span>
      </span>

      <span class="compact-card-data" :class="{ 'no-resources': resourceBoxes.length === 0 }">
        <span v-if="resourceBoxes.length > 0" class="compact-resources" aria-label="资源值">
          <span v-for="resource in resourceBoxes" :key="`compact-resource-${resource.key}`" class="compact-resource">
            <span class="compact-resource-label">{{ resource.label }}</span>
            <span class="compact-resource-value">{{ resource.value }}</span>
          </span>
        </span>

        <span class="compact-attributes" aria-label="五维属性">
          <span
            v-for="attr in attributes"
            :key="`compact-attribute-${attr.key}`"
            class="compact-attribute"
            :data-attribute="attr.key"
            :title="`${attr.key} (${compactAttributeAbbreviationMap[attr.key] || attr.short})`"
          >
            <span class="compact-attribute-label" aria-hidden="true">
              <svg class="compact-attribute-icon" viewBox="0 0 24 24" focusable="false">
                <path :d="compactAttributeIconPathMap[attr.key] || compactAttributeIconPathMap.精神" />
              </svg>
              <span class="compact-attribute-name">{{ compactAttributeAbbreviationMap[attr.key] || attr.short }}</span>
            </span>
            <span class="compact-attribute-value">{{ attr.total }}</span>
          </span>
        </span>
      </span>
    </button>

    <div v-if="!isCardCollapsed" class="sheet-content-wrapper">
      <header class="sheet-header">
        <button
          v-if="canUseCompactCard"
          class="card-collapse-button"
          type="button"
          aria-label="收起角色卡"
          title="收起"
          @click.stop="collapseCard"
        >
          ⌃
        </button>
        <span class="level-badge">Lv.{{ levelText }}</span>
        <h1 class="char-name">{{ nameText }}</h1>
        <div class="char-meta-row">
          <span>{{ raceText }}</span>
          <span class="meta-separator">◆</span>
          <span>{{ identityText }}</span>
          <span class="meta-separator">◆</span>
          <span>{{ classText }}</span>
          <span class="meta-separator">◆</span>
          <span class="tier-name">{{ tierText }}</span>
        </div>
      </header>

      <div class="sheet-body">
        <div class="attributes-grid">
          <div
            v-for="attr in attributes"
            :key="attr.key"
            class="attribute-item"
            :class="{
              'show-formula': attr.showFormula,
              'has-formula': !!attr.formula,
              'has-warning': attr.isTotalAbnormal || attr.hasFormulaWarning,
            }"
            @click="toggleAttributeFormula(attr.key)"
          >
            <span class="attribute-name">{{ attr.short }}</span>
            <span class="attribute-total" :class="{ 'is-warning': attr.isTotalAbnormal }">{{ attr.total }}</span>
            <span v-if="attr.formula" class="attribute-formula">
              <template v-for="part in attr.formulaParts" :key="`${attr.key}-${part.index}-${part.text}`">
                <span v-if="part.index > 0" class="formula-part-separator">+</span>
                <span class="formula-part" :class="{ 'formula-part-warning': part.isWarning }">{{ part.text }}</span>
              </template>
            </span>
          </div>
        </div>

        <div v-if="resourceBoxes.length > 0" class="resource-grid">
          <div v-for="resource in resourceBoxes" :key="resource.key" class="resource-item">
            <span class="resource-name">{{ resource.label }}</span>
            <span class="resource-value">{{ resource.value }}</span>
          </div>
        </div>

        <div class="tab-nav">
          <button
            v-for="tab in visibleTabs"
            :key="tab.key"
            class="tab-button"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <section class="tab-content">
          <template v-if="activeTab === 'profile'">
            <div class="profile-grid">
              <div class="profile-row">
                <div class="profile-cell">
                  <template v-if="personalityText">
                    <h3 class="subsection-title">性格</h3>
                    <div class="story profile-panel">{{ personalityText }}</div>
                  </template>
                </div>

                <div class="profile-cell">
                  <template v-if="appearanceText">
                    <h3 class="subsection-title">外貌特质</h3>
                    <div class="story profile-panel">{{ appearanceText }}</div>
                  </template>
                </div>
              </div>

              <div class="profile-row">
                <div class="profile-cell">
                  <template v-if="likesText">
                    <h3 class="subsection-title">喜爱</h3>
                    <div class="story profile-panel">{{ likesText }}</div>
                  </template>
                </div>

                <div class="profile-cell">
                  <template v-if="attireText">
                    <h3 class="subsection-title">衣物装饰</h3>
                    <div class="story profile-panel">{{ attireText }}</div>
                  </template>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'skills'">
            <article v-for="(item, index) in skills" :key="`skill-${index}-${itemName(item)}`" class="card">
              <div class="card-header">
                <h3 class="card-title" :class="qualityClass(item)">{{ itemName(item) }}</h3>
                <span v-if="itemQuality(item)" class="card-subtitle" :class="qualityClass(item)">{{
                  itemQuality(item)
                }}</span>
              </div>
              <div class="card-body">
                <div v-if="itemTags(item).length > 0" class="card-tags">
                  <span v-for="tag in itemTags(item)" :key="`skill-tag-${index}-${tag}`" class="card-tag">
                    {{ tag }}
                  </span>
                </div>
                <p v-if="itemType(item)"><span class="card-label">类型:</span>{{ itemType(item) }}</p>
                <p v-if="itemCost(item)"><span class="card-label">消耗:</span>{{ itemCost(item) }}</p>
                <template v-if="itemEffectEntries(item).length > 0">
                  <p><span class="card-label">效果:</span></p>
                  <ul class="effect-list">
                    <li
                      v-for="(entry, effectIndex) in itemEffectEntries(item)"
                      :key="`skill-effect-${index}-${effectIndex}-${entry.name}`"
                      class="effect-item"
                    >
                      <span v-if="!entry.fallback" class="effect-name">{{ entry.name }}</span>
                      <span class="effect-text">{{ entry.content }}</span>
                    </li>
                  </ul>
                </template>
                <p v-else><span class="card-label">效果:</span>无</p>
                <p v-if="itemDescription(item)" class="card-description">{{ itemDescription(item) }}</p>
              </div>
            </article>
          </template>

          <template v-else-if="activeTab === 'equipment'">
            <article v-for="(item, index) in equipments" :key="`equip-${index}-${itemName(item)}`" class="card">
              <div class="card-header">
                <h3 class="card-title" :class="qualityClass(item)">{{ itemName(item) }}</h3>
                <span v-if="itemQuality(item)" class="card-subtitle" :class="qualityClass(item)">{{
                  itemQuality(item)
                }}</span>
              </div>
              <div class="card-body">
                <div v-if="itemTags(item).length > 0" class="card-tags">
                  <span v-for="tag in itemTags(item)" :key="`equip-tag-${index}-${tag}`" class="card-tag">
                    {{ tag }}
                  </span>
                </div>
                <p v-if="itemType(item)"><span class="card-label">类型:</span>{{ itemType(item) }}</p>
                <template v-if="itemEffectEntries(item).length > 0">
                  <p><span class="card-label">效果:</span></p>
                  <ul class="effect-list">
                    <li
                      v-for="(entry, effectIndex) in itemEffectEntries(item)"
                      :key="`equip-effect-${index}-${effectIndex}-${entry.name}`"
                      class="effect-item"
                    >
                      <span v-if="!entry.fallback" class="effect-name">{{ entry.name }}</span>
                      <span class="effect-text">{{ entry.content }}</span>
                    </li>
                  </ul>
                </template>
                <p v-else><span class="card-label">效果:</span>无</p>
                <p v-if="itemDescription(item)" class="card-description">{{ itemDescription(item) }}</p>
              </div>
            </article>
          </template>

          <template v-else-if="activeTab === 'inventory'">
            <template v-for="section in inventorySections" :key="section.key">
              <h3 class="subsection-title">{{ section.title }}</h3>
              <article
                v-for="(item, index) in section.items"
                :key="`${section.key}-${index}-${itemName(item)}`"
                class="card"
              >
                <div class="card-header">
                  <h3 class="card-title" :class="qualityClass(item)">{{ itemName(item) }}</h3>
                  <span v-if="itemQuality(item)" class="card-subtitle" :class="qualityClass(item)">{{
                    itemQuality(item)
                  }}</span>
                </div>
                <div class="card-body">
                  <div v-if="itemTags(item).length > 0" class="card-tags">
                    <span v-for="tag in itemTags(item)" :key="`${section.key}-${index}-${tag}`" class="card-tag">
                      {{ tag }}
                    </span>
                  </div>
                  <p v-if="itemType(item)"><span class="card-label">类型:</span>{{ itemType(item) }}</p>
                  <template v-if="itemEffectEntriesOrDescription(item).length > 0">
                    <p><span class="card-label">效果:</span></p>
                    <ul class="effect-list">
                      <li
                        v-for="(entry, effectIndex) in itemEffectEntriesOrDescription(item)"
                        :key="`${section.key}-${index}-${effectIndex}-${entry.name}`"
                        class="effect-item"
                      >
                        <span v-if="!entry.fallback" class="effect-name">{{ entry.name }}</span>
                        <span class="effect-text">{{ entry.content }}</span>
                      </li>
                    </ul>
                  </template>
                  <p v-else><span class="card-label">效果:</span>无</p>
                  <p v-if="itemDescription(item) && itemEffectEntries(item).length > 0" class="card-description">
                    {{ itemDescription(item) }}
                  </p>
                </div>
              </article>
            </template>
          </template>

          <template v-else-if="activeTab === 'divinity'">
            <h3 v-if="divinityGodTitle" class="subsection-title divinity-main-title">{{ divinityGodTitle }}</h3>

            <article v-if="divinityKingdom" class="card divinity-card">
              <div class="card-header">
                <h3 class="card-title">{{ divinityKingdom.name }}</h3>
              </div>
              <div class="card-body">
                <p>{{ divinityKingdom.description || '无' }}</p>
              </div>
            </article>

            <template v-if="divinityElements.length > 0">
              <h3 class="subsection-title">要素</h3>
              <article
                v-for="(item, index) in divinityElements"
                :key="`elem-${index}-${itemName(item)}`"
                class="card divinity-card"
              >
                <div class="card-header">
                  <h3 class="card-title">{{ itemName(item) }}</h3>
                </div>
                <div class="card-body">
                  <p>{{ itemEffectOrDescription(item) }}</p>
                </div>
              </article>
            </template>

            <template v-if="divinityPowers.length > 0">
              <h3 class="subsection-title">权能</h3>
              <article
                v-for="(item, index) in divinityPowers"
                :key="`power-${index}-${itemName(item)}`"
                class="card divinity-card"
              >
                <div class="card-header">
                  <h3 class="card-title">{{ itemName(item) }}</h3>
                </div>
                <div class="card-body">
                  <p>{{ itemEffectOrDescription(item) }}</p>
                </div>
              </article>
            </template>

            <template v-if="divinityLaws.length > 0">
              <h3 class="subsection-title">法则</h3>
              <article
                v-for="(item, index) in divinityLaws"
                :key="`law-${index}-${itemName(item)}`"
                class="card divinity-card"
              >
                <div class="card-header">
                  <h3 class="card-title">{{ itemName(item) }}</h3>
                </div>
                <div class="card-body">
                  <div
                    v-for="entry in lawPassiveEntries(item)"
                    :key="`passive-${entry.name}-${entry.content}`"
                    class="law-effect"
                  >
                    <strong class="law-effect-title">{{
                      entry.fallback ? '【被动】' : `【被动】${entry.name}`
                    }}</strong>
                    <p>{{ entry.content }}</p>
                  </div>
                  <div
                    v-for="entry in lawActiveEntries(item)"
                    :key="`active-${entry.name}-${entry.content}`"
                    class="law-effect"
                  >
                    <strong class="law-effect-title">{{
                      entry.fallback ? '【主动】' : `【主动】${entry.name}`
                    }}</strong>
                    <p>{{ entry.content }}</p>
                  </div>
                  <p v-if="itemDescription(item)" class="law-description">{{ itemDescription(item) }}</p>
                </div>
              </article>
            </template>
          </template>

          <template v-else-if="activeTab === 'statusEffects'">
            <article
              v-for="(item, index) in statusEffects"
              :key="`status-effect-${index}-${itemName(item)}`"
              class="card"
            >
              <div class="card-header">
                <h3 class="card-title">{{ itemName(item) }}</h3>
                <span v-if="statusEffectType(item)" class="card-subtitle">{{ statusEffectType(item) }}</span>
              </div>
              <div class="card-body">
                <p v-if="statusEffectDescription(item)">
                  <span class="card-label">效果:</span>{{ statusEffectDescription(item) }}
                </p>
                <p v-if="statusEffectLayers(item)">
                  <span class="card-label">层数:</span>{{ statusEffectLayers(item) }}
                </p>
                <p v-if="statusEffectDuration(item)">
                  <span class="card-label">剩余时间:</span>{{ statusEffectDuration(item) }}
                </p>
                <p v-if="statusEffectSource(item)">
                  <span class="card-label">来源:</span>{{ statusEffectSource(item) }}
                </p>
              </div>
            </article>
          </template>

          <template v-else>
            <div class="story">{{ backstoryText || '暂无故事' }}</div>
          </template>
        </section>
      </div>

      <button v-if="!props.readOnly" class="import-action-btn" :disabled="saveBusy" @click.stop="toggleImportMenu">
        {{ saveButtonText }}
      </button>
      <div v-if="!props.readOnly" class="import-action-menu" :class="{ show: showImportMenu }">
        <button type="button" :disabled="saveBusy" @click="onImportMvu">导入至[最新消息楼层]变量</button>
        <button type="button" :disabled="saveBusy" @click="onImportWorldbook">导入到聊天世界书</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';

import { evaluateCharacterCollapse } from '../services/characterCollapse';
import {
  itemCost,
  itemDescription,
  itemEffectEntries,
  itemEffectEntriesOrDescription,
  itemEffectOrDescription,
  itemName,
  itemQuality,
  itemTags,
  itemType,
  lawActiveEntries,
  lawPassiveEntries,
  qualityClass,
  statusEffectDescription,
  statusEffectDuration,
  statusEffectLayers,
  statusEffectSource,
  statusEffectType,
  type CharacterViewModel,
  type TabKey,
} from '../services/characterViewModel';
import { createParticleEngine, type ParticleEngine } from '../services/particleEngine';
import type { CharacterData, ThemeResolved } from '../types';

type DefaultSheetAttribute = {
  key: string;
  short: string;
  total: string;
  formula: string;
  formulaParts: Array<{ index: number; text: string; isWarning: boolean }>;
  isTotalAbnormal: boolean;
  hasFormulaWarning: boolean;
  showFormula: boolean;
};

const props = withDefaults(
  defineProps<{
    data: CharacterData;
    vm: CharacterViewModel;
    theme: ThemeResolved;
    attributes: DefaultSheetAttribute[];
    effectsEnabled?: boolean;
    readOnly?: boolean;
    saveBusy?: boolean;
    saveButtonText?: string;
    showImportMenu?: boolean;
    collapseModeEnabled?: boolean;
    alwaysExpandRules?: string;
    autoCollapseRules?: string;
    levelGapCollapseEnabled?: boolean;
    levelGapCollapseThreshold?: number;
    playerLevel?: number | null;
  }>(),
  {
    effectsEnabled: true,
    readOnly: false,
    saveBusy: false,
    saveButtonText: '📥',
    showImportMenu: false,
    collapseModeEnabled: false,
    alwaysExpandRules: '',
    autoCollapseRules: '',
    levelGapCollapseEnabled: false,
    levelGapCollapseThreshold: 5,
    playerLevel: null,
  },
);

const emit = defineEmits<{
  toggleAttributeFormula: [key: string];
  toggleImportMenu: [];
  importMvu: [];
  importWorldbook: [];
}>();

const compactAttributeAbbreviationMap: Record<string, string> = {
  力量: 'STR',
  敏捷: 'DEX',
  体质: 'CON',
  智力: 'INT',
  精神: 'SPI',
};

const compactAttributeIconPathMap: Record<string, string> = {
  力量: 'M7 9v6M17 9v6M4 10v4M20 10v4M7 12h10',
  敏捷: 'M13 2 6 13h6l-1 9 7-12h-6l1-8',
  体质: 'M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3z',
  智力: 'M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3m6-13a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3 3 3 0 0 1-2 3v1a3 3 0 0 1-3 3M9 4v14M15 4v14M9 8h3M12 14h3',
  精神: 'M12 3l1.2 3.2L16 7.5l-2.8 1.3L12 12l-1.2-3.2L8 7.5l2.8-1.3L12 3zM6 14l.8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8L6 14zM18 13l.7 1.8 1.8.7-1.8.7L18 18l-.7-1.8-1.8-.7 1.8-.7L18 13z',
};

const activeTab = ref<TabKey>('profile');
const manualCollapseState = ref<boolean | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const bgLayerRef = ref<HTMLElement | null>(null);
let engine: ParticleEngine | null = null;

const tierNumber = computed(() => props.theme.tier ?? 1);
const wrapperClasses = computed(() => ({
  'card-wrapper': true,
  [`tier-${tierNumber.value}`]: true,
  'high-tier': tierNumber.value >= 5,
}));
const automaticCollapseDecision = computed(() =>
  evaluateCharacterCollapse(props.data, {
    enabled: props.collapseModeEnabled,
    alwaysExpandRules: props.alwaysExpandRules,
    autoCollapseRules: props.autoCollapseRules,
    levelGapEnabled: props.levelGapCollapseEnabled,
    levelGap: props.levelGapCollapseThreshold,
    playerLevel: props.playerLevel,
  }),
);
const canUseCompactCard = computed(() => props.collapseModeEnabled);
const isCardCollapsed = computed(
  () => canUseCompactCard.value && (manualCollapseState.value ?? automaticCollapseDecision.value.collapsed),
);

const nameText = computed(() => props.vm.nameText || '未知角色');
const levelText = computed(() => props.vm.levelText || '?');
const raceText = computed(() => props.vm.raceText || '其他');
const tierText = computed(() => props.vm.tierText || '未知层级');
const identityText = computed(() => props.vm.identityText || '-');
const classText = computed(() => props.vm.classText || '-');
const personalityText = computed(() => props.vm.personalityText || '');
const likesText = computed(() => props.vm.likesText || '');
const appearanceText = computed(() => props.vm.appearanceText || '');
const attireText = computed(() => props.vm.attireText || '');
const backstoryText = computed(() => props.vm.backstoryText || '');
const resourceBoxes = computed(() => props.vm.resourceBoxes || []);
const skills = computed(() => props.vm.skills || []);
const equipments = computed(() => props.vm.equipments || []);
const inventorySections = computed(() => props.vm.inventorySections || []);
const statusEffects = computed(() => props.vm.statusEffects || []);
const divinityGodTitle = computed(() => props.vm.divinityGodTitle || '');
const divinityKingdom = computed(() => props.vm.divinityKingdom || null);
const divinityElements = computed(() => props.vm.divinityElements || []);
const divinityPowers = computed(() => props.vm.divinityPowers || []);
const divinityLaws = computed(() => props.vm.divinityLaws || []);
const visibleTabs = computed(() => props.vm.visibleTabs || []);

const compactCardAriaLabel = computed(() => {
  const parts = [`展开 ${nameText.value} 完整资料`];
  if (resourceBoxes.value.length > 0) {
    parts.push(resourceBoxes.value.map(resource => `${resource.label} ${resource.value}`).join('，'));
  }
  if (props.attributes.length > 0) {
    parts.push(props.attributes.map(attribute => `${attribute.key} ${attribute.total}`).join('，'));
  }
  return parts.join('。');
});

watch(
  () => props.data,
  () => {
    manualCollapseState.value = null;
  },
);

watchEffect(() => {
  if (!visibleTabs.value.some(tab => tab.key === activeTab.value)) {
    activeTab.value = visibleTabs.value[0]?.key || 'profile';
  }
});

function expandCard(): void {
  manualCollapseState.value = false;
}

function collapseCard(): void {
  if (!canUseCompactCard.value) return;
  manualCollapseState.value = true;
}

function toggleAttributeFormula(key: string): void {
  emit('toggleAttributeFormula', key);
}

function toggleImportMenu(): void {
  emit('toggleImportMenu');
}

function onImportMvu(): void {
  emit('importMvu');
}

function onImportWorldbook(): void {
  emit('importWorldbook');
}

function detectIOSSafari(): boolean {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return isIOS && isSafari;
}

function setupParticleEngine(): void {
  if (!props.effectsEnabled || !canvasRef.value || !bgLayerRef.value) return;
  engine?.destroy();
  engine = createParticleEngine({
    canvas: canvasRef.value,
    host: bgLayerRef.value,
    tier: props.theme.tier,
    colorHex: props.theme.tierHex,
    isIOSSafari: detectIOSSafari(),
  });
  engine.start();
}

watch(
  () => [props.effectsEnabled, props.theme.tier, props.theme.tierHex] as const,
  async ([enabled]) => {
    engine?.destroy();
    engine = null;
    if (!enabled) return;
    await nextTick();
    setupParticleEngine();
  },
);

onMounted(setupParticleEngine);

onBeforeUnmount(() => {
  engine?.destroy();
  engine = null;
});
</script>

<style scoped>
.card-wrapper {
  --name-font-stack:
    'Noto Serif SC', 'Source Han Serif SC', 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  --name-shadow: rgba(0, 0, 0, 0.58);
  --name-glow: rgba(var(--tier-color-rgb), 0.12);
  --tier-label-fg: #f3f6ff;
  --card-shell-radius: 16px;
  --edge-glow-expand: 10px;
  --edge-glow-radius-offset: 8px;
  --edge-glow-blur: 8px;
  --edge-glow-ring-alpha: 0.2;
  --edge-glow-outer-alpha: 0.22;
  --edge-glow-top-alpha: 0.34;
  position: relative;
  width: 100%;
  max-width: 750px;
  margin: 0 auto;
  border-radius: var(--card-shell-radius);
  overflow: visible;
  z-index: 1;
}

.card-wrapper.viewer-effects-disabled,
.card-wrapper.viewer-effects-disabled :where(*):not(img):not(video) {
  animation: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
  text-shadow: none !important;
  filter: none !important;
}

.card-wrapper::before {
  content: '';
  position: absolute;
  inset: calc(var(--edge-glow-expand) * -1);
  border-radius: calc(var(--card-shell-radius) + var(--edge-glow-radius-offset));
  pointer-events: none;
  z-index: -1;
  background:
    radial-gradient(
      120% 75% at 50% -5%,
      rgba(var(--tier-color-rgb), var(--edge-glow-top-alpha)) 0%,
      rgba(var(--tier-color-rgb), 0.14) 38%,
      transparent 74%
    ),
    linear-gradient(
      180deg,
      rgba(var(--tier-color-rgb), var(--edge-glow-outer-alpha)) 0%,
      rgba(var(--tier-color-rgb), 0.06) 30%,
      transparent 62%
    );
  box-shadow:
    0 0 0 1px rgba(var(--tier-color-rgb), var(--edge-glow-ring-alpha)),
    0 0 24px rgba(var(--tier-color-rgb), var(--edge-glow-outer-alpha));
  filter: blur(var(--edge-glow-blur));
  opacity: 1;
}

.card-wrapper.compact-card-active .frame-layer {
  display: none;
}

.card-wrapper.compact-card-active .card-background-layer {
  background:
    radial-gradient(120% 150% at 50% -50%, rgba(var(--tier-color-rgb), 0.5) 0%, transparent 58%),
    linear-gradient(135deg, rgba(var(--tier-color-rgb), 0.28) 0%, rgba(9, 14, 20, 0.96) 42%, rgba(6, 9, 15, 0.98) 100%);
  border-color: rgba(var(--tier-color-rgb), 0.82);
  border-top-color: var(--tier-color);
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.66),
    0 0 24px rgba(var(--tier-color-rgb), 0.26),
    inset 0 1px 0 rgba(var(--tier-color-rgb), 0.62),
    inset 0 0 34px rgba(var(--tier-color-rgb), 0.08);
}

.card-wrapper.compact-card-active .card-background-layer::before {
  background-image:
    linear-gradient(
      90deg,
      rgba(var(--tier-color-rgb), 0.05),
      transparent 24%,
      transparent 76%,
      rgba(var(--tier-color-rgb), 0.05)
    ),
    radial-gradient(90% 120% at 50% 0%, rgba(var(--tier-color-rgb), 0.22), transparent 68%);
}

.card-wrapper.compact-card-active .card-background-layer::after {
  opacity: 1;
  background-image: radial-gradient(circle at 50% 58%, transparent 50%, rgba(0, 0, 0, 0.3) 100%);
}

.compact-character-card {
  position: relative;
  z-index: 3;
  display: block;
  width: 100%;
  padding: 16px 18px 17px;
  border: 0;
  border-radius: inherit;
  outline: none;
  background: transparent;
  color: #f0f0f0;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.compact-character-card:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.7);
}

.compact-card-head {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  margin-bottom: 12px;
}

.compact-level-tier {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid rgba(var(--tier-color-rgb), 0.88);
  border-radius: 999px;
  background: rgba(4, 10, 14, 0.58);
  color: #effff5;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 10px rgba(var(--tier-color-rgb), 0.18);
  font-size: calc(12px + var(--ci-font-size-adjust, 0px));
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.compact-character-name {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  color: #fff;
  font-family: var(--name-font-stack);
  font-size: calc(clamp(22px, 3vw, 28px) + var(--ci-font-size-adjust, 0px));
  font-weight: 800;
  line-height: 1.12;
  text-overflow: ellipsis;
  white-space: nowrap;
  -webkit-text-stroke: 1.8px var(--race-color);
  paint-order: stroke fill;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 2px rgba(var(--race-color-rgb), 0.95),
    0 0 8px rgba(var(--race-color-rgb), 0.45);
}

.compact-expand-chevron {
  flex: 0 0 auto;
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.78);
  font-size: calc(15px + var(--ci-font-size-adjust, 0px));
}

.compact-card-data {
  display: grid;
  grid-template-areas: 'resources attributes';
  grid-template-columns: minmax(0, 0.98fr) minmax(0, 1.42fr);
  gap: 10px;
  align-items: stretch;
}

.compact-card-data.no-resources {
  grid-template-areas: 'attributes';
  grid-template-columns: 1fr;
}

.compact-resources,
.compact-attributes {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.035);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    inset 0 0 18px rgba(var(--tier-color-rgb), 0.035);
}

.compact-resources {
  grid-area: resources;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-color: rgba(var(--tier-color-rgb), 0.24);
  background: rgba(var(--tier-color-rgb), 0.045);
}

.compact-resource {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 11px 6px;
  background: linear-gradient(180deg, rgba(var(--tier-color-rgb), 0.1), rgba(255, 255, 255, 0.01));
}

.compact-resource + .compact-resource {
  border-left: 1px solid rgba(255, 255, 255, 0.11);
}

.compact-resource-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: calc(11px + var(--ci-font-size-adjust, 0px));
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1;
}

.compact-resource-value {
  margin-top: 5px;
  color: #fff;
  font-family: Inter, 'Noto Sans', system-ui, sans-serif;
  font-size: calc(23px + var(--ci-font-size-adjust, 0px));
  font-weight: 800;
  line-height: 1.05;
  text-shadow: 0 0 10px rgba(var(--tier-color-rgb), 0.18);
}

.compact-attributes {
  grid-area: attributes;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.compact-attribute {
  --attr-accent-rgb: 160, 170, 182;

  position: relative;
  min-width: 0;
  padding: 10px 4px 9px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.028), rgba(255, 255, 255, 0.01));
  text-align: center;
}

.compact-attribute[data-attribute='力量'] {
  --attr-accent-rgb: 192, 126, 117;
}

.compact-attribute[data-attribute='敏捷'] {
  --attr-accent-rgb: 120, 164, 145;
}

.compact-attribute[data-attribute='体质'] {
  --attr-accent-rgb: 184, 157, 108;
}

.compact-attribute[data-attribute='智力'] {
  --attr-accent-rgb: 116, 145, 180;
}

.compact-attribute[data-attribute='精神'] {
  --attr-accent-rgb: 153, 130, 177;
}

.compact-attribute::after {
  position: absolute;
  top: 0;
  right: 18%;
  left: 18%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--attr-accent-rgb), 0.72) 24%,
    rgba(var(--attr-accent-rgb), 0.72) 76%,
    transparent
  );
  box-shadow: 0 0 7px rgba(var(--attr-accent-rgb), 0.18);
  content: '';
}

.compact-attribute + .compact-attribute::before {
  position: absolute;
  top: 22%;
  bottom: 22%;
  left: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.11);
  content: '';
}

.compact-attribute-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 4px;
  color: rgba(242, 247, 255, 0.92);
}

.compact-attribute-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  color: rgb(var(--attr-accent-rgb));
  filter: drop-shadow(0 0 4px rgba(var(--attr-accent-rgb), 0.28));
}

.compact-attribute-name {
  display: inline-block;
  margin: 0;
  color: rgba(248, 250, 252, 0.92);
  font-size: calc(12px + var(--ci-font-size-adjust, 0px));
  font-weight: 800;
  line-height: 1;
}

.compact-attribute-value {
  display: block;
  color: #fff;
  font-family: Inter, 'Noto Sans', system-ui, sans-serif;
  font-size: calc(24px + var(--ci-font-size-adjust, 0px));
  font-weight: 800;
  line-height: 1.04;
  text-shadow: 0 0 10px rgba(var(--tier-color-rgb), 0.26);
}

.card-collapse-button {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 2;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(var(--tier-color-rgb), 0.42);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.34);
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
}

.card-collapse-button:hover,
.card-collapse-button:focus-visible {
  border-color: rgba(var(--tier-color-rgb), 0.78);
  color: #fff;
  outline: none;
}

.frame-layer {
  position: absolute;
  top: -25px;
  left: -5px;
  width: calc(100% + 10px);
  height: calc(100% + 50px);
  z-index: 4;
  pointer-events: none;
  display: none;
  flex-direction: column;
}

.frame-layer.show {
  display: flex;
}

.frame-svg {
  width: 100%;
  fill: none;
  stroke: var(--tier-color);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 5px rgba(var(--tier-color-rgb), 0.8));
}

.frame-top {
  width: 100%;
  height: 100px;
  flex-shrink: 0;
}

.frame-body {
  width: 100%;
  flex-grow: 1;
}

.card-background-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(16, 21, 32, 0.9) 0%,
    rgba(13, 18, 29, 0.92) 56%,
    rgba(10, 14, 23, 0.94) 100%
  );
  border: 1px solid rgba(var(--tier-color-rgb), 0.72);
  border-top: 2px solid rgba(var(--tier-color-rgb), 1);
  box-shadow:
    0 14px 36px rgba(0, 0, 0, 0.78),
    0 0 28px rgba(var(--tier-color-rgb), 0.24),
    0 -2px 30px rgba(var(--tier-color-rgb), 0.42),
    inset 0 0 30px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(var(--tier-color-rgb), 0.75);
  backdrop-filter: blur(2px) saturate(136%);
  -webkit-backdrop-filter: blur(2px) saturate(136%);
}

.card-background-layer::before,
.card-background-layer::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card-background-layer::before {
  z-index: 1;
  mix-blend-mode: screen;
  background-image:
    radial-gradient(
      140% 95% at 50% -8%,
      rgba(var(--tier-color-rgb), 0.66) 0%,
      rgba(var(--tier-color-rgb), 0.3) 32%,
      rgba(var(--tier-color-rgb), 0.08) 58%,
      transparent 78%
    ),
    linear-gradient(
      180deg,
      rgba(var(--tier-color-rgb), 0.48) 0%,
      rgba(var(--tier-color-rgb), 0.16) 26%,
      transparent 56%
    );
}

.card-background-layer::after {
  z-index: 1;
  opacity: 0.92;
  background-image:
    radial-gradient(circle at 50% 82%, rgba(var(--race-color-rgb), 0.26) 0%, transparent 74%),
    radial-gradient(circle at 50% 48%, transparent 58%, rgba(0, 0, 0, 0.33) 100%);
}

.particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  mix-blend-mode: normal;
  opacity: 0.78;
}

.card-wrapper.high-tier .card-background-layer {
  border: 1px solid rgba(var(--tier-color-rgb), 0.95);
  border-top: 3px solid rgba(var(--tier-color-rgb), 1);
}

.sheet-content-wrapper {
  position: relative;
  z-index: 3;
}

.sheet-header {
  padding: 50px 20px 25px;
  text-align: center;
  position: relative;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(var(--tier-color-rgb), 0.2);
  background: radial-gradient(ellipse at 50% 0%, rgba(var(--tier-color-rgb), 0.15) 0%, transparent 80%);
}

.sheet-header::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background-image:
    linear-gradient(90deg, transparent 95%, rgba(var(--tier-color-rgb), 0.1) 95%),
    linear-gradient(0deg, transparent 95%, rgba(var(--tier-color-rgb), 0.1) 95%);
  background-size: 40px 40px;
  mask-image: linear-gradient(to bottom, rgba(148, 148, 148, 0.72) 0%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(148, 148, 148, 0.72) 0%, transparent 100%);
}

.level-badge {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 50px;
  border: 1px solid var(--tier-color);
  color: var(--tier-color);
  font-weight: 700;
  margin-bottom: 15px;
  background: rgba(0, 0, 0, 0.7);
  box-shadow: 0 0 15px rgba(var(--tier-color-rgb), 0.2);
  text-shadow: 0 0 8px rgba(var(--tier-color-rgb), 0.6);
}

.char-name {
  margin: 0 0 10px;
  font-size: calc(3rem + var(--ci-font-size-adjust, 0px));
  color: #ffffff;
  font-family: var(--name-font-stack);
  font-weight: 700;
  letter-spacing: 0.25px;
  line-height: 1.08;
  text-shadow:
    0 1px 2px var(--name-shadow),
    0 0 4px var(--name-glow);
}

.char-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  align-items: center;
  font-size: calc(0.95rem + var(--ci-font-size-adjust, 0px));
}

.meta-separator {
  color: rgba(242, 247, 255, 0.78);
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.86),
    0 0 3px rgba(var(--tier-color-rgb), 0.22);
}

.tier-name {
  display: inline-flex;
  align-items: center;
  padding: 1px 11px;
  border-radius: 999px;
  border: 1px solid rgba(var(--tier-color-rgb), 0.9);
  color: var(--tier-label-fg);
  background: linear-gradient(180deg, rgba(8, 10, 16, 0.84) 0%, rgba(10, 12, 18, 0.68) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 0 0 1px rgba(0, 0, 0, 0.52),
    0 0 10px rgba(var(--tier-color-rgb), 0.34);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  font-weight: 700;
  letter-spacing: 0.12px;
  line-height: 1.2;
}

.sheet-body {
  padding: 20px 30px 90px;
}

.attributes-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-bottom: 18px;
  --flag-width: 96px;
  --flag-min-height: 118px;
  --flag-top-padding: 15px;
  --flag-bottom-padding: 30px;
  --flag-name-size: clamp(1rem, calc(var(--flag-width) * 0.2), 1.08rem);
  --flag-total-size: clamp(2rem, calc(var(--flag-width) * 0.4), 2.45rem);
  --flag-formula-size: clamp(0.76rem, calc(var(--flag-width) * 0.115), 0.86rem);
  --flag-total-offset: 0px;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 22px;
}

.resource-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--race-color-rgb), 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 18px rgba(var(--tier-color-rgb), 0.1);
  overflow: hidden;
}

.resource-item::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(var(--tier-color-rgb), 0.12) 0%, transparent 100%);
}

.resource-name,
.resource-value {
  position: relative;
  z-index: 1;
}

.resource-name {
  font-size: calc(0.8rem + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.82);
}

.resource-value {
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-size: calc(1.25rem + var(--ci-font-size-adjust, 0px));
  line-height: 1;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 0 12px rgba(var(--race-color-rgb), 0.25);
}

.attribute-item {
  flex: 0 0 var(--flag-width);
  width: var(--flag-width);
  min-width: var(--flag-width);
  max-width: var(--flag-width);
  min-height: var(--flag-min-height);
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-top: 2px solid var(--race-color);
  clip-path: polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%);
  padding: var(--flag-top-padding) 5px var(--flag-bottom-padding);
  text-align: center;
  cursor: default;
  transition:
    transform 0.2s,
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}

.attribute-item.has-formula {
  cursor: pointer;
}

.attribute-item.has-warning {
  border-top-color: #ff7875;
  box-shadow: 0 0 0 1px rgba(255, 120, 117, 0.16);
}

.attribute-item:hover {
  transform: translateY(-3px);
  background: rgba(var(--race-color-rgb), 0.1);
  box-shadow: 0 5px 20px rgba(var(--race-color-rgb), 0.15);
  border-color: rgba(var(--race-color-rgb), 0.4);
}

.attribute-name {
  display: block;
  font-size: calc(var(--flag-name-size) + var(--ci-font-size-adjust, 0px));
  color: #fff;
  margin-bottom: 6px;
  font-weight: 700;
  line-height: 1.05;
  opacity: 0.96;
}

.attribute-total {
  display: block;
  margin-top: var(--flag-total-offset, 0px);
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-size: calc(var(--flag-total-size) + var(--ci-font-size-adjust, 0px));
  line-height: 1;
  font-weight: 700;
  text-shadow: 0 2px 15px rgba(var(--race-color-rgb), 0.45);
}

.attribute-total.is-warning {
  color: #ff9b9b;
  text-shadow: 0 0 10px rgba(255, 77, 77, 0.42);
}

.attribute-formula {
  display: none;
  margin-top: 6px;
  font-size: calc(var(--flag-formula-size) + var(--ci-font-size-adjust, 0px));
  color: var(--race-color);
  font-weight: 700;
  line-height: 1.2;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
}

.formula-part {
  display: inline-block;
}

.formula-part-separator {
  display: inline-block;
  opacity: 0.85;
}

.formula-part-warning {
  color: #ff4d4d;
  text-shadow: 0 0 8px rgba(255, 77, 77, 0.35);
}

.attribute-item.show-formula .attribute-total {
  display: none;
}

.attribute-item.show-formula .attribute-formula {
  display: inline-flex;
}

.tab-nav {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 14px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tab-nav::-webkit-scrollbar {
  display: none;
}

.tab-button {
  flex: 1;
  background: transparent;
  border: none;
  color: #9a9a9a;
  padding: 12px 16px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}

.tab-button.active {
  color: var(--race-color);
  border-bottom: 2px solid var(--race-color);
  font-weight: 700;
}

.tab-content {
  display: block;
}

.profile-grid {
  display: grid;
  gap: 8px;
}

.profile-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.profile-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.profile-panel {
  height: 100%;
  box-sizing: border-box;
}

.subsection-title {
  font-size: calc(1.08rem + var(--ci-font-size-adjust, 0px));
  margin: 0 0 8px;
  padding-left: 8px;
  border-left: 3px solid var(--race-color);
  color: var(--race-color);
}

.divinity-main-title {
  text-align: center;
  border-left: none;
  color: var(--tier-color);
}

.story {
  white-space: pre-line;
  line-height: 1.58;
  margin-bottom: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 12px;
}

.tags-box {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 10px;
}

.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid var(--race-color);
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 6px;
}

.divinity-card {
  border-left-color: var(--tier-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.card-title {
  margin: 0;
  font-size: calc(1.05rem + var(--ci-font-size-adjust, 0px));
  color: #fff;
  font-weight: 700;
}

.card-subtitle {
  font-size: calc(0.85rem + var(--ci-font-size-adjust, 0px));
  color: #bbb;
}

.card-title.quality-common,
.card-subtitle.quality-common {
  color: #c4cad3;
}

.card-title.quality-uncommon,
.card-subtitle.quality-uncommon {
  color: #7be495;
  text-shadow: 0 0 10px rgba(123, 228, 149, 0.28);
}

.card-title.quality-rare,
.card-subtitle.quality-rare {
  color: #62bbff;
  text-shadow: 0 0 10px rgba(98, 187, 255, 0.3);
}

.card-title.quality-epic,
.card-subtitle.quality-epic {
  color: #cf95ff;
  text-shadow: 0 0 10px rgba(207, 149, 255, 0.3);
}

.card-title.quality-legendary,
.card-subtitle.quality-legendary {
  color: #ffc46b;
  text-shadow: 0 0 10px rgba(255, 196, 107, 0.3);
}

.card-title.quality-mythic,
.card-subtitle.quality-mythic {
  color: #ff78c5;
  text-shadow: 0 0 10px rgba(255, 120, 197, 0.3);
}

.card-body p {
  margin: 5px 0;
  white-space: pre-line;
  line-height: 1.5;
}

.card-label {
  color: var(--race-color);
  font-weight: 700;
  margin-right: 4px;
}

.law-effect {
  display: grid;
  gap: 4px;
  margin: 10px 0;
}

.law-effect-title {
  color: var(--race-color);
  font-weight: 800;
  line-height: 1.35;
}

.law-effect p,
.law-description {
  margin: 0;
}

.law-description {
  margin-top: 12px;
}

.effect-list {
  margin: 4px 0 8px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-item {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
}

.effect-name {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(var(--race-color-rgb), 0.5);
  background: rgba(var(--race-color-rgb), 0.12);
  color: var(--race-color);
  font-weight: 700;
  font-size: calc(0.78rem + var(--ci-font-size-adjust, 0px));
  line-height: 1;
  padding: 3px 8px;
}

.effect-text {
  flex: 1;
  min-width: 0;
  white-space: pre-line;
  line-height: 1.45;
}

.card-description {
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 8px;
  opacity: 0.9;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.card-tag {
  display: inline-block;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: calc(0.82rem + var(--ci-font-size-adjust, 0px));
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
}

.import-action-btn {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 30, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  z-index: 60;
  font-size: calc(1.2rem + var(--ci-font-size-adjust, 0px));
  transition: all 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
}

.import-action-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.import-action-btn:hover:not(:disabled) {
  background: rgba(60, 60, 60, 0.92);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
  border-color: #fff;
}

.import-action-menu {
  position: absolute;
  bottom: 55px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 20, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 6px;
  z-index: 70;
  min-width: 190px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: none;
}

.import-action-menu.show {
  display: block;
}

.import-action-menu button {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  color: #eee;
  padding: 10px 10px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-size: calc(0.95rem + var(--ci-font-size-adjust, 0px));
}

.import-action-menu button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.import-action-menu button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
}

@media (min-width: 900px) {
  .attributes-grid {
    justify-content: center;
    gap: 12px;
    --flag-width: min(140px, calc((100% - 48px) / 5));
    --flag-min-height: calc(var(--flag-width) * 1.07);
    --flag-top-padding: clamp(16px, calc(var(--flag-width) * 0.14), 20px);
    --flag-bottom-padding: clamp(30px, calc(var(--flag-width) * 0.27), 38px);
    --flag-total-offset: clamp(2px, calc(var(--flag-width) * 0.07), 10px);
  }
}

@media (max-width: 820px) {
  .card-wrapper {
    --edge-glow-expand: 0px;
    --edge-glow-radius-offset: 0px;
    --edge-glow-blur: 0px;
    --edge-glow-ring-alpha: 0;
    --edge-glow-outer-alpha: 0;
    --edge-glow-top-alpha: 0;
  }

  .card-wrapper::before {
    content: none;
  }

  .sheet-body {
    padding: 16px 18px 84px;
  }

  .sheet-header {
    padding: 40px 16px 20px;
  }

  .char-name {
    font-size: calc(2.2rem + var(--ci-font-size-adjust, 0px));
    letter-spacing: 0.2px;
    text-shadow:
      0 1px 2px var(--name-shadow),
      0 0 3px rgba(var(--tier-color-rgb), 0.12);
  }

  .tab-button {
    flex: 0 0 auto;
    min-width: 82px;
    padding: 10px 12px;
  }
}

@media (max-width: 640px) {
  .card-wrapper {
    max-width: min(100%, 720px);
    --card-shell-radius: 16px;
    --edge-glow-expand: 0px;
    --edge-glow-radius-offset: 0px;
    --edge-glow-blur: 0px;
    --edge-glow-ring-alpha: 0;
    --edge-glow-outer-alpha: 0;
    --edge-glow-top-alpha: 0;
  }

  .card-wrapper::before {
    content: none;
  }

  .compact-character-card {
    padding: 13px 12px 14px;
  }

  .compact-card-head {
    gap: 7px;
    margin-bottom: 10px;
  }

  .compact-level-tier {
    min-height: 25px;
    padding: 3px 8px;
    font-size: calc(11px + var(--ci-font-size-adjust, 0px));
  }

  .compact-character-name {
    font-size: calc(20px + var(--ci-font-size-adjust, 0px));
  }

  .compact-card-data,
  .compact-card-data.no-resources {
    grid-template-areas:
      'attributes'
      'resources';
    grid-template-columns: 1fr;
    gap: 7px;
  }

  .compact-card-data.no-resources {
    grid-template-areas: 'attributes';
  }

  .compact-attribute {
    padding: 9px 3px 8px;
  }

  .compact-attribute-icon {
    width: 15px;
    height: 15px;
  }

  .compact-attribute-name {
    font-size: calc(11.5px + var(--ci-font-size-adjust, 0px));
  }

  .compact-attribute-value {
    font-size: calc(22px + var(--ci-font-size-adjust, 0px));
  }

  .compact-resource {
    min-height: 32px;
    flex-direction: row;
    gap: 5px;
    padding: 6px 3px;
  }

  .compact-resource-label {
    font-size: calc(10px + var(--ci-font-size-adjust, 0px));
  }

  .compact-resource-value {
    margin-top: 0;
    font-size: calc(17px + var(--ci-font-size-adjust, 0px));
  }

  .card-collapse-button {
    top: 10px;
    right: 12px;
    width: 28px;
    height: 28px;
  }

  .sheet-header {
    padding: 34px 12px 16px;
    margin-bottom: 6px;
  }

  .level-badge {
    margin-bottom: 10px;
    padding: 3px 12px;
    font-size: calc(0.9rem + var(--ci-font-size-adjust, 0px));
  }

  .char-name {
    font-size: calc(1.8rem + var(--ci-font-size-adjust, 0px));
    margin-bottom: 8px;
    letter-spacing: 0.1px;
    text-shadow:
      0 1px 2px var(--name-shadow),
      0 0 2px rgba(var(--tier-color-rgb), 0.1);
  }

  .char-meta-row {
    gap: 6px;
    font-size: calc(0.82rem + var(--ci-font-size-adjust, 0px));
  }

  .tier-name {
    padding: 1px 8px;
    border-width: 1px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 5px rgba(var(--tier-color-rgb), 0.16);
  }

  .sheet-body {
    padding: 12px 10px 80px;
  }

  .attributes-grid {
    gap: 8px 10px;
    margin-bottom: 16px;
    --flag-width: calc((100% - 20px) / 3);
    --flag-min-height: calc(var(--flag-width) * 1.18);
    --flag-top-padding: 12px;
    --flag-bottom-padding: 26px;
    --flag-name-size: clamp(0.98rem, calc(var(--flag-width) * 0.16), 1.08rem);
    --flag-total-size: clamp(2.05rem, calc(var(--flag-width) * 0.34), 2.45rem);
    --flag-formula-size: clamp(0.72rem, calc(var(--flag-width) * 0.105), 0.82rem);
  }

  .attribute-item {
    flex: 0 0 var(--flag-width);
    width: var(--flag-width);
    max-width: var(--flag-width);
    min-width: 0;
    min-height: var(--flag-min-height);
    padding: var(--flag-top-padding) 5px var(--flag-bottom-padding);
  }

  .profile-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .subsection-title {
    font-size: calc(1rem + var(--ci-font-size-adjust, 0px));
  }

  .story,
  .card,
  .tags-box {
    padding: 10px;
  }

  .import-action-btn {
    bottom: 10px;
    font-size: calc(1.05rem + var(--ci-font-size-adjust, 0px));
    padding: 7px 10px;
  }

  .import-action-menu {
    bottom: 46px;
    min-width: 170px;
  }

  .import-action-menu button {
    padding: 8px;
    font-size: calc(0.9rem + var(--ci-font-size-adjust, 0px));
  }
}
</style>
