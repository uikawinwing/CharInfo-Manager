<template>
  <div
    class="illustrated-wrapper"
    :class="{ 'is-special-npc': specialNpc, 'force-mobile-layout': forceMobileLayout }"
  >
    <main
      ref="shellElement"
      class="illustrated-shell"
      :aria-hidden="isEntranceQuoteDialogOpen ? 'true' : undefined"
      :inert="isEntranceQuoteDialogOpen ? true : undefined"
      :class="[
        {
          'is-overview-tab': isOverviewTab,
          'is-detail-tab': !isOverviewTab,
          'is-divinity-tab': isDivinityTab,
          'is-skills-tab': specialNpc && activeSpecialTab === 'skills',
          'is-special-npc': specialNpc,
        },
        isOverviewTab ? overviewDensityClass : null,
      ]"
    >
      <canvas
        v-if="specialNpc"
        ref="detailWallpaperCanvas"
        class="illustrated-mobile-detail-wallpaper"
        :class="{ 'is-visible': !isOverviewTab && detailWallpaperReady }"
        aria-hidden="true"
      ></canvas>
      <aside class="illustrated-portrait-pane">
        <div v-if="!portraitLoaded && !portraitLoadFailed" class="illustrated-portrait-loading" role="status">
          <span aria-hidden="true">◇</span>
          <small>立绘载入中</small>
        </div>
        <video
          v-if="isVideoPortrait && !portraitLoadFailed"
          ref="portraitVideoElement"
          :key="portraitMediaUrl"
          class="illustrated-portrait-video"
          :class="{ 'is-loaded': portraitLoaded }"
          :src="portraitMediaUrl"
          :aria-label="vm.nameText"
          autoplay
          loop
          muted
          playsinline
          preload="metadata"
          @loadeddata="onPortraitLoaded"
          @error="onPortraitLoadError"
        ></video>
        <img
          v-else-if="!portraitLoadFailed"
          ref="portraitImageElement"
          :key="portraitMediaUrl"
          class="illustrated-portrait-image"
          :class="{ 'is-loaded': portraitLoaded }"
          :src="portraitMediaUrl"
          :alt="vm.nameText"
          loading="lazy"
          decoding="async"
          @load="onPortraitLoaded"
          @error="onPortraitLoadError"
        />
        <section v-else class="illustrated-portrait-failure" role="status">
          <strong>立绘无法加载</strong>
          <p>可能是网络、代理或资源地址不可用。</p>
          <div class="illustrated-portrait-failure-actions">
            <button type="button" @click="retryPortraitLoad">重试</button>
            <button type="button" @click="$emit('fallbackToDefault')">切换到默认版</button>
          </div>
        </section>
        <div v-if="isOverviewTab && hasMultiplePortraits" class="illustrated-portrait-navigation">
          <button type="button" aria-label="上一张立绘" @click="switchPortrait(-1)">‹</button>
          <button type="button" aria-label="下一张立绘" @click="switchPortrait(1)">›</button>
        </div>
        <div v-if="isOverviewTab" class="illustrated-mobile-overview-overlay">
          <button
            v-if="vm.entranceQuoteText"
            class="illustrated-mobile-entrance-quote"
            type="button"
            :aria-label="`查看${vm.nameText}的完整台词`"
            title="查看完整台词"
            @click="openEntranceQuoteDialog"
          >
            <span class="illustrated-mobile-quote-mark" aria-hidden="true">“</span>
            <span class="illustrated-mobile-quote-text">{{ vm.entranceQuoteText }}</span>
            <span class="illustrated-mobile-quote-mark" aria-hidden="true">”</span>
            <span class="illustrated-quote-expand-cue" aria-hidden="true">↗</span>
          </button>
          <div class="illustrated-mobile-header-overlay">
            <IllustratedHeader :vm="vm" compact />
          </div>
        </div>
      </aside>

      <section class="illustrated-data-pane">
        <IllustratedHeader
          v-if="isOverviewTab"
          :class="['illustrated-desktop-header', overviewDensityClass]"
          :vm="vm"
          @layout-change="updateOverviewDensity"
        />

        <div ref="panelsElement" class="illustrated-panels">
          <div v-if="hideRedundantDetailTitle" class="illustrated-detail-title-spacer" aria-hidden="true"></div>
          <IllustratedPageTitle v-else-if="!isOverviewTab" :title="activeSpecialTabTitle" />

          <IllustratedOverviewPanel
            v-if="activeSpecialTab === 'overview'"
            :class="[overviewDensityClass, { 'is-special-npc-overview': specialNpc }]"
            :attributes="attributes"
            :resource-boxes="[]"
            :entrance-quote-text="vm.entranceQuoteText"
            @toggle-attribute-formula="$emit('toggleAttributeFormula', $event)"
            @open-entrance-quote="openEntranceQuoteDialog"
          />

          <template v-else-if="activeSpecialTab === 'profile'">
            <nav
              v-if="specialNpc && hasCustomStorySections"
              class="illustrated-profile-subnav"
              aria-label="档案内容"
            >
              <button
                type="button"
                :class="{ active: activeProfileSubview === 'info' }"
                :aria-pressed="activeProfileSubview === 'info'"
                @click="activeProfileSubview = 'info'"
              >
                资料
              </button>
              <button
                type="button"
                :class="{ active: activeProfileSubview === 'story' }"
                :aria-pressed="activeProfileSubview === 'story'"
                @click="activeProfileSubview = 'story'"
              >
                故事
              </button>
            </nav>

            <IllustratedProfilePanel
              v-if="activeProfileSubview === 'info' || !hasCustomStorySections"
              :vm="vm"
              :attributes="attributes"
              :resource-boxes="vm.resourceBoxes"
              :show-stats="!specialNpc"
              :backstory-text="profileFallbackBackstoryText"
              @toggle-attribute-formula="$emit('toggleAttributeFormula', $event)"
            />

            <article v-else class="illustrated-profile-story-view">
              <p v-if="vm.storyAuthorText" class="illustrated-profile-story-author">故事作者 · {{ vm.storyAuthorText }}</p>
              <section
                v-for="(section, index) in vm.storySections"
                :key="`${index}:${section.title}`"
                class="illustrated-profile-story-section"
              >
                <h3>{{ section.title }}</h3>
                <p>{{ section.content }}</p>
              </section>
            </article>
          </template>

          <template v-else-if="activeSpecialTab === 'skills'">
            <section
              v-for="group in groupedSkills"
              :key="`skill-group-${group.key}`"
              class="illustrated-section illustrated-skill-group illustrated-group-panel"
              :class="{ 'is-collapsed': isGroupCollapsed(`skill:${group.key}`) }"
            >
              <h3 class="illustrated-section-title illustrated-group-title">
                <button
                  class="illustrated-group-toggle"
                  type="button"
                  :aria-expanded="!isGroupCollapsed(`skill:${group.key}`)"
                  @click="toggleGroup(`skill:${group.key}`)"
                >
                  <span class="illustrated-group-icon" aria-hidden="true">{{ group.icon }}</span>
                  <span class="illustrated-group-label">{{ group.title }}</span>
                  <span class="illustrated-group-chevron" aria-hidden="true"></span>
                </button>
              </h3>
              <div v-show="!isGroupCollapsed(`skill:${group.key}`)" class="illustrated-group-body">
                <IllustratedItemCard
                  v-for="(item, index) in group.items"
                  :key="`skill-${group.key}-${index}`"
                  :item="item"
                  :variant="specialNpc ? 'skill' : 'item'"
                  show-cost
                />
              </div>
            </section>
          </template>

          <template v-else-if="activeSpecialTab === 'equipment'">
            <IllustratedItemCard v-for="(item, index) in vm.equipments" :key="`equipment-${index}`" :item="item" />
          </template>

          <template v-else-if="activeSpecialTab === 'inventory'">
            <section v-for="section in vm.inventorySections" :key="section.key" class="illustrated-section">
              <h3 class="illustrated-section-title">{{ section.title }}</h3>
              <IllustratedItemCard
                v-for="(item, index) in section.items"
                :key="`${section.key}-${index}`"
                :item="item"
              />
            </section>
          </template>

          <template v-else-if="activeSpecialTab === 'holdings'">
            <section
              v-if="vm.equipments.length > 0"
              class="illustrated-section illustrated-holding-section illustrated-group-panel"
              :class="{ 'is-collapsed': isGroupCollapsed('holding:equipment') }"
            >
              <h3 class="illustrated-section-title illustrated-group-title">
                <button
                  class="illustrated-group-toggle"
                  type="button"
                  :aria-expanded="!isGroupCollapsed('holding:equipment')"
                  @click="toggleGroup('holding:equipment')"
                >
                  <span class="illustrated-group-icon" aria-hidden="true">▣</span>
                  <span class="illustrated-group-label">装备</span>
                  <span class="illustrated-group-chevron" aria-hidden="true"></span>
                </button>
              </h3>
              <div v-show="!isGroupCollapsed('holding:equipment')" class="illustrated-group-body">
                <IllustratedItemCard
                  v-for="(item, index) in vm.equipments"
                  :key="`holding-equipment-${index}`"
                  :item="item"
                  :variant="specialNpc ? 'holding' : 'item'"
                />
              </div>
            </section>

            <section
              v-for="section in vm.inventorySections"
              :key="`holding-${section.key}`"
              class="illustrated-section illustrated-holding-section illustrated-group-panel"
              :class="{ 'is-collapsed': isGroupCollapsed(`holding:${section.key}`) }"
            >
              <h3 class="illustrated-section-title illustrated-group-title">
                <button
                  class="illustrated-group-toggle"
                  type="button"
                  :aria-expanded="!isGroupCollapsed(`holding:${section.key}`)"
                  @click="toggleGroup(`holding:${section.key}`)"
                >
                  <span class="illustrated-group-icon" aria-hidden="true">◈</span>
                  <span class="illustrated-group-label">{{ section.title }}</span>
                  <span class="illustrated-group-chevron" aria-hidden="true"></span>
                </button>
              </h3>
              <div v-show="!isGroupCollapsed(`holding:${section.key}`)" class="illustrated-group-body">
                <IllustratedItemCard
                  v-for="(item, index) in section.items"
                  :key="`holding-${section.key}-${index}`"
                  :item="item"
                  :variant="specialNpc ? 'holding' : 'item'"
                />
              </div>
            </section>
          </template>

          <IllustratedDefaultDivinityPanel
            v-else-if="activeSpecialTab === 'divinity'"
            :vm="vm"
            :compact="specialNpc"
          />

          <template v-else-if="activeSpecialTab === 'statusEffects'">
            <IllustratedItemCard
              v-for="(item, index) in vm.statusEffects"
              :key="`status-${index}`"
              :item="item"
              variant="status"
            />
          </template>

          <IllustratedCharacterPanel
            v-else-if="activeSpecialTab === 'characterPanel'"
            :vm="vm"
            :attributes="attributes"
            :resource-boxes="vm.resourceBoxes"
            :status-effects="vm.statusEffects"
          />

          <article v-else class="illustrated-story-block">
            <p>{{ vm.backstoryText || '暂无故事' }}</p>
          </article>
        </div>

        <IllustratedTabNav
          v-if="!specialNpc"
          :tabs="tabs"
          :active-tab="activeSpecialTab"
          :importing="importing"
          :import-button-text="importButtonText"
          :show-import-action="!readOnly"
          :force-mobile-layout="forceMobileLayout"
          @set-tab="setActiveSpecialTab"
          @toggle-import-menu="$emit('toggleImportMenu')"
        />
      </section>

      <IllustratedTabNav
        v-if="specialNpc"
        side-rail
        :tabs="tabs"
        :active-tab="activeSpecialTab"
        :importing="importing"
        :import-button-text="importButtonText"
        :show-import-action="!readOnly"
        :force-mobile-layout="forceMobileLayout"
        @set-tab="setActiveSpecialTab"
        @toggle-import-menu="$emit('toggleImportMenu')"
      />

      <div v-if="!readOnly" class="import-action-menu" :class="{ show: showImportMenu }">
        <button type="button" :disabled="importing" @click="$emit('importMvu')">保存在聊天变量</button>
        <button type="button" :disabled="importing" @click="$emit('importWorldbook')">导入到聊天世界书</button>
      </div>
    </main>

    <div
      v-if="isEntranceQuoteDialogOpen"
      class="illustrated-quote-dialog-backdrop"
      @click.self="closeEntranceQuoteDialog"
    >
      <div class="illustrated-wrapper illustrated-quote-dialog-theme">
        <section
          class="illustrated-quote-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="`${vm.nameText}的完整台词`"
          @keydown.esc.stop.prevent="closeEntranceQuoteDialog"
          @keydown.tab.prevent="keepEntranceQuoteDialogFocus"
        >
          <span class="illustrated-quote-dialog-kicker">CHARACTER VOICE</span>
          <h2>{{ vm.nameText }}的话</h2>
          <span class="illustrated-quote-dialog-ornament" aria-hidden="true"><i></i></span>
          <p class="illustrated-quote-dialog-text">{{ vm.entranceQuoteText }}</p>
          <button
            ref="quoteDialogCloseButton"
            class="illustrated-quote-dialog-close"
            type="button"
            @click="closeEntranceQuoteDialog"
          >
            关闭
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';

import { itemType, type CharacterViewModel, type ItemObject } from '../../services/characterViewModel';
import { preloadPortraitImages } from '../../services/imagePreload';
import { normalizePortraitMediaUrlForBrowser } from '../../services/imageUrl';
import { createMediaSourceTimeout, nextMediaSourceIndex } from '../../services/mediaSourceFallback';
import type { AttributeView, IllustratedTab, IllustratedTabKey } from './types';
import IllustratedCharacterPanel from './IllustratedCharacterPanel.vue';
import IllustratedDefaultDivinityPanel from './IllustratedDefaultDivinityPanel.vue';
import IllustratedHeader from './IllustratedHeader.vue';
import IllustratedItemCard from './IllustratedItemCard.vue';
import IllustratedOverviewPanel from './IllustratedOverviewPanel.vue';
import IllustratedPageTitle from './IllustratedPageTitle.vue';
import IllustratedProfilePanel from './IllustratedProfilePanel.vue';
import IllustratedTabNav from './IllustratedTabNav.vue';

const props = defineProps<{
  vm: CharacterViewModel;
  attributes: AttributeView[];
  importing: boolean;
  importButtonText: string;
  showImportMenu: boolean;
  readOnly: boolean;
  debugEnabled: boolean;
  forceMobileLayout: boolean;
  specialNpc: boolean;
}>();

defineEmits<{
  toggleAttributeFormula: [key: string];
  toggleImportMenu: [];
  importMvu: [];
  importWorldbook: [];
  fallbackToDefault: [];
}>();

type SkillGroupKey = 'active' | 'passive' | 'other';
type SkillGroup = { key: SkillGroupKey; title: string; icon: string; items: ItemObject[] };

function skillGroupKey(item: ItemObject): SkillGroupKey {
  const type = itemType(item).trim();
  if (type.includes('主动') || type.includes('主動')) return 'active';
  if (type.includes('被动') || type.includes('被動')) return 'passive';
  return 'other';
}

const groupedSkills = computed<SkillGroup[]>(() => {
  const groups: SkillGroup[] = [
    { key: 'active', title: '主动技能', icon: '◆', items: [] },
    { key: 'passive', title: '被动技能', icon: '◎', items: [] },
    { key: 'other', title: '其他技能', icon: '✦', items: [] },
  ];

  for (const skill of props.vm.skills) {
    const group = groups.find(candidate => candidate.key === skillGroupKey(skill));
    group?.items.push(skill);
  }

  return groups.filter(group => group.items.length > 0);
});

const collapsedGroupKeys = ref<string[]>([]);

function isGroupCollapsed(key: string): boolean {
  return collapsedGroupKeys.value.includes(key);
}

function toggleGroup(key: string): void {
  collapsedGroupKeys.value = isGroupCollapsed(key)
    ? collapsedGroupKeys.value.filter(candidate => candidate !== key)
    : [...collapsedGroupKeys.value, key];
}

watch(
  () => props.vm.nameText,
  () => {
    collapsedGroupKeys.value = [];
    activeProfileSubview.value = 'info';
  },
);

const activeSpecialTab = ref<IllustratedTabKey>('overview');
const activeProfileSubview = ref<'info' | 'story'>('info');
const shellElement = ref<HTMLElement | null>(null);
const panelsElement = ref<HTMLElement | null>(null);
const portraitImageElement = ref<HTMLImageElement | null>(null);
const portraitVideoElement = ref<HTMLVideoElement | null>(null);
const detailWallpaperCanvas = ref<HTMLCanvasElement | null>(null);
const detailWallpaperReady = ref(false);
const overviewDensity = ref<'normal' | 'compact' | 'dense'>('normal');
const overviewDensityClass = computed(() => `overview-density-${overviewDensity.value}`);
const isEntranceQuoteDialogOpen = ref(false);
const quoteDialogCloseButton = ref<HTMLButtonElement | null>(null);
let entranceQuoteTriggerElement: HTMLElement | null = null;
let overviewDensityFrame: number | undefined;
let overviewResizeObserver: ResizeObserver | undefined;
const portraitLoadFailed = ref(false);
const portraitLoaded = ref(false);
const portraitRetryAttempt = ref(0);
function resolveInitialPortraitIndex(): number {
  if (props.vm.randomizeInitialImage && props.vm.imageUrls.length > 1) {
    return Math.floor(Math.random() * props.vm.imageUrls.length);
  }
  return 0;
}

const activePortraitIndex = ref(resolveInitialPortraitIndex());
const activePortraitSourceIndex = ref(0);
const activePortraitSources = computed(
  () =>
    props.vm.imageSourceGroups[activePortraitIndex.value] ??
    [props.vm.imageUrls[activePortraitIndex.value] ?? props.vm.imageUrl].filter(Boolean),
);
const activePortraitUrl = computed(() => activePortraitSources.value[activePortraitSourceIndex.value] ?? '');
const portraitWarmUrls = computed(() => {
  const count = Math.max(props.vm.imageSourceGroups.length, props.vm.imageUrls.length);
  if (count === 0) return [];

  const indices = [activePortraitIndex.value];
  if (count > 1) {
    indices.push((activePortraitIndex.value - 1 + count) % count, (activePortraitIndex.value + 1) % count);
  }

  return indices
    .map(index => props.vm.imageSourceGroups[index]?.[0] ?? props.vm.imageUrls[index] ?? '')
    .filter((url, index, urls) => Boolean(url) && urls.indexOf(url) === index);
});

watch(
  portraitWarmUrls,
  urls => {
    void preloadPortraitImages(urls);
  },
  { immediate: true },
);

function debugPortraitFallback(event: string, details: Record<string, unknown> = {}): void {
  if (!props.debugEnabled) return;
  console.info('[CharInfo][ImageFallback][Viewer]', {
    event,
    character: props.vm.nameText,
    portraitIndex: activePortraitIndex.value,
    sourceIndex: activePortraitSourceIndex.value,
    url: activePortraitUrl.value,
    ...details,
  });
}

const hasMultiplePortraits = computed(() => props.vm.imageSourceGroups.length > 1 || props.vm.imageUrls.length > 1);
const isVideoPortrait = computed(() => normalizePortraitMediaUrlForBrowser(activePortraitUrl.value)?.kind === 'video');
const portraitMediaUrl = computed(() => {
  if (portraitRetryAttempt.value === 0) return activePortraitUrl.value;

  try {
    const url = new URL(activePortraitUrl.value, window.location.href);
    url.searchParams.set('_char_info_retry', String(portraitRetryAttempt.value));
    return url.href;
  } catch (_) {
    const separator = activePortraitUrl.value.includes('?') ? '&' : '?';
    return `${activePortraitUrl.value}${separator}_char_info_retry=${portraitRetryAttempt.value}`;
  }
});
const tabs = computed<IllustratedTab[]>(() => [
  { key: 'overview', label: '首页' },
  { key: 'characterPanel', label: '面板' },
  { key: 'profile', label: '档案' },
  { key: 'skills', label: '技能' },
  { key: 'holdings', label: '持有' },
  { key: 'divinity', label: '登神' },
]);
const hasCustomStorySections = computed(() => props.specialNpc && props.vm.storySections.length > 0);
const profileFallbackBackstoryText = computed(() =>
  props.specialNpc && !hasCustomStorySections.value ? props.vm.backstoryText : '',
);
watch(hasCustomStorySections, hasCustomStory => {
  if (!hasCustomStory) activeProfileSubview.value = 'info';
});
const isOverviewTab = computed(() => activeSpecialTab.value === 'overview');
const isDivinityTab = computed(() => activeSpecialTab.value === 'divinity');
const hideRedundantDetailTitle = computed(() => props.specialNpc && !isOverviewTab.value);
const activeSpecialTabTitle = computed(() => tabs.value.find(tab => tab.key === activeSpecialTab.value)?.label ?? '');

function captureDetailWallpaper(): void {
  const canvas = detailWallpaperCanvas.value;
  const shell = shellElement.value;
  const source = isVideoPortrait.value ? portraitVideoElement.value : portraitImageElement.value;
  if (!canvas || !shell || !source || !portraitLoaded.value || portraitLoadFailed.value) {
    detailWallpaperReady.value = false;
    return;
  }

  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!sourceWidth || !sourceHeight) {
    detailWallpaperReady.value = false;
    return;
  }

  const cssWidth = Math.max(1, shell.clientWidth);
  const cssHeight = Math.max(1, shell.clientHeight);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
  canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));

  const targetAspect = canvas.width / canvas.height;
  const sourceAspect = sourceWidth / sourceHeight;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceAspect > targetAspect) {
    sw = sourceHeight * targetAspect;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetAspect;
    sy = (sourceHeight - sh) / 2;
  }

  try {
    const context = canvas.getContext('2d');
    if (!context) {
      detailWallpaperReady.value = false;
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    detailWallpaperReady.value = true;
  } catch (_) {
    detailWallpaperReady.value = false;
  }
}

function setActiveSpecialTab(tab: IllustratedTabKey): void {
  if (tab === activeSpecialTab.value) return;
  if (activeSpecialTab.value === 'overview' && tab !== 'overview') captureDetailWallpaper();
  if (tab === 'profile') activeProfileSubview.value = 'info';
  activeSpecialTab.value = tab;
}

const portraitLoadTimeout = createMediaSourceTimeout(() => {
  debugPortraitFallback('timeout');
  advancePortraitSource('timeout');
});

function retryPortraitLoad(): void {
  portraitLoadFailed.value = false;
  portraitLoaded.value = false;
  const fromIndex = activePortraitSourceIndex.value;
  const nextIndex = nextMediaSourceIndex(fromIndex, activePortraitSources.value.length) ?? 0;
  activePortraitSourceIndex.value = nextIndex;
  portraitRetryAttempt.value += 1;
  debugPortraitFallback('retry', { fromIndex, toIndex: nextIndex });
}

function onPortraitLoaded(): void {
  portraitLoadTimeout.clear();
  portraitLoaded.value = true;
  portraitLoadFailed.value = false;
  debugPortraitFallback('loaded');
}

function advancePortraitSource(reason: 'error' | 'timeout'): void {
  portraitLoadTimeout.clear();
  portraitLoaded.value = false;
  const fromIndex = activePortraitSourceIndex.value;
  const nextIndex = nextMediaSourceIndex(fromIndex, activePortraitSources.value.length);
  if (nextIndex !== null) {
    activePortraitSourceIndex.value = nextIndex;
    portraitRetryAttempt.value = 0;
    debugPortraitFallback('fallback', { reason, fromIndex, toIndex: nextIndex });
    return;
  }
  portraitLoadFailed.value = true;
  debugPortraitFallback('all_failed', { reason, fromIndex });
}

function onPortraitLoadError(): void {
  debugPortraitFallback('error');
  advancePortraitSource('error');
}

watch(
  portraitMediaUrl,
  url => {
    portraitLoadTimeout.clear();
    if (url && !portraitLoadFailed.value) {
      debugPortraitFallback('try');
      portraitLoadTimeout.arm();
    }
  },
  { immediate: true },
);

function switchPortrait(offset: number): void {
  const count = props.vm.imageUrls.length;
  if (count < 2) return;

  activePortraitIndex.value = (activePortraitIndex.value + offset + count) % count;
  activePortraitSourceIndex.value = 0;
  portraitLoadFailed.value = false;
  portraitLoaded.value = false;
  portraitRetryAttempt.value = 0;
}

function openEntranceQuoteDialog(event?: Event): void {
  entranceQuoteTriggerElement =
    event?.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  isEntranceQuoteDialogOpen.value = true;
  void nextTick(() => quoteDialogCloseButton.value?.focus());
}

function closeEntranceQuoteDialog(): void {
  isEntranceQuoteDialogOpen.value = false;
  const trigger = entranceQuoteTriggerElement;
  entranceQuoteTriggerElement = null;
  void nextTick(() => trigger?.focus());
}

function keepEntranceQuoteDialogFocus(): void {
  quoteDialogCloseButton.value?.focus();
}

function updateOverviewDensity(): void {
  if (overviewDensityFrame !== undefined) {
    cancelAnimationFrame(overviewDensityFrame);
  }

  overviewDensityFrame = requestAnimationFrame(() => {
    overviewDensityFrame = undefined;
    if (!isOverviewTab.value || !panelsElement.value) {
      overviewDensity.value = 'normal';
      return;
    }

    overviewDensity.value = 'normal';
    void nextTick(() => {
      const panels = panelsElement.value;
      if (!isOverviewTab.value || !panels || panels.scrollHeight <= panels.clientHeight) return;

      overviewDensity.value = 'compact';
      void nextTick(() => {
        if (!isOverviewTab.value || !panelsElement.value) return;
        if (panelsElement.value.scrollHeight > panelsElement.value.clientHeight) {
          overviewDensity.value = 'dense';
        }
      });
    });
  });
}

onMounted(() => {
  overviewResizeObserver = new ResizeObserver(updateOverviewDensity);
  if (shellElement.value) overviewResizeObserver.observe(shellElement.value);
  updateOverviewDensity();
});

onBeforeUnmount(() => {
  if (overviewDensityFrame !== undefined) cancelAnimationFrame(overviewDensityFrame);
  overviewResizeObserver?.disconnect();
  portraitLoadTimeout.dispose();
});

watch(
  () => JSON.stringify(props.vm.imageSourceGroups),
  () => {
    activePortraitIndex.value = resolveInitialPortraitIndex();
    activePortraitSourceIndex.value = 0;
    portraitLoadFailed.value = false;
    portraitLoaded.value = false;
    portraitRetryAttempt.value = 0;
  },
);

watch(
  () => [
    isOverviewTab.value,
    props.vm.nameText,
    props.vm.raceText,
    props.vm.identityText,
    props.vm.classText,
    props.vm.entranceQuoteText,
    JSON.stringify(props.attributes),
    JSON.stringify(props.vm.resourceBoxes),
  ],
  updateOverviewDensity,
  { flush: 'post' },
);

watchEffect(() => {
  if (!tabs.value.some(tab => tab.key === activeSpecialTab.value)) {
    activeSpecialTab.value = 'overview';
  }
});
</script>

<style scoped>
.illustrated-wrapper {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  container-type: inline-size;
  color: #f8f9fa;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  --illustrated-bg: #14161e;
  --illustrated-panel: rgba(20, 22, 30, 0.78);
  --illustrated-race-accent: var(--race-color, #d4af37);
  --illustrated-race-accent-rgb: var(--race-color-rgb, 212, 175, 55);
  --illustrated-tier-accent: var(--tier-color, #d4af37);
  --illustrated-tier-accent-rgb: var(--tier-color-rgb, 212, 175, 55);
  --illustrated-overview-width: 540px;
  --illustrated-flag-width: 128px;
  --illustrated-flag-height: 156px;
  --illustrated-flag-gap: 12px;
  --illustrated-resource-width: 128px;
  --illustrated-resource-height: 72px;
  --illustrated-resource-gap: 16px;
  --illustrated-header-min-height: 148px;
  --illustrated-tabs-height: 52px;
}

.illustrated-shell {
  position: relative;
  display: flex;
  height: min(800px, 80cqw);
  min-height: 680px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: var(--illustrated-bg);
  box-shadow:
    0 0 0 1px rgba(var(--illustrated-tier-accent-rgb), 0.35),
    0 0 26px rgba(var(--illustrated-tier-accent-rgb), 0.32),
    0 0 54px rgba(var(--illustrated-tier-accent-rgb), 0.18),
    0 24px 64px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.illustrated-quote-dialog-backdrop {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  background: rgba(3, 6, 12, 0.72);
  backdrop-filter: blur(9px);
  -webkit-backdrop-filter: blur(9px);
}

.illustrated-quote-dialog-theme.illustrated-wrapper {
  width: min(100%, 560px);
  max-width: 560px;
  max-height: 100%;
  margin: 0;
  color: #f8f9fa;
  background: transparent;
  container-type: normal;
}

.illustrated-quote-dialog {
  display: flex;
  max-height: 100%;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  overflow: hidden;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.58);
  border-radius: 16px;
  background:
    radial-gradient(circle at 50% 0, rgba(var(--illustrated-tier-accent-rgb), 0.16), transparent 20rem),
    var(--illustrated-bg);
  box-shadow:
    0 0 0 1px rgba(var(--illustrated-race-accent-rgb), 0.2),
    0 24px 70px rgba(0, 0, 0, 0.58);
  text-align: center;
}

.illustrated-quote-dialog-kicker {
  color: var(--illustrated-tier-accent);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.illustrated-quote-dialog h2 {
  margin: 8px 0 0;
  color: inherit;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: clamp(23px, 4cqw, 30px);
}

.illustrated-quote-dialog-ornament {
  display: flex;
  width: min(46%, 180px);
  align-items: center;
  gap: 10px;
  margin: 18px 0;
}

.illustrated-quote-dialog-ornament::before,
.illustrated-quote-dialog-ornament::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--illustrated-tier-accent-rgb), 0.72));
}

.illustrated-quote-dialog-ornament::after {
  transform: rotate(180deg);
}

.illustrated-quote-dialog-ornament i {
  width: 7px;
  height: 7px;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.9);
  background: rgba(var(--illustrated-tier-accent-rgb), 0.18);
  transform: rotate(45deg);
}

.illustrated-quote-dialog-text {
  min-height: 0;
  margin: 0;
  padding: 0 6px;
  overflow-y: auto;
  color: inherit;
  font-family: 'LXGW WenKai Mono', 'Noto Serif SC', 'Songti SC', serif;
  font-size: clamp(16px, 3cqw, 19px);
  line-height: 1.8;
  overflow-wrap: anywhere;
  text-align: left;
  white-space: pre-wrap;
  scrollbar-width: thin;
}

.illustrated-quote-dialog-close {
  width: 100%;
  min-height: 46px;
  margin-top: 24px;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.66);
  border-radius: 9px;
  background: rgba(var(--illustrated-tier-accent-rgb), 0.14);
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  touch-action: manipulation;
}

.illustrated-quote-dialog-close:hover {
  background: rgba(var(--illustrated-tier-accent-rgb), 0.22);
}

.illustrated-quote-dialog-close:focus-visible {
  outline: 2px solid var(--illustrated-tier-accent);
  outline-offset: 3px;
}

.illustrated-portrait-pane {
  position: relative;
  flex: 0 0 45%;
  min-width: 0;
}

.illustrated-portrait-pane::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, transparent 60%, var(--illustrated-bg) 100%);
  pointer-events: none;
}

.illustrated-portrait-image {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  object-fit: cover;
  object-position: top center;
  transition: opacity 180ms ease-out;
}

.illustrated-portrait-video {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  object-fit: cover;
  object-position: top center;
  transition: opacity 180ms ease-out;
}

.illustrated-portrait-image.is-loaded,
.illustrated-portrait-video.is-loaded {
  opacity: 1;
}

.illustrated-portrait-loading {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-content: center;
  gap: 10px;
  color: rgba(var(--illustrated-soft-accent-rgb), 0.78);
  text-align: center;
  background:
    radial-gradient(circle at 42% 36%, rgba(var(--illustrated-race-accent-rgb), 0.18), transparent 34%),
    linear-gradient(145deg, rgba(22, 35, 49, 0.98), var(--illustrated-bg));
}

.illustrated-portrait-loading span {
  font-size: clamp(28px, 5cqw, 54px);
  text-shadow: 0 0 20px rgba(var(--illustrated-soft-accent-rgb), 0.38);
  animation: illustrated-portrait-pulse 1.2s ease-in-out infinite alternate;
}

.illustrated-portrait-loading small {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

@keyframes illustrated-portrait-pulse {
  from {
    opacity: 0.35;
    transform: scale(0.94);
  }
  to {
    opacity: 0.9;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .illustrated-portrait-loading span {
    animation: none;
  }

  .illustrated-portrait-image,
  .illustrated-portrait-video {
    transition: none;
  }
}

.illustrated-portrait-failure {
  position: relative;
  z-index: 5;
  display: grid;
  align-content: center;
  justify-items: center;
  width: 100%;
  height: 100%;
  min-height: 260px;
  padding: 28px;
  background:
    radial-gradient(circle at 50% 35%, rgba(var(--illustrated-tier-accent-rgb), 0.14), transparent 56%),
    var(--illustrated-bg);
  color: #f8f9fa;
  text-align: center;
}

.illustrated-portrait-failure strong {
  color: var(--illustrated-tier-accent);
  font-size: 20px;
}

.illustrated-portrait-failure p {
  max-width: 22em;
  margin: 10px 0 20px;
  color: rgba(248, 249, 250, 0.76);
  font-size: 14px;
  line-height: 1.6;
}

.illustrated-portrait-failure-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.illustrated-portrait-failure-actions button {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.72);
  border-radius: 6px;
  background: rgba(var(--illustrated-race-accent-rgb), 0.12);
  color: #f8f9fa;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.illustrated-portrait-failure-actions button:hover {
  border-color: var(--illustrated-tier-accent);
  background: rgba(var(--illustrated-tier-accent-rgb), 0.18);
}

.illustrated-portrait-navigation {
  position: absolute;
  top: 50%;
  right: 14px;
  left: 14px;
  z-index: 6;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
  transform: translateY(-50%);
}

.illustrated-portrait-navigation button {
  display: grid;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.6);
  border-radius: 50%;
  background: rgba(7, 11, 18, 0.56);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  font:
    400 30px/1 Georgia,
    serif;
  place-items: center;
  pointer-events: auto;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.illustrated-portrait-navigation button:hover,
.illustrated-portrait-navigation button:focus-visible {
  border-color: var(--illustrated-tier-accent);
  background: rgba(7, 11, 18, 0.78);
  outline: none;
  transform: scale(1.06);
}

.illustrated-mobile-overview-overlay,
.illustrated-mobile-header-overlay {
  display: none;
}

.illustrated-data-pane {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  padding: 56px 50px 34px;
  overflow: hidden;
}

.illustrated-panels::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.illustrated-panels {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 22px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.illustrated-shell.is-overview-tab .illustrated-panels {
  overflow-y: hidden;
  padding-bottom: 0;
}

.illustrated-shell.is-special-npc.is-overview-tab .illustrated-panels {
  overflow-y: auto;
}

@media (min-width: 901px) {
  .illustrated-shell.is-special-npc.is-overview-tab .illustrated-data-pane {
    padding-top: 72px;
  }

  .illustrated-shell.is-special-npc.is-overview-tab :deep(.illustrated-desktop-header) {
    width: calc(100% + 40px);
    margin-inline: -20px;
  }

  .illustrated-shell.is-special-npc.is-overview-tab :deep(.illustrated-desktop-header .illustrated-subtitle) {
    max-height: 1.5em;
    flex-wrap: nowrap;
    gap: 5px;
    font-size: clamp(11px, 2.8cqw, 13px);
    white-space: nowrap;
  }

  .illustrated-shell.is-special-npc.is-overview-tab :deep(.illustrated-desktop-header .illustrated-meta-item) {
    flex: 0 0 auto;
    gap: 5px;
  }

  .illustrated-shell.is-special-npc.is-overview-tab :deep(.illustrated-desktop-header .illustrated-meta-text) {
    overflow-wrap: normal;
  }

  .illustrated-shell.is-special-npc.is-overview-tab :deep(.illustrated-attribute-total) {
    display: inline-block;
    margin-top: 16px;
    transform: none;
  }

  .illustrated-shell.overview-density-compact .illustrated-data-pane {
    padding-top: 42px;
    padding-bottom: 26px;
  }

  .illustrated-shell.is-special-npc.is-overview-tab.overview-density-compact .illustrated-data-pane {
    padding-top: 64px;
  }

  .illustrated-shell.overview-density-dense .illustrated-data-pane {
    padding-top: 28px;
    padding-bottom: 18px;
  }

  .illustrated-shell.is-special-npc.is-overview-tab.overview-density-dense .illustrated-data-pane {
    padding-top: 56px;
  }
}

.illustrated-shell.is-divinity-tab .illustrated-panels {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 12px;
}

.illustrated-shell.is-divinity-tab .illustrated-portrait-pane,
.illustrated-shell.is-divinity-tab .illustrated-desktop-header {
  display: none;
}

.illustrated-shell.is-divinity-tab .illustrated-data-pane {
  flex: 1 1 100%;
  max-height: none;
  padding: 14px;
}

.illustrated-shell.is-divinity-tab :deep(.illustrated-page-title) {
  flex-shrink: 0;
  margin-bottom: 8px;
}

.illustrated-shell.is-divinity-tab :deep(.illustrated-divinity-stage) {
  flex: 1 1 auto;
  width: 100%;
  max-width: none;
  min-height: 620px;
  aspect-ratio: auto;
}

.illustrated-section + .illustrated-section {
  margin-top: 28px;
}

.illustrated-section-title {
  margin: 0 0 16px;
  color: var(--illustrated-race-accent);
  font-size: 18px;
  font-weight: 700;
}

.illustrated-skill-group + .illustrated-skill-group,
.illustrated-holding-section + .illustrated-holding-section {
  margin-top: 24px;
}

.illustrated-group-panel {
  overflow: hidden;
  margin-inline: 10px 14px;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.2);
  border-radius: 4px;
  background: rgba(5, 9, 14, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}

.illustrated-group-panel.is-collapsed {
  background: rgba(5, 9, 14, 0.12);
}

.illustrated-group-body {
  min-width: 0;
  padding: 2px 10px 8px;
}

.illustrated-detail-title-spacer {
  min-height: 38px;
  margin: 0 0 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.illustrated-group-title {
  margin: 0;
}

.illustrated-group-toggle {
  display: grid;
  grid-template-columns: 13px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-height: 38px;
  padding: 8px 14px 8px 10px;
  border: 0;
  border-bottom: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.18);
  background: linear-gradient(90deg, rgba(var(--illustrated-tier-accent-rgb), 0.08), rgba(5, 9, 14, 0.08));
  color: color-mix(in srgb, var(--illustrated-race-accent) 68%, #d7e0e5);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.35;
  text-align: left;
  text-shadow: none;
  cursor: pointer;
}

.illustrated-group-toggle:hover,
.illustrated-group-toggle:focus-visible {
  background: linear-gradient(90deg, rgba(var(--illustrated-tier-accent-rgb), 0.13), rgba(5, 9, 14, 0.1));
  outline: none;
}

.illustrated-group-panel.is-collapsed .illustrated-group-toggle {
  border-bottom-color: transparent;
}

.illustrated-group-icon {
  color: var(--illustrated-race-accent);
  font-size: 13px;
  text-align: center;
}

.illustrated-group-label {
  min-width: 0;
}

.illustrated-group-chevron {
  position: relative;
  width: 14px;
  height: 14px;
  justify-self: end;
  color: rgba(224, 233, 239, 0.72);
  transition: transform 0.16s ease;
  transform: rotate(0deg);
}

.illustrated-group-chevron::before,
.illustrated-group-chevron::after {
  content: '';
  position: absolute;
  top: 6px;
  width: 6px;
  height: 1.5px;
  border-radius: 999px;
  background: currentColor;
}

.illustrated-group-chevron::before {
  left: 1px;
  transform: rotate(42deg);
  transform-origin: right center;
}

.illustrated-group-chevron::after {
  right: 1px;
  transform: rotate(-42deg);
  transform-origin: left center;
}

.illustrated-group-panel.is-collapsed .illustrated-group-chevron {
  transform: rotate(-90deg);
}

.illustrated-shell.is-special-npc.is-detail-tab :deep(.illustrated-page-title) {
  justify-content: flex-start;
  margin: 0 0 13px;
  padding: 0 2px 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.illustrated-shell.is-special-npc.is-detail-tab :deep(.illustrated-page-title-line),
.illustrated-shell.is-special-npc.is-detail-tab :deep(.illustrated-page-title h2 span) {
  display: none;
}

.illustrated-shell.is-special-npc.is-detail-tab :deep(.illustrated-page-title h2) {
  font-size: 18px;
  letter-spacing: 0.04em;
  text-shadow: none;
  white-space: nowrap;
}

.illustrated-profile-subnav {
  display: grid;
  width: min(100%, 420px);
  margin: 0 auto 18px;
  padding: 4px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.22);
  border-radius: 999px;
  background: rgba(4, 8, 13, 0.38);
}

.illustrated-profile-subnav button {
  min-height: 40px;
  padding: 8px 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(226, 232, 240, 0.66);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.illustrated-profile-subnav button.active {
  background: rgba(var(--illustrated-race-accent-rgb), 0.14);
  color: var(--illustrated-race-accent);
  box-shadow: inset 0 0 0 1px rgba(var(--illustrated-race-accent-rgb), 0.22);
}

.illustrated-profile-subnav button:focus-visible {
  outline: 2px solid var(--illustrated-tier-accent);
  outline-offset: 2px;
}

.illustrated-profile-story-view {
  display: grid;
  width: min(100%, 760px);
  margin: 0 auto;
  gap: 18px;
}

.illustrated-profile-story-author {
  margin: -2px 4px 0;
  color: rgba(226, 232, 240, 0.52);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-align: right;
}

.illustrated-profile-story-section {
  padding: 24px 28px;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.16);
  border-radius: 6px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 46%),
    rgba(5, 9, 14, 0.34);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}

.illustrated-profile-story-section h3 {
  margin: 0 0 13px;
  color: var(--illustrated-race-accent);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.illustrated-profile-story-section p {
  margin: 0;
  color: #d7dce3;
  font-size: 14px;
  line-height: 1.9;
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.illustrated-story-combined-block {
  display: grid;
  gap: 18px;
}

.illustrated-story-block {
  padding: 28px 36px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: radial-gradient(ellipse at center, rgba(30, 34, 42, 0.4) 0%, rgba(10, 12, 16, 0.8) 100%);
}

.illustrated-story-block h3 {
  margin: 0 0 16px;
  color: var(--illustrated-tier-accent);
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  text-shadow: 0 0 12px rgba(var(--illustrated-tier-accent-rgb), 0.26);
}

.illustrated-story-block p {
  margin: 0;
  color: #e2e8f0;
  line-height: 1.8;
  white-space: pre-line;
}

.illustrated-story-link-block {
  display: grid;
  gap: 22px;
  justify-items: center;
  width: min(100%, 520px);
  margin: 0 auto;
  padding: 38px 40px;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.28);
  background:
    radial-gradient(ellipse at 50% 0%, rgba(var(--illustrated-tier-accent-rgb), 0.14), transparent 64%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.012));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  text-align: center;
}

.illustrated-story-link-copy {
  display: grid;
  gap: 10px;
}

.illustrated-story-kicker {
  color: var(--illustrated-race-accent);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.illustrated-story-link-copy h3 {
  margin: 0;
  color: #fff8da;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 28px;
  font-weight: 700;
  text-shadow: 0 0 14px rgba(var(--illustrated-tier-accent-rgb), 0.36);
}

.illustrated-story-link-copy p {
  margin: 0;
  color: #d9e5f2;
  line-height: 1.75;
}

.illustrated-story-link-button {
  min-width: 150px;
  padding: 10px 22px;
  border: 1px solid rgba(var(--illustrated-tier-accent-rgb), 0.6);
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    rgba(var(--illustrated-tier-accent-rgb), 0.2),
    rgba(var(--illustrated-tier-accent-rgb), 0.08)
  );
  color: #fff6d5;
  cursor: pointer;
  font-weight: 700;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.illustrated-story-link-button:hover {
  border-color: rgba(var(--illustrated-tier-accent-rgb), 0.9);
  box-shadow: 0 0 18px rgba(var(--illustrated-tier-accent-rgb), 0.24);
  transform: translateY(-1px);
}

.import-action-menu {
  position: absolute;
  right: 14px;
  bottom: 62px;
  z-index: 21;
  display: none;
  min-width: 190px;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  background: rgba(20, 20, 20, 0.92);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.import-action-menu.show {
  display: block;
}

.import-action-menu button {
  width: 100%;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #eee;
  cursor: pointer;
  font-size: 0.95rem;
  text-align: left;
}

.import-action-menu button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.import-action-menu button:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.illustrated-mobile-detail-wallpaper {
  display: none;
}

@media (min-width: 901px) {
  .illustrated-wrapper.is-special-npc .illustrated-shell.is-overview-tab .illustrated-panels {
    overflow-y: auto;
  }
}

@media (max-width: 900px) {
  .illustrated-wrapper {
    max-width: min(100%, 480px);
  }

  .illustrated-wrapper.is-special-npc {
    max-width: min(100%, 414px);
  }

  .illustrated-shell {
    flex-direction: column;
    height: 216.4251cqw;
    min-height: 0;
  }

  .illustrated-shell.is-special-npc {
    height: auto;
    aspect-ratio: 2 / 3;
  }

  .illustrated-portrait-pane {
    flex: 1 1 auto;
    min-height: 0;
  }

  .illustrated-shell.is-detail-tab .illustrated-portrait-pane {
    display: none;
  }

  .illustrated-mobile-detail-wallpaper {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0;
    pointer-events: none;
    filter: saturate(0.82) brightness(0.72);
    transition: opacity 0.18s ease;
  }

  .illustrated-mobile-detail-wallpaper.is-visible {
    opacity: 0.34;
  }

  .illustrated-portrait-pane::after {
    background: linear-gradient(to bottom, transparent 65%, var(--illustrated-bg) 100%);
  }

  .illustrated-data-pane {
    flex: 1;
    max-height: none;
    min-height: 0;
    padding: 18px 24px 20px;
    overflow: hidden;
  }

  .illustrated-shell.is-overview-tab .illustrated-data-pane {
    flex: 0 0 auto;
    padding: 0 18px 8px;
    overflow: visible;
  }

  .illustrated-shell.is-special-npc.is-overview-tab .illustrated-data-pane {
    display: none;
  }

  .illustrated-shell.is-detail-tab .illustrated-data-pane {
    padding: 18px 24px 14px;
    background: color-mix(in srgb, var(--illustrated-bg) 58%, transparent);
    backdrop-filter: blur(1.5px);
    -webkit-backdrop-filter: blur(1.5px);
  }

  .illustrated-shell.is-special-npc.is-skills-tab .illustrated-data-pane {
    background: color-mix(in srgb, var(--illustrated-bg) 66%, transparent);
  }

  .illustrated-desktop-header {
    display: none;
  }

  .illustrated-mobile-overview-overlay {
    position: absolute;
    right: 18px;
    bottom: 22px;
    left: 18px;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .illustrated-shell.is-special-npc.is-overview-tab .illustrated-portrait-pane::after {
    background: linear-gradient(
      180deg,
      transparent 42%,
      rgba(8, 10, 14, 0.14) 56%,
      rgba(8, 10, 14, 0.76) 80%,
      var(--illustrated-bg) 100%
    );
  }

  .illustrated-shell.is-special-npc.is-overview-tab .illustrated-mobile-overview-overlay {
    right: 17px;
    bottom: 12px;
    left: 17px;
    gap: 6px;
  }

  .illustrated-mobile-entrance-quote {
    position: relative;
    appearance: none;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 38px;
    margin: 0 8px;
    padding: 7px 12px;
    border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.48);
    border-radius: 6px;
    background: rgba(8, 12, 18, 0.58);
    box-shadow: 0 5px 16px rgba(0, 0, 0, 0.2);
    color: rgba(255, 255, 255, 0.96);
    cursor: pointer;
    font-family: 'LXGW WenKai Mono', 'Noto Serif SC', 'Songti SC', serif;
    font-size: clamp(12px, 3.4cqw, 14px);
    font-style: normal;
    font-weight: 400;
    letter-spacing: 0.04em;
    line-height: 1.4;
    text-align: center;
    touch-action: manipulation;
  }

  .illustrated-shell.is-special-npc.is-overview-tab .illustrated-mobile-entrance-quote {
    min-height: 0;
    margin: 0 4px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    font-size: 11px;
    line-height: 1.5;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.95);
  }

  .illustrated-mobile-entrance-quote:focus-visible {
    outline: 2px solid var(--illustrated-tier-accent);
    outline-offset: 3px;
  }

  .illustrated-mobile-entrance-quote .illustrated-quote-expand-cue {
    position: absolute;
    right: 5px;
    bottom: 3px;
    color: rgba(var(--illustrated-tier-accent-rgb), 0.76);
    font: 10px/1 sans-serif;
  }

  .illustrated-mobile-quote-mark {
    flex: 0 0 auto;
    color: rgba(var(--illustrated-race-accent-rgb), 0.92);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 18px;
    line-height: 1;
  }

  .illustrated-mobile-quote-text {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    white-space: pre-line;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .illustrated-mobile-header-overlay {
    display: block;
    padding: 10px 12px;
    border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.62);
    border-radius: 8px;
    background: rgba(12, 14, 20, 0.66);
    box-shadow:
      0 10px 32px rgba(0, 0, 0, 0.42),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
  }

  .illustrated-shell.is-special-npc.is-overview-tab .illustrated-mobile-header-overlay {
    padding: 0 2px;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-mobile-header-overlay
    :deep(.illustrated-header.compact) {
    gap: 4px;
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-mobile-header-overlay
    :deep(.illustrated-name:not(.illustrated-name-measure)) {
    order: 1;
    margin: 0 !important;
    font-size: clamp(24px, 8cqw, 28px);
    line-height: 1.12;
    text-shadow: 0 3px 16px rgba(0, 0, 0, 0.94);
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-mobile-header-overlay
    :deep(.illustrated-subtitle),
  .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-mobile-header-overlay
    :deep(.illustrated-level-tier) {
    display: none;
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-mobile-header-overlay
    :deep(.illustrated-subtitle) {
    order: 2;
    gap: 5px;
    font-size: 10px;
    line-height: 1.35;
    text-shadow: 0 2px 7px rgba(0, 0, 0, 0.95);
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-mobile-header-overlay
    :deep(.illustrated-level-tier) {
    order: 3;
    margin: 2px 0 0;
    padding: 2px 0;
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-mobile-header-overlay
    :deep(.illustrated-level),
  .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-mobile-header-overlay
    :deep(.illustrated-tier) {
    font-size: 10px;
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    .illustrated-mobile-header-overlay
    :deep(.illustrated-badge-separator) {
    margin: 0 10px;
  }

  .illustrated-shell.is-overview-tab .illustrated-panels {
    display: none;
  }

  .illustrated-panels {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 18px;
    scrollbar-width: none;
  }

  .illustrated-shell.is-divinity-tab .illustrated-panels {
    overflow: hidden;
    padding-bottom: 14px;
  }

  .illustrated-shell.is-divinity-tab .illustrated-data-pane {
    padding: 12px;
  }

  .illustrated-shell.is-divinity-tab :deep(.illustrated-page-title) {
    margin-bottom: 8px;
  }

  .illustrated-shell.is-divinity-tab :deep(.illustrated-divinity-stage) {
    min-height: 0;
    height: 100%;
  }

  .illustrated-panels::-webkit-scrollbar {
    display: none;
  }

  .illustrated-profile-subnav {
    width: 100%;
    margin-bottom: 12px;
  }

  .illustrated-profile-subnav button {
    min-height: 42px;
    padding: 8px 12px;
    font-size: 12px;
  }

  .illustrated-profile-story-view {
    width: 100%;
    gap: 12px;
  }

  .illustrated-profile-story-author {
    margin-right: 2px;
    font-size: 10px;
  }

  .illustrated-profile-story-section {
    padding: 15px 14px;
    border-radius: 4px;
    background: rgba(7, 10, 15, 0.46);
  }

  .illustrated-profile-story-section h3 {
    margin-bottom: 9px;
    font-size: 14px;
  }

  .illustrated-profile-story-section p {
    font-size: 12px;
    line-height: 1.78;
  }

  .illustrated-panels > :deep(.illustrated-overview) {
    display: none;
  }

  .illustrated-shell :deep(.illustrated-tab-scroll) {
    padding-right: 12px;
  }

}

@media (max-width: 900px) {
  .illustrated-quote-dialog-backdrop {
    align-items: flex-end;
    padding: 12px;
  }

  .illustrated-quote-dialog-theme.illustrated-wrapper {
    width: 100%;
  }

  .illustrated-quote-dialog {
    padding: 24px 20px 18px;
    border-radius: 16px 16px 12px 12px;
  }

  .illustrated-quote-dialog-text {
    font-size: 16px;
    line-height: 1.72;
  }

  .illustrated-quote-dialog-close {
    margin-top: 20px;
  }
}

@media (max-width: 640px) {
  .illustrated-shell {
    border-radius: 12px;
  }

  .illustrated-data-pane {
    padding: 22px 16px 18px;
  }

  .illustrated-shell.is-overview-tab .illustrated-data-pane {
    padding: 0 14px 8px;
  }

  .illustrated-shell.is-detail-tab .illustrated-data-pane {
    padding: 16px 14px 12px;
  }

  .illustrated-shell.is-special-npc.is-detail-tab .illustrated-data-pane {
    padding: 9px 13px 0;
  }

  .illustrated-shell.is-special-npc.is-detail-tab :deep(.illustrated-page-title) {
    min-height: 36px;
    margin: 0 0 5px;
    padding-bottom: 7px;
  }

  .illustrated-shell.is-special-npc.is-detail-tab :deep(.illustrated-page-title h2) {
    font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-shadow: none;
  }

  .illustrated-detail-title-spacer {
    min-height: 36px;
    margin: 0 0 5px;
  }

  .illustrated-skill-group + .illustrated-skill-group,
  .illustrated-holding-section + .illustrated-holding-section {
    margin-top: 17px;
  }

  .illustrated-group-panel {
    margin-inline: 6px;
    border-color: rgba(var(--illustrated-tier-accent-rgb), 0.24);
    background: rgba(3, 7, 11, 0.18);
  }

  .illustrated-group-body {
    padding: 2px 6px 6px;
  }

  .illustrated-group-toggle {
    grid-template-columns: 13px minmax(0, 1fr) 18px;
    gap: 7px;
    min-height: 34px;
    padding: 7px 12px 7px 28px;
    font-size: 12px;
    letter-spacing: 0.07em;
  }

  .illustrated-group-chevron {
    width: 13px;
    height: 13px;
  }

  .illustrated-mobile-overview-overlay {
    right: 14px;
    bottom: 18px;
    left: 14px;
  }

  .illustrated-mobile-header-overlay {
    padding: 9px 10px;
  }

  .import-action-menu {
    right: 10px;
    bottom: 64px;
    min-width: 170px;
  }
}

.illustrated-wrapper.force-mobile-layout {
  max-width: min(100%, 640px);
}

.illustrated-wrapper.force-mobile-layout.is-special-npc {
  max-width: min(100%, 640px);
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell {
  flex-direction: column;
  min-height: 0;
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell.is-special-npc {
  height: auto;
  min-height: 0;
  aspect-ratio: 2 / 3;
}

.illustrated-wrapper.force-mobile-layout .illustrated-portrait-pane {
  flex: 1 1 auto;
  min-height: 0;
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell.is-detail-tab .illustrated-portrait-pane {
  display: none;
}

.illustrated-wrapper.force-mobile-layout .illustrated-mobile-detail-wallpaper {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
  filter: saturate(0.82) brightness(0.72);
  transition: opacity 0.18s ease;
}

.illustrated-wrapper.force-mobile-layout .illustrated-mobile-detail-wallpaper.is-visible {
  opacity: 0.34;
}

.illustrated-wrapper.force-mobile-layout .illustrated-portrait-pane::after {
  background: linear-gradient(to bottom, transparent 65%, var(--illustrated-bg) 100%);
}

.illustrated-wrapper.force-mobile-layout .illustrated-data-pane {
  flex: 1;
  max-height: none;
  min-height: 0;
  padding: 18px 24px 20px;
  overflow: hidden;
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell.is-overview-tab .illustrated-data-pane {
  flex: 0 0 auto;
  padding: 0 18px 8px;
  overflow: visible;
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell.is-special-npc.is-overview-tab .illustrated-data-pane {
  display: none;
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell.is-detail-tab .illustrated-data-pane {
  padding: 18px 24px 14px;
  background: color-mix(in srgb, var(--illustrated-bg) 58%, transparent);
  backdrop-filter: blur(1.5px);
  -webkit-backdrop-filter: blur(1.5px);
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell.is-special-npc.is-skills-tab .illustrated-data-pane {
  background: color-mix(in srgb, var(--illustrated-bg) 66%, transparent);
}

.illustrated-wrapper.force-mobile-layout .illustrated-desktop-header {
  display: none;
}

.illustrated-wrapper.force-mobile-layout .illustrated-mobile-overview-overlay {
  position: absolute;
  right: 18px;
  bottom: 22px;
  left: 18px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell.is-special-npc.is-overview-tab .illustrated-portrait-pane::after {
  background: linear-gradient(
    180deg,
    transparent 42%,
    rgba(8, 10, 14, 0.14) 56%,
    rgba(8, 10, 14, 0.76) 80%,
    var(--illustrated-bg) 100%
  );
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell.is-special-npc.is-overview-tab .illustrated-mobile-overview-overlay {
  right: 17px;
  bottom: 12px;
  left: 17px;
  gap: 6px;
}

.illustrated-wrapper.force-mobile-layout .illustrated-mobile-entrance-quote {
  position: relative;
  appearance: none;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  margin: 0 8px;
  padding: 7px 12px;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.48);
  border-radius: 6px;
  background: rgba(8, 12, 18, 0.58);
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.96);
  cursor: pointer;
  font-family: 'LXGW WenKai Mono', 'Noto Serif SC', 'Songti SC', serif;
  font-size: clamp(12px, 3.4cqw, 14px);
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0.04em;
  line-height: 1.4;
  text-align: center;
  touch-action: manipulation;
}

.illustrated-wrapper.force-mobile-layout
  .illustrated-shell.is-special-npc.is-overview-tab
  .illustrated-mobile-entrance-quote {
  min-height: 0;
  margin: 0 4px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  font-size: 11px;
  line-height: 1.5;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.95);
}

.illustrated-wrapper.force-mobile-layout .illustrated-mobile-quote-mark {
  flex: 0 0 auto;
  color: rgba(var(--illustrated-race-accent-rgb), 0.92);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 18px;
  line-height: 1;
}

.illustrated-wrapper.force-mobile-layout .illustrated-mobile-quote-text {
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: pre-line;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.illustrated-wrapper.force-mobile-layout .illustrated-mobile-header-overlay {
  display: block;
  padding: 10px 12px;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.62);
  border-radius: 8px;
  background: rgba(12, 14, 20, 0.66);
  box-shadow:
    0 10px 32px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.illustrated-wrapper.force-mobile-layout
  .illustrated-shell.is-special-npc.is-overview-tab
  .illustrated-mobile-header-overlay {
  padding: 0 2px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.illustrated-wrapper.force-mobile-layout
  .illustrated-shell.is-special-npc.is-overview-tab
  .illustrated-mobile-header-overlay
  :deep(.illustrated-name:not(.illustrated-name-measure)) {
  order: 1;
  margin: 0 !important;
  font-size: clamp(24px, 8cqw, 28px);
  line-height: 1.12;
  text-shadow: 0 3px 16px rgba(0, 0, 0, 0.94);
}

.illustrated-wrapper.force-mobile-layout
  .illustrated-shell.is-special-npc.is-overview-tab
  .illustrated-mobile-header-overlay
  :deep(.illustrated-subtitle),
.illustrated-wrapper.force-mobile-layout
  .illustrated-shell.is-special-npc.is-overview-tab
  .illustrated-mobile-header-overlay
  :deep(.illustrated-level-tier) {
  display: none;
}

.illustrated-wrapper.force-mobile-layout .illustrated-shell.is-overview-tab .illustrated-panels {
  display: none;
}

.illustrated-wrapper.force-mobile-layout .illustrated-panels {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 18px;
  scrollbar-width: none;
}

.illustrated-wrapper.force-mobile-layout .illustrated-panels::-webkit-scrollbar {
  display: none;
}

.illustrated-wrapper.force-mobile-layout .illustrated-panels > :deep(.illustrated-overview) {
  display: none;
}
</style>
