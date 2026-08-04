<template>
  <template v-for="message in state.messages" :key="message.messageId">
    <Teleport v-for="card in message.cards" :key="card.key" :to="card.host">
      <div
        class="char-info-runtime-message"
        :data-char-info-message-id="message.messageId"
        :data-char-info-render-key="card.renderKey"
      >
        <ViewerApp
          :key="card.renderKey"
          :yaml-text="card.yamlText"
          :message-id="message.messageId"
          :effects-enabled="state.settings.effectsEnabled"
          :image-source-priority="state.settings.imageSourcePriority"
          embedded
        />
      </div>
    </Teleport>
  </template>

  <Teleport v-if="state.library" :to="state.library.host">
    <button
      v-if="!state.library.listOpen && !state.library.viewerOpen"
      class="char-info-library-floating-button"
      type="button"
      :style="floatingButtonStyle"
      :aria-label="floatingButtonAriaLabel"
      @click="openLibraryFromFloatingButton"
      @pointerdown="beginFloatingButtonDrag"
      @pointermove="moveFloatingButton"
      @pointerup="endFloatingButtonDrag"
      @pointercancel="cancelFloatingButtonDrag"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.5-1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20.5c0-4 3.1-7 7-7s7 3 7 7v.5H2v-.5Zm13.2-7.1c3.8.3 6.8 3.2 6.8 7.1v.5h-4v-.5c0-2.8-1-5.2-2.8-7.1Z"
        />
      </svg>
      <span
        v-if="state.library.unreadCharacterNames.length"
        class="char-info-library-notification-dot"
        aria-hidden="true"
      ></span>
    </button>

    <div v-if="state.library.listOpen" class="char-info-library-list-backdrop">
      <section
        ref="listWindowRef"
        class="char-info-library-list-dialog"
        :class="{ 'with-viewer': state.library.viewerOpen }"
        :style="listWindowStyle"
        role="dialog"
        aria-modal="false"
        aria-label="角色资料库"
      >
        <header
          @pointerdown="beginListWindowDrag"
          @pointermove="moveListWindow"
          @pointerup="endListWindowDrag"
          @pointercancel="cancelListWindowDrag"
        >
          <div class="char-info-library-list-title">
            <div class="char-info-library-source-switch" role="group" aria-label="角色资料来源">
              <button type="button" class="active" aria-pressed="true" @click="props.onOpenLibraryList">
                当前聊天角色
              </button>
              <button
                type="button"
                aria-pressed="false"
                aria-label="打开世界书角色库"
                title="打开世界书角色库"
                @click="props.onOpenWorldbookLibrary"
              >
                世界书角色
              </button>
            </div>
          </div>
          <div class="char-info-library-list-actions">
            <button type="button" aria-label="查看器设置" title="设置" @click="onOpenSettings">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
                <path
                  d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2v-.08A1.7 1.7 0 0 0 12.34 18a1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 9.38 15a1.7 1.7 0 0 0-1.56-1.03H7v-2h.82a1.7 1.7 0 0 0 1.56-1.03 1.7 1.7 0 0 0-.34-1.88L8.98 9l1.42-1.42.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 13.37 6.4V6h2v.4a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.76 9l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 12H21v2h-.08A1.7 1.7 0 0 0 19.4 15Z"
                />
              </svg>
            </button>
            <button type="button" :disabled="state.library.loading" aria-label="刷新角色列表" @click="onRefreshLibrary">
              {{ state.library.loading ? '…' : '↻' }}
            </button>
            <button type="button" aria-label="关闭角色列表" @click="closeListWindow">×</button>
          </div>
        </header>

        <div class="char-info-library-list-controls">
          <label>
            <span class="sr-only">搜索角色</span>
            <input v-model.trim="searchText" type="search" placeholder="搜索姓名、种族或身份" />
          </label>
          <div class="char-info-library-filters" aria-label="角色筛选">
            <button
              v-for="option in filterOptions"
              :key="option.value"
              type="button"
              :class="{ active: activeFilter === option.value }"
              @click="activeFilter = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <p v-if="state.library.error" class="char-info-library-error">{{ state.library.error }}</p>
        <p v-else-if="!state.library.loading && filteredCharacters.length === 0" class="char-info-library-empty">
          没有符合筛选条件的角色。
        </p>

        <div class="char-info-library-list">
          <button
            v-for="character in filteredCharacters"
            :key="character.name"
            type="button"
            :class="{
              active: selectedCharacterName === character.name,
              unread: state.library.unreadCharacterNames.includes(character.name),
            }"
            @click="openCharacter(character.name)"
          >
            <span class="char-info-library-avatar">
              <img
                v-if="character.avatarUrl && !failedAvatarUrls.has(character.avatarUrl)"
                :src="character.avatarUrl"
                :alt="`${character.name}头像`"
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="onAvatarError(character.avatarUrl)"
              />
              <span v-else aria-hidden="true">{{ character.name.slice(0, 1) }}</span>
            </span>
            <span class="char-info-library-list-copy">
              <strong>{{ character.name }}</strong>
              <small>{{ [character.race, character.identity].filter(Boolean).join(' · ') || '资料待补全' }}</small>
            </span>
            <span class="char-info-library-list-meta">
              <span class="char-info-library-affinity">♡ {{ character.affinity ?? '—' }}</span>
              <span class="char-info-library-presence" :class="{ away: !character.inScene }">
                {{ character.inScene ? '在场' : '不在场' }}
              </span>
            </span>
            <span
              v-if="state.library.unreadCharacterNames.includes(character.name)"
              class="char-info-library-character-dot"
              aria-label="好感度有更新"
            ></span>
          </button>
        </div>
      </section>
    </div>

    <section
      v-if="state.library.viewerOpen"
      ref="viewerWindowRef"
      class="char-info-library-overlay"
      :class="{ 'with-list': state.library.listOpen }"
      :style="viewerWindowStyle"
      role="dialog"
      aria-modal="false"
      aria-label="当前聊天角色资料"
    >
      <header
        class="char-info-library-header"
        @pointerdown="beginViewerWindowDrag"
        @pointermove="moveViewerWindow"
        @pointerup="endViewerWindowDrag"
        @pointercancel="cancelViewerWindowDrag"
      >
        <h2>{{ selectedCharacter?.name || '角色资料' }}</h2>
        <div class="char-info-library-header-actions">
          <button class="char-info-library-list-action" type="button" @click="onOpenLibraryList">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 6h14M5 12h14M5 18h14" />
              <circle cx="3" cy="6" r="0.75" />
              <circle cx="3" cy="12" r="0.75" />
              <circle cx="3" cy="18" r="0.75" />
            </svg>
            <span>角色列表</span>
          </button>
          <button
            class="char-info-library-icon-action"
            type="button"
            :disabled="state.library.loading"
            :aria-label="state.library.loading ? '正在刷新角色资料' : '刷新角色资料'"
            @click="onRefreshLibrary"
          >
            <svg :class="{ spinning: state.library.loading }" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M20 11a8 8 0 1 0-2.34 5.66" />
              <path d="M20 5v6h-6" />
            </svg>
          </button>
          <button
            class="char-info-library-icon-action char-info-library-close-action"
            type="button"
            aria-label="关闭角色资料"
            @click="closeViewerWindow"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </div>
      </header>

      <main class="char-info-library-viewer">
        <ViewerApp
          v-if="selectedCharacter && selectedCharacterYaml"
          :key="`${state.library.messageId}:${state.library.revision}:${selectedCharacter.name}`"
          :yaml-text="selectedCharacterYaml"
          :message-id="state.library.messageId"
          :effects-enabled="state.settings.effectsEnabled"
          :image-source-priority="state.settings.imageSourcePriority"
          :entrance-quote-override="selectedCharacter.innerThought"
          embedded
          read-only
        />
        <div v-else class="char-info-library-placeholder">
          <span aria-hidden="true">◇</span>
              <p>{{ state.library.loading ? '正在读取角色资料…' : '暂时无法找到该角色的资料。' }}</p>
        </div>
      </main>
    </section>
  </Teleport>

  <Teleport v-if="state.settingsView" :to="state.settingsView.host">
    <div class="char-info-settings-backdrop" @click.self="onCloseSettings">
      <section
        class="char-info-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="char-info-settings-title"
      >
        <header>
          <h2 id="char-info-settings-title">查看器设置</h2>
          <button type="button" aria-label="关闭查看器设置" @click="onCloseSettings">×</button>
        </header>

        <div class="char-info-settings-fields">
          <label>
            <strong>显示楼层数</strong>
            <input
              v-model.number="floorLimitDraft"
              type="number"
              :min="MIN_ACTIVE_FLOOR_LIMIT"
              :max="MAX_ACTIVE_FLOOR_LIMIT"
              inputmode="numeric"
              @change="applySettings"
            />
          </label>

          <label class="char-info-settings-switch">
            <strong>粒子特效</strong>
            <input v-model="effectsEnabledDraft" type="checkbox" @change="applySettings" />
          </label>

          <label class="char-info-settings-priority">
            <span id="char-info-image-source-priority-label">
              <strong>图片来源优先级</strong>
              <small id="char-info-image-source-priority-help">
                每行填写一个图片来源域名或完整图片地址，系统会按填写顺序尝试加载；填写根域名后，其子域名也会匹配。
              </small>
            </span>
            <textarea
              id="char-info-image-source-priority"
              v-model="imageSourcePriorityDraft"
              rows="4"
              placeholder="files.catbox.moe\ni.ibb.co"
              spellcheck="false"
              aria-labelledby="char-info-image-source-priority-label"
              aria-describedby="char-info-image-source-priority-help"
              @change="applySettings"
            ></textarea>
          </label>
        </div>

        <p v-if="settingsMessage" class="char-info-settings-feedback" aria-live="polite">{{ settingsMessage }}</p>

        <footer>
          <button type="button" @click="resetSettings">恢复默认</button>
          <button type="button" class="primary" @click="onCloseSettings">完成</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';
import { dump } from 'js-yaml';

import ViewerApp from '../char_info_viewer/App.vue';
import { normalizeImageSourcePriorityEntries } from '../char_info_viewer/services/imageSourcePriority';
import { buildCurrentCharacterViewerData } from './currentCharacterLibrary';
import { MAX_ACTIVE_FLOOR_LIMIT, MIN_ACTIVE_FLOOR_LIMIT, type CharInfoUiSettings } from './runtimeSettings';
import type { RuntimeViewState } from './types';

type LibraryFilter = 'all' | 'present' | 'away';

const props = defineProps<{
  state: RuntimeViewState;
  onCloseLibraryList: () => void;
  onCloseLibraryViewer: () => void;
  onRefreshLibrary: () => void;
  onOpenLibraryList: () => void;
  onOpenLibraryCharacter: (name: string) => void;
  onOpenWorldbookLibrary: () => void;
  onMoveLibraryButton: (position: { left: number; top: number }) => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onUpdateSettings: (settings: CharInfoUiSettings) => CharInfoUiSettings;
  onResetSettings: () => CharInfoUiSettings;
}>();

const searchText = ref('');
const activeFilter = ref<LibraryFilter>('all');
const selectedCharacterName = ref('');
const failedAvatarUrls = ref(new Set<string>());
const dragPosition = ref<{ left: number; top: number } | null>(null);
const listWindowRef = ref<HTMLElement | null>(null);
const listWindowPosition = ref<{ left: number; top: number } | null>(null);
const viewerWindowRef = ref<HTMLElement | null>(null);
const viewerWindowPosition = ref<{ left: number; top: number } | null>(null);
const floorLimitDraft = ref(props.state.settings.activeFloorLimit);
const effectsEnabledDraft = ref(props.state.settings.effectsEnabled);
const imageSourcePriorityDraft = ref(props.state.settings.imageSourcePriority.join('\n'));
const settingsMessage = ref('');
const filterOptions: Array<{ value: LibraryFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'present', label: '在场' },
  { value: 'away', label: '不在场' },
];

const FLOATING_BUTTON_SIZE = 58;
const FLOATING_BUTTON_MARGIN = 8;
const floatingButtonDrag = {
  pointerId: -1,
  startX: 0,
  startY: 0,
  originLeft: 0,
  originTop: 0,
  moved: false,
  suppressClick: false,
};
const listWindowDrag = {
  pointerId: -1,
  startX: 0,
  startY: 0,
  originLeft: 0,
  originTop: 0,
};
const viewerWindowDrag = {
  pointerId: -1,
  startX: 0,
  startY: 0,
  originLeft: 0,
  originTop: 0,
};

function onAvatarError(url: string): void {
  failedAvatarUrls.value = new Set([...failedAvatarUrls.value, url]);
}

function openCharacter(name: string): void {
  selectedCharacterName.value = name;
  props.onOpenLibraryCharacter(name);
}

function closeListWindow(): void {
  props.onCloseLibraryList();
}

function closeViewerWindow(): void {
  props.onCloseLibraryViewer();
}

function getHostViewport(): { width: number; height: number } {
  const hostWindow = window.parent;
  const visualViewport = hostWindow.visualViewport;
  return {
    width: visualViewport?.width || hostWindow.innerWidth || hostWindow.document.documentElement.clientWidth,
    height: visualViewport?.height || hostWindow.innerHeight || hostWindow.document.documentElement.clientHeight,
  };
}

function clampFloatingButtonPosition(position: { left: number; top: number }): { left: number; top: number } {
  const viewport = getHostViewport();
  return {
    left: Math.min(
      Math.max(FLOATING_BUTTON_MARGIN, position.left),
      Math.max(FLOATING_BUTTON_MARGIN, viewport.width - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN),
    ),
    top: Math.min(
      Math.max(FLOATING_BUTTON_MARGIN, position.top),
      Math.max(FLOATING_BUTTON_MARGIN, viewport.height - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN),
    ),
  };
}

const floatingButtonStyle = computed<CSSProperties>(() => {
  const position = dragPosition.value ?? props.state.library?.floatingButtonPosition;
  return position ? { left: `${position.left}px`, top: `${position.top}px`, right: 'auto' } : {};
});

const floatingButtonAriaLabel = computed(() => {
  const unreadCount = props.state.library?.unreadCharacterNames.length ?? 0;
  return unreadCount > 0 ? `打开当前角色列表，${unreadCount} 名角色的好感度有更新` : '打开当前角色列表';
});

function openLibraryFromFloatingButton(): void {
  if (floatingButtonDrag.suppressClick) {
    floatingButtonDrag.suppressClick = false;
    return;
  }
  props.onOpenLibraryList();
}

function beginFloatingButtonDrag(event: PointerEvent): void {
  if (event.button !== 0) return;
  const button = event.currentTarget as HTMLButtonElement;
  const rect = button.getBoundingClientRect();
  floatingButtonDrag.pointerId = event.pointerId;
  floatingButtonDrag.startX = event.clientX;
  floatingButtonDrag.startY = event.clientY;
  floatingButtonDrag.originLeft = rect.left;
  floatingButtonDrag.originTop = rect.top;
  floatingButtonDrag.moved = false;
  dragPosition.value = { left: rect.left, top: rect.top };
  button.setPointerCapture(event.pointerId);
}

function moveFloatingButton(event: PointerEvent): void {
  if (floatingButtonDrag.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - floatingButtonDrag.startX;
  const deltaY = event.clientY - floatingButtonDrag.startY;
  if (Math.hypot(deltaX, deltaY) > 4) floatingButtonDrag.moved = true;
  dragPosition.value = clampFloatingButtonPosition({
    left: floatingButtonDrag.originLeft + deltaX,
    top: floatingButtonDrag.originTop + deltaY,
  });
  if (floatingButtonDrag.moved) event.preventDefault();
}

function finishFloatingButtonDrag(event: PointerEvent, save: boolean): void {
  if (floatingButtonDrag.pointerId !== event.pointerId) return;
  const button = event.currentTarget as HTMLButtonElement;
  if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  floatingButtonDrag.pointerId = -1;
  if (save && floatingButtonDrag.moved && dragPosition.value) {
    props.onMoveLibraryButton(dragPosition.value);
    floatingButtonDrag.suppressClick = true;
  }
  dragPosition.value = null;
}

function endFloatingButtonDrag(event: PointerEvent): void {
  finishFloatingButtonDrag(event, true);
}

function cancelFloatingButtonDrag(event: PointerEvent): void {
  finishFloatingButtonDrag(event, false);
}

function keepFloatingButtonInViewport(): void {
  const position = props.state.library?.floatingButtonPosition;
  if (!position) return;
  const clamped = clampFloatingButtonPosition(position);
  if (clamped.left !== position.left || clamped.top !== position.top) props.onMoveLibraryButton(clamped);
}

function clampListWindowPosition(position: { left: number; top: number }): { left: number; top: number } {
  const viewport = getHostViewport();
  const windowElement = listWindowRef.value;
  const width = windowElement?.offsetWidth ?? Math.min(390, viewport.width - 16);
  const height = windowElement?.offsetHeight ?? Math.min(680, viewport.height - 16);
  const margin = 8;
  return {
    left: Math.min(Math.max(margin, position.left), Math.max(margin, viewport.width - width - margin)),
    top: Math.min(Math.max(margin, position.top), Math.max(margin, viewport.height - height - margin)),
  };
}

const listWindowStyle = computed<CSSProperties>(() => {
  const position = listWindowPosition.value;
  return position ? { left: `${position.left}px`, top: `${position.top}px`, transform: 'none' } : {};
});

function beginListWindowDrag(event: PointerEvent): void {
  if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
  const header = event.currentTarget as HTMLElement;
  const windowElement = listWindowRef.value;
  if (!windowElement) return;
  const rect = windowElement.getBoundingClientRect();
  listWindowDrag.pointerId = event.pointerId;
  listWindowDrag.startX = event.clientX;
  listWindowDrag.startY = event.clientY;
  listWindowDrag.originLeft = rect.left;
  listWindowDrag.originTop = rect.top;
  listWindowPosition.value = { left: rect.left, top: rect.top };
  header.setPointerCapture(event.pointerId);
}

function moveListWindow(event: PointerEvent): void {
  if (listWindowDrag.pointerId !== event.pointerId) return;
  listWindowPosition.value = clampListWindowPosition({
    left: listWindowDrag.originLeft + event.clientX - listWindowDrag.startX,
    top: listWindowDrag.originTop + event.clientY - listWindowDrag.startY,
  });
  event.preventDefault();
}

function finishListWindowDrag(event: PointerEvent): void {
  if (listWindowDrag.pointerId !== event.pointerId) return;
  const header = event.currentTarget as HTMLElement;
  if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
  listWindowDrag.pointerId = -1;
}

function endListWindowDrag(event: PointerEvent): void {
  finishListWindowDrag(event);
}

function cancelListWindowDrag(event: PointerEvent): void {
  finishListWindowDrag(event);
}

function keepListWindowInViewport(): void {
  if (!listWindowPosition.value) return;
  listWindowPosition.value = clampListWindowPosition(listWindowPosition.value);
}

function clampViewerWindowPosition(position: { left: number; top: number }): { left: number; top: number } {
  const viewport = getHostViewport();
  const windowElement = viewerWindowRef.value;
  const width = windowElement?.offsetWidth ?? Math.min(1100, viewport.width - 24);
  const height = windowElement?.offsetHeight ?? Math.min(820, viewport.height - 24);
  const margin = 6;
  return {
    left: Math.min(Math.max(margin, position.left), Math.max(margin, viewport.width - width - margin)),
    top: Math.min(Math.max(margin, position.top), Math.max(margin, viewport.height - height - margin)),
  };
}

const viewerWindowStyle = computed<CSSProperties>(() => {
  const position = viewerWindowPosition.value;
  return position ? { left: `${position.left}px`, top: `${position.top}px`, transform: 'none' } : {};
});

function beginViewerWindowDrag(event: PointerEvent): void {
  if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
  const header = event.currentTarget as HTMLElement;
  const windowElement = viewerWindowRef.value;
  if (!windowElement) return;
  const rect = windowElement.getBoundingClientRect();
  viewerWindowDrag.pointerId = event.pointerId;
  viewerWindowDrag.startX = event.clientX;
  viewerWindowDrag.startY = event.clientY;
  viewerWindowDrag.originLeft = rect.left;
  viewerWindowDrag.originTop = rect.top;
  viewerWindowPosition.value = { left: rect.left, top: rect.top };
  header.setPointerCapture(event.pointerId);
}

function moveViewerWindow(event: PointerEvent): void {
  if (viewerWindowDrag.pointerId !== event.pointerId) return;
  viewerWindowPosition.value = clampViewerWindowPosition({
    left: viewerWindowDrag.originLeft + event.clientX - viewerWindowDrag.startX,
    top: viewerWindowDrag.originTop + event.clientY - viewerWindowDrag.startY,
  });
  event.preventDefault();
}

function finishViewerWindowDrag(event: PointerEvent): void {
  if (viewerWindowDrag.pointerId !== event.pointerId) return;
  const header = event.currentTarget as HTMLElement;
  if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
  viewerWindowDrag.pointerId = -1;
}

function endViewerWindowDrag(event: PointerEvent): void {
  finishViewerWindowDrag(event);
}

function cancelViewerWindowDrag(event: PointerEvent): void {
  finishViewerWindowDrag(event);
}

function keepViewerWindowInViewport(): void {
  if (!viewerWindowPosition.value) return;
  viewerWindowPosition.value = clampViewerWindowPosition(viewerWindowPosition.value);
}

function keepFloatingUiInViewport(): void {
  keepFloatingButtonInViewport();
  keepListWindowInViewport();
  keepViewerWindowInViewport();
}

function replaceSettingsDraft(settings: CharInfoUiSettings): void {
  floorLimitDraft.value = settings.activeFloorLimit;
  effectsEnabledDraft.value = settings.effectsEnabled;
  imageSourcePriorityDraft.value = settings.imageSourcePriority.join('\n');
}

function applySettings(): void {
  const priorityNormalization = normalizeImageSourcePriorityEntries(imageSourcePriorityDraft.value.split('\n'));
  const settings = props.onUpdateSettings({
    activeFloorLimit: Number(floorLimitDraft.value),
    effectsEnabled: effectsEnabledDraft.value,
    imageSourcePriority: priorityNormalization.priorities,
  });
  replaceSettingsDraft(settings);
  settingsMessage.value = priorityNormalization.rejectedCount
    ? `设置已保存；已忽略 ${priorityNormalization.rejectedCount} 条无效图片源规则。`
    : '设置已保存并立即应用。';
}

function resetSettings(): void {
  replaceSettingsDraft(props.onResetSettings());
  settingsMessage.value = '已恢复默认设置。';
}

const filteredCharacters = computed(() => {
  const library = props.state.library;
  if (!library) return [];

  const query = searchText.value.toLocaleLowerCase('zh-Hans-CN');
  return library.characters.filter(character => {
    if (activeFilter.value === 'present' && !character.inScene) return false;
    if (activeFilter.value === 'away' && character.inScene) return false;
    if (!query) return true;
    return [character.name, character.race, character.identity].some(value =>
      value.toLocaleLowerCase('zh-Hans-CN').includes(query),
    );
  });
});

const selectedCharacter = computed(() => {
  const library = props.state.library;
  if (!library) return null;
  return (
    library.characters.find(character => character.name === selectedCharacterName.value) ??
    filteredCharacters.value[0] ??
    null
  );
});

const selectedCharacterYaml = computed(() => {
  if (!selectedCharacter.value) return '';
  return dump(buildCurrentCharacterViewerData(selectedCharacter.value), {
    noRefs: true,
    lineWidth: 120,
    sortKeys: false,
  });
});

watch(
  () => props.state.library?.characters,
  characters => {
    if (!characters?.some(character => character.name === selectedCharacterName.value)) {
      selectedCharacterName.value = characters?.[0]?.name ?? '';
    }
  },
  { immediate: true },
);

watch(
  () => props.state.library,
  library => {
    searchText.value = '';
    activeFilter.value = 'all';
    selectedCharacterName.value = library?.characters[0]?.name ?? '';
  },
);

watch(
  () => props.state.settingsView,
  settingsView => {
    if (!settingsView) return;
    replaceSettingsDraft(props.state.settings);
    settingsMessage.value = '';
  },
);

watch(activeFilter, () => {
  if (!filteredCharacters.value.some(character => character.name === selectedCharacterName.value)) {
    selectedCharacterName.value = filteredCharacters.value[0]?.name ?? '';
  }
});

onMounted(() => {
  const hostWindow = window.parent;
  hostWindow.addEventListener('resize', keepFloatingUiInViewport);
  hostWindow.visualViewport?.addEventListener('resize', keepFloatingUiInViewport);
  keepFloatingUiInViewport();
});

onBeforeUnmount(() => {
  const hostWindow = window.parent;
  hostWindow.removeEventListener('resize', keepFloatingUiInViewport);
  hostWindow.visualViewport?.removeEventListener('resize', keepFloatingUiInViewport);
});
</script>

<style>
.char-info-runtime-root {
  display: contents;
}

.char-info-runtime-host {
  width: 100%;
  max-width: 100%;
}

.char-info-runtime-message {
  width: 100%;
  max-width: 100%;
}

.char-info-library-host,
.char-info-settings-host {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  width: 100dvw;
  height: 100dvh;
}

.char-info-library-host {
  z-index: 2147482900;
  overflow: hidden;
  pointer-events: none;
}

.char-info-settings-host {
  z-index: 2147483000;
}

.char-info-settings-backdrop {
  display: grid;
  width: 100%;
  height: 100%;
  padding: 18px;
  overflow: auto;
  place-items: safe center;
  background: rgba(7, 8, 13, 0.78);
  color: #f7f1e8;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  backdrop-filter: blur(8px);
}

.char-info-settings-dialog {
  width: min(100%, 520px);
  overflow: hidden;
  border: 1px solid rgba(232, 210, 171, 0.28);
  border-radius: 18px;
  background: radial-gradient(circle at 0% 0%, rgba(122, 92, 168, 0.2), transparent 42%), #15151d;
  box-shadow: 0 20px 70px rgba(0, 0, 0, 0.48);
}

.char-info-settings-dialog header,
.char-info-settings-dialog footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
}

.char-info-settings-dialog header {
  border-bottom: 1px solid rgba(232, 210, 171, 0.16);
}

.char-info-settings-dialog header span {
  color: #d9b87a;
  font-size: 0.65rem;
  letter-spacing: 0.16em;
}

.char-info-settings-dialog h2 {
  margin: 3px 0 0;
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 1.35rem;
}

.char-info-settings-dialog button {
  min-height: 38px;
  padding: 7px 14px;
  border: 1px solid rgba(232, 210, 171, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
}

.char-info-settings-dialog header > button {
  min-width: 38px;
  padding: 0;
  font-size: 1.25rem;
}

.char-info-settings-dialog button.primary {
  border-color: #d9b87a;
  background: rgba(217, 184, 122, 0.16);
}

.char-info-settings-fields {
  display: grid;
  gap: 10px;
  padding: 18px;
}

.char-info-settings-fields label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 66px;
  padding: 12px 14px;
  border: 1px solid rgba(232, 210, 171, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
}

.char-info-settings-fields label > span {
  display: grid;
  gap: 4px;
}

.char-info-settings-fields small {
  color: #9f9aa7;
  font-size: 0.72rem;
}

.char-info-settings-fields input[type='number'] {
  width: 76px;
  min-height: 40px;
  padding: 7px 9px;
  border: 1px solid rgba(232, 210, 171, 0.25);
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  text-align: center;
}

.char-info-settings-priority {
  align-items: stretch;
  flex-direction: column;
}

.char-info-settings-priority textarea {
  width: 100%;
  min-height: 96px;
  box-sizing: border-box;
  resize: vertical;
  padding: 9px;
  border: 1px solid rgba(232, 210, 171, 0.25);
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  font: inherit;
  line-height: 1.45;
}

.char-info-settings-switch input {
  width: 22px;
  height: 22px;
  accent-color: #d9b87a;
}

.char-info-settings-feedback {
  min-height: 20px;
  margin: 0;
  padding: 0 18px;
  color: #8ed9b6;
  font-size: 0.76rem;
}

.char-info-settings-dialog footer {
  justify-content: flex-end;
  padding-top: 12px;
}

.char-info-library-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  width: min(1240px, calc(100% - 24px));
  height: min(892px, calc(100% - 24px));
  overflow: hidden;
  border: 1px solid rgba(232, 210, 171, 0.28);
  border-radius: 18px;
  background:
    radial-gradient(circle at 15% 0%, rgba(122, 92, 168, 0.22), transparent 38%),
    linear-gradient(145deg, #11121a 0%, #191620 48%, #0d1017 100%);
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.58);
  color: #f7f1e8;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.char-info-library-floating-button {
  position: absolute;
  top: 32dvh;
  left: 18px;
  display: grid;
  width: 58px;
  height: 58px;
  padding: 14px;
  place-items: center;
  border: 1px solid rgba(232, 210, 171, 0.42);
  border-radius: 18px;
  background: radial-gradient(circle at 30% 22%, rgba(217, 184, 122, 0.24), transparent 38%), rgba(18, 18, 26, 0.96);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.42);
  color: #ead19c;
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
}

.char-info-library-floating-button:active {
  cursor: grabbing;
}

.char-info-library-floating-button:focus-visible {
  outline: 2px solid #f0cf8e;
  outline-offset: 3px;
}

.char-info-library-floating-button svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.char-info-library-notification-dot,
.char-info-library-character-dot {
  display: block;
  width: 11px;
  height: 11px;
  border: 2px solid #17171f;
  border-radius: 50%;
  background: #ff435f;
  box-shadow: 0 0 0 2px rgba(255, 67, 95, 0.16);
}

.char-info-library-notification-dot {
  position: absolute;
  top: 3px;
  right: 3px;
}

.char-info-library-list-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.char-info-library-list-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  width: min(390px, calc(100% - 24px));
  height: min(680px, calc(100% - 24px));
  max-height: min(680px, calc(100% - 24px));
  overflow: hidden;
  border: 1px solid rgba(232, 210, 171, 0.28);
  border-radius: 18px;
  background: radial-gradient(circle at 0 0, rgba(122, 92, 168, 0.18), transparent 44%), rgba(18, 18, 26, 0.985);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.56);
  color: #f7f1e8;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

@media (min-width: 721px) {
  .char-info-library-list-dialog.with-viewer {
    left: max(12px, calc(50% - 810px));
    transform: translateY(-50%);
  }

  .char-info-library-overlay.with-list {
    left: calc(50% + 210px);
    width: min(1200px, calc(100% - 430px));
  }
}

.char-info-library-list-dialog > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 16px 12px;
  border-bottom: 1px solid rgba(232, 210, 171, 0.14);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.char-info-library-list-dialog > header:active {
  cursor: grabbing;
}

.char-info-library-list-title {
  display: flex;
  min-width: 0;
  align-items: center;
  flex: 1 1 auto;
}

.char-info-library-source-switch {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(232, 210, 171, 0.2);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
}

.char-info-library-source-switch button {
  min-width: 0;
  min-height: 38px;
  padding: 7px 9px;
  border: 0;
  border-left: 1px solid rgba(232, 210, 171, 0.14);
  background: transparent;
  color: #b9b4bd;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.char-info-library-source-switch button:first-child {
  border-left: 0;
}

.char-info-library-source-switch button:hover {
  background: rgba(217, 184, 122, 0.1);
  color: #fff8eb;
}

.char-info-library-source-switch button.active {
  background: rgba(217, 184, 122, 0.2);
  color: #f4d493;
}

.char-info-library-source-switch button:focus-visible {
  outline: 2px solid #f0cf8e;
  outline-offset: -2px;
}

.char-info-library-list-actions {
  display: flex;
  gap: 8px;
}

.char-info-library-list-actions button {
  display: grid;
  width: 38px;
  height: 38px;
  padding: 0;
  place-items: center;
  border: 1px solid rgba(232, 210, 171, 0.24);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.055);
  color: inherit;
  cursor: pointer;
  font-size: 1.15rem;
}

.char-info-library-list-actions svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.char-info-library-list-controls {
  padding: 12px 14px 4px;
}

.char-info-library-list-controls input {
  width: 100%;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid rgba(232, 210, 171, 0.2);
  border-radius: 10px;
  outline: none;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
}

.char-info-library-list-controls input:focus {
  border-color: #d9b87a;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.char-info-library-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 64px;
  padding: 10px 12px 10px 18px;
  border-bottom: 1px solid rgba(232, 210, 171, 0.2);
  background: linear-gradient(90deg, rgba(18, 19, 27, 0.97), rgba(13, 14, 20, 0.92));
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.char-info-library-header:active {
  cursor: grabbing;
}

.char-info-library-header h2 {
  position: relative;
  min-width: 0;
  margin: 0;
  padding-left: 13px;
  overflow: hidden;
  color: #f7f3ec;
  font-family: 'Noto Sans SC', 'Microsoft YaHei UI', 'PingFang SC', sans-serif;
  font-size: clamp(1.2rem, 2.1vw, 1.55rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-overflow: ellipsis;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.36);
  white-space: nowrap;
}

.char-info-library-header h2::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f0cf8e, #8ed9b6);
  box-shadow: 0 0 12px rgba(217, 184, 122, 0.3);
  content: '';
  transform: translateY(-50%);
}

.char-info-library-header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border: 1px solid rgba(232, 210, 171, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
}

.char-info-library-filters button {
  min-height: 38px;
  padding: 7px 14px;
  border: 1px solid rgba(232, 210, 171, 0.25);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
}

.char-info-library-filters button:hover,
.char-info-library-filters button.active {
  border-color: #d9b87a;
  background: rgba(217, 184, 122, 0.14);
}

.char-info-library-header-actions button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #e9e5de;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.char-info-library-header-actions button:hover:not(:disabled) {
  border-color: rgba(217, 184, 122, 0.34);
  background: rgba(217, 184, 122, 0.1);
  color: #fff8eb;
}

.char-info-library-header-actions button:active:not(:disabled) {
  transform: translateY(1px);
}

.char-info-library-header-actions button:focus-visible {
  outline: 2px solid #f0cf8e;
  outline-offset: 2px;
}

.char-info-library-header-actions button:disabled {
  cursor: wait;
  opacity: 0.48;
}

.char-info-library-list-action {
  gap: 8px;
  padding: 0 13px;
  background: rgba(217, 184, 122, 0.12);
  font-weight: 650;
}

.char-info-library-icon-action {
  width: 40px;
  padding: 0;
  background: rgba(255, 255, 255, 0.035);
}

.char-info-library-close-action:hover:not(:disabled) {
  border-color: rgba(255, 126, 144, 0.42) !important;
  background: rgba(255, 92, 117, 0.12) !important;
  color: #ffbac5 !important;
}

.char-info-library-header-actions svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.char-info-library-list-action svg circle {
  fill: currentColor;
  stroke: none;
}

.char-info-library-header-actions svg.spinning {
  animation: char-info-library-spin 900ms linear infinite;
}

@keyframes char-info-library-spin {
  to {
    transform: rotate(360deg);
  }
}

.char-info-library-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}

.char-info-library-filters button {
  min-height: 32px;
  padding: 5px 10px;
  font-size: 0.75rem;
}

.char-info-library-list {
  display: grid;
  gap: 7px;
  min-height: 0;
  padding: 8px 14px 14px;
  overflow: auto;
}

.char-info-library-list > button {
  position: relative;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 66px;
  padding: 10px 11px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.char-info-library-list > button:hover,
.char-info-library-list > button.active,
.char-info-library-list > button.unread {
  border-color: rgba(217, 184, 122, 0.55);
  background: rgba(217, 184, 122, 0.1);
}

.char-info-library-avatar {
  display: grid;
  width: 42px;
  height: 42px;
  overflow: hidden;
  place-items: center;
  border: 1px solid rgba(217, 184, 122, 0.4);
  border-radius: 50%;
  background: rgba(217, 184, 122, 0.08);
  color: #e6c98d;
  font-family: Georgia, 'Noto Serif SC', serif;
}

.char-info-library-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.char-info-library-list-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.char-info-library-list-copy strong,
.char-info-library-list-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.char-info-library-list-meta {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.char-info-library-affinity {
  color: #f1b4c1;
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.char-info-library-list-copy small {
  color: #9b96a1;
  font-size: 0.72rem;
}

.char-info-library-presence {
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(91, 181, 139, 0.16);
  color: #8ed9b6;
  font-size: 0.68rem;
}

.char-info-library-presence.away {
  background: rgba(160, 160, 170, 0.11);
  color: #aaa7b0;
}

.char-info-library-character-dot {
  position: absolute;
  top: 5px;
  right: 5px;
}

.char-info-library-error,
.char-info-library-empty {
  padding: 18px 16px;
  color: #aaa5b2;
  font-size: 0.82rem;
}

.char-info-library-error {
  color: #ffadad;
}

.char-info-library-viewer {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px;
}

.char-info-library-viewer > .viewer-root {
  height: 100%;
  min-height: 100%;
  padding: 0;
}

.char-info-library-viewer .illustrated-wrapper,
.char-info-library-viewer .illustrated-shell {
  height: 100%;
  min-height: 0;
}

.char-info-library-viewer .illustrated-shell {
  height: 100% !important;
}

.char-info-library-placeholder {
  display: grid;
  min-height: 100%;
  place-content: center;
  color: #9893a0;
  text-align: center;
}

.char-info-library-placeholder span {
  color: #d9b87a;
  font-size: 2rem;
}

@media (max-width: 720px) {
  .char-info-library-overlay {
    inset: 0 !important;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    transform: none !important;
  }

  .char-info-library-floating-button {
    width: 52px;
    height: 52px;
    padding: 12px;
    border-radius: 16px;
  }

  .char-info-library-list-backdrop {
    inset: 0;
  }

  .char-info-library-list-dialog {
    width: calc(100% - 16px);
    height: calc(100% - 16px);
    max-height: calc(100% - 16px);
    border-radius: 15px;
  }

  .char-info-library-list-dialog > header {
    padding: 12px;
  }

  .char-info-library-list-controls {
    padding: 10px 10px 2px;
  }

  .char-info-library-list {
    grid-template-columns: 1fr;
    padding: 7px 10px 10px;
  }

  .char-info-library-list > button {
    min-height: 62px;
    padding: 8px;
  }

  .char-info-library-header {
    min-height: 60px;
    gap: 10px;
    padding: 8px;
  }

  .char-info-library-header h2 {
    padding-left: 10px;
    font-size: 1rem;
    white-space: nowrap;
  }

  .char-info-library-header h2::before {
    height: 18px;
  }

  .char-info-library-header-actions {
    gap: 3px;
    padding: 3px;
    border-radius: 12px;
  }

  .char-info-library-header-actions button {
    min-height: 38px;
  }

  .char-info-library-list-action {
    gap: 6px;
    padding: 0 9px;
    font-size: 0.75rem;
  }

  .char-info-library-icon-action {
    width: 38px;
  }

  .char-info-library-viewer {
    flex: 1 1 auto;
    min-height: 0;
    padding: 6px;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .char-info-library-viewer > .viewer-root {
    height: auto;
    min-height: 100%;
  }

  .char-info-library-viewer .illustrated-wrapper {
    height: auto;
    max-width: none;
  }

  .char-info-library-viewer .illustrated-shell {
    height: 216.4251cqw !important;
    min-height: 0;
  }

  .char-info-library-viewer .illustrated-portrait-image,
  .char-info-library-viewer .illustrated-portrait-video,
  .char-info-library-viewer .portrait-image {
    object-fit: contain;
    background: rgba(0, 0, 0, 0.22);
  }
}
</style>
