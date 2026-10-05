import type { CharacterData } from '@/char_info_viewer/types';
import type { IllustratedV2Theme } from '@/char_info_viewer/components/illustrated/dx/IllustratedV2Sheet.vue';

/**
 * DX Lab fixture。
 *
 * 使用正式的 `CharacterData` 形状，由 `buildCharacterViewModel` / attribute 解析
 * 走真实链路 —— Lab 不发明自己的业务 model，也不复制 renderer。
 */
export type DxLabFixture = {
  id: string;
  name: string;
  /**
   * Lab 预览立绘来源，按顺序 fallback。
   *
   * 正常设计预览优先使用真实外链；最后一个 data URI 只负责断网 / 图床失败时
   * 兜底，避免 QA 测试图反过来成为人类和 LLM 默认看到的“角色立绘”。
   */
  portraitSources: readonly string[];
  /**
   * Lab-only visual config。
   *
   * 它的唯一作用是让**正式**的 `resolveCharacterVisualPreview` 识别出这是 viewer image
   * profile，从而由正规链路打上 specialNpc brand。这里使用与正常设计预览相同的
   * 真实 HTTPS 图片；Lab host 会把 embedded data URI 追加为 source fallback，
   * 因此完全断网时仍可启动和渲染。
   *
   * 不要在这里放宽产品的 URL policy，也不要把 data: 塞进正式 resolver。
   */
  visualConfig?: unknown;
  data: CharacterData;
};

const OFFLINE_PORTRAIT_FALLBACK =
  'data:image/png;base64,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';

export const dxLabFixtures: DxLabFixture[] = [
  {
    id: 'iris-full',
    name: '艾璃丝（完整 specialNpc）',
    portraitSources: [
      'https://files.catbox.moe/wa4anv.png',
      OFFLINE_PORTRAIT_FALLBACK,
    ],
    // 让正式 preview resolver 判定为 viewer image profile。
    // 正常预览使用旧 DX Lab 已有的艾璃丝真实立绘 URL。
    visualConfig: {
      schema_version: 2,
      gallery: [{ sources: ['https://files.catbox.moe/wa4anv.png'] }],
    },
    data: {
      姓名: '艾璃丝·赛瑞利亚',
      生命层级: '第五层级',
      等级: 17,
      种族: '汐海妖精',
      身份: ['天穹维护者'],
      职业: ['梦境编织'],
      性格: '清脆活跃，语速快得像连珠炮。只遵循“好玩”和“妈妈喜欢”两个原则，是一个纯真、热情又危险的孩子王。',
      喜爱: '糖果、彩色泡泡、极速飞行、会发出奇怪声音的机器，以及把稀有材料拼成谁也看不懂的新玩具。',
      外貌特质: '娇小身躯，半透明碧蓝触须如双马尾垂落，金色眼睛总在寻找下一件有趣的事。',
      衣物装饰: '纯白连衣短裙配轻纱裙摆，随身带着一把远比她本人高大的秘银扳手。',
      背景故事:
        '她因瑟涟的庇护从源种恶梦中存活，也因此把守护母亲与赛瑞利亚视作最自然、最重要的事情。比普通妖精多了一份责任感，却仍凭直觉判断世界；她会修好天穹，也会在后台布置等待客人踩中的整蛊陷阱。',
      属性: {
        力量: 7,
        敏捷: 16,
        体质: 8,
        智力: 15,
        精神: 14,
      },
      资源: { HP: 12600, SP: 34000, MP: 52000 },
      技能: [
        {
          名称: '咕噜咕噜梦泡',
          品质: '史诗',
          类型: '主动',
          标签: '[梦境][控制][范围]',
          效果: {
            梦泡剧场: '编织出漂浮的彩色梦泡，将触碰者拉入规则完全由艾璃丝决定的儿童游戏。',
          },
        },
        {
          名称: '大水母修补时间',
          品质: '史诗',
          类型: '主动',
          标签: '[天穹][修复][飞行]',
          效果: {
            玩具工程: '挥舞秘银扳手修补魔力回路，并将多余能量拼成会唱歌、喷泡泡的临时机关。',
          },
        },
        {
          名称: '抓紧咯——飞高高！',
          品质: '优良',
          类型: '主动',
          标签: '[飞行][机动]',
          效果: {
            极速巡航: '沿天穹回路高速移动。她通常会忘记同行者并没有妖精一样结实。',
          },
        },
      ],
      装备: [
        {
          名称: '巨型秘银扳手“咔哒”',
          品质: '史诗',
          类型: '法杖/工具',
          标签: '[法杖][工具][玩具]',
          描述: '能够直接拧动天穹魔力节点。艾璃丝坚持认为它只是“大一点点”的积木工具。',
        },
        {
          名称: '泡泡零件袋',
          品质: '稀有',
          类型: '工具袋',
          标签: '[零件][玩具]',
          描述: '装满会发光的螺帽、贝壳按钮和彩色软管；每次打开时，里面的排列都与上次不同。',
        },
      ],
      背包: [
        {
          名称: '梦游背包',
          分类: '杂物',
          内容: [
            { 名称: '彩虹硬糖', 数量: 7, 品质: '普通' },
            { 名称: '会抗议的粉色贝壳', 数量: 1, 品质: '稀有' },
            { 名称: '梦泡贴纸', 数量: 12, 品质: '普通' },
            { 名称: '积木式机关', 数量: 1, 品质: '稀有' },
          ],
        },
      ],
      登神长阶: {
        权能: [
          {
            名称: '梦境编织',
            效果:
              '她能把梦的规则编入现实，让天穹化为承载居民安眠与希望的巨大水母。对艾璃丝而言，这仍是一场必须认真完成的游戏。',
          },
        ],
      },
    } as unknown as CharacterData,
  },
  {
    id: 'anastasia-full',
    name: '安娜斯塔西娅（当前 preview）',
    portraitSources: ['https://files.catbox.moe/hrfym1.png', OFFLINE_PORTRAIT_FALLBACK],
    visualConfig: {
      schema_version: 2,
      gallery: [{ sources: ['https://files.catbox.moe/hrfym1.png'] }],
    },
    data: {
      姓名: '安娜斯塔西娅·佛罗伦丝·瓦雷利乌斯',
      生命层级: '第三层级',
      等级: 11,
      种族: '人鱼(纯血)',
      身份: ['瓦雷利乌斯家族千金', '海军工程顾问'],
      职业: ['工程师'],
      性格: '【严谨校准 请不要碰那枚阀门，除非你想让整条管线重新唱歌。】',
      喜爱: '精密机械、舰船结构、魔导水压阀、整洁图纸、安静的深海工坊，以及能按说明书完成操作的人。',
      外貌特质:
        '外观年龄18岁上下，气质端正清冷。银白长发在水光下带浅蓝折射，眼眸像经过打磨的海蓝宝石。耳鳍纤细，颈侧保留纯血人鱼的鳃纹，动作克制而精确。',
      衣物装饰:
        '深蓝短外套内搭白色高领衬衣，袖口收束方便操作仪器。腰侧挂有折叠测尺、微型扳手和密封图筒，裙摆嵌银色导流纹，整体像贵族礼服与工程制服的折中。',
      背景故事:
        '瓦雷利乌斯家族的纯血人鱼千金，自幼接受贵族教育与海军工程训练。她比起舞会更熟悉船坞，比起闲谈更喜欢拆开故障阀门。作为海军工程顾问，她正在学习如何把家族责任、个人才能与真正的现场判断放在同一张图纸上。',
      属性: {
        力量: 8,
        敏捷: 10,
        体质: 9,
        智力: 16,
        精神: 12,
      },
      资源: { HP: 18450, SP: 26000, MP: 42000 },
      技能: [
        {
          名称: '深海机关学·精密校准',
          品质: '史诗',
          类型: '主动',
          标签: '[智力][范围:120][校准][工程]',
          效果: {
            机关调律: '解除一项设备故障或降低陷阱难度',
            结构洞察: '对机械、舰船、魔导装置检定获得额外修正',
            稳定输出: '友方下一次工程或驾驶操作失误惩罚降低',
          },
          描述: '以工程师的方式重新校准复杂装置，让原本危险的结构恢复到可预测状态。',
        },
        {
          名称: '水压脉冲切割',
          品质: '稀有',
          类型: '主动',
          标签: '[智力][直线][切割][水压]',
          效果: {
            高压水刃: '对装甲、舱门、缆索类目标造成精准切割',
            低损拆解: '若目标为机械结构，可保留可回收部件',
          },
          描述: '把高压水流压缩成稳定切线，优先解决结构问题而不是制造更多碎片。',
        },
      ],
      装备: [
        {
          名称: '瓦雷利乌斯工程礼装',
          品质: '稀有',
          类型: '礼装',
          标签: '[防御:320][瓦雷利乌斯家族][工程辅助]',
          效果: {
            工程检定修正: '+4',
            防水绝缘: '降低水压、漏电与蒸汽灼伤风险',
          },
        },
      ],
      背包: [
        {
          名称: '工程工具',
          分类: '工具',
          内容: [
            { 名称: '密封工程图筒', 数量: 1, 品质: '优良' },
            { 名称: '微型水压校验器', 数量: 1, 品质: '稀有' },
          ],
        },
      ],
    } as unknown as CharacterData,
  },
  {
    id: 'plain',
    name: '普通角色（无立绘路径）',
    portraitSources: [],
    data: {
      姓名: '示例·普通角色',
      等级: 6,
      种族: '人类',
      身份: ['巡林者'],
      职业: ['斥候'],
      性格: '谨慎、寡言。',
      背景故事: '在边境林地巡行的斥候，习惯独自行动。',
      属性: { 力量: 8, 敏捷: 12, 体质: 10, 智力: 7, 精神: 9 },
      资源: { HP: 420, MP: 180, SP: 240 },
      技能: [{ 名称: '影袭', 品质: '稀有', 类型: '主动', 标签: '[敏捷][单体]' }],
      装备: [{ 名称: '短弓', 品质: '普通', 标签: '[武器]' }],
      背包: [{ 名称: '干粮', 分类: '消耗品', 内容: [{ 名称: '肉干', 数量: 5, 品质: '普通' }] }],
    } as unknown as CharacterData,
  },
];

export const dxLabThemes: { id: IllustratedV2Theme; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'iris', label: 'Iris' },
  { id: 'anastasia', label: 'Anastasia' },
];
