import type { CharInfoCardPart } from '../char_info_viewer/runtime/charInfoMessage';

const SLOT_TOKEN_PREFIX = 'CHARINFOVIEWERSLOT';
const RUNTIME_HOST_SELECTOR = '[data-char-info-runtime-owned="1"][data-char-info-card-id]';
const TAVERN_HELPER_RENDER_SELECTOR = 'div.TH-render';
const TAVERN_HELPER_FRONTEND_MARKERS = ['html>', '<head>', '<body'] as const;

export type CharInfoCardSlot = {
  cardId: string;
  token: string;
};

export type PreparedCharInfoMessage = {
  source: string;
  slots: CharInfoCardSlot[];
};

export type MountedNativeCardHost = {
  host: HTMLElement;
  restore(): void;
};

type PreservedTavernHelperRender = {
  element: HTMLElement;
  originalMarker: Comment;
};

type PreparedMountedContent = {
  mountedContent: DocumentFragment;
  originalContent: DocumentFragment;
  preservedRenders: PreservedTavernHelperRender[];
};

function createSlotToken(source: string, card: CharInfoCardPart, index: number): string {
  const fingerprint = card.renderKey.replace(/[^a-z0-9]/gi, '').toUpperCase();
  let token = `${SLOT_TOKEN_PREFIX}${fingerprint}X${index}END`;
  while (source.includes(token)) token += 'X';
  return token;
}

export function buildRawMessageWithCardSlots(
  source: string,
  cards: readonly CharInfoCardPart[],
): PreparedCharInfoMessage | null {
  let cursor = 0;
  let tokenizedSource = '';
  const slots: CharInfoCardSlot[] = [];

  for (const [index, card] of cards.entries()) {
    const start = source.indexOf(card.content, cursor);
    if (start < 0) return null;

    const token = createSlotToken(source, card, index);
    tokenizedSource += source.slice(cursor, start) + token;
    slots.push({ cardId: card.id, token });
    cursor = start + card.content.length;
  }

  tokenizedSource += source.slice(cursor);
  return { source: tokenizedSource, slots };
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createHostMarkup(slot: CharInfoCardSlot): string {
  return `<div class="char-info-runtime-host" data-char-info-runtime-owned="1" data-char-info-card-id="${escapeHtmlAttribute(slot.cardId)}"></div>`;
}

export function injectCardHostsIntoDisplayedHtml(
  displayedHtml: string,
  slots: readonly CharInfoCardSlot[],
): string | null {
  let output = displayedHtml;

  for (const slot of slots) {
    const start = output.indexOf(slot.token);
    if (start < 0 || output.indexOf(slot.token, start + slot.token.length) >= 0) return null;

    output = output.slice(0, start) + createHostMarkup(slot) + output.slice(start + slot.token.length);
  }

  return output;
}

export function isTavernHelperFrontendSource(source: string): boolean {
  return TAVERN_HELPER_FRONTEND_MARKERS.some(marker => source.includes(marker));
}

function collectTavernHelperFrontendMountPoints(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('pre')).filter(pre =>
    isTavernHelperFrontendSource(pre.textContent ?? ''),
  );
}

function collectPreservableTavernHelperRenders(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TAVERN_HELPER_RENDER_SELECTOR)).filter(
    element => !element.parentElement?.closest(TAVERN_HELPER_RENDER_SELECTOR),
  );
}

function prepareMountedContent(root: HTMLElement, mountedHtml: string): PreparedMountedContent | null {
  const stagedRoot = root.ownerDocument.createElement('div');
  stagedRoot.innerHTML = mountedHtml;

  const frontendMountPoints = collectTavernHelperFrontendMountPoints(stagedRoot);
  const existingRenders = collectPreservableTavernHelperRenders(root);
  if (existingRenders.length > 0 && existingRenders.length !== frontendMountPoints.length) return null;

  const preservedRenders = existingRenders.map(element => {
    const originalMarker = root.ownerDocument.createComment('char-info-preserved-th-render');
    element.replaceWith(originalMarker);
    return { element, originalMarker };
  });

  const originalContent = root.ownerDocument.createDocumentFragment();
  while (root.firstChild) originalContent.appendChild(root.firstChild);

  preservedRenders.forEach((preserved, index) => {
    frontendMountPoints[index].replaceWith(preserved.element);
  });

  const mountedContent = root.ownerDocument.createDocumentFragment();
  while (stagedRoot.firstChild) mountedContent.appendChild(stagedRoot.firstChild);

  return { mountedContent, originalContent, preservedRenders };
}

function restoreOriginalContent(root: HTMLElement, prepared: PreparedMountedContent): void {
  prepared.preservedRenders.forEach(({ element, originalMarker }) => {
    if (originalMarker.parentNode) originalMarker.replaceWith(element);
  });
  root.replaceChildren(prepared.originalContent);
}

function scheduleDownstreamRendererRefresh(
  messageId: number,
  root: HTMLElement,
  hosts: readonly HTMLElement[],
): void {
  setTimeout(() => {
    if (!root.isConnected || hosts.some(host => !host.isConnected || !root.contains(host))) return;
    void eventEmit(tavern_events.CHARACTER_MESSAGE_RENDERED, messageId);
  }, 0);
}

function resolveMessageId(root: HTMLElement, cards: readonly CharInfoCardPart[]): number | null {
  const nativeMessageId = Number(root.closest<HTMLElement>('#chat > .mes')?.getAttribute('mesid'));
  if (Number.isInteger(nativeMessageId) && nativeMessageId >= 0) return nativeMessageId;

  const cardMessageId = Number(cards[0]?.id.split(':', 1)[0]);
  return Number.isInteger(cardMessageId) && cardMessageId >= 0 ? cardMessageId : null;
}

function readRawMessage(messageId: number): string | null {
  const message = getChatMessages(messageId)[0];
  return message && typeof message.message === 'string' ? message.message : null;
}

function collectMountedHosts(root: HTMLElement, cards: readonly CharInfoCardPart[]): HTMLElement[] | null {
  const hostsByCardId = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>(RUNTIME_HOST_SELECTOR).forEach(host => {
    const cardId = host.dataset.charInfoCardId;
    if (cardId && !hostsByCardId.has(cardId)) hostsByCardId.set(cardId, host);
  });

  const hosts = cards.map(card => hostsByCardId.get(card.id) ?? null);
  return hosts.every((host): host is HTMLElement => Boolean(host)) ? hosts : null;
}

export function mountCharInfoCardHosts(
  root: HTMLElement,
  cards: readonly CharInfoCardPart[],
): MountedNativeCardHost[] | null {
  if (cards.length === 0) return [];

  const messageId = resolveMessageId(root, cards);
  if (messageId === null) return null;

  const rawMessage = readRawMessage(messageId);
  if (rawMessage === null) return null;

  const prepared = buildRawMessageWithCardSlots(rawMessage, cards);
  if (!prepared) return null;

  const displayedHtml = formatAsDisplayedMessage(prepared.source, { message_id: messageId });
  const mountedHtml = injectCardHostsIntoDisplayedHtml(displayedHtml, prepared.slots);
  if (mountedHtml === null) return null;

  const preparedContent = prepareMountedContent(root, mountedHtml);
  if (!preparedContent) return null;

  try {
    root.replaceChildren(preparedContent.mountedContent);
  } catch (error) {
    restoreOriginalContent(root, preparedContent);
    throw error;
  }

  const hosts = collectMountedHosts(root, cards);
  if (!hosts) {
    restoreOriginalContent(root, preparedContent);
    return null;
  }

  scheduleDownstreamRendererRefresh(messageId, root, hosts);

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;

    const stillOwnsMessage = hosts.some(host => host.isConnected && root.contains(host));
    if (stillOwnsMessage && root.isConnected) restoreOriginalContent(root, preparedContent);
  };

  return hosts.map(host => ({ host, restore }));
}
