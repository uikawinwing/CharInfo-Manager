import type { CharInfoCardPart } from '../char_info_viewer/runtime/charInfoMessage';

const SLOT_TOKEN_PREFIX = 'CHARINFOVIEWERSLOT';
const RUNTIME_HOST_SELECTOR = '[data-char-info-runtime-owned="1"][data-char-info-card-id]';

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

  const originalContent = root.ownerDocument.createDocumentFragment();
  while (root.firstChild) originalContent.appendChild(root.firstChild);
  try {
    root.innerHTML = mountedHtml;
  } catch (error) {
    root.replaceChildren(originalContent);
    throw error;
  }

  const hosts = collectMountedHosts(root, cards);
  if (!hosts) {
    root.replaceChildren(originalContent);
    return null;
  }

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;

    const stillOwnsMessage = hosts.some(host => host.isConnected && root.contains(host));
    if (stillOwnsMessage && root.isConnected) root.replaceChildren(originalContent);
  };

  return hosts.map(host => ({ host, restore }));
}
