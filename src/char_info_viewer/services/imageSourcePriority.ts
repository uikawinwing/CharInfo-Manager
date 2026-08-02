export type ImageSourcePriorityNormalization = {
  priorities: string[];
  rejectedCount: number;
};

function parseHttpHostname(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.hostname.toLocaleLowerCase() || null;
  } catch {
    return null;
  }
}

function parsePriorityHostname(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('*')) return null;

  if (trimmed.includes('://')) return parseHttpHostname(trimmed);
  if (
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('?') ||
    trimmed.includes('#') ||
    trimmed.includes('@') ||
    trimmed.includes(':')
  ) {
    return null;
  }

  return parseHttpHostname(`https://${trimmed}`);
}

export function normalizeImageSourcePriorityEntries(entries: readonly unknown[]): ImageSourcePriorityNormalization {
  const priorities: string[] = [];
  let rejectedCount = 0;

  entries.forEach(entry => {
    const hostname = parsePriorityHostname(entry);
    if (!hostname) {
      if (typeof entry !== 'string' || entry.trim()) rejectedCount += 1;
      return;
    }
    if (!priorities.includes(hostname)) priorities.push(hostname);
  });

  return { priorities, rejectedCount };
}

export function normalizeImageSourcePriority(value: unknown): string[] {
  return normalizeImageSourcePriorityEntries(Array.isArray(value) ? value : []).priorities;
}

function sourcePriorityIndex(source: string, priorities: readonly string[]): number {
  const hostname = parseHttpHostname(source);
  if (!hostname) return Number.POSITIVE_INFINITY;

  const index = priorities.findIndex(priority => hostname === priority || hostname.endsWith(`.${priority}`));
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

export function prioritizeImageSources(sources: readonly string[], priorities: readonly string[]): string[] {
  if (priorities.length === 0) return [...sources];

  return sources
    .map((source, index) => ({ source, index, priority: sourcePriorityIndex(source, priorities) }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index)
    .map(({ source }) => source);
}

export function prioritizeImageSourceGroups(groups: readonly (readonly string[])[], priorities: readonly string[]): string[][] {
  return groups.map(sources => prioritizeImageSources(sources, priorities));
}
