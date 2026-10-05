<template>
  <div class="dx-lab">
    <header class="dx-lab-toolbar">
      <div class="dx-lab-group">
        <span class="dx-lab-label">Theme</span>
        <button
          v-for="option in themes"
          :key="option.id"
          class="dx-lab-btn"
          :class="{ 'is-active': theme === option.id }"
          type="button"
          @click="theme = option.id"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="dx-lab-group">
        <span class="dx-lab-label">Viewport</span>
        <button
          v-for="option in viewports"
          :key="option.id"
          class="dx-lab-btn"
          :class="{ 'is-active': viewport === option.id }"
          type="button"
          @click="viewport = option.id"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="dx-lab-group">
        <span class="dx-lab-label">Fixture</span>
        <button
          v-for="option in fixtures"
          :key="option.id"
          class="dx-lab-btn"
          :class="{ 'is-active': fixtureId === option.id }"
          type="button"
          @click="fixtureId = option.id"
        >
          {{ option.name }}
        </button>
      </div>

      <span class="dx-lab-meta">{{ viewportSize.label }} · {{ current.name }}</span>
    </header>

    <div class="dx-lab-stage">
      <div class="dx-lab-frame" :class="`is-${viewport}`">
        <!--
          `dx-lab-user-design` 是 editable CSS 的稳定 scope。
          外部 LLM 的所有自定义规则都应以它起头，避免污染 toolbar。
        -->
        <div class="dx-lab-user-design">
          <IllustratedV2Sheet
            :key="renderKey"
            v-bind="sheetProps"
            :theme="theme"
            @fallback-to-default="onFallbackToDefault"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import IllustratedV2Sheet from '@/char_info_viewer/components/illustrated/dx/IllustratedV2Sheet.vue';
import { dxLabFixtures, dxLabThemes } from './fixtures';
import {
  ATTRIBUTE_KEYS,
  buildAttributeWarningMap,
  getAttributeRawValue,
  splitAttributeFormula,
} from '@/char_info_viewer/services/attributeWarning';
import { buildCharacterViewModel, pickField } from '@/char_info_viewer/services/characterViewModel';
import { resolveCharacterVisualPreview } from '@/char_info_viewer/services/themeService';
import type { AttributeView } from '@/char_info_viewer/components/illustrated/types';

type ViewportId = 'desktop' | 'narrow' | 'mobile';

const VIEWPORTS: { id: ViewportId; label: string; width: number; height: number; force: boolean }[] = [
  { id: 'desktop', label: 'Desktop', width: 1200, height: 860, force: false },
  { id: 'narrow', label: 'Narrow', width: 1000, height: 860, force: false },
  { id: 'mobile', label: 'Mobile', width: 390, height: 844, force: true },
];

/**
 * 与 App.vue 一致的属性短名表；Lab 走同一条展示链路。
 * 用函数而不是 const 对象，避免 eslint no-import-assign 对冻结对象的误判。
 */
function attributeLabel(key: string): string {
  switch (key) {
    case 'strength':
      return '力量';
    case 'agility':
      return '敏捷';
    case 'constitution':
      return '体质';
    case 'intelligence':
      return '智力';
    case 'spirit':
      return '精神';
    default:
      return key;
  }
}

const theme = ref<'default' | 'iris' | 'anastasia'>('iris');
const viewport = ref<ViewportId>('desktop');
const fixtureId = ref('iris-full');
const fallbackActive = ref(false);

const themes = dxLabThemes;
const fixtures = dxLabFixtures;
const viewports = VIEWPORTS;

const current = computed(() => fixtures.find(f => f.id === fixtureId.value) ?? fixtures[0]);
const viewportSize = computed(() => VIEWPORTS.find(v => v.id === viewport.value) ?? VIEWPORTS[0]);

/**
 * `specialNpc` 品牌是 `themeService` 内部的 Symbol，只能由正规解析链路打上。
 * Lab 走 `resolveCharacterVisualPreview`（同步、无 ST 依赖），与 Viewer 的 previewMode
 * 路径同源，而不是自己伪造 Symbol。
 */
const resolvedData = computed(() =>
  resolveCharacterVisualPreview(current.value.data as never, current.value.name, undefined),
);

/**
 * Lab-only offline portrait adapter。
 *
 * 产品的 `buildCharacterViewModel` / `normalizePortraitMediaUrlForBrowser` 故意只接受
 * 正式媒体 URL（https / 本地 gallery），**不要**为了 Lab 允许 data: URL 而放宽产品规则。
 *
 * 离线 Lab 的 fixture 用 embedded data URI 保证 file:// 下不依赖网络，所以这里在
 * VM 已经构建完成之后，只覆盖媒体相关字段。
 *
 * 这不是业务逻辑，也不复制 portrait controller —— 它只是把「Lab 的离线立绘」
 * 接到真实 renderer 已经消费的那几个字段上。
 */
const vm = computed(() => {
  const base = buildCharacterViewModel(resolvedData.value, ['local', 'remote']);
  const portraitUrl = current.value.portraitUrl;
  if (!portraitUrl) return base;

  return {
    ...base,
    imageUrl: portraitUrl,
    imageUrls: [portraitUrl],
    imageSourceGroups: [[portraitUrl]],
    randomizeInitialImage: false,
  };
});

const attributes = computed<AttributeView[]>(() => {
  const source = resolvedData.value;
  const attrObj = (pickField(source, '属性', '属性') || {}) as Record<string, unknown>;
  const warningMap = buildAttributeWarningMap(attrObj, pickField(source, '等级'));
  return ATTRIBUTE_KEYS.map(key => {
    const parsed = splitAttributeFormula(getAttributeRawValue(attrObj, key));
    const warning = warningMap[key as keyof typeof warningMap];
    return {
      key,
      short: attributeLabel(key),
      total: parsed.total,
      formula: parsed.formula,
      formulaParts: warning?.formulaPartWarnings || [],
      isTotalAbnormal: !!warning?.isTotalAbnormal,
      hasFormulaWarning: !!warning?.hasFormulaWarning,
      showFormula: false,
    };
  });
});

const renderKey = computed(() => `${theme.value}-${viewport.value}-${fixtureId.value}-${fallbackActive.value}`);

const sheetProps = computed(() => ({
  vm: vm.value,
  attributes: attributes.value,
  savePhase: 'idle' as const,
  showImportMenu: false,
  readOnly: true,
  debugEnabled: false,
  forceMobileLayout: viewportSize.value.force,
  specialNpc: current.value.specialNpc,
}));

function onFallbackToDefault(): void {
  fallbackActive.value = true;
}

/**
 * 把 editable decoration DOM 注入到**当前生效的** DX surface。
 *
 * 刻意不改 IllustratedV2Sheet 的 public API：Lab 在 mount 之后自行找到
 * `.illustrated-v2-surface` 并挂一个 Lab-only host。theme / viewport / fixture
 * 变化导致 remount 后重新注入。
 */
function injectEditableDecoration(): void {
  const template = document.getElementById('dx-lab-editable-decoration-dom');
  const surface = document.querySelector('.dx-lab-user-design .illustrated-v2-surface');
  if (!template || !surface) return;

  let host = surface.querySelector<HTMLElement>('.dx-lab-user-decoration-layer');
  if (!host) {
    host = document.createElement('div');
    host.className = 'dx-lab-user-decoration-layer';
    // 装饰层压在 sheet 之上，但不吃交互。
    host.style.position = 'absolute';
    host.style.inset = '0';
    host.style.zIndex = '20';
    host.style.pointerEvents = 'none';
    surface.appendChild(host);
  }
  host.innerHTML = (template as HTMLTemplateElement).innerHTML;
}

onMounted(() => {
  void nextTick(injectEditableDecoration);
});

watch([renderKey, theme, viewport, fixtureId], () => {
  void nextTick(() => {
    // remount 后旧的 host 已随 DOM 丢弃，重新挂一个。
    void nextTick(injectEditableDecoration);
  });
});
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  background: #0b0d12;
  color: #e6eaf0;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', system-ui, sans-serif;
}

.dx-lab-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: #12151c;
}

.dx-lab-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.dx-lab-label {
  color: #8b95a5;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dx-lab-btn {
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  background: #1b1f28;
  color: #dfe5ec;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.dx-lab-btn.is-active {
  border-color: #6fa8ff;
  background: #24344d;
  color: #fff;
}

.dx-lab-meta {
  margin-left: auto;
  color: #8b95a5;
  font-size: 12px;
}

.dx-lab-stage {
  display: flex;
  justify-content: center;
  padding: 24px 16px 48px;
  overflow: auto;
}

.dx-lab-frame {
  width: 100%;
  max-width: 100%;
}

.dx-lab-frame.is-desktop {
  width: 1200px;
}

.dx-lab-frame.is-narrow {
  width: 1000px;
}

.dx-lab-frame.is-mobile {
  width: 390px;
}

/* 移动视口下强制模拟 force-mobile，宽度限制由 frame 决定。 */
.dx-lab-frame.is-mobile .dx-lab-user-design {
  container-type: inline-size;
  container-name: char-info-viewer;
  width: 390px;
}
</style>
