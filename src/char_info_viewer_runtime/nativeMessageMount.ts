import type { CharInfoCardPart } from '../char_info_viewer/runtime/charInfoMessage';

export const BLOCKED_NATIVE_SCOPE_SELECTOR = [
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
  '.char-info-runtime-host',
  '[data-char-info-runtime-owned]',
  '[data-char-info]',
  '.abby-card-shell',
  '[data-abby-foreign="1"]',
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

function getMessageId(root: HTMLElement): number | null {
  const messageElement = root.closest<HTMLElement>('#chat > .mes[mesid]');
  const messageId = Number(messageElement?.getAttribute('mesid'));
  return Number.isInteger(messageId) && messageId >= 0 ? messageId : null;
}

function getDisplayLocatorCandidates(root: HTMLElement, rawBody: string): string[] {
  const candidates = [rawBody];
  const messageId = getMessageId(root);
  if (messageId === null) return candidates;

  try {
    if (typeof formatAsTavernRegexedString === 'function') {
      const depth = Math.max(0, getLastMessageId() - messageId);
      const regexedBody = formatAsTavernRegexedString(rawBody, 'ai_output', 'display', { depth });
      if (regexedBody && regexedBody !== rawBody) candidates.push(regexedBody);
    }
  } catch (error) {
    console.warn('[CharInfo Runtime] 无法生成酒馆显示正则定位文本，将继续使用原始文本定位。', error);
  }

  try {
    if (typeof formatAsDisplayedMessage === 'function') {
      const displayedHtml = formatAsDisplayedMessage(rawBody, { message_id: messageId });
      const container = root.ownerDocument.createElement('div');
      container.innerHTML = displayedHtml;
      const displayedText = container.textContent ?? '';
      if (displayedText && !candidates.includes(displayedText)) candidates.push(displayedText);
    }
  } catch (error) {
    console.warn('[CharInfo Runtime] 无法生成酒馆最终显示定位文本，将继续使用已有候选文本定位。', error);
  }

  return candidates;
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
  if (element === root) return root;
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
  const match = getDisplayLocatorCandidates(root, body)
    .map(candidate => findCollapsedTextRange(chunks, candidate))
    .find((candidate): candidate is TextRangeMatch => candidate !== null);
  if (!match) return null;

  const startNode = nodes[match.startNodeIndex];
  const endNode = nodes[match.endNodeIndex];
  if (!startNode || !endNode) return null;

  const startTopLevel = getTopLevelChild(root, startNode);
  const endTopLevel = getTopLevelChild(root, endNode);
  if (!startTopLevel || !endTopLevel) return null;

  const range = root.ownerDocument.createRange();
  if (startTopLevel === root || hasTextBefore(startNode, match.startOffset, startTopLevel)) {
    range.setStart(startNode, match.startOffset);
  } else {
    range.setStartBefore(startTopLevel);
  }
  if (endTopLevel === root || hasTextAfter(endNode, match.endOffset, endTopLevel)) {
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
