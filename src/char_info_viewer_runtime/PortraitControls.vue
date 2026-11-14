<template>
  <section class="char-info-portrait-controls" :aria-label="`${target.name}的立绘`">
    <div class="char-info-portrait-toolbar" role="group" aria-label="立绘操作">
      <button ref="promptTrigger" class="char-info-portrait-generate" type="button" :disabled="busy || rewriting || readingPrompt" @click="regenerateImage">
        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>{{ imageUrl ? '重新生成立绘' : '生成立绘' }}
      </button>
      <button type="button" :disabled="busy || rewriting || readingPrompt" :aria-expanded="editing" @click="openPrompt">
        <i class="fa-solid fa-pen" aria-hidden="true"></i>编辑 tag
      </button>
      <button type="button" :disabled="busy || rewriting || readingPrompt" @click="regenerateTags">
        <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>重新生成 tag
      </button>
    </div>
    <p v-if="busy" role="status">{{ phaseLabel }}…</p>
    <template v-else>
      <details v-if="job?.issue" class="char-info-portrait-failure">
        <summary>查看立绘失败详情</summary>
        <p>{{ job.issue.stage }} · {{ job.issue.code }}</p>
        <p>{{ job.issue.message }}</p>
      </details>
      <form v-if="editing" class="char-info-portrait-form" novalidate @submit.prevent="finalPrompt === null ? rewrite() : submit()">
        <p v-if="availability" role="status">{{ availability.message }}</p>
        <p v-if="readingPrompt" role="status">正在读取这张图的生成提示词…</p>
        <p v-if="rewriting" role="status">正在生成标签…</p>
        <p v-if="rewriteError" role="alert">{{ rewriteError }}</p>
        <label v-if="finalPrompt === null">
          <span>提示词格式</span>
          <select v-model="formatChoice" :disabled="rewriting" @focus="emit('prepare')">
            <option value="">自动 · {{ activeFormat === 'nai' ? 'NovelAI' : 'Anima / ComfyUI' }}</option>
            <option value="anima">Anima / ComfyUI</option>
            <option value="nai">NovelAI 4.5 / V5</option>
          </select>
        </label>
        <label v-if="finalPrompt === null">
          <span>角色描述</span>
          <textarea ref="promptInput" v-model="description" rows="4" :readonly="rewriting" />
        </label>
        <template v-else>
          <p v-if="formatMismatch" role="status">请在柏宝绘切换到匹配的渠道，或返回并更改提示词格式。</p>
          <label>
            <span>{{ finalPrompt.format === 'nai' ? '画面标签 · Base Prompt' : 'ComfyUI 正面标签' }}</span>
            <textarea ref="promptInput" v-model="finalPrompt.tags" rows="3" :readonly="readingPrompt || rewriting" />
          </label>
          <label>
            <span>{{ finalPrompt.format === 'nai' ? '角色标签 · Character Prompt' : 'Anima 英文画面描述（可留空）' }}</span>
            <textarea v-model="finalPrompt.detail" rows="4" :readonly="readingPrompt || rewriting" />
          </label>
          <label v-if="finalPrompt.format === 'anima' && finalPrompt.isRequestPrompt">
            <span>ComfyUI 负面提示词</span>
            <textarea v-model="finalPrompt.negative" rows="3" :readonly="readingPrompt || rewriting" />
          </label>
        </template>
        <div class="char-info-portrait-form-actions">
          <template v-if="finalPrompt === null">
            <button type="submit" :disabled="!description.trim() || rewriting">生成标签</button>
            <button type="button" :disabled="rewriting" @click="review({ format, tags: '', detail: '' })">直接填写提示词</button>
          </template>
          <template v-else>
            <button type="submit" :disabled="!canSubmit">用这些标签生成立绘</button>
            <button v-if="formatMismatch || availability" type="button" @click="emit('prepare')">检查当前渠道</button>
            <button type="button" :disabled="readingPrompt || rewriting" @click="editDescription">编辑角色描述</button>
          </template>
          <button type="button" @click="cancelPrompt">{{ rewriting || readingPrompt ? '取消' : '收起' }}</button>
        </div>
      </form>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { PortraitTarget } from './portraitData';
import { PORTRAIT_PHASE_LABELS, type PortraitJobStatus } from './portraitJobs';
import type { PortraitFormat, PortraitPrompt } from './portraitPrompt';
import { readGeneratedPortraitPrompt } from './portraitProvider';

const props = defineProps<{
  target: PortraitTarget;
  job?: PortraitJobStatus;
  previousRequest?: { description?: string; prompt?: PortraitPrompt };
  imageUrl: string;
  availability: { code: string; message: string } | null;
  activeFormat: PortraitFormat;
  preparePrompt: (target: PortraitTarget, description: string, format: PortraitFormat, signal: AbortSignal) => Promise<PortraitPrompt>;
}>();
const emit = defineEmits<{ prepare: []; submit: [description: string, finalPrompt: PortraitPrompt] }>();

const editing = ref(false);
const description = ref('');
const finalPrompt = ref<PortraitPrompt | null>(null);
const formatChoice = ref<PortraitFormat | ''>('');
const format = computed(() => formatChoice.value || props.activeFormat);
const formatMismatch = computed(() => finalPrompt.value !== null && finalPrompt.value.format !== props.activeFormat);
const canSubmit = computed(() => {
  const prompt = finalPrompt.value;
  return Boolean(!rewriting.value && !readingPrompt.value && prompt?.tags.trim() && (prompt.format === 'anima' || prompt.detail.trim()) &&
    !formatMismatch.value && !props.availability);
});
const rewriting = ref(false);
const readingPrompt = ref(false);
const rewriteError = ref('');
let request: AbortController | undefined;
let loadedImage: string | undefined;
const promptTrigger = ref<HTMLButtonElement | null>(null);
const promptInput = ref<HTMLTextAreaElement | null>(null);
const busy = computed(() => props.job && !['completed', 'failed'].includes(props.job.phase));
const phaseLabel = computed(() => props.job && PORTRAIT_PHASE_LABELS[props.job.phase]);

function stopPromptRequest() {
  request?.abort();
  request = undefined;
  rewriting.value = false;
  readingPrompt.value = false;
}

onBeforeUnmount(stopPromptRequest);
watch([() => props.target.key, () => props.target.chatId], () => {
  stopPromptRequest();
  editing.value = false;
  finalPrompt.value = null;
  loadedImage = undefined;
});

async function openPrompt() {
  emit('prepare');
  editing.value = true;
  if (loadedImage === props.imageUrl) {
    await nextTick();
    promptInput.value?.focus();
    return true;
  }
  description.value = props.job?.description ?? props.previousRequest?.description ?? props.target.prompt;
  const submitted = props.job?.requestPrompt ?? props.previousRequest?.prompt;
  const previous = submitted
    ? { ...submitted, isRequestPrompt: true }
    : props.job?.sentPrompt;
  finalPrompt.value = previous ? { ...previous } : props.imageUrl
    ? { format: format.value, tags: '', detail: '', negative: '', isRequestPrompt: true }
    : null;
  formatChoice.value = previous ? previous.format : '';
  rewriteError.value = '';
  loadedImage = props.imageUrl;
  if (props.imageUrl && previous?.format !== 'nai' && !props.job?.issue) {
    const controller = new AbortController();
    request = controller;
    readingPrompt.value = true;
    try {
      const saved = await readGeneratedPortraitPrompt(props.imageUrl, controller.signal);
      if (!controller.signal.aborted) {
        if (saved) {
          finalPrompt.value = saved;
          formatChoice.value = saved.format;
        } else if (!previous) {
          rewriteError.value = '这张图片没有可读取的 ComfyUI 提示词。可直接填写，或重新生成 tag。';
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        loadedImage = undefined;
        rewriteError.value = error instanceof Error ? error.message : '无法读取图片中的提示词。';
      }
    } finally {
      if (request === controller) {
        request = undefined;
        readingPrompt.value = false;
      }
    }
    if (controller.signal.aborted) return false;
  }
  await nextTick();
  promptInput.value?.focus();
  return true;
}

async function cancelPrompt() {
  if (readingPrompt.value) loadedImage = undefined;
  stopPromptRequest();
  editing.value = false;
  await nextTick();
  promptTrigger.value?.focus();
}

async function review(prompt: PortraitPrompt) {
  finalPrompt.value = prompt;
  rewriteError.value = '';
  await nextTick();
  promptInput.value?.focus();
}

async function editDescription() {
  finalPrompt.value = null;
  await nextTick();
  promptInput.value?.focus();
}

async function rewrite(source = description.value) {
  const input = source.trim();
  if (!input || rewriting.value) return;
  const controller = new AbortController();
  request = controller;
  rewriting.value = true;
  rewriteError.value = '';
  try {
    const prompt = await props.preparePrompt(props.target, input, format.value, controller.signal);
    if (!controller.signal.aborted) await review(prompt);
  } catch (error) {
    if (!controller.signal.aborted) {
      rewriteError.value = error instanceof Error ? error.message : '改写失败，请重试。';
    }
  } finally {
    if (request === controller) {
      request = undefined;
      rewriting.value = false;
    }
  }
}

async function regenerateImage() {
  if (busy.value || rewriting.value || readingPrompt.value) return;
  if (!await openPrompt()) return;
  if (canSubmit.value) submit();
}

async function regenerateTags() {
  if (busy.value || rewriting.value || readingPrompt.value) return;
  if (!await openPrompt()) return;
  const previous = finalPrompt.value;
  let input = description.value;
  if (previous?.tags.trim()) {
    input = `${input}\n\n现有画面标签：${previous.tags}\n现有补充描述：${previous.detail}\n请根据角色资料重新设计画面标签，改善构图与表现，保持角色的外貌身份特征。`;
  }
  await rewrite(input);
}

function submit() {
  const prompt = finalPrompt.value;
  if (!prompt || !canSubmit.value) return;
  emit('submit', description.value, {
    ...prompt,
    tags: prompt.tags.trim(),
    detail: prompt.detail.trim(),
    ...(prompt.negative !== undefined && { negative: prompt.negative.trim() }),
  });
  editing.value = false;
}
</script>

<style scoped>
.char-info-portrait-controls {
  --portrait-accent: var(--tier-color, #bca774);
  --portrait-accent-rgb: var(--tier-color-rgb, 188, 167, 116);
  display: grid;
  box-sizing: border-box;
  width: 100%;
  max-width: 1200px;
  margin: 0.65rem auto 0;
  gap: 0.75rem;
  padding: 0.65rem;
  border: 1px solid rgba(var(--portrait-accent-rgb), 0.3);
  border-radius: 12px;
  background: #14161e;
  color: #f1f2f5;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  font-size: 0.85rem;
}
.char-info-portrait-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.char-info-portrait-controls p {
  margin: 0;
  overflow-wrap: anywhere;
}
.char-info-portrait-controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0.4rem 0.85rem;
  border: 1px solid rgba(var(--portrait-accent-rgb), 0.3);
  border-radius: 7px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.char-info-portrait-controls button.char-info-portrait-generate {
  background: rgba(var(--portrait-accent-rgb), 0.14);
  border-color: rgba(var(--portrait-accent-rgb), 0.65);
  color: var(--portrait-accent);
}
.char-info-portrait-controls button:hover:not(:disabled) {
  background: rgba(var(--portrait-accent-rgb), 0.23);
  border-color: var(--portrait-accent);
}
.char-info-portrait-controls button:active:not(:disabled) {
  background: rgba(var(--portrait-accent-rgb), 0.32);
}
.char-info-portrait-controls :is(button, textarea, select):focus-visible {
  outline: 2px solid var(--portrait-accent);
  outline-offset: 3px;
}
.char-info-portrait-controls button:disabled {
  cursor: default;
  opacity: 0.65;
}
.char-info-portrait-failure summary {
  cursor: pointer;
}
.char-info-portrait-form {
  display: grid;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(var(--portrait-accent-rgb), 0.2);
}
.char-info-portrait-form label {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}
.char-info-portrait-form :is(textarea, select) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 0.65rem;
  border: 1px solid rgba(var(--portrait-accent-rgb), 0.3);
  border-radius: 7px;
  background: #0e1017;
  color: inherit;
  font: inherit;
  line-height: 1.6;
}
.char-info-portrait-form textarea {
  height: 144px;
  resize: vertical;
}
.char-info-portrait-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
@media (max-width: 600px) {
  .char-info-portrait-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .char-info-portrait-toolbar .char-info-portrait-generate {
    grid-column: 1 / -1;
  }
}
</style>
