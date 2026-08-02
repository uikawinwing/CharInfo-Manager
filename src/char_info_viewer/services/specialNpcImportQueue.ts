const pendingImports = new Map<string, Promise<void>>();

export function enqueueSpecialNpcImport(queueKey: string, task: () => Promise<void>): Promise<void> {
  const previous = pendingImports.get(queueKey) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(task)
    .finally(() => {
      if (pendingImports.get(queueKey) === current) pendingImports.delete(queueKey);
    });
  pendingImports.set(queueKey, current);
  return current;
}
