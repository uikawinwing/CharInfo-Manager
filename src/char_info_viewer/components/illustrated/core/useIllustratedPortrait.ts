import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { normalizePortraitMediaUrlForBrowser } from '../../../services/imageUrl';
import { preloadPortraitImages } from '../../../services/imagePreload';
import { createMediaSourceTimeout, nextMediaSourceIndex } from '../../../services/mediaSourceFallback';
import type { CharacterViewModel } from '../../../services/characterViewModel';

/**
 * 立绘行为核心：索引切换、图床 fallback、loading / failed / timeout、预载与重试。
 *
 * 本模块不持有任何视觉决策：不做 object-fit、不决定面板宽度、不设置背景模糊、
 * 不摆放翻页按钮。默认外观由 `default/IllustratedPortraitPane.vue` 负责。
 */
export type IllustratedPortraitController = ReturnType<typeof useIllustratedPortrait>;

export function useIllustratedPortrait(options: {
  vm: () => CharacterViewModel;
  debugEnabled: () => boolean;
}) {
  const { vm: readVm, debugEnabled: readDebugEnabled } = options;

  const portraitLoadFailed = ref(false);
  const portraitLoaded = ref(false);
  const portraitRetryAttempt = ref(0);

  function resolveInitialPortraitIndex(): number {
    if (readVm().randomizeInitialImage && readVm().imageUrls.length > 1) {
      return Math.floor(Math.random() * readVm().imageUrls.length);
    }
    return 0;
  }

  const activePortraitIndex = ref(resolveInitialPortraitIndex());
  const activePortraitSourceIndex = ref(0);

  const activePortraitSources = computed(
    () =>
      readVm().imageSourceGroups[activePortraitIndex.value] ??
      [readVm().imageUrls[activePortraitIndex.value] ?? readVm().imageUrl].filter(Boolean),
  );
  const activePortraitUrl = computed(() => activePortraitSources.value[activePortraitSourceIndex.value] ?? '');

  const portraitWarmUrls = computed(() => {
    const count = Math.max(readVm().imageSourceGroups.length, readVm().imageUrls.length);
    if (count === 0) return [];

    const indices = [activePortraitIndex.value];
    if (count > 1) {
      indices.push((activePortraitIndex.value - 1 + count) % count, (activePortraitIndex.value + 1) % count);
    }

    return indices
      .map(index => readVm().imageSourceGroups[index]?.[0] ?? readVm().imageUrls[index] ?? '')
      .filter((url, index, urls) => Boolean(url) && urls.indexOf(url) === index);
  });

  watch(
    portraitWarmUrls,
    urls => {
      void preloadPortraitImages(urls);
    },
    { immediate: true },
  );

  function debugPortraitFallback(event: string, details: Record<string, unknown> = {}): void {
    if (!readDebugEnabled()) return;
    console.info('[CharInfo][ImageFallback][Viewer]', {
      event,
      character: readVm().nameText,
      portraitIndex: activePortraitIndex.value,
      sourceIndex: activePortraitSourceIndex.value,
      url: activePortraitUrl.value,
      ...details,
    });
  }

  const hasMultiplePortraits = computed(
    () => readVm().imageSourceGroups.length > 1 || readVm().imageUrls.length > 1,
  );
  const isVideoPortrait = computed(
    () => normalizePortraitMediaUrlForBrowser(activePortraitUrl.value)?.kind === 'video',
  );
  const portraitMediaUrl = computed(() => {
    if (portraitRetryAttempt.value === 0) return activePortraitUrl.value;

    try {
      const url = new URL(activePortraitUrl.value, window.location.href);
      url.searchParams.set('_char_info_retry', String(portraitRetryAttempt.value));
      return url.href;
    } catch (_) {
      const separator = activePortraitUrl.value.includes('?') ? '&' : '?';
      return `${activePortraitUrl.value}${separator}_char_info_retry=${portraitRetryAttempt.value}`;
    }
  });

  const portraitLoadTimeout = createMediaSourceTimeout(() => {
    debugPortraitFallback('timeout');
    advancePortraitSource('timeout');
  });

  function retryPortraitLoad(): void {
    portraitLoadFailed.value = false;
    portraitLoaded.value = false;
    const fromIndex = activePortraitSourceIndex.value;
    const nextIndex = nextMediaSourceIndex(fromIndex, activePortraitSources.value.length) ?? 0;
    activePortraitSourceIndex.value = nextIndex;
    portraitRetryAttempt.value += 1;
    debugPortraitFallback('retry', { fromIndex, toIndex: nextIndex });
  }

  function onPortraitLoaded(): void {
    portraitLoadTimeout.clear();
    portraitLoaded.value = true;
    portraitLoadFailed.value = false;
    debugPortraitFallback('loaded');
  }

  function advancePortraitSource(reason: 'error' | 'timeout'): void {
    portraitLoadTimeout.clear();
    portraitLoaded.value = false;
    const fromIndex = activePortraitSourceIndex.value;
    const nextIndex = nextMediaSourceIndex(fromIndex, activePortraitSources.value.length);
    if (nextIndex !== null) {
      activePortraitSourceIndex.value = nextIndex;
      portraitRetryAttempt.value = 0;
      debugPortraitFallback('fallback', { reason, fromIndex, toIndex: nextIndex });
      return;
    }
    portraitLoadFailed.value = true;
    debugPortraitFallback('all_failed', { reason, fromIndex });
  }

  function onPortraitLoadError(): void {
    debugPortraitFallback('error');
    advancePortraitSource('error');
  }

  watch(
    portraitMediaUrl,
    url => {
      portraitLoadTimeout.clear();
      if (url && !portraitLoadFailed.value) {
        debugPortraitFallback('try');
        portraitLoadTimeout.arm();
      }
    },
    { immediate: true },
  );

  function switchPortrait(offset: number): void {
    const count = readVm().imageUrls.length;
    if (count < 2) return;

    activePortraitIndex.value = (activePortraitIndex.value + offset + count) % count;
    activePortraitSourceIndex.value = 0;
    portraitLoadFailed.value = false;
    portraitLoaded.value = false;
    portraitRetryAttempt.value = 0;
  }

  watch(
    () => JSON.stringify(readVm().imageSourceGroups),
    () => {
      activePortraitIndex.value = resolveInitialPortraitIndex();
      activePortraitSourceIndex.value = 0;
      portraitLoadFailed.value = false;
      portraitLoaded.value = false;
      portraitRetryAttempt.value = 0;
    },
  );

  onBeforeUnmount(() => {
    portraitLoadTimeout.dispose();
  });

  return {
    activePortraitIndex,
    activePortraitSourceIndex,
    activePortraitSources,
    activePortraitUrl,
    portraitMediaUrl,
    hasMultiplePortraits,
    isVideoPortrait,
    portraitLoaded,
    portraitLoadFailed,
    switchPortrait,
    retryPortraitLoad,
    onPortraitLoaded,
    onPortraitLoadError,
  };
}
