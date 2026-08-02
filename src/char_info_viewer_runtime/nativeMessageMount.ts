import type { CharInfoCardPart } from '../char_info_viewer/runtime/charInfoMessage';

const BLOCKED_NATIVE_SCOPE_SELECTOR = [
  '.TH-render',
  '.TH-streaming',
  'iframe',
  'pre',
  'code',
  'script',
  'style',
  'textarea',
  'think',
  'thinking',
  '[data-st-thinking]',
  '[data-st-thoughts]',
  '[data-reasoning]',
  '.thinking',
  '.think',
  '.thoughts',
  '.mes_reasoning_details',
  '.mes_reasoning_summary',
  '.mes_reasoning_header',
  '.mes_reasoning',
  '.mes_thoughts',
  '[data-char-info-runtime-owned]',
].join(',');

type TextOffset = {
  nodeIndex: number;
  offset: number;
};

export type TextRangeMatch = {
  startNodeIndex: number;
  startOffset: number;
  endNodeIndex: number;
  endOffset: number;
};

export type MountedNativeCardHost = {
  host: HTMLElement;
  restore(): void;
};

type CollapsedTextRangeMatch = TextRangeMatch & {
  collapsedStart: number;
  collapsedEnd: number;
};

function buildTextOffsetMap(chunks: readonly string[]): TextOffset[] {
  const offsets: TextOffset[] = [];
  chunks.forEach((chunk, nodeIndex) => {
    for (let offset = 0; offset < chunk.length; offset += 1) {
      offsets.push({ nodeIndex, offset });
    }
  });
  return offsets;
}

export function findTextRange(chunks: readonly string[], needle: string): TextRangeMatch | null {
  if (!needle) return null;
  const start = chunks.join('').indexOf(needle);
  if (start < 0) return null;

  const offsets = buildTextOffsetMap(chunks);
  const first = offsets[start];
  const last = offsets[start + needle.length - 1];
  if (!first || !last) return null;

  return {
    startNodeIndex: first.nodeIndex,
    startOffset: first.offset,
    endNodeIndex: last.nodeIndex,
    endOffset: last.offset + 1,
  };
}

function normalizeRenderedBoundary(text: string): string {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*[-+*]\s+/, ''))
    .join('')
    .replace(/\s+/g, '');
}

function findCollapsedTextOccurrence(
  chunks: readonly string[],
  needle: string,
  fromCollapsedIndex = 0,
): CollapsedTextRangeMatch | null {
  const collapsedNeedle = normalizeRenderedBoundary(needle);
  if (!collapsedNeedle) return null;

  const characters: string[] = [];
  const offsets: TextOffset[] = [];
  chunks.forEach((chunk, nodeIndex) => {
    for (let offset = 0; offset < chunk.length; offset += 1) {
      const character = chunk[offset];
      if (/\s/.test(character)) continue;
      characters.push(character);
      offsets.push({ nodeIndex, offset });
    }
  });

  const start = characters.join('').indexOf(collapsedNeedle, fromCollapsedIndex);
  if (start < 0) return null;
  const first = offsets[start];
  const last = offsets[start + collapsedNeedle.length - 1];
  if (!first || !last) return null;

  return {
    startNodeIndex: first.nodeIndex,
    startOffset: first.offset,
    endNodeIndex: last.nodeIndex,
    endOffset: last.offset + 1,
    collapsedStart: start,
    collapsedEnd: start + collapsedNeedle.length,
  };
}

export function findCollapsedTextRange(chunks: readonly string[], needle: string): TextRangeMatch | null {
  const match = findCollapsedTextOccurrence(chunks, needle);
  if (!match) return null;
  return {
    startNodeIndex: match.startNodeIndex,
    startOffset: match.startOffset,
    endNodeIndex: match.endNodeIndex,
    endOffset: match.endOffset,
  };
}

export function getCharInfoBody(source: string): string | null {
  const match = source.match(/^<char_info\s*>([\s\S]*?)<\/char_info\s*>$/i);
  const body = match?.[1] ?? '';
  return body.trim() ? body : null;
}

export function getCharInfoBoundaryTexts(source: string): { start: string; end: string } | null {
  const lines = getCharInfoBody(source)
    ?.split(/\r?\n/)
    .map(line => line.trim().replace(/^[-+*]\s+/, ''))
    .filter(Boolean);
  if (!lines?.length) return null;

  return { start: lines[0], end: lines.at(-1)! };
}

function isBlockedTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  try {
    return Boolean(parent.closest(BLOCKED_NATIVE_SCOPE_SELECTOR));
  } catch {
    return true;
  }
}

function collectRenderableTextNodes(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === 3 && !isBlockedTextNode(node as Text)) nodes.push(node as Text);
  }
  return nodes;
}

function getTopLevelChild(root: HTMLElement, node: Text): Element | null {
  let element = node.parentElement;
  while (element && element.parentElement !== root) {
    element = element.parentElement;
  }
  return element?.parentElement === root ? element : null;
}

function hasTextBefore(node: Text, offset: number, container: Element): boolean {
  const range = node.ownerDocument.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  const hasText = Boolean(range.toString().trim());
  range.detach();
  return hasText;
}

function hasTextAfter(node: Text, offset: number, container: Element): boolean {
  const range = node.ownerDocument.createRange();
  range.selectNodeContents(container);
  range.setStart(node, offset);
  const hasText = Boolean(range.toString().trim());
  range.detach();
  return hasText;
}

function createSafeBoundaryRange(root: HTMLElement, card: CharInfoCardPart): Range | null {
  const body = getCharInfoBody(card.content);
  if (!body) return null;

  const nodes = collectRenderableTextNodes(root);
  const chunks = nodes.map(node => node.nodeValue ?? '');
  const match = findCollapsedTextRange(chunks, body);
  if (!match) return null;

  const startNode = nodes[match.startNodeIndex];
  const endNode = nodes[match.endNodeIndex];
  if (!startNode || !endNode) return null;

  const startTopLevel = getTopLevelChild(root, startNode);
  const endTopLevel = getTopLevelChild(root, endNode);
  if (!startTopLevel || !endTopLevel) return null;

  const range = root.ownerDocument.createRange();
  if (hasTextBefore(startNode, match.startOffset, startTopLevel)) {
    range.setStart(startNode, match.startOffset);
  } else {
    range.setStartBefore(startTopLevel);
  }
  if (hasTextAfter(endNode, match.endOffset, endTopLevel)) {
    range.setEnd(endNode, match.endOffset);
  } else {
    range.setEndAfter(endTopLevel);
  }
  if (range.cloneContents().querySelector(BLOCKED_NATIVE_SCOPE_SELECTOR)) {
    range.detach();
    return null;
  }
  return range;
}

function mountOneCard(root: HTMLElement, card: CharInfoCardPart): MountedNativeCardHost | null {
  const range = createSafeBoundaryRange(root, card);
  if (!range) return null;

  const originalContent = range.extractContents();
  const host = root.ownerDocument.createElement('div');
  host.className = 'char-info-runtime-host';
  host.dataset.charInfoRuntimeOwned = '1';
  host.dataset.charInfoCardId = card.id;
  range.insertNode(host);
  range.detach();

  let restored = false;
  return {
    host,
    restore() {
      if (restored) return;
      restored = true;
      if (host.isConnected) host.replaceWith(originalContent);
    },
  };
}

export function mountCharInfoCardHosts(
  root: HTMLElement,
  cards: readonly CharInfoCardPart[],
): MountedNativeCardHost[] | null {
  const mounted: MountedNativeCardHost[] = [];
  for (const card of cards) {
    const cardMount = mountOneCard(root, card);
    if (!cardMount) {
      mounted.reverse().forEach(item => item.restore());
      return null;
    }
    mounted.push(cardMount);
  }
  return mounted;
}
