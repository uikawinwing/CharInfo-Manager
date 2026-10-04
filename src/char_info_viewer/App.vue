<template>
  <div
    ref="viewerRootRef"
    class="viewer-root"
    :class="{
      'viewer-root-embedded': props.embedded,
      'special-npc-viewer-root': shouldShowSpecialNpcLayout,
      'force-mobile-layout': props.forceMobileLayout,
      'viewer-effects-disabled': !props.effectsEnabled,
    }"
    :style="{ '--ci-font-size-adjust': `${props.fontSizeAdjustment}px` }"
  >
    <div v-if="parseError" class="error-card">
      <h3>⚠️ 资料暂时无法显示</h3>
      <div class="error-body">
        <div class="yaml-rescue-box">
          <button class="yaml-rescue-button" type="button" :disabled="looseParsing" @click="tryLooseParse">
            {{ looseParsing ? '正在尝试修复…' : '尝试自动修复' }}
          </button>
          <p>将尝试恢复基础资料；技能、装备等复杂内容可能无法完整保留。</p>
        </div>

        <details class="yaml-error-details">
          <summary>查看错误详情（可选）</summary>
          <div class="yaml-error-row yaml-error-sub"><b>错误信息：</b>{{ parseError.message }}</div>
          <div v-if="parseError.line !== undefined" class="yaml-error-row">
            <b>定位：</b>第 {{ (parseError.line ?? 0) + 1 }} 行，第 {{ (parseError.column ?? 0) + 1 }} 列
          </div>
          <template v-if="parseError.cleanedLine">
            <div class="yaml-error-title">发现问题的行</div>
            <pre class="yaml-error-pre"
              >{{ parseError.cleanedLine }}
{{ parseError.caretLine }}</pre>
          </template>

          <div v-if="parseErrorTips.length > 0" class="yaml-fix-box">
            <div class="yaml-fix-title">手动检查</div>
            <ul class="yaml-fix-list">
              <li v-for="tip in parseErrorTips" :key="tip">{{ tip }}</li>
            </ul>
          </div>
        </details>

        <details v-if="parseError.originalLine" class="yaml-error-details">
          <summary>查看你输入的原始内容（可选）</summary>
          <pre class="yaml-error-pre alt">{{ parseError.originalLine }}</pre>
        </details>
      </div>
    </div>

    <section
      v-else-if="initializingViewer"
      class="viewer-loading-shell"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="viewer-loading-portrait" aria-hidden="true">
        <span class="viewer-loading-snowflake">◇</span>
      </div>
      <div class="viewer-loading-data">
        <div class="viewer-loading-kicker">CHARACTER ARCHIVE</div>
        <div class="viewer-loading-line is-title"></div>
        <div class="viewer-loading-line is-subtitle"></div>
        <div class="viewer-loading-flags" aria-hidden="true">
          <span v-for="index in 5" :key="index"></span>
        </div>
        <div class="viewer-loading-resources" aria-hidden="true">
          <span v-for="index in 3" :key="index"></span>
        </div>
        <p>正在建立角色档案…</p>
      </div>
    </section>

    <template v-else-if="sheetData">
      <div v-if="looseParseWarning" class="parse-warning-card">
        {{ looseParseWarning }}
      </div>
      <div v-if="deprecatedVisualSyntaxWarning" class="parse-warning-card">
        {{ deprecatedVisualSyntaxWarning }}
      </div>

      <IllustratedCharacterSheet
        v-if="shouldShowSpecialNpcLayout && vm"
        :vm="vm"
        :attributes="attributes"
        :importing="saveBusy"
        :import-button-text="saveButtonText"
        :show-import-menu="showImportMenu"
        :read-only="props.readOnly"
        :debug-enabled="props.debugEnabled"
        :force-mobile-layout="props.forceMobileLayout"
        :special-npc="shouldShowSpecialNpcLayout"
        @toggle-attribute-formula="toggleAttributeFormula"
        @toggle-import-menu="toggleImportMenu"
        @import-mvu="onImportMvu"
        @import-worldbook="onImportWorldbook"
        @fallback-to-default="useIllustratedFallback"
      />

      <DefaultCharacterSheet
        v-else-if="vm && theme"
        :data="sheetData"
        :vm="vm"
        :theme="theme"
        :attributes="attributes"
        :effects-enabled="props.effectsEnabled"
        :read-only="props.readOnly"
        :save-busy="saveBusy"
        :save-button-text="saveButtonText"
        :show-import-menu="showImportMenu"
        :collapse-mode-enabled="props.collapseModeEnabled"
        :always-expand-rules="props.alwaysExpandRules"
        :auto-collapse-rules="props.autoCollapseRules"
        :level-gap-collapse-enabled="props.levelGapCollapseEnabled"
        :level-gap-collapse-threshold="props.levelGapCollapseThreshold"
        :player-level="props.playerLevel"
        @toggle-attribute-formula="toggleAttributeFormula"
        @toggle-import-menu="toggleImportMenu"
        @import-mvu="onImportMvu"
        @import-worldbook="onImportWorldbook"
      />
    </template>

    <div v-else class="loading-card">等待 YAML 数据...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import {
  DEFAULT_VIEWER_ALWAYS_EXPAND_RULES,
  DEFAULT_VIEWER_AUTO_COLLAPSE_RULES,
  DEFAULT_VIEWER_COLLAPSE_MODE_ENABLED,
  DEFAULT_VIEWER_DEBUG_ENABLED,
  DEFAULT_VIEWER_EFFECTS_ENABLED,
  DEFAULT_VIEWER_FONT_SIZE_ADJUSTMENT,
  DEFAULT_VIEWER_FORCE_MOBILE_LAYOUT,
  DEFAULT_VIEWER_LEVEL_GAP_COLLAPSE_ENABLED,
  DEFAULT_VIEWER_LEVEL_GAP_COLLAPSE_THRESHOLD,
} from '../char_info_shared/viewerUiDefaults';
import {
  ATTRIBUTE_KEYS,
  buildAttributeWarningMap,
  getAttributeRawValue,
  splitAttributeFormula,
} from './services/attributeWarning';
import { buildCharacterViewModel, pickField } from './services/characterViewModel';
import { resolveRemoteGalleryConfig } from './services/remoteGalleryService';
import { importToMvuVariables, saveToChatWorldbook } from './services/importService';
import {
  applyTheme,
  cloneCharacterDataWithVisualOverrides,
  hasDeprecatedVisualSyntax,
  resolveCharacterVisualConfigWithExtensions,
  resolveCharacterVisualPreview,
  resolveTheme,
} from './services/themeService';
import { parseCharacterYaml, parseCharacterYamlLoose } from './services/yamlParser';
import type { CharacterData, FriendlyYamlError, ThemeResolved, ViewerSaveFeedback, ViewerSaveState } from './types';
import DefaultCharacterSheet from './components/DefaultCharacterSheet.vue';
import IllustratedCharacterSheet from './components/illustrated/IllustratedCharacterSheet.vue';

const props = withDefaults(
  defineProps<{
    yamlText: string;
    messageId: number;
    embedded?: boolean;
    readOnly?: boolean;
    effectsEnabled?: boolean;
    forceMobileLayout?: boolean;
    fontSizeAdjustment?: number;
    debugEnabled?: boolean;
    imageSourcePriority?: string[];
    collapseModeEnabled?: boolean;
    alwaysExpandRules?: string;
    autoCollapseRules?: string;
    levelGapCollapseEnabled?: boolean;
    levelGapCollapseThreshold?: number;
    playerLevel?: number | null;
    entranceQuoteOverride?: string;
    previewMode?: boolean;
    previewData?: CharacterData;
    visualConfigOverride?: { characterName: string; config: unknown };
    saveFeedback?: (feedback: ViewerSaveFeedback) => void;
    saveState?: ViewerSaveState;
  }>(),
  {
    embedded: false,
    readOnly: false,
    effectsEnabled: DEFAULT_VIEWER_EFFECTS_ENABLED,
    forceMobileLayout: DEFAULT_VIEWER_FORCE_MOBILE_LAYOUT,
    fontSizeAdjustment: DEFAULT_VIEWER_FONT_SIZE_ADJUSTMENT,
    debugEnabled: DEFAULT_VIEWER_DEBUG_ENABLED,
    imageSourcePriority: () => [],
    collapseModeEnabled: DEFAULT_VIEWER_COLLAPSE_MODE_ENABLED,
    alwaysExpandRules: DEFAULT_VIEWER_ALWAYS_EXPAND_RULES,
    autoCollapseRules: DEFAULT_VIEWER_AUTO_COLLAPSE_RULES,
    levelGapCollapseEnabled: DEFAULT_VIEWER_LEVEL_GAP_COLLAPSE_ENABLED,
    levelGapCollapseThreshold: DEFAULT_VIEWER_LEVEL_GAP_COLLAPSE_THRESHOLD,
    playerLevel: null,
    entranceQuoteOverride: undefined,
    previewMode: false,
    previewData: undefined,
    visualConfigOverride: undefined,
    saveFeedback: undefined,
    saveState: undefined,
  },
);

const viewerRootRef = ref<HTMLElement | null>(null);
const sheetData = ref<CharacterData | null>(null);
const parseError = ref<FriendlyYamlError | null>(null);
const originalYamlText = ref('');
const parseMode = ref<'strict' | 'loose'>('strict');
const parseWarnings = ref<string[]>([]);
const deprecatedVisualSyntaxWarning = ref('');
const looseParsing = ref(false);
const initializingViewer = ref(true);
const theme = ref<ThemeResolved | null>(null);

const showImportMenu = ref(false);
const importing = ref(false);
const defaultImportButtonText = '📥';
const importButtonText = ref(defaultImportButtonText);
const savePending = computed(() => props.saveState?.phase === 'pending');
const usesRuntimeSaveState = computed(() => Boolean(props.saveFeedback));
const saveBusy = computed(() => (usesRuntimeSaveState.value ? savePending.value : importing.value));
const saveButtonText = computed(() =>
  usesRuntimeSaveState.value ? props.saveState?.label || defaultImportButtonText : importButtonText.value,
);
watch(
  () => props.saveState?.phase,
  phase => {
    if (!usesRuntimeSaveState.value || !phase || phase === 'pending') return;
    importing.value = false;
    importButtonText.value = defaultImportButtonText;
  },
);

let importButtonResetTimer: ReturnType<typeof setTimeout> | null = null;
let previewYamlRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let listenerDocument: Document | null = null;

const defaultParseErrorTips = [
  '1. 确认每行都使用“键: 值”格式。',
  '2. 检查上一行或本行是否缺少冒号。',
  '3. 值中包含冒号、方括号或引号时，请用英文双引号包住整段内容。',
  '4. 多行文本请在键后写“|”，后续内容统一缩进两个空格。',
  '5. 自动修复仍未成功时，请检查资料是否缺少姓名或其他必填内容。',
];

const parseErrorTips = computed(() => defaultParseErrorTips);
const looseParseWarning = computed(() =>
  parseMode.value === 'loose'
    ? parseWarnings.value[0] || '部分列表、装备、技能或登神长阶结构可能无法完整恢复，导入前请检查内容。'
    : '',
);

const attributeLabelMap: Record<string, string> = {
  力量: '力',
  敏捷: '敏',
  体质: '体',
  智力: '智',
  精神: '精',
};

const vm = computed(() =>
  sheetData.value ? buildCharacterViewModel(sheetData.value, props.imageSourcePriority) : null,
);
const illustratedFallbackActive = ref(false);
const shouldShowSpecialNpcLayout = computed(
  () => vm.value?.layoutKind === 'special_npc' && !illustratedFallbackActive.value,
);
const attributeFormulaState = ref<Record<string, boolean>>({});

const attributes = computed(() => {
  const attrObj = (pickField(sheetData.value, '属性', '属性') || {}) as Record<string, unknown>;
  const warningMap = buildAttributeWarningMap(attrObj, pickField(sheetData.value, '等级'));

  return ATTRIBUTE_KEYS.map(key => {
    const parsed = splitAttributeFormula(getAttributeRawValue(attrObj, key));
    const warningState = warningMap[key as keyof typeof warningMap];

    return {
      key,
      short: attributeLabelMap[key] || key,
      total: parsed.total,
      formula: parsed.formula,
      formulaParts: warningState?.formulaPartWarnings || [],
      isTotalAbnormal: !!warningState?.isTotalAbnormal,
      hasFormulaWarning: !!warningState?.hasFormulaWarning,
      showFormula: !!parsed.formula && !!attributeFormulaState.value[key],
    };
  });
});

function toggleAttributeFormula(key: string) {
  if (!ATTRIBUTE_KEYS.includes(key as (typeof ATTRIBUTE_KEYS)[number])) return;

  const attrObj = (pickField(sheetData.value, '属性', '属性') || {}) as Record<string, unknown>;
  const parsed = splitAttributeFormula(getAttributeRawValue(attrObj, key as (typeof ATTRIBUTE_KEYS)[number]));
  if (!parsed.formula) return;

  attributeFormulaState.value = {
    ...attributeFormulaState.value,
    [key]: !attributeFormulaState.value[key],
  };
}

watch(
  [() => props.yamlText, () => props.previewData, () => props.visualConfigOverride],
  () => {
    if (!props.previewMode) return;
    if (previewYamlRefreshTimer) clearTimeout(previewYamlRefreshTimer);
    previewYamlRefreshTimer = setTimeout(() => {
      previewYamlRefreshTimer = null;
      void initFromYaml();
    }, 50);
  },
  { deep: true },
);

async function initFromYaml() {
  const yamlText = props.yamlText.trim();

  originalYamlText.value = yamlText;
  sheetData.value = null;
  parseError.value = null;
  parseMode.value = 'strict';
  parseWarnings.value = [];
  theme.value = null;

  if (props.previewMode && props.previewData) {
    await applyParsedCharacterData(props.previewData, 'strict', []);
    return;
  }

  if (!yamlText) {
    parseError.value = { message: '未检测到 YAML 数据。' };
    return;
  }

  const parsed = parseCharacterYaml(yamlText);
  if (!parsed.success) {
    parseError.value = parsed.error;
    return;
  }

  await applyParsedCharacterData(parsed.data, parsed.mode ?? 'strict', parsed.warnings ?? []);
}

async function applyParsedCharacterData(data: CharacterData, mode: 'strict' | 'loose', warnings: string[] = []) {
  const previewVisualConfig = props.previewMode
    ? await resolveRemoteGalleryConfig(props.visualConfigOverride?.config)
    : undefined;
  const resolvedData = props.previewMode
    ? resolveCharacterVisualPreview(data, props.visualConfigOverride?.characterName ?? '', previewVisualConfig)
    : await resolveCharacterVisualConfigWithExtensions(data, getVariables({ type: 'chat' }));
  const hasLegacyInlineImageSyntax = hasDeprecatedVisualSyntax(resolvedData);
  deprecatedVisualSyntaxWarning.value = hasLegacyInlineImageSyntax
    ? '检测到正文旧版角色图片字段。v0.3.0 起角色查看器已忽略该字段；角色档案只读取 char_info.profiles。请在角色档案编辑器中重新保存为新版档案。'
    : '';
  const displayData =
    props.entranceQuoteOverride === undefined
      ? resolvedData
      : cloneCharacterDataWithVisualOverrides(resolvedData, {
          登场台词: props.entranceQuoteOverride,
        });
  sheetData.value = displayData;
  illustratedFallbackActive.value = false;
  parseError.value = null;
  parseMode.value = mode;
  parseWarnings.value = warnings;
  theme.value = resolveTheme(displayData);
  if (viewerRootRef.value) applyTheme(theme.value, viewerRootRef.value);
}

function useIllustratedFallback() {
  illustratedFallbackActive.value = true;
}

async function tryLooseParse() {
  if (!originalYamlText.value || looseParsing.value) return;
  looseParsing.value = true;

  try {
    const parsed = parseCharacterYamlLoose(originalYamlText.value);
    if (!parsed.success) {
      parseError.value = parsed.error;
      return;
    }

    await applyParsedCharacterData(parsed.data, parsed.mode ?? 'loose', parsed.warnings ?? []);
  } finally {
    looseParsing.value = false;
  }
}

function toggleImportMenu() {
  showImportMenu.value = !showImportMenu.value;
}

function closeImportMenu() {
  showImportMenu.value = false;
}

function flashImportButton(temp: string, duration = 1200) {
  if (importButtonResetTimer) {
    clearTimeout(importButtonResetTimer);
    importButtonResetTimer = null;
  }
  importButtonText.value = temp;
  importButtonResetTimer = setTimeout(() => {
    importButtonText.value = defaultImportButtonText;
    importButtonResetTimer = null;
  }, duration);
}

async function onImportMvu() {
  const importData = sheetData.value;
  if (!importData || saveBusy.value) return;
  importing.value = true;
  closeImportMenu();

  try {
    const ok = window.confirm(
      `确定要将角色 "${importData.姓名 || '未命名角色'}" 导入至最新消息楼层变量吗？\n如果已存在同名角色，将会覆盖其数据。`,
    );
    if (!ok) return;

    if (parseMode.value === 'loose') {
      const looseOk = window.confirm(
        '当前资料由基础资料恢复而来，可能缺少技能、装备或嵌套内容。确认检查无误后再保存？',
      );
      if (!looseOk) return;
    }

    importButtonText.value = '⏳';
    const characterName = importData.姓名 || '角色';
    props.saveFeedback?.({
      target: 'chat-variable',
      phase: 'pending',
      message: `${characterName} 正在导入至最新消息楼层变量…`,
      successMessage: `✓ ${characterName} 已导入至最新消息楼层变量。`,
    });
    await importToMvuVariables(importData, { type: 'message', message_id: Math.max(0, getLastMessageId()) });
    importing.value = false;
    flashImportButton('✓ 已保存', 3000);
    props.saveFeedback?.({
      target: 'chat-variable',
      phase: 'success',
      message: `✓ ${characterName} 已导入至最新消息楼层变量。`,
    });
  } catch (err: any) {
    console.error('MVU Import Error:', err);
    props.saveFeedback?.({
      target: 'chat-variable',
      phase: 'error',
      message: `✕ ${err?.message || '导入至最新消息楼层变量失败。'}`,
    });
    flashImportButton('❌', 1800);
    window.alert(`保存失败: ${err?.message || String(err)}`);
  } finally {
    importing.value = false;
  }
}

async function onImportWorldbook() {
  if (!sheetData.value || saveBusy.value) return;
  importing.value = true;
  closeImportMenu();

  try {
    if (parseMode.value === 'loose') {
      const looseOk = window.confirm(
        '当前资料由基础资料恢复而来，原始资料可能仍有格式错误。确认仍要保存到聊天世界书？',
      );
      if (!looseOk) return;
    }

    importButtonText.value = '⏳';
    const characterName = sheetData.value.姓名 || '角色';
    props.saveFeedback?.({
      target: 'worldbook',
      phase: 'pending',
      message: `${characterName} 正在保存到聊天世界书…`,
      successMessage: `✓ ${characterName} 已保存到聊天世界书。`,
    });
    console.info('[CharInfo Viewer] Chat worldbook import started', {
      characterName: sheetData.value.姓名 || '未命名角色',
      yamlLength: originalYamlText.value.length,
    });
    const result = await saveToChatWorldbook(sheetData.value, originalYamlText.value);
    importing.value = false;
    flashImportButton('✓ 已保存', 3000);
    props.saveFeedback?.({
      target: 'worldbook',
      phase: 'success',
      message: `✓ ${characterName} 已保存到聊天世界书。`,
    });
    console.info('[CharInfo Viewer] Chat worldbook import succeeded', result);
  } catch (err: any) {
    console.error('Worldbook Save Error:', err);
    props.saveFeedback?.({
      target: 'worldbook',
      phase: 'error',
      message: `✕ ${err?.message || '保存到聊天世界书失败。'}`,
    });
    flashImportButton('❌', 1800);
    window.alert(`保存失败: ${err?.message || String(err)}`);
  } finally {
    importing.value = false;
  }
}

function onDocumentClick() {
  if (showImportMenu.value) closeImportMenu();
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') closeImportMenu();
}

onMounted(() => {
  void initFromYaml().finally(() => {
    initializingViewer.value = false;
  });
  listenerDocument = viewerRootRef.value?.ownerDocument ?? null;
  listenerDocument?.addEventListener('click', onDocumentClick);
  listenerDocument?.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  if (importButtonResetTimer) {
    clearTimeout(importButtonResetTimer);
    importButtonResetTimer = null;
  }
  if (previewYamlRefreshTimer) {
    clearTimeout(previewYamlRefreshTimer);
    previewYamlRefreshTimer = null;
  }
  listenerDocument?.removeEventListener('click', onDocumentClick);
  listenerDocument?.removeEventListener('keydown', onKeydown);
  listenerDocument = null;
});
</script>

<style scoped>
:root {
  --race-color: #ffffff;
  --race-color-rgb: 255, 255, 255;
  --tier-color: #808080;
  --tier-color-rgb: 128, 128, 128;
  --name-font-stack:
    'Noto Serif SC', 'Source Han Serif SC', 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  --name-shadow: rgba(0, 0, 0, 0.58);
  --name-glow: rgba(var(--tier-color-rgb), 0.12);
  --tier-label-fg: #f3f6ff;
}

.viewer-root {
  min-height: 100vh;
  padding: 24px 12px 48px;
  color: #f0f0f0;
  font-family: 'Noto Sans SC', sans-serif;
}

.viewer-root.special-npc-viewer-root {
  min-height: 0;
  container-type: inline-size;
  container-name: char-info-viewer;
}

.viewer-root.viewer-root-embedded {
  min-height: 0;
  padding: 12px 0 24px;
}

.viewer-effects-disabled :where(*):not(img):not(video) {
  animation: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
  text-shadow: none !important;
  filter: none !important;
}

.loading-card,
.error-card {
  max-width: 720px;
  margin: 0 auto;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 16px;
}

.viewer-loading-shell {
  display: grid;
  grid-template-columns: minmax(260px, 45%) minmax(0, 1fr);
  width: min(100%, 1200px);
  min-height: 680px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(150, 221, 223, 0.45);
  border-radius: 16px;
  background: #11141d;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.025) inset,
    0 18px 50px rgba(0, 0, 0, 0.34);
}

.viewer-loading-portrait {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 38% 32%, rgba(132, 213, 220, 0.18), transparent 38%),
    linear-gradient(145deg, #162331, #0c1018 72%);
}

.viewer-loading-portrait::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 58%, #11141d);
}

.viewer-loading-snowflake {
  color: rgba(157, 226, 226, 0.72);
  font-size: calc(clamp(34px, 6cqw, 72px) + var(--ci-font-size-adjust, 0px));
  text-shadow: 0 0 26px rgba(132, 213, 220, 0.48);
  animation: viewer-loading-pulse 1.2s ease-in-out infinite alternate;
}

.viewer-loading-data {
  display: flex;
  min-width: 0;
  padding: clamp(40px, 6cqw, 76px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.viewer-loading-kicker {
  color: rgba(155, 224, 224, 0.72);
  font-size: calc(11px + var(--ci-font-size-adjust, 0px));
  font-weight: 800;
  letter-spacing: 0.18em;
}

.viewer-loading-line {
  width: min(68%, 360px);
  height: 12px;
  margin-top: 18px;
  border-radius: 999px;
  background: rgba(214, 244, 244, 0.11);
}

.viewer-loading-line.is-title {
  width: min(46%, 240px);
  height: 30px;
}

.viewer-loading-line.is-subtitle {
  width: min(58%, 310px);
  margin-top: 12px;
}

.viewer-loading-flags {
  display: grid;
  grid-template-columns: repeat(3, minmax(54px, 96px));
  gap: 12px;
  justify-content: center;
  width: 100%;
  margin-top: 54px;
}

.viewer-loading-flags span {
  height: 90px;
  border-top: 2px solid rgba(155, 224, 224, 0.35);
  background: rgba(4, 7, 12, 0.42);
  clip-path: polygon(0 0, 100% 0, 100% 84%, 50% 100%, 0 84%);
}

.viewer-loading-flags span:nth-child(n + 4) {
  transform: translateX(56%);
}

.viewer-loading-resources {
  display: grid;
  grid-template-columns: repeat(3, minmax(70px, 110px));
  gap: 1px;
  width: min(82%, 380px);
  margin-top: 38px;
  background: rgba(155, 224, 224, 0.14);
}

.viewer-loading-resources span {
  height: 48px;
  background: #11141d;
}

.viewer-loading-data p {
  margin: 42px 0 0;
  color: rgba(226, 241, 244, 0.66);
  font-size: calc(13px + var(--ci-font-size-adjust, 0px));
  letter-spacing: 0.08em;
}

@keyframes viewer-loading-pulse {
  from {
    opacity: 0.36;
    transform: scale(0.94);
  }
  to {
    opacity: 0.9;
    transform: scale(1);
  }
}

@media (max-width: 820px) {
  .viewer-loading-shell {
    display: flex;
    min-height: 620px;
    flex-direction: column;
  }

  .viewer-loading-portrait {
    min-height: 350px;
    flex: 1 1 auto;
  }

  .viewer-loading-portrait::after {
    background: linear-gradient(180deg, transparent 62%, #11141d);
  }

  .viewer-loading-data {
    flex: 0 0 auto;
    padding: 28px 22px 34px;
  }

  .viewer-loading-line.is-title {
    height: 24px;
  }

  .viewer-loading-flags {
    display: none;
  }

  .viewer-loading-resources {
    margin-top: 26px;
  }

  .viewer-loading-data p {
    margin-top: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .viewer-loading-snowflake {
    animation: none;
  }
}

.error-body {
  margin-top: 10px;
  font-size: calc(0.9rem + var(--ci-font-size-adjust, 0px));
}

.yaml-error-row {
  margin-bottom: 6px;
}

.yaml-error-title {
  font-weight: 700;
  margin-bottom: 6px;
}

.yaml-error-pre {
  margin: 0;
  padding: 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  white-space: pre;
  overflow: auto;
}

.yaml-error-pre.alt {
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.yaml-error-details {
  margin-top: 10px;
}

.yaml-error-details summary {
  cursor: pointer;
  user-select: none;
}

.yaml-rescue-box,
.parse-warning-card {
  margin: 12px 0;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(246, 217, 130, 0.36);
  background: radial-gradient(ellipse at 0 0, rgba(246, 217, 130, 0.14), transparent 58%), rgba(15, 22, 36, 0.76);
  color: rgba(255, 252, 242, 0.92);
}

.yaml-rescue-box p {
  margin: 8px 0 0;
  color: rgba(255, 252, 242, 0.72);
  line-height: 1.55;
}

.yaml-rescue-button {
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(246, 217, 130, 0.62);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(246, 217, 130, 0.16), rgba(246, 217, 130, 0.06));
  color: #ffe79c;
  cursor: pointer;
  font-weight: 800;
}

.yaml-rescue-button:disabled {
  opacity: 0.62;
  cursor: wait;
}

.parse-warning-card {
  max-width: 920px;
  margin: 0 auto 14px;
  font-size: calc(13px + var(--ci-font-size-adjust, 0px));
  font-weight: 700;
}

@media (max-width: 820px) {
  .viewer-root {
    padding: 18px 10px 36px;
  }
}
</style>
