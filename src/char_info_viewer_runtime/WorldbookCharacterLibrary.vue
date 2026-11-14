<template>
  <div
    class="manager-root library-mode"
    :class="[managerThemeClass(themeMode), { 'force-mobile-layout': forceMobileLayout, embedded }]"
  >
    <main class="manager-dialog library-dialog" role="dialog" aria-modal="false" aria-labelledby="manager-title">
      <header class="dialog-header library-header">
        <div class="header-title">
          <svg class="library-title-icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 5.5 10.4 7v12L4 17.4V5.5Zm16 0L13.6 7v12l6.4-1.6V5.5ZM12 8.6v10.3" />
            <path d="M6.5 9.2 9 10m6.5 0 2.5-.8m-11.5 4 2.5.8m6.5 0 2.5-.8" />
          </svg>
          <h1 id="manager-title">世界书角色库</h1>
          <span class="phase-badge" role="status">{{ filteredCharacters.length }} / {{ worldbookCharacters.length }} 个角色</span>
        </div>

        <div class="character-source-switch" role="group" aria-label="选择角色资料来源">
          <button type="button" aria-pressed="false" @click="emit('openCurrentChat')">当前聊天角色</button>
          <button type="button" class="active" aria-pressed="true">世界书角色</button>
        </div>

        <div class="header-actions">
          <button class="close-button" type="button" aria-label="关闭" @click="emit('close')">×</button>
        </div>
      </header>

      <section class="library-page">
        <div class="mobile-library-context">
          <div class="character-source-switch" role="group" aria-label="选择角色资料来源">
            <button type="button" aria-pressed="false" @click="emit('openCurrentChat')">当前聊天角色</button>
            <button type="button" class="active" aria-pressed="true">世界书角色</button>
          </div>
          <label class="mobile-library-worldbook">
            <span>世界书</span>
            <select v-model="selectedWorldbookName" :disabled="loadingWorldbooks || worldbooks.length === 0">
              <option :value="ALL_CURRENT_WORLDBOOKS">全部当前世界书</option>
              <option v-for="worldbook in worldbooks" :key="worldbook" :value="worldbook">
                {{ worldbook }}{{ characterWorldbooks.includes(worldbook) ? '（当前角色）' : '' }}
              </option>
            </select>
          </label>
        </div>

        <div class="character-library">
          <aside class="character-library-toolbar" aria-label="角色库筛选与显示">
            <div class="character-library-search-row">
              <div class="library-header-worldbook">
                <label>
                  <span>世界书</span>
                  <select v-model="selectedWorldbookName" :disabled="loadingWorldbooks || worldbooks.length === 0">
                    <option :value="ALL_CURRENT_WORLDBOOKS">全部当前世界书</option>
                    <option v-for="worldbook in worldbooks" :key="worldbook" :value="worldbook">
                      {{ worldbook }}{{ characterWorldbooks.includes(worldbook) ? '（当前角色）' : '' }}
                    </option>
                  </select>
                </label>
                <button
                  class="icon-button library-refresh-button"
                  type="button"
                  aria-label="重新读取角色库"
                  :disabled="loadingWorldbooks || loadingEntries"
                  @click="loadWorldbooks"
                >↻</button>
              </div>
            <label class="library-search-field">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="10.7" cy="10.7" r="6.4" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                ref="searchInput"
                v-model="searchText"
                type="search"
                autocomplete="off"
                placeholder="搜索姓名、种族或作者"
                aria-label="搜索角色姓名、种族、作者或版本"
              />
            </label>
            </div>

            <div v-if="mobileFilterOpen" class="mobile-library-filter-panel" aria-label="筛选角色">
              <div class="mobile-library-filter-options" role="group" aria-label="筛选角色状态">
                <button
                  v-for="option in filterOptions"
                  :key="option.value"
                  type="button"
                  :aria-pressed="filter === option.value"
                  @click="setFilter(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
              <label class="character-race-filter">
                <span>种族</span>
                <select v-model="raceFilter">
                  <option value="all">全部种族</option>
                  <option v-for="race in availableRaces" :key="race" :value="race">{{ race }}</option>
                </select>
              </label>
              <label class="character-order-select">
                <span>排序</span>
                <select v-model="sortOrder">
                  <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>

            <div v-if="worldbookCharacters.length" class="character-library-control-row">
              <div class="character-library-filter-buttons" role="group" aria-label="筛选角色状态">
                <span class="character-library-control-label">状态</span>
                <button
                  v-for="option in filterOptions"
                  :key="option.value"
                  type="button"
                  :aria-pressed="filter === option.value"
                  @click="filter = option.value"
                >
                  {{ option.label }}
                </button>
              </div>

              <div class="character-library-meta-controls">
                <label class="character-race-filter">
                  <span>种族</span>
                  <select v-model="raceFilter">
                    <option value="all">全部种族</option>
                    <option v-for="race in availableRaces" :key="race" :value="race">{{ race }}</option>
                  </select>
                </label>
                <label class="character-order-select">
                  <span>排序</span>
                  <select v-model="sortOrder">
                    <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>

              <div class="character-library-view-options">
                <div class="character-library-layout-switch" role="group" aria-label="选择角色库显示方式">
                  <button type="button" aria-label="紧凑列表" :aria-pressed="layout === 'list'" @click="layout = 'list'">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
                    </svg>
                    <span>列表</span>
                  </button>
                  <button type="button" aria-label="图片卡片" :aria-pressed="layout === 'cards'" @click="layout = 'cards'">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <rect x="4" y="4" width="6" height="6" rx=".8" />
                      <rect x="14" y="4" width="6" height="6" rx=".8" />
                      <rect x="4" y="14" width="6" height="6" rx=".8" />
                      <rect x="14" y="14" width="6" height="6" rx=".8" />
                    </svg>
                    <span>卡片</span>
                  </button>
                </div>
                <label v-if="layout === 'cards'" class="character-card-columns">
                  <span>每行显示</span>
                  <select v-model="cardColumns" aria-label="每行显示卡片数">
                    <option value="auto">自动适应</option>
                    <option v-for="column in cardColumnOptions" :key="column" :value="column">{{ column }} 列</option>
                  </select>
                </label>
              </div>

            </div>
          </aside>

          <div ref="libraryPage" class="character-library-results" @scroll.passive="onLibraryPageScroll">
          <div v-if="layout === 'list' && worldbookCharacters.length" class="character-library-list-heading" aria-hidden="true">
            <span></span>
            <span>角色</span>
            <span>启用</span>
          </div>
          <div
            class="character-library-grid"
            role="list"
            :aria-label="layout === 'list' ? '角色列表' : '角色卡片'"
            :class="[
              { 'image-card-view': layout === 'cards', 'list-view': layout === 'list' },
              cardColumns === 'auto' ? '' : `card-columns-${cardColumns}`,
            ]"
          >
            <article
              v-for="character in filteredCharacters"
              :key="character.key"
              class="character-library-card"
              role="listitem"
              :class="{
                disabled: !character.entry.enabled,
                encountered: character.encountered,
                unconfigured: !character.hasProfileRecord,
              }"
              @click="openDetails(character)"
            >
              <button
                class="character-cover-button"
                type="button"
                :aria-label="`查看 ${characterName(character)}${coverUrl(character) ? '' : '（未配置档案）'}`"
                @click.stop="openDetails(character)"
              >
                <img
                  v-if="coverUrl(character)"
                  :src="coverUrl(character)"
                  :alt="characterName(character)"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  @error="advanceCover(character)"
                />
                <span v-else class="character-cover-placeholder" aria-hidden="true">
                  <svg class="character-cover-silhouette" viewBox="0 0 80 96">
                    <path d="M40 48c12.4 0 22-10.2 22-22.8S52.4 2.5 40 2.5 18 12.7 18 25.2 27.6 48 40 48Z" />
                    <path d="M8.5 94v-8.1c0-19.9 14.1-32.7 31.5-32.7s31.5 12.8 31.5 32.7V94H8.5Z" />
                  </svg>
                </span>
              </button>

              <div
                class="character-library-card-copy"
                role="button"
                tabindex="0"
                :title="`查看 ${characterName(character)}的角色详情`"
                @click.stop="openDetails(character)"
                @keydown.enter.prevent="openDetails(character)"
                @keydown.space.prevent="openDetails(character)"
              >
                <div class="character-library-card-identity">
                  <span class="character-library-accessible-label">查看角色详情：</span>
                  <strong>{{ characterName(character) }}</strong>
                  <small>{{ character.description || '资料待补全' }}</small>
                </div>
                <span v-if="layout === 'cards'" class="character-library-card-meta">
                  <span class="character-library-card-tags">
                    <span class="character-library-accessible-label">种族：</span>
                    <i>{{ character.race || '种族未知' }}</i>
                    <i v-if="character.encountered" class="encountered">已遇到</i>
                    <i v-if="!character.hasProfileRecord" class="visual-missing">未配置档案</i>
                  </span>
                  <span v-if="character.author" class="character-library-author-field">
                    <span class="character-library-accessible-label">作者：</span>
                    <span class="character-library-card-author">{{ character.author }}</span>
                  </span>
                </span>
              </div>
              <button
                class="character-entry-toggle"
                :class="{ 'character-entry-status': layout === 'cards' }"
                type="button"
                role="switch"
                :aria-checked="character.entry.enabled"
                :aria-label="`${characterName(character)}的世界书条目`"
                :aria-busy="togglingKeys.has(character.key)"
                :title="`点击${character.entry.enabled ? '禁用' : '启用'} ${characterName(character)}的世界书条目`"
                :disabled="togglingKeys.has(character.key)"
                @click.stop="toggleCharacter(character)"
              >
                <span v-if="layout === 'list'" aria-hidden="true"></span>
                <template v-else>
                  <i class="character-entry-status-dot" aria-hidden="true"></i>
                  {{ togglingKeys.has(character.key) ? '保存中…' : character.entry.enabled ? '已启用' : '已禁用' }}
                </template>
              </button>
            </article>
          </div>

          <p v-if="worldbookCharacters.length && !filteredCharacters.length" class="character-library-no-results">当前筛选条件下没有角色。</p>
          <p v-if="toggleMessage" class="character-library-feedback" aria-live="polite">{{ toggleMessage }}</p>

        <div v-if="selectedWorldbookName && !loadingEntries && !worldbookCharacters.length" class="character-library-empty library-page-empty">
          <strong>这个世界书暂时没有可显示的角色。</strong>
        </div>
        <p v-if="error" class="message error">{{ error }}</p>
          </div>
        </div>

        <button
          v-if="showBackToTop && !detailCharacter"
          class="mobile-library-back-to-top"
          type="button"
          aria-label="返回角色库顶部"
          @click="scrollLibraryToTop"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 14 6-6 6 6" /></svg>
        </button>

        <nav v-if="!detailCharacter" class="mobile-library-dock" aria-label="角色库操作">
          <button type="button" aria-label="搜索角色" @click="focusSearch">
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.7" cy="10.7" r="6.4" /><path d="m16 16 4 4" /></svg>
            <span>搜索</span>
          </button>
          <button type="button" aria-label="筛选角色" :aria-expanded="mobileFilterOpen" @click="mobileFilterOpen = !mobileFilterOpen">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16l-6.3 7.2v5.2l-3.4 1.8v-7L4 5Z" /></svg>
            <span>筛选</span>
          </button>
          <button class="mobile-library-dock-home" type="button" aria-label="返回游戏" @click="emit('close')">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 11 8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" /></svg>
            <span>返回游戏</span>
          </button>
          <button type="button" aria-label="切换角色库显示方式" :aria-pressed="layout === 'cards'" @click="toggleLayout">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <rect x="4" y="4" width="6" height="6" rx=".8" /><rect x="14" y="4" width="6" height="6" rx=".8" />
              <rect x="4" y="14" width="6" height="6" rx=".8" /><rect x="14" y="14" width="6" height="6" rx=".8" />
            </svg>
            <span>视图</span>
          </button>
          <button
            type="button"
            aria-label="重新读取角色库"
            :disabled="loadingWorldbooks || loadingEntries"
            @click="loadWorldbooks"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.34 5.66" /><path d="M20 5v6h-6" /></svg>
            <span>刷新</span>
          </button>
        </nav>
      </section>
    </main>

    <section
      v-if="detailCharacter"
      class="character-detail-layer"
      role="dialog"
      aria-modal="false"
      aria-labelledby="character-detail-title"
      @click.self="closeDetails"
    >
      <article class="character-detail-dialog" tabindex="-1">
        <header class="character-detail-header">
          <div>
            <span class="character-detail-status" :class="{ disabled: !detailCharacter.entry.enabled }">
              {{ detailCharacter.entry.enabled ? '已启用' : '已禁用' }}
            </span>
            <h2 id="character-detail-title">{{ characterName(detailCharacter) }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="关闭角色详情" @click="closeDetails">×</button>
        </header>

        <div class="character-detail-body">
          <section class="character-detail-gallery" aria-labelledby="character-detail-gallery-title">
            <div class="character-detail-section-heading">
              <div><span>图片资料</span><h3 id="character-detail-gallery-title">角色图库</h3></div>
              <b>{{ detailGalleryItems.length }} 张</b>
            </div>
            <div class="character-detail-gallery-grid">
              <figure v-for="(item, index) in detailGalleryItems" :key="`${item.title}:${index}`">
                <div class="character-detail-media">
                  <template v-if="item.media?.kind === 'video'">
                    <video
                      v-if="activeDetailVideoIndex === item.sourceIndex"
                      :ref="element => setDetailVideoElement(item.sourceIndex, element)"
                      :src="item.media.url"
                      :poster="item.poster || undefined"
                      :aria-label="`正在播放视频：${item.title || `角色图片 ${index + 1}`}；鼠标移开暂停，触屏点击暂停`"
                      autoplay
                      muted
                      loop
                      playsinline
                      preload="metadata"
                      role="button"
                      tabindex="0"
                      title="鼠标移开暂停；触屏点击暂停"
                      @pointerleave="onDetailVideoPointerLeave(item.sourceIndex, $event)"
                      @pointerup="onDetailVideoPointerUp(item.sourceIndex, $event)"
                      @keydown.enter.prevent="toggleDetailVideo(item.sourceIndex)"
                      @keydown.space.prevent="toggleDetailVideo(item.sourceIndex)"
                      @error="advanceDetailMedia(item.sourceIndex)"
                    ></video>
                    <button
                      v-else
                      class="character-detail-video-preview"
                      type="button"
                      :aria-label="`预览视频：${item.title || `角色图片 ${index + 1}`}；鼠标悬停播放，触屏点击播放`"
                      title="鼠标悬停播放；触屏点击播放"
                      @pointerenter="onDetailVideoPointerEnter(item.sourceIndex, $event)"
                      @pointerup="onDetailVideoPointerUp(item.sourceIndex, $event)"
                      @keydown.enter.prevent="toggleDetailVideo(item.sourceIndex)"
                      @keydown.space.prevent="toggleDetailVideo(item.sourceIndex)"
                    >
                      <img
                        v-if="item.poster"
                        :src="item.poster"
                        :alt="item.title || `第 ${index + 1} 张视频预览`"
                        loading="lazy"
                        referrerpolicy="no-referrer"
                      />
                      <canvas
                        v-else
                        :key="item.media.url"
                        :ref="element => setDetailVideoPreviewCanvas(item.sourceIndex, item.media.url, element)"
                        class="character-detail-video-canvas"
                        :class="{ ready: detailVideoPreviewReady.has(item.sourceIndex) }"
                        aria-hidden="true"
                      ></canvas>
                      <span
                        v-if="!item.poster && !detailVideoPreviewReady.has(item.sourceIndex)"
                        class="character-detail-video-empty"
                      >
                        正在读取视频…
                      </span>
                    </button>
                    <span class="character-detail-media-kind" aria-hidden="true">▶</span>
                  </template>
                  <img
                    v-else-if="item.media"
                    :src="item.media.url"
                    :alt="item.title || `第 ${index + 1} 张角色图片`"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    @error="advanceDetailMedia(item.sourceIndex)"
                  />
                  <span v-else>图片暂时无法读取</span>
                </div>
                <figcaption><strong>{{ item.title || `角色图片 ${index + 1}` }}</strong></figcaption>
              </figure>
            </div>
            <p v-if="!detailGalleryItems.length" class="character-detail-gallery-empty">这个角色尚未配置图库。</p>
          </section>

          <aside class="character-detail-metadata" aria-labelledby="character-detail-metadata-title">
            <div class="character-detail-section-heading">
              <h3 id="character-detail-metadata-title">档案信息</h3>
            </div>
            <dl class="character-detail-profile-meta">
              <div v-if="detailCharacter.race"><dt>种族</dt><dd>{{ detailCharacter.race }}</dd></div>
              <div v-if="detailCharacter.author"><dt>作者</dt><dd>{{ detailCharacter.author }}</dd></div>
              <div v-if="detailCharacter.version"><dt>版本</dt><dd>{{ detailCharacter.version }}</dd></div>
              <div><dt>世界书</dt><dd>{{ detailCharacter.worldbookName }}</dd></div>
              <div><dt>条目</dt><dd>{{ detailCharacter.entry.name }}</dd></div>
            </dl>
          </aside>

          <section class="character-detail-content" aria-labelledby="character-detail-content-title">
            <div class="character-detail-section-heading">
              <div><span>角色设定</span><h3 id="character-detail-content-title">角色条目内容</h3></div>
              <b>只读</b>
            </div>
            <p class="character-detail-content-note">设定正文（只读）</p>
            <pre>{{ detailEntryBody || '该角色暂时没有其他设定内容。' }}</pre>
          </section>
        </div>

        <footer class="character-detail-footer">
          <button class="secondary-button" type="button" @click="closeDetails">返回角色库</button>
          <button class="primary-button" type="button" @click="emit('edit', detailCharacter.worldbookName, detailCharacter.entry.uid)">
            编辑档案
          </button>
        </footer>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import {
  collectEncounteredCharacters,
  collectWorldbookCharacterEntries,
  inferCharacterRace,
  readCharacterEntryBody,
  setCharacterEntryEnabled,
  type EncounteredCharacterRecord,
  type WorldbookCharacterEntry,
} from '../char_info_shared/characterEntryLibrary';
import {
  createEmptyProfile,
  inspectManagedBlock,
  type CharacterProfile,
  type GalleryImage,
} from '../char_info_shared/characterProfile';
import { DEFAULT_CHAR_INFO_THEME_MODE, managerThemeClass, type CharInfoThemeMode } from '../char_info_shared/managerTheme';
import {
  buildCurrentWorldbookList,
  buildWorldbookList,
  loadWorldbookEntrySources,
  type WorldbookEntrySource,
} from '../char_info_shared/worldbookList';
import {
  resolveRemoteGalleryPresentation,
  type RemoteGalleryPresentation,
} from '../char_info_viewer/services/remoteGalleryService';
import { normalizePortraitMediaUrlForBrowser } from '../char_info_viewer/services/imageUrl';

type LibraryCharacter = WorldbookCharacterEntry<WorldbookEntry, CharacterProfile> & {
  worldbookName: string;
  key: string;
  encountered: boolean;
  race: string;
  author: string;
  version: string;
  description: string;
};
type Filter = 'all' | 'encountered' | 'enabled' | 'disabled';
type SortOrder = 'original' | 'name' | 'race' | 'author' | 'encountered' | 'enabled';
type Media = NonNullable<ReturnType<typeof normalizePortraitMediaUrlForBrowser>>;

withDefaults(defineProps<{ forceMobileLayout?: boolean; themeMode?: CharInfoThemeMode; embedded?: boolean }>(), {
  forceMobileLayout: false,
  themeMode: DEFAULT_CHAR_INFO_THEME_MODE,
  embedded: false,
});
const emit = defineEmits<{
  close: [];
  openCurrentChat: [];
  selectionChanged: [worldbookName: string];
  summaryChanged: [summary: { filtered: number; total: number }];
  edit: [worldbookName: string, entryUid: number];
}>();

const ALL_CURRENT_WORLDBOOKS = '__charinfo_all_current_worldbooks__';

const worldbooks = ref<string[]>([]);
const characterWorldbooks = ref<string[]>([]);
const entrySources = ref<WorldbookEntrySource<WorldbookEntry>[]>([]);
const selectedWorldbookName = ref(ALL_CURRENT_WORLDBOOKS);
const loadingWorldbooks = ref(false);
const loadingEntries = ref(false);
const error = ref('');
const toggleMessage = ref('');
const searchText = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const libraryPage = ref<HTMLElement | null>(null);
const showBackToTop = ref(false);
const filter = ref<Filter>('all');
const raceFilter = ref('all');
const sortOrder = ref<SortOrder>('original');
const layout = ref<'list' | 'cards'>('list');
const cardColumns = ref<'auto' | number>('auto');
const cardColumnOptions = [2, 3, 4, 5, 6];
const mobileFilterOpen = ref(false);
const encounteredCharacters = ref<EncounteredCharacterRecord[]>([]);
const togglingKeys = reactive(new Set<string>());
const coverIndexes = reactive<Record<string, number>>({});
const detailKey = ref<string | null>(null);
const detailGalleryIndexes = reactive<Record<string, number>>({});
const remotePresentations = reactive<Record<string, RemoteGalleryPresentation>>({});
const detailVideoElements = new Map<number, HTMLVideoElement>();
const activeDetailVideoIndex = ref<number | null>(null);
const detailVideoPreviewReady = reactive(new Set<number>());
const detailVideoPreviewSources = new Map<number, string>();
const detailVideoPreviewLoads = new Map<number, { video: HTMLVideoElement; timeoutId: number }>();
let detailVideoHoverTimer: number | null = null;
let detailVideoObserver: IntersectionObserver | null = null;
let entriesLoadRevision = 0;
const REMOTE_PREVIEW_CONCURRENCY = 6;

function worldbookEntryKey(worldbookName: string, uid: number): string {
  return `${worldbookName}:${uid}`;
}

const selectedEntrySources = computed(() =>
  selectedWorldbookName.value === ALL_CURRENT_WORLDBOOKS
    ? entrySources.value
    : entrySources.value.filter(source => source.worldbookName === selectedWorldbookName.value),
);

const selectedEditableWorldbookName = computed(() =>
  selectedWorldbookName.value === ALL_CURRENT_WORLDBOOKS
    ? (characterWorldbooks.value[0] ?? worldbooks.value[0] ?? '')
    : selectedWorldbookName.value,
);

const worldbookCharacters = computed<LibraryCharacter[]>(() => {
  const encountered = new Map(encounteredCharacters.value.map(character => [character.name, character]));
  return selectedEntrySources.value.flatMap(source =>
    collectWorldbookCharacterEntries(
      source.entries,
      content => {
        const inspection = inspectManagedBlock(content);
        return inspection.state === 'valid' ? inspection.profile : null;
      },
      (_entry, title) => createEmptyProfile(title.displayName ?? ''),
    ).map(character => {
      const match = encountered.get(character.profile.characterName);
      const inspection = inspectManagedBlock(character.entry.content);
      const body = readCharacterEntryBody(
        character.entry.content,
        inspection.state === 'valid' ? { start: inspection.start, end: inspection.end } : null,
      );
      const metadata = character.profile.metadata;
      return {
        ...character,
        worldbookName: source.worldbookName,
        key: worldbookEntryKey(source.worldbookName, character.entry.uid),
        encountered: !!match,
        race:
          metadata?.race ||
          match?.race ||
          inferCharacterRace(body, character.profile.characterName) ||
          character.title.raceText ||
          '',
        author: metadata?.author || character.title.authorText || '',
        version: metadata?.version || '',
        description: metadata?.author_note || character.title.descriptionText || '',
      };
    }),
  );
});

const filteredCharacters = computed(() => {
  const query = searchText.value.toLocaleLowerCase();
  const characters = worldbookCharacters.value.filter(character => {
    if (filter.value === 'encountered' && !character.encountered) return false;
    if (filter.value === 'enabled' && !character.entry.enabled) return false;
    if (filter.value === 'disabled' && character.entry.enabled) return false;
    if (raceFilter.value !== 'all' && character.race !== raceFilter.value) return false;
    if (!query) return true;
    return [
      characterName(character),
      character.entry.name,
      character.race,
      character.author,
      character.version,
      character.description,
    ].some(value => value.toLocaleLowerCase().includes(query));
  });
  return sortCharacters(characters, sortOrder.value);
});
const availableRaces = computed(() =>
  Array.from(new Set(worldbookCharacters.value.map(character => character.race).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, 'zh-CN'),
  ),
);
watch([() => filteredCharacters.value.length, () => worldbookCharacters.value.length], ([filtered, total]) => {
  emit('summaryChanged', { filtered, total });
}, { immediate: true });
const detailCharacter = computed(() => worldbookCharacters.value.find(character => character.key === detailKey.value) ?? null);
const detailEntryBody = computed(() => {
  const character = detailCharacter.value;
  if (!character) return '';
  const inspection = inspectManagedBlock(character.entry.content);
  return readCharacterEntryBody(
    character.entry.content,
    inspection.state === 'valid' ? { start: inspection.start, end: inspection.end } : null,
  );
});
const detailGallery = computed(() => {
  const character = detailCharacter.value;
  if (!character) return [];
  const remote = remotePresentations[character.key];
  if (remote) return remote.gallery;
  return character.profile.gallery;
});
const detailGalleryItems = computed(() =>
  detailGallery.value.flatMap((image, index) => {
    const sources = mediaSources(image);
    if (!sources.length) return [];
    return [
      {
        title: image.title,
        sourceIndex: index,
        media: sources[detailGalleryIndexes[`${detailKey.value}:${index}`] ?? 0] ?? null,
        poster: videoPoster(image),
      },
    ];
  }),
);
const filterOptions: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'encountered', label: '在场' },
  { value: 'enabled', label: '已启用' },
  { value: 'disabled', label: '已禁用' },
];
const sortOptions: Array<{ value: SortOrder; label: string }> = [
  { value: 'original', label: '世界书顺序' },
  { value: 'name', label: '按姓名' },
  { value: 'race', label: '按种族' },
  { value: 'author', label: '按作者' },
  { value: 'encountered', label: '已遇到优先' },
  { value: 'enabled', label: '已启用优先' },
];

function characterName(character: LibraryCharacter): string {
  return character.profile.characterName || character.title.displayName || character.entry.name;
}

function compareText(left: string, right: string): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, 'zh-CN');
}

function compareCharacterName(left: LibraryCharacter, right: LibraryCharacter): number {
  return characterName(left).localeCompare(characterName(right), 'zh-CN');
}

function sortCharacters(characters: LibraryCharacter[], order: SortOrder): LibraryCharacter[] {
  if (order === 'original') return characters;
  return [...characters].sort((left, right) => {
    if (order === 'name') return compareCharacterName(left, right);
    if (order === 'race') return compareText(left.race, right.race) || compareCharacterName(left, right);
    if (order === 'author') return compareText(left.author, right.author) || compareCharacterName(left, right);
    if (order === 'encountered') return Number(right.encountered) - Number(left.encountered) || compareCharacterName(left, right);
    return Number(right.entry.enabled) - Number(left.entry.enabled) || compareCharacterName(left, right);
  });
}

function imageSources(character: LibraryCharacter): string[] {
  const remote = remotePresentations[character.key];
  const localSources = [
    character.profile.coverUrl,
    character.profile.avatarUrl,
    ...character.profile.gallery.flatMap(image => image.sources),
  ];
  const remoteSources = !remote
    ? []
    : layout.value === 'cards'
      ? [
          remote.coverUrl,
          remote.libraryThumbnailUrl,
          remote.avatarUrl,
          ...remote.gallery.flatMap(image => [image.thumbnail ?? '', ...image.sources]),
        ]
      : [remote.libraryThumbnailUrl, remote.avatarUrl];
  return [...remoteSources, ...localSources].flatMap(value => {
    const media = normalizePortraitMediaUrlForBrowser(value);
    return media?.kind === 'image' ? [media.url] : [];
  });
}

function coverUrl(character: LibraryCharacter): string {
  return imageSources(character)[coverIndexes[character.key] ?? 0] ?? '';
}

function advanceCover(character: LibraryCharacter) {
  coverIndexes[character.key] = (coverIndexes[character.key] ?? 0) + 1;
}

async function loadRemotePresentations(loaded: readonly WorldbookEntry[], revision: number, worldbookName: string) {
  let nextIndex = 0;
  const worker = async () => {
    while (revision === entriesLoadRevision) {
      const index = nextIndex++;
      if (index >= loaded.length) return;
      const entry = loaded[index];
      const inspection = inspectManagedBlock(entry.content);
      if (inspection.state !== 'valid' || !inspection.profile.remoteGalleryUrl) continue;
      try {
        const presentation = await resolveRemoteGalleryPresentation(inspection.profile.remoteGalleryUrl);
        if (presentation && revision === entriesLoadRevision) {
          const key = worldbookEntryKey(worldbookName, entry.uid);
          remotePresentations[key] = presentation;
          coverIndexes[key] = 0;
        }
      } catch (caught) {
        console.warn(`[CharInfo Manager] 远程角色预览读取失败：${inspection.profile.characterName}`, caught);
      }
    }
  };
  const workerCount = Math.min(REMOTE_PREVIEW_CONCURRENCY, loaded.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

function videoPoster(image: GalleryImage): string {
  const candidates = [image.thumbnail ?? '', ...image.sources];
  for (const value of candidates) {
    const media = normalizePortraitMediaUrlForBrowser(value);
    if (media?.kind === 'image') return media.url;
  }
  return '';
}

function mediaSources(image: GalleryImage): Media[] {
  return image.sources.flatMap(value => {
    const media = normalizePortraitMediaUrlForBrowser(value);
    return media ? [media] : [];
  });
}

function stopDetailVideoPreviewLoad(index: number) {
  const load = detailVideoPreviewLoads.get(index);
  if (!load) return;
  window.clearTimeout(load.timeoutId);
  load.video.pause();
  load.video.removeAttribute('src');
  load.video.load();
  detailVideoPreviewLoads.delete(index);
}

function stopAllDetailVideoPreviewLoads() {
  Array.from(detailVideoPreviewLoads.keys()).forEach(stopDetailVideoPreviewLoad);
}

function drawVideoPreviewFrame(index: number, canvas: HTMLCanvasElement, video: HTMLVideoElement) {
  const load = detailVideoPreviewLoads.get(index);
  if (!load || load.video !== video || !video.videoWidth || !video.videoHeight) return;

  const context = canvas.getContext('2d');
  if (!context) {
    stopDetailVideoPreviewLoad(index);
    return;
  }

  const targetWidth = 360;
  const targetHeight = 480;
  const targetAspect = targetWidth / targetHeight;
  const sourceAspect = video.videoWidth / video.videoHeight;
  let sx = 0;
  let sy = 0;
  let sw = video.videoWidth;
  let sh = video.videoHeight;

  if (sourceAspect > targetAspect) {
    sw = video.videoHeight * targetAspect;
    sx = (video.videoWidth - sw) / 2;
  } else {
    sh = video.videoWidth / targetAspect;
    sy = (video.videoHeight - sh) / 2;
  }

  try {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    detailVideoPreviewReady.add(index);
  } catch (_) {
    detailVideoPreviewReady.delete(index);
  } finally {
    stopDetailVideoPreviewLoad(index);
  }
}

function setDetailVideoPreviewCanvas(index: number, sourceUrl: string, element: unknown) {
  if (!(element instanceof HTMLCanvasElement)) return;
  if (detailVideoPreviewReady.has(index) && detailVideoPreviewSources.get(index) === sourceUrl) return;

  detailVideoPreviewReady.delete(index);
  detailVideoPreviewSources.set(index, sourceUrl);
  stopDetailVideoPreviewLoad(index);

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  const timeoutId = window.setTimeout(() => {
    detailVideoPreviewReady.delete(index);
    stopDetailVideoPreviewLoad(index);
  }, 8000);
  detailVideoPreviewLoads.set(index, { video, timeoutId });

  video.addEventListener(
    'loadeddata',
    () => {
      const duration = video.duration;
      if (Number.isFinite(duration) && duration > 0.25 && video.currentTime < 0.01) {
        try {
          video.currentTime = Math.min(0.2, duration * 0.05);
          return;
        } catch (_) {
          // Some WebViews cannot seek before the first decoded frame. Draw that frame instead.
        }
      }
      drawVideoPreviewFrame(index, element, video);
    },
    { once: true },
  );
  video.addEventListener('seeked', () => drawVideoPreviewFrame(index, element, video), { once: true });
  video.addEventListener(
    'error',
    () => {
      detailVideoPreviewReady.delete(index);
      stopDetailVideoPreviewLoad(index);
    },
    { once: true },
  );
  video.src = sourceUrl;
  video.load();
}

function pauseDetailVideo(index: number) {
  detailVideoElements.get(index)?.pause();
  if (activeDetailVideoIndex.value === index) activeDetailVideoIndex.value = null;
}

function pauseOtherDetailVideos(exceptIndex: number) {
  detailVideoElements.forEach((video, index) => {
    if (index !== exceptIndex) video.pause();
  });
  if (activeDetailVideoIndex.value !== exceptIndex) activeDetailVideoIndex.value = null;
}

function clearDetailVideoHoverTimer() {
  if (detailVideoHoverTimer === null) return;
  window.clearTimeout(detailVideoHoverTimer);
  detailVideoHoverTimer = null;
}

function pauseAllDetailVideos() {
  clearDetailVideoHoverTimer();
  detailVideoElements.forEach(video => video.pause());
  activeDetailVideoIndex.value = null;
}

async function playDetailVideo(index: number) {
  stopDetailVideoPreviewLoad(index);
  pauseOtherDetailVideos(index);
  activeDetailVideoIndex.value = index;
  await nextTick();

  const video = detailVideoElements.get(index);
  if (!video) {
    if (activeDetailVideoIndex.value === index) activeDetailVideoIndex.value = null;
    return;
  }

  void video.play().catch(() => {
    if (activeDetailVideoIndex.value === index) activeDetailVideoIndex.value = null;
  });
}

function toggleDetailVideo(index: number) {
  if (activeDetailVideoIndex.value === index) pauseDetailVideo(index);
  else void playDetailVideo(index);
}

function onDetailVideoPointerEnter(index: number, event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  clearDetailVideoHoverTimer();
  detailVideoHoverTimer = window.setTimeout(() => {
    detailVideoHoverTimer = null;
    void playDetailVideo(index);
  }, 150);
}

function onDetailVideoPointerLeave(index: number, event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  clearDetailVideoHoverTimer();
  pauseDetailVideo(index);
}

function onDetailVideoPointerUp(index: number, event: PointerEvent) {
  clearDetailVideoHoverTimer();
  if (event.pointerType !== 'mouse') toggleDetailVideo(index);
}

function setDetailVideoElement(index: number, element: unknown) {
  const previous = detailVideoElements.get(index);
  if (previous && previous !== element) {
    detailVideoObserver?.unobserve(previous);
    previous.pause();
  }
  if (!(element instanceof HTMLVideoElement)) {
    detailVideoElements.delete(index);
    if (activeDetailVideoIndex.value === index) activeDetailVideoIndex.value = null;
    return;
  }
  if (previous === element) return;
  detailVideoElements.set(index, element);
  detailVideoObserver?.observe(element);
}

function initializeDetailVideoObserver() {
  if (typeof IntersectionObserver === 'undefined') return;
  detailVideoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        const video = entry.target as HTMLVideoElement;
        const index = Array.from(detailVideoElements.entries()).find(([, candidate]) => candidate === video)?.[0];
        if (index !== undefined) pauseDetailVideo(index);
      }
    });
  });
  detailVideoElements.forEach(video => detailVideoObserver?.observe(video));
}

function advanceDetailMedia(index: number) {
  pauseDetailVideo(index);
  stopDetailVideoPreviewLoad(index);
  detailVideoPreviewReady.delete(index);
  detailVideoPreviewSources.delete(index);
  const key = `${detailKey.value}:${index}`;
  detailGalleryIndexes[key] = (detailGalleryIndexes[key] ?? 0) + 1;
}

function focusSearch() {
  searchInput.value?.focus();
}

function onLibraryPageScroll() {
  showBackToTop.value = (libraryPage.value?.scrollTop ?? 0) > 320;
}

function scrollLibraryToTop() {
  libraryPage.value?.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFilter(value: Filter) {
  filter.value = value;
  mobileFilterOpen.value = false;
}

function toggleLayout() {
  layout.value = layout.value === 'list' ? 'cards' : 'list';
}

async function loadEncounteredCharacters() {
  if (typeof Mvu === 'undefined') return;
  try {
    await waitGlobalInitialized('Mvu');
    encounteredCharacters.value = collectEncounteredCharacters(Mvu.getMvuData({ type: 'message', message_id: 'latest' }));
  } catch {
    encounteredCharacters.value = [];
  }
}

async function loadWorldbooks() {
  const revision = ++entriesLoadRevision;
  loadingWorldbooks.value = true;
  loadingEntries.value = true;
  error.value = '';
  toggleMessage.value = '';
  pauseAllDetailVideos();
  detailKey.value = null;
  Object.keys(remotePresentations).forEach(key => delete remotePresentations[key]);
  Object.keys(coverIndexes).forEach(key => delete coverIndexes[key]);

  try {
    if (!getCurrentCharacterName()) throw new Error('请先在 SillyTavern 打开一张角色卡。');
    const binding = getCharWorldbookNames('current');
    characterWorldbooks.value = buildWorldbookList([binding.primary, ...binding.additional], []);
    const globalWorldbooks = getGlobalWorldbookNames();
    const chatWorldbook = getChatWorldbookName('current');
    worldbooks.value = buildCurrentWorldbookList(binding, globalWorldbooks, chatWorldbook);
    if (!worldbooks.value.length) throw new Error('当前角色、全局与聊天中没有可用的世界书。');
    if (
      selectedWorldbookName.value !== ALL_CURRENT_WORLDBOOKS &&
      !worldbooks.value.includes(selectedWorldbookName.value)
    ) {
      selectedWorldbookName.value = ALL_CURRENT_WORLDBOOKS;
    }

    const loadedSources = await loadWorldbookEntrySources(worldbooks.value, getWorldbook);
    if (revision !== entriesLoadRevision) return;
    entrySources.value = loadedSources;
    void Promise.all(
      loadedSources.map(source => loadRemotePresentations(source.entries, revision, source.worldbookName)),
    );
    void loadEncounteredCharacters();
  } catch (caught) {
    if (revision === entriesLoadRevision) {
      entrySources.value = [];
      error.value = caught instanceof Error ? caught.message : String(caught);
    }
  } finally {
    if (revision === entriesLoadRevision) {
      loadingWorldbooks.value = false;
      loadingEntries.value = false;
    }
  }
}

async function toggleCharacter(character: LibraryCharacter) {
  const uid = character.entry.uid;
  const key = character.key;
  if (togglingKeys.has(key)) return;
  const enabled = !character.entry.enabled;
  togglingKeys.add(key);
  try {
    const updated = await updateWorldbookWith(
      character.worldbookName,
      latest => setCharacterEntryEnabled(latest, uid, enabled),
      { render: 'immediate' },
    );
    const saved = updated.find(entry => entry.uid === uid);
    if (!saved || saved.enabled !== enabled) throw new Error('条目开关后的读回验证失败。');
    entrySources.value = entrySources.value.map(source =>
      source.worldbookName === character.worldbookName ? { ...source, entries: updated } : source,
    );
    toggleMessage.value = `${characterName(character)} 已${enabled ? '启用' : '禁用'}。`;
  } catch (caught) {
    toggleMessage.value = `切换失败：${caught instanceof Error ? caught.message : String(caught)}`;
  } finally {
    togglingKeys.delete(key);
  }
}

function openDetails(character: LibraryCharacter) {
  pauseAllDetailVideos();
  stopAllDetailVideoPreviewLoads();
  detailVideoPreviewReady.clear();
  detailVideoPreviewSources.clear();
  detailKey.value = character.key;
  Object.keys(detailGalleryIndexes).forEach(key => delete detailGalleryIndexes[key]);
}

function closeDetails() {
  pauseAllDetailVideos();
  stopAllDetailVideoPreviewLoads();
  detailVideoPreviewReady.clear();
  detailVideoPreviewSources.clear();
  detailKey.value = null;
}

watch(selectedWorldbookName, () => {
  searchText.value = '';
  filter.value = 'all';
  raceFilter.value = 'all';
  sortOrder.value = 'original';
  mobileFilterOpen.value = false;
  closeDetails();
});
watch(selectedEditableWorldbookName, worldbookName => emit('selectionChanged', worldbookName), { immediate: true });
watch(layout, () => {
  Object.keys(coverIndexes).forEach(key => delete coverIndexes[key]);
});
onMounted(() => {
  initializeDetailVideoObserver();
  void loadWorldbooks();
});
onBeforeUnmount(() => {
  detailVideoObserver?.disconnect();
  detailVideoObserver = null;
  pauseAllDetailVideos();
  stopAllDetailVideoPreviewLoads();
  detailVideoElements.clear();
  detailVideoPreviewReady.clear();
  detailVideoPreviewSources.clear();
});
</script>

<style scoped>
.manager-root,
.manager-root * { box-sizing: border-box; }
.manager-root {
  --bg: var(--ci-bg); --surface: var(--ci-surface); --surface-raised: var(--ci-surface-raised); --surface-soft: var(--ci-surface-soft);
  --border: var(--ci-border); --border-strong: var(--ci-border-strong); --text: var(--ci-text); --text-secondary: var(--ci-text-secondary);
  --text-muted: var(--ci-text-muted); --primary: var(--ci-primary); --primary-strong: var(--ci-primary-strong); --primary-soft: var(--ci-primary-soft);
  --success: var(--ci-success);
  --ci-mobile-safe-top: max(env(safe-area-inset-top, 0px), 28px);
  --ci-mobile-safe-bottom: max(env(safe-area-inset-bottom, 0px), 18px);
  --ci-mobile-safe-left: env(safe-area-inset-left, 0px);
  --ci-mobile-safe-right: env(safe-area-inset-right, 0px);
  position: absolute; z-index: 1; inset: 0; display: grid; width: 100%; height: 100%; padding: 24px;
  overflow: auto; place-items: center; color: var(--text); background: var(--ci-overlay); backdrop-filter: blur(9px);
  pointer-events: auto;
  font-family: Inter, "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif;
}
button, input, select { color: inherit; font: inherit; }
button { cursor: pointer; }
select { margin: 0; color: var(--text); background: var(--ci-input); border: 1px solid var(--border); border-radius: 8px; }
.manager-dialog {
  position: relative; display: flex; width: min(1420px, 100%); height: calc(100% - 8px); max-height: calc(100% - 8px); min-height: 0;
  overflow: hidden; flex-direction: column; background: radial-gradient(circle at 0 0, rgb(var(--ci-primary-rgb) / 8%), transparent 28rem), var(--bg);
  border: 1px solid var(--border-strong); border-radius: 20px; box-shadow: 0 28px 90px rgb(0 0 0 / 55%);
}
.dialog-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 24px; padding: 22px 26px; background: var(--ci-header); border-bottom: 1px solid var(--border); }
.library-header { display: grid; min-height: 84px; padding: 12px 28px; grid-template-columns: minmax(250px, 1fr) minmax(320px, 430px) minmax(290px, 1fr); gap: 26px; }
.header-title { display: flex; min-width: 0; align-items: center; gap: 10px; }
.header-title h1 { margin: 0; font-size: clamp(22px, 3vw, 31px); }
.library-title-icon { width: 31px; height: 31px; flex: 0 0 auto; fill: none; stroke: var(--primary); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.phase-badge { color: var(--primary); font-size: 16px; font-weight: 700; white-space: nowrap; }
.character-source-switch { display: grid; padding: 3px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; background: var(--ci-input); border: 1px solid var(--border); border-radius: 10px; }
.character-source-switch button { min-height: 34px; padding: 6px 8px; color: var(--text-muted); background: transparent; border: 1px solid transparent; border-radius: 7px; font-size: 13px; font-weight: 800; }
.character-source-switch button:hover, .character-source-switch button.active { color: var(--primary); background: var(--primary-soft); border-color: rgb(var(--ci-primary-rgb) / 34%); }
.library-header .character-source-switch { grid-column: 1 / -1; grid-row: 2; }
.library-header-worldbook { display: flex; min-width: 0; align-items: flex-end; gap: 12px; }
.library-header-worldbook label { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 8px; }
.library-header-worldbook label > span { color: var(--text-muted); font-size: 12px; font-weight: 600; line-height: 18px; }
.library-header-worldbook select { width: 100%; min-height: 48px; padding: 9px 12px; font-size: 14px; font-weight: 600; }
.library-header-worldbook .library-refresh-button { width: 48px; height: 48px; flex: 0 0 auto; }
.header-actions { display: flex; grid-column: 3; grid-row: 1; align-items: center; justify-content: flex-end; gap: 10px; }
.close-button, .icon-button { display: grid; width: 42px; height: 42px; padding: 0; place-items: center; background: var(--surface-soft); border: 1px solid var(--border); border-radius: 10px; }
.close-button { font-size: 25px; line-height: 1; }
.library-page { display: flex; width: 100%; min-width: 0; min-height: 0; padding: 24px; flex: 1; flex-direction: column; overflow: hidden; }
.character-library { display: grid; min-height: 0; min-width: 0; flex: 1; grid-template-columns: 240px minmax(0, 1fr); gap: 24px; }
.character-library-results { min-width: 0; min-height: 0; padding-right: 8px; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; scrollbar-color: var(--border-strong) var(--surface); scrollbar-width: thin; scrollbar-gutter: stable; container-type: inline-size; container-name: character-list; }
.mobile-library-context, .mobile-library-filter-panel, .mobile-library-dock { display: none; }
.mobile-library-back-to-top {
  position: absolute;
  z-index: 6;
  right: 16px;
  bottom: calc(92px + var(--ci-mobile-safe-bottom));
  display: none;
  width: 44px;
  height: 44px;
  padding: 0;
  place-items: center;
  color: var(--primary);
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  box-shadow: 0 8px 24px rgb(0 0 0 / 28%);
  transition: bottom 120ms ease;
}
.mobile-library-back-to-top svg { width: 21px; height: 21px; fill: none; stroke: currentcolor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
.character-library-toolbar { display: flex; min-height: 0; padding: 18px; flex-direction: column; gap: 24px; overflow-y: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; scrollbar-width: thin; scrollbar-color: var(--border-strong) var(--surface); }
.character-library-search-row { display: grid; min-width: 0; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.library-search-field { display: flex; min-height: 48px; padding: 0 13px; align-items: center; gap: 10px; background: linear-gradient(90deg, var(--surface-raised), var(--surface)); border: 1px solid var(--border-strong); border-radius: 10px; }
.library-search-field:focus-within { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-soft); }
.library-search-field svg { width: 21px; height: 21px; flex: 0 0 auto; fill: none; stroke: var(--text-muted); stroke-linecap: round; stroke-width: 1.8; }
.library-search-field input { width: 100%; min-width: 0; min-height: 44px; padding: 0; color: var(--text); background: transparent; border: 0; outline: 0; font-size: 14px; font-weight: 550; }
.library-search-field input::placeholder { color: var(--text-muted); opacity: 1; }
.character-library-control-row { display: flex; flex-direction: column; align-items: stretch; gap: 24px; }
.character-library-filter-buttons { display: grid; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.character-library-filter-buttons .character-library-control-label { grid-column: 1 / -1; margin-bottom: 2px; }
.character-library-control-label { color: var(--text-muted); font-size: 13px; font-weight: 650; white-space: nowrap; }
.character-library-filter-buttons button { min-height: 40px; padding: 8px 14px; color: var(--text-secondary); background: transparent; border: 1px solid transparent; border-radius: 7px; font-size: 14px; font-weight: 650; }
.character-library-filter-buttons button[aria-pressed='true'] { color: var(--ci-on-primary); background: var(--primary); border-color: var(--primary); font-weight: 800; }
.character-library-meta-controls { display: grid; min-width: 0; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.character-race-filter, .character-order-select { display: flex; min-width: 0; flex-direction: column; align-items: stretch; gap: 8px; color: var(--text-muted); font-size: 13px; font-weight: 650; }
.character-race-filter > span, .character-order-select > span { white-space: nowrap; }
.character-race-filter select, .character-order-select select { width: 100%; min-width: 0; min-height: 44px; padding: 9px 12px; font-size: 14px; font-weight: 600; }
.character-library-view-options { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
.character-library-layout-switch { display: grid; padding: 4px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; }
.character-library-layout-switch button { display: inline-flex; min-height: 36px; padding: 8px 13px; align-items: center; justify-content: center; gap: 8px; color: var(--text-secondary); background: transparent; border: 1px solid transparent; border-radius: 6px; font-size: 13px; font-weight: 650; }
.character-library-layout-switch svg { width: 16px; height: 16px; fill: none; stroke: currentcolor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.character-library-layout-switch button[aria-pressed='true'] { color: var(--primary); background: var(--primary-soft); border-color: rgb(var(--ci-primary-rgb) / 58%); font-weight: 800; }
.character-card-columns { display: flex; flex-direction: column; align-items: stretch; gap: 8px; color: var(--text-muted); font-size: 13px; font-weight: 650; white-space: nowrap; }
.character-card-columns select { min-height: 44px; padding: 9px 12px; font-size: 14px; font-weight: 600; }
.character-library-grid { display: grid; align-content: start; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 20px; }
.character-library-card { display: grid; min-width: 0; min-height: 104px; padding: 10px; align-items: center; grid-template-columns: 74px minmax(0, 1fr) auto; gap: 10px; background: linear-gradient(145deg, var(--surface-raised), var(--surface)); border: 1px solid var(--border); border-radius: 8px; transition: border-color 160ms ease, box-shadow 160ms ease; }
.character-library-card.encountered { border-color: rgb(var(--ci-primary-rgb) / 38%); }
.character-library-card.disabled .character-cover-button { opacity: .72; filter: grayscale(.7); }
.character-cover-button { display: grid; width: 74px; height: 82px; padding: 0; overflow: hidden; place-items: center; color: var(--text-muted); background: linear-gradient(145deg, var(--surface-soft), var(--surface-raised)); border: 0; border-radius: 8px; }
.character-cover-button img { width: 100%; height: 100%; object-fit: cover; }
.character-cover-placeholder { display: grid; width: 100%; height: 100%; padding: 6px; place-items: center; align-content: center; gap: 2px; color: var(--text-secondary); background: linear-gradient(145deg, var(--surface-soft), var(--surface-raised)); }
.character-cover-silhouette { width: 51px; height: 61px; fill: var(--text-secondary); filter: drop-shadow(0 5px 7px rgb(0 0 0 / 24%)); }
.character-library-card-copy { display: flex; min-width: 0; flex-direction: column; gap: 5px; cursor: pointer; }
.character-library-card-copy:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; border-radius: 5px; }
.character-library-card-copy strong, .character-library-card-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.character-library-card-copy strong { color: var(--text); font-size: 15px; font-weight: 800; line-height: 1.25; }
.character-library-card-copy small { color: var(--text-secondary); font-size: 13px; font-weight: 600; line-height: 1.4; }
.character-library-card-meta { display: flex; min-width: 0; flex-wrap: wrap; gap: 4px; }
.character-library-card-tags { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; gap: 4px; }
.character-library-card-meta i { padding: 2px 5px; overflow: hidden; color: var(--text-muted); background: var(--surface-raised); border-radius: 5px; font-size: 12px; font-weight: 700; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
.character-library-card-meta i.encountered { color: var(--success); background: rgb(120 213 156 / 10%); }
.character-library-card-author { display: inline-flex; max-width: 100%; padding: 3px 7px; align-self: flex-start; overflow: hidden; color: var(--primary); background: rgb(var(--ci-primary-rgb) / 10%); border: 1px solid rgb(var(--ci-primary-rgb) / 24%); border-radius: 999px; font-size: 12px; font-weight: 700; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.character-library-card.disabled .character-library-card-copy :is(strong, small, i, .character-library-card-author) { color: var(--text-muted); }
.character-library-card.disabled .character-library-card-copy strong { font-weight: 600; }
.character-library-card.disabled .character-library-card-author { background: var(--surface-soft); border-color: transparent; }
.character-entry-toggle { display: inline-flex; width: 46px; height: 28px; padding: 4px; align-items: center; flex: 0 0 auto; background: #646b74; border: 0; border-radius: 999px; }
.character-entry-toggle span { display: block; width: 20px; height: 20px; background: #fff; border-radius: 50%; box-shadow: 0 1px 3px rgb(0 0 0 / 22%); }
.character-entry-toggle[aria-checked='true'] { background: #65c784; }
.character-entry-toggle[aria-checked='true'] span { transform: translateX(18px); }
.character-entry-toggle:hover:not(:disabled) { filter: brightness(1.1); }
.character-entry-toggle:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.character-entry-toggle:active:not(:disabled) { filter: brightness(.9); }
.character-entry-toggle:disabled { cursor: wait; opacity: .65; }
.character-library-no-results, .character-library-empty, .message { margin: 12px 0 0; padding: 14px; color: var(--text-muted); text-align: center; background: var(--surface-raised); border-radius: 9px; font-size: 13px; font-weight: 600; }
.message.error { color: var(--ci-danger); }
.character-library-grid.image-card-view { align-items: stretch; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 20px; }
.character-library-grid.image-card-view.card-columns-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.character-library-grid.image-card-view.card-columns-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.character-library-grid.image-card-view.card-columns-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.character-library-grid.image-card-view.card-columns-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.character-library-grid.image-card-view.card-columns-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.image-card-view .character-library-card { position: relative; display: grid; padding: 0; align-items: stretch; grid-template-columns: 1fr; grid-template-rows: auto 1fr 44px; gap: 0; overflow: hidden; border-radius: 12px; }
.image-card-view .character-library-card:not(.disabled) { border-color: var(--primary); }
.image-card-view .character-cover-button { width: 100%; height: auto; aspect-ratio: 3 / 4; min-height: 0; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); border-radius: 0; background: var(--surface-soft); }
.image-card-view .character-cover-button img { min-width: 0; min-height: 0; object-fit: cover; object-position: center top; }
.image-card-view .character-library-card-copy { padding: 12px 14px; gap: 8px; }
.image-card-view .character-library-card-copy strong { flex-shrink: 0; font-size: 16px; line-height: 1.4; }
.image-card-view .character-library-card-copy small { display: -webkit-box; flex-shrink: 0; overflow: hidden; font-size: 13px; line-height: 1.5; white-space: normal; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.image-card-view .character-library-card-meta { flex-wrap: nowrap; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; }
.image-card-view .character-library-card-tags { flex: 1; overflow: hidden; }
.image-card-view .character-library-card-meta i { padding: 0; background: transparent; font-weight: 500; line-height: 1.4; }
.image-card-view .character-library-card-author { max-width: 48%; padding: 2px 6px; align-self: center; border: 0; border-radius: 3px; background: var(--surface-soft); font-weight: 500; }
.character-entry-toggle.character-entry-status { width: 100%; height: 44px; padding: 8px 14px; justify-content: flex-start; gap: 8px; border-top: 1px solid var(--border); border-radius: 0; background: transparent; color: var(--text-muted); font-size: 13px; }
.character-entry-status[aria-checked='true'] { background: var(--primary-soft); color: var(--primary); }
.character-entry-status-dot { width: 8px; height: 8px; flex: 0 0 auto; border: 1px solid currentcolor; border-radius: 50%; }
.character-entry-status[aria-checked='true'] .character-entry-status-dot { background: currentcolor; box-shadow: 0 0 8px rgb(var(--ci-primary-rgb) / 40%); }
.character-entry-status:focus-visible { outline-offset: -3px; }
.character-detail-layer { position: absolute; z-index: 3; inset: 0; display: grid; padding: 24px; overflow: auto; place-items: center; background: var(--ci-overlay); backdrop-filter: blur(12px); }
.character-detail-dialog { display: flex; width: min(1240px, 100%); max-height: min(900px, calc(100vh - 48px)); min-height: 0; overflow: hidden; flex-direction: column; background: radial-gradient(circle at 0 0, rgb(var(--ci-primary-rgb) / 9%), transparent 30rem), var(--bg); border: 1px solid var(--border-strong); border-radius: 18px; box-shadow: 0 30px 90px rgb(0 0 0 / 62%); }
.character-detail-header { display: flex; padding: 20px 24px; align-items: flex-start; justify-content: space-between; gap: 20px; background: var(--ci-header); border-bottom: 1px solid var(--border); }
.character-detail-header h2, .character-detail-header p { margin: 0; }
.character-detail-header h2 { margin-top: 7px; font-size: clamp(24px, 3.5vw, 36px); }
.character-detail-header p { margin-top: 6px; color: var(--text-muted); font-size: 13px; font-weight: 550; }
.character-detail-profile-meta { display: grid; margin: 0; gap: 20px; }
.character-detail-profile-meta div { display: grid; min-width: 0; gap: 6px; }
.character-detail-profile-meta dt { color: var(--text-muted); font-size: 12px; font-weight: 600; }
.character-detail-profile-meta dd { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.65; overflow-wrap: anywhere; }
.character-detail-status { display: inline-flex; padding: 4px 8px; color: var(--success); background: rgb(120 213 156 / 10%); border: 1px solid rgb(120 213 156 / 25%); border-radius: 999px; font-size: 12px; font-weight: 800; }
.character-detail-status.disabled { color: var(--text-muted); background: var(--surface-soft); border-color: var(--border); }
.character-detail-body { display: grid; min-height: 0; padding: 24px; align-items: start; overflow-y: auto; grid-template-columns: minmax(0, 1fr) 260px; grid-template-areas: 'gallery metadata' 'content metadata'; gap: 24px; scrollbar-gutter: stable; }
.character-detail-gallery, .character-detail-content, .character-detail-metadata { min-width: 0; padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.character-detail-gallery { grid-area: gallery; }
.character-detail-content { grid-area: content; }
.character-detail-metadata { position: sticky; top: 0; grid-area: metadata; }
.character-detail-section-heading { display: flex; margin-bottom: 14px; align-items: flex-end; justify-content: space-between; gap: 16px; }
.character-detail-section-heading span { color: var(--primary); font-size: 12px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.character-detail-section-heading h3 { margin: 3px 0 0; font-size: 18px; }
.character-detail-section-heading b { color: var(--text-muted); font-size: 12px; font-weight: 650; }
.character-detail-gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.character-detail-gallery-grid figure { width: 100%; max-width: 220px; min-width: 0; margin: 0; overflow: hidden; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; }
.character-detail-media { position: relative; display: grid; aspect-ratio: 3 / 4; overflow: hidden; place-items: center; color: var(--text-muted); background: var(--surface-soft); font-size: 12px; font-weight: 550; }
.character-detail-media img, .character-detail-media video { width: 100%; height: 100%; object-fit: cover; }
.character-detail-video-preview { position: relative; display: grid; width: 100%; height: 100%; padding: 0; place-items: center; overflow: hidden; color: var(--text-muted); background: var(--surface-soft); border: 0; cursor: pointer; }
.character-detail-video-preview img { pointer-events: none; }
.character-detail-video-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; transition: opacity 120ms ease; }
.character-detail-video-canvas.ready { opacity: 1; }
.character-detail-video-empty { position: relative; z-index: 1; font-size: 12px; font-weight: 750; letter-spacing: .08em; }
.character-detail-media-kind { position: absolute; z-index: 2; top: 7px; right: 7px; display: grid; width: 22px; height: 22px; place-items: center; color: #fff; background: rgb(0 0 0 / 68%); border: 1px solid rgb(255 255 255 / 28%); border-radius: 50%; font-size: 10px; line-height: 1; pointer-events: none; }
.character-detail-media video { cursor: pointer; }
.character-detail-media video:focus-visible,
.character-detail-video-preview:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.character-detail-gallery-grid figcaption { padding: 9px 10px; }
.character-detail-gallery-empty { padding: 18px; color: var(--text-muted); text-align: center; background: var(--surface-raised); border: 1px dashed var(--border); border-radius: 10px; }
.character-detail-content-note { margin: 0 0 12px; color: var(--text-muted); font-size: 12px; font-weight: 550; }
.character-detail-content pre { margin: 0; padding: 16px; color: var(--text-secondary); white-space: pre-wrap; overflow-wrap: anywhere; background: var(--ci-input); border: 1px solid var(--border); border-radius: 11px; font: 14px/1.8 "Cascadia Code", Consolas, monospace; }
.character-detail-footer { display: flex; padding: 14px 20px; align-items: center; justify-content: flex-end; gap: 10px; background: var(--ci-header); border-top: 1px solid var(--border); }
.primary-button, .secondary-button { min-height: 40px; padding: 8px 14px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface-soft); }
.primary-button { color: var(--ci-on-primary); background: var(--primary); border-color: var(--primary); font-weight: 800; }

@media (max-width: 900px) {
  .manager-root { padding: 10px; }
  .manager-dialog { height: calc(100% - 2px); }
  .library-header { grid-template-columns: minmax(170px, 1fr) minmax(230px, 330px) auto; gap: 14px; }
  .character-library-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
  .manager-root, .manager-root.force-mobile-layout { padding: 0; overflow: hidden; }
  .manager-dialog, .force-mobile-layout .manager-dialog { width: 100%; min-width: 0; max-width: none; height: 100dvh; min-height: 0; max-height: none; box-sizing: border-box; border: 0; border-radius: 0; box-shadow: none; }
  .library-header, .force-mobile-layout .library-header { display: block; width: 100%; min-width: 0; min-height: 0; padding: calc(14px + var(--ci-mobile-safe-top)) calc(16px + var(--ci-mobile-safe-right)) 13px calc(16px + var(--ci-mobile-safe-left)); }
  .library-header .library-title-icon, .library-header > .character-source-switch, .library-header > .library-header-worldbook, .library-header > .header-actions { display: none; }
  .library-header .header-title { width: 100%; }
  .library-header h1 { font-size: 21px; }
  .library-page { padding: 16px; }
  .character-library { display: flex; flex-direction: column; gap: 16px; }
  .character-library-toolbar { max-height: 50%; padding: 12px; flex: 0 0 auto; }
  .character-library-results { padding-right: 0; padding-bottom: calc(96px + var(--ci-mobile-safe-bottom)); flex: 1; }
  .mobile-library-context { display: grid; width: 100%; min-width: 0; margin-bottom: 12px; gap: 10px; }
  .mobile-library-context .character-source-switch { width: 100%; min-width: 0; max-width: 100%; }
  .mobile-library-context .character-source-switch button { min-width: 0; min-height: 46px; font-size: 13px; }
  .mobile-library-worldbook { display: grid; width: 100%; min-width: 0; gap: 5px; }
  .mobile-library-worldbook > span { color: var(--text-muted); font-size: 11px; font-weight: 800; }
  .mobile-library-worldbook select { width: 100%; min-width: 0; max-width: 100%; min-height: 46px; padding: 8px; font-weight: 700; }
  .character-library-control-row { display: none; }
  .character-library-search-row { grid-template-columns: 1fr; }
  .character-library-search-row .library-header-worldbook { display: none; }
  .mobile-library-filter-panel { display: grid; margin-top: 10px; padding: 12px; gap: 10px; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; }
  .mobile-library-filter-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .mobile-library-filter-options button { min-height: 44px; color: var(--text-secondary); background: var(--surface-soft); border: 1px solid var(--border); border-radius: 9px; }
  .mobile-library-filter-options button[aria-pressed='true'] { color: var(--ci-on-primary); background: var(--primary); }
  .character-library-grid { grid-template-columns: 1fr; }
  .character-library-grid.image-card-view, .character-library-grid.image-card-view[class*='card-columns-'] { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .image-card-view .character-library-card-copy { padding: 10px; }
  .image-card-view .character-library-card-copy strong { font-size: 15px; }
  .character-library-card { min-height: 82px; padding: 8px; grid-template-columns: 58px minmax(0, 1fr) auto; gap: 8px; }
  .character-cover-button { width: 58px; height: 64px; border-radius: 8px; }
  .mobile-library-dock { position: absolute; z-index: 5; right: 0; bottom: 0; left: 0; display: grid; min-height: calc(76px + var(--ci-mobile-safe-bottom)); padding: 7px 7px calc(8px + var(--ci-mobile-safe-bottom)); grid-template-columns: 1fr 1fr 1.18fr 1fr 1fr; align-items: end; gap: 3px; background: var(--ci-header); border-top: 1px solid var(--border); }
  .mobile-library-back-to-top { display: grid; }
  .mobile-library-dock > button { display: grid; min-height: 50px; padding: 5px 2px; place-items: center; gap: 3px; color: var(--text-secondary); background: transparent; border: 0; border-radius: 11px; font-size: 11px; font-weight: 800; }
  .mobile-library-dock svg { width: 23px; height: 23px; fill: none; stroke: currentcolor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
  .mobile-library-dock-home { color: var(--primary) !important; }
  .character-detail-layer { padding: 0; }
  .character-detail-dialog { width: 100%; height: 100%; min-width: 0; min-height: 0; max-width: none; max-height: none; box-sizing: border-box; border: 0; border-radius: 0; }
  .manager-root:not(.embedded) .character-detail-header {
    padding: calc(14px + var(--ci-mobile-safe-top)) calc(14px + var(--ci-mobile-safe-right)) 14px calc(14px + var(--ci-mobile-safe-left));
  }
  .manager-root.embedded .character-detail-header { padding: 14px; }
  .character-detail-body { display: block; padding: 16px; overflow-y: auto; }
  .character-detail-gallery, .character-detail-content, .character-detail-metadata { padding: 16px; }
  .character-detail-metadata { position: static; margin: 16px 0; }
  .character-detail-gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .character-detail-footer {
    padding: 14px calc(20px + var(--ci-mobile-safe-right)) calc(14px + var(--ci-mobile-safe-bottom)) calc(20px + var(--ci-mobile-safe-left));
    align-items: stretch;
    flex-direction: column-reverse;
  }
}

.manager-root.force-mobile-layout { padding: 0; overflow: hidden; }
.force-mobile-layout .manager-dialog { width: 100%; min-width: 0; max-width: none; height: 100dvh; min-height: 0; max-height: none; box-sizing: border-box; border: 0; border-radius: 0; box-shadow: none; }
.force-mobile-layout .library-header { display: block; width: 100%; min-width: 0; min-height: 0; padding: calc(14px + var(--ci-mobile-safe-top)) calc(16px + var(--ci-mobile-safe-right)) 13px calc(16px + var(--ci-mobile-safe-left)); }
.force-mobile-layout .library-header .library-title-icon,
.force-mobile-layout .library-header > .character-source-switch,
.force-mobile-layout .library-header > .library-header-worldbook,
.force-mobile-layout .library-header > .header-actions { display: none; }
.force-mobile-layout .library-header .header-title { width: 100%; }
.force-mobile-layout .library-header h1 { font-size: 21px; }
.force-mobile-layout .library-page { padding: 16px; }
.force-mobile-layout .character-library { display: flex; flex-direction: column; gap: 16px; }
.force-mobile-layout .character-library-toolbar { max-height: 50%; padding: 12px; flex: 0 0 auto; }
.force-mobile-layout .character-library-results { padding-right: 0; padding-bottom: calc(96px + var(--ci-mobile-safe-bottom)); flex: 1; }
.force-mobile-layout .mobile-library-context { display: grid; margin-bottom: 12px; gap: 10px; }
.force-mobile-layout .mobile-library-context .character-source-switch { width: 100%; }
.force-mobile-layout .mobile-library-context .character-source-switch button { min-height: 46px; font-size: 13px; }
.force-mobile-layout .mobile-library-worldbook { display: grid; gap: 5px; }
.force-mobile-layout .mobile-library-worldbook > span { color: var(--text-muted); font-size: 11px; font-weight: 800; }
.force-mobile-layout .mobile-library-worldbook select { min-height: 46px; padding: 8px; font-weight: 700; }
.force-mobile-layout .character-library-control-row { display: none; }
.force-mobile-layout .character-library-search-row { grid-template-columns: 1fr; }
.force-mobile-layout .character-library-search-row .library-header-worldbook { display: none; }
.force-mobile-layout .mobile-library-filter-panel { display: grid; margin-top: 10px; padding: 12px; gap: 10px; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; }
.force-mobile-layout .mobile-library-filter-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.force-mobile-layout .mobile-library-filter-options button { min-height: 44px; color: var(--text-secondary); background: var(--surface-soft); border: 1px solid var(--border); border-radius: 9px; }
.force-mobile-layout .mobile-library-filter-options button[aria-pressed='true'] { color: var(--ci-on-primary); background: var(--primary); }
.force-mobile-layout .character-library-grid { grid-template-columns: 1fr; }
.force-mobile-layout .character-library-grid.image-card-view,
.force-mobile-layout .character-library-grid.image-card-view[class*='card-columns-'] { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.force-mobile-layout .image-card-view .character-library-card-copy { padding: 10px; }
.force-mobile-layout .image-card-view .character-library-card-copy strong { font-size: 15px; }
.force-mobile-layout .character-library-card { min-height: 82px; padding: 8px; grid-template-columns: 58px minmax(0, 1fr) auto; gap: 8px; }
.force-mobile-layout .character-cover-button { width: 58px; height: 64px; border-radius: 8px; }
.force-mobile-layout .image-card-view .character-library-card { padding: 0; grid-template-columns: 1fr; gap: 0; }
.force-mobile-layout .image-card-view .character-cover-button { width: 100%; height: auto; border-radius: 0; }
.force-mobile-layout .mobile-library-dock { position: absolute; z-index: 5; right: 0; bottom: 0; left: 0; display: grid; min-height: calc(76px + var(--ci-mobile-safe-bottom)); padding: 7px 7px calc(8px + var(--ci-mobile-safe-bottom)); grid-template-columns: 1fr 1fr 1.18fr 1fr 1fr; align-items: end; gap: 3px; background: var(--ci-header); border-top: 1px solid var(--border); }
.force-mobile-layout .mobile-library-back-to-top { display: grid; }
.force-mobile-layout .mobile-library-dock > button { display: grid; min-height: 50px; padding: 5px 2px; place-items: center; gap: 3px; color: var(--text-secondary); background: transparent; border: 0; border-radius: 11px; font-size: 11px; font-weight: 800; }
.force-mobile-layout .mobile-library-dock svg { width: 23px; height: 23px; fill: none; stroke: currentcolor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.force-mobile-layout .mobile-library-dock-home { color: var(--primary) !important; }
.force-mobile-layout .character-detail-layer { padding: 0; }
.force-mobile-layout .character-detail-dialog { width: 100%; height: 100%; min-width: 0; min-height: 0; max-width: none; max-height: none; box-sizing: border-box; border: 0; border-radius: 0; }
.force-mobile-layout:not(.embedded) .character-detail-header {
  padding: calc(14px + var(--ci-mobile-safe-top)) calc(14px + var(--ci-mobile-safe-right)) 14px calc(14px + var(--ci-mobile-safe-left));
}
.force-mobile-layout.embedded .character-detail-header { padding: 14px; }
.force-mobile-layout .character-detail-body { display: block; padding: 16px; overflow-y: auto; }
.force-mobile-layout .character-detail-gallery,
.force-mobile-layout .character-detail-content,
.force-mobile-layout .character-detail-metadata { padding: 16px; }
.force-mobile-layout .character-detail-metadata { position: static; margin: 16px 0; }
.force-mobile-layout .character-detail-gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.force-mobile-layout .character-detail-footer {
  padding: 14px calc(20px + var(--ci-mobile-safe-right)) calc(14px + var(--ci-mobile-safe-bottom)) calc(20px + var(--ci-mobile-safe-left));
  align-items: stretch;
  flex-direction: column-reverse;
}

.manager-root.embedded {
  position: relative;
  inset: auto;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
  background: transparent;
  backdrop-filter: none;
}

.manager-root.embedded .manager-dialog {
  width: 100%;
  height: 100%;
  max-height: none;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.manager-root.embedded .library-header {
  display: none;
}

.manager-root.embedded .header-title,
.manager-root.embedded .library-header > .character-source-switch,
.manager-root.embedded .library-header .close-button {
  display: none;
}

.manager-root.embedded .header-actions {
  grid-column: 2;
  grid-row: 1;
}

.mobile-library-dock-home {
  min-height: 66px !important;
  margin: -14px 3px 0;
  border: 1px solid rgb(var(--ci-primary-rgb) / 42%) !important;
  border-radius: 18px !important;
  background: radial-gradient(circle at 50% 18%, rgb(var(--ci-primary-rgb) / 18%), transparent 58%), var(--surface-raised) !important;
  box-shadow: 0 -8px 24px rgb(0 0 0 / 28%), inset 0 1px 0 rgb(255 255 255 / 6%);
  color: var(--primary) !important;
}

@media (max-width: 720px) {
  .manager-root.embedded .manager-dialog,
  .manager-root.embedded.force-mobile-layout .manager-dialog {
    height: 100%;
  }

  .manager-root.embedded .library-header,
  .manager-root.embedded.force-mobile-layout .library-header {
    display: none;
  }

  .manager-root.embedded .mobile-library-context .character-source-switch,
  .manager-root.embedded.force-mobile-layout .mobile-library-context .character-source-switch {
    display: none;
  }
}

.manager-root.embedded.force-mobile-layout .manager-dialog {
  height: 100%;
}

.manager-root.embedded.force-mobile-layout .library-header {
  display: none;
}

.manager-root.embedded.force-mobile-layout .mobile-library-context .character-source-switch {
  display: none;
}

.character-library-card-identity { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.character-library-author-field { display: contents; }
.character-library-accessible-label { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.image-card-view .character-library-card-identity { gap: 8px; }
.character-library-list-heading { position: sticky; z-index: 2; top: 0; display: grid; padding: 18px 16px; grid-template-columns: 56px minmax(0, 1fr) 40px; gap: 20px; border: 1px solid var(--border); border-radius: 10px 10px 0 0; background: var(--surface-raised); color: var(--text-muted); font-size: 12px; font-weight: 600; line-height: 18px; }
.character-library-grid.list-view { grid-template-columns: minmax(0, 1fr); gap: 0; overflow: hidden; border: 1px solid var(--border); border-top: 0; border-radius: 0 0 10px 10px; }
.list-view .character-library-card { min-height: 96px; padding: 12px 16px; align-items: start; grid-template-columns: 56px minmax(0, 1fr) 40px; gap: 20px; border: 0; border-bottom: 1px solid var(--border); border-radius: 0; background: var(--surface); }
.list-view .character-library-card:last-child { border-bottom: 0; }
.list-view .character-library-card:hover { background: var(--surface-raised); }
.list-view .character-cover-button { width: 56px; height: 72px; border-radius: 6px; }
.list-view .character-cover-silhouette { width: 34px; height: 42px; }
.list-view .character-library-card-copy { display: flex; gap: 8px; }
.list-view .character-library-card-identity { gap: 6px; }
.list-view .character-library-card-copy strong { font-size: 16px; line-height: 24px; }
.list-view .character-library-card-copy small { font-weight: 500; line-height: 1.5; }
.list-view .character-entry-toggle { position: relative; width: 40px; height: 24px; padding: 4px; align-self: start; }
.list-view .character-entry-toggle::before { position: absolute; inset: -10px -2px; content: ''; }
.list-view .character-entry-toggle span { width: 16px; height: 16px; }
.list-view .character-entry-toggle[aria-checked='false'] span { background: #c5cbd0; }
.list-view .character-entry-toggle[aria-checked='true'] span { transform: translateX(16px); }

@container character-list (max-width: 780px) {
  .character-library-list-heading { padding: 18px 12px; grid-template-columns: 56px minmax(0, 1fr) 40px; gap: 12px; }
  .list-view .character-library-card { padding: 12px; gap: 12px; }
  .list-view .character-library-card-copy small { display: -webkit-box; white-space: normal; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
}
</style>
