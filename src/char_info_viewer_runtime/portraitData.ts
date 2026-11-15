import { normalizeGeneratedPortraitUrl } from '../char_info_shared/generatedPortraitUrl.ts';
import { z } from 'zod';
import type { PortraitJobStatus } from './portraitJobs.ts';
import type { CharacterData } from '../char_info_viewer/types';

export type PortraitAnchor = { messageId: number; swipeId: number; renderKey?: string };

export type PortraitTarget = {
  name: string;
  key: string;
  prompt: string;
  anchor?: PortraitAnchor;
  relationship?: boolean;
  chatId?: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function describe(value: unknown): string {
  if (typeof value === 'string') return value.trim().replace(/\s+/gu, ' ');
  if (Array.isArray(value)) return value.map(describe).filter(Boolean).join('，');
  return Object.entries(record(value))
    .flatMap(([label, item]) => {
      const description = describe(item);
      return description ? [`${label} ${description}`] : [];
    })
    .join('，');
}

function features(data: CharacterData) {
  return {
    race: describe(data.种族),
    sex: describe(data.性别),
    identity: describe(data.身份),
    appearance: describe(data.外貌特质 ?? data.外貌),
    attire: describe(data.衣物装饰 ?? data.着装),
  };
}

export function buildPortraitTarget(
  data: CharacterData,
  anchor?: PortraitAnchor,
  relationship = false,
  sameNameInMessage = false,
): PortraitTarget | undefined {
  const name = typeof data.姓名 === 'string' ? data.姓名.trim() : '';
  if (!name) return undefined;
  const { race, sex, identity, appearance, attire } = features(data);
  const prompt = appearance ? [name, race, sex, appearance, attire].filter(Boolean).join('，') : '';
  // The same name can refer to different NPCs, including between alternate swipes.
  const key =
    sameNameInMessage || (!relationship && !appearance)
      ? JSON.stringify(['card', anchor?.renderKey])
      : JSON.stringify(['npc', name, race, sex, identity, appearance]);
  return { name, key, prompt, anchor, relationship };
}

export function canSharePortrait(story: CharacterData, relationship: CharacterData): boolean {
  const left = features(story);
  const right = features(relationship);
  const conflicts = (['race', 'sex', 'identity'] as const).some(
    key => left[key] && right[key] && left[key] !== right[key],
  );
  return !conflicts && Boolean(left.appearance && left.appearance === right.appearance);
}

export function readGeneratedPortrait(variables: unknown, key: string): string {
  const entries = record(record(record(variables).char_info).generated_images);
  const entry = record(Object.hasOwn(entries, key) ? entries[key] : undefined);
  return entry.version === 1 ? normalizeGeneratedPortraitUrl(entry.url) : '';
}

export function readPortraitAttempt(variables: unknown, name: string): boolean {
  const attempts = record(record(record(variables).char_info).generated_image_attempts);
  const key = JSON.stringify(name);
  return Object.hasOwn(attempts, key) && attempts[key] === true;
}

export function mergeGeneratedPortrait(variables: Record<string, unknown>, key: string, url: string) {
  const charInfo = record(variables.char_info);
  return {
    ...variables,
    char_info: {
      ...charInfo,
      generated_images: { ...record(charInfo.generated_images), [key]: { version: 1, url } },
    },
  };
}

export function mergePortraitAttempt(variables: Record<string, unknown>, name: string) {
  const charInfo = record(variables.char_info);
  return {
    ...variables,
    char_info: {
      ...charInfo,
      generated_image_attempts: { ...record(charInfo.generated_image_attempts), [JSON.stringify(name)]: true },
    },
  };
}

const HistoryEntrySchema = z.object({
  name: z.string(),
  time: z.number().finite(),
  phase: z.enum(['completed', 'failed']),
  description: z.string().optional(),
  prompt: z.object({
    format: z.enum(['anima', 'nai']),
    tags: z.string(),
    detail: z.string(),
    negative: z.string().optional(),
    isRequestPrompt: z.boolean().optional(),
  }).optional(),
  issue: z.object({ stage: z.string(), code: z.string(), message: z.string() }).optional(),
  imageUrl: z.string().transform(normalizeGeneratedPortraitUrl).optional(),
});

const HISTORY_LIMIT = 40;

export function readPortraitHistory(variables: unknown): z.infer<typeof HistoryEntrySchema>[] {
  const history = record(record(variables).char_info).generated_image_history;
  if (!Array.isArray(history)) return [];
  return history.slice(0, HISTORY_LIMIT).flatMap(value => {
    const entry = HistoryEntrySchema.safeParse(value);
    return entry.success ? [entry.data] : [];
  });
}

export function mergePortraitHistory(variables: Record<string, unknown>, status: PortraitJobStatus) {
  return {
    ...variables,
    char_info: {
      ...record(variables.char_info),
      generated_image_history: [{
        name: status.name,
        time: Date.now(),
        phase: status.phase,
        description: status.description,
        prompt: status.requestPrompt ?? status.sentPrompt,
        issue: status.issue,
        imageUrl: status.imageUrl,
      }, ...readPortraitHistory(variables)].slice(0, HISTORY_LIMIT),
    },
  };
}
