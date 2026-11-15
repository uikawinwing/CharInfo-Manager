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
  mode: 'dom-element' | 'text-range' | 'field-anchor' | 'fallback-anchor';
  restore(): void;
};

export type NativeMessageMountDiagnosticCode = 'CARD_MOUNT_FAILED' | 'CARD_MOUNT_FALLBACK' | 'MOUNT_SUCCESS';

export type NativeMessageMountDiagnostic = {
  code: NativeMessageMountDiagnosticCode;
  details?: Record<string, unknown>;
};

export type NativeMessageMountOptions = {
  onDiagnostic?: (diagnostic: NativeMessageMountDiagnostic) => void;
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

type FieldAnchor = {
  nodes: Text[];
  match: CollapsedTextRangeMatch;
};

type UsedFieldAnchors = WeakMap<Text, Set<number>>;

function findFieldAnchor(root: HTMLElement, body: string, used: UsedFieldAnchors): FieldAnchor | null {
  const name = getNameField(body);
  if (!name) return null;
  const nodes = collectRenderableTextNodes(root);
  const chunks = nodes.map(node => node.nodeValue ?? '');
  const collapsedText = chunks.join('').replace(/\s+/g, '');

  for (const label of ['姓名', '名字']) {
    for (const separator of [':', '：']) {
      let from = 0;
      for (;;) {
        const match = findCollapsedTextOccurrence(chunks, label + separator + name, from);
        if (!match) break;
        from = match.collapsedStart + 1;
        const node = nodes[match.startNodeIndex];
        if (!node || used.get(node)?.has(match.startOffset)) continue;

        // Require a second character field nearby, not a name mentioned in prose.
        const nextText = collapsedText.slice(match.collapsedEnd, match.collapsedEnd + 350);
        if (!/(?:生命层级|生命層級|等级|等級|种族|種族)[:：]/u.test(nextText)) continue;
        return { nodes, match };
      }
    }
  }
  return null;
}

function markFieldAnchorUsed(anchor: FieldAnchor, used: UsedFieldAnchors): void {
  const node = anchor.nodes[anchor.match.startNodeIndex];
  if (!node) return;
  const offsets = used.get(node) ?? new Set<number>();
  offsets.add(anchor.match.startOffset);
  used.set(node, offsets);
}

function createFieldBoundaryMatch(anchor: FieldAnchor, body: string): TextRangeMatch | null {
  const lines = body.trimEnd().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const lastLine = lines.at(-1) ?? '';
  const lastLength = normalizeRenderedBoundary(lastLine).length;
  if (lastLength < 5) return null;

  const chunks = anchor.nodes.map(node => node.nodeValue ?? '');
  const end = findCollapsedTextOccurrence(chunks, lastLine, anchor.match.collapsedEnd);
  if (!end) return null;

  // Short endings such as "位置: 身体" need a distinctive penultimate line to
  // avoid stopping at a matching field from a different item.
  if (lastLength < 12) {
    const previous = lines.at(-2) ?? '';
    if (normalizeRenderedBoundary(previous).length < 16) return null;
    const previousMatch = findCollapsedTextOccurrence(chunks, previous, anchor.match.collapsedEnd);
    if (!previousMatch || previousMatch.collapsedEnd > end.collapsedStart ||
        end.collapsedStart - previousMatch.collapsedEnd > 200) return null;
  }

  // Never consume a second card's name line when two cards share a floor.
  const collapsed = chunks.join('').replace(/\s+/g, '');
  const middle = collapsed.slice(anchor.match.collapsedEnd, end.collapsedStart);
  if (/(?:姓名|名字)[:：]/u.test(middle)) return null;
  return {
    startNodeIndex: anchor.match.startNodeIndex,
    startOffset: anchor.match.startOffset,
    endNodeIndex: end.endNodeIndex,
    endOffset: end.endOffset,
  };
}

function createSafeBoundaryRange(
  root: HTMLElement,
  card: CharInfoCardPart,
  usedAnchors: UsedFieldAnchors,
): Range | null {
  const body = getCharInfoBody(card.content);
  if (!body) {
    reportMountFailure(root, card, 'empty-char-info-body');
    return null;
  }

  const nodes = collectRenderableTextNodes(root);
  const chunks = nodes.map(node => node.nodeValue ?? '');
  const exactMatch = getDisplayLocatorCandidates(root, card, body)
    .map(candidate => findCollapsedTextRange(chunks, candidate))
    .find((candidate): candidate is TextRangeMatch => candidate !== null);
  const fieldAnchor = exactMatch ? null : findFieldAnchor(root, body, usedAnchors);
  const match = exactMatch ?? (fieldAnchor ? createFieldBoundaryMatch(fieldAnchor, body) : null);
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

function collectNativeCharInfoElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('char_info')).filter(element => {
    try {
      return !element.closest(BLOCKED_NATIVE_SCOPE_SELECTOR);
    } catch {
      return false;
    }
  });
}

function getNameField(text: string): string {
  return text.replace(/\r\n/g, '\n').match(/(?:^|\n)[ \t]*(?:-[ \t]*)?(?:姓名|名字)[ \t]*[:：][ \t]*([^\r\n]*)/u)?.[1]?.trim() ?? '';
}

function createOwnedHost(root: HTMLElement, card: CharInfoCardPart): HTMLElement {
  const host = root.ownerDocument.createElement('div');
  host.className = 'char-info-runtime-host';
  host.dataset.charInfoRuntimeOwned = '1';
  host.dataset.charInfoCardId = card.id;
  return host;
}

function mountOneCard(
  root: HTMLElement,
  card: CharInfoCardPart,
  nativeElements: readonly HTMLElement[],
  usedElements: Set<HTMLElement>,
  usedAnchors: UsedFieldAnchors,
  cardCount: number,
): MountedNativeCardHost | null {
  const body = getCharInfoBody(card.content);
  if (!body || !root.isConnected) return null;

  const name = getNameField(body);
  // Prefer an actual tag boundary. Markdown may rewrite everything *inside* it.
  const namedElement = name
    ? nativeElements.find(element =>
        !usedElements.has(element) &&
        (element.textContent ?? '').includes(name) &&
        /姓名|名字/u.test(element.textContent ?? ''),
      )
    : null;
  const ordinalElement = nativeElements.length === cardCount ? nativeElements[card.ordinal] : undefined;
  const ordinalText = ordinalElement?.textContent ?? '';
  const ordinalName = getNameField(ordinalText);
  const element = namedElement ??
    (ordinalElement && !usedElements.has(ordinalElement) && /姓名|名字/u.test(ordinalText) &&
    (!ordinalName || ordinalName === name)
      ? ordinalElement
      : null);

  const host = createOwnedHost(root, card);
  let restored = false;
  if (element) {
    usedElements.add(element);
    element.replaceWith(host);
    return {
      host,
      mode: 'dom-element',
      restore() {
        if (restored) return;
        restored = true;
        if (host.isConnected) host.replaceWith(element);
      },
    };
  }

  // Keep the existing text-range fast path for formats that flatten the tags.
  const range = createSafeBoundaryRange(root, card, usedAnchors);
  if (range) {
    const originalContent = range.extractContents();
    range.insertNode(host);
    range.detach();
    return {
      host,
      mode: 'text-range',
      restore() {
        if (restored) return;
        restored = true;
        if (host.isConnected) host.replaceWith(originalContent);
      },
    };
  }

  // When Markdown rewrites the card body, preserve its text but place the
  // actionable Viewer at the character's visible name field, not at floor end.
  const anchor = findFieldAnchor(root, body, usedAnchors);
  if (anchor) {
    const node = anchor.nodes[anchor.match.startNodeIndex];
    if (node) {
      markFieldAnchorUsed(anchor, usedAnchors);
      const block = node.parentElement?.closest('p, li, div, blockquote');
      if (block && block !== root && !hasTextBefore(node, anchor.match.startOffset, block)) {
        block.before(host);
      } else {
        const insertion = root.ownerDocument.createRange();
        insertion.setStart(node, anchor.match.startOffset);
        insertion.collapse(true);
        insertion.insertNode(host);
        insertion.detach();
      }
      return {
        host,
        mode: 'field-anchor',
        restore() {
          if (restored) return;
          restored = true;
          host.remove();
        },
      };
    }
  }

  // No trustworthy boundary remains; leave the original display untouched.
  root.appendChild(host);
  return {
    host,
    mode: 'fallback-anchor',
    restore() {
      if (restored) return;
      restored = true;
      host.remove();
    },
  };
}

export function mountCharInfoCardHosts(
  root: HTMLElement,
  cards: readonly CharInfoCardPart[],
  options: NativeMessageMountOptions = {},
): MountedNativeCardHost[] | null {
  const mounted: MountedNativeCardHost[] = [];
  const nativeElements = collectNativeCharInfoElements(root);
  const usedElements = new Set<HTMLElement>();
  const usedAnchors: UsedFieldAnchors = new WeakMap<Text, Set<number>>();
  for (const card of cards) {
    const cardMount = mountOneCard(root, card, nativeElements, usedElements, usedAnchors, cards.length);
    if (!cardMount) {
      options.onDiagnostic?.({
        code: 'CARD_MOUNT_FAILED',
        details: { cardId: card.id, mountedCount: mounted.length, cardCount: cards.length },
      });
      mounted.reverse().forEach(item => item.restore());
      return null;
    }
    if (cardMount.mode === 'fallback-anchor' || cardMount.mode === 'field-anchor') {
      options.onDiagnostic?.({ code: 'CARD_MOUNT_FALLBACK', details: { cardId: card.id, reason: cardMount.mode } });
    }
    mounted.push(cardMount);
  }
  options.onDiagnostic?.({
    code: 'MOUNT_SUCCESS',
    details: { hostCount: mounted.length, modes: mounted.map(item => item.mode) },
  });
  return mounted;
}
