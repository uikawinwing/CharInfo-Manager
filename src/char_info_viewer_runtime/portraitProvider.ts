import { GENERATED_PORTRAIT_FOLDER, normalizeGeneratedPortraitUrl } from '../char_info_shared/generatedPortraitUrl.ts';
import {
  DEFAULT_PORTRAIT_REWRITE_INSTRUCTIONS,
  parseComfyPortraitPng,
  parsePortraitPrompt,
  portraitReplySchema,
  portraitRewriteInstructions,
  type PortraitFormat,
  type PortraitPrompt,
} from './portraitPrompt.ts';
import { listPortraitConnections, portraitConnectionManager, type PortraitOptions } from './portraitSettings.ts';
import { z } from 'zod';

export const PORTRAIT_PROVIDERS = ['none', 'baibai'] as const;
export type PortraitProviderId = (typeof PORTRAIT_PROVIDERS)[number];
export type PortraitStage = '资料' | '提示词' | '生图扩展' | '图片结果' | '保存图片' | '关联角色' | '读取图片';
export type PortraitPhase = 'queued' | 'rewriting' | 'requesting' | 'generating' | 'saving' | 'completed' | 'failed';

export class PortraitError extends Error {
  readonly stage: PortraitStage;
  readonly code: string;

  constructor(stage: PortraitStage, code: string, message: string) {
    super(message);
    this.stage = stage;
    this.code = code;
  }
}

export type PortraitProvider = {
  availability(): PortraitError | null;
  format(): PortraitFormat;
  preparePrompt(description: string, format: PortraitFormat, signal: AbortSignal): Promise<PortraitPrompt>;
  generate(prompt: PortraitPrompt, signal: AbortSignal, report: (phase: PortraitPhase, submitted?: PortraitPrompt) => void, name: string): Promise<string>;
};

type BaiBaiApi = {
  apiVersion: number;
  capabilities: { generate?: boolean };
  getBackendStatus(): { configured: boolean; backend: 'comfyui' | 'nai'; supportsCharacters?: boolean };
  generate(
    request: { prompt: string; nl?: string; negative?: string; characters?: { name: string; tag: string }[]; size: 'portrait'; save: false },
    options: { signal: AbortSignal; onProgress: (progress: { phase: string }) => void },
  ): Promise<{ dataUrl: string; charactersApplied?: boolean }>;
};

type BaiBaiWindow = Window & { STBaiBaiImage?: BaiBaiApi };

async function rewritePortraitPrompt(
  description: string,
  format: PortraitFormat,
  instructions: string,
  signal: AbortSignal,
  options?: PortraitOptions,
): Promise<PortraitPrompt> {
  signal.throwIfAborted();
  const generationId = `charinfo-portrait-${crypto.getRandomValues(new Uint32Array(4)).join('-')}`;
  const stop = () => stopGenerationById(generationId);
  if (!options?.independentApi) signal.addEventListener('abort', stop, { once: true });
  try {
    const messages = [
      { role: 'system' as const, content: portraitRewriteInstructions(format, instructions, options?.common, options?.[format]) },
      { role: 'user' as const, content: description },
    ];
    const schema = portraitReplySchema(format);
    let response: unknown;
    if (options?.independentApi && options.apiSource === 'custom') {
      const endpoint = z.url({ protocol: /^https?$/ }).safeParse(options.apiUrl);
      if (!endpoint.success || !options.apiModel) {
        throw new PortraitError('提示词', 'PORTRAIT_API_CONFIG_REQUIRED', '请填写有效的 HTTP / HTTPS API URL 和模型名称。');
      }
      const url = endpoint.data.replace(/\/+$/, '');
      const result = await window.parent.fetch(url.endsWith('/chat/completions') ? url : `${url}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(options.apiKey && { Authorization: `Bearer ${options.apiKey}` }) },
        body: JSON.stringify({ model: options.apiModel, messages, max_tokens: 2048, stream: false }),
        signal,
        credentials: 'omit',
      });
      if (!result.ok) {
        throw new PortraitError('提示词', 'PORTRAIT_API_HTTP_ERROR', `标签 API 请求失败（HTTP ${result.status}），请检查地址、密钥和模型。`);
      }
      const body = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })) }).safeParse(await result.json());
      response = body.success ? body.data.choices[0]?.message.content : undefined;
    } else if (options?.independentApi) {
      const manager = portraitConnectionManager();
      if (!manager || !listPortraitConnections().some(profile => profile.id === options.profileId)) {
        throw new PortraitError('提示词', 'PORTRAIT_API_PROFILE_REQUIRED', '请选择酒馆连接管理器中可用的 API 配置。');
      }
      const result = await manager.sendRequest(options.profileId, messages, 2048, {
        signal, stream: false, includePreset: false, includeInstruct: false,
      }, { json_schema: schema });
      response = result.content;
    } else {
      response = await generateRaw({
        generation_id: generationId,
        should_silence: true,
        max_chat_history: 0,
        json_schema: schema,
        ordered_prompts: messages,
      });
    }
    signal.throwIfAborted();
    const prompt = parsePortraitPrompt(format, response);
    if (!prompt) {
      throw new PortraitError('提示词', 'PORTRAIT_REWRITE_INVALID', '标签 API 没有返回所选格式的有效 JSON。请重新生成标签，或直接填写提示词。');
    }
    return prompt;
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof PortraitError) throw error;
    throw new PortraitError('提示词', 'PORTRAIT_REWRITE_FAILED', '生成标签失败。请检查 API 连接；自定义接口需允许浏览器跨域访问。也可手动填写英文提示词。');
  } finally {
    signal.removeEventListener('abort', stop);
  }
}

export function createPortraitProvider(
  id: PortraitProviderId,
  host: BaiBaiWindow,
  disabledExtensions: unknown = null,
  instructions = DEFAULT_PORTRAIT_REWRITE_INSTRUCTIONS,
  portraitOptions?: PortraitOptions,
): PortraitProvider {
  const availability = () => {
    if (id === 'none') return new PortraitError('生图扩展', 'PROVIDER_DISABLED', '请在查看器设置中选择生图扩展。');
    if (Array.isArray(disabledExtensions) && disabledExtensions.some(name => name === 'third-party/ST-BaiBai-Image')) {
      return new PortraitError('生图扩展', 'BAIBAI_DISABLED', '请在酒馆扩展管理中启用柏宝绘。');
    }
    const api = host.STBaiBaiImage;
    if (!api) {
      if (host.document?.querySelector('script[src*="/ST-BaiBai-Image/"]')) {
        return new PortraitError('生图扩展', 'BAIBAI_NOT_READY', '柏宝绘尚未就绪，请等待扩展加载完成。');
      }
      return new PortraitError('生图扩展', 'BAIBAI_NOT_FOUND', '没有检测到柏宝绘，请确认扩展已安装并启用。');
    }
    if (
      api.apiVersion !== 1 ||
      !api.capabilities?.generate ||
      typeof api.getBackendStatus !== 'function' ||
      typeof api.generate !== 'function'
    ) {
      return new PortraitError('生图扩展', 'BAIBAI_API_VERSION', '请更新柏宝绘至支持公开生图接口的版本。');
    }
    try {
      const status = api.getBackendStatus();
      if (!status.configured) {
        return new PortraitError('生图扩展', 'BACKEND_NOT_CONFIGURED', '请在柏宝绘中配置并测试当前生图渠道。');
      }
      if (status.backend === 'nai' && !status.supportsCharacters) {
        return new PortraitError('生图扩展', 'NAI_CHARACTER_PROMPT_UNAVAILABLE', '请在柏宝绘选择支持角色提示词的 NovelAI 4.5 或 V5 模型。');
      }
    } catch {
      return new PortraitError('生图扩展', 'BACKEND_STATUS_FAILED', '无法读取柏宝绘的渠道状态，请检查扩展设置。');
    }
    return null;
  };

  const format = (): PortraitFormat => host.STBaiBaiImage!.getBackendStatus().backend === 'nai' ? 'nai' : 'anima';

  return {
    availability,
    format,
    async preparePrompt(description, selectedFormat, signal) {
      return rewritePortraitPrompt(description, selectedFormat, instructions, signal, portraitOptions);
    },
    async generate(prompt, signal, report, name) {
      signal.throwIfAborted();
      const issue = availability();
      if (issue) throw issue;
      const api = host.STBaiBaiImage!;
      if (prompt.format !== format()) {
        throw new PortraitError('提示词', 'PORTRAIT_FORMAT_MISMATCH', '提示词格式与柏宝绘当前渠道不一致。请切换格式或更换柏宝绘渠道。');
      }
      try {
        const positive = portraitOptions?.positive ?? '';
        const submitted = prompt.isRequestPrompt ? prompt : {
          ...prompt,
          isRequestPrompt: true,
          tags: [positive, prompt.tags].filter(Boolean).join(', '),
          detail: prompt.format === 'anima' && prompt.detail && positive ? `${positive}. ${prompt.detail}` : prompt.detail,
          ...(prompt.format === 'anima' && portraitOptions?.negative ? { negative: portraitOptions.negative } : {}),
        };
        report('requesting', submitted);
        const result = await api.generate(
          {
            prompt: submitted.tags,
            ...(prompt.format === 'nai'
              ? { characters: [{ name, tag: submitted.detail }] }
              : { nl: submitted.detail, ...(submitted.negative !== undefined && { negative: submitted.negative }) }),
            size: 'portrait',
            save: false,
          },
          {
            signal,
            onProgress: ({ phase }) => {
              if (phase === 'generating' || phase === 'queued-remote' || phase === 'retrying') report('generating');
              if (phase === 'queued') report('requesting');
            },
          },
        );
        if (typeof result?.dataUrl !== 'string' || !result.dataUrl) {
          throw new PortraitError('图片结果', 'EMPTY_IMAGE', '生图扩展未返回图片，请检查柏宝绘后重试。');
        }
        if (prompt.format === 'nai' && !result.charactersApplied) {
          throw new PortraitError('图片结果', 'NAI_CHARACTER_PROMPT_NOT_APPLIED', '柏宝绘未应用 NovelAI 角色提示词，请检查当前渠道和模型。');
        }
        return result.dataUrl;
      } catch (error) {
        if (error instanceof PortraitError) throw error;
        const code = (error as { code?: unknown } | null)?.code;
        if (code === 'not_configured') {
          throw new PortraitError('生图扩展', 'BACKEND_NOT_CONFIGURED', '请在柏宝绘中配置并测试当前生图渠道。');
        }
        if (code === 'invalid_args') {
          throw new PortraitError('提示词', 'PROMPT_REJECTED', '柏宝绘拒绝了请求，请修改提示词后重试。');
        }
        if (code === 'rate_limited') {
          throw new PortraitError('生图扩展', 'RATE_LIMITED', '生图渠道达到限额，请稍后再试。');
        }
        if (code === 'aborted') throw new PortraitError('生图扩展', 'PROVIDER_ABORTED', '柏宝绘取消了生图请求。');
        throw new PortraitError('生图扩展', 'BACKEND_ERROR', '柏宝绘生图失败，请在扩展中检查渠道连接和任务记录。');
      }
    },
  };
}

export async function readGeneratedPortraitPrompt(url: string, signal: AbortSignal): Promise<PortraitPrompt | undefined> {
  const path = normalizeGeneratedPortraitUrl(url);
  if (!path) return undefined;
  const response = await window.parent.fetch(path, { signal });
  if (!response.ok) throw new PortraitError('读取图片', 'IMAGE_PROMPT_READ_FAILED', '无法读取这张图片的生成参数。');
  return parseComfyPortraitPng(await response.arrayBuffer());
}

export function parsePortraitDataUrl(value: string): { image: string; format: string } {
  const match = /^data:image\/(png|jpe?g|gif|webp|avif);base64,([a-z\d+/]+={0,2})$/i.exec(value);
  if (!match || match[2].length % 4 !== 0) {
    throw new PortraitError('图片结果', 'INVALID_IMAGE_DATA', '生图扩展返回的图片格式无法保存，请检查渠道输出格式。');
  }
  const [, mime, image] = match;
  return { image, format: mime.toLowerCase() === 'jpeg' ? 'jpg' : mime.toLowerCase() };
}

export async function saveGeneratedPortrait(dataUrl: string, requestId: string, signal: AbortSignal): Promise<string> {
  const { image, format } = parsePortraitDataUrl(dataUrl);
  const filename = `charinfo-${requestId}`;
  const host = window.parent;
  let saved: { path?: unknown };
  try {
    const response = await host.fetch('/api/images/upload', {
      method: 'POST',
      headers: SillyTavern.getRequestHeaders(),
      body: JSON.stringify({ image, format, filename, ch_name: GENERATED_PORTRAIT_FOLDER }),
      signal,
    });
    if (!response.ok) throw new Error();
    saved = await response.json();
  } catch {
    throw new PortraitError('保存图片', 'UPLOAD_FAILED', '酒馆未能保存图片，请检查连接或存储后重试。');
  }
  const url = normalizeGeneratedPortraitUrl(saved?.path);
  if (url !== `/user/images/${GENERATED_PORTRAIT_FOLDER}/${filename}.${format}`) {
    throw new PortraitError('保存图片', 'INVALID_SAVED_URL', '酒馆返回的图片路径无效，请检查酒馆版本和图片存储。');
  }
  const preview = host.document.createElement('img');
  preview.src = url;
  try {
    await preview.decode();
  } catch {
    throw new PortraitError(
      '读取图片',
      'IMAGE_LOAD_FAILED',
      '图片已保存，但浏览器无法读取，请检查酒馆的图片访问权限。',
    );
  }
  return url;
}
