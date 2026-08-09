import { z } from 'zod';

import { normalizeImageSourcePriority } from '../char_info_viewer/services/imageSourcePriority.ts';

export const DEFAULT_ACTIVE_FLOOR_LIMIT = 6;
export const MIN_ACTIVE_FLOOR_LIMIT = 1;
export const MAX_ACTIVE_FLOOR_LIMIT = 20;
export const DEFAULT_IMAGE_SOURCE_PRIORITY = ['files.catbox.moe', 'i.ibb.co'];

export type CharInfoUiSettings = {
  activeFloorLimit: number;
  effectsEnabled: boolean;
  forceMobileLayout: boolean;
  imageSourcePriorityEnabled: boolean;
  imageSourcePriority: string[];
};

export type CharInfoFloatingButtonPosition = {
  left: number;
  top: number;
};

const DEFAULT_SETTINGS: CharInfoUiSettings = {
  activeFloorLimit: DEFAULT_ACTIVE_FLOOR_LIMIT,
  effectsEnabled: true,
  forceMobileLayout: false,
  imageSourcePriorityEnabled: false,
  imageSourcePriority: [...DEFAULT_IMAGE_SOURCE_PRIORITY],
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
    forceMobileLayout: z.boolean().catch(DEFAULT_SETTINGS.forceMobileLayout),
    imageSourcePriorityEnabled: z.boolean().catch(DEFAULT_SETTINGS.imageSourcePriorityEnabled),
    imageSourcePriority: z
      .unknown()
      .default([...DEFAULT_SETTINGS.imageSourcePriority])
      .transform(normalizeImageSourcePriority)
      .catch([...DEFAULT_SETTINGS.imageSourcePriority]),
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
  const source = isRecord(value) ? value : {};
  const normalized = SettingsSchema.parse(source);

  // 旧版本只保存优先级列表。迁移时保持其原有启用行为；全新设置默认关闭，避免改变图片顺序。
  if (
    !Object.prototype.hasOwnProperty.call(source, 'imageSourcePriorityEnabled') &&
    Object.prototype.hasOwnProperty.call(source, 'imageSourcePriority')
  ) {
    normalized.imageSourcePriorityEnabled = normalized.imageSourcePriority.length > 0;
  }

  return {
    ...normalized,
    imageSourcePriority: [...normalized.imageSourcePriority],
  };
}

export function readRuntimeSettings(scriptVariables: unknown): CharInfoUiSettings {
  if (!isRecord(scriptVariables)) return defaultRuntimeSettings();
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
  return {
    ...DEFAULT_SETTINGS,
    imageSourcePriority: [...DEFAULT_SETTINGS.imageSourcePriority],
  };
}
