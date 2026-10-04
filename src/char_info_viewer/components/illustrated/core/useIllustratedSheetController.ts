import { computed, nextTick, ref, watch, watchEffect } from 'vue';

import type { CharacterViewModel, ItemObject } from '../../../services/characterViewModel';
import { itemType } from '../../../services/characterViewModel';
import type { IllustratedTab, IllustratedTabKey } from '../types';

/**
 * 角色卡共享行为核心：tab、档案子视图、分组折叠、登场台词弹窗。
 *
 * 本模块只决定「发生什么」，不决定「怎么画」：不关心 tab 在底栏还是侧栏、
 * 不关心 Header 高度、立绘在左还是在右，也不含任何 px / 断点 / 圆角。
 * 默认 renderer 与 DX renderer 消费同一个 controller。
 */
export type IllustratedSheetController = ReturnType<typeof useIllustratedSheetController>;

export type IllustratedProfileSubview = 'info' | 'story';

type SkillGroupKey = 'active' | 'passive' | 'other';
export type IllustratedSkillGroup = { key: SkillGroupKey; title: string; icon: string; items: ItemObject[] };

function skillGroupKey(item: ItemObject): SkillGroupKey {
  const type = itemType(item).trim();
  if (type.includes('主动') || type.includes('主動')) return 'active';
  if (type.includes('被动') || type.includes('被動')) return 'passive';
  return 'other';
}

export function useIllustratedSheetController(options: {
  vm: () => CharacterViewModel;
  specialNpc: () => boolean;
  /** 离开首页时由 renderer 提供的钩子，用于抓取静态快照等纯表现行为。 */
  onLeaveOverview?: () => void;
}) {
  const { vm: readVm, specialNpc: readSpecialNpc, onLeaveOverview } = options;

  const tabs = computed<IllustratedTab[]>(() => [
    { key: 'overview', label: '首页' },
    { key: 'characterPanel', label: '面板' },
    { key: 'profile', label: '档案' },
    { key: 'skills', label: '技能' },
    { key: 'holdings', label: '持有' },
    { key: 'divinity', label: '登神' },
  ]);

  const activeSpecialTab = ref<IllustratedTabKey>('overview');
  const activeProfileSubview = ref<IllustratedProfileSubview>('info');

  const isOverviewTab = computed(() => activeSpecialTab.value === 'overview');
  const isDivinityTab = computed(() => activeSpecialTab.value === 'divinity');
  const activeSpecialTabTitle = computed(() => tabs.value.find(tab => tab.key === activeSpecialTab.value)?.label ?? '');
  const hideRedundantDetailTitle = computed(() => readSpecialNpc() && !isOverviewTab.value);

  const hasCustomStorySections = computed(() => readSpecialNpc() && readVm().storySections.length > 0);
  const profileFallbackBackstoryText = computed(() =>
    readSpecialNpc() && !hasCustomStorySections.value ? readVm().backstoryText : '',
  );

  function selectTab(tab: IllustratedTabKey): void {
    if (tab === activeSpecialTab.value) return;
    if (activeSpecialTab.value === 'overview' && tab !== 'overview') onLeaveOverview?.();
    if (tab === 'profile') activeProfileSubview.value = 'info';
    activeSpecialTab.value = tab;
  }

  function selectProfileSubview(subview: IllustratedProfileSubview): void {
    activeProfileSubview.value = subview;
  }

  // 分组折叠是纯 UI 状态：技能与持有共用同一套 owner，不在 renderer 之间复制。
  const collapsedGroupKeys = ref<string[]>([]);

  function isGroupCollapsed(key: string): boolean {
    return collapsedGroupKeys.value.includes(key);
  }

  function toggleGroup(key: string): void {
    collapsedGroupKeys.value = isGroupCollapsed(key)
      ? collapsedGroupKeys.value.filter(candidate => candidate !== key)
      : [...collapsedGroupKeys.value, key];
  }

  const groupedSkills = computed<IllustratedSkillGroup[]>(() => {
    const groups: IllustratedSkillGroup[] = [
      { key: 'active', title: '主动技能', icon: '◆', items: [] },
      { key: 'passive', title: '被动技能', icon: '◎', items: [] },
      { key: 'other', title: '其他技能', icon: '✦', items: [] },
    ];

    for (const skill of readVm().skills) {
      const group = groups.find(candidate => candidate.key === skillGroupKey(skill));
      group?.items.push(skill);
    }

    return groups.filter(group => group.items.length > 0);
  });

  const isEntranceQuoteDialogOpen = ref(false);
  const quoteDialogCloseButton = ref<HTMLButtonElement | null>(null);
  let entranceQuoteTriggerElement: HTMLElement | null = null;

  function openQuote(event?: Event): void {
    entranceQuoteTriggerElement =
      event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    isEntranceQuoteDialogOpen.value = true;
    void nextTick(() => quoteDialogCloseButton.value?.focus());
  }

  function closeQuote(): void {
    isEntranceQuoteDialogOpen.value = false;
    const trigger = entranceQuoteTriggerElement;
    entranceQuoteTriggerElement = null;
    void nextTick(() => trigger?.focus());
  }

  function keepQuoteDialogFocus(): void {
    quoteDialogCloseButton.value?.focus();
  }

  // 切换角色时重置会话级 UI 状态，避免上一位的折叠 / 子视图泄漏到下一位。
  watch(
    () => readVm().nameText,
    () => {
      collapsedGroupKeys.value = [];
      activeProfileSubview.value = 'info';
    },
  );

  // 没有自定义故事章节时不存在 story 子视图，必须回到资料页。
  watch(hasCustomStorySections, hasCustomStory => {
    if (!hasCustomStory) activeProfileSubview.value = 'info';
  });

  // tab 列表变化后当前 tab 可能失效，回落到首页。
  watchEffect(() => {
    if (!tabs.value.some(tab => tab.key === activeSpecialTab.value)) {
      activeSpecialTab.value = 'overview';
    }
  });

  return {
    tabs,
    activeSpecialTab,
    activeProfileSubview,
    isOverviewTab,
    isDivinityTab,
    activeSpecialTabTitle,
    hideRedundantDetailTitle,
    hasCustomStorySections,
    profileFallbackBackstoryText,
    selectTab,
    selectProfileSubview,
    groupedSkills,
    isGroupCollapsed,
    toggleGroup,
    isEntranceQuoteDialogOpen,
    quoteDialogCloseButton,
    openQuote,
    closeQuote,
    keepQuoteDialogFocus,
  };
}
