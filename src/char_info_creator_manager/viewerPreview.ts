import { dump } from 'js-yaml';

import {
  CHAR_INFO_PROFILE_SCHEMA_VERSION,
  normalizeProfile,
  type CharacterVisualProfile,
} from '../char_info_shared/characterVisualProfile.ts';
import type { CharacterData } from '../char_info_viewer/types.ts';

export type CreatorViewerVisualOverride = {
  characterName: string;
  config: Record<string, unknown>;
};

export type CreatorViewerPreviewSource = 'sample' | 'pasted';

export function normalizeCreatorViewerPastedText(value: string): string {
  const text = String(value ?? '').trim();
  if (!text) return '';

  const wrapped = text.match(/^<char_info\b[^>]*>([\s\S]*?)<\/char_info>$/i);
  return (wrapped?.[1] ?? text).trim();
}

export function resolveCreatorViewerPreviewYaml(
  profile: CharacterVisualProfile,
  source: CreatorViewerPreviewSource,
  pastedText: string,
): string {
  if (source === 'pasted') return normalizeCreatorViewerPastedText(pastedText);
  return buildCreatorViewerPreviewYaml(profile);
}

export function buildCreatorViewerPreviewYaml(profile: CharacterVisualProfile): string {
  const characterName = profile.characterName.trim() || '预览角色';
  const data: CharacterData = {
    姓名: characterName,
    等级: 1,
    种族: '其他',
    生命层级: '第一层级',
    身份: ['旅人（示例）', '观察者（示例）'],
    职业: ['剑士（示例）', '术式师（示例）'],
    性格: '这是预览示例文本，用来确认档案页的段落、文字密度与留白效果。',
    喜爱: ['甜点（示例）', '旅行（示例）', '星空（示例）'],
    外貌特质: '银白长发与明亮瞳色，整体轮廓清晰轻盈；这段文字仅用于展示档案页排版。',
    衣物装饰: '轻便旅行装配合少量金属饰件，用于展示衣装说明的多行文本效果。',
    背景故事: '这是一段 Creator Preview 专用示例背景，只用于检查角色卡的文字呈现，不会写入任何真实资料。',
    登场台词: '这是预览示例台词，用来确认首页台词区域的排版效果。',
    属性: {
      力量: 10,
      敏捷: 10,
      体质: 10,
      智力: 10,
      精神: 10,
    },
    资源: { HP: 100, SP: 100, MP: 100 },
    技能: [
      {
        名称: '星流斩（示例）',
        品质: '稀有',
        类型: '主动',
        消耗: '20 MP',
        标签: ['单体', '斩击', '示例'],
        效果: {
          伤害: '造成一次示例伤害。',
          追加: '命中后获得 1 层「星辉」。',
        },
      },
      {
        名称: '旅者直觉（示例）',
        品质: '史诗',
        类型: '被动',
        标签: ['探索', '感知', '示例'],
        效果: {
          被动: '用于展示无消耗被动技能的排版。',
        },
      },
    ],
    装备: [
      {
        名称: '旅星长剑（示例）',
        品质: '史诗',
        类型: '武器',
        标签: ['剑', '主手', '示例'],
        效果: {
          属性: '敏捷 +2',
          特性: '攻击时附加微弱星光。',
        },
      },
    ],
    道具: [
      {
        名称: '星砂药瓶（示例）',
        品质: '优良',
        类型: '消耗品',
        标签: ['恢复', '示例'],
        效果: {
          使用: '恢复少量 HP 与 MP。',
        },
      },
    ],
    状态效果: [
      {
        名称: '星辉加护（示例）',
        类型: '增益',
        层数: 2,
        剩余时间: '3 回合',
        来源: '预览示例',
        效果: '用于展示角色面板中的状态效果区域。',
      },
    ],
    登神长阶: {
      神位: '星海旅者（示例）',
      神国: {
        名称: '静星庭（示例）',
        描述: '用于展示神国卡片的标题与说明文字。',
      },
      要素: [
        {
          名称: '星光（示例）',
          效果: '用于展示登神页的要素条目。',
        },
      ],
      权能: [
        {
          名称: '航路指引（示例）',
          效果: '用于展示登神页的权能条目。',
        },
      ],
      法则: [
        {
          名称: '旅者之星（示例）',
          被动效果: '保持方向感与行动节奏。',
          主动效果: '短暂标记一条安全路径。',
          描述: '用于展示法则的多段字段布局。',
        },
      ],
    },
  };

  return dump(data, { noRefs: true, lineWidth: -1, sortKeys: false });
}

export function buildCreatorViewerVisualOverride(profile: CharacterVisualProfile): CreatorViewerVisualOverride {
  const normalized = normalizeProfile(profile);
  return {
    characterName: normalized.characterName,
    config: {
      schema_version: CHAR_INFO_PROFILE_SCHEMA_VERSION,
      ...(normalized.raceColor ? { custom_racecolor: normalized.raceColor } : {}),
      ...(normalized.tierColor ? { custom_tiercolor: normalized.tierColor } : {}),
      ...(normalized.entranceQuote ? { 登场台词: normalized.entranceQuote } : {}),
      gallery: normalized.gallery.map(image => ({
        title: image.title,
        sources: [...image.sources],
      })),
    },
  };
}
