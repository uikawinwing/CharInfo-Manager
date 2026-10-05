<template>
  <div
    ref="wrapperElement"
    class="illustrated-wrapper"
    :class="{
      'is-special-npc': specialNpc,
      'force-mobile-layout': forceMobileLayout,
      'is-scaled-desktop': isScaledDesktop,
    }"
    :style="illustratedWrapperStyle"
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
      <component
        :is="portraitModule"
        ref="portraitPaneElement"
        :vm="vm"
        :portrait="portrait"
        :is-overview-tab="isOverviewTab"
        :force-mobile-layout="forceMobileLayout"
        :header-module="headerModule"
        @fallback-to-default="$emit('fallbackToDefault')"
        @open-entrance-quote="openQuote"
      />

      <section class="illustrated-data-pane">
        <component
          :is="headerModule"
          v-if="isOverviewTab"
          :class="['illustrated-desktop-header', overviewDensityClass]"
          :vm="vm"
          @layout-change="updateOverviewDensity"
        />

        <div ref="panelsElement" class="illustrated-panels">
          <div v-if="hideRedundantDetailTitle" class="illustrated-detail-title-spacer" aria-hidden="true"></div>
          <IllustratedPageTitle v-else-if="!isOverviewTab" :title="activeSpecialTabTitle" />

          <component
            :is="overviewModule"
            v-if="activeSpecialTab === 'overview'"
            :class="[overviewDensityClass, { 'is-special-npc-overview': specialNpc }]"
            :attributes="attributes"
            :resource-boxes="[]"
            :entrance-quote-text="vm.entranceQuoteText"
            @toggle-attribute-formula="$emit('toggleAttributeFormula', $event)"
            @open-entrance-quote="openQuote"
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
                @click="selectProfileSubview('info')"
              >
                资料
              </button>
              <button
                type="button"
                :class="{ active: activeProfileSubview === 'story' }"
                :aria-pressed="activeProfileSubview === 'story'"
                @click="selectProfileSubview('story')"
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
              :overview-module="overviewModule"
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
                <component
                  :is="itemCardModule"
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
            <component
              :is="itemCardModule"
              v-for="(item, index) in vm.equipments"
              :key="`equipment-${index}`"
              :item="item"
            />
          </template>

          <template v-else-if="activeSpecialTab === 'inventory'">
            <section v-for="section in vm.inventorySections" :key="section.key" class="illustrated-section">
              <h3 class="illustrated-section-title">{{ section.title }}</h3>
              <component
                :is="itemCardModule"
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
                <component
                  :is="itemCardModule"
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
                <component
                  :is="itemCardModule"
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
            <component
              :is="itemCardModule"
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
            :item-card-module="itemCardModule"
          />

          <IllustratedStoryPanel v-else :text="vm.backstoryText" />
        </div>

        <component
          :is="navigationModule"
          v-if="!specialNpc"
          :tabs="tabs"
          :active-tab="activeSpecialTab"
          :save-phase="savePhase"
          :show-import-action="!readOnly"
          :force-mobile-layout="forceMobileLayout"
          @set-tab="selectTab"
          @toggle-import-menu="$emit('toggleImportMenu')"
        />
      </section>

      <component
        :is="navigationModule"
        v-if="specialNpc"
        side-rail
        :tabs="tabs"
        :active-tab="activeSpecialTab"
        :save-phase="savePhase"
        :show-import-action="!readOnly"
        :force-mobile-layout="forceMobileLayout"
        @set-tab="selectTab"
        @toggle-import-menu="$emit('toggleImportMenu')"
      />

      <div v-if="!readOnly" class="import-action-menu" :class="{ show: showImportMenu }">
        <button type="button" :disabled="savePending" @click="$emit('importMvu')">{{ VIEWER_IMPORT_MVU_LABEL }}</button>
        <button type="button" :disabled="savePending" @click="$emit('importWorldbook')">
          {{ VIEWER_IMPORT_WORLDBOOK_LABEL }}
        </button>
      </div>
    </main>

    <IllustratedQuoteDialog
      :is-open="isEntranceQuoteDialogOpen"
      :name-text="vm.nameText"
      :quote-text="vm.entranceQuoteText"
      :set-close-button="setQuoteDialogCloseButton"
      @close="closeQuote"
      @keep-focus="keepQuoteDialogFocus"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { CharacterViewModel } from '../../../services/characterViewModel';
import {
  VIEWER_IMPORT_MVU_LABEL,
  VIEWER_IMPORT_WORLDBOOK_LABEL,
  type ViewerSavePhase,
} from '../../../../char_info_shared/viewerSaveUi';
import type {
  AttributeView,
  IllustratedPortraitModuleHandle,
  IllustratedRendererOverrides,
} from '../types';
import { useIllustratedPortrait } from '../core/useIllustratedPortrait';
import { useIllustratedSheetController } from '../core/useIllustratedSheetController';
import IllustratedCharacterPanel from './IllustratedCharacterPanel.vue';
import IllustratedDefaultDivinityPanel from './IllustratedDefaultDivinityPanel.vue';
import IllustratedHeader from './IllustratedHeader.vue';
import IllustratedItemCard from './IllustratedItemCard.vue';
import IllustratedOverviewPanel from './IllustratedOverviewPanel.vue';
import IllustratedPageTitle from './IllustratedPageTitle.vue';
import IllustratedPortraitPane from './IllustratedPortraitPane.vue';
import IllustratedProfilePanel from './IllustratedProfilePanel.vue';
import IllustratedQuoteDialog from './IllustratedQuoteDialog.vue';
import IllustratedStoryPanel from './IllustratedStoryPanel.vue';
import IllustratedTabNav from './IllustratedTabNav.vue';

const props = defineProps<{
  vm: CharacterViewModel;
  attributes: AttributeView[];
  savePhase: ViewerSavePhase;
  showImportMenu: boolean;
  readOnly: boolean;
  debugEnabled: boolean;
  forceMobileLayout: boolean;
  specialNpc: boolean;
  /**
   * DX Level 2 module override。每一项都可省略，省略即用默认组件。
   * 不传本 prop 时行为与 CSS 与拆分前完全一致。
   */
  overrides?: IllustratedRendererOverrides;
}>();

const savePending = computed(() => props.savePhase === 'pending');

/**
 * 逐项回落：override 优先，缺省即默认组件。
 *
 * 用 computed 逐项读 `props.overrides`，而不是在 setup 里解构——解绑构只在 setup
 * 执行一次，将来父级整体替换 overrides 对象时会永久指向旧对象（与 PortraitPane
 * 处理 portrait controller 的理由相同）。
 */
const headerModule = computed(() => props.overrides?.header ?? IllustratedHeader);
const overviewModule = computed(() => props.overrides?.overview ?? IllustratedOverviewPanel);
const portraitModule = computed(() => props.overrides?.portrait ?? IllustratedPortraitPane);
const itemCardModule = computed(() => props.overrides?.itemCard ?? IllustratedItemCard);
const navigationModule = computed(() => props.overrides?.navigation ?? IllustratedTabNav);

const DESKTOP_REFERENCE_WIDTH = 1200;
const DESKTOP_REFERENCE_HEIGHT = 800;
const MOBILE_LAYOUT_BREAKPOINT = 900;

defineEmits<{
  toggleAttributeFormula: [key: string];
  toggleImportMenu: [];
  importMvu: [];
  importWorldbook: [];
  fallbackToDefault: [];
}>();

const wrapperElement = ref<HTMLElement | null>(null);
const shellElement = ref<HTMLElement | null>(null);
const panelsElement = ref<HTMLElement | null>(null);
const portraitPaneElement = ref<IllustratedPortraitModuleHandle | null>(null);
const detailWallpaperCanvas = ref<HTMLCanvasElement | null>(null);
const detailWallpaperReady = ref(false);
const overviewDensity = ref<'normal' | 'compact' | 'dense'>('normal');
const overviewDensityClass = computed(() => `overview-density-${overviewDensity.value}`);
let overviewDensityFrame: number | undefined;
let overviewResizeObserver: ResizeObserver | undefined;
let layoutResizeObserver: ResizeObserver | undefined;
const availableLayoutWidth = ref(DESKTOP_REFERENCE_WIDTH);
const desktopScale = computed(() => {
  if (props.forceMobileLayout || availableLayoutWidth.value <= MOBILE_LAYOUT_BREAKPOINT) return 1;
  return Math.min(1, availableLayoutWidth.value / DESKTOP_REFERENCE_WIDTH);
});
const isScaledDesktop = computed(() => desktopScale.value < 1);
const illustratedWrapperStyle = computed(() =>
  isScaledDesktop.value
    ? {
        '--illustrated-desktop-scale': String(desktopScale.value),
        '--illustrated-scaled-height': `${DESKTOP_REFERENCE_HEIGHT * desktopScale.value}px`,
      }
    : undefined,
);
const portrait = useIllustratedPortrait({
  vm: () => props.vm,
  debugEnabled: () => props.debugEnabled,
});

// 立绘面板自己消费其余状态，但移动端静态快照仍需判断立绘是否就绪。
const { portraitLoaded, portraitLoadFailed } = portrait;

function captureDetailWallpaper(): void {
  const canvas = detailWallpaperCanvas.value;
  const shell = shellElement.value;
  if (!canvas || !shell || !portraitLoaded.value || portraitLoadFailed.value) {
    detailWallpaperReady.value = false;
    return;
  }

  // 立绘模块负责「当前这一帧是什么」，父级只负责画到自己的 canvas 上，
  // 因此不需要知道当前媒体是 <img> 还是 <video>。
  const frame = portraitPaneElement.value?.captureCurrentFrame() ?? null;
  if (!frame) {
    detailWallpaperReady.value = false;
    return;
  }

  const { source, width: sourceWidth, height: sourceHeight } = frame;
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

const {
  tabs,
  activeSpecialTab,
  activeProfileSubview,
  isOverviewTab,
  isDivinityTab,
  activeSpecialTabTitle,
  hideRedundantDetailTitle,
  hasCustomStorySections,
  profileFallbackBackstoryText,
  selectTab,
  selectProfileSubview,
  groupedSkills,
  isGroupCollapsed,
  toggleGroup,
  isEntranceQuoteDialogOpen,
  setQuoteDialogCloseButton,
  openQuote,
  closeQuote,
  keepQuoteDialogFocus,
} = useIllustratedSheetController({
  vm: () => props.vm,
  specialNpc: () => props.specialNpc,
  onLeaveOverview: captureDetailWallpaper,
});

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
  if (wrapperElement.value) {
    availableLayoutWidth.value = wrapperElement.value.clientWidth;
    layoutResizeObserver = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined) availableLayoutWidth.value = width;
    });
    layoutResizeObserver.observe(wrapperElement.value);
  }

  overviewResizeObserver = new ResizeObserver(updateOverviewDensity);
  if (shellElement.value) overviewResizeObserver.observe(shellElement.value);
  updateOverviewDensity();
});

onBeforeUnmount(() => {
  if (overviewDensityFrame !== undefined) cancelAnimationFrame(overviewDensityFrame);
  layoutResizeObserver?.disconnect();
  overviewResizeObserver?.disconnect();
});

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
</script>

<style scoped lang="scss">
.illustrated-wrapper {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  container-type: inline-size;
  color: var(--illustrated-fg);
  font-family: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  --illustrated-bg: #14161e;
  --illustrated-panel: rgba(20, 22, 30, 0.78);
  --illustrated-fg: #f8f9fa;
  --illustrated-fg-soft: #e2e8f0;
  --illustrated-fg-muted: #a0a5b5;
  --illustrated-border-soft: rgba(255, 255, 255, 0.08);
  --illustrated-border-faint: rgba(255, 255, 255, 0.05);
  --illustrated-surface-subtle: rgba(0, 0, 0, 0.2);
  --illustrated-surface-muted: rgba(5, 7, 10, 0.28);
  --illustrated-surface-card: rgba(12, 14, 18, 0.85);
  --illustrated-surface-tag: rgba(0, 0, 0, 0.4);
  --illustrated-portrait-pane-background: transparent;
  --illustrated-data-pane-background: transparent;
  --illustrated-detail-pane-background: color-mix(in srgb, var(--illustrated-bg) 58%, transparent);
  --illustrated-text-block-background: radial-gradient(
    ellipse at center,
    rgba(30, 34, 42, 0.4) 0%,
    rgba(10, 12, 16, 0.8) 100%
  );
  --illustrated-panel-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --illustrated-race-accent: var(--race-color, #d4af37);
  --illustrated-race-accent-rgb: var(--race-color-rgb, 212, 175, 55);
  --illustrated-tier-accent: var(--tier-color, #d4af37);
  --illustrated-tier-accent-rgb: var(--tier-color-rgb, 212, 175, 55);
  --illustrated-soft-accent-rgb: var(--illustrated-race-accent-rgb);
  --illustrated-shell-border-color: var(--illustrated-border-soft);
  --illustrated-shell-background: var(--illustrated-bg);
  --illustrated-shell-shadow:
    0 0 0 1px rgba(var(--illustrated-tier-accent-rgb), 0.35),
    0 0 26px rgba(var(--illustrated-tier-accent-rgb), 0.32),
    0 0 54px rgba(var(--illustrated-tier-accent-rgb), 0.18),
    0 24px 64px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  --illustrated-group-panel-background: rgba(5, 9, 14, 0.2);
  --illustrated-group-panel-collapsed-background: rgba(5, 9, 14, 0.12);
  --illustrated-group-panel-highlight: rgba(255, 255, 255, 0.025);
  --illustrated-group-toggle-background: linear-gradient(
    90deg,
    rgba(var(--illustrated-tier-accent-rgb), 0.08),
    rgba(5, 9, 14, 0.08)
  );
  --illustrated-group-toggle-hover-background: linear-gradient(
    90deg,
    rgba(var(--illustrated-tier-accent-rgb), 0.13),
    rgba(5, 9, 14, 0.1)
  );
  --illustrated-profile-subnav-background: rgba(4, 8, 13, 0.38);
  --illustrated-profile-story-background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 46%), rgba(5, 9, 14, 0.34);
  --illustrated-profile-story-highlight: rgba(255, 255, 255, 0.025);
  --illustrated-profile-story-mobile-background: rgba(7, 10, 15, 0.46);
  --illustrated-mobile-summary-background: var(--illustrated-surface-muted);
  --illustrated-compact-row-background: transparent;
  --illustrated-dialog-backdrop: rgba(3, 6, 12, 0.72);
  --illustrated-dialog-depth-shadow: 0 24px 70px rgba(0, 0, 0, 0.58);
  --illustrated-nav-background: linear-gradient(180deg, rgba(20, 22, 30, 0.2) 0%, rgba(20, 22, 30, 0.96) 35%);
  --illustrated-mobile-nav-background: color-mix(in srgb, var(--illustrated-bg) 94%, transparent);
  --illustrated-side-rail-background: rgba(4, 5, 9, 0.82);
  --illustrated-side-rail-shadow: none;
  // 导航视觉 token。idle / active 的前景与指示色**不与 race-accent 绑定**：
  // 真实 theme 的 active 指示色与 race-accent 并不相等（Iris race-accent 是
  // #42a996，而 active 指示色是 #f078a6），绑死会让浅色主题失效。
  --illustrated-nav-border-color: var(--illustrated-border-soft);
  --illustrated-tab-fg: var(--illustrated-fg-muted);
  --illustrated-tab-active-fg: var(--illustrated-race-accent);
  --illustrated-tab-active-indicator: var(--illustrated-race-accent);
  // 桌面底栏的 active 没有背景，只有前景变化，所以默认透明。
  --illustrated-tab-active-background: transparent;
  // 侧栏 active 才有的渐变底色，与桌面底栏是两条独立证据，值不可合并。
  --illustrated-side-rail-border-color: rgba(255, 255, 255, 0.08);
  --illustrated-side-rail-tab-active-background: linear-gradient(
    90deg,
    rgba(var(--illustrated-race-accent-rgb), 0.12),
    transparent
  );
  --illustrated-tier-shadow: 0 0 8px rgba(var(--illustrated-tier-accent-rgb), 0.4);
  // 属性旗标视觉 token。属性卡的边框造型（top 高亮条、下边框色）与
  // race-accent / border-faint 都不同，因此独立成组，不复用通用 surface token。
  --illustrated-attribute-border: 1px solid var(--illustrated-border-faint);
  --illustrated-attribute-border-top: 2px solid var(--illustrated-race-accent);
  --illustrated-attribute-border-bottom-color: var(--illustrated-border-faint);
  --illustrated-attribute-radius: 0;
  --illustrated-attribute-background: rgba(0, 0, 0, 0.3);
  --illustrated-attribute-clip-path: polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%);
  --illustrated-attribute-fg: var(--illustrated-fg);
  --illustrated-attribute-shadow: none;
  --illustrated-attribute-total-fg: var(--illustrated-race-accent);
  // 立绘媒体（img / video）视觉 token。当前默认没有边框 / 圆角 / 阴影 / 裁切，
  // 所以 default 分别是 none / 0 / none / none —— 与「未设置」严格等价。
  --illustrated-portrait-media-border: none;
  --illustrated-portrait-media-radius: 0;
  --illustrated-portrait-media-object-position: top center;
  --illustrated-portrait-media-shadow: none;
  --illustrated-portrait-media-clip-path: none;
  // 内容面板视觉 token。group-panel 的边框用 tier-accent 派生、text-block 用
  // 独立低透明度白、story-block 与 border-faint 同值但语义不同，因此不共用。
  --illustrated-group-panel-border-color: rgba(var(--illustrated-tier-accent-rgb), 0.2);
  --illustrated-group-panel-shadow: inset 0 1px 0 var(--illustrated-group-panel-highlight);
  --illustrated-group-panel-mobile-border-color: rgba(var(--illustrated-tier-accent-rgb), 0.24);
  --illustrated-group-panel-mobile-background: rgba(3, 7, 11, 0.18);
  --illustrated-story-block-background: radial-gradient(
    ellipse at center,
    rgba(30, 34, 42, 0.4) 0%,
    rgba(10, 12, 16, 0.8) 100%
  );
  --illustrated-story-block-shadow: none;
  --illustrated-text-block-border-color: rgba(255, 255, 255, 0.03);
  // text-block 有 8 层 corner gradient 叠在 --illustrated-text-block-background 之上。
  // DX 覆盖 background 时必须能单独把 corner 关掉，否则 8 层会盖住主题表面。
  --illustrated-text-block-corner-color: rgba(var(--illustrated-race-accent-rgb), 0.6);
  --illustrated-import-menu-background: rgba(20, 20, 20, 0.92);
  --illustrated-import-menu-border: rgba(255, 255, 255, 0.18);
  --illustrated-import-menu-fg: #eee;
  --illustrated-import-menu-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
  --illustrated-import-menu-hover-background: rgba(255, 255, 255, 0.08);
  --illustrated-import-menu-hover-border: rgba(255, 255, 255, 0.12);
  --illustrated-name-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  --illustrated-text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  --illustrated-heading-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);

  // 暗底文字效果必须独立于普通 heading/name token：mobile nameplate、资源值、
  // item marker 等在 default dark renderer 需要更强对比，但 light theme 应能单独关掉。
  --illustrated-mobile-name-shadow: 0 3px 16px rgba(0, 0, 0, 0.94);
  --illustrated-mobile-subtitle-shadow: 0 2px 7px rgba(0, 0, 0, 0.95);
  --illustrated-resource-label-shadow: 0 0 10px currentColor;
  --illustrated-resource-value-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  --illustrated-quote-fg: rgba(255, 255, 255, 0.96);
  --illustrated-quote-shadow: 0 2px 10px rgba(0, 0, 0, 0.64);
  // mobile quote 直接压在立绘上，不与 nameplate 共用；即使 light theme 也可能需要图片对比度。
  --illustrated-mobile-quote-fg: rgba(255, 255, 255, 0.96);
  --illustrated-mobile-quote-shadow: 0 2px 8px rgba(0, 0, 0, 0.95);
  --illustrated-item-marker-shadow: 0 0 12px currentColor;
  --illustrated-skill-marker-shadow: 0 0 10px color-mix(in srgb, currentColor 70%, transparent);
  --illustrated-profile-heading-shadow: 0 2px 8px rgba(var(--illustrated-race-accent-rgb), 0.3);
  --illustrated-story-heading-shadow: 0 0 12px rgba(var(--illustrated-tier-accent-rgb), 0.26);
  --illustrated-dialog-fg: #f8f9fa;
  --illustrated-profile-story-body-fg: #d7dce3;
  --illustrated-story-link-title-fg: #fff8da;
  --illustrated-story-link-body-fg: #d9e5f2;
  --illustrated-story-link-button-fg: #fff6d5;
  --illustrated-story-link-heading-shadow: 0 0 14px rgba(var(--illustrated-tier-accent-rgb), 0.36);

  --illustrated-page-title-fg: var(--illustrated-race-accent);
  --illustrated-page-title-shadow:
    0 0 8px rgba(var(--illustrated-race-accent-rgb), 0.55),
    0 2px 10px rgba(0, 0, 0, 0.8);
  --illustrated-attribute-value-shadow: 0 2px 15px rgba(var(--illustrated-race-accent-rgb), 0.45);
  --illustrated-item-shadow:
    inset 0 0 40px rgba(0, 0, 0, 0.8),
    0 10px 20px rgba(0, 0, 0, 0.5);
  --illustrated-nav-shadow: 0 -8px 24px rgba(0, 0, 0, 0.22);
  --illustrated-detail-wallpaper-filter: saturate(0.82) brightness(0.72);
  --illustrated-detail-wallpaper-opacity: 0.34;
  --illustrated-mobile-portrait-overlay: linear-gradient(
    180deg,
    transparent 42%,
    rgba(8, 10, 14, 0.14) 56%,
    rgba(8, 10, 14, 0.76) 80%,
    var(--illustrated-bg) 100%
  );
  --illustrated-divinity-fg: #fffdf5;
  --illustrated-divinity-fg-soft: rgba(255, 252, 242, 0.72);
  --illustrated-divinity-surface: rgba(5, 15, 32, 0.44);
  --illustrated-divinity-hero-overlay:
    radial-gradient(ellipse at 50% 0, rgba(var(--illustrated-tier-accent-rgb), 0.18), transparent 62%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(0, 0, 0, 0.12));
  --illustrated-divinity-card-overlay: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.045),
    rgba(255, 255, 255, 0.01)
  );
  --illustrated-divinity-inset-highlight: rgba(255, 255, 255, 0.06);
  --illustrated-divinity-heading-shadow: 0 3px 14px rgba(0, 0, 0, 0.55);
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

.illustrated-wrapper.is-scaled-desktop {
  height: var(--illustrated-scaled-height) !important;
  overflow: hidden;
}

.illustrated-wrapper.is-scaled-desktop .illustrated-shell {
  width: 1200px;
  height: 800px !important;
  min-height: 0;
  container-type: inline-size;
  transform: scale(var(--illustrated-desktop-scale));
  transform-origin: top left;
}

.illustrated-shell {
  position: relative;
  display: flex;
  height: min(800px, 80cqw);
  min-height: 680px;
  overflow: hidden;
  border: 1px solid var(--illustrated-shell-border-color);
  border-radius: 16px;
  background: var(--illustrated-shell-background);
  box-shadow: var(--illustrated-shell-shadow);
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
  color: var(--illustrated-fg);
  background: var(--illustrated-data-pane-background);
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

@container char-info-viewer (min-width: 901px) {
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
    font-size: calc(clamp(11px, 2.8cqw, 13px) + var(--ci-font-size-adjust, 0px));
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
  font-size: calc(18px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
}

.illustrated-skill-group + .illustrated-skill-group,
.illustrated-holding-section + .illustrated-holding-section {
  margin-top: 24px;
}

.illustrated-group-panel {
  overflow: hidden;
  margin-inline: 10px 14px;
  border: 1px solid var(--illustrated-group-panel-border-color);
  border-radius: 4px;
  background: var(--illustrated-group-panel-background);
  box-shadow: var(--illustrated-group-panel-shadow);
}

.illustrated-group-panel.is-collapsed {
  background: var(--illustrated-group-panel-collapsed-background);
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
  background: var(--illustrated-group-toggle-background);
  color: color-mix(in srgb, var(--illustrated-race-accent) 68%, #d7e0e5);
  font: inherit;
  font-size: calc(14px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.35;
  text-align: left;
  text-shadow: none;
  cursor: pointer;
}

.illustrated-group-toggle:hover,
.illustrated-group-toggle:focus-visible {
  background: var(--illustrated-group-toggle-hover-background);
  outline: none;
}

.illustrated-group-panel.is-collapsed .illustrated-group-toggle {
  border-bottom-color: transparent;
}

.illustrated-group-icon {
  color: var(--illustrated-race-accent);
  font-size: calc(13px + var(--ci-font-size-adjust, 0px));
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
  font-size: calc(18px + var(--ci-font-size-adjust, 0px));
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
  background: var(--illustrated-profile-subnav-background);
}

.illustrated-profile-subnav button {
  min-height: 40px;
  padding: 8px 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(226, 232, 240, 0.66);
  font: inherit;
  font-size: calc(13px + var(--ci-font-size-adjust, 0px));
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
  font-size: calc(12px + var(--ci-font-size-adjust, 0px));
  letter-spacing: 0.08em;
  text-align: right;
}

.illustrated-profile-story-section {
  padding: 24px 28px;
  border: 1px solid rgba(var(--illustrated-race-accent-rgb), 0.16);
  border-radius: 6px;
  background: var(--illustrated-profile-story-background);
  box-shadow: inset 0 1px 0 var(--illustrated-profile-story-highlight);
}

.illustrated-profile-story-section h3 {
  margin: 0 0 13px;
  color: var(--illustrated-race-accent);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: calc(17px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
  letter-spacing: 0.08em;
}

.illustrated-profile-story-section p {
  margin: 0;
  color: var(--illustrated-profile-story-body-fg);
  font-size: calc(14px + var(--ci-font-size-adjust, 0px));
  line-height: 1.9;
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.illustrated-story-combined-block {
  display: grid;
  gap: 18px;
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
  font-size: calc(13px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
  letter-spacing: 0.08em;
}

.illustrated-story-link-copy h3 {
  margin: 0;
  color: var(--illustrated-story-link-title-fg);
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: calc(28px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
  text-shadow: var(--illustrated-story-link-heading-shadow);
}

.illustrated-story-link-copy p {
  margin: 0;
  color: var(--illustrated-story-link-body-fg);
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
  color: var(--illustrated-story-link-button-fg);
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
  border: 1px solid var(--illustrated-import-menu-border);
  border-radius: 10px;
  background: var(--illustrated-import-menu-background);
  box-shadow: var(--illustrated-import-menu-shadow);
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
  color: var(--illustrated-import-menu-fg);
  cursor: pointer;
  font-size: calc(0.95rem + var(--ci-font-size-adjust, 0px));
  text-align: left;
}

.import-action-menu button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.import-action-menu button:hover:not(:disabled) {
  border-color: var(--illustrated-import-menu-hover-border);
  background: var(--illustrated-import-menu-hover-background);
}

.illustrated-mobile-detail-wallpaper {
  display: none;
}

@container char-info-viewer (min-width: 901px) {
  .illustrated-wrapper.is-special-npc .illustrated-shell.is-overview-tab .illustrated-panels {
    overflow-y: auto;
  }
}

@mixin illustrated-mobile-content {
  .illustrated-shell {
    flex-direction: column;
    height: 216.4251cqw;
    min-height: 0;
  }

  .illustrated-shell.is-special-npc {
    height: auto;
    aspect-ratio: 2 / 3;
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
    filter: var(--illustrated-detail-wallpaper-filter);
    transition: opacity 0.18s ease;
  }

  .illustrated-mobile-detail-wallpaper.is-visible {
    opacity: var(--illustrated-detail-wallpaper-opacity);
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
    background: var(--illustrated-detail-pane-background);
    backdrop-filter: blur(1.5px);
    -webkit-backdrop-filter: blur(1.5px);
  }

  .illustrated-shell.is-special-npc.is-skills-tab .illustrated-data-pane {
    background: color-mix(in srgb, var(--illustrated-bg) 66%, transparent);
  }

  .illustrated-desktop-header {
    display: none;
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    :deep(.illustrated-mobile-header-overlay
      .illustrated-header.compact) {
    gap: 4px;
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    :deep(.illustrated-mobile-header-overlay
      .illustrated-name:not(.illustrated-name-measure)) {
    order: 1;
    margin: 0 !important;
    font-size: calc(clamp(24px, 8cqw, 28px) + var(--ci-font-size-adjust, 0px));
    line-height: 1.12;
    text-shadow: var(--illustrated-mobile-name-shadow);
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    :deep(.illustrated-mobile-header-overlay
      .illustrated-subtitle),
  .illustrated-shell.is-special-npc.is-overview-tab
    :deep(.illustrated-mobile-header-overlay
      .illustrated-level-tier) {
    display: none;
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    :deep(.illustrated-mobile-header-overlay
      .illustrated-subtitle) {
    order: 2;
    gap: 5px;
    font-size: calc(10px + var(--ci-font-size-adjust, 0px));
    line-height: 1.35;
    text-shadow: var(--illustrated-mobile-subtitle-shadow);
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    :deep(.illustrated-mobile-header-overlay
      .illustrated-level-tier) {
    order: 3;
    margin: 2px 0 0;
    padding: 2px 0;
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    :deep(.illustrated-mobile-header-overlay
      .illustrated-level),
  .illustrated-shell.is-special-npc.is-overview-tab
    :deep(.illustrated-mobile-header-overlay
      .illustrated-tier) {
    font-size: calc(10px + var(--ci-font-size-adjust, 0px));
  }

  .illustrated-shell.is-special-npc.is-overview-tab
    :deep(.illustrated-mobile-header-overlay
      .illustrated-badge-separator) {
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
    font-size: calc(12px + var(--ci-font-size-adjust, 0px));
  }

  .illustrated-profile-story-view {
    width: 100%;
    gap: 12px;
  }

  .illustrated-profile-story-author {
    margin-right: 2px;
    font-size: calc(10px + var(--ci-font-size-adjust, 0px));
  }

  .illustrated-profile-story-section {
    padding: 15px 14px;
    border-radius: 4px;
    background: var(--illustrated-profile-story-mobile-background);
  }

  .illustrated-profile-story-section h3 {
    margin-bottom: 9px;
    font-size: calc(14px + var(--ci-font-size-adjust, 0px));
  }

  .illustrated-profile-story-section p {
    font-size: calc(12px + var(--ci-font-size-adjust, 0px));
    line-height: 1.78;
  }

  .illustrated-panels > :deep(.illustrated-overview) {
    display: none;
  }

  .illustrated-shell :deep(.illustrated-tab-scroll) {
    padding-right: 12px;
  }
}

@container char-info-viewer (max-width: 900px) {
  .illustrated-wrapper {
    max-width: min(100%, 480px);
  }

  .illustrated-wrapper.is-special-npc {
    max-width: min(100%, 414px);
  }

  @include illustrated-mobile-content;
}

@mixin illustrated-compact-mobile-content {
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
    font-size: calc(13px + var(--ci-font-size-adjust, 0px));
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
    border-color: var(--illustrated-group-panel-mobile-border-color);
    background: var(--illustrated-group-panel-mobile-background);
  }

  .illustrated-group-body {
    padding: 2px 6px 6px;
  }

  .illustrated-group-toggle {
    grid-template-columns: 13px minmax(0, 1fr) 18px;
    gap: 7px;
    min-height: 34px;
    padding: 7px 12px 7px 28px;
    font-size: calc(12px + var(--ci-font-size-adjust, 0px));
    letter-spacing: 0.07em;
  }

  .illustrated-group-chevron {
    width: 13px;
    height: 13px;
  }

  .import-action-menu {
    right: 10px;
    bottom: 64px;
    min-width: 170px;
  }
}

@container char-info-viewer (max-width: 640px) {
  @include illustrated-compact-mobile-content;
}

.illustrated-wrapper.force-mobile-layout {
  max-width: min(100%, 640px);
  @include illustrated-mobile-content;
  @include illustrated-compact-mobile-content;
}

</style>
