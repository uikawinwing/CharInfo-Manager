import { parseCharacterYaml } from '../char_info_viewer/services/yamlParser';
import {
  hasDeprecatedVisualSyntax,
  isSpecialNpcVisualData,
  resolveCharacterVisualConfigWithExtensions,
} from '../char_info_viewer/services/themeService';
import { probeMediaSource, runCharInfoDiagnostics, type DiagnosticCheck } from './diagnostics';
import type { RuntimeMountDiagnosticEntry } from './types';

export type WizardSymptom =
  | 'viewer_missing'
  | 'portrait_missing'
  | 'portrait_broken'
  | 'editor_or_worldbook'
  | 'version_cache'
  | 'unknown';
export type WizardOrigin = 'llm' | 'downloaded' | 'self_created' | 'unknown';
export type WizardExpectation = 'yes' | 'no' | 'unknown';
export type WizardEditorIssue = 'entry' | 'save' | 'setup';

export type WizardCandidate = {
  key: string;
  messageId: number;
  swipeId: number;
  ordinal: number;
  name: string;
  yamlText: string;
  rawText: string;
};

export type WizardFinding = {
  code: string;
  severity: 'expected' | 'info' | 'suspected' | 'confirmed';
  title: string;
  reason: string;
  evidence: string[];
  steps: string[];
};

export type WizardOptions = {
  symptom: WizardSymptom;
  candidate: WizardCandidate | null;
  origin: WizardOrigin;
  expectation: WizardExpectation;
  editorIssue: WizardEditorIssue;
  maxCards: number;
  active: boolean;
  mounted: boolean;
  chatVariables: Record<string, unknown>;
  mountDiagnostics: readonly RuntimeMountDiagnosticEntry[];
};

export const WIZARD_SYMPTOMS: { value: WizardSymptom; title: string }[] = [
  { value: 'viewer_missing', title: '角色卡没出现，或者位置不对' },
  { value: 'portrait_missing', title: '角色卡有了，但没有角色图片' },
  { value: 'portrait_broken', title: '有图片位置，但图片加载不出来' },
  { value: 'editor_or_worldbook', title: '编辑器、世界书或保存有问题' },
  { value: 'version_cache', title: '更新脚本后还是旧版本' },
  { value: 'unknown', title: '不确定哪里出了问题' },
];

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeUrlForReport(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url.split(/[?#]/)[0];
  }
}

function finding(
  code: string,
  severity: WizardFinding['severity'],
  title: string,
  reason: string,
  steps: string[],
  evidence: string[] = [],
): WizardFinding {
  return { code, severity, title, reason, evidence, steps };
}

function noCandidate(): WizardFinding {
  return finding('NO_CARD_SELECTED', 'info', '还没有找到能检查的角色卡',
    '请先打开出现问题的聊天记录，或刷新当前消息后重新检查。',
    ['确认问题消息仍在当前聊天中。', '如果角色卡完全不出现，请先选择「角色卡没出现」。']);
}

function findSimilarName(profiles: Record<string, unknown>, name: string): string | null {
  const normalized = name.trim().toLocaleLowerCase();
  return Object.keys(profiles).find(key => {
    const candidate = key.trim().toLocaleLowerCase();
    return key !== name && (candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate));
  }) ?? null;
}

function legacyProfile(variables: Record<string, unknown>, name: string): string | null {
  const charInfo = record(variables.char_info);
  if (record(variables.char_info_visuals)?.[name]) return 'char_info_visuals';
  if (record(charInfo?.visual)?.[name]) return 'char_info.visual';
  if (record(charInfo?.visuals)?.[name]) return 'char_info.visuals';
  return null;
}

export async function runWizardAnalysis(options: WizardOptions): Promise<WizardFinding> {
  const { symptom, candidate, chatVariables } = options;
  if (symptom === 'version_cache') {
    return finding('VERSION_MANUAL', 'info', '需要检查当前实际运行的脚本',
      '目前不能可靠地从聊天页面判断是否命中 TT 的缓存或存在重复脚本。',
      ['先停用旧版脚本，确认新脚本已启用。', '若 TT 仍加载旧版，重新新增脚本并停用旧条目。', '确认功能正常后再删除旧版本。'],
      ['脚本没有执行清理缓存或删除其他脚本的操作。']);
  }
  if (symptom === 'editor_or_worldbook' && options.editorIssue !== 'setup') {
    if (options.editorIssue === 'entry') {
      return finding('EDITOR_ENTRY_CHECK', 'info', '先检查选中的世界书与搜索词',
        '编辑器会搜索当前所选世界书的所有条目；角色资料库仅收录带角色标签的条目。',
        ['确认选择的是包含角色的世界书。', '清空搜索词，再搜索角色名称。', '若希望出现在角色资料库中，检查条目名是否带 [DLC][角色] 标签。']);
    }
    return finding('SAVE_CHECK', 'suspected', '需要核对保存目标和实际写入',
      '保存到世界书和即时写入聊天变量是两种操作，保存成功不代表当前聊天图片已更新。',
      ['在编辑器中核对保存反馈，确认选择的保存操作。', '若想立即在正文看到图片，使用「即时写入变量及状态栏」。', '刷新角色卡并重新执行诊断；不要先删除旧资料。']);
  }
  if (symptom === 'editor_or_worldbook' && options.editorIssue === 'setup' && !candidate) {
    return finding('IMAGE_SETUP_GUIDE', 'info', '可以手动为角色添加立绘',
      '普通 NPC 默认不带图片；需要先为角色完整姓名创建或保存图库档案。',
      ['打开角色档案编辑器，找到对应角色条目。', '添加图片直链或图库，并确认完整姓名一致。', '选择即时写入当前聊天，再刷新 Viewer。']);
  }
  if (!candidate) return noCandidate();

  const prefix = '消息 #' + candidate.messageId + ' · 第 ' + (candidate.ordinal + 1) + ' 张角色卡';
  const evidence = [prefix];
  if (symptom === 'viewer_missing' || symptom === 'unknown') {
    const report = await runCharInfoDiagnostics({
      messageId: candidate.messageId,
      swipeId: candidate.swipeId,
      text: candidate.rawText,
      maxCards: options.maxCards,
      active: options.active,
      mounted: options.mounted,
      chatVariables,
      mountDiagnostics: options.mountDiagnostics,
    });
    const relevant = report.checks.filter(check => check.status === 'fail' &&
      !check.title.startsWith('没有找到 char_info.profiles'));
    const first: DiagnosticCheck | undefined = relevant[0] ??
      report.checks.find(check => check.status === 'warn');
    const latestMount = [...options.mountDiagnostics]
      .filter(entry => entry.messageId === candidate.messageId)
      .sort((a, b) => b.time - a.time)
      .find(entry => entry.code === 'CARD_MOUNT_FALLBACK' || entry.code === 'REMOUNT_LOOP_GUARD' || entry.code === 'HOST_DISCONNECTED');
    if (latestMount && options.mounted && symptom === 'viewer_missing') {
      return finding('MOUNT_FALLBACK', 'suspected', '角色卡已出现，但位置可能受到正文格式影响',
        'Viewer 有挂载记录，但原本的正文定位可能不完整。',
        ['先刷新该楼层的显示内容。', '逐个停用会修改正文的正则或第三方渲染脚本，再检查位置是否恢复。', '如果仍然不对，复制诊断报告反馈。'],
        [...evidence, '最近挂载事件：' + latestMount.code, '详细信息：' + JSON.stringify(latestMount.details).slice(0, 350)]);
    }
    if (first) {
      return finding(first.code ?? 'GENERAL_DIAGNOSTIC', first.status === 'fail' ? 'confirmed' : 'suspected',
        first.title, first.detail,
        first.code === 'TAG_UNBALANCED'
          ? ['点击消息的小铅笔，检查对应的 <char_info> 是否完整闭合。', '检查正文正则或脚本是否修改了标签。']
          : ['先按诊断提示检查原始消息和 Viewer 设置。', '如怀疑显示正则冲突，逐一停用相关脚本并刷新重试。'],
        [...evidence, ...(first.location ? [first.location] : []), ...(first.excerpt ? [first.excerpt] : [])]);
    }
    return finding('GENERAL_NOT_FOUND', 'info', '暂时没有发现明确的结构错误',
      '这不代表一定没有问题，外部正则、缓存或 DOM 变化可能需要人工排除。',
      ['重新渲染有问题的楼层。', '逐一停用会改变正文的显示正则或脚本。', '仍未解决时复制诊断结果。'], evidence);
  }

  const parsed = parseCharacterYaml(candidate.yamlText);
  if (!parsed.success) {
    const error = parsed.error;
    const lines = candidate.yamlText.split(/\r?\n/);
    const index = typeof error.line === 'number' ? error.line : -1;
    const excerpt = index >= 0 ? lines.slice(Math.max(0, index - 2), index + 3).join('\n') : '';
    return finding('YAML_PARSE_FAILED', 'confirmed', '这张角色卡的资料格式无法解析',
      error.message, ['在 Viewer 中尝试「自动修复」。', '若仍失败，点击消息的小铅笔检查原始格式。'],
      [...evidence, ...(index >= 0 ? ['角色卡第 ' + (index + 1) + ' 行'] : []), ...(excerpt ? [excerpt] : []), ...(error.tips ?? []).slice(0, 2)]);
  }
  const data = parsed.data;
  const name = typeof data.姓名 === 'string' ? data.姓名.trim() : '';
  if (!name) return finding('NO_NAME', 'confirmed', '角色姓名为空', '缺少用于匹配图片档案的完整姓名。',
    ['在角色卡中检查姓名字段。'], evidence);

  evidence.push('角色姓名：' + name);
  const info = record(chatVariables.char_info);
  const profiles = record(info?.profiles) ?? {};
  const profile = record(profiles[name]);
  const avatar = record(record(record(chatVariables.status)?.externalAvatars)?.partners)?.[name];
  const avatarOnly = Boolean(record(avatar)?.url);
  const similar = findSimilarName(profiles, name);
  const oldRoot = legacyProfile(chatVariables, name);

  if (!profile) {
    if (avatarOnly) evidence.push('检测到状态栏头像；Viewer 立绘需要单独配置 gallery。');
    if (similar) {
      return finding('PROFILE_NAME_MISMATCH', 'suspected', '发现名称相近但不完全一致的图片档案',
        'Viewer 按完整姓名匹配，名字不同不会自动使用对方图片。',
        ['确认正文的姓名是否正确。', '进入档案编辑器核对完整姓名并保存，不要直接覆盖其他角色。'],
        [...evidence, '聊天变量中的相近档案：' + similar]);
    }
    if (oldRoot) {
      return finding('LEGACY_PROFILE', 'suspected', '检测到旧版图片档案',
        '当前 Viewer 不再读取旧路径。', ['打开角色档案编辑器，重新保存为新版档案。', '再次检查该角色是否有可用图库。'],
        [...evidence, '旧数据路径：' + oldRoot]);
    }
    const severity = options.expectation === 'yes' || options.origin === 'self_created'
      ? 'suspected' : 'expected';
    return finding('NO_IMAGE_PROFILE', severity,
      severity === 'expected' ? '这名角色尚未配置立绘，属于正常显示' : '当前聊天没有找到这名角色的图片档案',
      options.origin === 'llm'
        ? '聊天时 AI 临时生成的 NPC 默认只有文字资料；Viewer 不会自动生成图片。'
        : options.origin === 'downloaded' && options.expectation === 'no'
          ? '作者没有提供图片时，普通角色卡就是正常的显示结果。'
          : '当前聊天找不到与角色完整姓名匹配的新版图片档案。',
      severity === 'expected'
        ? ['如果希望显示立绘，请打开角色档案编辑器为这个姓名添加图片。']
        : options.origin === 'downloaded'
          ? ['检查作者的安装说明是否需要运行 EJS 写入聊天变量。', '确认使用的是当前聊天，并检查档案保存结果。']
          : ['进入角色档案编辑器确认已经保存到当前聊天。', '核对角色完整姓名及图片图库内容。'],
      [...evidence, '未找到 char_info.profiles 中的同名档案']);
  }

  const remoteUrl = typeof profile.gallery_pack_url === 'string' ? profile.gallery_pack_url.trim() : '';
  const localGalleryCount = Array.isArray(profile.gallery) ? profile.gallery.length : 0;
  evidence.push('找到 char_info.profiles 中的同名档案');
  evidence.push('本地图库项目：' + localGalleryCount + '，远端图库：' + (remoteUrl ? '已配置' : '未配置'));
  if (avatarOnly) evidence.push('检测到状态栏头像，但它不会自动成为 Viewer 立绘。');

  let visual;
  try {
    visual = await resolveCharacterVisualConfigWithExtensions(data, chatVariables);
  } catch (error) {
    return finding('VISUAL_RESOLVE_FAILED', 'suspected', '图片档案读取失败',
      error instanceof Error ? error.message : String(error),
      ['检查远端图库地址和本地图库格式。', '在角色档案编辑器重新保存后再检查。'], evidence);
  }
  const groups = Array.isArray(visual.__char_info_image_source_groups)
    ? visual.__char_info_image_source_groups.filter(group => Array.isArray(group) && group.length > 0)
    : [];
  const allSources = Array.from(new Set(groups.flatMap(group => group)));
  if (allSources.length === 0) {
    const neverConfigured = localGalleryCount === 0 && !remoteUrl;
    const severity = neverConfigured && options.expectation !== 'yes' &&
      options.origin !== 'self_created' ? 'expected' : 'confirmed';
    return finding('EMPTY_IMAGE_GALLERY', severity,
      severity === 'expected' ? '档案没有配置立绘，普通卡是正常结果' : '找到了档案，但没有解析出可用的立绘',
      '状态栏头像与 Viewer 立绘分开配置；只有头像不代表角色卡有图。',
      ['打开角色档案编辑器，给相同完整姓名的角色添加有效图片直链。', '保存到当前聊天变量，再刷新 Viewer。'],
      evidence);
  }

  const media = await Promise.all(allSources.slice(0, 20).map(probeMediaSource));
  const successCount = media.filter(item => item.status === 'pass').length;
  evidence.push('浏览器可读取图片来源：' + successCount + '/' + media.length);
  evidence.push(...media.filter(item => item.status === 'fail').slice(0, 3).map(item => safeUrlForReport(item.url) + '：' + item.detail));
  if (successCount === 0) {
    return finding('IMAGE_LOAD_FAILED', 'confirmed', '浏览器无法加载配置的图片',
      '已确认图片加载失败；无法据此断言图床宕机，可能是直链、权限、防盗链或网络问题。',
      ['直接在新标签页打开图片直链，确认能否显示图片。', '检查 URL 是否为文件直链，尝试其他可用来源。'],
      evidence);
  }
  const special = isSpecialNpcVisualData(visual);
  if (!special) {
    return finding('IMAGE_PRESENT_BUT_NORMAL_CARD', 'suspected', '图片来源可读取，但卡面仍未切换',
      '数据已有有效图片来源，卡面可能需要刷新或受到脚本冲突影响。',
      ['刷新 Viewer 并重新打开角色卡。', '核对完整姓名及是否启用了旧版 Viewer 或显示正则。'], evidence);
  }
  return finding('IMAGE_DATA_OK', 'suspected', '图片配置与浏览器加载检查通过',
    '根据用户描述仍存在显示异常，但仅凭配置无法确认渲染阶段的原因。',
    ['刷新该楼层或重新启用 Viewer。', '逐一停用可能干扰渲染的正则或脚本。', '复制报告反馈以进一步定位。'],
    [...evidence, ...(hasDeprecatedVisualSyntax(visual) ? ['检测到已弃用图片语法'] : [])]);
}

export function createWizardPrompt(options: WizardOptions, result: WizardFinding, feedback: string): string {
  const symptom = WIZARD_SYMPTOMS.find(value => value.value === options.symptom)?.title ?? '未知问题';
  const lines = [
    '请协助排查 SillyTavern CharInfo Viewer。先核实证据，不要猜测或改写原始角色资料。',
    '现象：' + symptom,
    '角色来源（用户选择）：' + options.origin,
    '是否预期有图（用户选择）：' + options.expectation,
    '诊断分类：' + result.severity + ' / ' + result.code,
    '诊断结果：' + result.title,
    '说明：' + result.reason,
    '证据（仅所选问题）：', ...result.evidence.map(value =>
      '- ' + value.replace(/https?:\/\/[^\s"<>]+/g, match => safeUrlForReport(match)).slice(0, 700)),
    '建议操作：', ...result.steps.map(value => '- ' + value),
    '用户反馈：' + (feedback || '尚未补充'),
    '请先解释真正的问题和最少的排查步骤。如证据不足，明确指出还缺什么信息。',
  ];
  return lines.join('\n');
}
