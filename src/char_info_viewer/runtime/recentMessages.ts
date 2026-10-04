import { DEFAULT_VIEWER_ACTIVE_FLOOR_LIMIT } from '../../char_info_shared/viewerUiDefaults.ts';

export const DEFAULT_ACTIVE_FLOOR_LIMIT = DEFAULT_VIEWER_ACTIVE_FLOOR_LIMIT;

export function selectRecentMessageIds(messageIds: readonly number[], limit = DEFAULT_ACTIVE_FLOOR_LIMIT): number[] {
  const normalizedLimit = Math.max(1, Math.floor(limit));
  return messageIds.slice(-normalizedLimit);
}
