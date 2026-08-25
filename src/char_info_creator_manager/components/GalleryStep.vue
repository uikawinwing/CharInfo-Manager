<template>
  <div class="gallery-step">
    <section class="role-panel">
      <div class="panel-heading">
        <div>
          <h3>图片用途</h3>
          <p>唯一用途在这里集中选择；每张图片只用标签显示结果。</p>
        </div>
      </div>

      <div class="role-grid">
        <label class="field">
          <span class="field-label">主立绘</span>
          <select :value="mainViewerImageId ?? ''" @change="onMainPortraitChange">
            <option v-for="(image, index) in gallery" :key="image.id" :value="image.id">
              第 {{ index + 1 }} 张 · {{ image.title || `图片 ${index + 1}` }}
            </option>
          </select>
          <small>选择后会成为 Viewer 第一张；图片和视频都可以。</small>
        </label>

        <label class="field">
          <span class="field-label">状态栏头像</span>
          <select :value="avatarSelection" @change="onAvatarSelectionChange">
            <option value="">不设置</option>
            <option v-for="image in staticImages" :key="image.id" :value="`gallery:${image.id}`">
              第 {{ indexForImage(image) + 1 }} 张 · {{ image.title || `图片 ${indexForImage(image) + 1}` }}
            </option>
            <option value="custom">使用独立 URL</option>
          </select>
          <small>只列出静态图片；视频不会写入状态栏头像。</small>
        </label>

        <label class="field">
          <span class="field-label">角色库封面</span>
          <select :value="coverSelection" @change="onCoverSelectionChange">
            <option value="">自动选择</option>
            <option v-for="image in staticImages" :key="image.id" :value="`gallery:${image.id}`">
              第 {{ indexForImage(image) + 1 }} 张 · {{ image.title || `图片 ${indexForImage(image) + 1}` }}
            </option>
          </select>
          <small>只允许一张静态图；留空时沿用头像 / 第一张静态图的自动回退。</small>
        </label>
      </div>

      <label v-if="avatarSelection === 'custom'" class="field custom-avatar-field">
        <span class="field-label">独立头像 URL</span>
        <input
          :value="avatarUrl"
          type="url"
          inputmode="url"
          autocomplete="off"
          placeholder="https://…/avatar.webp"
          @input="emit('update:avatarUrl', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </section>

    <section class="gallery-storage-panel">
      <div class="panel-heading">
        <h3>远程 Gallery Pack</h3>
        <p>填写 ImgBed 的公开图库 API URL 后，远端 char-info-gallery-pack 会作为运行时图库；下方本地图片只作为断线 fallback。</p>
      </div>
      <label class="field">
        <span class="field-label">Gallery Pack URL <small>选填</small></span>
        <input
          :value="galleryPackUrl"
          type="url"
          inputmode="url"
          autocomplete="off"
          spellcheck="false"
          placeholder="https://…/api/public/gallery/<owner>/<album>"
          @input="emit('update:galleryPackUrl', ($event.target as HTMLInputElement).value)"
        />
        <small>只接受 HTTPS 的 char-info-gallery-pack v1。留空时使用本地图片；远端读取不会写回聊天变量或世界书。</small>
      </label>
    </section>

    <div class="image-host-links">
      <div>
        <strong>需要上传图片？</strong>
        <small>在图片托管网站上传后，请复制 HTTPS 原图直链并粘贴到下方。</small>
      </div>
      <a href="https://catbox.moe/" target="_blank" rel="noopener noreferrer">打开 Catbox</a>
      <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer">打开 ImgBB</a>
    </div>

    <div class="batch-toolbar" :class="{ active: batchMode }">
      <button type="button" class="toolbar-button" @click="toggleBatchMode">
        {{ batchMode ? '完成批量选择' : '批量选择' }}
      </button>
      <template v-if="batchMode">
        <span class="selection-count">已选择 {{ selectedIds.length }} 张</span>
        <button type="button" class="toolbar-button" :disabled="selectedIds.length === 0" @click="applyBatchVisibility(true)">
          Viewer + 相册
        </button>
        <button type="button" class="toolbar-button" :disabled="selectedIds.length === 0" @click="applyBatchVisibility(false)">
          仅相册
        </button>
        <button type="button" class="toolbar-button quiet" @click="selectAll">全选</button>
        <button type="button" class="toolbar-button quiet" :disabled="selectedIds.length === 0" @click="clearSelection">清空</button>
      </template>
      <small v-if="batchMessage" class="batch-message">{{ batchMessage }}</small>
    </div>

    <div class="gallery-list">
      <article
        v-for="(image, index) in gallery"
        :key="image.id"
        class="gallery-card"
        :class="{ selected: selectedIds.includes(image.id) }"
      >
        <label v-if="batchMode" class="batch-check" :aria-label="`选择第 ${index + 1} 张图片`">
          <input :checked="selectedIds.includes(image.id)" type="checkbox" @change="toggleSelection(image.id)" />
        </label>

        <div class="image-preview">
          <video
            v-if="galleryPreviewMediaKind(image) === 'video'"
            :key="`${image.id}:${image.previewSourceIndex}:${resolveGalleryPreviewUrl(image)}`"
            :ref="element => setGalleryPreviewElement(image, element)"
            :data-gallery-image-id="image.id"
            :src="resolveGalleryPreviewUrl(image)"
            :aria-label="`预览视频：${image.title || `第 ${index + 1} 张立绘`}；鼠标悬停播放，触屏点击播放或暂停`"
            muted
            loop
            playsinline
            preload="metadata"
            role="button"
            tabindex="0"
            title="鼠标悬停播放；触屏点击播放或暂停"
            @pointerenter="onGalleryVideoPointerEnter(image, $event)"
            @pointerleave="onGalleryVideoPointerLeave(image, $event)"
            @pointerup="onGalleryVideoPointerUp(image, $event)"
            @keydown.enter.prevent="toggleGalleryVideo(image)"
            @keydown.space.prevent="toggleGalleryVideo(image)"
            @loadeddata="onGalleryPreviewLoad(image)"
            @error="onGalleryPreviewError(image)"
          ></video>
          <img
            v-else-if="resolveGalleryPreviewUrl(image)"
            :key="`${image.id}:${image.previewSourceIndex}:${resolveGalleryPreviewUrl(image)}`"
            :ref="element => setGalleryPreviewElement(image, element)"
            :data-gallery-image-id="image.id"
            :src="resolveGalleryPreviewUrl(image)"
            :alt="image.title || `第 ${index + 1} 张立绘`"
            loading="lazy"
            referrerpolicy="no-referrer"
            @load="onGalleryPreviewLoad(image)"
            @error="onGalleryPreviewError(image)"
          />
          <span v-else aria-hidden="true">▧</span>
          <span v-if="galleryPreviewMediaKind(image) === 'video'" class="gallery-media-kind">视频</span>
        </div>

        <div class="gallery-content">
          <div class="gallery-card-heading">
            <div class="usage-pills" aria-label="图片用途">
              <span v-if="mainViewerImageId === image.id" class="usage-pill primary">主立绘</span>
              <span class="usage-pill" :class="{ album: !isViewerVisible(image) }">
                {{ isViewerVisible(image) ? 'Viewer + 相册' : '仅相册' }}
              </span>
              <span v-if="avatarImageId === image.id" class="usage-pill">头像</span>
              <span v-if="coverImageId === image.id" class="usage-pill">封面</span>
              <span v-if="galleryPreviewMediaKind(image) === 'video'" class="usage-pill media">视频</span>
            </div>
          </div>

          <div class="gallery-fields">
            <label class="field">
              <span class="field-label">图片标题</span>
              <input v-model="image.title" type="text" autocomplete="off" />
            </label>
            <div class="source-list">
              <label v-for="(_source, sourceIndex) in image.sources" :key="sourceIndex" class="field">
                <span class="field-label">
                  图片地址 {{ sourceIndex + 1 }}
                  <small>{{ sourceIndex === 0 ? '首选' : '加载失败时备用' }}</small>
                </span>
                <span class="source-input-row">
                  <input
                    v-model="image.sources[sourceIndex]"
                    type="url"
                    inputmode="url"
                    autocomplete="off"
                    placeholder="https://…/portrait.webp"
                    @input="onGallerySourceInput(image)"
                  />
                  <span class="source-order-actions">
                    <button
                      type="button"
                      class="source-order-button"
                      :disabled="sourceIndex === 0"
                      :aria-label="`上移第 ${sourceIndex + 1} 个图片地址`"
                      title="提高优先级"
                      @click="moveImageSource(image, sourceIndex, -1)"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      class="source-order-button"
                      :disabled="sourceIndex === image.sources.length - 1"
                      :aria-label="`下移第 ${sourceIndex + 1} 个图片地址`"
                      title="降低优先级"
                      @click="moveImageSource(image, sourceIndex, 1)"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      class="remove-source-button"
                      :disabled="image.sources.length === 1"
                      :aria-label="`删除第 ${sourceIndex + 1} 个图片地址`"
                      title="删除"
                      @click="removeImageSource(image, sourceIndex)"
                    >
                      ×
                    </button>
                  </span>
                </span>
              </label>
              <button type="button" class="add-source-button" @click="addImageSource(image)">＋ 添加备用图片地址</button>
            </div>
          </div>
        </div>

        <div class="gallery-actions">
          <button type="button" title="上移" :disabled="index === 0" @click="moveImage(index, -1)">↑</button>
          <button type="button" title="下移" :disabled="index === gallery.length - 1" @click="moveImage(index, 1)">↓</button>
          <button class="danger" type="button" title="删除" :disabled="gallery.length === 1" @click="removeImage(index)">×</button>
        </div>
      </article>
    </div>

    <button class="add-image-button" type="button" @click="addImage">＋ 添加一张图片</button>

    <div class="step-actions">
      <button type="button" class="secondary-button" @click="emit('previous')">上一步</button>
      <button type="button" class="primary-button" @click="emit('next')">下一步：确认写入</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import {
  normalizePortraitMediaUrlForBrowser,
  type NormalizedPortraitMedia,
  type PortraitMediaKind,
} from '../../char_info_viewer/services/imageUrl';
import {
  createMediaSourceTimeout,
  nextMediaSourceIndex,
  type MediaSourceTimeout,
} from '../../char_info_viewer/services/mediaSourceFallback';
import {
  firstStaticImage,
  firstViewerImage,
  isViewerVisible,
  preferredStaticImageUrl,
  setMainViewerImage,
  setViewerVisibility,
  type EditableGalleryImage,
} from '../galleryEditor';

const props = defineProps<{
  avatarUrl: string;
  coverUrl: string;
  galleryPackUrl: string;
  characterName: string;
  debugEnabled: boolean;
}>();

const gallery = defineModel<EditableGalleryImage[]>('gallery', { required: true });

const emit = defineEmits<{
  'update:avatarUrl': [value: string];
  'update:coverUrl': [value: string];
  'update:galleryPackUrl': [value: string];
  previous: [];
  next: [];
}>();

const avatarSelection = ref('');
const coverSelection = ref('');
const batchMode = ref(false);
const selectedIds = ref<number[]>([]);
const batchMessage = ref('');

const staticImages = computed(() => gallery.value.filter(image => !!preferredStaticImageUrl(image)));
const mainViewerImageId = computed(() => firstViewerImage(gallery.value)?.id ?? null);
const avatarImageId = computed(() => parseGallerySelectionId(avatarSelection.value));
const coverImageId = computed(() => parseGallerySelectionId(coverSelection.value));

function indexForImage(image: EditableGalleryImage): number {
  return gallery.value.findIndex(candidate => candidate.id === image.id);
}

function parseGallerySelectionId(value: string): number | null {
  if (!value.startsWith('gallery:')) return null;
  const id = Number(value.slice('gallery:'.length));
  return Number.isFinite(id) ? id : null;
}

function syncRoleSelections() {
  const avatarUrl = props.avatarUrl.trim();
  const avatarMatch = gallery.value.find(image => preferredStaticImageUrl(image) === avatarUrl);
  const avatarMedia = avatarUrl ? normalizePortraitMediaUrlForBrowser(avatarUrl) : null;
  if (avatarMedia?.kind === 'video') {
    const fallback = firstStaticImage(gallery.value);
    avatarSelection.value = fallback ? `gallery:${fallback.id}` : '';
    emit('update:avatarUrl', preferredStaticImageUrl(fallback));
  } else {
    avatarSelection.value = avatarMatch ? `gallery:${avatarMatch.id}` : avatarUrl ? 'custom' : '';
  }

  const coverMatch = gallery.value.find(image => preferredStaticImageUrl(image) === props.coverUrl.trim());
  coverSelection.value = coverMatch ? `gallery:${coverMatch.id}` : '';
}

watch(() => [props.avatarUrl, props.coverUrl, gallery.value.length], syncRoleSelections, { immediate: true });

function onMainPortraitChange(event: Event) {
  const id = Number((event.target as HTMLSelectElement).value);
  if (!Number.isFinite(id)) return;
  setMainViewerImage(gallery.value, id);
  batchMessage.value = '';
}

function onAvatarSelectionChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  avatarSelection.value = value;
  if (value === 'custom') {
    if (gallery.value.some(image => preferredStaticImageUrl(image) === props.avatarUrl.trim())) emit('update:avatarUrl', '');
    return;
  }
  const id = parseGallerySelectionId(value);
  const image = id === null ? null : gallery.value.find(candidate => candidate.id === id) ?? null;
  emit('update:avatarUrl', preferredStaticImageUrl(image));
}

function onCoverSelectionChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  coverSelection.value = value;
  const id = parseGallerySelectionId(value);
  const image = id === null ? null : gallery.value.find(candidate => candidate.id === id) ?? null;
  emit('update:coverUrl', preferredStaticImageUrl(image));
}

function syncRoleUrlsForImage(image: EditableGalleryImage) {
  if (avatarImageId.value === image.id) {
    const url = preferredStaticImageUrl(image);
    emit('update:avatarUrl', url);
    if (!url) avatarSelection.value = '';
  }
  if (coverImageId.value === image.id) {
    const url = preferredStaticImageUrl(image);
    emit('update:coverUrl', url);
    if (!url) coverSelection.value = '';
  }
}

function toggleBatchMode() {
  batchMode.value = !batchMode.value;
  selectedIds.value = [];
  batchMessage.value = '';
}

function toggleSelection(imageId: number) {
  selectedIds.value = selectedIds.value.includes(imageId)
    ? selectedIds.value.filter(id => id !== imageId)
    : [...selectedIds.value, imageId];
  batchMessage.value = '';
}

function selectAll() {
  selectedIds.value = gallery.value.map(image => image.id);
  batchMessage.value = '';
}

function clearSelection() {
  selectedIds.value = [];
  batchMessage.value = '';
}

function applyBatchVisibility(visible: boolean) {
  if (!selectedIds.value.length) return;
  if (!setViewerVisibility(gallery.value, selectedIds.value, visible)) {
    batchMessage.value = '至少要保留一张 Viewer 主立绘；请少选一张后再设为仅相册。';
    return;
  }
  batchMessage.value = visible ? '已设为 Viewer + 相册。' : '已设为仅相册。';
}

function nextImageId(): number {
  return Math.max(0, ...gallery.value.map(image => image.id)) + 1;
}

function addImage() {
  const number = gallery.value.length + 1;
  gallery.value.push({
    id: nextImageId(),
    title: number === 1 ? '主立绘' : `备用立绘 ${number}`,
    sources: [''],
    previewSourceIndex: 0,
  });
}

function removeImage(index: number) {
  if (gallery.value.length <= 1) return;
  const [removed] = gallery.value.splice(index, 1);
  selectedIds.value = selectedIds.value.filter(id => id !== removed.id);

  if (avatarImageId.value === removed.id) {
    const fallback = firstStaticImage(gallery.value);
    avatarSelection.value = fallback ? `gallery:${fallback.id}` : '';
    emit('update:avatarUrl', preferredStaticImageUrl(fallback));
  }
  if (coverImageId.value === removed.id) {
    coverSelection.value = '';
    emit('update:coverUrl', '');
  }
}

function moveImage(index: number, offset: -1 | 1) {
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= gallery.value.length) return;
  const [image] = gallery.value.splice(index, 1);
  gallery.value.splice(targetIndex, 0, image);
}

function addImageSource(image: EditableGalleryImage) {
  image.sources.push('');
}

function onGallerySourceInput(image: EditableGalleryImage) {
  image.previewSourceIndex = 0;
  syncRoleUrlsForImage(image);
}

function removeImageSource(image: EditableGalleryImage, sourceIndex: number) {
  if (image.sources.length <= 1) return;
  image.sources.splice(sourceIndex, 1);
  image.previewSourceIndex = 0;
  syncRoleUrlsForImage(image);
}

function moveImageSource(image: EditableGalleryImage, sourceIndex: number, offset: -1 | 1) {
  const targetIndex = sourceIndex + offset;
  if (targetIndex < 0 || targetIndex >= image.sources.length) return;
  const [source] = image.sources.splice(sourceIndex, 1);
  image.sources.splice(targetIndex, 0, source);
  image.previewSourceIndex = 0;
  syncRoleUrlsForImage(image);
}

function resolveGalleryPreviewSources(image: EditableGalleryImage): NormalizedPortraitMedia[] {
  return image.sources.reduce<NormalizedPortraitMedia[]>((sources, value) => {
    const media = normalizePortraitMediaUrlForBrowser(value);
    if (media && !sources.some(source => source.url === media.url)) sources.push(media);
    return sources;
  }, []);
}

function resolveGalleryPreviewMedia(image: EditableGalleryImage): NormalizedPortraitMedia | null {
  const sources = resolveGalleryPreviewSources(image);
  return sources[Math.min(image.previewSourceIndex, Math.max(0, sources.length - 1))] ?? null;
}

function resolveGalleryPreviewUrl(image: EditableGalleryImage): string {
  return resolveGalleryPreviewMedia(image)?.url ?? '';
}

function galleryPreviewMediaKind(image: EditableGalleryImage): PortraitMediaKind | null {
  return resolveGalleryPreviewMedia(image)?.kind ?? null;
}

function debugGalleryPreview(image: EditableGalleryImage, event: string, details: Record<string, unknown> = {}) {
  if (!props.debugEnabled) return;
  const sources = resolveGalleryPreviewSources(image);
  console.info('[CharInfo][ImageFallback][Creator]', {
    event,
    character: props.characterName,
    imageTitle: image.title,
    sourceIndex: image.previewSourceIndex,
    url: sources[image.previewSourceIndex]?.url ?? '',
    ...details,
  });
}

const galleryPreviewElements = new Map<number, HTMLImageElement | HTMLVideoElement>();
const galleryPreviewTimeouts = new Map<number, MediaSourceTimeout>();
const visibleGalleryPreviewIds = new Set<number>();
const activeGalleryVideoId = ref<number | null>(null);
let galleryVideoHoverTimer: number | null = null;
let galleryPreviewObserver: IntersectionObserver | null = null;

function galleryPreviewTimeoutFor(image: EditableGalleryImage): MediaSourceTimeout {
  let timeout = galleryPreviewTimeouts.get(image.id);
  if (timeout) return timeout;
  timeout = createMediaSourceTimeout(() => {
    if (!visibleGalleryPreviewIds.has(image.id)) return;
    debugGalleryPreview(image, 'timeout');
    advanceGalleryPreviewSource(image, 'timeout');
  });
  galleryPreviewTimeouts.set(image.id, timeout);
  return timeout;
}

function clearGalleryPreviewTimeout(image: EditableGalleryImage) {
  galleryPreviewTimeouts.get(image.id)?.clear();
}

function pauseGalleryVideo(imageId: number) {
  const element = galleryPreviewElements.get(imageId);
  if (element instanceof HTMLVideoElement) element.pause();
  if (activeGalleryVideoId.value === imageId) activeGalleryVideoId.value = null;
}

function pauseOtherGalleryVideos(exceptImageId: number) {
  galleryPreviewElements.forEach((element, imageId) => {
    if (imageId !== exceptImageId && element instanceof HTMLVideoElement) element.pause();
  });
  if (activeGalleryVideoId.value !== exceptImageId) activeGalleryVideoId.value = null;
}

function playGalleryVideo(image: EditableGalleryImage) {
  const element = galleryPreviewElements.get(image.id);
  if (!(element instanceof HTMLVideoElement)) return;
  if (galleryPreviewObserver && !visibleGalleryPreviewIds.has(image.id)) return;
  pauseOtherGalleryVideos(image.id);
  activeGalleryVideoId.value = image.id;
  void element.play().catch(() => {
    if (activeGalleryVideoId.value === image.id) activeGalleryVideoId.value = null;
  });
}

function toggleGalleryVideo(image: EditableGalleryImage) {
  const element = galleryPreviewElements.get(image.id);
  if (!(element instanceof HTMLVideoElement)) return;
  if (!element.paused && activeGalleryVideoId.value === image.id) pauseGalleryVideo(image.id);
  else playGalleryVideo(image);
}

function clearGalleryVideoHoverTimer() {
  if (galleryVideoHoverTimer === null) return;
  window.clearTimeout(galleryVideoHoverTimer);
  galleryVideoHoverTimer = null;
}

function onGalleryVideoPointerEnter(image: EditableGalleryImage, event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  clearGalleryVideoHoverTimer();
  galleryVideoHoverTimer = window.setTimeout(() => {
    galleryVideoHoverTimer = null;
    playGalleryVideo(image);
  }, 150);
}

function onGalleryVideoPointerLeave(image: EditableGalleryImage, event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  clearGalleryVideoHoverTimer();
  pauseGalleryVideo(image.id);
}

function onGalleryVideoPointerUp(image: EditableGalleryImage, event: PointerEvent) {
  clearGalleryVideoHoverTimer();
  if (event.pointerType !== 'mouse') toggleGalleryVideo(image);
}

function advanceGalleryPreviewSource(image: EditableGalleryImage, reason: 'error' | 'timeout') {
  clearGalleryPreviewTimeout(image);
  const sources = resolveGalleryPreviewSources(image);
  const fromIndex = image.previewSourceIndex;
  const nextIndex = nextMediaSourceIndex(fromIndex, sources.length);
  if (nextIndex !== null) {
    image.previewSourceIndex = nextIndex;
    debugGalleryPreview(image, 'fallback', { reason, fromIndex, toIndex: nextIndex });
    debugGalleryPreview(image, 'try');
    return;
  }
  debugGalleryPreview(image, 'all_failed', { reason, fromIndex });
}

function onGalleryPreviewLoad(image: EditableGalleryImage) {
  clearGalleryPreviewTimeout(image);
  debugGalleryPreview(image, 'loaded');
}

function onGalleryPreviewError(image: EditableGalleryImage) {
  pauseGalleryVideo(image.id);
  debugGalleryPreview(image, 'error');
  advanceGalleryPreviewSource(image, 'error');
}

function setGalleryPreviewElement(image: EditableGalleryImage, element: unknown) {
  const previous = galleryPreviewElements.get(image.id);
  if (previous) {
    galleryPreviewObserver?.unobserve(previous);
    pauseGalleryVideo(image.id);
  }

  if (!(element instanceof HTMLImageElement) && !(element instanceof HTMLVideoElement)) {
    galleryPreviewElements.delete(image.id);
    visibleGalleryPreviewIds.delete(image.id);
    clearGalleryPreviewTimeout(image);
    return;
  }

  galleryPreviewElements.set(image.id, element);
  if (galleryPreviewObserver) {
    galleryPreviewObserver.observe(element);
    return;
  }

  visibleGalleryPreviewIds.add(image.id);
  debugGalleryPreview(image, 'try');
  galleryPreviewTimeoutFor(image).arm();
}

function initializeGalleryPreviewObserver() {
  if (typeof IntersectionObserver === 'undefined') return;
  galleryPreviewObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const element = entry.target as HTMLImageElement | HTMLVideoElement;
      const imageId = Number(element.dataset.galleryImageId);
      const image = gallery.value.find(candidate => candidate.id === imageId);
      if (!image) return;
      if (entry.isIntersecting) {
        visibleGalleryPreviewIds.add(imageId);
        debugGalleryPreview(image, 'try');
        galleryPreviewTimeoutFor(image).arm();
      } else {
        visibleGalleryPreviewIds.delete(imageId);
        pauseGalleryVideo(imageId);
        clearGalleryPreviewTimeout(image);
      }
    });
  });
  galleryPreviewElements.forEach(element => galleryPreviewObserver?.observe(element));
}

onMounted(initializeGalleryPreviewObserver);

onBeforeUnmount(() => {
  clearGalleryVideoHoverTimer();
  galleryPreviewObserver?.disconnect();
  galleryPreviewObserver = null;
  galleryPreviewElements.forEach((element, imageId) => {
    if (element instanceof HTMLVideoElement) pauseGalleryVideo(imageId);
  });
  galleryPreviewTimeouts.forEach(timeout => timeout.dispose());
  galleryPreviewTimeouts.clear();
  galleryPreviewElements.clear();
  visibleGalleryPreviewIds.clear();
});
</script>

<style scoped lang="scss">
.gallery-step {
  display: grid;
  gap: 12px;
}

.role-panel,
.gallery-storage-panel,
.batch-toolbar {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
}

.role-panel {
  padding: 16px;
  background: color-mix(in srgb, var(--surface-raised) 74%, transparent);
}

.panel-heading h3,
.panel-heading p {
  margin: 0;
}

.panel-heading h3 {
  color: var(--text);
  font-size: 0.92rem;
}

.panel-heading p,
.field small,
.gallery-storage-toggle small,
.gallery-storage-message,
.batch-message {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.role-grid,
.gallery-storage-fields,
.gallery-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.custom-avatar-field {
  max-width: 620px;
}

.field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.field-label {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.field-label small {
  margin-left: 5px;
  font-weight: 500;
}

input,
select {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  box-sizing: border-box;
  padding: 8px 10px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  font: inherit;
}

input:focus,
select:focus {
  outline: 2px solid color-mix(in srgb, var(--primary) 48%, transparent);
  outline-offset: 1px;
}

.gallery-storage-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.gallery-storage-toggle input {
  width: 18px;
  min-height: 18px;
  height: 18px;
  margin-top: 2px;
  padding: 0;
  accent-color: var(--primary);
}

.gallery-storage-toggle span {
  display: grid;
  gap: 3px;
}

.gallery-storage-toggle strong {
  color: var(--text-secondary);
  font-size: 12px;
}

.gallery-storage-fields {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gallery-storage-fields .field-full {
  grid-column: 1 / -1;
}

.gallery-storage-message {
  margin: 0;
}

.gallery-storage-errors {
  margin: 0;
  padding: 10px 12px 10px 30px;
  border: 1px solid color-mix(in srgb, #ef8585 48%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, #ef8585 9%, transparent);
  color: #f2a2a2;
  font-size: 11px;
  line-height: 1.55;
}

.image-host-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
}

.image-host-links > div {
  display: grid;
  flex: 1 1 260px;
  gap: 2px;
}

.image-host-links strong {
  color: var(--text);
  font-size: 0.82rem;
}

.image-host-links small {
  color: var(--text-muted);
  font-size: 0.7rem;
}

.image-host-links a,
.toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 7px 11px;
  color: var(--primary);
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  font-size: 0.75rem;
  text-decoration: none;
  cursor: pointer;
}

.batch-toolbar {
  grid-template-columns: repeat(6, max-content);
  align-items: center;
  padding: 10px 12px;
}

.batch-toolbar:not(.active) {
  grid-template-columns: max-content;
}

.selection-count {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.toolbar-button.quiet {
  color: var(--text-secondary);
}

.toolbar-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.batch-message {
  grid-column: 1 / -1;
}

.gallery-list {
  display: grid;
  gap: 12px;
}

.gallery-card {
  position: relative;
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) auto;
  gap: 13px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 13px;
}

.gallery-card.selected {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary-soft) 45%, var(--surface));
}

.batch-check {
  position: absolute;
  z-index: 4;
  top: 8px;
  left: 8px;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  background: rgba(8, 12, 18, 0.84);
  border-radius: 8px;
}

.batch-check input {
  width: 17px;
  min-height: 17px;
  height: 17px;
  padding: 0;
  accent-color: var(--primary);
}

.image-preview {
  position: relative;
  display: grid;
  min-height: 116px;
  overflow: hidden;
  place-items: center;
  color: var(--text-muted);
  background: var(--surface-soft);
  border-radius: 9px;
}

.image-preview img,
.image-preview video {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 116px;
  object-fit: cover;
}

.image-preview video {
  cursor: pointer;
  pointer-events: auto;
}

.image-preview video:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.gallery-media-kind,
.storage-pill {
  position: absolute;
  z-index: 2;
  padding: 3px 6px;
  color: var(--text);
  background: rgba(8, 12, 18, 0.78);
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
}

.gallery-media-kind {
  right: 6px;
  bottom: 6px;
}

.storage-pill {
  left: 6px;
  bottom: 6px;
}

.storage-pill.extension {
  color: #071310;
  background: var(--primary);
}

.gallery-content {
  display: grid;
  min-width: 0;
  gap: 9px;
}

.gallery-card-heading {
  min-height: 22px;
}

.usage-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.usage-pill {
  padding: 3px 7px;
  color: var(--text-secondary);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.2;
}

.usage-pill.primary {
  color: #071310;
  background: var(--primary);
  border-color: var(--primary);
}

.usage-pill.album {
  color: var(--text-muted);
}

.usage-pill.media {
  border-style: dashed;
}

.gallery-fields {
  grid-template-columns: minmax(140px, 0.42fr) minmax(220px, 1fr);
}

.source-list {
  display: grid;
  gap: 9px;
}

.source-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px;
}

.source-order-actions {
  display: flex;
  gap: 5px;
}

.source-order-button,
.remove-source-button,
.add-source-button,
.gallery-actions button {
  color: var(--text-secondary);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.source-order-button,
.remove-source-button {
  width: 34px;
  min-height: 42px;
}

.source-order-button:disabled,
.remove-source-button:disabled,
.gallery-actions button:disabled {
  opacity: 0.45;
  cursor: default;
}

.remove-source-button,
.gallery-actions .danger {
  color: var(--danger);
}

.add-source-button {
  min-height: 36px;
  padding: 7px 10px;
  justify-self: start;
  color: var(--primary);
}

.gallery-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gallery-actions button {
  width: 38px;
  height: 32px;
}

.add-image-button,
.secondary-button,
.primary-button {
  min-height: 42px;
  padding: 9px 15px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
}

.add-image-button {
  width: 100%;
  color: var(--primary);
  background: transparent;
  border: 1px dashed var(--border-strong);
}

.secondary-button {
  color: var(--text);
  background: var(--surface-soft);
  border: 1px solid var(--border);
}

.primary-button {
  color: #071310;
  background: var(--primary);
  border: 1px solid var(--primary);
}

.step-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 4px;
}

@media (max-width: 900px) {
  .role-grid,
  .gallery-storage-fields,
  .gallery-fields {
    grid-template-columns: 1fr;
  }

  .batch-toolbar,
  .batch-toolbar:not(.active) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .batch-toolbar .toolbar-button,
  .batch-toolbar .selection-count {
    width: 100%;
  }

  .gallery-card {
    grid-template-columns: 84px minmax(0, 1fr);
  }

  .image-preview,
  .image-preview img,
  .image-preview video {
    min-height: 96px;
  }

  .gallery-actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
  }

  .gallery-actions button {
    width: 44px;
    min-height: 40px;
  }
}
</style>
