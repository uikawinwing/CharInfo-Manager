import { projectCharInfoMessage } from '../char_info_viewer/runtime/charInfoMessage';
import { normalizePortraitMediaUrlForBrowser } from '../char_info_viewer/services/imageUrl';
import { resolveRemoteGalleryPresentation } from '../char_info_viewer/services/remoteGalleryService';
import {
  hasDeprecatedVisualSyntax,
  isSpecialNpcVisualData,
  resolveCharacterVisualConfigWithExtensions,
} from '../char_info_viewer/services/themeService';
import { parseCharacterYaml } from '../char_info_viewer/services/yamlParser';
import type { CharacterData } from '../char_info_viewer/types';
import type { RuntimeMountDiagnosticEntry } from './types';

export type DiagnosticStatus = 'pass' | 'warn' | 'fail' | 'info';

export type DiagnosticCheck = {
  status: DiagnosticStatus;
  title: string;
  detail: string;
};

export type DiagnosticMediaCheck = {
  url: string;
  status: 'pass' | 'fail';
  detail: string;
};

export type DiagnosticCharacterReport = {
  name: string;
  checks: DiagnosticCheck[];
  media: DiagnosticMediaCheck[];
};

export type CharInfoDiagnosticReport = {
  messageId: number;
  checks: DiagnosticCheck[];
  characters: DiagnosticCharacterReport[];
};

type RunDiagnosticOptions = {
  messageId: number;
  swipeId: number;
  text: string;
  maxCards: number;
  active: boolean;
  mounted: boolean;
  chatVariables: Record<string, unknown>;
  mountDiagnostics: readonly RuntimeMountDiagnosticEntry[];
};

const CHAR_INFO_OPEN_PATTERN = /<char_info\b[^>]*>/gi;
const CHAR_INFO_CLOSE_PATTERN = /<\/char_info\s*>/gi;
const STRICT_CHAR_INFO_OPEN_PATTERN = /^<char_info\s*>$/i;
const COMPLETE_CHAR_INFO_PATTERN = /<char_info\s*>[\s\S]*?<\/char_info\s*>/gi;
const THINK_OPEN_PATTERN = /<think\b[^>]*>/gi;
const THINK_CLOSE_PATTERN = /<\/think\s*>/gi;
const GAMETXT_OPEN_PATTERN = /<gametxt\b[^>]*>/gi;
const GAMETXT_CLOSE_PATTERN = /<\/gametxt\s*>/gi;
const MEDIA_PROBE_TIMEOUT_MS = 6_000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function collectMatches(pattern: RegExp, source: string): RegExpExecArray[] {
  pattern.lastIndex = 0;
  const matches: RegExpExecArray[] = [];
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) matches.push(match);
  pattern.lastIndex = 0;
  return matches;
}

function latestMatch(pattern: RegExp, source: string): RegExpExecArray | null {
  return collectMatches(pattern, source).at(-1) ?? null;
}

function describeMountFailure(entry: RuntimeMountDiagnosticEntry): string {
  const slotInjectionCode = 'TO' + 'KEN_INJECTION_FAILED';
  const messages: Record<string, string> = {
    MESSAGE_DOM_UNAVAILABLE: '聊天楼层 DOM 或正文容器不存在。',
    SKIP_EDITING: '该楼层正在编辑中，Viewer 暂停挂载。',
    MESSAGE_ID_UNRESOLVED: '无法从正文 DOM 解析消息楼层编号。',
    RAW_MESSAGE_UNAVAILABLE: '无法重新读取该楼层的原始消息。',
    CARD_SLOT_BUILD_FAILED: '无法把原始 CharInfo 替换成安全挂载槽位。',
    TH_RENDER_COUNT_MISMATCH: 'Tavern Helper 前端渲染节点数量和格式化结果不一致。',
    ROOT_REPLACE_FAILED: '替换正文挂载内容时发生异常。',
    HOST_COLLECTION_FAILED: '格式化完成后没有收集到预期的 Viewer Host。',
    REMOUNT_LOOP_GUARD: '挂载点连续被外部 DOM 更新移除，已停止自动重挂载。',
    HOST_DISCONNECTED: '已经挂载的 Viewer Host 被外部 DOM 更新移除。',
    RENDER_THROWN: 'Viewer runtime 渲染过程抛出异常。',
  };
  if (entry.code === slotInjectionCode) {
    return '正文格式化后 Viewer 私有槽位丢失或重复；显示正则/脚本可能改变了正文结构。';
  }
  return messages[entry.code] ?? `Viewer 挂载阶段记录了 ${entry.code}。`;
}

function diagnoseScope(text: string, projectionCardCount: number, overflow: boolean): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];
  const openTags = collectMatches(CHAR_INFO_OPEN_PATTERN, text);
  const closeTags = collectMatches(CHAR_INFO_CLOSE_PATTERN, text);
  const unsupportedOpen = openTags.find(match => !STRICT_CHAR_INFO_OPEN_PATTERN.test(match[0]));
  const lastThinkClose = latestMatch(THINK_CLOSE_PATTERN, text);
  const afterThink = lastThinkClose ? lastThinkClose.index + lastThinkClose[0].length : 0;
  const unclosedThink = collectMatches(THINK_OPEN_PATTERN, text).find(match => match.index >= afterThink) ?? null;

  if (openTags.length === 0) {
    checks.push({
      status: 'fail',
      title: '没有找到 <char_info>',
      detail: '原始 assistant 消息中没有 CharInfo 开始标签。',
    });
    return checks;
  }
  checks.push({ status: 'pass', title: '找到 CharInfo 标签', detail: `检测到 ${openTags.length} 个开始标签。` });

  if (unsupportedOpen) {
    checks.push({
      status: 'fail',
      title: 'CharInfo 开始标签格式不受支持',
      detail: `当前 Viewer 只识别 <char_info>（允许空白），实际发现 ${unsupportedOpen[0]}。`,
    });
  }

  if (openTags.length > closeTags.length) {
    checks.push({
      status: 'fail',
      title: 'CharInfo 没有完整闭合',
      detail: `开始标签 ${openTags.length} 个，结束标签 ${closeTags.length} 个。`,
    });
  } else {
    checks.push({ status: 'pass', title: 'CharInfo 标签已闭合', detail: `结束标签 ${closeTags.length} 个。` });
  }

  if (unclosedThink) {
    checks.push({
      status: 'fail',
      title: '<think> 推理区未闭合',
      detail: '当前 runtime 会把后续内容视为仍处于推理区，因此不会扫描 CharInfo。',
    });
    return checks;
  }

  const gametxtOpen = collectMatches(GAMETXT_OPEN_PATTERN, text).find(match => match.index >= afterThink) ?? null;
  if (gametxtOpen) {
    const rangeStart = gametxtOpen.index + gametxtOpen[0].length;
    GAMETXT_CLOSE_PATTERN.lastIndex = rangeStart;
    const gametxtClose = GAMETXT_CLOSE_PATTERN.exec(text);
    GAMETXT_CLOSE_PATTERN.lastIndex = 0;
    const rangeEnd = gametxtClose?.index ?? text.length;
    const inside = text.slice(rangeStart, rangeEnd).match(COMPLETE_CHAR_INFO_PATTERN)?.length ?? 0;
    const completeTotal = text.match(COMPLETE_CHAR_INFO_PATTERN)?.length ?? 0;
    if (!gametxtClose) {
      checks.push({
        status: 'warn',
        title: '<gametxt> 没有闭合',
        detail: 'Viewer 当前仍会扫描到消息末尾，但建议补上 </gametxt>，避免正文边界不稳定。',
      });
    } else {
      checks.push({ status: 'pass', title: '游戏正文范围正常', detail: '找到 <gametxt>...</gametxt>。' });
    }
    if (inside === 0 && completeTotal > 0) {
      checks.push({
        status: 'fail',
        title: 'CharInfo 不在游戏正文范围内',
        detail: '存在完整 <char_info>，但它位于 <gametxt> 之前或 </gametxt> 之后，因此不会渲染。',
      });
    } else if (inside > 0) {
      checks.push({
        status: 'pass',
        title: 'CharInfo 位于游戏正文内',
        detail: `有效范围内检测到 ${inside} 个完整 CharInfo。`,
      });
    }
  } else {
    checks.push({
      status: 'warn',
      title: '没有找到 <gametxt> 开始标签',
      detail: '当前 Viewer 会使用旧消息兼容路径扫描 </think> 后的内容；新消息建议使用完整 <gametxt>...</gametxt>。',
    });
  }

  if (overflow) {
    checks.push({
      status: 'fail',
      title: '单楼层 CharInfo 数量超过设置上限',
      detail: '该楼层会保留原始正文而不渲染任何角色卡。',
    });
  } else if (projectionCardCount > 0) {
    checks.push({
      status: 'pass',
      title: 'Viewer 已识别 CharInfo',
      detail: `可渲染角色卡 ${projectionCardCount} 张。`,
    });
  } else {
    checks.push({
      status: 'fail',
      title: 'Viewer 没有得到可渲染 CharInfo',
      detail: '标签存在，但没有完整 CharInfo 落在当前有效扫描范围内。',
    });
  }

  return checks;
}

function findLegacyProfileRoot(chatVariables: Record<string, unknown>, name: string): string | null {
  const charInfo = asRecord(chatVariables.char_info);
  const candidates: Array<[string, unknown]> = [
    ['char_info_visuals', asRecord(chatVariables.char_info_visuals)?.[name]],
    ['char_info.visual', asRecord(charInfo?.visual)?.[name]],
    ['char_info.visuals', asRecord(charInfo?.visuals)?.[name]],
  ];
  return candidates.find(([, value]) => value !== undefined && value !== null)?.[0] ?? null;
}

function findSimilarProfileName(profiles: Record<string, unknown> | null, name: string): string | null {
  if (!profiles) return null;
  const target = name.trim().toLocaleLowerCase();
  return (
    Object.keys(profiles).find(key => {
      const candidate = key.trim().toLocaleLowerCase();
      return candidate !== target && (candidate.includes(target) || target.includes(candidate));
    }) ?? null
  );
}

async function probeMediaSource(url: string): Promise<DiagnosticMediaCheck> {
  const media = normalizePortraitMediaUrlForBrowser(url);
  if (!media) return { url, status: 'fail', detail: 'URL 格式或媒体类型不受支持。' };

  return await new Promise(resolve => {
    let settled = false;
    const finish = (status: 'pass' | 'fail', detail: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve({ url, status, detail });
    };
    const timer = window.setTimeout(
      () => finish('fail', `加载超过 ${MEDIA_PROBE_TIMEOUT_MS / 1000} 秒，视为超时。`),
      MEDIA_PROBE_TIMEOUT_MS,
    );

    if (media.kind === 'image') {
      const image = new Image();
      image.onload = () => finish('pass', '图片可正常加载。');
      image.onerror = () => finish('fail', '浏览器无法加载这个图片来源。');
      image.src = media.url;
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => finish('pass', '视频媒体可正常读取。');
    video.onerror = () => finish('fail', '浏览器无法加载这个视频来源。');
    video.src = media.url;
    video.load();
  });
}

async function diagnoseCharacter(
  data: CharacterData,
  chatVariables: Record<string, unknown>,
): Promise<DiagnosticCharacterReport> {
  const name = typeof data.姓名 === 'string' ? data.姓名.trim() : '';
  const checks: DiagnosticCheck[] = [];
  const media: DiagnosticMediaCheck[] = [];
  if (!name) {
    checks.push({ status: 'fail', title: '角色姓名为空', detail: 'CharInfo 必须提供可读取的 姓名。' });
    return { name: '未命名角色', checks, media };
  }

  checks.push({ status: 'pass', title: '读取到角色姓名', detail: name });
  const charInfo = asRecord(chatVariables.char_info);
  const profiles = asRecord(charInfo?.profiles);
  const hasExactProfile = !!profiles && Object.hasOwn(profiles, name);
  const rawProfile = hasExactProfile ? profiles[name] : undefined;

  if (!hasExactProfile) {
    const legacyRoot = findLegacyProfileRoot(chatVariables, name);
    const similarName = findSimilarProfileName(profiles, name);
    checks.push({
      status: 'fail',
      title: `没有找到 char_info.profiles[${JSON.stringify(name)}]`,
      detail: similarName
        ? `找到可能相关的档案 ${JSON.stringify(similarName)}；Viewer 使用角色全名精确匹配。`
        : '当前聊天没有这个角色的新版视觉档案。',
    });
    if (legacyRoot) {
      checks.push({
        status: 'warn',
        title: '检测到旧版视觉变量',
        detail: `发现 ${legacyRoot}[${JSON.stringify(name)}]；请在角色档案编辑器重新保存为 char_info.profiles v2。`,
      });
    }
    if (
      [data.角色图片, data.立绘, data.特殊立绘, data.图片, data.portrait, data.image].some(
        value => typeof value === 'string' && value.trim(),
      )
    ) {
      checks.push({
        status: 'warn',
        title: '正文包含旧版图片字段',
        detail: '当前 Viewer 会忽略正文里的 角色图片 / 立绘 / image 等字段；图片必须来自角色档案。',
      });
    }
    return { name, checks, media };
  }

  checks.push({
    status: 'pass',
    title: '找到当前聊天角色档案',
    detail: `char_info.profiles[${JSON.stringify(name)}] 已存在。`,
  });

  let remoteGalleryDetail = '';
  const profileRecord = asRecord(rawProfile);
  const remoteGalleryUrl =
    typeof profileRecord?.gallery_pack_url === 'string' ? profileRecord.gallery_pack_url.trim() : '';
  if (remoteGalleryUrl) {
    try {
      const remote = await resolveRemoteGalleryPresentation(remoteGalleryUrl);
      remoteGalleryDetail = remote ? `远程图库可读取，共 ${remote.gallery.length} 张。` : '远程图库 URL 无效。';
      checks.push({ status: remote ? 'pass' : 'fail', title: '远程图库', detail: remoteGalleryDetail });
    } catch (error) {
      remoteGalleryDetail = error instanceof Error ? error.message : String(error);
      checks.push({ status: 'fail', title: '远程图库读取失败', detail: remoteGalleryDetail });
    }
  }

  const resolved = await resolveCharacterVisualConfigWithExtensions(data, chatVariables);
  const sourceGroups = Array.isArray(resolved.__char_info_image_source_groups)
    ? resolved.__char_info_image_source_groups.filter(group => Array.isArray(group) && group.length > 0)
    : [];
  if (isSpecialNpcVisualData(resolved)) {
    checks.push({
      status: 'pass',
      title: '角色应使用立绘角色卡',
      detail: `解析到 ${sourceGroups.length} 组角色卡图片。`,
    });
  } else {
    checks.push({
      status: 'fail',
      title: '角色档案没有形成可用立绘',
      detail: remoteGalleryUrl
        ? `角色档案存在，但远程/本地图库没有解析出角色卡可用图片。${remoteGalleryDetail ? ` ${remoteGalleryDetail}` : ''}`
        : '角色档案存在，但 gallery 没有角色卡可用的图片来源。',
    });
  }
  if (hasDeprecatedVisualSyntax(resolved)) {
    checks.push({
      status: 'warn',
      title: '正文还包含旧版图片语法',
      detail: '它不会决定当前角色卡是否有图，请迁移到角色档案。',
    });
  }

  const uniqueSources = Array.from(new Set(sourceGroups.flatMap(group => group)));
  if (uniqueSources.length > 0) {
    const probed = await Promise.all(uniqueSources.map(probeMediaSource));
    media.push(...probed);
    const successCount = probed.filter(item => item.status === 'pass').length;
    checks.push({
      status: successCount > 0 ? 'pass' : 'fail',
      title: '图片来源实测',
      detail:
        successCount > 0
          ? `${successCount}/${probed.length} 个来源可读取；Viewer 会在失败时继续尝试同组备用来源。`
          : `共测试 ${probed.length} 个来源，全部无法读取。`,
    });
  }

  return { name, checks, media };
}

export async function runCharInfoDiagnostics(options: RunDiagnosticOptions): Promise<CharInfoDiagnosticReport> {
  const projection = projectCharInfoMessage({
    messageId: options.messageId,
    swipeId: options.swipeId,
    text: options.text,
    maxCards: options.maxCards,
  });
  const checks = diagnoseScope(options.text, projection.cards.length, projection.overflow);

  checks.push(
    options.active
      ? { status: 'pass', title: '楼层位于当前 Viewer 扫描范围', detail: '该楼层属于当前设置允许的最近消息楼层。' }
      : {
          status: 'fail',
          title: '楼层超出当前显示范围',
          detail: '提高「显示楼层数」后才能让这个已加载楼层进入 Viewer 扫描范围。',
        },
  );

  if (projection.cards.length > 0 && options.active) {
    if (options.mounted) {
      checks.push({
        status: 'pass',
        title: 'Viewer Host 已挂载',
        detail: '当前 runtime 状态中存在这个楼层的 Viewer。',
      });
    } else {
      const latestMount = [...options.mountDiagnostics]
        .filter(entry => entry.messageId === options.messageId && entry.code !== 'MOUNT_ATTEMPT')
        .sort((left, right) => right.time - left.time)[0];
      checks.push({
        status: 'fail',
        title: 'CharInfo 已识别，但 Viewer 没有挂载',
        detail:
          latestMount && latestMount.code !== 'MOUNT_SUCCESS'
            ? describeMountFailure(latestMount)
            : '问题发生在正文格式化或 DOM 挂载阶段；当前没有更具体的近期 mount failure 记录。',
      });
    }
  }

  const characters: DiagnosticCharacterReport[] = [];
  for (const card of projection.cards) {
    const parsed = parseCharacterYaml(card.content);
    if (!parsed.success) {
      checks.push({
        status: 'fail',
        title: `第 ${card.ordinal + 1} 张角色卡 YAML 解析失败`,
        detail: parsed.error.line ? `${parsed.error.message}（第 ${parsed.error.line} 行）` : parsed.error.message,
      });
      continue;
    }
    checks.push({
      status: 'pass',
      title: `第 ${card.ordinal + 1} 张角色卡 YAML 正常`,
      detail: '角色资料可以被 Viewer parser 读取。',
    });
    characters.push(await diagnoseCharacter(parsed.data, options.chatVariables));
  }

  return { messageId: options.messageId, checks, characters };
}
