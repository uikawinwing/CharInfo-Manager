<template>
  <div class="illustrated-wrapper" :class="themeClass" :style="themeStyle">
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
        },
        isOverviewTab ? overviewDensityClass : null,
      ]"
    >
      <aside class="illustrated-portrait-pane">
        <div v-if="!portraitLoaded && !portraitLoadFailed" class="illustrated-portrait-loading" role="status">
          <span aria-hidden="true">◇</span>
          <small>立绘载入中</small>
        </div>
        <video
          v-if="isVideoPortrait && !portraitLoadFailed"
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
        <div v-if="isVenusTheme" class="illustrated-portrait-deco" aria-hidden="true">
          <span class="illustrated-portrait-deco-corner top-left"></span>
          <span class="illustrated-portrait-deco-corner top-right"></span>
          <span class="illustrated-portrait-deco-corner bottom-left"></span>
          <span class="illustrated-portrait-deco-corner bottom-right"></span>
        </div>
        <div v-if="isIrisTheme" class="illustrated-iris-portrait-deco" aria-hidden="true">
          <span class="illustrated-iris-bubble bubble-one"></span>
          <span class="illustrated-iris-bubble bubble-two"></span>
          <span class="illustrated-iris-bubble bubble-three"></span>
          <span class="illustrated-iris-bubble bubble-four"></span>
          <span class="illustrated-iris-toy-node node-one"></span>
          <span class="illustrated-iris-toy-node node-two"></span>
        </div>
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
            <IllustratedHeader :vm="vm" :ornate="hasOrnateHeader" compact />
          </div>
        </div>
      </aside>

      <section class="illustrated-data-pane">
        <div v-if="isIrisTheme && isOverviewTab" class="illustrated-iris-header-deco" aria-hidden="true">
          <span class="illustrated-iris-jellyfish">
            <i class="jellyfish-dome"></i>
            <i class="jellyfish-tentacle tentacle-one"></i>
            <i class="jellyfish-tentacle tentacle-two"></i>
            <i class="jellyfish-tentacle tentacle-three"></i>
          </span>
          <span class="illustrated-iris-toy-blocks"><i></i><i></i><i></i><i></i></span>
        </div>
        <IllustratedHeader
          v-if="isOverviewTab"
          :class="['illustrated-desktop-header', overviewDensityClass]"
          :vm="vm"
          :ornate="hasOrnateHeader"
          @layout-change="updateOverviewDensity"
        />

        <div ref="panelsElement" class="illustrated-panels">
          <IllustratedPageTitle v-if="!isOverviewTab" :title="activeSpecialTabTitle" />

          <IllustratedOverviewPanel
            v-if="activeSpecialTab === 'overview'"
            :class="overviewDensityClass"
            :attributes="attributes"
            :resource-boxes="vm.resourceBoxes"
            :entrance-quote-text="vm.entranceQuoteText"
            @toggle-attribute-formula="$emit('toggleAttributeFormula', $event)"
            @open-entrance-quote="openEntranceQuoteDialog"
          />

          <IllustratedProfilePanel
            v-else-if="activeSpecialTab === 'profile'"
            :vm="vm"
            :attributes="attributes"
            :resource-boxes="vm.resourceBoxes"
            @toggle-attribute-formula="$emit('toggleAttributeFormula', $event)"
          />

          <template v-else-if="activeSpecialTab === 'skills'">
            <IllustratedItemCard v-for="(item, index) in vm.skills" :key="`skill-${index}`" :item="item" show-cost />
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

          <IllustratedDivinityPanel
            v-else-if="activeSpecialTab === 'divinity'"
            :vm="vm"
            :profile="vm.presentationProfile"
          />

          <template v-else-if="activeSpecialTab === 'statusEffects'">
            <IllustratedItemCard
              v-for="(item, index) in vm.statusEffects"
              :key="`status-${index}`"
              :item="item"
              variant="status"
            />
          </template>

          <article v-else-if="activeSpecialTab === 'characterStory'" class="illustrated-story-combined-block">
            <section v-if="vm.backstoryText" class="illustrated-story-block">
              <h3>背景故事</h3>
              <p>{{ vm.backstoryText }}</p>
            </section>

            <section v-if="vm.storyBookLink" class="illustrated-story-link-block">
              <div class="illustrated-story-link-copy">
                <span v-if="vm.storyBookLink.festivalName" class="illustrated-story-kicker">
                  {{ vm.storyBookLink.festivalName }}
                </span>
                <h3>《{{ vm.storyBookLink.title }}》</h3>
                <p>打开月历悬浮球里的节庆故事读本，阅读与她相关的角色故事。</p>
              </div>
              <button class="illustrated-story-link-button" type="button" @click="openCharacterStory">前往读本</button>
            </section>
          </article>

          <article v-else class="illustrated-story-block">
            <p>{{ vm.backstoryText || '暂无故事' }}</p>
          </article>
        </div>

        <IllustratedTabNav
          :tabs="tabs"
          :active-tab="activeSpecialTab"
          :importing="importing"
          :import-button-text="importButtonText"
          :show-import-action="!readOnly"
          @set-tab="activeSpecialTab = $event"
          @toggle-import-menu="$emit('toggleImportMenu')"
        />
      </section>

      <div v-if="!readOnly" class="import-action-menu" :class="{ show: showImportMenu }">
        <button type="button" :disabled="importing" @click="$emit('importMvu')">导入到角色状态</button>
        <button type="button" :disabled="importing" @click="$emit('importWorldbook')">导入到聊天世界书</button>
      </div>
    </main>

    <div
      v-if="isEntranceQuoteDialogOpen"
      class="illustrated-quote-dialog-backdrop"
      @click.self="closeEntranceQuoteDialog"
    >
      <div class="illustrated-wrapper illustrated-quote-dialog-theme" :class="themeClass" :style="themeStyle">
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

import type { CharacterViewModel } from '../../services/characterViewModel';
import { normalizePortraitMediaUrlForBrowser } from '../../services/imageUrl';
import type { AttributeView, IllustratedTab, IllustratedTabKey } from './types';
import IllustratedDivinityPanel from './IllustratedDivinityPanel.vue';
import IllustratedHeader from './IllustratedHeader.vue';
import IllustratedItemCard from './IllustratedItemCard.vue';
import IllustratedOverviewPanel from './IllustratedOverviewPanel.vue';
import IllustratedPageTitle from './IllustratedPageTitle.vue';
import IllustratedProfilePanel from './IllustratedProfilePanel.vue';
import IllustratedTabNav from './IllustratedTabNav.vue';
import { anastasiaPortraitCssVars } from './anastasiaAssets';
import { venusPortraitCssVars } from './venusAssets';

const props = defineProps<{
  vm: CharacterViewModel;
  attributes: AttributeView[];
  importing: boolean;
  importButtonText: string;
  showImportMenu: boolean;
  readOnly: boolean;
}>();

defineEmits<{
  toggleAttributeFormula: [key: string];
  toggleImportMenu: [];
  importMvu: [];
  importWorldbook: [];
  fallbackToDefault: [];
}>();

const activeSpecialTab = ref<IllustratedTabKey>('overview');
const shellElement = ref<HTMLElement | null>(null);
const panelsElement = ref<HTMLElement | null>(null);
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
const tabs = computed<IllustratedTab[]>(() => {
  const mergedTabs: IllustratedTab[] = [{ key: 'overview', label: '首页' }];
  let hasStoryTab = false;

  props.vm.visibleTabs.forEach(tab => {
    if (tab.key === 'characterStory' || tab.key === 'backstory') {
      if (!hasStoryTab) {
        mergedTabs.push({ key: 'characterStory', label: '角色故事' });
        hasStoryTab = true;
      }
      return;
    }

    mergedTabs.push(tab);
  });

  return mergedTabs;
});
const isOverviewTab = computed(() => activeSpecialTab.value === 'overview');
const isDivinityTab = computed(() => activeSpecialTab.value === 'divinity');
const activeSpecialTabTitle = computed(() => tabs.value.find(tab => tab.key === activeSpecialTab.value)?.label ?? '');
const isVenusTheme = computed(() => props.vm.presentationProfile?.visualTheme === 'venus');
const isAnastasiaTheme = computed(() => props.vm.presentationProfile?.visualTheme === 'anastasia');
const isIrisTheme = computed(() => props.vm.presentationProfile?.visualTheme === 'iris');
const hasOrnateHeader = computed(() => isVenusTheme.value || isAnastasiaTheme.value);
const themeClass = computed(() => ({
  'illustrated-theme-venus': isVenusTheme.value,
  'illustrated-theme-anastasia': isAnastasiaTheme.value,
  'illustrated-theme-iris': isIrisTheme.value,
}));
const themeStyle = computed(() => {
  if (isVenusTheme.value) return venusPortraitCssVars;
  if (isAnastasiaTheme.value) return anastasiaPortraitCssVars;
  return undefined;
});

type CalendarFloatWidgetApi = {
  open?: () => void;
  openBook?: (bookId: string) => boolean | void;
};

type CalendarWidgetWindow = Window &
  typeof globalThis & {
    CalendarFloatWidget?: CalendarFloatWidgetApi;
  };

function getCalendarFloatWidget(): CalendarFloatWidgetApi | null {
  const candidates = [window.parent, window].filter(
    (candidate, index, list) => candidate && list.indexOf(candidate) === index,
  );
  for (const candidate of candidates) {
    try {
      const widget = (candidate as CalendarWidgetWindow).CalendarFloatWidget;
      if (widget) return widget;
    } catch (_) {
      // parent window may be inaccessible in some host contexts.
    }
  }
  return null;
}

function showCharacterStoryWarning(message: string): void {
  if (typeof toastr !== 'undefined') {
    toastr.warning(message);
    return;
  }
  console.warn(message);
}

function openCharacterStory(): void {
  const storyBookLink = props.vm.storyBookLink;
  if (!storyBookLink) return;

  const widget = getCalendarFloatWidget();
  if (!widget) {
    showCharacterStoryWarning('未检测到月历功能，请先启用月历。');
    return;
  }

  if (typeof widget.openBook === 'function') {
    const opened = widget.openBook(storyBookLink.bookId);
    if (opened === false) {
      showCharacterStoryWarning(`月历悬浮球未找到《${storyBookLink.title}》，请确认读本已加载。`);
    }
    return;
  }

  widget.open?.();
  showCharacterStoryWarning('当前月历不支持打开该读本，请更新月历功能后重试。');
}

function retryPortraitLoad(): void {
  portraitLoadFailed.value = false;
  portraitLoaded.value = false;
  activePortraitSourceIndex.value = 0;
  portraitRetryAttempt.value += 1;
}

function onPortraitLoaded(): void {
  portraitLoaded.value = true;
  portraitLoadFailed.value = false;
}

function onPortraitLoadError(): void {
  portraitLoaded.value = false;
  if (activePortraitSourceIndex.value < activePortraitSources.value.length - 1) {
    activePortraitSourceIndex.value += 1;
    portraitRetryAttempt.value = 0;
    return;
  }
  portraitLoadFailed.value = true;
}

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
  --illustrated-overview-width: 520px;
  --illustrated-flag-width: 128px;
  --illustrated-flag-height: 128px;
  --illustrated-flag-gap: 12px;
  --illustrated-resource-width: 128px;
  --illustrated-resource-height: 72px;
  --illustrated-resource-gap: 16px;
  --illustrated-header-min-height: 148px;
  --illustrated-tabs-height: 52px;
}

.illustrated-wrapper.illustrated-theme-venus {
  --illustrated-bg: #061731;
  --illustrated-panel: rgba(7, 21, 45, 0.72);
  --illustrated-race-accent: #70e5bd;
  --illustrated-race-accent-rgb: 112, 229, 189;
  --illustrated-tier-accent: #f6d982;
  --illustrated-tier-accent-rgb: 246, 217, 130;
  --illustrated-soft-accent: #b9d7e8;
  --illustrated-soft-accent-rgb: 185, 215, 232;
  --illustrated-shell-deep: #051226;
}

.illustrated-wrapper.illustrated-theme-anastasia {
  color-scheme: light;
  isolation: isolate;
  color: #14304b;
  background-color: #e6edf1;
  --illustrated-bg: #e6edf1;
  --illustrated-panel: rgba(248, 251, 252, 0.88);
  --illustrated-race-accent: #0a2d4e;
  --illustrated-race-accent-rgb: 10, 45, 78;
  --illustrated-tier-accent: #d0a653;
  --illustrated-tier-accent-rgb: 208, 166, 83;
  --illustrated-soft-accent: #5f8fa8;
  --illustrated-soft-accent-rgb: 95, 143, 168;
}

.illustrated-wrapper.illustrated-theme-iris {
  color-scheme: light;
  isolation: isolate;
  color: #17324a;
  background-color: #dce9e7;
  --illustrated-bg: #dce9e7;
  --illustrated-panel: rgba(247, 251, 250, 0.94);
  --illustrated-race-accent: #42a996;
  --illustrated-race-accent-rgb: 66, 169, 150;
  --illustrated-tier-accent: #a98ce8;
  --illustrated-tier-accent-rgb: 169, 140, 232;
  --illustrated-soft-accent: #f078a6;
  --illustrated-soft-accent-rgb: 240, 120, 166;
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

.illustrated-quote-dialog-theme.illustrated-theme-anastasia,
.illustrated-quote-dialog-theme.illustrated-theme-iris {
  color: #17324a;
  background: transparent;
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

.illustrated-theme-venus .illustrated-shell {
  border: 1px solid transparent;
  background:
    radial-gradient(circle at 52% -10%, rgba(var(--illustrated-tier-accent-rgb), 0.32), transparent 30rem),
    radial-gradient(circle at 78% 22%, rgba(86, 171, 220, 0.16), transparent 30rem),
    radial-gradient(circle at 86% 46%, rgba(var(--illustrated-race-accent-rgb), 0.055), transparent 17rem),
    linear-gradient(180deg, rgba(246, 217, 130, 0.18) 0%, rgba(19, 55, 98, 0.78) 34%, rgba(5, 18, 43, 0.97) 100%),
    var(--illustrated-shell-deep);
  box-shadow:
    0 0 28px rgba(86, 171, 220, 0.14),
    0 0 64px rgba(var(--illustrated-tier-accent-rgb), 0.16),
    0 24px 64px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.illustrated-theme-anastasia .illustrated-shell {
  border-color: rgba(10, 45, 78, 0.24);
  background:
    radial-gradient(circle at 74% 8%, rgba(208, 166, 83, 0.12), transparent 24rem),
    radial-gradient(circle at 20% 90%, rgba(95, 143, 168, 0.12), transparent 28rem),
    linear-gradient(180deg, #f3f7f8 0%, #e4edf1 46%, #d5e0e6 100%);
  box-shadow:
    0 0 0 1px rgba(95, 143, 168, 0.26),
    0 0 28px rgba(95, 143, 168, 0.16),
    0 22px 54px rgba(16, 46, 73, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.illustrated-theme-iris .illustrated-shell {
  border-color: rgba(49, 83, 109, 0.58);
  border-radius: 14px;
  background:
    radial-gradient(circle at 76% 4%, rgba(169, 140, 232, 0.18), transparent 24rem),
    radial-gradient(circle at 18% 92%, rgba(240, 120, 166, 0.13), transparent 28rem),
    linear-gradient(145deg, #edf5f3 0%, #dcefeb 54%, #e9e1f7 100%);
  box-shadow:
    0 0 0 4px rgba(247, 251, 250, 0.78),
    0 0 0 5px rgba(66, 169, 150, 0.48),
    0 22px 52px rgba(23, 50, 74, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.illustrated-theme-anastasia .illustrated-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 6;
  padding: 2px;
  border-radius: inherit;
  background: linear-gradient(180deg, #eef5f7 0%, #5f8fa8 52%, #153f65 100%);
  pointer-events: none;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.illustrated-theme-anastasia .illustrated-shell::after {
  content: '';
  position: absolute;
  inset: 9px;
  z-index: 6;
  border: 1px solid rgba(10, 45, 78, 0.18);
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(232, 238, 242, 0.96) 0 16px, transparent 16px) top left / 72px 72px no-repeat,
    linear-gradient(225deg, rgba(232, 238, 242, 0.96) 0 16px, transparent 16px) top right / 72px 72px no-repeat,
    linear-gradient(45deg, rgba(208, 166, 83, 0.58) 0 14px, transparent 14px) bottom left / 64px 64px no-repeat,
    linear-gradient(315deg, rgba(208, 166, 83, 0.58) 0 14px, transparent 14px) bottom right / 64px 64px no-repeat;
  box-shadow: inset 0 0 24px rgba(95, 143, 168, 0.06);
  pointer-events: none;
}

.illustrated-theme-venus .illustrated-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 6;
  padding: 2px;
  border-radius: inherit;
  background:
    linear-gradient(180deg, rgba(255, 238, 172, 0.98) 0%, rgba(86, 171, 220, 0.64) 48%, rgba(22, 75, 143, 0.86) 100%),
    linear-gradient(
      90deg,
      rgba(var(--illustrated-race-accent-rgb), 0.16),
      rgba(255, 252, 235, 0.58),
      rgba(var(--illustrated-race-accent-rgb), 0.16)
    );
  filter: drop-shadow(0 0 7px rgba(var(--illustrated-tier-accent-rgb), 0.18))
    drop-shadow(0 0 12px rgba(86, 171, 220, 0.1));
  pointer-events: none;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.illustrated-theme-venus .illustrated-shell::after {
  content: '';
  position: absolute;
  inset: 9px;
  z-index: 6;
  border: 1px solid rgba(var(--illustrated-soft-accent-rgb), 0.18);
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(var(--illustrated-tier-accent-rgb), 0.92) 0 18px, transparent 18px) top left / 74px
      74px no-repeat,
    linear-gradient(225deg, rgba(var(--illustrated-tier-accent-rgb), 0.92) 0 18px, transparent 18px) top right / 74px
      74px no-repeat,
    linear-gradient(45deg, rgba(86, 171, 220, 0.62) 0 16px, transparent 16px) bottom left / 66px 66px no-repeat,
    linear-gradient(315deg, rgba(86, 171, 220, 0.62) 0 16px, transparent 16px) bottom right / 66px 66px no-repeat;
  box-shadow:
    inset 0 0 0 1px rgba(var(--illustrated-tier-accent-rgb), 0.08),
    inset 0 0 26px rgba(86, 171, 220, 0.05);
  pointer-events: none;
}

.illustrated-portrait-pane {
  position: relative;
  flex: 0 0 45%;
  min-width: 0;
}

.illustrated-theme-venus .illustrated-portrait-pane {
  padding: 14px;
}

.illustrated-theme-anastasia .illustrated-portrait-pane {
  padding: 14px;
}

.illustrated-theme-iris .illustrated-portrait-pane {
  padding: 12px;
  overflow: hidden;
  background: #a8c8c7;
}

.illustrated-theme-venus .illustrated-portrait-pane::before,
.illustrated-theme-venus .illustrated-portrait-pane::after {
  content: '';
  position: absolute;
  inset: 14px;
  z-index: 3;
  pointer-events: none;
}

.illustrated-theme-anastasia .illustrated-portrait-pane::before {
  content: '';
  position: absolute;
  inset: 14px;
  z-index: 3;
  border: 2px solid rgba(232, 238, 242, 0.98);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(232, 238, 242, 0.98) 0 12px, transparent 12px) top left / 56px 56px no-repeat,
    linear-gradient(225deg, rgba(232, 238, 242, 0.98) 0 12px, transparent 12px) top right / 56px 56px no-repeat,
    linear-gradient(45deg, rgba(208, 166, 83, 0.7) 0 12px, transparent 12px) bottom left / 56px 56px no-repeat,
    linear-gradient(315deg, rgba(208, 166, 83, 0.7) 0 12px, transparent 12px) bottom right / 56px 56px no-repeat;
  clip-path: polygon(
    18px 0,
    calc(100% - 18px) 0,
    100% 18px,
    100% calc(100% - 18px),
    calc(100% - 18px) 100%,
    18px 100%,
    0 calc(100% - 18px),
    0 18px
  );
  box-shadow: 0 0 16px rgba(95, 143, 168, 0.24);
  pointer-events: none;
}

.illustrated-theme-anastasia .illustrated-portrait-pane::after {
  background: linear-gradient(to right, transparent 58%, rgba(230, 237, 241, 0.92) 100%);
}

.illustrated-theme-venus .illustrated-portrait-pane::before {
  border: 2px solid rgba(var(--illustrated-tier-accent-rgb), 0.95);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 255, 246, 0.96) 0 12px, transparent 12px) top left / 56px 56px no-repeat,
    linear-gradient(225deg, rgba(255, 255, 246, 0.96) 0 12px, transparent 12px) top right / 56px 56px no-repeat,
    linear-gradient(45deg, rgba(86, 171, 220, 0.86) 0 12px, transparent 12px) bottom left / 56px 56px no-repeat,
    linear-gradient(315deg, rgba(86, 171, 220, 0.86) 0 12px, transparent 12px) bottom right / 56px 56px no-repeat;
  clip-path: polygon(
    18px 0,
    calc(100% - 18px) 0,
    100% 18px,
    100% calc(100% - 18px),
    calc(100% - 18px) 100%,
    18px 100%,
    0 calc(100% - 18px),
    0 18px
  );
  box-shadow:
    inset 0 0 0 1px rgba(var(--illustrated-soft-accent-rgb), 0.34),
    0 0 14px rgba(var(--illustrated-tier-accent-rgb), 0.18);
}

.illustrated-theme-venus .illustrated-portrait-pane::after {
  border-radius: 8px;
  background:
    linear-gradient(
        90deg,
        rgba(var(--illustrated-tier-accent-rgb), 0.98) 0 68px,
        transparent 68px calc(100% - 68px),
        rgba(var(--illustrated-tier-accent-rgb), 0.98) calc(100% - 68px)
      )
      top / 100% 2px no-repeat,
    linear-gradient(
        90deg,
        rgba(86, 171, 220, 0.7) 0 68px,
        transparent 68px calc(100% - 68px),
        rgba(86, 171, 220, 0.7) calc(100% - 68px)
      )
      bottom / 100% 2px no-repeat,
    linear-gradient(
        180deg,
        rgba(var(--illustrated-tier-accent-rgb), 0.98) 0 68px,
        transparent 68px calc(100% - 68px),
        rgba(86, 171, 220, 0.7) calc(100% - 68px)
      )
      left / 2px 100% no-repeat,
    linear-gradient(
        180deg,
        rgba(var(--illustrated-tier-accent-rgb), 0.98) 0 68px,
        transparent 68px calc(100% - 68px),
        rgba(86, 171, 220, 0.7) calc(100% - 68px)
      )
      right / 2px 100% no-repeat;
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

.illustrated-theme-iris .illustrated-portrait-image,
.illustrated-theme-iris .illustrated-portrait-video {
  border: 1px solid rgba(237, 255, 251, 0.88);
  border-radius: 10px;
  object-position: 50% 48%;
  box-shadow: 0 12px 28px rgba(23, 50, 74, 0.2);
  filter: saturate(0.98) contrast(1.02);
}

.illustrated-theme-iris .illustrated-portrait-pane::after {
  z-index: 2;
  inset: 12px;
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(23, 50, 74, 0.03) 0%, transparent 34%, transparent 66%, rgba(23, 50, 74, 0.2) 100%),
    linear-gradient(90deg, rgba(131, 220, 203, 0.1), transparent 26%, transparent 74%, rgba(169, 140, 232, 0.12));
}

.illustrated-iris-portrait-deco {
  position: absolute;
  inset: 12px;
  z-index: 4;
  overflow: hidden;
  border: 1px solid rgba(226, 255, 250, 0.74);
  border-radius: 10px;
  pointer-events: none;
}

.illustrated-iris-bubble {
  position: absolute;
  width: var(--bubble-size);
  aspect-ratio: 1;
  border: 1px solid rgba(237, 255, 251, 0.82);
  border-radius: 50%;
  background: rgba(247, 251, 250, 0.08);
  box-shadow: inset -3px -4px 9px rgba(131, 220, 203, 0.24);
}

.illustrated-iris-bubble::after {
  content: '';
  position: absolute;
  top: 20%;
  left: 22%;
  width: 22%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
}

.illustrated-iris-bubble.bubble-one {
  top: 8%;
  left: 7%;
  --bubble-size: 42px;
}

.illustrated-iris-bubble.bubble-two {
  top: 16%;
  right: 8%;
  --bubble-size: 28px;
}

.illustrated-iris-bubble.bubble-three {
  bottom: 12%;
  left: 10%;
  --bubble-size: 24px;
}

.illustrated-iris-bubble.bubble-four {
  right: 10%;
  bottom: 19%;
  --bubble-size: 48px;
}

.illustrated-iris-toy-node {
  position: absolute;
  width: 14px;
  aspect-ratio: 1;
  border: 2px solid #f7fbfa;
  border-radius: 4px;
  background: #f078a6;
  box-shadow: 0 2px 6px rgba(23, 50, 74, 0.24);
}

.illustrated-iris-toy-node.node-one {
  top: 18px;
  left: 18px;
  transform: rotate(16deg);
}

.illustrated-iris-toy-node.node-two {
  right: 18px;
  bottom: 18px;
  background: #a98ce8;
  transform: rotate(34deg);
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

.illustrated-theme-venus .illustrated-portrait-image,
.illustrated-theme-venus .illustrated-portrait-video {
  border-radius: 8px;
  clip-path: polygon(
    16px 0,
    calc(100% - 16px) 0,
    100% 16px,
    100% calc(100% - 16px),
    calc(100% - 16px) 100%,
    16px 100%,
    0 calc(100% - 16px),
    0 16px
  );
  box-shadow:
    0 0 0 1px rgba(var(--illustrated-soft-accent-rgb), 0.2),
    0 16px 36px rgba(0, 0, 0, 0.28);
}

.illustrated-portrait-deco {
  position: absolute;
  inset: 22px;
  z-index: 4;
  overflow: hidden;
  border-radius: 8px;
  clip-path: polygon(
    16px 0,
    calc(100% - 16px) 0,
    100% 16px,
    100% calc(100% - 16px),
    calc(100% - 16px) 100%,
    16px 100%,
    0 calc(100% - 16px),
    0 16px
  );
  pointer-events: none;
}

.illustrated-portrait-deco-corner {
  position: absolute;
  width: min(25%, 128px);
  aspect-ratio: 1;
  background: var(--venus-portrait-corner-url) center / contain no-repeat;
  opacity: 0.72;
  filter: brightness(0) saturate(100%) invert(89%) sepia(33%) saturate(618%) hue-rotate(348deg) brightness(108%)
    contrast(96%) drop-shadow(0 0 7px rgba(var(--illustrated-tier-accent-rgb), 0.28))
    drop-shadow(0 0 14px rgba(86, 171, 220, 0.1));
}

.illustrated-portrait-deco-corner.top-left {
  top: 0;
  left: 0;
}

.illustrated-portrait-deco-corner.top-right {
  top: 0;
  right: 0;
  transform: scaleX(-1);
}

.illustrated-portrait-deco-corner.bottom-left {
  bottom: 0;
  left: 0;
  transform: scaleY(-1);
}

.illustrated-portrait-deco-corner.bottom-right {
  right: 0;
  bottom: 0;
  transform: scale(-1);
}

.illustrated-mobile-overview-overlay,
.illustrated-mobile-header-overlay {
  display: none;
}

.illustrated-data-pane {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  max-height: 800px;
  padding: 56px 50px 34px;
  overflow: hidden;
}

.illustrated-theme-venus .illustrated-data-pane::before,
.illustrated-theme-venus .illustrated-data-pane::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.illustrated-theme-anastasia .illustrated-data-pane::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(216, 227, 235, 0.26)),
    var(--anastasia-anchor-pattern-url) center / 210px auto repeat;
  opacity: 0.16;
  pointer-events: none;
}

.illustrated-theme-anastasia .illustrated-data-pane > * {
  position: relative;
  z-index: 1;
}

.illustrated-theme-anastasia :deep(.illustrated-header .illustrated-name) {
  color: #0a2d4e;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.86),
    0 2px 10px rgba(95, 143, 168, 0.18);
}

.illustrated-theme-anastasia :deep(.illustrated-header .illustrated-subtitle) {
  color: #315873;
  text-shadow: none;
}

.illustrated-theme-anastasia :deep(.illustrated-header .rail-line) {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(10, 45, 78, 0.7),
    rgba(208, 166, 83, 0.92),
    rgba(10, 45, 78, 0.7),
    transparent
  );
  filter: drop-shadow(0 1px 2px rgba(255, 255, 255, 0.86));
  opacity: 0.9;
}

.illustrated-theme-anastasia :deep(.illustrated-header .rail-flourish),
.illustrated-theme-anastasia :deep(.illustrated-header .rail-center) {
  filter: brightness(0) saturate(100%) invert(22%) sepia(35%) saturate(1262%) hue-rotate(164deg) brightness(90%)
    contrast(96%) drop-shadow(0 1px 1px rgba(255, 255, 255, 0.86));
  opacity: 0.76;
}

.illustrated-theme-anastasia :deep(.illustrated-attribute),
.illustrated-theme-anastasia :deep(.illustrated-profile-card),
.illustrated-theme-anastasia :deep(.illustrated-list-item),
.illustrated-theme-anastasia :deep(.illustrated-story-block) {
  border-color: rgba(10, 45, 78, 0.16);
  background-color: rgba(250, 252, 253, 0.84);
  box-shadow: 0 8px 18px rgba(30, 67, 91, 0.1);
}

.illustrated-theme-anastasia :deep(.illustrated-attribute),
.illustrated-theme-anastasia :deep(.illustrated-profile-card),
.illustrated-theme-anastasia :deep(.illustrated-list-item),
.illustrated-theme-anastasia :deep(.illustrated-story-block) {
  color: #14304b;
}

.illustrated-theme-anastasia :deep(.illustrated-list-item) {
  overflow: hidden;
  border: 1px solid rgba(10, 45, 78, 0.18);
  border-radius: 10px;
  background:
    radial-gradient(ellipse at 50% 0, rgba(255, 255, 255, 0.96), transparent 64%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(229, 239, 245, 0.9));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    0 8px 18px rgba(30, 67, 91, 0.12);
}

.illustrated-theme-anastasia :deep(.illustrated-list-item-header) {
  border-bottom-color: rgba(10, 45, 78, 0.14);
}

.illustrated-theme-anastasia :deep(.illustrated-list-item h3) {
  color: #0a2d4e;
  text-shadow: none;
}

.illustrated-theme-anastasia :deep(.illustrated-list-item h3::before) {
  text-shadow: none;
}

.illustrated-theme-anastasia :deep(.illustrated-tag) {
  border-color: rgba(10, 45, 78, 0.2);
  background: rgba(255, 255, 255, 0.62);
  color: #315873;
}

.illustrated-theme-anastasia :deep(.illustrated-effect-item),
.illustrated-theme-anastasia :deep(.illustrated-effect-text),
.illustrated-theme-anastasia :deep(.illustrated-description),
.illustrated-theme-anastasia :deep(.illustrated-line) {
  color: #1f405a;
  text-shadow: none;
}

.illustrated-theme-anastasia :deep(.illustrated-resources .illustrated-resource) {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.illustrated-theme-anastasia :deep(.illustrated-resources .illustrated-resource-value) {
  color: #0a2d4e;
}

.illustrated-theme-anastasia :deep(.illustrated-text-block) {
  --corner: rgba(10, 45, 78, 0.54);
  border-color: rgba(10, 45, 78, 0.22);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(228, 238, 244, 0.9)), rgba(232, 240, 245, 0.94);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    0 8px 18px rgba(30, 67, 91, 0.12);
}

.illustrated-theme-anastasia :deep(.illustrated-text-block h3) {
  color: #0a2d4e;
  text-shadow: none;
}

.illustrated-theme-anastasia :deep(.illustrated-text-block p) {
  color: #1f405a;
  text-shadow: none;
}

.illustrated-theme-iris .illustrated-data-pane {
  color: #17324a;
  background-color: #dcefeb;
  background-image:
    radial-gradient(circle at 15% 16%, rgba(240, 120, 166, 0.13) 0 3px, transparent 4px),
    radial-gradient(circle at 82% 23%, rgba(169, 140, 232, 0.14) 0 4px, transparent 5px),
    radial-gradient(circle at 62% 78%, rgba(66, 169, 150, 0.12) 0 5px, transparent 6px),
    radial-gradient(circle at 34% 55%, transparent 0 19px, rgba(114, 88, 186, 0.08) 20px 21px, transparent 22px),
    linear-gradient(135deg, rgba(247, 251, 250, 0.82), rgba(220, 239, 235, 0.58) 52%, rgba(235, 226, 250, 0.5));
  background-size:
    88px 88px,
    126px 126px,
    148px 148px,
    180px 180px,
    auto;
}

.illustrated-theme-iris .illustrated-data-pane > * {
  position: relative;
  z-index: 2;
}

.illustrated-iris-header-deco {
  position: absolute !important;
  top: 26px;
  right: 34px;
  left: 34px;
  z-index: 1 !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
  pointer-events: none;
}

.illustrated-iris-jellyfish {
  position: relative;
  width: 58px;
  height: 68px;
  color: #7258ba;
}

.illustrated-iris-jellyfish .jellyfish-dome {
  position: absolute;
  top: 5px;
  left: 6px;
  width: 46px;
  height: 31px;
  border: 2px solid currentColor;
  border-bottom: 0;
  border-radius: 26px 26px 10px 10px;
  background: rgba(169, 140, 232, 0.18);
  box-shadow: inset 7px 5px 0 rgba(255, 255, 255, 0.42);
}

.illustrated-iris-jellyfish .jellyfish-dome::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 9px;
  width: 8px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #f078a6;
}

.illustrated-iris-jellyfish .jellyfish-tentacle {
  position: absolute;
  top: 35px;
  width: 8px;
  height: 25px;
  border-left: 2px solid currentColor;
  border-radius: 50%;
}

.illustrated-iris-jellyfish .tentacle-one {
  left: 15px;
  transform: rotate(8deg);
}

.illustrated-iris-jellyfish .tentacle-two {
  left: 27px;
  transform: rotate(-9deg);
}

.illustrated-iris-jellyfish .tentacle-three {
  left: 39px;
  transform: rotate(11deg);
}

.illustrated-iris-toy-blocks {
  display: grid;
  grid-template-columns: repeat(2, 18px);
  gap: 6px;
  transform: rotate(8deg);
}

.illustrated-iris-toy-blocks i {
  width: 18px;
  aspect-ratio: 1;
  border: 2px solid #42a996;
  border-radius: 5px;
  background: #f7fbfa;
  box-shadow: 2px 2px 0 rgba(169, 140, 232, 0.28);
}

.illustrated-iris-toy-blocks i:nth-child(2),
.illustrated-iris-toy-blocks i:nth-child(3) {
  border-color: #be4f79;
  background: #fbe7ef;
}

.illustrated-theme-iris :deep(.illustrated-header .illustrated-name) {
  color: #17324a;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}

.illustrated-theme-iris :deep(.illustrated-header .illustrated-level),
.illustrated-theme-iris :deep(.illustrated-header .illustrated-tier) {
  color: #7258ba;
  text-shadow: none;
}

.illustrated-theme-iris :deep(.illustrated-header .illustrated-subtitle) {
  color: #31536d;
  text-shadow: none;
}

.illustrated-theme-iris :deep(.illustrated-page-title) {
  color: #17324a;
}

.illustrated-theme-iris :deep(.illustrated-page-title-line) {
  background: linear-gradient(90deg, transparent, #42a996, #a98ce8, transparent);
}

.illustrated-theme-iris :deep(.illustrated-page-title h2) {
  color: #17324a;
  text-shadow: none;
}

.illustrated-theme-iris :deep(.illustrated-attribute) {
  border: 1px solid #85b7b0;
  border-radius: 18px 18px 42% 42% / 18px 18px 22% 22%;
  background: linear-gradient(180deg, #f9fcfb 0%, #e6f4f1 58%, #bfe8df 100%);
  clip-path: none;
  color: #17324a;
  box-shadow:
    0 8px 14px rgba(23, 50, 74, 0.1),
    inset 0 0 0 4px rgba(255, 255, 255, 0.5);
}

.illustrated-theme-iris :deep(.illustrated-attribute::before) {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 9px;
  border-bottom: 2px solid #7258ba;
  background: #83dccb;
}

.illustrated-theme-iris :deep(.illustrated-attribute-name) {
  color: #17324a;
}

.illustrated-theme-iris :deep(.illustrated-attribute-total) {
  color: #be4f79;
  text-shadow: none;
}

.illustrated-theme-iris :deep(.illustrated-resources::before) {
  top: 50%;
  right: 11%;
  bottom: auto;
  left: 11%;
  z-index: -1;
  height: 3px;
  background: #a98ce8;
}

.illustrated-theme-iris :deep(.illustrated-resources::after) {
  display: none;
}

.illustrated-theme-iris :deep(.illustrated-resource) {
  border: 1px solid #88b8b1;
  border-radius: 46% 54% 51% 49% / 51% 44% 56% 49%;
  background: rgba(247, 251, 250, 0.95);
  box-shadow:
    inset -8px -7px 0 rgba(131, 220, 203, 0.18),
    0 7px 12px rgba(23, 50, 74, 0.1);
}

.illustrated-theme-iris :deep(.illustrated-resource:not(:last-child)::after) {
  display: none;
}

.illustrated-theme-iris :deep(.illustrated-resource-name) {
  color: #7258ba;
}

.illustrated-theme-iris :deep(.illustrated-resource-value) {
  color: #17324a;
  text-shadow: none;
}

.illustrated-theme-iris :deep(.illustrated-profile-card),
.illustrated-theme-iris :deep(.illustrated-text-block),
.illustrated-theme-iris :deep(.illustrated-list-item) {
  border: 1px solid #a6c3c0;
  border-radius: 10px;
  background: rgba(247, 251, 250, 0.95);
  color: #17324a;
  box-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
}

.illustrated-theme-iris :deep(.illustrated-text-block h3),
.illustrated-theme-iris :deep(.illustrated-list-item h3) {
  color: #17324a;
  text-shadow: none;
}

.illustrated-theme-iris :deep(.illustrated-list-item-header) {
  border-bottom-color: rgba(66, 169, 150, 0.26);
}

.illustrated-theme-iris :deep(.illustrated-tag) {
  border-color: #a7c5c1;
  background: #fff;
  color: #31536d;
}

.illustrated-theme-iris :deep(.illustrated-effect-item),
.illustrated-theme-iris :deep(.illustrated-effect-text),
.illustrated-theme-iris :deep(.illustrated-description),
.illustrated-theme-iris :deep(.illustrated-line),
.illustrated-theme-iris :deep(.illustrated-text-block p) {
  color: #31536d;
  text-shadow: none;
}

.illustrated-theme-iris :deep(.illustrated-tabs) {
  border: 1px solid #9abbb7;
  border-radius: 8px;
  background: rgba(247, 251, 250, 0.96);
  box-shadow: 0 7px 16px rgba(23, 50, 74, 0.1);
}

.illustrated-theme-iris :deep(.illustrated-tab-button) {
  color: #31536d;
}

.illustrated-theme-iris :deep(.illustrated-tab-button:hover),
.illustrated-theme-iris :deep(.illustrated-tab-button.active) {
  background: #d9f0ea;
  color: #17324a;
}

.illustrated-theme-iris :deep(.illustrated-tab-button.active::after) {
  background: #f078a6;
}

.illustrated-theme-iris .illustrated-story-block,
.illustrated-theme-iris .illustrated-story-link-block {
  border-color: #a6c3c0;
  border-radius: 10px;
  background: rgba(247, 251, 250, 0.95);
  color: #17324a;
  box-shadow: 0 8px 18px rgba(23, 50, 74, 0.1);
}

.illustrated-theme-iris .illustrated-story-block h3,
.illustrated-theme-iris .illustrated-story-link-copy h3 {
  color: #17324a;
  text-shadow: none;
}

.illustrated-theme-iris .illustrated-story-block p,
.illustrated-theme-iris .illustrated-story-link-copy p {
  color: #31536d;
}

.illustrated-theme-iris .import-action-menu {
  border-color: #9abbb7;
  background: rgba(247, 251, 250, 0.98);
  box-shadow: 0 12px 30px rgba(23, 50, 74, 0.2);
}

.illustrated-theme-iris .import-action-menu button {
  color: #17324a;
}

.illustrated-theme-iris .import-action-menu button:hover:not(:disabled) {
  border-color: rgba(66, 169, 150, 0.34);
  background: #e4f3ef;
}

.illustrated-theme-venus .illustrated-data-pane::after {
  background:
    linear-gradient(
      180deg,
      rgba(var(--illustrated-tier-accent-rgb), 0.14) 0%,
      rgba(27, 69, 111, 0.18) 34%,
      rgba(4, 15, 36, 0.36) 100%
    ),
    radial-gradient(ellipse at 50% 12%, rgba(255, 248, 221, 0.16), transparent 22rem),
    radial-gradient(ellipse at 50% 62%, rgba(86, 171, 220, 0.1), transparent 24rem);
  opacity: 0.9;
}

.illustrated-theme-venus .illustrated-data-pane > * {
  position: relative;
  z-index: 1;
}

.illustrated-panels::-webkit-scrollbar {
  width: 6px;
}

.illustrated-panels::-webkit-scrollbar-track {
  background: transparent;
}

.illustrated-panels::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.12);
}

.illustrated-panels {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 22px;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
  scrollbar-width: thin;
}

.illustrated-shell.is-overview-tab .illustrated-panels {
  overflow-y: hidden;
  padding-bottom: 0;
}

@media (min-width: 901px) {
  .illustrated-shell.overview-density-compact .illustrated-data-pane {
    padding-top: 42px;
    padding-bottom: 26px;
  }

  .illustrated-shell.overview-density-dense .illustrated-data-pane {
    padding-top: 28px;
    padding-bottom: 18px;
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

@media (min-width: 901px) {
  .illustrated-theme-anastasia .illustrated-shell.is-overview-tab .illustrated-panels {
    overflow-y: hidden;
    padding-bottom: 0;
  }
}

@media (max-width: 900px) {
  .illustrated-wrapper {
    max-width: min(100%, 480px);
  }

  .illustrated-shell {
    flex-direction: column;
    height: 216.4251cqw;
    min-height: 0;
  }

  .illustrated-portrait-pane {
    flex: 1 1 auto;
    min-height: 0;
  }

  .illustrated-shell.is-detail-tab .illustrated-portrait-pane {
    display: none;
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

  .illustrated-shell.is-detail-tab .illustrated-data-pane {
    padding: 18px 24px 14px;
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

  .illustrated-panels > :deep(.illustrated-overview) {
    display: none;
  }

  .illustrated-shell :deep(.illustrated-tab-scroll) {
    padding-right: 12px;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate) {
    gap: 2px;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .illustrated-name-rail.top) {
    height: 16px;
    margin-bottom: -2px;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .illustrated-name-rail.bottom) {
    height: 14px;
    margin-top: -2px;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .rail-flourish) {
    height: 12px;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .rail-center) {
    height: 14px;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .illustrated-name) {
    font-size: 20px;
    line-height: 1.08;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .illustrated-level-tier) {
    margin-bottom: 0;
    padding: 0;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .illustrated-level),
  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .illustrated-tier) {
    font-size: 10px;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .illustrated-badge-separator) {
    margin: 0 8px;
  }

  .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate .illustrated-subtitle) {
    gap: 4px;
    font-size: 10px;
    line-height: 1.35;
  }

  .illustrated-theme-anastasia .illustrated-mobile-header-overlay {
    padding: 8px 10px 9px;
    border-color: rgba(10, 45, 78, 0.42);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(252, 254, 255, 0.94), rgba(211, 226, 234, 0.9));
    box-shadow:
      0 7px 18px rgba(16, 46, 73, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.94);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .illustrated-theme-anastasia .illustrated-mobile-header-overlay :deep(.illustrated-header.compact.ornate) {
    gap: 3px;
  }

  .illustrated-theme-anastasia .illustrated-mobile-header-overlay :deep(.illustrated-name-rail) {
    display: none;
  }

  .illustrated-theme-anastasia
    .illustrated-mobile-header-overlay
    :deep(.illustrated-header.compact.ornate .illustrated-name) {
    max-width: 100%;
    color: #0a2d4e;
    font-size: clamp(15px, 5.4cqw, 20px);
    line-height: 1.16;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.94);
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .illustrated-theme-anastasia
    .illustrated-mobile-header-overlay
    :deep(.illustrated-header.compact.ornate .illustrated-level),
  .illustrated-theme-anastasia
    .illustrated-mobile-header-overlay
    :deep(.illustrated-header.compact.ornate .illustrated-tier) {
    color: #a87a27;
    font-size: 10px;
  }

  .illustrated-theme-anastasia
    .illustrated-mobile-header-overlay
    :deep(.illustrated-header.compact.ornate .illustrated-subtitle) {
    color: #315873;
    font-size: 9px;
    line-height: 1.28;
    text-shadow: none;
  }

  .illustrated-theme-iris .illustrated-mobile-header-overlay {
    max-height: 24%;
    padding: 10px 12px;
    overflow: hidden;
    border-color: rgba(66, 169, 150, 0.72);
    background: rgba(237, 245, 243, 0.94);
    box-shadow: 0 9px 22px rgba(23, 50, 74, 0.22);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .illustrated-theme-iris .illustrated-mobile-header-overlay :deep(.illustrated-name) {
    max-width: 100%;
    color: #17324a;
    font-size: clamp(18px, 6cqw, 24px);
    line-height: 1.2;
    text-shadow: none;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .illustrated-theme-iris .illustrated-mobile-header-overlay :deep(.illustrated-level),
  .illustrated-theme-iris .illustrated-mobile-header-overlay :deep(.illustrated-tier) {
    color: #7258ba;
    font-size: 10px;
  }

  .illustrated-theme-iris .illustrated-mobile-header-overlay :deep(.illustrated-subtitle) {
    color: #31536d;
    font-size: 10px;
    line-height: 1.3;
    text-shadow: none;
  }

  .illustrated-theme-iris :deep(.illustrated-attribute) {
    border-radius: 12px 12px 42% 42% / 12px 12px 22% 22%;
  }

  .illustrated-theme-iris .illustrated-iris-header-deco {
    display: none;
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

  .illustrated-mobile-overview-overlay {
    right: 14px;
    bottom: 18px;
    left: 14px;
  }

  .illustrated-mobile-header-overlay {
    padding: 9px 10px;
  }

  .illustrated-theme-anastasia :deep(.illustrated-list-item) {
    margin-bottom: 12px;
    padding: 15px;
  }

  .illustrated-theme-anastasia :deep(.illustrated-list-item-header) {
    gap: 6px;
    margin-bottom: 10px;
    padding-bottom: 8px;
  }

  .illustrated-theme-anastasia :deep(.illustrated-list-item h3) {
    font-size: 17px;
    line-height: 1.3;
  }

  .illustrated-theme-anastasia :deep(.illustrated-list-item h3::before) {
    margin-right: 8px;
    font-size: 16px;
  }

  .illustrated-theme-anastasia :deep(.illustrated-list-item-type) {
    padding: 3px 12px;
    font-size: 12px;
  }

  .illustrated-theme-anastasia :deep(.illustrated-tags) {
    gap: 6px;
    margin-bottom: 10px;
  }

  .illustrated-theme-anastasia :deep(.illustrated-tag) {
    padding: 3px 8px;
    font-size: 11px;
  }

  .illustrated-theme-anastasia :deep(.illustrated-effect-list) {
    gap: 6px;
  }

  .illustrated-theme-anastasia :deep(.illustrated-effect-item),
  .illustrated-theme-anastasia :deep(.illustrated-effect-text),
  .illustrated-theme-anastasia :deep(.illustrated-description),
  .illustrated-theme-anastasia :deep(.illustrated-line) {
    font-size: 14px;
    line-height: 1.55;
  }

  .illustrated-theme-anastasia :deep(.illustrated-description),
  .illustrated-theme-anastasia :deep(.illustrated-line) {
    margin-top: 6px;
  }

  .illustrated-theme-iris :deep(.illustrated-list-item) {
    margin-bottom: 12px;
    padding: 15px;
  }

  .illustrated-theme-iris :deep(.illustrated-list-item-header) {
    gap: 6px;
    margin-bottom: 10px;
    padding-bottom: 8px;
  }

  .illustrated-theme-iris :deep(.illustrated-list-item h3) {
    font-size: 17px;
    line-height: 1.3;
  }

  .illustrated-theme-iris :deep(.illustrated-list-item-type) {
    padding: 3px 10px;
    font-size: 12px;
  }

  .illustrated-theme-iris :deep(.illustrated-tags) {
    gap: 6px;
    margin-bottom: 10px;
  }

  .illustrated-theme-iris :deep(.illustrated-tag) {
    padding: 3px 8px;
    font-size: 11px;
  }

  .illustrated-theme-iris :deep(.illustrated-effect-item),
  .illustrated-theme-iris :deep(.illustrated-effect-text),
  .illustrated-theme-iris :deep(.illustrated-description),
  .illustrated-theme-iris :deep(.illustrated-line),
  .illustrated-theme-iris :deep(.illustrated-text-block p) {
    font-size: 14px;
    line-height: 1.55;
  }

  .import-action-menu {
    right: 10px;
    bottom: 56px;
    min-width: 170px;
  }
}
</style>
