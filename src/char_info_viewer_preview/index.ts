import { createApp, computed, h, reactive, type App as VueApp } from 'vue';

import ViewerApp from '../char_info_viewer/App.vue';
import { buildCharacterPreviewSample, PREVIEW_TIER_OPTIONS } from './previewSamples';
import './preview.css';

// 预览页独立于酒馆环境运行，先补上查看器会触碰的全局接口，
// 让卡内交互（导入菜单、确认弹窗等）在预览里也能走完整流程而不抛错。
function installGlobals(target: Record<string, unknown>): void {
  if (typeof target.getVariables !== 'function') target.getVariables = () => ({});
  if (typeof target.getLastMessageId !== 'function') target.getLastMessageId = () => 0;
  if (typeof target.waitGlobalInitialized !== 'function') target.waitGlobalInitialized = () => Promise.resolve();
  if (!target.Mvu) {
    target.Mvu = {
      getMvuData: () => ({}),
      replaceMvuData: async () => undefined,
      events: { VARIABLE_INITIALIZED: 'variable-initialized', VARIABLE_UPDATE_ENDED: 'variable-update-ended' },
    };
  }
  if (!target._) {
    target._ = {
      has: (object: unknown, path: string) => String(path).split('.').every(key => !!object && key in (object as object)),
    };
  }
  if (!target.toastr) {
    target.toastr = {
      info: () => undefined,
      success: () => undefined,
      error: () => undefined,
      warning: () => undefined,
    };
  }
}

const state = reactive({
  tier: 5,
  effectsEnabled: true,
  collapseModeEnabled: true,
});

// 只在 tier 变化时产出新的资料对象，避免无关开关触发查看器内部重新解析。
const sample = computed(() => buildCharacterPreviewSample(state.tier));

const tierButtonsHost = document.querySelector('#tier-buttons');
const viewport = document.querySelector('#viewport');
const cardHost = document.querySelector('#card');
const toolbar = document.querySelector('.preview-toolbar');

let mountedApp: VueApp | null = null;

function mountPreview(): void {
  if (!cardHost) return;
  cardHost.textContent = '';
  mountedApp = createApp({
    render: () =>
      h(ViewerApp, {
        yamlText: '',
        messageId: 0,
        embedded: true,
        readOnly: false,
        effectsEnabled: state.effectsEnabled,
        collapseModeEnabled: state.collapseModeEnabled,
        previewMode: true,
        previewData: sample.value.data,
      }),
  });
  mountedApp.mount(cardHost);
}

function applyDevice(device: 'desktop' | 'mobile'): void {
  if (!viewport) return;
  viewport.dataset.device = device;
}

function markActiveGroup(datasetKey: string, value: string): void {
  toolbar?.querySelectorAll<HTMLElement>(`[data-${datasetKey}]`).forEach(button => {
    button.classList.toggle('is-active', button.dataset[datasetKey] === value);
  });
}

function buildTierButtons(): void {
  if (!tierButtonsHost) return;
  PREVIEW_TIER_OPTIONS.forEach(tier => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preview-tier-button';
    button.dataset.tier = String(tier);
    button.textContent = `T${tier}`;
    tierButtonsHost.append(button);
  });
}

function initToolbar(): void {
  tierButtonsHost?.querySelectorAll<HTMLButtonElement>('.preview-tier-button').forEach(button => {
    button.addEventListener('click', () => {
      const tier = Number(button.dataset.tier);
      if (!Number.isFinite(tier)) return;
      state.tier = tier;
      markActiveGroup('tier', String(tier));
    });
  });

  toolbar?.querySelectorAll<HTMLButtonElement>('[data-device]').forEach(button => {
    button.addEventListener('click', () => {
      const device = button.dataset.device === 'mobile' ? 'mobile' : 'desktop';
      applyDevice(device);
      markActiveGroup('device', device);
    });
  });

  toolbar?.querySelectorAll<HTMLButtonElement>('[data-collapse]').forEach(button => {
    button.addEventListener('click', () => {
      state.collapseModeEnabled = button.dataset.collapse === 'on';
      markActiveGroup('collapse', button.dataset.collapse ?? 'off');
    });
  });

  toolbar?.querySelectorAll<HTMLButtonElement>('[data-effects]').forEach(button => {
    button.addEventListener('click', () => {
      state.effectsEnabled = button.dataset.effects === 'on';
      markActiveGroup('effects', button.dataset.effects ?? 'off');
    });
  });
}

async function ensureVueGlobal(): Promise<void> {
  const scope = window as unknown as Record<string, unknown>;
  if (scope.Vue) return;
  const source = 'https://testingcf.jsdelivr.net/npm/vue@3.5.42/dist/vue.global.prod.js';
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error(`Vue 全局构建加载失败: ${source}`)));
    document.head.append(script);
  });
}

function init(): void {
  installGlobals(window as unknown as Record<string, unknown>);
  buildTierButtons();
  initToolbar();
  applyDevice('desktop');
  markActiveGroup('tier', '5');
  markActiveGroup('device', 'desktop');
  markActiveGroup('collapse', 'on');
  markActiveGroup('effects', 'on');
}

function bootstrap(): void {
  void ensureVueGlobal()
    .then(mountPreview)
    .catch(error => {
      console.error('[CharInfo Preview] 预览无法启动：', error);
      if (cardHost) cardHost.textContent = `预览启动失败：${(error as Error)?.message ?? String(error)}`;
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.previewBoot = 'dom-ready';
  init();
  bootstrap();
});
else {
  document.documentElement.dataset.previewBoot = 'immediate';
  init();
  bootstrap();
}

window.addEventListener('beforeunload', () => mountedApp?.unmount());