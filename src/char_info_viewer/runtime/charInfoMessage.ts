export type CharInfoTextPart = {
  kind: 'text';
  content: string;
};

export type CharInfoCardPart = {
  kind: 'card';
  id: string;
  renderKey: string;
  ordinal: number;
  content: string;
};

export type CharInfoMessagePart = CharInfoTextPart | CharInfoCardPart;

export type CharInfoMessageProjection = {
  messageId: number;
  swipeId: number;
  parts: CharInfoMessagePart[];
  cards: CharInfoCardPart[];
  overflow: boolean;
};

const CHAR_INFO_BLOCK_PATTERN = /<char_info\s*>[\s\S]*?<\/char_info\s*>/gi;
const DEFAULT_MAX_CARDS = 4;

function hashSource(source: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function projectCharInfoMessage({
  messageId,
  swipeId,
  text,
  maxCards = DEFAULT_MAX_CARDS,
}: {
  messageId: number;
  swipeId: number;
  text: string;
  maxCards?: number;
}): CharInfoMessageProjection {
  const cardLimit = Math.max(1, Math.floor(maxCards));
  const matches: RegExpExecArray[] = [];

  CHAR_INFO_BLOCK_PATTERN.lastIndex = 0;
  for (let match = CHAR_INFO_BLOCK_PATTERN.exec(text); match; match = CHAR_INFO_BLOCK_PATTERN.exec(text)) {
    matches.push(match);
    if (matches.length > cardLimit) {
      return {
        messageId,
        swipeId,
        parts: [{ kind: 'text', content: text }],
        cards: [],
        overflow: true,
      };
    }
  }

  if (matches.length === 0) {
    return {
      messageId,
      swipeId,
      parts: [{ kind: 'text', content: text }],
      cards: [],
      overflow: false,
    };
  }

  const parts: CharInfoMessagePart[] = [];
  const cards: CharInfoCardPart[] = [];
  let cursor = 0;

  matches.forEach((match, ordinal) => {
    const start = match.index;
    if (start > cursor) {
      parts.push({ kind: 'text', content: text.slice(cursor, start) });
    }

    const content = match[0];
    const id = `${messageId}:${swipeId}:${ordinal}`;
    const card = {
      kind: 'card' as const,
      id,
      renderKey: `${id}:${hashSource(content)}`,
      ordinal,
      content,
    };
    parts.push(card);
    cards.push(card);
    cursor = start + content.length;
  });

  if (cursor < text.length) {
    parts.push({ kind: 'text', content: text.slice(cursor) });
  }

  return {
    messageId,
    swipeId,
    parts,
    cards,
    overflow: false,
  };
}
