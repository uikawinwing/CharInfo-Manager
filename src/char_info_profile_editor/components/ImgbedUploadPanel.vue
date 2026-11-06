<template>
  <section class="upload-panel">
    <div class="upload-connection">
      <span v-if="state.status === 'connected'" class="upload-connection-label">
        <span aria-hidden="true" class="upload-connected-dot"></span>
        已连接{{ state.accountName ? ` · ${state.accountName}` : '' }}
      </span>
      <span v-else class="upload-connection-label">
        {{ state.status === 'connecting' || state.status === 'loading' ? '连接 ImgBed 中…' : '尚未连接 ImgBed' }}
      </span>
      <button
        v-if="state.status !== 'connected' && state.status !== 'connecting' && state.status !== 'loading'"
        class="toolbar-button"
        type="button"
        :disabled="busy"
        @click="connect"
      >
        连接 ImgBed
      </button>
      <button
        v-if="state.status === 'connected'"
        class="toolbar-button quiet"
        type="button"
        :disabled="busy"
        @click="disconnect"
      >
        断开
      </button>
      <button
        v-if="busy || state.status === 'loading' || state.status === 'connecting'"
        class="toolbar-button"
        type="button"
        @click="cancel"
      >
        取消操作
      </button>
    </div>
    <div ref="launcherHost" class="upload-launcher"></div>
    <p v-if="state.status === 'error' && state.message" class="upload-inline-error" role="alert">{{ state.message }}</p>
    <button v-if="state.status === 'connected' && !loaded && !busy" class="toolbar-button" type="button" @click="load">
      重新读取图片
    </button>
    <button v-if="mismatched && !requestId && !busy" class="toolbar-button" type="button" @click="discardDraft">
      放弃更改并重新读取
    </button>
    <button
      v-if="canRebindNewAlbumAccount"
      class="toolbar-button"
      type="button"
      :disabled="busy"
      @click="useCurrentAccount"
    >
      确认使用当前账号（保留文件）
    </button>
    <template v-if="state.status === 'connected'">
      <label class="upload-file-picker" :class="{ disabled: busy || !!requestId || !loaded }">
        <span>＋ 添加图片或视频</span>
        <input
          type="file"
          :accept="IMG_BED_UPLOAD_TYPES.join(',')"
          multiple
          :disabled="busy || !!requestId || !loaded"
          @change="selectFiles"
        />
      </label>
      <ul v-if="entries.length" class="upload-media-list" aria-label="图库图片顺序">
        <li v-for="(item, index) in entries" :key="item.id" class="upload-media-row">
          <div class="upload-media-preview">
            <video
              v-if="item.kind === 'video'"
              :src="item.preview"
              controls
              muted
              playsinline
              preload="metadata"
              referrerpolicy="no-referrer"
            ></video>
            <span v-else-if="!imagePreviewUrl(item)" class="upload-preview-fallback">无预览</span>
            <img
              v-else
              :key="`${item.id}:${imagePreviewUrl(item)}`"
              :src="imagePreviewUrl(item)"
              alt=""
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="onImagePreviewError(item)"
            />
          </div>
          <div class="upload-media-info">
            <input
              v-if="item.file && editingTitleIds.has(item.id)"
              class="upload-title-input"
              :value="item.title"
              type="text"
              maxlength="500"
              autocomplete="off"
              :disabled="busy || !!requestId"
              :aria-label="`第 ${index + 1} 张图片的图库名称`"
              @input="rename(item, $event)"
              @blur="finishNameEdit(item)"
              @keydown.enter.prevent="finishNameEdit(item)"
            />
            <template v-else>
              <span class="upload-display-title">{{ displayImgbedMediaTitle(item.title, index) }}</span>
              <button
                v-if="item.file"
                type="button"
                class="upload-rename-button"
                :disabled="busy || !!requestId"
                :aria-label="`编辑第 ${index + 1} 张图片名称`"
                @click="startNameEdit(item)"
              >
                改名
              </button>
            </template>
            <span class="upload-media-meta">{{ item.file ? '待上传' : index === 0 ? '主立绘' : '已保存' }}</span>
          </div>
          <div class="upload-media-actions" role="group" :aria-label="`第 ${index + 1} 张图片的操作`">
            <button
              class="toolbar-button upload-icon-button"
              type="button"
              aria-label="上移"
              title="上移"
              :disabled="busy || !!requestId || index === 0"
              @click="move(index, -1)"
            >
              ↑
            </button>
            <button
              class="toolbar-button upload-icon-button"
              type="button"
              aria-label="下移"
              title="下移"
              :disabled="busy || !!requestId || index === entries.length - 1"
              @click="move(index, 1)"
            >
              ↓
            </button>
            <button
              class="toolbar-button upload-icon-button upload-remove-button"
              type="button"
              aria-label="移除"
              title="从图库移除"
              :disabled="busy || !!requestId"
              @click="remove(index)"
            >
              ×
            </button>
          </div>
        </li>
      </ul>
      <div v-if="dirty" class="upload-panel-actions">
        <button
          type="button"
          class="toolbar-button upload-commit-button"
          :disabled="busy || !loaded || !dirty || !entries.length"
          @click="saveFromPanel"
        >
          {{ busy ? '正在上传…' : '上传并保存图库' }}
        </button>
      </div>
    </template>
    <section
      v-if="uploadStage !== 'idle' && uploadStage !== 'success'"
      class="upload-progress"
      :class="{ 'has-error': uploadStage === 'error', 'is-complete': uploadStage === 'success' }"
    >
      <div class="upload-progress-heading" role="status" aria-live="polite">
        <span v-if="uploadRunning" class="upload-spinner" aria-hidden="true"></span>
        <strong>{{
          uploadStage === 'error'
            ? '操作未完成'
            : uploadStage === 'success'
              ? '图库上传完成'
              : uploadStages[stageIndex]?.label
        }}</strong>
        <span class="upload-elapsed">已用时 {{ elapsedLabel }}</span>
      </div>
      <ol class="upload-progress-steps" aria-label="上传操作阶段">
        <li
          v-for="(step, index) in uploadStages"
          :key="step.key"
          :class="{
            complete: uploadStage === 'success' || index < stageIndex,
            active: uploadRunning && index === stageIndex,
            failed: uploadStage === 'error' && index === stageIndex,
          }"
        >
          <span class="upload-step-dot">{{ uploadStage === 'success' || index < stageIndex ? '✓' : index + 1 }}</span>
          <span>{{ step.label }}</span>
        </li>
      </ol>
      <p class="upload-progress-detail">{{ progressDescription }}</p>
      <p v-if="uploadRunning && quietSeconds >= 15" class="upload-wait-note">
        已 {{ quietSeconds }} 秒未收到新进度。操作仍在等待服务器响应；这不代表已经失败，请勿刷新页面。
      </p>
      <p v-if="uploadStage === 'error'" class="upload-error-detail">
        失败位置：{{ uploadStages[stageIndex]?.label }}。{{ message }}
      </p>
      <details class="upload-diagnostic">
        <summary>查看操作记录（可用于排查）</summary>
        <ol>
          <li v-for="(entry, index) in uploadLog" :key="index">{{ entry }}</li>
        </ol>
      </details>
    </section>
    <p v-if="uploadStage === 'success'" class="upload-saved" role="status">✓ 图库已更新，图片选择已同步</p>
    <p v-if="hasPendingMedia" class="upload-pending-note">有待上传图片 · 离开页面会丢失</p>
    <p v-if="visibleMessage" role="status">{{ visibleMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { refreshRemoteGallery } from '../../char_info_viewer/services/remoteGalleryService';
import type { RemoteGalleryPayload } from '../../char_info_shared/remoteGallery';
import { displayImgbedMediaTitle, IMG_BED_ORIGIN, parseImgbedGalleryUrl } from '../services/imgbedBridge';
import {
  createImgbedUploadId,
  IMG_BED_UPLOAD_TYPES,
  IMG_BED_UPLOAD_CHARACTER_NAME_MAX_LENGTH,
  type ImgbedUploadBridge,
} from '../services/imgbedUploadBridge';

const props = defineProps<{
  bridge?: ImgbedUploadBridge;
  remoteGalleryUrl: string;
  characterName: string;
  galleryPreview?: RemoteGalleryPayload | null;
}>();
const emit = defineEmits<{ 'update:remoteGalleryUrl': [value: string] }>();
type Entry = { id: string; title: string; kind: 'image' | 'video'; preview: string; file?: File };
const entries = ref<Entry[]>([]);
const editingTitleIds = ref(new Set<string>());

function startNameEdit(item: Entry) {
  editingTitleIds.value = new Set([...editingTitleIds.value, item.id]);
}
function finishNameEdit(item: Entry) {
  if (!item.title.trim() && item.file) item.title = item.file.name;
  const next = new Set(editingTitleIds.value);
  next.delete(item.id);
  editingTitleIds.value = next;
}
// One short-lived network failure should not permanently turn an image into "无预览".
const failedImagePreviews = ref(new Map<string, number>());

// The public Gallery Pack gives us a versioned, already verified WebP thumbnail.
// Reuse its version rather than manually stripping ?v= and requesting an unversioned URL.
// The 64px file row uses 160px WebP first; only failed requests fall back to 720px WebP.
function imagePreviewUrl(item: Entry): string {
  const failures = failedImagePreviews.value.get(item.id) ?? 0;
  if (failures >= (item.file ? 1 : 2)) return '';
  if (item.file) return item.preview;
  try {
    const original = new URL(item.preview);
    if (original.origin === IMG_BED_ORIGIN && original.pathname.startsWith('/file/users/')) {
      const thumbPath = original.pathname.replace(/^\/file\//, '/thumb/');
      const published = props.galleryPreview?.gallery.find(image => {
        if (!image.thumbnail) return false;
        try {
          const thumbnail = new URL(image.thumbnail);
          return thumbnail.origin === IMG_BED_ORIGIN && thumbnail.pathname === thumbPath;
        } catch {
          return false;
        }
      });
      const url = published?.thumbnail ? new URL(published.thumbnail) : original;
      url.pathname = thumbPath;
      if (!published?.thumbnail) url.search = '';
      if (failures === 0) url.searchParams.set('variant', 'avatar');
      else url.searchParams.delete('variant');
      return url.toString();
    }
  } catch {
    // Unknown external URLs keep their source but cannot request ImgBed variants.
  }
  return failures === 0 ? item.preview : '';
}
function onImagePreviewError(item: Entry) {
  const url = imagePreviewUrl(item);
  const failures = failedImagePreviews.value.get(item.id) ?? 0;
  console.warn('[CharInfo ImgBed Preview] 图片加载失败', { source: url, attempt: failures + 1 });
  failedImagePreviews.value = new Map([...failedImagePreviews.value, [item.id, failures + 1]]);
}
watch(
  () => props.galleryPreview,
  () => {
    failedImagePreviews.value = new Map();
  },
);

// Gallery Pack intentionally exposes WebP display URLs rather than the original
// /file/ URL. Match the same ImgBed owner/file path without weakening album checks.
function matchesSavedGallerySource(savedFileUrl: string, sources: readonly string[]): boolean {
  return sources.some(source => {
    if (source === savedFileUrl) return true;
    try {
      const stored = new URL(savedFileUrl);
      const display = new URL(source);
      if (
        stored.origin !== IMG_BED_ORIGIN ||
        display.origin !== IMG_BED_ORIGIN ||
        !stored.pathname.startsWith('/file/users/')
      )
        return false;
      if (!display.pathname.startsWith('/thumb/users/') && !display.pathname.startsWith('/file/users/')) return false;
      const originalId = stored.pathname.slice('/file/'.length);
      const displayedId = display.pathname.replace(/^\/(?:thumb|file)\//, '');
      return originalId === displayedId;
    } catch {
      return false;
    }
  });
}
const launcherHost = ref<HTMLDivElement | null>(null);
const hasPendingMedia = computed(() => entries.value.some(item => !!item.file));
const hasUnsavedChanges = computed(() => dirty.value || !!requestId.value);
const visibleMessage = computed(() => {
  const value = message.value;
  if (!value || value === state.value.message) return '';
  if (state.value.status === 'connected' && loaded.value && !busy.value && value.includes('ImgBed 正在处理上一次操作'))
    return '';
  return value;
});
const state = ref<ReturnType<ImgbedUploadBridge['getState']>>({ status: 'idle' });
const busy = ref(false);
const loaded = ref(false);
const message = ref('');
const mismatched = ref(false);
type UploadStage = 'idle' | 'checking' | 'uploading' | 'saving' | 'verifying' | 'success' | 'error';
const uploadStages = [
  { key: 'checking', label: '验证 ImgBed 授权' },
  { key: 'uploading', label: '传送图片到 ImgBed' },
  { key: 'saving', label: '保存图库成员与顺序' },
  { key: 'verifying', label: '校验公开图库链接' },
] as const;
const uploadStage = ref<UploadStage>('idle');
const failedStage = ref<UploadStage>('checking');
const uploadRunning = computed(() => !['idle', 'success', 'error'].includes(uploadStage.value));
const stageIndex = computed(() => {
  if (uploadStage.value === 'success') return uploadStages.length - 1;
  const key = uploadStage.value === 'error' ? failedStage.value : uploadStage.value;
  return Math.max(
    0,
    uploadStages.findIndex(step => step.key === key),
  );
});
const progressDescription = ref('');
const uploadLog = ref<string[]>([]);
const uploadStartedAt = ref(0);
const lastProgressAt = ref(0);
const uploadNow = ref(0);
const completedFiles = ref(0);
const totalFiles = ref(0);
let uploadTimer: ReturnType<typeof setInterval> | null = null;
let lastHeartbeatSecond = 0;
const elapsedSeconds = computed(() => Math.max(0, Math.floor((uploadNow.value - uploadStartedAt.value) / 1000)));
const elapsedLabel = computed(() => {
  const seconds = elapsedSeconds.value;
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
});
const quietSeconds = computed(() => Math.max(0, Math.floor((uploadNow.value - lastProgressAt.value) / 1000)));
function stopUploadTimer() {
  if (uploadTimer !== null) clearInterval(uploadTimer);
  uploadTimer = null;
  uploadNow.value = Date.now();
}
function logUpload(description: string) {
  const note = `[${elapsedLabel.value}] ${description}`;
  uploadLog.value.push(note);
  // Log only public stage/count metadata, never credentials, account identifiers or file content.
  console.info('[CharInfo ImgBed Upload]', note);
}
function setUploadStage(stage: UploadStage, detail: string) {
  const changed = uploadStage.value !== stage;
  uploadStage.value = stage;
  progressDescription.value = detail;
  uploadNow.value = Date.now();
  lastProgressAt.value = uploadNow.value;
  if (changed) logUpload(detail);
  if (stage === 'success' || stage === 'error') stopUploadTimer();
}
function startUpload(total: number, resumeVerification: boolean) {
  stopUploadTimer();
  const started = Date.now();
  uploadStartedAt.value = started;
  uploadNow.value = started;
  lastProgressAt.value = started;
  totalFiles.value = total;
  completedFiles.value = 0;
  uploadLog.value = [];
  lastHeartbeatSecond = 0;
  uploadTimer = setInterval(() => {
    uploadNow.value = Date.now();
    if (elapsedSeconds.value >= lastHeartbeatSecond + 15) {
      lastHeartbeatSecond = elapsedSeconds.value;
      logUpload(
        `仍在等待 ImgBed：${uploadStages[stageIndex.value]?.label}，${quietSeconds.value} 秒没有新进度（${completedFiles.value}/${totalFiles.value} 个文件已确认）`,
      );
    }
  }, 1000);
  setUploadStage(
    resumeVerification ? 'verifying' : 'checking',
    resumeVerification ? '已上传成功，正在重新验证公开图库地址…' : '正在重新确认 Discord 账号与 ImgBed 授权…',
  );
}
function handleUploadProgress(progress: { phase: 'uploading' | 'saving'; completed: number; total: number }) {
  const next = progress.phase === 'saving' ? 'saving' : 'uploading';
  const newCount = progress.completed !== completedFiles.value;
  completedFiles.value = progress.completed;
  totalFiles.value = progress.total;
  const detail =
    next === 'saving'
      ? '文件处理完成，ImgBed 正在保存相册成员、名称与顺序…'
      : progress.completed === 0
        ? `授权已通过，正在提交 ${progress.total} 个文件，等待首个服务器进度…`
        : `ImgBed 已确认完成 ${progress.completed}/${progress.total} 个文件。`;
  if (next !== uploadStage.value) setUploadStage(next, detail);
  else {
    progressDescription.value = detail;
    uploadNow.value = Date.now();
    if (newCount) {
      lastProgressAt.value = uploadNow.value;
      logUpload(detail);
    }
  }
}
function failUpload(errorMessage: string) {
  if (uploadStage.value !== 'error') failedStage.value = uploadStage.value === 'idle' ? 'checking' : uploadStage.value;
  setUploadStage('error', errorMessage);
}
let albumId: string | null = null;
let loadedAccountId: string | undefined;
let loadedKey = '';
const dirty = ref(false);
const canRebindNewAlbumAccount = computed(
  () =>
    dirty.value &&
    !busy.value &&
    !requestId.value &&
    albumId === null &&
    loaded.value &&
    state.value.status === 'connected' &&
    !!state.value.accountId &&
    loadedAccountId !== state.value.accountId,
);
const requestId = ref('');
let request: Parameters<ImgbedUploadBridge['save']>[0] | null = null;
let completed: Awaited<ReturnType<ImgbedUploadBridge['save']>> | null = null;
let unsubscribe: (() => void) | undefined;
let loadGeneration = 0;
let saveGeneration = 0;

function cancel() {
  saveGeneration += 1;
  loadGeneration += 1;
  if (!loaded.value) loadedKey = '';
  if (uploadRunning.value) {
    failUpload('操作已取消，上传状态尚未确认；所选文件和请求会保留供重试。');
  }
  busy.value = false;
  props.bridge?.cancel();
}

function clearEntries() {
  editingTitleIds.value = new Set();
  entries.value.forEach(item => {
    if (item.file) URL.revokeObjectURL(item.preview);
  });
  entries.value = [];
}
function changed() {
  dirty.value = true;
}
function rename(item: Entry, event: Event) {
  if (!item.file || busy.value || requestId.value) return;
  item.title = (event.target as HTMLInputElement).value;
  changed();
}
async function load() {
  if (!props.bridge || state.value.status !== 'connected') return;
  const id = parseImgbedGalleryUrl(props.remoteGalleryUrl);
  const key = `${props.remoteGalleryUrl.trim()}\n${props.characterName.trim()}`;
  if (key === loadedKey) {
    mismatched.value = false;
    return;
  }
  if (dirty.value) {
    mismatched.value = true;
    message.value = requestId.value
      ? '角色或图库已改变。请恢复原角色和图库，再点击保存重试。'
      : '角色或图库已改变。可放弃待上传更改并载入当前图库，或恢复原角色和图库。';
    return;
  }
  mismatched.value = false;
  loadedKey = key;
  loadedAccountId = state.value.accountId;
  const generation = ++loadGeneration;
  loaded.value = false;
  albumId = id;
  clearEntries();
  if (!id) {
    loaded.value = true;
    return;
  }
  busy.value = true;
  try {
    const result = await props.bridge.readGallery(id, props.characterName.trim());
    if (generation !== loadGeneration) return;
    entries.value = result.items.map(item => ({ ...item, preview: item.url }));
    failedImagePreviews.value = new Map();
    loaded.value = true;
  } catch (error) {
    if (generation === loadGeneration) {
      loadedKey = '';
      message.value = error instanceof Error ? error.message : String(error);
    }
  } finally {
    if (generation === loadGeneration) busy.value = false;
  }
}
async function reload() {
  if (hasUnsavedChanges.value || busy.value) throw new Error('请先完成或取消当前上传，再刷新图库。');
  if (!props.bridge || state.value.status !== 'connected') return;
  loadedKey = '';
  await load();
  if (!loaded.value) throw new Error(message.value || '无法同步 ImgBed 文件列表。');
}
function discardDraft() {
  if (requestId.value || busy.value) return;
  dirty.value = false;
  loadedKey = '';
  message.value = '';
  void load();
}
function useCurrentAccount() {
  if (!canRebindNewAlbumAccount.value) return;
  loadedAccountId = state.value.accountId;
  message.value = '已确认使用当前 ImgBed 账号；所选文件未丢失。';
}
async function connect() {
  if (!props.bridge || !launcherHost.value) {
    message.value = '当前版本无法连接 ImgBed 上传服务。';
    return;
  }
  try {
    message.value = '';
    await props.bridge.connect(launcherHost.value);
    await load();
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
  }
}
async function disconnect() {
  if (!props.bridge) return;
  try {
    await props.bridge.disconnect();
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
  }
}
function selectFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const errors: string[] = [];
  let count = entries.value.filter(item => item.file).length;
  for (const file of Array.from(input.files ?? [])) {
    if (!IMG_BED_UPLOAD_TYPES.includes(file.type)) {
      errors.push(`${file.name}：不支持的文件类型`);
      continue;
    }
    if (!file.size || file.size > 95 * 1024 * 1024) {
      errors.push(`${file.name}：文件为空或超过 95 MiB`);
      continue;
    }
    if (entries.value.length >= 500) {
      errors.push(`${file.name}：图库最多保留 500 项`);
      continue;
    }
    if (count >= 100) {
      errors.push(`${file.name}：一次最多选择 100 个文件`);
      continue;
    }
    entries.value.push({
      id: createImgbedUploadId(),
      title: file.name,
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      preview: URL.createObjectURL(file),
      file,
    });
    changed();
    count += 1;
  }
  message.value = errors.join('；');
  input.value = '';
}
function move(index: number, offset: number) {
  const [item] = entries.value.splice(index, 1);
  entries.value.splice(index + offset, 0, item);
  changed();
}
function remove(index: number) {
  const [item] = entries.value.splice(index, 1);
  if (item.file) URL.revokeObjectURL(item.preview);
  changed();
}
async function save() {
  if (!dirty.value && !completed) return;
  if (busy.value || !loaded.value) throw new Error('图库尚未读取完成，请稍后重试。');
  if (!props.bridge || state.value.status !== 'connected') throw new Error('请先连接 ImgBed。');
  if (entries.value.length === 0) throw new Error('请至少保留一张图片或视频后再保存图库。');
  if (!props.characterName.trim()) throw new Error('请先填写角色姓名。');
  if (entries.value.some(item => item.file && !item.title.trim())) throw new Error('请先填写待上传图片的名称。');
  if (props.characterName.trim().length > IMG_BED_UPLOAD_CHARACTER_NAME_MAX_LENGTH)
    throw new Error('ImgBed 图库的角色姓名不能超过 80 个字符。');
  if (loadedAccountId !== state.value.accountId) throw new Error('ImgBed 账号已改变，请切回原账号后重试。');
  if (`${props.remoteGalleryUrl.trim()}\n${props.characterName.trim()}` !== loadedKey)
    throw new Error('角色或图库已改变，请恢复原角色和图库后重试。');
  if (!completed && parseImgbedGalleryUrl(props.remoteGalleryUrl) !== albumId)
    throw new Error('图库已改变，请重新载入后再保存。');
  startUpload(entries.value.filter(item => item.file).length, Boolean(completed));
  busy.value = true;
  const generation = saveGeneration;
  let currentFile = '';
  try {
    if (!completed) {
      requestId.value ||= createImgbedUploadId();
      request ||= {
        requestId: requestId.value,
        albumId,
        characterName: props.characterName.trim(),
        files: entries.value
          .filter(item => item.file)
          .map(item => ({ id: item.id, file: item.file!, title: item.title.trim() })),
        order: entries.value.map(item => (item.file ? { uploadId: item.id } : { itemId: item.id })),
      };
      if (request.characterName !== props.characterName.trim())
        throw new Error('角色姓名已改变，请恢复原姓名后重试上传。');
      completed = await props.bridge.save(request, progress => {
        currentFile = request?.files.find(item => item.id === progress.fileId)?.title ?? '';
        handleUploadProgress(progress);
        message.value =
          progress.phase === 'saving'
            ? '正在保存图库成员与顺序…'
            : `正在上传：${progress.completed}/${progress.total}${currentFile ? ` · ${currentFile}` : ''}`;
      });
      albumId = completed.albumId;
    }
    if (generation !== saveGeneration || request?.characterName !== props.characterName.trim())
      throw new Error('操作已取消或角色已改变，请恢复原角色后重试。');
    const result = completed;
    if (uploadStage.value !== 'verifying') {
      setUploadStage('verifying', 'ImgBed 已返回保存结果，正在读取并核对公开图库…');
    }
    await refreshRemoteGallery(result.remoteGalleryUrl, undefined, payload => {
      if (
        parseImgbedGalleryUrl(result.remoteGalleryUrl) !== result.albumId ||
        payload.packId !== result.albumId ||
        payload.profileId !== result.albumId ||
        payload.characterName !== props.characterName.trim() ||
        payload.gallery.length === 0 ||
        payload.gallery.length !== result.items.length ||
        payload.gallery.some((image, index) => !matchesSavedGallerySource(result.items[index].url, image.sources)) ||
        !payload.gallery.some(image => image.viewerVisible !== false)
      )
        throw new Error('公开图库身份验证失败。');
    });
    if (generation !== saveGeneration || request?.characterName !== props.characterName.trim())
      throw new Error('操作已取消或角色已改变，请恢复原角色后重试。');
    clearEntries();
    entries.value = result.items.map(item => ({ ...item, preview: item.url }));
    failedImagePreviews.value = new Map();
    loadedKey = `${result.remoteGalleryUrl}\n${props.characterName.trim()}`;
    emit('update:remoteGalleryUrl', result.remoteGalleryUrl);
    completed = null;
    dirty.value = false;
    requestId.value = '';
    request = null;
    message.value = '';
    setUploadStage('success', '公开图库核对通过，URL 已回填；请继续第 5 步保存角色档案。');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const failure = error as { code?: string; fileId?: string };
    currentFile = request?.files.find(item => item.id === failure.fileId)?.title ?? currentFile;
    if (failure.code === 'rejected') {
      requestId.value = '';
      request = null;
      message.value = `未开始上传${currentFile ? `（${currentFile}）` : ''}：${detail} 所选文件已保留，可以移除或更换后再次保存。`;
    } else {
      message.value = `上传或验证失败${currentFile ? `（${currentFile}）` : ''}：${detail}。文件和请求已保留，请再次点击保存重试。`;
    }
    failUpload('当前阶段未成功；请查看下方错误与操作记录。');
    throw error;
  } finally {
    busy.value = false;
  }
}
async function saveFromPanel() {
  try {
    await save();
  } catch (error) {
    // Validation can fail before the upload state machine starts.
    if (uploadStage.value === 'idle' || uploadStage.value === 'success') {
      const now = Date.now();
      uploadStartedAt.value = now;
      uploadNow.value = now;
      uploadLog.value = [];
      message.value = error instanceof Error ? error.message : String(error);
      failUpload('上传请求未开始，请先处理输入或账号状态。');
    }
  }
}
watch(
  () => [props.remoteGalleryUrl, props.characterName, state.value.status],
  () => {
    void load();
  },
);
watch(
  () => [props.remoteGalleryUrl, props.characterName],
  () => {
    saveGeneration += 1;
  },
  { flush: 'sync' },
);
watch(
  () => state.value.accountId,
  (value, previous) => {
    if (value === previous || state.value.status !== 'connected') return;
    saveGeneration += 1;
    if (dirty.value) {
      message.value = 'ImgBed 账号已改变，请切回原账号后重试；待上传文件已保留。';
    } else {
      loadedKey = '';
      void load();
    }
  },
);
onMounted(() => {
  if (props.bridge) {
    unsubscribe = props.bridge.subscribe(value => {
      state.value = value;
    });
    void props.bridge
      .status()
      .then(() => {
        // Do not open an authorization launcher until the user explicitly clicks Connect.
      })
      .catch(error => {
        message.value = error instanceof Error ? error.message : String(error);
      });
  }
});
onBeforeUnmount(() => {
  cancel();
  stopUploadTimer();
  unsubscribe?.();
  clearEntries();
});
defineExpose({ save, reload, hasPendingMedia, hasUnsavedChanges });
</script>

<style scoped>
.upload-panel {
  display: grid;
  gap: 12px;
}
.upload-connection {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.upload-connection-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-right: auto;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.upload-connected-dot {
  width: 8px;
  height: 8px;
  border-radius: 100%;
  background: #65b88d;
}
.upload-file-picker {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 10px;
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
  color: var(--primary);
  cursor: pointer;
  font-size: 0.83rem;
  font-weight: 650;
}
.upload-file-picker:focus-within {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.upload-file-picker.disabled {
  opacity: 0.5;
  cursor: default;
}
.upload-file-picker input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  opacity: 0;
}
.upload-panel .upload-inline-error {
  color: #f2a2a2;
  font-size: 0.78rem;
}
.upload-saved {
  color: #90c9a7;
  font-size: 0.81rem;
}
.upload-pending-note {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.upload-panel p,
.upload-panel h3 {
  margin: 0;
}
.upload-panel .upload-media-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 0;
}
.upload-panel .upload-media-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 68px;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  min-width: 0;
}
.upload-panel .upload-media-row:last-child {
  border-bottom: 0;
}
.upload-media-preview,
.upload-preview-fallback {
  width: 56px;
  height: 56px;
  min-width: 0;
  overflow: hidden;
  border-radius: 7px;
}
.upload-panel .upload-media-preview img,
.upload-panel .upload-media-preview video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.upload-panel .upload-media-info {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 3px 7px;
  min-width: 0;
}
.upload-panel .upload-display-title {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.83rem;
  font-weight: 550;
}
.upload-panel .upload-media-meta {
  flex: 0 0 100%;
  font-size: 0.72rem;
  color: var(--text-secondary);
}
.upload-panel .upload-title-input {
  min-width: 0;
  width: 100%;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: inherit;
  background: var(--surface);
  font-size: 0.8rem;
}
.upload-panel .upload-rename-button {
  padding: 2px 4px;
  background: transparent;
  border: 0;
  color: var(--primary, #cda86d);
  font-size: 0.72rem;
  cursor: pointer;
}
.upload-panel .upload-media-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  white-space: nowrap;
}
.upload-panel .upload-icon-button {
  display: grid;
  place-items: center;
  padding: 0;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  font-size: 1.15rem;
  line-height: 1;
}
.upload-panel .upload-remove-button:not(:disabled) {
  color: #dcaaaa;
}
.upload-panel button {
  width: fit-content;
}
.upload-panel .toolbar-button {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.7rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.upload-panel input {
  max-width: 100%;
  min-width: 0;
}
.upload-panel .upload-media-actions .upload-icon-button {
  box-sizing: border-box;
  width: 38px;
  height: 38px;
  min-width: 38px;
  padding: 0;
}
.upload-panel .upload-media-info .upload-rename-button:focus-visible {
  outline: 2px solid var(--primary, #cda86d);
  outline-offset: 2px;
}
.upload-preview-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--text-muted);
  background: var(--surface);
  font-size: 0.7rem;
}
.upload-panel .upload-panel-actions small,
.upload-panel .upload-guidance {
  font-size: 0.85rem;
  opacity: 0.85;
}
.upload-panel .upload-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.upload-panel .upload-commit-button:not(:disabled) {
  background: var(--primary, #cda86d);
  color: #151515;
  font-weight: 600;
}
.upload-progress {
  display: grid;
  gap: 10px;
  margin-top: 6px;
  padding: 14px;
  min-width: 0;
  border: 1px solid var(--border-strong, var(--border));
  border-radius: 10px;
  background: var(--surface, rgba(0, 0, 0, 0.08));
}
.upload-progress-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.upload-progress-heading strong {
  font-size: 0.88rem;
}
.upload-elapsed {
  margin-left: auto;
  color: var(--text-secondary, inherit);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}
.upload-spinner {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  border: 2px solid var(--border-strong, #999);
  border-top-color: var(--primary, #cda86d);
  border-radius: 50%;
  animation: upload-spin 1s linear infinite;
}
@keyframes upload-spin {
  to {
    transform: rotate(360deg);
  }
}
.upload-progress-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.upload-progress-steps li {
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 6px;
  padding: 8px 3px;
  text-align: center;
  color: var(--text-muted, #999);
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: 0.73rem;
}
.upload-progress-steps li.active {
  color: var(--text, inherit);
  border-color: var(--primary, #cda86d);
  background: var(--primary-soft, transparent);
}
.upload-progress-steps li.complete {
  color: var(--text-secondary, inherit);
}
.upload-progress-steps li.failed {
  color: #f19696;
  border-color: #c36666;
}
.upload-step-dot {
  display: grid;
  place-items: center;
  height: 23px;
  width: 23px;
  border-radius: 50%;
  background: var(--surface-soft, #333);
  font-variant-numeric: tabular-nums;
}
.upload-progress-steps li.active .upload-step-dot {
  background: var(--primary, #cda86d);
  color: #171717;
}
.upload-progress p {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.6;
}
.upload-wait-note {
  padding: 9px 11px;
  color: var(--text-secondary, inherit);
  border: 1px dashed var(--border-strong, var(--border));
  border-radius: 7px;
}
.upload-error-detail {
  color: #f19696;
  overflow-wrap: anywhere;
}
.upload-diagnostic {
  font-size: 0.77rem;
}
.upload-diagnostic summary {
  cursor: pointer;
}
.upload-diagnostic ol {
  margin: 7px 0;
  padding-left: 24px;
  line-height: 1.65;
}
.upload-diagnostic li {
  overflow-wrap: anywhere;
}
.upload-diagnostic small {
  color: var(--text-secondary, inherit);
}
@media (max-width: 600px) {
  .upload-progress-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  .upload-spinner {
    animation: none;
  }
}
.upload-panel .toolbar-button:hover:not(:disabled),
.upload-panel .toolbar-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
.upload-panel .toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@media (max-width: 420px) {
  .upload-panel .upload-media-row {
    grid-template-columns: 48px minmax(0, 1fr) auto;
    min-height: 58px;
    gap: 8px;
    padding: 5px 0;
  }
  .upload-media-preview {
    width: 48px;
    height: 48px;
  }
  .upload-panel .upload-media-actions {
    gap: 3px;
  }
  .upload-panel .upload-media-actions .upload-icon-button {
    width: 36px;
    min-width: 36px;
    height: 36px;
  }
}
</style>
