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
  sourceStart: number;
  sourceEnd: number;
};

export type CharInfoMessagePart = CharInfoTextPart | CharInfoCardPart;

export type CharInfoMessageProjection = {
  messageId: number;
  swipeId: number;
  parts: CharInfoMessagePart[];
  cards: CharInfoCardPart[];
  overflow: boolean;
};

type CharInfoSearchRange = {
  start: number;
  end: number;
};

type CharInfoBlockMatch = {
  start: number;
  end: number;
  content: string;
};

const CHAR_INFO_BLOCK_PATTERN = /<char_info\s*>[\s\S]*?<\/char_info\s*>/gi;
const THINK_OPEN_PATTERN = /<think\b[^>]*>/gi;
const THINK_CLOSE_PATTERN = /<\/think\s*>/gi;
const GAMETXT_OPEN_PATTERN = /<gametxt\b[^>]*>/gi;
const GAMETXT_CLOSE_PATTERN = /<\/gametxt\s*>/gi;
const DEFAULT_MAX_CARDS = 4;

function findFirstMatch(pattern: RegExp, source: string, start: number): RegExpExecArray | null {
  pattern.lastIndex = Math.max(0, start);
  const match = pattern.exec(source);
  pattern.lastIndex = 0;
  return match;
}

function findLastMatch(pattern: RegExp, source: string): RegExpExecArray | null {
  pattern.lastIndex = 0;
  let lastMatch: RegExpExecArray | null = null;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) lastMatch = match;
  pattern.lastIndex = 0;
  return lastMatch;
}

function resolveCharInfoSearchRange(source: string): CharInfoSearchRange | null {
  const lastThinkClose = findLastMatch(THINK_CLOSE_PATTERN, source);
  const afterThink = lastThinkClose ? lastThinkClose.index + lastThinkClose[0].length : 0;

  // An opening think tag without a later closing tag means the remaining raw message is still reasoning.
  if (findFirstMatch(THINK_OPEN_PATTERN, source, afterThink)) return null;

  const gametxtOpen = findFirstMatch(GAMETXT_OPEN_PATTERN, source, afterThink);
  if (gametxtOpen) {
    const start = gametxtOpen.index + gametxtOpen[0].length;
    const gametxtClose = findFirstMatch(GAMETXT_CLOSE_PATTERN, source, start);
    return { start, end: gametxtClose?.index ?? source.length };
  }

  // Keep legacy messages without an opening gametxt tag working, while still respecting a closing boundary if present.
  const gametxtClose = findFirstMatch(GAMETXT_CLOSE_PATTERN, source, afterThink);
  return { start: afterThink, end: gametxtClose?.index ?? source.length };
}

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
  const range = resolveCharInfoSearchRange(text);
  const matches: CharInfoBlockMatch[] = [];

  if (range && range.start < range.end) {
    const scopedText = text.slice(range.start, range.end);
    CHAR_INFO_BLOCK_PATTERN.lastIndex = 0;
    for (
      let match = CHAR_INFO_BLOCK_PATTERN.exec(scopedText);
      match;
      match = CHAR_INFO_BLOCK_PATTERN.exec(scopedText)
    ) {
      const start = range.start + match.index;
      const content = match[0];
      matches.push({ start, end: start + content.length, content });
      if (matches.length > cardLimit) {
        CHAR_INFO_BLOCK_PATTERN.lastIndex = 0;
        return {
          messageId,
          swipeId,
          parts: [{ kind: 'text', content: text }],
          cards: [],
          overflow: true,
        };
      }
    }
    CHAR_INFO_BLOCK_PATTERN.lastIndex = 0;
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
    const start = match.start;
    if (start > cursor) {
      parts.push({ kind: 'text', content: text.slice(cursor, start) });
    }

    const id = `${messageId}:${swipeId}:${ordinal}`;
    const card = {
      kind: 'card' as const,
      id,
      renderKey: `${id}:${hashSource(match.content)}`,
      ordinal,
      content: match.content,
      sourceStart: match.start,
      sourceEnd: match.end,
    };
    parts.push(card);
    cards.push(card);
    cursor = match.end;
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
