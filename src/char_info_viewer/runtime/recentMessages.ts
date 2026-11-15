export const DEFAULT_ACTIVE_FLOOR_LIMIT = 6;

export function selectRecentMessageIds(messageIds: readonly number[], limit = DEFAULT_ACTIVE_FLOOR_LIMIT): number[] {
  if (limit === 0) return [...messageIds];
  const normalizedLimit = Math.max(1, Math.floor(limit));
  return messageIds.slice(-normalizedLimit);
}
