import assert from 'node:assert/strict';
import { setImmediate, setTimeout } from 'node:timers/promises';
import test from 'node:test';

import { normalizeGeneratedPortraitUrl } from '../../src/char_info_shared/generatedPortraitUrl.ts';
import { projectCharInfoMessage } from '../../src/char_info_viewer/runtime/charInfoMessage.ts';
import {
  isSpecialNpcVisualData,
  resolveCharacterVisualConfigWithExtensions,
} from '../../src/char_info_viewer/services/themeService.ts';
import {
  buildPortraitTarget,
  canSharePortrait,
  mergeGeneratedPortrait,
  mergePortraitHistory,
  mergePortraitAttempt,
  readGeneratedPortrait,
  readPortraitAttempt,
  readPortraitHistory,
} from '../../src/char_info_viewer_runtime/portraitData.ts';
import { createPortraitJobs } from '../../src/char_info_viewer_runtime/portraitJobs.ts';
import { collectCurrentCharacterSnapshots } from '../../src/char_info_viewer_runtime/currentCharacterLibrary.ts';
import {
  createPortraitProvider,
  parsePortraitDataUrl,
  PortraitError,
} from '../../src/char_info_viewer_runtime/portraitProvider.ts';
import { createPortraitRuntime, readStoryPortraits } from '../../src/char_info_viewer_runtime/portraitRuntime.ts';
import { parseComfyPortraitPng, parsePortraitPrompt } from '../../src/char_info_viewer_runtime/portraitPrompt.ts';
import { PortraitOptionsSchema } from '../../src/char_info_viewer_runtime/portraitSettings.ts';

const url = '/user/images/charinfo-generated/charinfo-01234567abcd4abc9abc123456789012.png';
const dataUrl = 'data:image/png;base64,AAAA';
const npc = { 姓名: '青栀', 种族: '精灵', 性别: '女', 外貌: { 眼睛: '绿色' }, 着装: ['白袍', '皮靴'] };
const target = buildPortraitTarget(npc, { messageId: 7, swipeId: 0, renderKey: '7:0:0:abc' });
const animaPrompt = (tags, detail = '') => ({ format: 'anima', tags, detail });

function deferred() {
  let resolve;
  const promise = new Promise(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function harness(overrides = {}) {
  const statuses = [];
  const bound = [];
  const requests = [];
  const jobs = createPortraitJobs({
    provider: () => ({
      availability: () => null,
      format: () => 'anima',
      preparePrompt: async description => animaPrompt(description),
      generate: async (prompt, _signal, report) => {
        requests.push(prompt.tags);
        report('requesting');
        report('generating');
        return dataUrl;
      },
    }),
    isCurrent: () => true,
    hasAuthoredImage: async () => false,
    claimAutomatic: () => true,
    save: async () => url,
    bind: (npc, image) => bound.push([npc.key, image]),
    report: (_npc, status) => statuses.push(status),
    ...overrides,
  });
  return { jobs, statuses, bound, requests };
}

test('提示词来自现有字段，同名剧情卡不会共享各自的身份', () => {
  assert.match(target.prompt, /青栀.*精灵.*女.*眼睛 绿色.*白袍.*皮靴/);
  assert.equal(buildPortraitTarget({ 姓名: '青栀', 种族: '精灵' }).prompt, '');
  const first = buildPortraitTarget(npc, { ...target.anchor, renderKey: '7:0:0:abc' }, false, true);
  const second = buildPortraitTarget(npc, { ...target.anchor, renderKey: '7:0:1:def' }, false, true);
  assert.notEqual(first.key, second.key);
  assert.equal(buildPortraitTarget(npc, undefined, true).key, target.key);
  assert.notEqual(buildPortraitTarget({ ...npc, 外貌: '黑色短发' }, undefined, true).key, target.key);
  assert.equal(canSharePortrait(npc, { ...npc, 外貌: '黑色短发' }), false);
  assert.equal(canSharePortrait(npc, { ...npc, 外貌特质: npc.外貌 }), true);
});

test('聊天变量合并保留作者档案、状态栏和已有图片，严格校验持久路径', () => {
  const profile = { gallery: [{ sources: ['https://example.test/authored.png'] }] };
  const original = { char_info: { profiles: { 青栀: profile } }, status: { untouched: true } };
  const withAttempt = mergePortraitAttempt(original, '__proto__');
  const withPortrait = mergeGeneratedPortrait(withAttempt, target.key, url);
  const updated = mergeGeneratedPortrait(withPortrait, 'other', url);
  assert.equal(updated.char_info.profiles.青栀, profile);
  assert.equal(updated.status, original.status);
  assert.equal(readPortraitAttempt(updated, '__proto__'), true);
  assert.equal(readPortraitAttempt(original, '__proto__'), false);
  assert.equal(readGeneratedPortrait(updated, target.key), url);
  assert.equal(readGeneratedPortrait(updated, 'other'), url);
  assert.equal(normalizeGeneratedPortraitUrl(url.slice(1)), url);
  for (const invalid of [
    `//example.test${url}`,
    `https://example.test${url}`,
    `${url}?q=1`,
    '/user/images/../test.png',
    url.replace('01234567', '%2fabcde'),
    'blob:https://example.test/1',
    'data:image/png;base64,AAAA',
    url.replace('.png', '.svg'),
  ])
    assert.equal(normalizeGeneratedPortraitUrl(invalid), '');
});

test('历史保留实际发送的生成参数，旧记录仍可读取', () => {
  const sentPrompt = animaPrompt('1girl, silver hair', 'A character standing by a window.');
  const requestPrompt = { ...animaPrompt('fixed style, 1girl, silver hair', sentPrompt.detail), isRequestPrompt: true };
  const original = {
    char_info: {
      generated_image_history: [{ name: '旧角色', time: 1, phase: 'completed', prompt: sentPrompt, imageUrl: url }],
    },
  };
  const updated = mergePortraitHistory(original, {
    key: target.key,
    name: npc.姓名,
    phase: 'completed',
    description: target.prompt,
    sentPrompt,
    requestPrompt,
    imageUrl: url,
  });
  const history = readPortraitHistory(updated);
  assert.deepEqual(history[0].prompt, requestPrompt);
  assert.equal(history[0].description, target.prompt);
  assert.equal(history[0].imageUrl, url);
  assert.equal(history[1].name, '旧角色');
  assert.equal(history[1].prompt.isRequestPrompt, undefined);
});

test('作者图库和状态栏图片优先，生成图片沿用立绘角色卡', async () => {
  const generated = await resolveCharacterVisualConfigWithExtensions(npc, {}, url);
  assert.equal(generated.角色图片, url);
  assert.equal(isSpecialNpcVisualData(generated), true);
  const authorUrl = 'https://example.test/authored.png';
  const authored = await resolveCharacterVisualConfigWithExtensions(
    npc,
    {
      char_info: { profiles: { 青栀: { gallery: [{ sources: [authorUrl] }] } } },
    },
    url,
  );
  assert.equal(authored.角色图片, authorUrl);
  const status = await resolveCharacterVisualConfigWithExtensions(
    npc,
    {
      status: { externalAvatars: { partners: { 青栀: { url: authorUrl } } } },
    },
    url,
  );
  assert.equal(isSpecialNpcVisualData(status), false);
  assert.notEqual(status.角色图片, url);
});

test('同一个 NPC 的重复点击只请求一次，并经过保存和绑定', async () => {
  const { jobs, statuses, bound, requests } = harness();
  const edited = animaPrompt('elf, green eyes', 'An elf looks up into the light.');
  jobs.enqueue(target, '  精灵立绘  ', false, edited);
  jobs.enqueue(target, '重复');
  await setImmediate();
  assert.deepEqual(requests, ['elf, green eyes']);
  assert.deepEqual(bound, [[target.key, url]]);
  assert.equal(statuses.at(-1).description, '精灵立绘');
  assert.deepEqual(statuses.at(-1).sentPrompt, edited);
  assert.equal(statuses.at(-1).imageUrl, url);
  assert.deepEqual(
    statuses.map(status => status.phase),
    ['queued', 'requesting', 'generating', 'saving', 'completed'],
  );
});

test('超时释放队列，忽略旧请求迟到的结果，且可手动重试', async () => {
  const pending = deferred();
  let callCount = 0;
  const { jobs, statuses, bound } = harness({
    timeoutMs: 10,
    provider: () => ({
      availability: () => null,
      generate: () => (++callCount === 1 ? pending.promise : Promise.resolve(dataUrl)),
    }),
  });
  jobs.enqueue(target, '第一次请求', false, animaPrompt('first'));
  await setTimeout(35);
  assert.equal(statuses.at(-1).issue.code, 'REQUEST_TIMEOUT');
  jobs.enqueue(target, '重试', false, animaPrompt('retry'));
  await setImmediate();
  pending.resolve(dataUrl);
  await setImmediate();
  assert.deepEqual(bound, [[target.key, url]]);
  assert.equal(statuses.at(-1).phase, 'completed');
});

test('聊天切换或来源失效后，旧结果不会绑定，队列仍可处理其他角色', async () => {
  const pending = deferred();
  let current = true;
  const { jobs, statuses, bound } = harness({
    isCurrent: npc => npc.key !== target.key || current,
    provider: () => ({
      availability: () => null,
      generate: prompt => (prompt.tags === 'old chat' ? pending.promise : Promise.resolve(dataUrl)),
    }),
  });
  const other = { ...target, name: '夏夜', key: 'other' };
  jobs.enqueue(target, '旧聊天', false, animaPrompt('old chat'));
  jobs.enqueue(other, '新聊天', false, animaPrompt('new chat'));
  await setImmediate();
  current = false;
  pending.resolve(dataUrl);
  await setImmediate();
  assert.deepEqual(bound, [[other.key, url]]);
  assert.equal(statuses.includes(undefined), true);
});

test('自动请求在出队时检查开关和作者图片，保存失败显示实际阶段', async () => {
  const disabled = harness({ claimAutomatic: () => false });
  disabled.jobs.enqueue(target, target.prompt, true);
  const authored = harness({ hasAuthoredImage: async () => true });
  authored.jobs.enqueue(target, target.prompt, true);
  const upload = harness({
    save: async () => {
      throw new PortraitError('保存图片', 'UPLOAD_FAILED', '上传失败');
    },
  });
  upload.jobs.enqueue(target, target.prompt);
  await setImmediate();
  assert.deepEqual(disabled.requests, []);
  assert.deepEqual(authored.requests, []);
  assert.deepEqual(upload.bound, []);
  assert.equal(upload.statuses.at(-1).issue.stage, '保存图片');
});

test('柏宝绘按公开 v1 接口请求，保持插件自动保存关闭并过滤原始错误信息', async () => {
  const calls = [];
  const host = {
    STBaiBaiImage: {
      apiVersion: 1,
      capabilities: { generate: true },
      getBackendStatus: () => ({ configured: true, backend: 'comfyui' }),
      generate: async (request, options) => {
        calls.push(request);
        options.onProgress({ phase: 'generating' });
        return { dataUrl };
      },
    },
  };
  const provider = createPortraitProvider('baibai', host);
  assert.equal(provider.availability(), null);
  assert.equal(await provider.generate(animaPrompt('green eyes'), new AbortController().signal, phase => calls.push(phase), '青栀'), dataUrl);
  assert.deepEqual(calls, ['requesting', { prompt: 'green eyes', nl: '', size: 'portrait', save: false }, 'generating']);
  host.STBaiBaiImage.generate = async () => {
    throw { code: 'backend_error', message: 'secret-response' };
  };
  await assert.rejects(
    provider.generate(animaPrompt('green eyes'), new AbortController().signal, () => {}, '青栀'),
    error => error.code === 'BACKEND_ERROR' && !error.message.includes('secret-response'),
  );
  assert.equal(createPortraitProvider('none', host).availability().code, 'PROVIDER_DISABLED');
  assert.deepEqual(parsePortraitDataUrl('data:image/jpeg;base64,AAAA'), { image: 'AAAA', format: 'jpg' });
  assert.throws(() => parsePortraitDataUrl('data:image/svg+xml;base64,AAAA'), { code: 'INVALID_IMAGE_DATA' });
});

test('酒馆改写采用所选模型协议，确认后按各自的公开接口字段发给柏宝绘', async t => {
  const calls = [];
  const controller = new AbortController();
  let backend = 'comfyui';
  let supportsCharacters = true;
  const api = {
    apiVersion: 1,
    capabilities: { generate: true },
    getBackendStatus: () => ({ configured: true, backend, supportsCharacters: backend === 'nai' && supportsCharacters }),
    async generate(request) {
      calls.push(request);
      return { dataUrl, charactersApplied: backend === 'nai' };
    },
  };
  const caption = 'A purple-haired woman turns in a dim hall. Warm light catches her dark gold horns.';
  let reply = JSON.stringify({ tags: ['purple hair', 'ram horns', 'black gown'], caption });
  const originalGenerateRaw = globalThis.generateRaw;
  globalThis.generateRaw = async config => {
    calls.push(config);
    return reply;
  };
  t.after(() => {
    if (originalGenerateRaw === undefined) delete globalThis.generateRaw;
    else globalThis.generateRaw = originalGenerateRaw;
  });
  const instructions = 'Preserve the color of each accessory.';
  const provider = createPortraitProvider('baibai', { STBaiBaiImage: api }, null, instructions);
  assert.equal(provider.format(), 'anima');
  assert.deepEqual(await provider.preparePrompt('紫发，羊角，黑裙', 'anima', controller.signal), animaPrompt('purple hair, ram horns, black gown', caption));
  assert.equal(calls.length, 1, '改写预览阶段不会请求生图');
  assert.equal(calls[0].should_silence, true);
  assert.equal(calls[0].max_chat_history, 0);
  assert.deepEqual(calls[0].json_schema.value.required, ['tags', 'caption']);
  assert.equal(calls[0].ordered_prompts.length, 2);
  assert.ok(calls[0].ordered_prompts[0].content.includes(instructions));
  assert.ok(calls[0].ordered_prompts[0].content.includes('"caption"'));
  assert.deepEqual(calls[0].ordered_prompts[1], { role: 'user', content: '紫发，羊角，黑裙' });
  const edited = animaPrompt('purple hair, ram horns, black gown, gold crown', caption);
  await provider.generate(edited, controller.signal, () => {}, '倪克丝');
  assert.deepEqual(calls[1], { prompt: edited.tags, nl: caption, size: 'portrait', save: false });
  reply = '紫发';
  await assert.rejects(provider.preparePrompt('紫发', 'anima', controller.signal), { code: 'PORTRAIT_REWRITE_INVALID' });
  assert.equal(calls.length, 3);
  backend = 'nai';
  assert.equal(provider.format(), 'nai');
  await assert.rejects(provider.generate(edited, controller.signal, () => {}, '倪克丝'), { code: 'PORTRAIT_FORMAT_MISMATCH' });
  assert.equal(calls.length, 3, '渠道不匹配时不发送生图请求');
  reply = JSON.stringify({ base_tags: ['1girl', 'solo', 'upper body'], character_tags: ['girl', 'purple hair'] });
  const nai = await provider.preparePrompt('紫发', 'nai', controller.signal);
  assert.deepEqual(calls[3].json_schema.value.required, ['base_tags', 'character_tags']);
  assert.match(calls[3].ordered_prompts[0].content, /"character_tags"/);
  await provider.generate(nai, controller.signal, () => {}, '倪克丝');
  assert.deepEqual(calls[4], {
    prompt: '1girl, solo, upper body',
    characters: [{ name: '倪克丝', tag: 'girl, purple hair' }],
    size: 'portrait',
    save: false,
  });
  supportsCharacters = false;
  assert.equal(provider.availability().code, 'NAI_CHARACTER_PROMPT_UNAVAILABLE');
  assert.deepEqual(await provider.preparePrompt('紫发', 'nai', controller.signal), nai, '标签生成独立于生图渠道可用性');
  await assert.rejects(provider.generate(nai, controller.signal, () => {}, '倪克丝'), { code: 'NAI_CHARACTER_PROMPT_UNAVAILABLE' });
  assert.equal(calls.length, 6);
});

test('只接受一份可见的最终 JSON，拒绝错误模型字段、解释、未闭合思考和无效标签', () => {
  const valid = JSON.stringify({ tags: ['1girl', 'solo'], caption: 'A woman looks up. Light crosses her face.' });
  assert.deepEqual(
    parsePortraitPrompt('anima', '<think>draft</think>\n' + '```json\n' + valid + '\n```'),
    animaPrompt('1girl, solo', 'A woman looks up. Light crosses her face.'),
  );
  for (const reply of [
    null, 'purple hair', '<think>' + valid, '<think>' + valid + '</think>',
    '<think><think>draft</think>' + valid, valid + '\n' + valid, 'Here is the result:\n' + valid,
    '{"tags":["1girl"],"caption":" "}', '{"tags":["1girl, solo"],"caption":"A woman looks up."}',
    '{"tags":["紫色头发"],"caption":"A woman looks up."}',
    '{"tags":["1girl"],"caption":"A woman looks up.","explanation":"draft"}',
    '{"base_tags":["solo"],"character_tags":["green eyes"]}',
  ]) assert.equal(parsePortraitPrompt('anima', reply), undefined, String(reply));
  assert.equal(parsePortraitPrompt('nai', valid), undefined);
});

test('从 PNG 的 ComfyUI 记录读取采样器实际使用的正负提示词', () => {
  const graph = {
    '1': { class_type: 'CLIPTextEncode', inputs: { text: 'unused text' } },
    '4': { class_type: 'CLIPTextEncode', inputs: { text: '1girl, solo, purple hair' } },
    '5': { class_type: 'CLIPTextEncode', inputs: { text: '' } },
    '8': { class_type: 'KSampler', inputs: { positive: ['4', 0], negative: ['5', 0] } },
  };
  const png = value => {
    const encoder = new TextEncoder();
    const text = encoder.encode(`prompt\0${JSON.stringify(value)}`);
    const bytes = new Uint8Array(text.length + 20);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    new DataView(bytes.buffer).setUint32(8, text.length);
    bytes.set(encoder.encode('tEXt'), 12);
    bytes.set(text, 16);
    return bytes.buffer;
  };
  const image = png(graph);
  assert.deepEqual(parseComfyPortraitPng(image), {
    format: 'anima', tags: '1girl, solo, purple hair', detail: '', negative: '', isRequestPrompt: true,
  });
  assert.equal(parseComfyPortraitPng(new ArrayBuffer(0)), undefined);
  assert.equal(parseComfyPortraitPng(image.slice(0, -8)), undefined);
  assert.equal(parseComfyPortraitPng(png({ ...graph, '9': graph['8'] })), undefined);
});

test('独立改写使用酒馆连接配置，固定提示词进入实际 ComfyUI 请求', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'SillyTavern');
  const independentCalls = [];
  const imageCalls = [];
  Object.defineProperty(globalThis, 'SillyTavern', {
    configurable: true,
    value: {
      ConnectionManagerRequestService: {
        getSupportedProfiles: () => [{ id: 'saved-profile', name: 'Saved' }],
        async sendRequest(...args) {
          independentCalls.push(args);
          return { content: JSON.stringify({ tags: ['solo'], caption: 'A traveler waits under a bridge.' }) };
        },
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'SillyTavern', original);
    else delete globalThis.SillyTavern;
  });
  const options = PortraitOptionsSchema.parse({
    independentApi: true, profileId: 'saved-profile', common: 'Common visual guidance.',
    anima: 'Anima guidance.', nai: 'NovelAI guidance.', positive: 'ink drawing', negative: 'blurry',
  });
  const provider = createPortraitProvider('baibai', {
    STBaiBaiImage: {
      apiVersion: 1,
      capabilities: { generate: true },
      getBackendStatus: () => ({ configured: true, backend: 'comfyui' }),
      async generate(request) { imageCalls.push(request); return { dataUrl }; },
    },
  }, null, 'Compose a wide view.', options);
  const signal = new AbortController().signal;
  const prompt = await provider.preparePrompt('青栀', 'anima', signal);
  const [profileId, messages, , requestOptions, requestPayload] = independentCalls[0];
  assert.equal(profileId, 'saved-profile');
  assert.match(messages[0].content, /Common visual guidance\./u);
  assert.match(messages[0].content, /Anima guidance\./u);
  assert.doesNotMatch(messages[0].content, /NovelAI guidance\./u);
  assert.equal(requestOptions.includePreset, false);
  assert.equal(requestPayload.json_schema.name, 'charinfo_portrait_anima');
  let submitted;
  await provider.generate(prompt, signal, (_phase, request) => { submitted ??= request; }, '青栀');
  assert.deepEqual(imageCalls[0], {
    prompt: 'ink drawing, solo', nl: 'ink drawing. A traveler waits under a bridge.',
    negative: 'blurry', size: 'portrait', save: false,
  });
  assert.equal(submitted.negative, 'blurry');
  const editedRequest = {
    format: 'anima', tags: 'ink drawing, solo, purple hair', detail: '', negative: '', isRequestPrompt: true,
  };
  await provider.generate(editedRequest, signal, () => {}, '青栀');
  assert.deepEqual(imageCalls[1], {
    prompt: editedRequest.tags, nl: '', negative: '', size: 'portrait', save: false,
  });
});

test('自定义标签 API 使用 OpenAI 兼容请求，检查配置、HTTP 错误和取消', async t => {
  const calls = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let response = { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ tags: ['solo'], caption: 'A traveler by the sea.' }) } }] }) };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { parent: { fetch: async (...args) => { calls.push(args); return response; } } },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete globalThis.window;
  });
  const options = PortraitOptionsSchema.parse({ independentApi: true, apiSource: 'custom', apiUrl: 'https://example.test/v1/', apiKey: 'test-only-key', apiModel: 'test-model' });
  const provider = config => createPortraitProvider('none', {}, null, 'Frame a character.', config);
  const signal = new AbortController().signal;
  assert.equal((await provider(options).preparePrompt('角色资料', 'anima', signal)).tags, 'solo');
  assert.equal(calls[0][0], 'https://example.test/v1/chat/completions');
  const request = calls[0][1];
  assert.equal(request.headers.Authorization, 'Bearer test-only-key');
  assert.equal(request.credentials, 'omit');
  assert.equal(request.signal, signal);
  assert.deepEqual(JSON.parse(request.body), {
    model: 'test-model', messages: [
      { role: 'system', content: JSON.parse(request.body).messages[0].content },
      { role: 'user', content: '角色资料' },
    ], max_tokens: 2048, stream: false,
  });
  await provider({ ...options, apiUrl: 'http://localhost:9000/v1/chat/completions', apiKey: '' }).preparePrompt('角色', 'anima', signal);
  assert.equal(calls[1][0], 'http://localhost:9000/v1/chat/completions');
  assert.equal(Object.hasOwn(calls[1][1].headers, 'Authorization'), false);
  for (const invalid of [{ apiUrl: '' }, { apiUrl: 'file:///secret' }, { apiModel: '' }]) {
    await assert.rejects(provider({ ...options, ...invalid }).preparePrompt('角色', 'anima', signal), { code: 'PORTRAIT_API_CONFIG_REQUIRED' });
  }
  assert.equal(calls.length, 2);
  response = { ok: false, status: 401 };
  await assert.rejects(provider(options).preparePrompt('角色', 'anima', signal), { code: 'PORTRAIT_API_HTTP_ERROR' });
  response = { ok: true, json: async () => ({ choices: [] }) };
  await assert.rejects(provider(options).preparePrompt('角色', 'anima', signal), { code: 'PORTRAIT_REWRITE_INVALID' });
  const cancelled = AbortSignal.abort();
  await assert.rejects(provider(options).preparePrompt('角色', 'anima', cancelled), { name: 'AbortError' });
  assert.equal(calls.length, 4);
});

test('运行时只为新楼层首次出现的 NPC 生图，覆盖剧情和延迟同步的 MVU 资料', async t => {
  const names = ['旧角色', '新面孔', '晚到角色'];
  const textFor = name => `<char_info>\n姓名: ${name}\n种族: 人类\n等级: 3\n外貌特质: 银色短发\n</char_info>`;
  const messages = [];
  const snapshots = characters => ({
    stat_data: {
      关系列表: Object.fromEntries(characters.map(name => [name, { 种族: '人类', 等级: 3, 外貌特质: '银色短发' }])),
    },
  });
  let latest = snapshots([]);
  let variables = { char_info: { profiles: { 作者角色: { 登场台词: '保留' } } } };
  let activeChat = 'chat-a';
  let onBindCalls = 0;
  const requests = [];
  const descriptions = [];
  const uploads = [];
  const mockHost = {
    STBaiBaiImage: {
      apiVersion: 1,
      capabilities: { generate: true },
      getBackendStatus: () => ({ configured: true, backend: 'comfyui' }),
      async generate({ prompt }) {
        requests.push(prompt);
        return { dataUrl };
      },
    },
    async fetch(path, options) {
      const { filename, format, ch_name } = JSON.parse(options.body);
      uploads.push(path);
      return { ok: true, json: async () => ({ path: `/user/images/${ch_name}/${filename}.${format}` }) };
    },
    document: { createElement: () => ({ decode: async () => {} }) },
  };
  const originalGlobals = Object.fromEntries(
    ['window', 'SillyTavern', 'getChatMessages', 'getLastMessageId', 'getVariables', 'updateVariablesWith', 'Mvu', 'generateRaw'].map(
      key => [key, Object.getOwnPropertyDescriptor(globalThis, key)],
    ),
  );
  Object.assign(globalThis, {
    window: { parent: mockHost },
    SillyTavern: {
      getCurrentChatId: () => activeChat,
      characterId: 'test-card',
      getRequestHeaders: () => ({}),
    },
    getChatMessages(range) {
      if (typeof range === 'number') return messages[range] ? [messages[range]] : [];
      const [from, to] = range.split('-').map(Number);
      return messages.slice(from, to + 1);
    },
    getLastMessageId: () => messages.length - 1,
    getVariables: () => variables,
    async generateRaw(config) {
      descriptions.push(config.ordered_prompts[1].content);
      return JSON.stringify({ tags: ['solo', 'silver hair'], caption: 'A person with silver hair. Soft light frames the face.' });
    },
    updateVariablesWith: update => (variables = update(variables)),
    Mvu: { getMvuData: () => latest },
  });
  t.after(() => {
    for (const [key, descriptor] of Object.entries(originalGlobals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  const state = {
    settings: { portraitProvider: 'baibai', autoGeneratePortraits: false, autoCollapseRules: [] },
    library: { characters: [] },
    portraitJobs: [],
    portraitRevision: 0,
  };
  const runtime = createPortraitRuntime(state, () => {
    onBindCalls += 1;
  });
  const addFloor = text => {
    const messageId = messages.length;
    messages.push({ message_id: messageId, role: 'assistant', swipe_id: 0, message: text, swipes: [text] });
    return messageId;
  };
  const finishFloor = text => {
    const messageId = addFloor(text);
    runtime.messageReceived(messageId);
    runtime.generationEnded();
    return messageId;
  };
  const pause = () => setTimeout(20);

  addFloor(textFor(names[0]));
  runtime.generationStarted('normal', false);
  finishFloor(textFor(names[0]));
  await pause();
  assert.equal(requests.length, 0);

  state.settings.autoGeneratePortraits = true;
  runtime.generationStarted('normal', false);
  const newText = `${textFor(names[0])}\n${textFor(names[1])}`;
  const floor = finishFloor(newText);
  const previous = latest;
  latest = snapshots([names[1]]);
  state.library.characters = collectCurrentCharacterSnapshots(latest);
  runtime.mvuUpdated(latest, previous);
  await pause();
  assert.deepEqual(descriptions, ['新面孔，人类，银色短发']);
  assert.deepEqual(requests, ['solo, silver hair']);
  const { cards } = projectCharInfoMessage({ text: newText, messageId: floor, swipeId: 0 });
  const story = [...readStoryPortraits(floor, 0, cards).values()][1];
  const storyImage = runtime.storyView(story, variables).url;
  assert.match(storyImage, /^\/user\/images\/charinfo-generated\//);
  assert.equal(runtime.libraryView(state.library.characters[0], variables).url, storyImage);

  runtime.generationStarted('normal', false);
  finishFloor('这条回复只有 MVU 新增角色。');
  await pause();
  const beforeLateUpdate = latest;
  latest = snapshots([names[1], names[2]]);
  runtime.mvuUpdated(latest, beforeLateUpdate);
  await pause();
  assert.deepEqual(descriptions, ['新面孔，人类，银色短发', '晚到角色，人类，银色短发']);
  assert.deepEqual(requests, ['solo, silver hair', 'solo, silver hair']);
  assert.deepEqual(uploads, ['/api/images/upload', '/api/images/upload']);
  assert.equal(onBindCalls, 2);
  assert.equal(variables.char_info.profiles.作者角色.登场台词, '保留');
  assert.deepEqual(readPortraitHistory(variables).map(entry => entry.name), ['晚到角色', '新面孔']);
  assert.equal(readPortraitHistory(variables)[0].prompt.tags, 'solo, silver hair');

  state.settings.autoCollapseRules = [{ path: '姓名', condition: 'includes', value: '怪物' }];
  runtime.generationStarted('normal', false);
  const monsterFloor = finishFloor(textFor('怪物甲'));
  const beforeBlocked = latest;
  latest = snapshots([...names.slice(1), '怪物乙']);
  runtime.mvuUpdated(latest, beforeBlocked);
  await pause();
  assert.equal(descriptions.length, 2, '黑名单在文字 API 前过滤剧情及 MVU 新角色');
  assert.equal(requests.length, 2);
  assert.equal(readPortraitAttempt(variables, '怪物甲'), false);
  assert.equal(readPortraitAttempt(variables, '怪物乙'), false);

  const monsterCards = projectCharInfoMessage({ text: textFor('怪物甲'), messageId: monsterFloor, swipeId: 0 }).cards;
  const monster = [...readStoryPortraits(monsterFloor, 0, monsterCards).values()][0];
  runtime.submit(runtime.storyView(monster, variables).target, '手动生成', animaPrompt('monster'));
  await pause();
  assert.equal(requests.at(-1), 'monster', '黑名单不阻止明确发起的手动生图');
  assert.equal(descriptions.length, 2, '复用标签不调用文字 API');

  runtime.generationStarted('swipe', false);
  finishFloor(textFor('重生角色'));
  await pause();
  assert.equal(requests.length, 3);

  const delayed = deferred();
  mockHost.STBaiBaiImage.generate = () => delayed.promise;
  runtime.submit(runtime.storyView(story, variables).target, '手动重试', animaPrompt('solo, silver hair'));
  await setImmediate();
  activeChat = 'chat-b';
  runtime.reset();
  variables = {};
  delayed.resolve({ dataUrl });
  await pause();
  assert.equal(uploads.length, 3);
  assert.deepEqual(variables, {});
});
