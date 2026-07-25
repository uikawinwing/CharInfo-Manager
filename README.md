# 命定之诗角色查看器

一个用于 SillyTavern / 酒馆助手环境的角色信息查看器。它把 `<char_info>`
中的 YAML 角色资料渲染成可阅读的角色面板，并提供导入 MVU 变量与聊天世界书的快捷操作

## 功能

- 解析 `<char_info>` 角色资料，支持只传入标签内部 YAML，也兼容整段 `<char_info>...</char_info>`
- 渲染角色档案、属性、资源、技能、装备、背包、登神长阶、背景故事和状态效果
- 根据种族与生命层级自动应用主题色、边框和粒子视觉效果
- 属性公式支持点击查看，并提示总值或分项是否异
- 技能、装备和道具效果支持 `效果名: 内容` 与 `微弱要素[名称]: 内容` 这类带方括号的效果名
- 一键导入到 MVU 变量系统，尽量保留已有角色的好感度与心里话
- 一键导入到聊天世界书，方便把原始角色资料作为聊天世界书条目保存

## 玩家自修复提示

当 YAML 解析失败时，界面会显示：

- 技术错误信息
- 报错行号和列号
- 自动清洗后的定位行与箭头
- 原始输入行，方便对照修改
- 按错误类型生成的修复建议

目前会重点提示这些常见问题：

- 缩进层级错误。
- 列表项 `-` 对齐错误
- 缺少冒号或 `键: 值` 格式错误
- 方括号、冒号、引号导致的未加引号问题
- 重复键名
- 双引号内反斜杠转义错误

## 输入格式

推荐输出完整标签，查看器也支持从正则捕获 `$1` 后只传内部 YAML：

```yaml
<char_info>
姓名: 艾莉诺
生命层级: 第四层级
等级: 13
种族: 人类
技能:
  - 名称: 慈爱之吻
    品质: 史诗
    类型: 主动
    标签: [精神][治疗]
    效果: |
      微弱要素[圣吻之诺]: 此吻无法被闪避或抵抗，必定命中目标
      神圣契约: 为友方目标恢复生命值，并施加祝福。
</char_info>
```

### 按姓名读取状态栏相册、主题色与登场台词

图片直接使用 Aoo 状态栏的聊天变量；`char_info_visuals`
只保存查看器专用的主题色和登场台词。头像与全身立绘分开配置，避免把构图不合适的相册图片自动裁成头像：

```ejs
<%_
const characterName = '角色姓名';
const avatarUrl = 'https://example.com/avatar-crop.webp';
const galleryImages = [
  { title: '主立绘', url: 'https://example.com/character-main.webp' },
  { title: '日常服', url: 'https://example.com/character-alt.avif' },
];

setLocalVar(`char_info_visuals[${JSON.stringify(characterName)}]`, {
  custom_racecolor: '#78C8F0',
  custom_tiercolor: '#A855F7',
  '登场台词': '用一句话留下角色的第一印象。',
});
setLocalVar(
  `status.externalAvatars.partners[${JSON.stringify(characterName)}].url`,
  avatarUrl,
);
setLocalVar(
  `status.externalGalleries.partners[${JSON.stringify(characterName)}].images`,
  galleryImages,
);
_%>
```

LLM 只需在 `<char_info>` 内准确输出姓名，不需要输出图片字段：

```yaml
姓名: 角色姓名
```

查看器会按姓名读取
`status.externalGalleries.partners.<姓名>.images`。数组第一项固定作为主立绘；存在多张图片时，首页显示左右切换按钮。找不到有效相册时回退到无图普通版。状态栏头像只读取
`status.externalAvatars.partners.<姓名>.url`，不会自动拿相册图片代替。

共享给状态栏的动画建议使用动态 WebP 或 AVIF。查看器自身仍兼容静态图片、GIF、动态 WebP／AVIF，以及旧资料中的 MP4／WebM；Catbox 的动画图片与视频会保留原始 URL，避免图片代理压平动画帧或破坏视频流。

`登场台词` 与两种颜色均可省略。颜色只接受
`#RRGGBB`，缺失或无效时自动使用种族与生命层级的默认颜色。Aoo 状态栏会自行检查 HTTPS、图片扩展名与允许的图床域名。

旧版
`char_info_visuals[姓名].url/gallery`、`角色图片: '[[变量名]]'`、直接填写图片 URL，以及“占位符对应 URL字符串”的方式仍然兼容。旧版角色点击“导入到 MVU 变量”时，仅在状态栏尚无相册的情况下迁移图片；不会覆盖创作者或玩家已设置的头像与相册。

豪华／DX 版不读取上述公版相册触发，只接受 `__char_info_ref: special_npc_...`，并从世界书禁用条目
`char_info_special_profiles` 读取专属资料。

### 角色视觉配置管理器

`dist/char_info_creator_manager/index.js` 是供创作者使用的 Tavern
Helper 后台脚本。导入并启用脚本后，点击脚本按钮“角色视觉配置管理器”，即可：

- 读取酒馆中的全部世界书，并将当前角色卡绑定的主世界书与附加世界书置顶。
- 在可搜索选择器中查找目标世界书，再读取其中的角色条目。
- 在同一个搜索选择器中筛选角色条目；`[DLC][角色]` 前缀条目会优先显示。
- 编辑姓名、头像、相册标题与 URL、主题色和登场台词。
- 主题颜色默认关闭；不启用时不会写入自定义颜色，查看器会使用角色资料的默认主题。
- 世界书条目标题只用于决定写入位置；变量键名始终使用表单内填写的真实角色姓名。
- 将生成的 EJS 自动写入条目顶部；若条目使用 `@@` 装饰器，则写在连续装饰器之后。
- 再次打开同一条目时直接读取 v2 区块内唯一的 `profile` 配置；保存时只替换管理器自己的标记区块。
- 旧 v1 区块仍可读取，下一次保存时会自动升级成不含 Base64 配置副本的 v2 区块。

管理器不会修改条目原有设定、其他 EJS、启用状态或世界书参数。检测到残缺标记、重复标记或未受管理的旧版视觉 EJS 时会锁定自动写入，避免重复执行或误删创作者代码。

## 开发说明

- 源码入口在 `src/char_info_viewer`
- 创作者管理器源码入口在 `src/char_info_creator_manager`
- 构建产物在 `dist/char_info_viewer`

常用命令：

```bash
npm run build:dev
npm run build
```

## 使用与发布提醒

本项目开源供学习、参考和个人自用。若需要基于本项目进行使用、复刻、DIY 改版并公开发布，请在发布前先告知我，避免版本来源、维护责任和衍生内容说明产生误会。
