<template>
  <div class="manager-root" @keydown.esc="emit('close')">
    <button class="backdrop" type="button" aria-label="关闭管理器" @click="emit('close')"></button>

    <main class="manager-dialog" role="dialog" aria-modal="true" aria-labelledby="manager-title">
      <header class="dialog-header">
        <div>
          <p class="eyebrow">CharInfo Creator Tool</p>
          <h1 id="manager-title">角色图片管理</h1>
          <p class="header-description">{{ activeStepDescription }}</p>
        </div>
        <div class="header-actions">
          <span class="phase-badge">步骤 {{ activeStep }} / {{ steps.length }}</span>
          <button class="close-button" type="button" aria-label="关闭" @click="emit('close')">×</button>
        </div>
      </header>

      <div class="dialog-body">
        <nav class="wizard-step-nav" aria-label="角色视觉配置步骤">
          <div class="wizard-nav-header">
            <span>配置流程</span>
            <strong>{{ activeStep }} / {{ steps.length }}</strong>
          </div>

          <button
            v-for="step in steps"
            :key="step.id"
            type="button"
            :class="{ active: activeStep === step.id, complete: isStepComplete(step.id) }"
            :disabled="!canVisitStep(step.id)"
            :aria-current="activeStep === step.id ? 'step' : undefined"
            @click="goToStep(step.id)"
          >
            <span class="wizard-step-index">{{ isStepComplete(step.id) ? '✓' : step.id }}</span>
            <span class="wizard-step-copy">
              <strong>{{ step.title }}</strong>
              <small>{{ step.description }}</small>
            </span>
            <small class="wizard-step-short-label">{{ step.shortLabel }}</small>
          </button>

          <div class="wizard-nav-context">
            <small>正在配置</small>
            <strong>{{ profile.characterName || selectedEntry?.name || '尚未选择角色' }}</strong>
            <span>{{ selectedEntry ? '资料会写入当前所选条目' : '请先完成步骤 1' }}</span>
          </div>
        </nav>

        <aside
          id="manager-step-1"
          class="target-panel wizard-step-section"
          :class="{ 'is-collapsed': activeStep !== 1 }"
        >
          <div class="mobile-section-toggle mobile-target-toggle">
            <span class="step-number">1</span>
            <span class="mobile-section-copy">
              <strong>选择写入目标</strong>
              <small>{{ selectedEntry?.name || '尚未选择角色条目' }}</small>
            </span>
          </div>

          <div id="target-panel-content" class="target-panel-content">
            <section class="target-section">
              <div class="section-title-row">
                <div>
                  <span class="step-label">步骤 1</span>
                  <h2>选择写入目标</h2>
                </div>
                <button
                  class="icon-button"
                  type="button"
                  title="重新读取"
                  :disabled="loadingWorldbooks"
                  @click="loadWorldbooks"
                >
                  ↻
                </button>
              </div>

              <div class="current-character">
                <span>当前角色卡</span>
                <strong>{{ currentCharacterName || '未打开角色卡' }}</strong>
              </div>

              <div class="field">
                <span class="field-label">搜索并选择世界书</span>
                <div class="entry-combobox" @focusout="onWorldbookPickerFocusout">
                  <input
                    v-model="worldbookSearch"
                    type="search"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="worldbook-options"
                    :aria-expanded="worldbookPickerOpen"
                    placeholder="输入世界书名称或点击选择"
                    :disabled="loadingWorldbooks || worldbooks.length === 0"
                    @focus="openWorldbookPicker"
                    @input="onWorldbookSearchInput"
                    @keydown.down.prevent="moveWorldbookHighlight(1)"
                    @keydown.up.prevent="moveWorldbookHighlight(-1)"
                    @keydown.enter.prevent="selectHighlightedWorldbook"
                    @keydown.esc.stop="worldbookPickerOpen = false"
                  />
                  <button
                    class="entry-picker-button"
                    type="button"
                    tabindex="-1"
                    aria-label="展开世界书列表"
                    :disabled="loadingWorldbooks || worldbooks.length === 0"
                    @mousedown.prevent
                    @click="toggleWorldbookPicker"
                  >
                    ⌄
                  </button>

                  <div
                    v-if="worldbookPickerOpen"
                    id="worldbook-options"
                    class="entry-options"
                    role="listbox"
                  >
                    <button
                      v-for="(worldbook, index) in filteredWorldbooks"
                      :key="worldbook"
                      type="button"
                      role="option"
                      :aria-selected="worldbook === selectedWorldbookName"
                      :class="{ highlighted: index === highlightedWorldbookIndex }"
                      @mousedown.prevent
                      @mouseenter="highlightedWorldbookIndex = index"
                      @click="selectWorldbook(worldbook)"
                    >
                      <span>{{ worldbook }}</span>
                      <small v-if="isCharacterWorldbook(worldbook)">当前角色</small>
                    </button>
                    <p v-if="filteredWorldbooks.length === 0" class="entry-empty">没有符合条件的世界书</p>
                  </div>
                </div>
              </div>

              <div class="field">
                <span class="field-label">搜索并选择角色条目</span>
                <div class="entry-combobox" @focusout="onEntryPickerFocusout">
                  <input
                    v-model="entrySearch"
                    type="search"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="entry-options"
                    :aria-expanded="entryPickerOpen"
                    placeholder="输入名称或点击选择"
                    :disabled="entries.length === 0"
                    @focus="openEntryPicker"
                    @input="onEntrySearchInput"
                    @keydown.down.prevent="moveEntryHighlight(1)"
                    @keydown.up.prevent="moveEntryHighlight(-1)"
                    @keydown.enter.prevent="selectHighlightedEntry"
                    @keydown.esc.stop="entryPickerOpen = false"
                  />
                  <button
                    class="entry-picker-button"
                    type="button"
                    tabindex="-1"
                    aria-label="展开角色条目列表"
                    :disabled="entries.length === 0"
                    @mousedown.prevent
                    @click="toggleEntryPicker"
                  >
                    ⌄
                  </button>

                  <div v-if="entryPickerOpen" id="entry-options" class="entry-options" role="listbox">
                    <button
                      v-for="(entry, index) in filteredEntries"
                      :key="entry.uid"
                      type="button"
                      role="option"
                      :aria-selected="entry.uid === selectedEntryUid"
                      :class="{ highlighted: index === highlightedEntryIndex }"
                      @mousedown.prevent
                      @mouseenter="highlightedEntryIndex = index"
                      @click="selectEntry(entry)"
                    >
                      <span>{{ entry.name || `未命名条目 #${entry.uid}` }}</span>
                      <small v-if="!entry.enabled">已禁用</small>
                    </button>
                    <p v-if="filteredEntries.length === 0" class="entry-empty">没有符合条件的条目</p>
                  </div>
                </div>
              </div>

              <div v-if="selectedEntry" class="target-summary">
                <span class="status-dot" :class="entryStateClass"></span>
                <div>
                  <strong>{{ entryStateTitle }}</strong>
                  <p>{{ entryStateDescription }}</p>
                </div>
              </div>

              <p v-if="loadError" class="message error">{{ loadError }}</p>
            </section>

            <section class="safety-note">
              <strong>安全写入规则</strong>
              <p>只替换工具自己的标记区块，不会改动角色原本的设定、EJS 分支或启用状态。</p>
            </section>

            <div class="wizard-step-actions">
              <span></span>
              <button type="button" class="primary-button" :disabled="!selectedEntry" @click="goToStep(2)">
                下一步：角色资料
              </button>
            </div>
          </div>
        </aside>

        <form v-show="activeStep !== 1" class="editor-panel" novalidate @submit.prevent="saveToEntry">
          <section
            id="manager-step-2"
            class="form-section wizard-step-section"
            :class="{ 'is-collapsed': activeStep !== 2 }"
          >
            <div class="mobile-section-toggle">
              <span class="step-number">2</span>
              <span class="mobile-section-copy">
                <strong>角色资料</strong>
                <small>{{ profile.characterName || '填写姓名、头像与登场台词' }}</small>
              </span>
            </div>

            <div class="section-heading">
              <span class="step-number">2</span>
              <div>
                <h2>角色资料</h2>
                <p>填写 <code>&lt;char_info&gt;</code> 内的真实姓名；世界书条目标题只是写入位置，不会用作角色姓名。</p>
              </div>
            </div>

            <div id="manager-step-2-content" class="mobile-step-content">
              <div class="field-grid">
                <label class="field">
                  <span class="field-label">角色姓名 <b>*</b></span>
                  <input
                    v-model="profile.characterName"
                    type="text"
                    maxlength="80"
                    autocomplete="off"
                    placeholder="例如：傲雪"
                  />
                </label>

                <label class="field">
                  <span class="field-label">状态栏头像 URL <small>选填</small></span>
                  <input
                    v-model="profile.avatarUrl"
                    type="url"
                    inputmode="url"
                    autocomplete="off"
                    placeholder="https://…/avatar.webp"
                  />
                </label>

                <label class="field field-full">
                  <span class="field-label">
                    登场台词
                    <small>{{ profile.entranceQuote.length }}/60</small>
                  </span>
                  <textarea
                    v-model="profile.entranceQuote"
                    maxlength="60"
                    rows="2"
                    placeholder="例如：霜雪会记住每一道剑痕。"
                  ></textarea>
                </label>
              </div>

              <div class="wizard-step-actions">
                <button type="button" class="secondary-button" @click="goToStep(1)">上一步</button>
                <button
                  type="button"
                  class="primary-button"
                  :disabled="!profile.characterName.trim()"
                  @click="goToStep(3)"
                >
                  下一步：主题颜色
                </button>
              </div>
            </div>
          </section>

          <section
            id="manager-step-3"
            class="form-section wizard-step-section"
            :class="{ 'is-collapsed': activeStep !== 3 }"
          >
            <div class="mobile-section-toggle">
              <span class="step-number">3</span>
              <span class="mobile-section-copy">
                <strong>主题颜色</strong>
                <small>{{ customizeColors ? '已启用自定义配色' : '使用 CharInfo 默认配色' }}</small>
              </span>
            </div>

            <div class="section-heading">
              <span class="step-number">3</span>
              <div>
                <h2>主题颜色</h2>
                <p>选填；关闭时不写入颜色，让 CharInfo 使用角色资料的默认主题。</p>
              </div>
            </div>

            <div id="manager-step-3-content" class="mobile-step-content">
              <label class="color-custom-toggle">
                <input v-model="customizeColors" type="checkbox" @change="onCustomizeColorsChange" />
                <span>
                  <strong>启用自定义主题颜色</strong>
                  <small>{{ customizeColors ? '正在使用创作者指定颜色' : '使用 CharInfo 默认配色' }}</small>
                </span>
              </label>

              <div v-if="customizeColors" class="color-grid">
                <label class="color-field">
                  <span>种族颜色</span>
                  <div class="color-control">
                    <input v-model="profile.raceColor" type="color" aria-label="选择种族颜色" />
                    <input v-model="profile.raceColor" type="text" maxlength="7" spellcheck="false" />
                  </div>
                </label>

                <label class="color-field">
                  <span>阶层颜色</span>
                  <div class="color-control">
                    <input v-model="profile.tierColor" type="color" aria-label="选择阶层颜色" />
                    <input v-model="profile.tierColor" type="text" maxlength="7" spellcheck="false" />
                  </div>
                </label>
              </div>

              <div class="wizard-step-actions">
                <button type="button" class="secondary-button" @click="goToStep(2)">上一步</button>
                <button type="button" class="primary-button" @click="goToStep(4)">下一步：角色相册</button>
              </div>
            </div>
          </section>

          <section
            id="manager-step-4"
            class="form-section wizard-step-section"
            :class="{ 'is-collapsed': activeStep !== 4 }"
          >
            <div class="mobile-section-toggle">
              <span class="step-number">4</span>
              <span class="mobile-section-copy">
                <strong>角色相册</strong>
                <small>{{ configuredGalleryCount }} 张已填写图片</small>
              </span>
            </div>

            <div class="section-heading">
              <span class="step-number">4</span>
              <div>
                <h2>角色相册</h2>
                <p>第一张固定为 CharInfo 主立绘；标题会同步给 Aoo 状态栏相册。</p>
              </div>
            </div>

            <div id="manager-step-4-content" class="mobile-step-content">
              <div class="gallery-list">
                <article v-for="(image, index) in profile.gallery" :key="image.id" class="gallery-card">
                  <div class="image-preview">
                    <img
                      v-if="resolveGalleryPreviewUrl(image.url)"
                      :src="resolveGalleryPreviewUrl(image.url)"
                      :alt="image.title || `第 ${index + 1} 张立绘`"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                    />
                    <span v-else aria-hidden="true">▧</span>
                    <b v-if="index === 0">主立绘</b>
                  </div>

                  <div class="gallery-fields">
                    <label class="field">
                      <span class="field-label">图片标题</span>
                      <input v-model="image.title" type="text" autocomplete="off" />
                    </label>
                    <label class="field">
                      <span class="field-label">图片 URL</span>
                      <input
                        v-model="image.url"
                        type="url"
                        inputmode="url"
                        autocomplete="off"
                        placeholder="https://…/portrait.webp"
                      />
                    </label>
                  </div>

                  <div class="gallery-actions">
                    <button type="button" title="上移" :disabled="index === 0" @click="moveImage(index, -1)">↑</button>
                    <button
                      type="button"
                      title="下移"
                      :disabled="index === profile.gallery.length - 1"
                      @click="moveImage(index, 1)"
                    >
                      ↓
                    </button>
                    <button
                      class="danger"
                      type="button"
                      title="删除"
                      :disabled="profile.gallery.length === 1"
                      @click="removeImage(index)"
                    >
                      ×
                    </button>
                  </div>
                </article>
              </div>

              <button class="add-image-button" type="button" @click="addImage">＋ 添加一张图片</button>

              <div class="wizard-step-actions">
                <button type="button" class="secondary-button" @click="goToStep(3)">上一步</button>
                <button type="button" class="primary-button" @click="goToStep(5)">下一步：确认写入</button>
              </div>
            </div>
          </section>

          <section
            id="manager-step-5"
            class="output-section wizard-step-section"
            :class="{ 'is-collapsed': activeStep !== 5 }"
          >
            <div class="mobile-section-toggle">
              <span class="step-number">5</span>
              <span class="mobile-section-copy">
                <strong>确认写入</strong>
                <small>预览结果并保存到世界书条目</small>
              </span>
            </div>

            <div class="output-heading">
              <div>
                <h2>写入预览</h2>
                <p>{{ generatedCode ? `${generatedCode.split('\n').length} 行 EJS` : '填写完整后生成' }}</p>
              </div>
              <button type="button" class="secondary-button" :disabled="!generatedCode" @click="copyEjs">
                复制 EJS
              </button>
            </div>

            <details>
              <summary>查看将写入的 EJS</summary>
              <p class="ejs-metadata-note">
                v2 区块中的 profile 是唯一配置来源；管理器从它还原表单，下面的代码再把同一份资料写入聊天变量。
              </p>
              <pre>{{ generatedCode || '尚未生成有效 EJS。' }}</pre>
            </details>

            <div class="wizard-step-actions wizard-step-actions-final">
              <button type="button" class="secondary-button" @click="goToStep(4)">上一步</button>
            </div>

            <div class="save-bar">
              <div class="save-feedback" aria-live="polite">
                <strong :class="{ success: saveState === 'success', error: saveState === 'error' }">
                  {{ saveMessage }}
                </strong>
                <span v-if="validationErrors.length">{{ validationErrors[0] }}</span>
              </div>
              <button class="primary-button" type="submit" :disabled="!canSave">
                {{ saving ? '正在写入…' : '保存并写入所选条目' }}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';

import { normalizePortraitMediaUrlForBrowser } from '../char_info_viewer/services/imageUrl';
import {
  buildManagedEjsBlock,
  createEmptyProfile,
  DEFAULT_RACE_COLOR,
  DEFAULT_TIER_COLOR,
  hasUnmanagedVisualEjs,
  inspectManagedBlock,
  isHttpsUrl,
  normalizeProfile,
  upsertManagedEjsBlock,
  validateProfile,
  type CharacterVisualProfile,
} from './ejsProfile';
import { buildWorldbookList } from './worldbookList';

interface EditableGalleryImage {
  id: number;
  title: string;
  url: string;
}

interface EditableProfile extends Omit<CharacterVisualProfile, 'gallery'> {
  gallery: EditableGalleryImage[];
}

type StepId = 1 | 2 | 3 | 4 | 5;

const emit = defineEmits<{ close: [] }>();
const steps: { id: StepId; shortLabel: string; title: string; description: string }[] = [
  { id: 1, shortLabel: '目标', title: '选择写入目标', description: '选择角色世界书条目' },
  { id: 2, shortLabel: '资料', title: '填写角色资料', description: '姓名、头像与登场台词' },
  { id: 3, shortLabel: '配色', title: '设置主题颜色', description: '可选的角色专属配色' },
  { id: 4, shortLabel: '相册', title: '整理角色相册', description: '主立绘、标题与备用图片' },
  { id: 5, shortLabel: '确认', title: '检查并写入', description: '预览 EJS 后安全保存' },
];

const currentCharacterName = ref('');
const worldbooks = ref<string[]>([]);
const characterWorldbooks = ref<string[]>([]);
const entries = ref<WorldbookEntry[]>([]);
const selectedWorldbookName = ref('');
const worldbookSearch = ref('');
const worldbookPickerOpen = ref(false);
const highlightedWorldbookIndex = ref(-1);
const selectedEntryUid = ref<number | null>(null);
const entrySearch = ref('');
const entryPickerOpen = ref(false);
const highlightedEntryIndex = ref(-1);
const loadingWorldbooks = ref(false);
const loadingEntries = ref(false);
const loadError = ref('');
const activeStep = ref<StepId>(1);
const furthestStep = ref<StepId>(1);
const customizeColors = ref(false);
const saving = ref(false);
const saveState = ref<'idle' | 'success' | 'error'>('idle');
const saveMessage = ref('选择世界书条目后即可写入。');
let nextImageId = 1;

const profile = reactive<EditableProfile>(toEditableProfile(createEmptyProfile()));

function toEditableProfile(value: CharacterVisualProfile): EditableProfile {
  return {
    ...value,
    gallery: value.gallery.map(image => ({ ...image, id: nextImageId++ })),
  };
}

function toSerializableProfile(): CharacterVisualProfile {
  return {
    characterName: profile.characterName,
    avatarUrl: profile.avatarUrl,
    raceColor: profile.raceColor,
    tierColor: profile.tierColor,
    entranceQuote: profile.entranceQuote,
    gallery: profile.gallery.map(({ title, url }) => ({ title, url })),
  };
}

function replaceProfile(value: CharacterVisualProfile) {
  const editable = toEditableProfile(value);
  profile.characterName = editable.characterName;
  profile.avatarUrl = editable.avatarUrl;
  profile.raceColor = editable.raceColor;
  profile.tierColor = editable.tierColor;
  customizeColors.value = !!(editable.raceColor || editable.tierColor);
  profile.entranceQuote = editable.entranceQuote;
  profile.gallery.splice(0, profile.gallery.length, ...editable.gallery);
}

const selectedEntry = computed(() => entries.value.find(entry => entry.uid === selectedEntryUid.value) ?? null);
const configuredGalleryCount = computed(() => profile.gallery.filter(image => isHttpsUrl(image.url)).length);
const activeStepDescription = computed(
  () => steps.find(step => step.id === activeStep.value)?.description ?? '按步骤完成角色视觉配置。',
);

const filteredWorldbooks = computed(() => {
  const query = worldbookSearch.value.trim().toLocaleLowerCase();
  const isShowingSelectedName =
    !!selectedWorldbookName.value && worldbookSearch.value === selectedWorldbookName.value;
  if (!query || isShowingSelectedName) return worldbooks.value;
  return worldbooks.value.filter(worldbook => worldbook.toLocaleLowerCase().includes(query));
});

function resolveGalleryPreviewUrl(value: string): string {
  const media = normalizePortraitMediaUrlForBrowser(value);
  return media?.kind === 'image' ? media.url : '';
}

const filteredEntries = computed(() => {
  const query = entrySearch.value.trim().toLocaleLowerCase();
  const selectedName = selectedEntry.value?.name || '';
  const isShowingSelectedName = selectedEntryUid.value !== null && entrySearch.value === selectedName;
  const matches =
    !query || isShowingSelectedName
      ? entries.value
      : entries.value.filter(entry => (entry.name || '').toLocaleLowerCase().includes(query));

  return matches
    .map((entry, originalIndex) => ({
      entry,
      originalIndex,
      preferred: /^\s*\[DLC\]\[角色\]/i.test(entry.name || ''),
    }))
    .sort((left, right) => Number(right.preferred) - Number(left.preferred) || left.originalIndex - right.originalIndex)
    .map(item => item.entry);
});

const entryInspection = computed(() =>
  selectedEntry.value ? inspectManagedBlock(selectedEntry.value.content) : { state: 'absent' as const },
);

const hasLegacyVisualEjs = computed(() => !!selectedEntry.value && hasUnmanagedVisualEjs(selectedEntry.value.content));

const entryStateClass = computed(() => {
  if (entryInspection.value.state === 'valid') return 'managed';
  if (entryInspection.value.state === 'malformed' || entryInspection.value.state === 'multiple') return 'blocked';
  if (hasLegacyVisualEjs.value) return 'blocked';
  return 'new';
});

const entryStateTitle = computed(() => {
  if (entryInspection.value.state === 'valid') return '已有受管理配置';
  if (entryInspection.value.state === 'malformed' || entryInspection.value.state === 'multiple')
    return '区块需要人工修复';
  if (hasLegacyVisualEjs.value) return '检测到旧版视觉 EJS';
  return '可安全新增配置';
});

const entryStateDescription = computed(() => {
  if (entryInspection.value.state === 'valid') return '保存时只会替换现有的受管理区块。';
  if (entryInspection.value.state === 'malformed' || entryInspection.value.state === 'multiple') {
    return entryInspection.value.reason;
  }
  if (hasLegacyVisualEjs.value) return '为避免重复配置，自动写入已锁定；请先移除旧区块。';
  return '保存时会在装饰器之后、原始内容之前插入新区块。';
});

const validationErrors = computed(() => validateProfile(toSerializableProfile()));

const generatedCode = computed(() => {
  if (validationErrors.value.length > 0) return '';
  try {
    return buildManagedEjsBlock(toSerializableProfile());
  } catch {
    return '';
  }
});

const writeBlocked = computed(
  () =>
    entryInspection.value.state === 'malformed' ||
    entryInspection.value.state === 'multiple' ||
    hasLegacyVisualEjs.value,
);

const canSave = computed(
  () =>
    !!selectedWorldbookName.value &&
    !!selectedEntry.value &&
    !writeBlocked.value &&
    validationErrors.value.length === 0 &&
    !saving.value,
  );

function isCharacterWorldbook(worldbookName: string): boolean {
  return characterWorldbooks.value.includes(worldbookName);
}

function openWorldbookPicker() {
  worldbookPickerOpen.value = true;
  const selectedIndex = filteredWorldbooks.value.indexOf(selectedWorldbookName.value);
  highlightedWorldbookIndex.value = selectedIndex >= 0 ? selectedIndex : filteredWorldbooks.value.length > 0 ? 0 : -1;
}

function toggleWorldbookPicker() {
  if (worldbookPickerOpen.value) {
    worldbookPickerOpen.value = false;
    return;
  }
  openWorldbookPicker();
}

function onWorldbookSearchInput() {
  if (selectedWorldbookName.value && worldbookSearch.value !== selectedWorldbookName.value) {
    selectedWorldbookName.value = '';
  }
  worldbookPickerOpen.value = true;
  highlightedWorldbookIndex.value = filteredWorldbooks.value.length > 0 ? 0 : -1;
}

function onWorldbookPickerFocusout(event: FocusEvent) {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as Node | null;
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) worldbookPickerOpen.value = false;
}

function selectWorldbook(worldbookName: string) {
  selectedWorldbookName.value = worldbookName;
  worldbookSearch.value = worldbookName;
  worldbookPickerOpen.value = false;
}

function moveWorldbookHighlight(offset: -1 | 1) {
  if (!worldbookPickerOpen.value) openWorldbookPicker();
  const count = filteredWorldbooks.value.length;
  if (count === 0) return;
  highlightedWorldbookIndex.value = (highlightedWorldbookIndex.value + offset + count) % count;
}

function selectHighlightedWorldbook() {
  const worldbook = filteredWorldbooks.value[highlightedWorldbookIndex.value];
  if (worldbook) selectWorldbook(worldbook);
}

function openEntryPicker() {
  entryPickerOpen.value = true;
  const selectedIndex = filteredEntries.value.findIndex(entry => entry.uid === selectedEntryUid.value);
  highlightedEntryIndex.value = selectedIndex >= 0 ? selectedIndex : filteredEntries.value.length > 0 ? 0 : -1;
}

function toggleEntryPicker() {
  if (entryPickerOpen.value) {
    entryPickerOpen.value = false;
    return;
  }
  openEntryPicker();
}

function onEntrySearchInput() {
  if (selectedEntry.value && entrySearch.value !== (selectedEntry.value.name || '')) {
    selectedEntryUid.value = null;
  }
  entryPickerOpen.value = true;
  highlightedEntryIndex.value = filteredEntries.value.length > 0 ? 0 : -1;
}

function onEntryPickerFocusout(event: FocusEvent) {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as Node | null;
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) entryPickerOpen.value = false;
}

function selectEntry(entry: WorldbookEntry) {
  selectedEntryUid.value = entry.uid;
  entrySearch.value = entry.name || `未命名条目 #${entry.uid}`;
  entryPickerOpen.value = false;
}

function moveEntryHighlight(offset: -1 | 1) {
  if (!entryPickerOpen.value) openEntryPicker();
  const count = filteredEntries.value.length;
  if (count === 0) return;
  highlightedEntryIndex.value = (highlightedEntryIndex.value + offset + count) % count;
}

function selectHighlightedEntry() {
  const entry = filteredEntries.value[highlightedEntryIndex.value];
  if (entry) selectEntry(entry);
}

function onCustomizeColorsChange() {
  if (customizeColors.value) {
    profile.raceColor ||= DEFAULT_RACE_COLOR;
    profile.tierColor ||= DEFAULT_TIER_COLOR;
    return;
  }
  profile.raceColor = '';
  profile.tierColor = '';
}

async function loadWorldbooks() {
  loadingWorldbooks.value = true;
  loadError.value = '';
  saveState.value = 'idle';
  try {
    currentCharacterName.value = getCurrentCharacterName() || '';
    if (!currentCharacterName.value) throw new Error('请先在 SillyTavern 打开一张角色卡。');

    const binding = getCharWorldbookNames('current');
    characterWorldbooks.value = buildWorldbookList(
      [binding.primary, ...binding.additional],
      [],
    );
    worldbooks.value = buildWorldbookList(characterWorldbooks.value, getWorldbookNames());
    if (worldbooks.value.length === 0) throw new Error('酒馆中没有可用的世界书。');

    if (!worldbooks.value.includes(selectedWorldbookName.value)) {
      selectWorldbook(worldbooks.value[0]);
    } else {
      worldbookSearch.value = selectedWorldbookName.value;
      await loadEntries(selectedWorldbookName.value);
    }
  } catch (error) {
    worldbooks.value = [];
    characterWorldbooks.value = [];
    entries.value = [];
    selectedWorldbookName.value = '';
    worldbookSearch.value = '';
    worldbookPickerOpen.value = false;
    selectedEntryUid.value = null;
    loadError.value = error instanceof Error ? error.message : String(error);
  } finally {
    loadingWorldbooks.value = false;
  }
}

async function loadEntries(worldbookName: string) {
  if (!worldbookName) {
    entries.value = [];
    selectedEntryUid.value = null;
    entrySearch.value = '';
    entryPickerOpen.value = false;
    return;
  }

  loadingEntries.value = true;
  loadError.value = '';
  try {
    entries.value = await getWorldbook(worldbookName);
    if (!entries.value.some(entry => entry.uid === selectedEntryUid.value)) {
      selectedEntryUid.value = null;
      entrySearch.value = '';
    }
  } catch (error) {
    entries.value = [];
    selectedEntryUid.value = null;
    loadError.value = `无法读取世界书：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    loadingEntries.value = false;
  }
}

function loadSelectedEntryProfile() {
  saveState.value = 'idle';
  const entry = selectedEntry.value;
  if (!entry) {
    replaceProfile(createEmptyProfile());
    saveMessage.value = '选择世界书条目后即可写入。';
    return;
  }

  const inspection = inspectManagedBlock(entry.content);
  if (inspection.state === 'valid') {
    replaceProfile(inspection.profile);
    saveMessage.value = '已读取该条目的现有视觉配置。';
    return;
  }

  replaceProfile(createEmptyProfile());
  saveMessage.value =
    inspection.state === 'malformed' || inspection.state === 'multiple'
      ? inspection.reason
      : hasUnmanagedVisualEjs(entry.content)
        ? '检测到未标记的旧版视觉 EJS，已锁定自动写入。'
        : '该条目尚无受管理配置；请输入角色真实姓名后新增。';
}

function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
}

function canVisitStep(step: StepId): boolean {
  if (step === 1) return true;
  if (!selectedEntry.value) return false;
  if (step === 2) return true;
  return profile.characterName.trim().length > 0;
}

function isStepComplete(step: StepId): boolean {
  if (step === 1) return !!selectedEntry.value;
  if (step === 2) return profile.characterName.trim().length > 0;
  if (step === 3) return furthestStep.value > 3;
  if (step === 4) return configuredGalleryCount.value > 0 && furthestStep.value > 4;
  return saveState.value === 'success';
}

function goToStep(step: StepId) {
  if (!canVisitStep(step)) return;
  activeStep.value = step;
  furthestStep.value = Math.max(furthestStep.value, step) as StepId;
  if (!isNarrowViewport()) return;

  void nextTick(() => {
    document.getElementById(`manager-step-${step}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });
}

function addImage() {
  const number = profile.gallery.length + 1;
  profile.gallery.push({
    id: nextImageId++,
    title: number === 1 ? '主立绘' : `备用立绘 ${number}`,
    url: '',
  });
}

function removeImage(index: number) {
  if (profile.gallery.length <= 1) return;
  profile.gallery.splice(index, 1);
}

function moveImage(index: number, offset: -1 | 1) {
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= profile.gallery.length) return;
  const [image] = profile.gallery.splice(index, 1);
  profile.gallery.splice(targetIndex, 0, image);
}

async function copyEjs() {
  if (!generatedCode.value) return;
  try {
    await navigator.clipboard.writeText(generatedCode.value);
    saveState.value = 'success';
    saveMessage.value = 'EJS 已复制到剪贴板。';
  } catch (error) {
    saveState.value = 'error';
    saveMessage.value = `复制失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

async function saveToEntry() {
  const worldbookName = selectedWorldbookName.value;
  const entry = selectedEntry.value;
  if (!canSave.value || !entry) return;

  const confirmed = window.confirm(
    `确定将角色视觉 EJS 写入以下条目？\n\n世界书：${worldbookName}\n条目：${entry.name || `#${entry.uid}`}`,
  );
  if (!confirmed) return;

  saving.value = true;
  saveState.value = 'idle';
  saveMessage.value = '正在读取最新条目并安全写入…';

  try {
    const normalizedProfile = normalizeProfile(toSerializableProfile());
    const updatedWorldbook = await updateWorldbookWith(
      worldbookName,
      latestEntries =>
        latestEntries.map(latestEntry =>
          latestEntry.uid === entry.uid
            ? { ...latestEntry, content: upsertManagedEjsBlock(latestEntry.content, normalizedProfile) }
            : latestEntry,
        ),
      { render: 'immediate' },
    );

    entries.value = updatedWorldbook;
    const savedEntry = updatedWorldbook.find(item => item.uid === entry.uid);
    if (!savedEntry || inspectManagedBlock(savedEntry.content).state !== 'valid') {
      throw new Error('写入后的读回验证失败。');
    }

    saveState.value = 'success';
    saveMessage.value = '保存成功：已写入受管理 EJS，原条目其余内容保持不变。';
    console.info('[CharInfo Creator Manager] Managed EJS saved', {
      worldbook: worldbookName,
      entryUid: entry.uid,
      entryName: entry.name,
    });
  } catch (error) {
    console.error('[CharInfo Creator Manager] Failed to save managed EJS:', error);
    saveState.value = 'error';
    saveMessage.value = `保存失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    saving.value = false;
  }
}

watch(selectedWorldbookName, worldbookName => {
  entrySearch.value = '';
  entryPickerOpen.value = false;
  void loadEntries(worldbookName);
});
watch(selectedEntryUid, uid => {
  loadSelectedEntryProfile();
  furthestStep.value = uid === null ? 1 : 2;
  goToStep(uid === null ? 1 : 2);
});

onMounted(() => {
  void loadWorldbooks();
});
</script>

<style scoped>
:global(html),
:global(body),
:global(#char-info-creator-manager) {
  width: 100%;
  height: 100%;
}

:global(#char-info-creator-manager),
:global(#char-info-creator-manager *) {
  box-sizing: border-box;
}

:global(body) {
  color: #edf2f7;
  background: transparent;
  font-family:
    Inter,
    'Noto Sans SC',
    'Microsoft YaHei',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  color: inherit;
}

.manager-root {
  --bg: #0b0e13;
  --surface: #131720;
  --surface-raised: #1a202b;
  --surface-soft: #202735;
  --border: #30394a;
  --border-strong: #445169;
  --text: #f4f7fb;
  --text-secondary: #b8c1d0;
  --text-muted: #7f8ba0;
  --primary: #77d6c7;
  --primary-strong: #4fb8a8;
  --primary-soft: rgb(119 214 199 / 12%);
  --danger: #ff8491;
  --danger-soft: rgb(255 132 145 / 12%);
  --warning: #f4c36a;
  --success: #78d59c;

  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  padding: 24px;
  overflow: auto;
  place-items: center;
  color: var(--text);
}

.backdrop {
  position: fixed;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  background: rgb(3 5 8 / 78%);
  border: 0;
  backdrop-filter: blur(9px);
  cursor: default;
}

.manager-dialog {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(1420px, 100%);
  max-height: calc(100% - 8px);
  overflow: hidden;
  flex-direction: column;
  background: radial-gradient(circle at 0 0, rgb(119 214 199 / 8%), transparent 28rem), var(--bg);
  border: 1px solid var(--border-strong);
  border-radius: 20px;
  box-shadow: 0 28px 90px rgb(0 0 0 / 55%);
}

.dialog-header {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 26px;
  background: rgb(19 23 32 / 94%);
  border-bottom: 1px solid var(--border);
}

.eyebrow,
.dialog-header h1,
.header-description {
  margin: 0;
}

.eyebrow {
  margin-bottom: 5px;
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.dialog-header h1 {
  font-size: clamp(22px, 3vw, 31px);
  line-height: 1.2;
}

.header-description {
  max-width: 720px;
  margin-top: 7px;
  color: var(--text-secondary);
  font-size: 13px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.phase-badge {
  padding: 7px 11px;
  color: var(--primary);
  background: var(--primary-soft);
  border: 1px solid rgb(119 214 199 / 25%);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.close-button,
.icon-button {
  display: grid;
  width: 40px;
  height: 40px;
  padding: 0;
  place-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
}

.close-button {
  font-size: 25px;
  line-height: 1;
}

.dialog-body {
  display: grid;
  min-height: 0;
  overflow: hidden;
  grid-template-columns: 272px minmax(0, 1fr);
}

.target-panel,
.editor-panel {
  min-height: 0;
  overflow-y: auto;
}

.wizard-step-nav {
  display: flex;
  min-height: 0;
  padding: 22px 16px 18px;
  overflow-y: auto;
  flex-direction: column;
  gap: 8px;
  background: rgb(19 23 32 / 78%);
  border-right: 1px solid var(--border);
}

.wizard-nav-header {
  display: flex;
  margin-bottom: 7px;
  padding: 0 7px 12px;
  align-items: center;
  justify-content: space-between;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.wizard-nav-header strong {
  color: var(--primary);
}

.wizard-step-nav button {
  display: grid;
  width: 100%;
  min-height: 66px;
  padding: 10px;
  align-items: center;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 11px;
  color: var(--text-secondary);
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
}

.wizard-step-nav button:hover:not(:disabled) {
  background: rgb(255 255 255 / 4%);
  border-color: var(--border);
}

.wizard-step-nav button.active {
  color: var(--text);
  background: linear-gradient(110deg, var(--primary-soft), rgb(119 214 199 / 4%));
  border-color: rgb(119 214 199 / 35%);
  box-shadow: inset 3px 0 0 var(--primary);
}

.wizard-step-index {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--text-muted);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 9px;
  font-size: 12px;
  font-weight: 900;
}

.wizard-step-nav button.active .wizard-step-index {
  color: #071310;
  background: var(--primary);
  border-color: var(--primary);
}

.wizard-step-nav button.complete:not(.active) .wizard-step-index {
  color: var(--success);
  background: rgb(120 213 156 / 9%);
  border-color: rgb(120 213 156 / 30%);
}

.wizard-step-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.wizard-step-copy strong,
.wizard-step-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wizard-step-copy strong {
  font-size: 13px;
}

.wizard-step-copy small {
  color: var(--text-muted);
  font-size: 10px;
}

.wizard-step-short-label {
  display: none;
}

.wizard-nav-context {
  display: flex;
  margin-top: auto;
  padding: 13px;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.wizard-nav-context small,
.wizard-nav-context span {
  color: var(--text-muted);
  font-size: 10px;
}

.wizard-nav-context strong {
  overflow: hidden;
  color: var(--text);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-section-toggle {
  display: none;
}

.wizard-step-section.is-collapsed {
  display: none;
}

.target-panel,
.editor-panel {
  grid-column: 2;
  grid-row: 1;
}

.target-panel {
  padding: 32px 40px 36px;
  background: transparent;
  border-right: 0;
}

.target-panel-content {
  width: min(100%, 820px);
  margin: 0 auto;
}

.editor-panel {
  padding: 0;
}

.editor-panel > .wizard-step-section {
  width: min(100%, 1080px);
  min-height: 100%;
  margin: 0 auto;
  padding: 32px 40px 0;
}

.wizard-step-actions {
  display: flex;
  margin-top: 30px;
  padding-top: 20px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border);
}

.wizard-step-actions > span {
  flex: 1;
}

.section-title-row,
.output-heading,
.save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.step-label {
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

h2 {
  margin: 0;
  font-size: 17px;
}

.section-title-row h2,
.section-heading h2,
.output-heading h2 {
  font-size: 22px;
}

.current-character,
.target-summary,
.safety-note {
  padding: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.current-character {
  display: flex;
  margin: 18px 0;
  flex-direction: column;
  gap: 3px;
}

.current-character span {
  color: var(--text-muted);
  font-size: 11px;
}

.current-character strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.target-panel .field + .field {
  margin-top: 15px;
}

.field-label {
  display: flex;
  min-height: 18px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.field-label b {
  color: var(--danger);
}

.field-label small {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
}

input,
select,
textarea {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  color: var(--text);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 10px;
  outline: none;
}

textarea {
  resize: vertical;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--primary-strong);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.entry-combobox {
  position: relative;
}

.entry-combobox > input {
  padding-right: 44px;
}

.entry-picker-button {
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  width: 40px;
  height: 40px;
  padding: 0;
  place-items: center;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.entry-options {
  position: absolute;
  z-index: 10;
  top: calc(100% + 7px);
  right: 0;
  left: 0;
  max-height: min(42vh, 360px);
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #151a23;
  border: 1px solid var(--border-strong);
  border-radius: 11px;
  box-shadow: 0 18px 44px rgb(0 0 0 / 48%);
}

.entry-options button {
  display: flex;
  width: 100%;
  min-height: 44px;
  padding: 9px 10px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.entry-options button:hover,
.entry-options button.highlighted,
.entry-options button[aria-selected='true'] {
  background: var(--primary-soft);
}

.entry-options button[aria-selected='true'] {
  color: var(--primary);
}

.entry-options button span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-options button small {
  flex: 0 0 auto;
  padding: 2px 5px;
  color: var(--warning);
  background: rgb(244 195 106 / 10%);
  border-radius: 5px;
  font-size: 9px;
}

.entry-empty {
  margin: 0;
  padding: 18px 10px;
  color: var(--text-muted);
  text-align: center;
  font-size: 12px;
}

button:disabled,
input:disabled,
select:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.target-summary {
  display: flex;
  margin-top: 18px;
  align-items: flex-start;
  gap: 10px;
}

.target-summary p,
.safety-note p,
.section-heading p,
.output-heading p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.status-dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-top: 5px;
  background: var(--text-muted);
  border-radius: 50%;
}

.status-dot.managed {
  background: var(--success);
  box-shadow: 0 0 10px rgb(120 213 156 / 55%);
}

.status-dot.new {
  background: var(--primary);
}

.status-dot.blocked {
  background: var(--danger);
}

.safety-note {
  margin-top: 16px;
  border-color: rgb(119 214 199 / 22%);
}

.safety-note strong {
  color: var(--primary);
  font-size: 12px;
}

.message.error,
.save-feedback .error {
  color: var(--danger);
}

.form-section + .form-section,
.output-section {
  margin-top: 0;
  padding-top: 32px;
  border-top: 0;
}

.section-heading {
  display: flex;
  margin-bottom: 17px;
  align-items: flex-start;
  gap: 12px;
}

.step-number {
  display: grid;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #071310;
  background: var(--primary);
  border-radius: 9px;
  font-size: 12px;
  font-weight: 900;
}

.section-heading p {
  margin-top: 2px;
}

code {
  color: var(--primary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.field-grid,
.color-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-full {
  grid-column: 1 / -1;
}

.color-custom-toggle {
  display: flex;
  min-height: 58px;
  margin-bottom: 14px;
  padding: 11px 13px;
  align-items: center;
  gap: 11px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 11px;
  cursor: pointer;
}

.color-custom-toggle input {
  width: 19px;
  min-height: 19px;
  height: 19px;
  margin: 0;
  padding: 0;
  accent-color: var(--primary-strong);
}

.color-custom-toggle span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.color-custom-toggle strong {
  color: var(--text-secondary);
  font-size: 12px;
}

.color-custom-toggle small {
  color: var(--text-muted);
  font-size: 11px;
}

.color-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.color-control {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 9px;
}

.color-control input[type='color'] {
  padding: 5px;
  cursor: pointer;
}

.gallery-list {
  display: grid;
  gap: 12px;
}

.gallery-card {
  display: grid;
  padding: 12px;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  gap: 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 13px;
}

.image-preview {
  position: relative;
  display: grid;
  min-height: 104px;
  overflow: hidden;
  place-items: center;
  color: var(--text-muted);
  background: var(--surface-soft);
  border-radius: 9px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  min-height: 104px;
  object-fit: cover;
}

.image-preview b {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 3px 6px;
  color: #071310;
  background: var(--primary);
  border-radius: 999px;
  font-size: 9px;
}

.gallery-fields {
  display: grid;
  grid-template-columns: minmax(140px, 0.42fr) minmax(220px, 1fr);
  gap: 10px;
}

.gallery-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gallery-actions button {
  width: 38px;
  height: 32px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.gallery-actions .danger {
  color: var(--danger);
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
  margin-top: 11px;
  color: var(--primary);
  background: transparent;
  border: 1px dashed var(--border-strong);
}

.secondary-button {
  background: var(--surface-soft);
  border: 1px solid var(--border);
}

.primary-button {
  color: #071310;
  background: var(--primary);
  border: 1px solid var(--primary);
}

.primary-button:hover:not(:disabled),
.add-image-button:hover {
  background: var(--primary-strong);
}

.output-section {
  padding-bottom: 20px;
}

.output-heading p {
  margin-top: 1px;
}

details {
  margin-top: 12px;
  overflow: hidden;
  background: #080a0f;
  border: 1px solid var(--border);
  border-radius: 11px;
}

summary {
  padding: 11px 13px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.ejs-metadata-note {
  margin: 0;
  padding: 10px 13px;
  color: var(--text-muted);
  background: var(--surface);
  border-top: 1px solid var(--border);
  font-size: 11px;
  line-height: 1.6;
}

pre {
  max-height: 280px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  color: #cfe8e2;
  border-top: 1px solid var(--border);
  font:
    11px/1.65 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  white-space: pre;
}

.save-bar {
  position: sticky;
  bottom: 0;
  margin: 28px -40px 0;
  padding: 15px 40px;
  background: rgb(11 14 19 / 96%);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(14px);
}

.save-feedback {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  color: var(--text-muted);
  font-size: 11px;
}

.save-feedback strong {
  overflow: hidden;
  color: var(--text-secondary);
  text-overflow: ellipsis;
}

.save-feedback .success {
  color: var(--success);
}

@media (max-width: 900px) {
  .manager-root {
    padding: 10px;
    overflow: hidden;
  }

  .manager-dialog {
    height: calc(100% - 2px);
    max-height: calc(100% - 2px);
    border-radius: 14px;
  }

  .dialog-header {
    padding: 17px;
  }

  .header-description,
  .phase-badge {
    display: none;
  }

  .dialog-body {
    display: block;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .wizard-step-nav {
    position: sticky;
    z-index: 5;
    top: 0;
    display: grid;
    padding: 8px 10px;
    background: rgb(11 14 19 / 96%);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 8px 24px rgb(0 0 0 / 24%);
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .wizard-nav-header,
  .wizard-step-copy,
  .wizard-nav-context {
    display: none;
  }

  .wizard-step-nav button {
    display: flex;
    min-width: 0;
    min-height: 48px;
    padding: 5px 2px;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    color: var(--text-muted);
    background: transparent;
    border: 0;
    border-radius: 9px;
    cursor: pointer;
  }

  .wizard-step-index {
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: 7px;
    font-size: 11px;
    font-weight: 900;
  }

  .wizard-step-short-label {
    display: block;
    overflow: hidden;
    max-width: 100%;
    font-size: 10px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wizard-step-nav button.active {
    color: var(--primary);
    background: var(--primary-soft);
  }

  .wizard-step-nav button.active .wizard-step-index {
    color: #07110f;
    background: var(--primary);
    border-color: var(--primary);
  }

  .target-panel,
  .editor-panel {
    overflow: visible;
  }

  .target-panel {
    padding: 0;
    border-right: 0;
  }

  .wizard-step-section {
    scroll-margin-top: 65px;
  }

  .wizard-step-section.is-collapsed {
    display: none;
  }

  .mobile-section-toggle {
    display: flex;
    width: 100%;
    min-height: 76px;
    padding: 16px 17px 12px;
    align-items: center;
    gap: 12px;
    text-align: left;
    background: linear-gradient(180deg, rgb(119 214 199 / 8%), transparent);
    border-bottom: 1px solid var(--border);
  }

  .mobile-section-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }

  .mobile-section-copy strong {
    overflow: hidden;
    color: var(--text);
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-section-copy small {
    overflow: hidden;
    color: var(--text-muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .target-panel-content {
    padding: 17px;
  }

  .target-panel .section-title-row,
  .form-section > .section-heading {
    display: none;
  }

  .entry-options {
    max-height: min(46vh, 320px);
  }

  .editor-panel {
    padding: 0;
  }

  .editor-panel > .wizard-step-section {
    width: 100%;
    min-height: 0;
    padding: 0;
  }

  .form-section + .form-section,
  .output-section {
    margin-top: 0;
    padding-top: 0;
    border-top: 0;
  }

  .mobile-step-content,
  .output-section details {
    margin-right: 17px;
    margin-left: 17px;
  }

  .output-section > .output-heading {
    margin: 17px;
  }

  .output-section > .output-heading h2 {
    font-size: 15px;
  }

  .mobile-step-content {
    padding-top: 17px;
    padding-bottom: 18px;
  }

  .wizard-step-actions {
    display: flex;
    margin-top: 22px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .wizard-step-actions > span {
    flex: 1;
  }

  .wizard-step-actions .primary-button,
  .wizard-step-actions .secondary-button {
    min-height: 44px;
  }

  .wizard-step-actions-final {
    margin: 20px 17px 0;
  }

  .save-bar {
    position: static;
    margin: 16px 0 0;
    padding: 16px 17px;
    background: var(--surface);
    backdrop-filter: none;
  }
}

@media (max-width: 620px) {
  .manager-root {
    padding: 0;
  }

  .manager-dialog {
    width: 100%;
    height: 100%;
    max-height: 100%;
    border-width: 0;
    border-radius: 0;
  }

  .dialog-header {
    position: sticky;
    z-index: 3;
    top: 0;
    align-items: center;
    padding: 12px 14px;
  }

  .dialog-header h1 {
    font-size: 19px;
  }

  .eyebrow {
    display: none;
  }

  .field-grid,
  .color-grid,
  .gallery-fields {
    grid-template-columns: 1fr;
  }

  .gallery-card {
    grid-template-columns: 76px minmax(0, 1fr);
  }

  .image-preview,
  .image-preview img {
    min-height: 112px;
  }

  .gallery-actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
  }

  .gallery-actions button {
    width: 44px;
    height: 44px;
  }

  .save-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .output-heading {
    align-items: flex-start;
  }

  .primary-button {
    width: 100%;
  }
}
</style>
