<template>
  <aside class="illustrated-portrait-pane" :class="{ 'force-mobile-layout': forceMobileLayout }">
    <div v-if="!portraitLoaded && !portraitLoadFailed" class="illustrated-portrait-loading" role="status">
      <span aria-hidden="true">◇</span>
      <small>立绘载入中</small>
    </div>
    <video
      v-if="isVideoPortrait && !portraitLoadFailed"
      ref="videoElement"
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
      @loadeddata="props.portrait.onPortraitLoaded"
      @error="props.portrait.onPortraitLoadError"
    ></video>
    <img
      v-else-if="!portraitLoadFailed"
      ref="imageElement"
      :key="portraitMediaUrl"
      class="illustrated-portrait-image"
      :class="{ 'is-loaded': portraitLoaded }"
      :src="portraitMediaUrl"
      :alt="vm.nameText"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      @load="props.portrait.onPortraitLoaded"
      @error="props.portrait.onPortraitLoadError"
    />
    <section v-else class="illustrated-portrait-failure" role="status">
      <strong>立绘无法加载</strong>
      <p>可能是网络、代理或资源地址不可用。</p>
      <div class="illustrated-portrait-failure-actions">
        <button type="button" @click="props.portrait.retryPortraitLoad">重试</button>
        <button type="button" @click="$emit('fallbackToDefault')">切换到默认版</button>
      </div>
    </section>
    <div v-if="isOverviewTab && hasMultiplePortraits" class="illustrated-portrait-navigation">
      <button type="button" aria-label="上一张立绘" @click="props.portrait.switchPortrait(-1)">‹</button>
      <button type="button" aria-label="下一张立绘" @click="props.portrait.switchPortrait(1)">›</button>
    </div>
    <div v-if="isOverviewTab" class="illustrated-mobile-overview-overlay">
      <button
        v-if="vm.entranceQuoteText"
        class="illustrated-mobile-entrance-quote"
        type="button"
        :aria-label="`查看${vm.nameText}的完整台词`"
        title="查看完整台词"
        @click="$emit('openEntranceQuote', $event)"
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { CharacterViewModel } from '../../../services/characterViewModel';
import type { IllustratedPortraitController } from '../core/useIllustratedPortrait';
import IllustratedHeader from './IllustratedHeader.vue';

/**
 * 默认立绘面板：只负责「怎么画」，行为全部来自 core 的 portrait controller。
 * 移动端顶部姓名 / 等级条样式由父级 renderer 通过 `:deep()` 覆盖，因此本组件根元素
 * 必须保持 `position: relative` 且不创建新的层叠上下文。
 */
const props = defineProps<{
  vm: CharacterViewModel;
  portrait: IllustratedPortraitController;
  isOverviewTab: boolean;
  forceMobileLayout: boolean;
}>();

defineEmits<{
  fallbackToDefault: [];
  openEntranceQuote: [trigger: Event];
}>();

/**
 * 状态通过 `computed` 逐个包一层，而不是在 setup 里解构 `props.portrait`。
 * 解构只在 setup 执行一次，若父级将来整体替换 controller 对象，这里会永久
 * 指向旧对象；`computed` 每次读取都回到 `props.portrait`，因此是 replacement-safe。
 * 动作（switch / retry / load 回调）则直接从 `props.portrait` 取，不缓存函数引用。
 */
const portraitLoaded = computed(() => props.portrait.portraitLoaded.value);
const portraitLoadFailed = computed(() => props.portrait.portraitLoadFailed.value);
const portraitMediaUrl = computed(() => props.portrait.portraitMediaUrl.value);
const hasMultiplePortraits = computed(() => props.portrait.hasMultiplePortraits.value);
const isVideoPortrait = computed(() => props.portrait.isVideoPortrait.value);

const imageElement = ref<HTMLImageElement | null>(null);
const videoElement = ref<HTMLVideoElement | null>(null);

/**
 * 移动端详情页需要一张「当前立绘的静态快照」当背景。
 *
 * 这个能力归立绘模块所有：父级只调用 `captureCurrentFrame()` 并把结果画到自己的
 * canvas 上，不需要知道当前媒体是 `<img>` 还是 `<video>`，也不接触任何 DOM 节点。
 * 将来 DX 换成别的立绘实现时，只要同样提供这个能力，父级无需任何改动。
 *
 * @returns 可用于绘制的媒体元素与它的自然尺寸；当前立绘未就绪时返回 null。
 */
function captureCurrentFrame(): {
  source: CanvasImageSource;
  width: number;
  height: number;
} | null {
  const source = isVideoPortrait.value ? videoElement.value : imageElement.value;
  if (!source) return null;

  const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!width || !height) return null;

  return { source, width, height };
}

defineExpose({ captureCurrentFrame });
</script>

<style scoped lang="scss">
.illustrated-portrait-pane {
  position: relative;
  flex: 0 0 45%;
  min-width: 0;
  background: var(--illustrated-portrait-pane-background);
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
  font-size: calc(clamp(28px, 5cqw, 54px) + var(--ci-font-size-adjust, 0px));
  text-shadow: 0 0 20px rgba(var(--illustrated-soft-accent-rgb), 0.38);
  animation: illustrated-portrait-pulse 1.2s ease-in-out infinite alternate;
}

.illustrated-portrait-loading small {
  font-size: calc(12px + var(--ci-font-size-adjust, 0px));
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
  font-size: calc(20px + var(--ci-font-size-adjust, 0px));
}

.illustrated-portrait-failure p {
  max-width: 22em;
  margin: 10px 0 20px;
  color: rgba(248, 249, 250, 0.76);
  font-size: calc(14px + var(--ci-font-size-adjust, 0px));
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

/**
 * 移动端立绘布局。`$root` 可注入，因此同一套规则既能由 `@container` 查询触发，
 * 也能由父级 renderer 的 `force-mobile-layout` class 触发，阈值与重构前完全一致。
 * 写法沿用 IllustratedTabNav.vue 的既有范式，不引入额外桥接 class。
 */
@mixin illustrated-portrait-mobile-content($root: '.illustrated-portrait-pane') {
  #{$root} {
    flex: 1 1 auto;
    min-height: 0;
  }

  .illustrated-shell.is-detail-tab #{$root} {
    display: none;
  }

  #{$root}::after {
    background: linear-gradient(to bottom, transparent 65%, var(--illustrated-bg) 100%);
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

  .illustrated-shell.is-special-npc.is-overview-tab #{$root}::after {
    background: var(--illustrated-mobile-portrait-overlay);
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
    font-size: calc(clamp(12px, 3.4cqw, 14px) + var(--ci-font-size-adjust, 0px));
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
    font-size: calc(11px + var(--ci-font-size-adjust, 0px));
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
    font-size: calc(18px + var(--ci-font-size-adjust, 0px));
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
}

@mixin illustrated-portrait-compact-content($root: '.illustrated-portrait-pane') {
  .illustrated-mobile-overview-overlay {
    right: 14px;
    bottom: 18px;
    left: 14px;
  }

  .illustrated-mobile-header-overlay {
    padding: 9px 10px;
  }
}

@container char-info-viewer (max-width: 900px) {
  @include illustrated-portrait-mobile-content;
}

@container char-info-viewer (max-width: 640px) {
  @include illustrated-portrait-compact-content;
}

/**
 * 顺序敏感：`mobile-content` 必须先 include，`compact-content` 后 include。
 * 两者都会设置 `.illustrated-mobile-overview-overlay` 的几何，
 * 保持原顺序才能让 force-mobile 路径与重构前一致（compact 的 14px 覆盖 mobile 的 18px）。
 */
@include illustrated-portrait-mobile-content('.illustrated-portrait-pane.force-mobile-layout');
@include illustrated-portrait-compact-content('.illustrated-portrait-pane.force-mobile-layout');
</style>
