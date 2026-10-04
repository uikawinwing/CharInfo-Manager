import type { Component } from 'vue';

import type { TabKey } from '../../services/characterViewModel';

export type AttributeView = {
  key: string;
  short: string;
  total: number;
  formula: string;
  formulaParts: Array<{ index: number; text: string; isWarning: boolean }>;
  isTotalAbnormal: boolean;
  hasFormulaWarning: boolean;
  showFormula: boolean;
};

export type IllustratedTabKey = 'overview' | 'holdings' | 'characterPanel' | TabKey;

export type IllustratedTab = {
  key: IllustratedTabKey;
  label: string;
};

/**
 * 立绘 renderer 的可替换模块集合（DX Level 2：Module Override）。
 *
 * 每一项都是「用哪个组件画这一块」，且**全部可选**：没有提供的项必须 100% 回落到
 * 默认 renderer。默认路径不传 overrides 时，行为与 CSS 与拆分前完全一致。
 *
 * 刻意不提供的东西：registry、plugin loader、slot、JSON layout DSL、动态发现。
 * 需要时用显式 import + props 表达。
 *
 * 粒度标准是「设计师真的会整块重新设计」的区域。单个 tag / badge / chip 不是模块。
 *
 * `portrait` 有一项额外义务：必须用 `defineExpose({ captureCurrentFrame })`
 * 暴露该能力。移动端详情页的静态快照由父级 canvas 绘制，父级只调用这个方法，
 * 不接触媒体 DOM。缺少它不会崩——`?.` 会让快照静默失效，移动端详情页失去背景图。
 */
export type IllustratedRendererOverrides = {
  /** 首页姓名 / 等级 / 身份块。props: `vm`, `compact?`；emits: `layoutChange`。 */
  header?: Component;
  /** 首页属性 / 资源 / 登场台词面板。props: `attributes`, `resourceBoxes`, `entranceQuoteText?`。 */
  overview?: Component;
  /** 立绘面板。props: `vm`, `portrait`, `isOverviewTab`, `forceMobileLayout`；须 expose `captureCurrentFrame`。 */
  portrait?: Component;
  /** 技能 / 装备 / 背包 / 状态 / 持有共用的一张卡，靠 `variant` 区分密度。 */
  itemCard?: Component;
  /** 导航栏（桌面侧栏 / 移动底栏共用）。props 含 `tabs`, `activeTab`, `savePhase` 等。 */
  navigation?: Component;
};
