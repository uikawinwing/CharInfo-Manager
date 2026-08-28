import type { CharInfoCardPart } from '../char_info_viewer/runtime/charInfoMessage';
import { readRuntimeSettings } from './runtimeSettings.ts';

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

type CharInfoContentParts = {
  openingTag: string;
  body: string;
  closingTag: string;
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

function splitCharInfoContent(source: string): CharInfoContentParts | null {
  const match = source.match(/^(<char_info\s*>)([\s\S]*?)(<\/char_info\s*>)$/i);
  if (!match?.[2]?.trim()) return null;
  return { openingTag: match[1], body: match[2], closingTag: match[3] };
}

export function getCharInfoBody(source: string): string | null {
  return splitCharInfoContent(source)?.body ?? null;
}

function getMessageId(root: HTMLElement): number | null {
  const messageElement = root.closest<HTMLElement>('#chat > .mes[mesid]');
  const messageId = Number(messageElement?.getAttribute('mesid'));
  return Number.isInteger(messageId) && messageId >= 0 ? messageId : null;
}

function createLocatorMarker(card: CharInfoCardPart, edge: 'start' | 'end'): string {
  const safeId = card.id.replace(/[^a-z0-9_-]/gi, '_');
  return `\uE000CHARINFO_RUNTIME_${edge.toUpperCase()}_${safeId}\uE001`;
}

function getWholeMessageDisplayCandidate(root: HTMLElement, card: CharInfoCardPart): string | null {
  const messageId = getMessageId(root);
  const parts = splitCharInfoContent(card.content);
  if (messageId === null || !parts || typeof formatAsDisplayedMessage !== 'function') return null;

  try {
    const message = getChatMessages(messageId)[0];
    const rawMessage = typeof message?.message === 'string' ? message.message : '';
    if (!rawMessage || rawMessage.slice(card.sourceStart, card.sourceEnd) !== card.content) return null;

    const startMarker = createLocatorMarker(card, 'start');
    const endMarker = createLocatorMarker(card, 'end');
    const markedCard = `${parts.openingTag}${startMarker}${parts.body}${endMarker}${parts.closingTag}`;
    const markedMessage = `${rawMessage.slice(0, card.sourceStart)}${markedCard}${rawMessage.slice(card.sourceEnd)}`;
    const displayedHtml = formatAsDisplayedMessage(markedMessage, { message_id: messageId });
    const container = root.ownerDocument.createElement('div');
    container.innerHTML = displayedHtml;
    const displayedText = container.textContent ?? '';
    const start = displayedText.indexOf(startMarker);
    if (start < 0) return null;
    const bodyStart = start + startMarker.length;
    const end = displayedText.indexOf(endMarker, bodyStart);
    if (end < bodyStart) return null;
    const displayedBody = displayedText.slice(bodyStart, end);
    return displayedBody.trim() ? displayedBody : null;
  } catch (error) {
    console.warn('[CharInfo Runtime] 无法从整条酒馆显示消息生成 char_info 定位文本，将继续使用原始文本定位。', error);
    return null;
  }
}

function getDisplayLocatorCandidates(root: HTMLElement, card: CharInfoCardPart, rawBody: string): string[] {
  const candidates = [rawBody];
  const displayedBody = getWholeMessageDisplayCandidate(root, card);
  if (displayedBody && displayedBody !== rawBody) candidates.push(displayedBody);
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

function isMountDiagnosticsEnabled(): boolean {
  try {
    return readRuntimeSettings(getVariables({ type: 'script' })).debugEnabled;
  } catch {
    return false;
  }
}

function truncateDiagnosticText(text: string, maxLength = 6000): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}… [truncated ${text.length - maxLength} chars]`;
}

function collectBlockedScopeDiagnostics(root: HTMLElement) {
  try {
    return Array.from(root.querySelectorAll<HTMLElement>(BLOCKED_NATIVE_SCOPE_SELECTOR))
      .slice(0, 20)
      .map(element => ({
        tag: element.tagName.toLowerCase(),
        className: element.className,
        text: truncateDiagnosticText(element.textContent ?? '', 800),
        html: truncateDiagnosticText(element.outerHTML, 1600),
      }));
  } catch (error) {
    return [{ error: error instanceof Error ? error.message : String(error) }];
  }
}

function reportMountFailure(root: HTMLElement, card: CharInfoCardPart, reason: string): void {
  if (!isMountDiagnosticsEnabled()) return;

  const rawBody = getCharInfoBody(card.content) ?? '';
  const finalDisplayCandidate = getWholeMessageDisplayCandidate(root, card) ?? '';
  const renderableText = collectRenderableTextNodes(root)
    .map(node => node.nodeValue ?? '')
    .join('');
  const mesTextActual = root.textContent ?? '';
  let charInfoElements: string[] = [];
  try {
    charInfoElements = Array.from(root.querySelectorAll('char_info'))
      .slice(0, 10)
      .map(element => truncateDiagnosticText(element.outerHTML, 1800));
  } catch {
    // Diagnostic only; the primary mount failure is more important than selector support.
  }

  const label = `[CharInfo Runtime][mount-debug] ${reason} / card ${card.id}`;
  console.groupCollapsed?.(label);
  console.warn(label, {
    reason,
    messageId: getMessageId(root),
    cardId: card.id,
    sourceRange: [card.sourceStart, card.sourceEnd],
    rawCandidate: truncateDiagnosticText(rawBody),
    finalDisplayCandidate: truncateDiagnosticText(finalDisplayCandidate),
    normalizedRawCandidate: truncateDiagnosticText(normalizeRenderedBoundary(rawBody)),
    normalizedFinalDisplayCandidate: truncateDiagnosticText(normalizeRenderedBoundary(finalDisplayCandidate)),
    mesTextActual: truncateDiagnosticText(mesTextActual),
    normalizedMesTextActual: truncateDiagnosticText(normalizeRenderedBoundary(mesTextActual)),
    renderableText: truncateDiagnosticText(renderableText),
    normalizedRenderableText: truncateDiagnosticText(normalizeRenderedBoundary(renderableText)),
    charInfoElements,
    blockedScopes: collectBlockedScopeDiagnostics(root),
    mesTextHtml: truncateDiagnosticText(root.innerHTML, 12000),
  });
  console.groupEnd?.();
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
  if (!body) {
    reportMountFailure(root, card, 'empty-char-info-body');
    return null;
  }

  const nodes = collectRenderableTextNodes(root);
  const chunks = nodes.map(node => node.nodeValue ?? '');
  const match = getDisplayLocatorCandidates(root, card, body)
    .map(candidate => findCollapsedTextRange(chunks, candidate))
    .find((candidate): candidate is TextRangeMatch => candidate !== null);
  if (!match) {
    reportMountFailure(root, card, 'locator-text-not-found');
    return null;
  }

  const startNode = nodes[match.startNodeIndex];
  const endNode = nodes[match.endNodeIndex];
  if (!startNode || !endNode) {
    reportMountFailure(root, card, 'matched-text-node-missing');
    return null;
  }

  const startTopLevel = getTopLevelChild(root, startNode);
  const endTopLevel = getTopLevelChild(root, endNode);
  if (!startTopLevel || !endTopLevel) {
    reportMountFailure(root, card, 'top-level-boundary-missing');
    return null;
  }

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
    reportMountFailure(root, card, 'candidate-range-crosses-blocked-scope');
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
