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
  /** 至少一个 fixture 是完整 specialNpc，覆盖 desktop side rail 与 6 tab contract。 */
  specialNpc: boolean;
  /** 本地 data URI，offline boot 不依赖网络。 */
  portraitUrl: string;
  data: CharacterData;
};

const PORTRAIT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABGCAYAAAD1i0ZgAAAAaklEQVR4nO3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgLgeA/dLla9sAAAAASUVORK5CYII=';

export const dxLabFixtures: DxLabFixture[] = [
  {
    id: 'iris-full',
    name: '艾璃丝（完整 specialNpc）',
    specialNpc: true,
    portraitUrl: PORTRAIT_PNG,
    data: {
      姓名: '艾璃丝·赛瑞利亚',
      生命层级: '第五层级',
      等级: 18,
      种族: '汐海妖精',
      身份: ['天穹维护者', '赛瑞利亚的长女', '『纯真暴君』'],
      职业: ['魔导工程大工匠', '幻光阵法师'],
      性格: '外向、坦露、急躁、刚硬、执着。不知善恶为何物，仅凭直觉与好恶行动的纯粹妖精。',
      喜爱: '在天空中进行超音速飞行巡航；五颜六色的糖果；恶作剧陷阱。',
      外貌特质: '外观犹如10岁左右的人类女童，身高不足130cm。一双明亮金瞳，半透明淡蓝荧光的发丝。',
      衣物装饰: '纯白连衣短裙，裙摆由多层半透明轻纱剪裁，边缘呈柔和波浪状。',
      背景故事:
        '多年前源种污染导致的梦魇灾厄幸存者，被瑟涟庇护并赋予了名字。为了减轻母亲的负担，她在极短的时间内榨干潜力并升华了权能，强行接管了「幻光水母天穹」的日常魔力维护。',
      属性: {
        力量: '1 + 4 + 0 = 5',
        敏捷: '5 + 4 + 4 = 13',
        体质: '1 + 4 + 2 = 7',
        智力: '5 + 4 + 6 = 15',
        精神: '5 + 4 + 5 = 14',
      },
      资源: { HP: 14054, MP: 50750, SP: 31500 },
      技能: [
        {
          名称: '暴力抢修·重锤火花',
          品质: '传说',
          类型: '主动',
          消耗: '攻击/动作: 3500 MP/SP',
          标签: '[智力][单体][伤害][威力: 3200][多段]',
          效果: { 物理粉碎: '造成极高物理伤害，附加 30% 真实伤害（魔力内爆）' },
        },
        {
          名称: '幻光阵列·全域展开',
          品质: '史诗',
          类型: '主动',
          消耗: 'MP: 4200',
          标签: '[智力][群体][增益]',
          效果: { 阵列同步: '为全队附加持续 3 回合的魔力强化' },
        },
        {
          名称: '赛瑞利亚的庇护',
          品质: '稀有',
          类型: '被动',
          标签: '[体质][护盾]',
          效果: { 庇护: '受到致命伤害时保留 1 点生命并进入嘲讽' },
        },
        {
          名称: '日常魔力维护',
          品质: '普通',
          类型: '被动',
          标签: '[智力][维护]',
          效果: { 维护: '每日首次施法不消耗 MP' },
        },
      ],
      装备: [
        { 名称: '天穹维护用巨锤', 品质: '史诗', 标签: '[武器][智力]', 效果: { 攻击: '+3200 伤害' } },
        { 名称: '幻光阵列披风', 品质: '稀有', 标签: '[防具][智力]', 效果: { 防御: '+820 防御' } },
        { 名称: '爆爆糖工具袋', 品质: '普通', 标签: '[饰品]', 效果: { 幸运: '+12' } },
      ],
      背包: [
        {
          名称: '魔导零件',
          分类: '素材',
          内容: [
            { 名称: '齿轮', 数量: 24, 品质: '普通' },
            { 名称: '螺丝', 数量: 96, 品质: '普通' },
            { 名称: '魔力核心', 数量: 3, 品质: '史诗' },
          ],
        },
        {
          名称: '糖果',
          分类: '消耗品',
          内容: [
            { 名称: '五色琉璃糖', 数量: 12, 品质: '稀有' },
            { 名称: '泡泡糖', 数量: 40, 品质: '普通' },
          ],
        },
      ],
      状态效果: [
        { 名称: '魔力充盈', 类型: '增益', 效果: { 持续: '3 回合', 加成: 'MP 恢复速度 +20%' } },
        { 名称: '轻伤', 类型: '减益', 效果: { 持续: '2 回合', 加成: '防御 -5%' } },
      ],
    } as unknown as CharacterData,
  },
  {
    id: 'plain',
    name: '普通角色（无立绘路径）',
    specialNpc: false,
    portraitUrl: '',
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
