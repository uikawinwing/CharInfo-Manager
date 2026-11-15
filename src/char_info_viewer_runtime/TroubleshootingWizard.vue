<template>
  <section class="ci-help" aria-labelledby="ci-help-title">
    <div class="ci-help-header">
      <span>
        <strong id="ci-help-title">遇到问题？帮我检查</strong>
        <small>选出看到的现象，由脚本读取这条聊天的实际配置，再给出解决办法。</small>
      </span>
      <button type="button" class="primary" @click="toggleWizard">
        {{ open ? '收起' : '开始排查' }}
      </button>
    </div>

    <div v-if="open" class="ci-help-body">
      <div v-if="phase === 'select'" class="ci-help-panel">
        <p class="ci-help-caption">第一步 · 遇到了什么问题？</p>
        <div class="ci-help-options" role="radiogroup" aria-label="选择遇到的问题">
          <button
            v-for="choice in WIZARD_SYMPTOMS"
            :key="choice.value"
            type="button"
            :aria-pressed="symptom === choice.value"
            :class="{ chosen: symptom === choice.value }"
            @click="symptom = choice.value"
          >
            {{ choice.title }}
          </button>
        </div>
        <div class="ci-help-actions">
          <button type="button" class="primary" @click="advance">下一步</button>
        </div>
      </div>

      <div v-else-if="phase === 'questions'" class="ci-help-panel">
        <p class="ci-help-caption">第二步 · 告诉我们一点情况</p>
        <label v-if="needsCard" class="ci-help-field">
          <strong>是哪一张角色卡？</strong>
          <select v-model="selectedCardKey">
            <option value="none">找不到对应的角色卡</option>
            <option v-for="item in candidates" :key="item.key" :value="item.key">
              消息 #{{ item.messageId }} · {{ item.name }}
            </option>
          </select>
        </label>
        <p v-if="needsCard && candidates.length === 0" class="ci-help-hint">
          当前已加载的聊天里没找到完整角色卡。角色卡没出现的话，可以返回上一步选择「角色卡没出现」。
        </p>

        <template v-if="isPortraitSymptom">
          <label class="ci-help-field">
            <strong>这名角色从哪里来？</strong>
            <select v-model="origin">
              <option value="unknown">不知道／不确定</option>
              <option value="llm">聊天时 AI 临时生成的</option>
              <option value="downloaded">从其他作者那里下载／导入的</option>
              <option value="self_created">我自己制作或配置过图片</option>
            </select>
          </label>
          <p v-if="origin === 'llm'" class="ci-help-hint">
            AI 临时生成的 NPC 默认只有文字，不会自动生成立绘；不过如果后来配置过图片，脚本仍会继续检查。
          </p>
          <label v-if="origin === 'llm' || origin === 'downloaded'" class="ci-help-field">
            <strong>{{ origin === 'llm' ? '后来有手动给它配过图片吗？' : '作者有明确提供角色图片吗？' }}</strong>
            <select v-model="expectation">
              <option value="unknown">不知道／不确定</option>
              <option value="yes">{{ origin === 'llm' ? '有，配过' : '有，作者明确提供了' }}</option>
              <option value="no">{{ origin === 'llm' ? '没有' : '没有，作者没提供' }}</option>
            </select>
          </label>
        </template>

        <label v-if="symptom === 'editor_or_worldbook'" class="ci-help-field">
          <strong>具体遇到哪种情况？</strong>
          <select v-model="editorIssue">
            <option value="entry">找不到角色条目</option>
            <option value="save">保存了，但没有生效</option>
            <option value="setup">不知道怎么安装角色图片</option>
          </select>
        </label>

        <div class="ci-help-actions">
          <button type="button" @click="phase = 'select'">返回</button>
          <button type="button" class="primary" :disabled="running" @click="checkIssue">
            {{ running ? '正在检查…' : '开始检查' }}
          </button>
        </div>
      </div>

      <div v-else-if="phase === 'result'" class="ci-help-panel" aria-live="polite">
        <p class="ci-help-caption">第三步 · 检查结果</p>
        <p v-if="errorText" class="ci-help-error">{{ errorText }}</p>
        <template v-if="finding">
          <div class="ci-help-finding" :class="'severity-' + finding.severity">
            <strong>{{ severityText(finding.severity) }} · {{ finding.title }}</strong>
            <p>{{ finding.reason }}</p>
          </div>
          <h4>接下来怎么做</h4>
          <ol class="ci-help-steps">
            <li v-for="(step, index) in finding.steps" :key="index">{{ step }}</li>
          </ol>
          <div v-if="showEditorAction" class="ci-help-actions">
            <button type="button" class="primary" @click="openProfileEditor">
              打开角色档案编辑器
            </button>
          </div>
          <details class="ci-help-detail">
            <summary>查看技术详情和检查依据</summary>
            <p>诊断类型：{{ finding.code }}</p>
            <pre v-for="(evidence, index) in finding.evidence" :key="index">{{ evidence }}</pre>
          </details>
          <div v-if="!resolved" class="ci-help-actions">
            <button type="button" @click="resolved = true">已解决</button>
            <button type="button" :disabled="running" @click="checkIssue">重新检查</button>
            <button type="button" @click="showFeedback = !showFeedback">仍未解决</button>
          </div>
          <p v-else class="ci-help-hint">太好了，诊断已经结束。本次反馈只存在当前界面，不会上传。</p>

          <div v-if="showFeedback && !resolved" class="ci-help-feedback">
            <strong>按步骤检查后，发生了什么？</strong>
            <select v-model="feedback">
              <option value="没变化">没变化</option>
              <option value="出现新错误">出现新错误</option>
              <option value="找不到对应按钮">找不到对应按钮</option>
            </select>
            <button type="button" @click="copyReport">
              复制 AI 排错资料
            </button>
            <p class="ci-help-hint">只复制本次选项、诊断结论及相关片段，不发送网络请求，也不修改原始消息。</p>
            <p v-if="copyStatus" class="ci-help-hint" role="status">{{ copyStatus }}</p>
            <textarea v-if="copyFailed" :value="reportText" readonly aria-label="可手动复制的排错资料"></textarea>
          </div>
        </template>
        <div class="ci-help-actions">
          <button type="button" @click="phase = 'select'; finding = null">换一种问题</button>
        </div>
      </div>

      <p class="ci-help-footer">仅对当前聊天进行只读检查。不会执行 EJS、修改聊天变量或删除脚本。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { projectCharInfoMessage } from '../char_info_viewer/runtime/charInfoMessage';
import { selectRecentMessageIds } from '../char_info_viewer/runtime/recentMessages';
import { parseCharacterYaml } from '../char_info_viewer/services/yamlParser';
import {
  createWizardPrompt,
  runWizardAnalysis,
  WIZARD_SYMPTOMS,
  type WizardCandidate,
  type WizardEditorIssue,
  type WizardExpectation,
  type WizardFinding,
  type WizardOptions,
  type WizardOrigin,
  type WizardSymptom,
} from './guidedTroubleshooting';
import type { RuntimeViewState } from './types';

const props = defineProps<{
  state: RuntimeViewState;
  onOpenProfileEditor: (characterName: string) => void;
}>();
const open = ref(false);
const phase = ref<'select' | 'questions' | 'result'>('select');
const symptom = ref<WizardSymptom>('portrait_missing');
const origin = ref<WizardOrigin>('unknown');
const expectation = ref<WizardExpectation>('unknown');
const editorIssue = ref<WizardEditorIssue>('entry');
const candidates = ref<WizardCandidate[]>([]);
const selectedCardKey = ref('');
const finding = ref<WizardFinding | null>(null);
const lastOptions = ref<WizardOptions | null>(null);
const running = ref(false);
const errorText = ref('');
const resolved = ref(false);
const showFeedback = ref(false);
const feedback = ref('没变化');
const copyStatus = ref('');
const copyFailed = ref(false);
const reportText = computed(() => lastOptions.value && finding.value
  ? createWizardPrompt(lastOptions.value, finding.value, feedback.value)
  : '');

const isPortraitSymptom = computed(() => symptom.value === 'portrait_missing' || symptom.value === 'portrait_broken');
const needsCard = computed(() => symptom.value !== 'version_cache' &&
  !(symptom.value === 'editor_or_worldbook' && editorIssue.value !== 'setup'));
const selectedCandidate = computed(() => candidates.value.find(item => item.key === selectedCardKey.value) ?? null);
const showEditorAction = computed(() => Boolean(selectedCandidate.value && finding.value &&
  ['NO_IMAGE_PROFILE', 'EMPTY_IMAGE_GALLERY', 'LEGACY_PROFILE', 'PROFILE_NAME_MISMATCH'].includes(finding.value.code)));

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function loadCandidates(): void {
  const previouslySelected = selectedCardKey.value;
  const ids = Array.from(window.parent.document.querySelectorAll<HTMLElement>('#chat > .mes[mesid]'))
    .map(element => Number(element.getAttribute('mesid')))
    .filter(id => Number.isInteger(id) && id >= 0);
  const results: WizardCandidate[] = [];
  for (const messageId of ids.slice(-35).reverse()) {
    try {
      const message = getChatMessages(messageId)[0];
      if (!message || message.role !== 'assistant' || message.is_hidden || typeof message.message !== 'string') continue;
      const hasCharInfo = /<char_info\b/i.test(message.message);
      if (!hasCharInfo && symptom.value !== 'viewer_missing' && symptom.value !== 'unknown') continue;
      if (!hasCharInfo && results.filter(item => item.ordinal === -1).length >= 3) continue;
      const withSwipes = getChatMessages(messageId, { include_swipes: true })[0];
      const swipeId = withSwipes && 'swipe_id' in withSwipes ? withSwipes.swipe_id : 0;
      const projection = projectCharInfoMessage({
        messageId, swipeId, text: message.message, maxCards: Number.MAX_SAFE_INTEGER,
      });
      for (const card of projection.cards) {
        const parsed = parseCharacterYaml(card.content);
        const name = parsed.success && typeof parsed.data.姓名 === 'string'
          ? parsed.data.姓名.trim()
          : card.content.match(/(?:^|\n)\s*(?:姓名|名字)\s*[:：]\s*(.+)/u)?.[1]?.trim() ?? '无法解析姓名';
        results.push({
          key: card.id,
          messageId,
          swipeId,
          ordinal: card.ordinal,
          name,
          yamlText: card.content,
          rawText: message.message,
        });
      }
      if (!projection.cards.length) {
        results.push({
          key: String(messageId) + ':' + swipeId + ':-1',
          messageId, swipeId, ordinal: -1,
          name: hasCharInfo ? '有标签但找不到完整角色卡' : '最近的消息（没有角色卡标签）',
          yamlText: '', rawText: message.message,
        });
      }
    } catch (error) {
      console.warn('[CharInfo Help] 无法读取聊天消息', messageId, error);
    }
  }
  candidates.value = results;
  selectedCardKey.value = previouslySelected === 'none' || results.some(item => item.key === previouslySelected)
    ? previouslySelected : results[0]?.key ?? '';
}

function openProfileEditor(): void {
  props.onOpenProfileEditor(selectedCandidate.value?.name ?? '');
}

function toggleWizard(): void {
  open.value = !open.value;
  if (open.value) loadCandidates();
}

function advance(): void {
  loadCandidates();
  phase.value = 'questions';
  finding.value = null;
  errorText.value = '';
  showFeedback.value = false;
  resolved.value = false;
}

function severityText(severity: WizardFinding['severity']): string {
  if (severity === 'expected') return '正常但未配置';
  if (severity === 'confirmed') return '已确认的问题';
  if (severity === 'suspected') return '需要进一步确认';
  return '检查说明';
}

async function checkIssue(): Promise<void> {
  if (running.value) return;
  running.value = true;
  errorText.value = '';
  showFeedback.value = false;
  copyStatus.value = '';
  copyFailed.value = false;
  resolved.value = false;
  finding.value = null;
  try {
    loadCandidates();
    const candidate = selectedCandidate.value;
  const loaded = Array.from(window.parent.document.querySelectorAll<HTMLElement>('#chat > .mes[mesid]'))
    .map(element => Number(element.getAttribute('mesid')))
    .filter(Number.isInteger).sort((a, b) => a - b);
  const activeIds = new Set(selectRecentMessageIds(loaded, props.state.settings.activeFloorLimit));
  const raw = getVariables({ type: 'chat' });
  const options: WizardOptions = {
    symptom: symptom.value,
    candidate,
    origin: origin.value,
    expectation: expectation.value,
    editorIssue: editorIssue.value,
    maxCards: props.state.settings.unlimitedCardsPerMessage ? Number.MAX_SAFE_INTEGER : props.state.settings.maxCardsPerMessage,
    active: candidate ? activeIds.has(candidate.messageId) : false,
    mounted: candidate ? props.state.messages.some(message => message.messageId === candidate.messageId) : false,
    chatVariables: asRecord(raw) ?? {},
    mountDiagnostics: props.state.mountDiagnostics,
  };
    lastOptions.value = options;
    finding.value = await runWizardAnalysis(options);
  } catch (error) {
    errorText.value = '检查未完成：' + (error instanceof Error ? error.message : String(error));
  } finally {
    running.value = false;
    phase.value = 'result';
  }
}

async function copyReport(): Promise<void> {
  copyStatus.value = '';
  copyFailed.value = false;
  try {
    await navigator.clipboard.writeText(reportText.value);
    copyStatus.value = '已经复制，可以粘贴给自己选择的 AI 助手。';
  } catch {
    copyFailed.value = true;
    copyStatus.value = '浏览器拒绝了自动复制，请从下方文本框手动复制。';
  }
}
</script>

<style scoped>
.ci-help { display: grid; min-width: 0; gap: 12px; padding: 14px; border: 1px solid var(--ci-border-strong); border-radius: 12px; background: var(--ci-surface); color: var(--ci-text); }
.ci-help-header { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; }
.ci-help-header > span { display: grid; min-width: 0; gap: 5px; }
.ci-help-header > button { min-width: 100px; justify-self: end; white-space: nowrap; }
.ci-help-header strong { font-size: .9rem; }
.ci-help-header small, .ci-help-hint, .ci-help-footer { color: var(--ci-text-muted); font-size: .85rem; line-height: 1.5; }
.ci-help-body, .ci-help-panel { display: grid; gap: 12px; min-width: 0; }
.ci-help-caption { margin: 0; font-size: .85rem; color: var(--ci-primary); font-weight: 700; }
.ci-help-options { display: grid; gap: 7px; }
.ci-help-options button { width: 100%; min-height: 44px; text-align: left; border-radius: 10px; white-space: normal; font-size: .9rem; line-height: 1.45; }
.ci-help-options button.chosen { border-color: var(--ci-primary); background: var(--ci-primary-soft); }
.ci-help-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.ci-help-field { display: grid !important; gap: 7px !important; align-items: stretch !important; min-height: unset !important; }
.ci-help-field strong, .ci-help-feedback strong { font-size: .88rem; }
.ci-help-field select, .ci-help-feedback select, .ci-help-feedback textarea { box-sizing: border-box; width: 100%; max-width: 100%; min-height: 40px; padding: 9px 10px; border: 1px solid var(--ci-border); border-radius: 9px; background: var(--ci-input); color: var(--ci-text); font: inherit; font-size: .88rem; }
.ci-help-hint, .ci-help-footer { margin: 0; }
.ci-help-footer { border-top: 1px solid var(--ci-border); padding-top: 9px; }
.ci-help-finding { display: grid; gap: 6px; padding: 11px; border: 1px solid var(--ci-border); border-radius: 10px; }
.ci-help-finding strong { font-size: .92rem; }
.ci-help-finding p { margin: 0; font-size: .85rem; line-height: 1.55; }
.severity-confirmed { border-color: var(--ci-danger); }
.severity-suspected { border-color: var(--ci-warning); }
.severity-expected { border-color: var(--ci-success); }
.ci-help-panel h4 { margin: 0; font-size: .92rem; }
.ci-help-steps { display: grid; gap: 8px; margin: 0; padding-left: 23px; font-size: .86rem; line-height: 1.55; }
.ci-help-detail { min-width: 0; padding: 10px; border: 1px solid var(--ci-border); border-radius: 9px; }
.ci-help-detail summary { cursor: pointer; font-size: .84rem; }
.ci-help-detail p { font-size: .78rem; color: var(--ci-text-muted); }
.ci-help-detail pre { padding: 8px; overflow-wrap: anywhere; white-space: pre-wrap; font-size: .69rem; background: var(--ci-input); border-radius: 8px; }
.ci-help-feedback { display: grid; gap: 9px; padding: 10px; border: 1px solid var(--ci-border); border-radius: 10px; }
.ci-help-feedback textarea { min-height: 110px; resize: vertical; }
.ci-help-error { color: var(--ci-danger); font-size: .84rem; }
@media (max-width: 540px) {
  .ci-help-header { align-items: start; }
  .ci-help-actions button { flex: 1 1 auto; }
}
</style>
