export type ViewerSavePhase = 'idle' | 'pending' | 'success' | 'error';
export type ViewerSaveFeedbackPhase = Exclude<ViewerSavePhase, 'idle'>;

export const VIEWER_SAVE_COMPACT_LABELS: Record<ViewerSavePhase, string> = {
  idle: '📥',
  pending: '⏳',
  success: '✓ 已保存',
  error: '❌',
};

export const VIEWER_SAVE_NAV_LABELS: Record<ViewerSavePhase, string> = {
  idle: '保存',
  pending: '保存中',
  success: '✓ 已保存',
  error: '保存失败',
};

export const VIEWER_IMPORT_MVU_LABEL = '导入至[最新消息楼层]变量';
export const VIEWER_IMPORT_WORLDBOOK_LABEL = '导入到聊天世界书';
