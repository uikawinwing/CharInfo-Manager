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
