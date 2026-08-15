<template>
  <div class="manager-root library-mode" :class="{ 'force-mobile-layout': forceMobileLayout }">
    <main class="manager-dialog library-dialog" role="dialog" aria-modal="false" aria-labelledby="manager-title">
      <header class="dialog-header library-header">
        <div class="header-title">
          <svg class="library-title-icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 5.5 10.4 7v12L4 17.4V5.5Zm16 0L13.6 7v12l6.4-1.6V5.5ZM12 8.6v10.3" />
            <path d="M6.5 9.2 9 10m6.5 0 2.5-.8m-11.5 4 2.5.8m6.5 0 2.5-.8" />
          </svg>
          <h1 id="manager-title">世界书角色库</h1>
          <span class="phase-badge">{{ worldbookCharacters.length }}</span>
        </div>

        <div class="character-source-switch" role="group" aria-label="选择角色资料来源">
          <button type="button" aria-pressed="false" @click="emit('openCurrentChat')">当前聊天角色</button>
          <button type="button" class="active" aria-pressed="true">世界书角色</button>
        </div>

        <div class="library-header-worldbook">
          <label>
            <span>世界书</span>
            <select v-model="selectedWorldbookName" :disabled="loadingWorldbooks || worldbooks.length === 0">
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
          >
            ↻
          </button>
        </div>

        <div class="header-actions">
          <div class="manager-view-switch" role="group" aria-label="切换角色管理工具">
            <button type="button" class="active" aria-pressed="true">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 5h6v6H4V5Zm10 0h6v6h-6V5ZM4 15h6v4H4v-4Zm10 0h6v4h-6v-4Z" />
              </svg>
              <span>角色库</span>
            </button>
            <button type="button" aria-pressed="false" @click="emit('editLibrary', selectedWorldbookName)">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m4 16 9.8-9.8 4 4L8 20H4v-4Zm11.2-11.2 1.4-1.4a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2l-1.4 1.4-4-4Z" />
              </svg>
              <span>视觉编辑</span>
            </button>
          </div>
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
              <option v-for="worldbook in worldbooks" :key="worldbook" :value="worldbook">
                {{ worldbook }}{{ characterWorldbooks.includes(worldbook) ? '（当前角色）' : '' }}
              </option>
            </select>
          </label>
        </div>

        <div v-if="worldbookCharacters.length" class="character-library">
          <div class="character-library-toolbar">
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
                placeholder="搜索角色、条目名或种族"
                aria-label="搜索角色封面库"
              />
            </label>

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
            </div>

            <div class="character-library-control-row">
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

              <label class="character-race-filter">
                <span>种族</span>
                <select v-model="raceFilter">
                  <option value="all">全部种族</option>
                  <option v-for="race in availableRaces" :key="race" :value="race">{{ race }}</option>
                </select>
              </label>

              <div class="character-library-view-options">
                <div class="character-library-layout-switch" role="group" aria-label="选择角色库显示方式">
                  <button type="button" :aria-pressed="layout === 'list'" @click="layout = 'list'">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
                    </svg>
                    <span>紧凑列表</span>
                  </button>
                  <button type="button" :aria-pressed="layout === 'cards'" @click="layout = 'cards'">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <rect x="4" y="4" width="6" height="6" rx=".8" />
                      <rect x="14" y="4" width="6" height="6" rx=".8" />
                      <rect x="4" y="14" width="6" height="6" rx=".8" />
                      <rect x="14" y="14" width="6" height="6" rx=".8" />
                    </svg>
                    <span>图片卡片</span>
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

              <div class="character-library-summary">找到 {{ filteredCharacters.length }} 个角色</div>
            </div>
          </div>

          <div
            class="character-library-grid"
            :class="[
              { 'image-card-view': layout === 'cards' },
              cardColumns === 'auto' ? '' : `card-columns-${cardColumns}`,
            ]"
          >
            <article
              v-for="character in filteredCharacters"
              :key="character.entry.uid"
              class="character-library-card"
              :class="{
                disabled: !character.entry.enabled,
                encountered: character.encountered,
                unconfigured: !character.hasVisualProfile,
              }"
            >
              <button
                class="character-cover-button"
                type="button"
                :aria-label="`查看 ${characterName(character)}${coverUrl(character) ? '' : '（未配置图片）'}`"
                @click="openDetails(character)"
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
                :aria-label="`查看 ${characterName(character)}`"
                @click="openDetails(character)"
                @keydown.enter.prevent="openDetails(character)"
                @keydown.space.prevent="openDetails(character)"
              >
                <strong>{{ characterName(character) }}</strong>
                <small>{{ character.title.descriptionText || '资料待补全' }}</small>
                <span class="character-library-card-meta">
                  <i>{{ character.race || '种族未知' }}</i>
                  <i v-if="layout === 'cards'" class="entry-status">{{ character.entry.enabled ? '已启用' : '已禁用' }}</i>
                  <i v-if="character.encountered" class="encountered">已遇到</i>
                  <i v-if="!character.hasVisualProfile" class="visual-missing">未配置图片</i>
                </span>
              </div>

              <button
                class="character-entry-toggle"
                type="button"
                role="switch"
                :aria-checked="character.entry.enabled"
                :aria-label="`${character.entry.enabled ? '禁用' : '启用'} ${characterName(character)}`"
                :disabled="togglingUids.has(character.entry.uid)"
                @click="toggleCharacter(character)"
              >
                <span></span>
              </button>
            </article>
          </div>

          <p v-if="!filteredCharacters.length" class="character-library-no-results">当前筛选条件下没有角色。</p>
          <p v-if="toggleMessage" class="character-library-feedback" aria-live="polite">{{ toggleMessage }}</p>
        </div>

        <div v-else-if="selectedWorldbookName && !loadingEntries" class="character-library-empty library-page-empty">
          <strong>这个世界书暂时没有可显示的角色。</strong>
        </div>
        <p v-if="error" class="message error">{{ error }}</p>

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
          <div class="mobile-library-more">
            <button type="button" aria-label="更多角色库操作" :aria-expanded="mobileMoreOpen" @click="mobileMoreOpen = !mobileMoreOpen">
              <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
              <span>更多</span>
            </button>
            <div v-if="mobileMoreOpen" class="mobile-library-more-menu" role="menu">
              <button type="button" role="menuitem" @click="loadWorldbooks">重新读取角色库</button>
            </div>
          </div>
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
            <p>世界书：{{ selectedWorldbookName }} · 条目：{{ detailCharacter.entry.name }}</p>
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
                  <video
                    v-if="item.media?.kind === 'video'"
                    :src="item.media.url"
                    controls
                    muted
                    loop
                    playsinline
                    preload="metadata"
                    @error="advanceDetailMedia(item.sourceIndex)"
                  ></video>
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
          <button class="primary-button" type="button" @click="emit('edit', selectedWorldbookName, detailCharacter.entry.uid)">
            编辑视觉资料
          </button>
        </footer>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

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
  type CharacterVisualProfile,
  type GalleryImage,
} from '../char_info_shared/characterVisualProfile';
import { findGalleryPackEntry } from '../char_info_shared/galleryPack';
import { buildWorldbookList } from '../char_info_shared/worldbookList';
import { normalizePortraitMediaUrlForBrowser } from '../char_info_viewer/services/imageUrl';

type LibraryCharacter = WorldbookCharacterEntry<WorldbookEntry, CharacterVisualProfile> & {
  encountered: boolean;
  race: string;
};
type Filter = 'all' | 'encountered' | 'enabled' | 'disabled';
type Media = NonNullable<ReturnType<typeof normalizePortraitMediaUrlForBrowser>>;

withDefaults(defineProps<{ forceMobileLayout?: boolean }>(), {
  forceMobileLayout: false,
});
const emit = defineEmits<{
  close: [];
  openCurrentChat: [];
  editLibrary: [worldbookName: string];
  edit: [worldbookName: string, entryUid: number];
}>();

const worldbooks = ref<string[]>([]);
const characterWorldbooks = ref<string[]>([]);
const entries = ref<WorldbookEntry[]>([]);
const selectedWorldbookName = ref('');
const loadingWorldbooks = ref(false);
const loadingEntries = ref(false);
const error = ref('');
const toggleMessage = ref('');
const searchText = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const filter = ref<Filter>('all');
const raceFilter = ref('all');
const layout = ref<'list' | 'cards'>('list');
const cardColumns = ref<'auto' | number>('auto');
const cardColumnOptions = [2, 3, 4, 5, 6];
const mobileFilterOpen = ref(false);
const mobileMoreOpen = ref(false);
const encounteredCharacters = ref<EncounteredCharacterRecord[]>([]);
const togglingUids = reactive(new Set<number>());
const coverIndexes = reactive<Record<number, number>>({});
const detailUid = ref<number | null>(null);
const detailGalleryIndexes = reactive<Record<string, number>>({});
const detailExtensionGallery = reactive<Record<number, GalleryImage[]>>({});
let entriesLoadRevision = 0;

const worldbookCharacters = computed<LibraryCharacter[]>(() => {
  const encountered = new Map(encounteredCharacters.value.map(character => [character.name, character]));
  return collectWorldbookCharacterEntries(
    entries.value,
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
    return {
      ...character,
      encountered: !!match,
      race: match?.race || inferCharacterRace(body, character.profile.characterName) || character.title.raceText || '',
    };
  });
});

const filteredCharacters = computed(() => {
  const query = searchText.value.toLocaleLowerCase();
  return worldbookCharacters.value.filter(character => {
    if (filter.value === 'encountered' && !character.encountered) return false;
    if (filter.value === 'enabled' && !character.entry.enabled) return false;
    if (filter.value === 'disabled' && character.entry.enabled) return false;
    if (raceFilter.value !== 'all' && character.race !== raceFilter.value) return false;
    if (!query) return true;
    return [characterName(character), character.entry.name, character.race].some(value =>
      value.toLocaleLowerCase().includes(query),
    );
  });
});
const availableRaces = computed(() =>
  Array.from(new Set(worldbookCharacters.value.map(character => character.race).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, 'zh-CN'),
  ),
);
const detailCharacter = computed(() => worldbookCharacters.value.find(character => character.entry.uid === detailUid.value) ?? null);
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
  return character ? [...character.profile.gallery, ...(detailExtensionGallery[character.entry.uid] ?? [])] : [];
});
const detailGalleryItems = computed(() =>
  detailGallery.value.flatMap((image, index) => {
    const sources = mediaSources(image);
    if (!sources.length) return [];
    return [
      {
        title: image.title,
        sourceIndex: index,
        media: sources[detailGalleryIndexes[`${detailUid.value}:${index}`] ?? 0] ?? null,
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

function characterName(character: LibraryCharacter): string {
  return character.profile.characterName || character.title.displayName || character.entry.name;
}

function imageSources(character: LibraryCharacter): string[] {
  return [character.profile.avatarUrl, ...(character.profile.gallery[0]?.sources ?? [])].flatMap(value => {
    const media = normalizePortraitMediaUrlForBrowser(value);
    return media?.kind === 'image' ? [media.url] : [];
  });
}

function coverUrl(character: LibraryCharacter): string {
  return imageSources(character)[coverIndexes[character.entry.uid] ?? 0] ?? '';
}

function advanceCover(character: LibraryCharacter) {
  coverIndexes[character.entry.uid] = (coverIndexes[character.entry.uid] ?? 0) + 1;
}

function mediaSources(image: GalleryImage): Media[] {
  return image.sources.flatMap(value => {
    const media = normalizePortraitMediaUrlForBrowser(value);
    return media ? [media] : [];
  });
}

function advanceDetailMedia(index: number) {
  const key = `${detailUid.value}:${index}`;
  detailGalleryIndexes[key] = (detailGalleryIndexes[key] ?? 0) + 1;
}

function focusSearch() {
  searchInput.value?.focus();
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
  loadingWorldbooks.value = true;
  error.value = '';
  try {
    if (!getCurrentCharacterName()) throw new Error('请先在 SillyTavern 打开一张角色卡。');
    const binding = getCharWorldbookNames('current');
    characterWorldbooks.value = buildWorldbookList([binding.primary, ...binding.additional], []);
    worldbooks.value = buildWorldbookList(characterWorldbooks.value, getWorldbookNames());
    if (!worldbooks.value.length) throw new Error('酒馆中没有可用的世界书。');
    if (!worldbooks.value.includes(selectedWorldbookName.value)) selectedWorldbookName.value = worldbooks.value[0];
    await loadEntries(selectedWorldbookName.value);
    void loadEncounteredCharacters();
  } catch (caught) {
    entries.value = [];
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    loadingWorldbooks.value = false;
  }
}

async function loadEntries(worldbookName: string) {
  const revision = ++entriesLoadRevision;
  detailUid.value = null;
  toggleMessage.value = '';
  if (!worldbookName) {
    entries.value = [];
    return;
  }
  loadingEntries.value = true;
  try {
    const loaded = await getWorldbook(worldbookName);
    if (revision === entriesLoadRevision && selectedWorldbookName.value === worldbookName) entries.value = loaded;
  } catch (caught) {
    if (revision === entriesLoadRevision) {
      entries.value = [];
      error.value = `无法读取世界书：${caught instanceof Error ? caught.message : String(caught)}`;
    }
  } finally {
    if (revision === entriesLoadRevision) loadingEntries.value = false;
  }
}

async function toggleCharacter(character: LibraryCharacter) {
  const uid = character.entry.uid;
  if (togglingUids.has(uid)) return;
  const enabled = !character.entry.enabled;
  togglingUids.add(uid);
  try {
    const updated = await updateWorldbookWith(
      selectedWorldbookName.value,
      latest => setCharacterEntryEnabled(latest, uid, enabled),
      { render: 'immediate' },
    );
    const saved = updated.find(entry => entry.uid === uid);
    if (!saved || saved.enabled !== enabled) throw new Error('条目开关后的读回验证失败。');
    entries.value = updated;
    toggleMessage.value = `${characterName(character)} 已${enabled ? '启用' : '禁用'}。`;
  } catch (caught) {
    toggleMessage.value = `切换失败：${caught instanceof Error ? caught.message : String(caught)}`;
  } finally {
    togglingUids.delete(uid);
  }
}

function openDetails(character: LibraryCharacter) {
  detailUid.value = character.entry.uid;
  Object.keys(detailGalleryIndexes).forEach(key => delete detailGalleryIndexes[key]);
  delete detailExtensionGallery[character.entry.uid];
  const reference = character.profile.galleryExtension;
  if (!reference) return;
  void getWorldbook(reference.worldbookName).then(galleryEntries => {
    if (detailUid.value !== character.entry.uid) return;
    const payload = findGalleryPackEntry(galleryEntries, reference)?.payload;
    if (payload) detailExtensionGallery[character.entry.uid] = payload.gallery;
  });
}

function closeDetails() {
  detailUid.value = null;
}

watch(selectedWorldbookName, worldbookName => {
  searchText.value = '';
  filter.value = 'all';
  raceFilter.value = 'all';
  mobileFilterOpen.value = false;
  mobileMoreOpen.value = false;
  void loadEntries(worldbookName);
});
onMounted(() => void loadWorldbooks());
</script>

<style scoped>
.manager-root,
.manager-root * { box-sizing: border-box; }
.manager-root {
  --bg: #0b0e13; --surface: #131720; --surface-raised: #1a202b; --surface-soft: #202735;
  --border: #30394a; --border-strong: #445169; --text: #f4f7fb; --text-secondary: #b8c1d0;
  --text-muted: #7f8ba0; --primary: #77d6c7; --primary-strong: #4fb8a8; --primary-soft: rgb(119 214 199 / 12%);
  --success: #78d59c;
  position: fixed; z-index: 2147482900; inset: 0; display: grid; width: 100%; height: 100%; padding: 24px;
  overflow: auto; place-items: center; color: var(--text); background: rgb(3 5 8 / 78%); backdrop-filter: blur(9px);
  pointer-events: auto;
  font-family: Inter, "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif;
}
button, input, select { color: inherit; font: inherit; }
button { cursor: pointer; }
select { color: var(--text); background: #0d121a; border: 1px solid var(--border); border-radius: 8px; }
.manager-dialog {
  position: relative; display: flex; width: min(1420px, 100%); height: calc(100% - 8px); max-height: calc(100% - 8px); min-height: 0;
  overflow: hidden; flex-direction: column; background: radial-gradient(circle at 0 0, rgb(119 214 199 / 8%), transparent 28rem), var(--bg);
  border: 1px solid var(--border-strong); border-radius: 20px; box-shadow: 0 28px 90px rgb(0 0 0 / 55%);
}
.dialog-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 24px; padding: 22px 26px; background: rgb(19 23 32 / 94%); border-bottom: 1px solid var(--border); }
.library-header { display: grid; min-height: 84px; padding: 12px 28px; grid-template-columns: minmax(250px, 1fr) minmax(320px, 430px) minmax(290px, 1fr); gap: 26px; }
.header-title { display: flex; min-width: 0; align-items: center; gap: 10px; }
.header-title h1 { margin: 0; font-size: clamp(22px, 3vw, 31px); }
.library-title-icon { width: 31px; height: 31px; flex: 0 0 auto; fill: none; stroke: var(--primary); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.phase-badge { padding: 5px 8px; color: var(--primary); background: var(--primary-soft); border: 1px solid rgb(119 214 199 / 25%); border-radius: 999px; font-size: 11px; font-weight: 800; }
.character-source-switch { display: grid; padding: 3px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; background: rgb(8 11 16 / 72%); border: 1px solid var(--border); border-radius: 10px; }
.character-source-switch button { min-height: 34px; padding: 6px 8px; color: var(--text-muted); background: transparent; border: 1px solid transparent; border-radius: 7px; font-size: 11px; font-weight: 800; }
.character-source-switch button:hover, .character-source-switch button.active { color: var(--primary); background: var(--primary-soft); border-color: rgb(119 214 199 / 34%); }
.library-header .character-source-switch { grid-column: 1 / -1; grid-row: 2; }
.library-header-worldbook { display: flex; min-width: 0; grid-column: 2; grid-row: 1; align-items: flex-end; gap: 8px; }
.library-header-worldbook label { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; }
.library-header-worldbook label > span { color: var(--text-muted); font-size: 10px; font-weight: 800; }
.library-header-worldbook select { width: 100%; min-height: 40px; padding: 7px 10px; font-size: 13px; font-weight: 700; }
.header-actions { display: flex; grid-column: 3; grid-row: 1; align-items: center; justify-content: flex-end; gap: 10px; }
.manager-view-switch { display: flex; padding: 3px; gap: 3px; background: rgb(8 11 16 / 72%); border: 1px solid var(--border); border-radius: 12px; }
.manager-view-switch button { display: inline-flex; min-width: 112px; min-height: 40px; padding: 6px 10px; align-items: center; justify-content: center; gap: 6px; color: var(--text-muted); background: transparent; border: 0; border-radius: 9px; font-size: 12px; font-weight: 800; }
.manager-view-switch button:hover, .manager-view-switch button.active { color: var(--text); background: var(--primary-soft); }
.manager-view-switch button.active { box-shadow: inset 0 0 0 1px rgb(119 214 199 / 34%); }
.manager-view-switch svg { width: 16px; height: 16px; fill: currentcolor; }
.close-button, .icon-button { display: grid; width: 42px; height: 42px; padding: 0; place-items: center; background: var(--surface-soft); border: 1px solid var(--border); border-radius: 10px; }
.close-button { font-size: 25px; line-height: 1; }
.library-page { min-height: 0; padding: 12px 22px 28px; overflow-y: auto; overscroll-behavior: contain; scrollbar-color: rgb(74 90 112 / 88%) rgb(10 15 23 / 76%); scrollbar-width: thin; }
.mobile-library-context, .mobile-library-filter-panel, .mobile-library-dock { display: none; }
.character-library-toolbar { position: sticky; z-index: 2; top: 0; display: flex; margin: -12px 0 18px; padding: 12px 0 18px; flex-direction: column; gap: 18px; background: var(--bg); }
.library-search-field { display: flex; min-height: 48px; padding: 0 13px; align-items: center; gap: 10px; background: linear-gradient(90deg, rgb(23 33 49 / 96%), rgb(20 28 42 / 92%)); border: 1px solid var(--border-strong); border-radius: 10px; }
.library-search-field:focus-within { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-soft); }
.library-search-field svg { width: 21px; height: 21px; flex: 0 0 auto; fill: none; stroke: var(--text-muted); stroke-linecap: round; stroke-width: 1.8; }
.library-search-field input { width: 100%; min-width: 0; min-height: 44px; padding: 0; color: var(--text); background: transparent; border: 0; outline: 0; font-size: 14px; }
.character-library-control-row { display: grid; align-items: center; grid-template-columns: minmax(360px, 1fr) minmax(220px, 290px) auto minmax(132px, auto); gap: 18px; }
.character-library-filter-buttons { display: flex; min-width: 0; padding: 6px 10px; align-items: center; gap: 8px; background: rgb(18 28 43 / 70%); border: 1px solid rgb(40 57 81 / 58%); border-radius: 8px; }
.character-library-control-label { color: var(--text-muted); font-size: 12px; white-space: nowrap; }
.character-library-filter-buttons button { min-height: 32px; padding: 6px 15px; color: var(--text-secondary); background: transparent; border: 1px solid transparent; border-radius: 7px; font-size: 12px; }
.character-library-filter-buttons button[aria-pressed='true'] { color: #071310; background: var(--primary); border-color: var(--primary); font-weight: 800; }
.character-race-filter { display: flex; min-width: 0; align-items: center; gap: 7px; color: var(--text-muted); font-size: 12px; }
.character-race-filter select { width: 100%; min-height: 40px; padding: 7px 12px; font-size: 12px; }
.character-library-view-options { display: flex; align-items: center; gap: 8px; }
.character-library-layout-switch { display: flex; padding: 4px; gap: 2px; background: rgb(18 28 43 / 72%); border: 1px solid rgb(40 57 81 / 58%); border-radius: 8px; }
.character-library-layout-switch button { display: inline-flex; min-height: 34px; padding: 7px 13px; align-items: center; justify-content: center; gap: 6px; color: var(--text-secondary); background: transparent; border: 1px solid transparent; border-radius: 6px; font-size: 12px; }
.character-library-layout-switch svg { width: 16px; height: 16px; fill: none; stroke: currentcolor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.character-library-layout-switch button[aria-pressed='true'] { color: var(--primary); background: rgb(27 61 65 / 62%); border-color: rgb(65 207 198 / 58%); font-weight: 800; }
.character-card-columns { display: flex; align-items: center; gap: 7px; color: var(--text-muted); font-size: 10px; }
.character-card-columns select { min-height: 34px; padding: 6px 9px; font-size: 10px; }
.character-library-summary { display: flex; justify-content: flex-end; color: var(--text-muted); font-size: 13px; font-weight: 700; white-space: nowrap; }
.character-library-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.character-library-card { display: grid; min-width: 0; min-height: 104px; padding: 10px; align-items: center; grid-template-columns: 74px minmax(0, 1fr) auto; gap: 10px; background: linear-gradient(145deg, rgb(22 34 50 / 96%), rgb(18 28 43 / 96%)); border: 1px solid rgb(42 59 83 / 80%); border-radius: 8px; transition: border-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease; }
.character-library-card.encountered { border-color: rgb(65 207 198 / 38%); }
.character-library-card.disabled { opacity: .62; }
.character-cover-button { display: grid; width: 74px; height: 82px; padding: 0; overflow: hidden; place-items: center; color: var(--text-muted); background: linear-gradient(145deg, #26364b, #1b283a); border: 0; border-radius: 8px; }
.character-cover-button img { width: 100%; height: 100%; object-fit: cover; }
.character-cover-placeholder { display: grid; width: 100%; height: 100%; padding: 6px; place-items: center; align-content: center; gap: 2px; color: #abb5c3; background: linear-gradient(145deg, #2a3a4f, #1d2b3d); }
.character-cover-silhouette { width: 51px; height: 61px; fill: #b7c0cc; filter: drop-shadow(0 5px 7px rgb(0 0 0 / 24%)); }
.character-library-card-copy { display: flex; min-width: 0; flex-direction: column; gap: 5px; cursor: pointer; }
.character-library-card-copy:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; border-radius: 5px; }
.character-library-card-copy strong, .character-library-card-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.character-library-card-copy strong { color: #e4eaf1; font-size: 14px; font-weight: 800; }
.character-library-card-copy small { color: var(--text-muted); font-size: 10px; }
.character-library-card-meta { display: flex; min-width: 0; flex-wrap: wrap; gap: 4px; }
.character-library-card-meta i { padding: 2px 5px; overflow: hidden; color: var(--text-muted); background: rgb(11 19 31 / 52%); border-radius: 5px; font-size: 9px; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
.character-library-card-meta i.encountered { color: var(--success); background: rgb(120 213 156 / 10%); }
.character-entry-toggle { position: relative; width: 38px; height: 22px; padding: 2px; background: #313846; border: 1px solid var(--border-strong); border-radius: 999px; }
.character-entry-toggle span { display: block; width: 16px; height: 16px; background: var(--text-secondary); border-radius: 50%; transition: transform 160ms ease; }
.character-entry-toggle[aria-checked='true'] { background: var(--primary-strong); border-color: var(--primary); }
.character-entry-toggle[aria-checked='true'] span { background: #f4fffd; transform: translateX(16px); }
.character-library-no-results, .character-library-empty, .message { margin: 12px 0 0; padding: 14px; color: var(--text-muted); text-align: center; background: var(--surface-raised); border-radius: 9px; font-size: 11px; }
.message.error { color: #ff8491; }
.character-library-grid.image-card-view { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.character-library-grid.image-card-view.card-columns-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.character-library-grid.image-card-view.card-columns-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.character-library-grid.image-card-view.card-columns-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.character-library-grid.image-card-view.card-columns-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.character-library-grid.image-card-view.card-columns-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.image-card-view .character-library-card { position: relative; display: grid; padding: 0; align-items: stretch; grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); gap: 0; overflow: hidden; }
.image-card-view .character-cover-button { width: 100%; height: auto; aspect-ratio: 4 / 5; border-radius: 0; }
.image-card-view .character-library-card-copy { padding: 10px 11px 12px; }
.image-card-view .character-entry-toggle { position: absolute; z-index: 1; top: 9px; right: 9px; background: rgb(15 23 42 / 88%); }
.character-detail-layer { position: fixed; z-index: 3; inset: 0; display: grid; padding: 24px; overflow: auto; place-items: center; background: rgb(3 5 8 / 86%); backdrop-filter: blur(12px); }
.character-detail-dialog { display: flex; width: min(1240px, 100%); max-height: min(900px, calc(100vh - 48px)); min-height: 0; overflow: hidden; flex-direction: column; background: radial-gradient(circle at 0 0, rgb(119 214 199 / 9%), transparent 30rem), var(--bg); border: 1px solid var(--border-strong); border-radius: 18px; box-shadow: 0 30px 90px rgb(0 0 0 / 62%); }
.character-detail-header { display: flex; padding: 20px 24px; align-items: flex-start; justify-content: space-between; gap: 20px; background: rgb(19 23 32 / 96%); border-bottom: 1px solid var(--border); }
.character-detail-header h2, .character-detail-header p { margin: 0; }
.character-detail-header h2 { margin-top: 7px; font-size: clamp(24px, 3.5vw, 36px); }
.character-detail-header p { margin-top: 6px; color: var(--text-muted); font-size: 11px; }
.character-detail-status { display: inline-flex; padding: 4px 8px; color: var(--success); background: rgb(120 213 156 / 10%); border: 1px solid rgb(120 213 156 / 25%); border-radius: 999px; font-size: 10px; font-weight: 800; }
.character-detail-status.disabled { color: var(--text-muted); }
.character-detail-body { display: grid; min-height: 0; overflow: hidden; grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr); }
.character-detail-gallery, .character-detail-content { min-height: 0; padding: 20px; overflow-y: auto; }
.character-detail-content { background: rgb(19 23 32 / 70%); border-left: 1px solid var(--border); }
.character-detail-section-heading { display: flex; margin-bottom: 14px; align-items: flex-end; justify-content: space-between; gap: 16px; }
.character-detail-section-heading span { color: var(--primary); font-size: 9px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.character-detail-section-heading h3 { margin: 3px 0 0; font-size: 18px; }
.character-detail-section-heading b { color: var(--text-muted); font-size: 10px; }
.character-detail-gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.character-detail-gallery-grid figure { min-width: 0; margin: 0; overflow: hidden; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; }
.character-detail-media { display: grid; aspect-ratio: 3 / 4; overflow: hidden; place-items: center; color: var(--text-muted); background: var(--surface-soft); font-size: 11px; }
.character-detail-media img, .character-detail-media video { width: 100%; height: 100%; object-fit: cover; }
.character-detail-gallery-grid figcaption { padding: 9px 10px; }
.character-detail-gallery-empty { padding: 18px; color: var(--text-muted); text-align: center; background: var(--surface-raised); border: 1px dashed var(--border); border-radius: 10px; }
.character-detail-content-note { margin: 0 0 12px; color: var(--text-muted); font-size: 10px; }
.character-detail-content pre { min-height: 260px; margin: 0; padding: 15px; overflow: auto; color: var(--text-secondary); white-space: pre-wrap; overflow-wrap: anywhere; background: #0b0e13; border: 1px solid var(--border); border-radius: 11px; font: 11px/1.65 "Cascadia Code", Consolas, monospace; }
.character-detail-footer { display: flex; padding: 14px 20px; align-items: center; justify-content: flex-end; gap: 10px; background: rgb(19 23 32 / 96%); border-top: 1px solid var(--border); }
.primary-button, .secondary-button { min-height: 40px; padding: 8px 14px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface-soft); }
.primary-button { color: #071310; background: var(--primary); border-color: var(--primary); font-weight: 800; }

@media (max-width: 900px) {
  .manager-root { padding: 10px; }
  .manager-dialog { height: calc(100% - 2px); }
  .library-header { grid-template-columns: minmax(170px, 1fr) minmax(230px, 330px) auto; gap: 14px; }
  .manager-view-switch button { min-width: auto; }
  .character-library-control-row { grid-template-columns: minmax(300px, 1fr) minmax(190px, 240px) auto; gap: 12px; }
  .character-library-summary { grid-column: 1 / -1; }
  .character-library-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .phase-badge { display: none; }
}

@media (max-width: 620px) {
  .manager-root, .manager-root.force-mobile-layout { padding: 0; overflow: hidden; }
  .manager-dialog, .force-mobile-layout .manager-dialog { width: 100%; height: 100dvh; max-height: none; border: 0; border-radius: 0; box-shadow: none; }
  .library-header, .force-mobile-layout .library-header { min-height: 0; padding: calc(env(safe-area-inset-top) + 14px) 16px 13px; }
  .library-header .library-title-icon, .library-header > .character-source-switch, .library-header > .library-header-worldbook, .library-header > .header-actions { display: none; }
  .library-header .header-title { width: 100%; }
  .library-header h1 { font-size: 21px; }
  .library-page { padding: 12px 16px calc(104px + env(safe-area-inset-bottom)); }
  .mobile-library-context { display: grid; margin-bottom: 12px; gap: 10px; }
  .mobile-library-context .character-source-switch { width: 100%; }
  .mobile-library-context .character-source-switch button { min-height: 46px; font-size: 13px; }
  .mobile-library-worldbook { display: grid; gap: 5px; }
  .mobile-library-worldbook > span { color: var(--text-muted); font-size: 11px; font-weight: 800; }
  .mobile-library-worldbook select { min-height: 46px; padding: 8px; font-weight: 700; }
  .character-library-control-row { display: none; }
  .mobile-library-filter-panel { display: grid; margin-top: 10px; padding: 12px; gap: 10px; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; }
  .mobile-library-filter-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .mobile-library-filter-options button { min-height: 44px; color: var(--text-secondary); background: var(--surface-soft); border: 1px solid var(--border); border-radius: 9px; }
  .mobile-library-filter-options button[aria-pressed='true'] { color: #071310; background: var(--primary); }
  .character-library-grid { grid-template-columns: 1fr; }
  .character-library-grid.image-card-view, .character-library-grid.image-card-view[class*='card-columns-'] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .character-library-card { min-height: 82px; padding: 8px; grid-template-columns: 58px minmax(0, 1fr) auto; gap: 8px; }
  .character-cover-button { width: 58px; height: 64px; border-radius: 8px; }
  .mobile-library-dock { position: fixed; z-index: 5; right: 0; bottom: 0; left: 0; display: grid; min-height: calc(76px + env(safe-area-inset-bottom)); padding: 8px 10px calc(8px + env(safe-area-inset-bottom)); grid-template-columns: repeat(5, 1fr); align-items: end; gap: 6px; background: rgb(14 18 25 / 96%); border-top: 1px solid var(--border); }
  .mobile-library-dock > button, .mobile-library-more > button { display: grid; min-height: 50px; padding: 5px 2px; place-items: center; gap: 3px; color: var(--text-secondary); background: transparent; border: 0; border-radius: 11px; font-size: 11px; font-weight: 800; }
  .mobile-library-dock svg { width: 23px; height: 23px; fill: none; stroke: currentcolor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
  .mobile-library-dock-home { color: var(--primary) !important; }
  .mobile-library-more { position: relative; }
  .mobile-library-more > button { width: 100%; }
  .mobile-library-more-menu { position: absolute; right: 0; bottom: calc(100% + 10px); display: grid; min-width: 156px; padding: 6px; background: var(--surface-raised); border: 1px solid var(--border-strong); border-radius: 12px; }
  .mobile-library-more-menu button { min-height: 44px; color: var(--text-secondary); background: transparent; border: 0; }
  .character-detail-layer { padding: 0; }
  .character-detail-dialog { width: 100%; height: 100%; max-height: 100%; border: 0; border-radius: 0; }
  .character-detail-header { padding: 14px; }
  .character-detail-body { display: block; overflow-y: auto; }
  .character-detail-gallery, .character-detail-content { padding: 15px; overflow: visible; }
  .character-detail-content { border-top: 1px solid var(--border); border-left: 0; }
  .character-detail-gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .character-detail-footer { align-items: stretch; flex-direction: column-reverse; }
}

.manager-root.force-mobile-layout { padding: 0; overflow: hidden; }
.force-mobile-layout .manager-dialog { width: 100%; height: 100dvh; max-height: none; border: 0; border-radius: 0; box-shadow: none; }
.force-mobile-layout .library-header { min-height: 0; padding: calc(env(safe-area-inset-top) + 14px) 16px 13px; }
.force-mobile-layout .library-header .library-title-icon,
.force-mobile-layout .library-header > .character-source-switch,
.force-mobile-layout .library-header > .library-header-worldbook,
.force-mobile-layout .library-header > .header-actions { display: none; }
.force-mobile-layout .library-header .header-title { width: 100%; }
.force-mobile-layout .library-header h1 { font-size: 21px; }
.force-mobile-layout .library-page { padding: 12px 16px calc(104px + env(safe-area-inset-bottom)); }
.force-mobile-layout .mobile-library-context { display: grid; margin-bottom: 12px; gap: 10px; }
.force-mobile-layout .mobile-library-context .character-source-switch { width: 100%; }
.force-mobile-layout .mobile-library-context .character-source-switch button { min-height: 46px; font-size: 13px; }
.force-mobile-layout .mobile-library-worldbook { display: grid; gap: 5px; }
.force-mobile-layout .mobile-library-worldbook > span { color: var(--text-muted); font-size: 11px; font-weight: 800; }
.force-mobile-layout .mobile-library-worldbook select { min-height: 46px; padding: 8px; font-weight: 700; }
.force-mobile-layout .character-library-control-row { display: none; }
.force-mobile-layout .mobile-library-filter-panel { display: grid; margin-top: 10px; padding: 12px; gap: 10px; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 12px; }
.force-mobile-layout .mobile-library-filter-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.force-mobile-layout .mobile-library-filter-options button { min-height: 44px; color: var(--text-secondary); background: var(--surface-soft); border: 1px solid var(--border); border-radius: 9px; }
.force-mobile-layout .mobile-library-filter-options button[aria-pressed='true'] { color: #071310; background: var(--primary); }
.force-mobile-layout .character-library-grid { grid-template-columns: 1fr; }
.force-mobile-layout .character-library-grid.image-card-view,
.force-mobile-layout .character-library-grid.image-card-view[class*='card-columns-'] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.force-mobile-layout .character-library-card { min-height: 82px; padding: 8px; grid-template-columns: 58px minmax(0, 1fr) auto; gap: 8px; }
.force-mobile-layout .character-cover-button { width: 58px; height: 64px; border-radius: 8px; }
.force-mobile-layout .mobile-library-dock { position: fixed; z-index: 5; right: 0; bottom: 0; left: 0; display: grid; min-height: calc(76px + env(safe-area-inset-bottom)); padding: 8px 10px calc(8px + env(safe-area-inset-bottom)); grid-template-columns: repeat(5, 1fr); align-items: end; gap: 6px; background: rgb(14 18 25 / 96%); border-top: 1px solid var(--border); }
.force-mobile-layout .mobile-library-dock > button,
.force-mobile-layout .mobile-library-more > button { display: grid; min-height: 50px; padding: 5px 2px; place-items: center; gap: 3px; color: var(--text-secondary); background: transparent; border: 0; border-radius: 11px; font-size: 11px; font-weight: 800; }
.force-mobile-layout .mobile-library-dock svg { width: 23px; height: 23px; fill: none; stroke: currentcolor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.force-mobile-layout .mobile-library-dock-home { color: var(--primary) !important; }
.force-mobile-layout .mobile-library-more { position: relative; }
.force-mobile-layout .mobile-library-more > button { width: 100%; }
.force-mobile-layout .mobile-library-more-menu { position: absolute; right: 0; bottom: calc(100% + 10px); display: grid; min-width: 156px; padding: 6px; background: var(--surface-raised); border: 1px solid var(--border-strong); border-radius: 12px; }
.force-mobile-layout .mobile-library-more-menu button { min-height: 44px; color: var(--text-secondary); background: transparent; border: 0; }
.force-mobile-layout .character-detail-layer { padding: 0; }
.force-mobile-layout .character-detail-dialog { width: 100%; height: 100%; max-height: 100%; border: 0; border-radius: 0; }
.force-mobile-layout .character-detail-header { padding: 14px; }
.force-mobile-layout .character-detail-body { display: block; overflow-y: auto; }
.force-mobile-layout .character-detail-gallery,
.force-mobile-layout .character-detail-content { padding: 15px; overflow: visible; }
.force-mobile-layout .character-detail-content { border-top: 1px solid var(--border); border-left: 0; }
.force-mobile-layout .character-detail-gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.force-mobile-layout .character-detail-footer { align-items: stretch; flex-direction: column-reverse; }
</style>
