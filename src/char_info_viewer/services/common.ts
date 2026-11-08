export function hasText(val: unknown): boolean {
  if (!val) return false;
  const s = normalizeDisplayText(val).toLowerCase();
  return s !== '' && s !== 'null' && s !== 'none' && s !== '[]';
}

export function hasArrayContent(arr: unknown): arr is unknown[] {
  return Array.isArray(arr) && arr.length > 0;
}

export function parseAttributeValue(val: unknown): number {
  if (val === undefined || val === null) return 0;
  const str = normalizeDisplayText(val);
  if (str.includes('=')) {
    const parts = str.split('=');
    const lastPart = parts[parts.length - 1].trim();
    return parseInt(lastPart, 10) || 0;
  }
  return parseInt(str, 10) || 0;
}

export function normalizeDisplayText(input: unknown): string {
  let text = String(input ?? '').trim();

  while (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    const wrappedByDouble = first === '"' && last === '"';
    const wrappedBySingle = first === "'" && last === "'";
    if (!wrappedByDouble && !wrappedBySingle) break;

    const inner = text.slice(1, -1).trim();
    if (!inner) {
      text = '';
      break;
    }

    text = inner;
  }

  return text;
}

export function textFromUnknown(value: unknown): string {
  if (Array.isArray(value)) return value.map(textFromUnknown).filter(Boolean).join(' / ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, val]) => {
        const content = textFromUnknown(val);
        return content ? `${key}: ${content}` : '';
      })
      .filter(Boolean)
      .join('； ');
  }
  return typeof value === 'string' ? normalizeDisplayText(value) : String(value ?? '');
}

export function formatSkillCost(value: unknown): string {
  if (typeof value === 'string') return getSmartArray(value).join(' / ') || textFromUnknown(value);
  return textFromUnknown(value);
}

function isItemRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asNamedObjectArray(input: unknown, allowInventoryShorthand = false): Record<string, any>[] {
  if (Array.isArray(input)) {
    return input.flatMap(item => {
      if (isItemRecord(item)) return [item];
      if (allowInventoryShorthand && typeof item === 'string' && item.trim()) return [{ 名称: item }];
      return [];
    });
  }
  if (!isItemRecord(input)) return [];
  if (typeof input.名称 === 'string' && input.名称.trim()) return [input];

  return Object.entries(input).flatMap(([name, item]) => {
    if (isItemRecord(item)) return [{ ...item, 名称: textFromUnknown(item.名称) || name }];
    if (allowInventoryShorthand && (typeof item === 'number' || (typeof item === 'string' && item.trim()))) {
      if (Number.isFinite(Number(item))) return [{ 名称: name, 数量: item }];
    }
    return [];
  });
}

export function asDivinityAbilityArray(input: unknown): Record<string, any>[] {
  return asNamedObjectArray(input).map(item => {
    if (item.效果 != null) return item;
    const { 名称, ...effects } = item;
    return { 名称, 效果: effects };
  });
}

export function readItemQuantity(item: Record<string, unknown>): unknown {
  return item.数量 !== undefined ? item.数量 : item.數量 ?? item.持有数量 ?? item.持有數量;
}

function splitSmartList(input: string): string[] {
  const items: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  const normalizeListItem = (value: string) =>
    normalizeDisplayText(
      normalizeDisplayText(value)
        .replace(/^(?:\[|\()+|(?:\]|\))+$/g, '')
        .trim(),
    );

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const prev = index > 0 ? input[index - 1] : '';

    if (char === '"' && prev !== '\\' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === "'" && prev !== '\\' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    const isDelimiter = /[,;|，；、]/.test(char);
    if (isDelimiter && !inSingleQuote && !inDoubleQuote) {
      const normalized = normalizeListItem(current);
      if (normalized && normalized.toLowerCase() !== 'null' && normalized.toLowerCase() !== 'none') {
        items.push(normalized);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const normalized = normalizeListItem(current);
  if (normalized && normalized.toLowerCase() !== 'null' && normalized.toLowerCase() !== 'none') {
    items.push(normalized);
  }

  return items;
}

export function getSmartArray(input: unknown): string[] {
  if (input === undefined || input === null) return [];
  if (Array.isArray(input)) {
    return input.map(item => normalizeDisplayText(item)).filter(Boolean);
  }

  const str = String(input).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'none') return [];

  const processed = str.replace(/\]\s*\[/g, '],[').trim();
  const content = processed.startsWith('[') && processed.endsWith(']') ? processed.slice(1, -1) : processed;
  return splitSmartList(content);
}

export function escapeHtml(str: unknown): string {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}
