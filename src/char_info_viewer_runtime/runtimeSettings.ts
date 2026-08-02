import { z } from 'zod';

import { normalizeImageSourcePriority } from '../char_info_viewer/services/imageSourcePriority.ts';

export const DEFAULT_ACTIVE_FLOOR_LIMIT = 6;
export const MIN_ACTIVE_FLOOR_LIMIT = 1;
export const MAX_ACTIVE_FLOOR_LIMIT = 20;

export type CharInfoUiSettings = {
  activeFloorLimit: number;
  effectsEnabled: boolean;
  imageSourcePriority: string[];
};

export type CharInfoFloatingButtonPosition = {
  left: number;
  top: number;
};

const DEFAULT_SETTINGS: CharInfoUiSettings = {
  activeFloorLimit: DEFAULT_ACTIVE_FLOOR_LIMIT,
  effectsEnabled: true,
  imageSourcePriority: [],
};

const SettingsSchema = z
  .object({
    activeFloorLimit: z.coerce
      .number()
      .int()
      .min(MIN_ACTIVE_FLOOR_LIMIT)
      .max(MAX_ACTIVE_FLOOR_LIMIT)
      .catch(DEFAULT_SETTINGS.activeFloorLimit),
    effectsEnabled: z.boolean().catch(DEFAULT_SETTINGS.effectsEnabled),
    imageSourcePriority: z.unknown().transform(normalizeImageSourcePriority).catch(DEFAULT_SETTINGS.imageSourcePriority),
  })
  .prefault(DEFAULT_SETTINGS);

const FloatingButtonPositionSchema = z.object({
  left: z.number().finite(),
  top: z.number().finite(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeRuntimeSettings(value: unknown): CharInfoUiSettings {
  return SettingsSchema.parse(isRecord(value) ? value : {});
}

export function readRuntimeSettings(scriptVariables: unknown): CharInfoUiSettings {
  if (!isRecord(scriptVariables)) return { ...DEFAULT_SETTINGS };
  const namespace = isRecord(scriptVariables.char_info_runtime) ? scriptVariables.char_info_runtime : {};
  return normalizeRuntimeSettings(namespace.settings);
}

export function mergeRuntimeSettings(scriptVariables: unknown, settings: unknown): Record<string, unknown> {
  const root = isRecord(scriptVariables) ? { ...scriptVariables } : {};
  const namespace = isRecord(root.char_info_runtime) ? { ...root.char_info_runtime } : {};
  return {
    ...root,
    char_info_runtime: {
      ...namespace,
      settings: normalizeRuntimeSettings(settings),
    },
  };
}

export function readRuntimeFloatingButtonPosition(scriptVariables: unknown): CharInfoFloatingButtonPosition | null {
  if (!isRecord(scriptVariables)) return null;
  const namespace = isRecord(scriptVariables.char_info_runtime) ? scriptVariables.char_info_runtime : {};
  const result = FloatingButtonPositionSchema.safeParse(namespace.floatingButtonPosition);
  return result.success ? result.data : null;
}

export function mergeRuntimeFloatingButtonPosition(
  scriptVariables: unknown,
  position: CharInfoFloatingButtonPosition,
): Record<string, unknown> {
  const root = isRecord(scriptVariables) ? { ...scriptVariables } : {};
  const namespace = isRecord(root.char_info_runtime) ? { ...root.char_info_runtime } : {};
  return {
    ...root,
    char_info_runtime: {
      ...namespace,
      floatingButtonPosition: FloatingButtonPositionSchema.parse(position),
    },
  };
}

export function defaultRuntimeSettings(): CharInfoUiSettings {
  return { ...DEFAULT_SETTINGS };
}
