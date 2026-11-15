import { z } from 'zod';
import { DEFAULT_PORTRAIT_MODEL_INSTRUCTIONS } from './portraitPrompt.ts';

export const PortraitOptionsSchema = z.object({
  independentApi: z.boolean().catch(false),
  profileId: z.string().catch(''),
  apiSource: z.enum(['profile', 'custom']).catch('profile'),
  apiUrl: z.string().trim().catch(''),
  apiKey: z.string().trim().catch(''),
  apiModel: z.string().trim().catch(''),
  common: z.string().trim().catch(''),
  anima: z.string().trim().min(1).catch(DEFAULT_PORTRAIT_MODEL_INSTRUCTIONS.anima),
  nai: z.string().trim().min(1).catch(DEFAULT_PORTRAIT_MODEL_INSTRUCTIONS.nai),
  positive: z.string().trim().catch(''),
  negative: z.string().trim().catch(''),
}).prefault({});

export type PortraitOptions = z.infer<typeof PortraitOptionsSchema>;

type ConnectionProfile = { id: string; name: string };
type ConnectionManager = {
  getSupportedProfiles(): ConnectionProfile[];
  sendRequest(
    profileId: string,
    prompts: { role: 'system' | 'user'; content: string }[],
    maxTokens: number,
    options: { signal: AbortSignal; stream: false; includePreset: false; includeInstruct: false },
    payload: { json_schema: JsonSchema },
  ): Promise<{ content?: string }>;
};

export function portraitConnectionManager(): ConnectionManager | undefined {
  return SillyTavern.ConnectionManagerRequestService;
}

export function listPortraitConnections(): ConnectionProfile[] {
  try {
    return portraitConnectionManager()?.getSupportedProfiles().map(({ id, name }) => ({ id, name })) ?? [];
  } catch {
    return [];
  }
}
