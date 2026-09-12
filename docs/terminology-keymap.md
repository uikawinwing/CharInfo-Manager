# CharInfo 术语 Keymap

> 本文是角色管理库（CharInfo Manager）的人类术语与源码概念对照表。
>
> 后续 UI、README、更新日志、Issue、设计讨论和 AI 协作应优先使用本文的统一术语。源码中已经存在的旧 symbol 不要求一次性重命名，但新代码不应继续扩散已经废弃的概念命名。

## 1. 核心产品与页面术语

| 统一中文术语 | 英文概念 | 当前 / 历史源码叫法 | 准确定义 |
| --- | --- | --- | --- |
| **角色管理库** | CharInfo Manager | `CharInfo Manager` | 整套产品。包含角色卡、角色资料库、角色档案编辑器、设置以及后台运行逻辑。 |
| **角色卡** | Character Card | Viewer 页面、character panel | 玩家实际看到的角色界面。正文中的 `<char_info>`、当前聊天角色详情、角色档案编辑器中的预览，本质上都使用同一套角色卡。 |
| **角色查看器 / 查看器** | Viewer | `char_info_viewer`、`ViewerApp` | 把角色资料渲染成角色卡的组件。讨论玩家看到的界面时优先说“角色卡”；讨论渲染组件、挂载或源码时才说“查看器”。 |
| **运行时** | Runtime | `char_info_viewer_runtime`、`CharInfoRuntime` | 角色管理库的常驻控制层。负责识别聊天消息、挂载角色卡、刷新、角色资料库、设置，以及打开角色档案编辑器。 |
| **角色资料库** | Character Library | Library、Library Workspace、Workspace | 浏览和管理角色的统一入口。以后人类术语不再使用 Workspace。 |
| **当前聊天角色库** | Current Chat Character Library | Current Character Library | 角色资料库中的“当前聊天”来源，角色来自当前聊天 MVU / message variables。 |
| **世界书角色库** | Worldbook Character Library | Worldbook Character Library | 角色资料库中的“世界书”来源，角色来自当前有效世界书。 |

## 2. 角色档案编辑器

| 统一中文术语 | 英文概念 | 当前 / 历史源码叫法 | 准确定义 |
| --- | --- | --- | --- |
| **角色档案编辑器** | Profile Editor | Creator Manager、Creator Editor、角色视觉编辑器、角色资料编辑器 | 编辑 `char_info.profiles[角色名]` 的编辑器。它不只处理图片，也处理配色、登场台词、作者、版本、故事展示 Metadata、远程图库等，因此不再称“角色视觉编辑器”。 |
| **快速模式** | Flash Mode | Quick Visual、Quick Mode、快速视觉编辑器、`quickVisualMode` | 角色档案编辑器的简化模式。面向只想快速给当前聊天角色补立绘 / 视觉档案的使用者，隐藏复杂世界书与 EJS 操作。 |
| **专业模式** | Pro Mode | 原五步 Creator Editor / full editor | 角色档案编辑器的完整模式。面向内容创作者，提供完整档案、Metadata、图库、配色、故事展示和世界书保存能力。 |
| **角色卡预览** | Character Card Preview | Viewer Preview、Creator Preview | 角色档案编辑器里使用真实角色查看器渲染出的预览。不是另一套 Viewer。 |
| **EJS 构建器** | EJS Builder | managed EJS builder / profile EJS builder | 角色档案编辑器内部负责生成和更新 EJS 的实现能力。它是编辑器的一部分，不是整个编辑器的产品名称。 |
| **CharInfo 管理 EJS 区块** | Managed EJS Block | managed EJS | 由角色档案编辑器生成、带 CharInfo 标记、可安全定位和替换的 EJS 区块。 |

### 模式关系

```text
角色档案编辑器（Profile Editor）
├─ 快速模式（Flash Mode）
└─ 专业模式（Pro Mode）
```

“快速模式”和“专业模式”是同一个角色档案编辑器的两种使用模式，不是两个独立产品或两个独立编辑器。

## 3. Profile / 档案数据术语

| 统一中文术语 | 英文概念 | 当前 / 历史源码叫法 | 准确定义 |
| --- | --- | --- | --- |
| **角色档案** | Character Profile | profile、旧称 visual profile | `char_info.profiles[角色名]` 对应的展示档案。一个可授予立绘角色卡的有效档案必须提供至少一个角色卡可用图片来源；Metadata 是可选附加资料。它不是 MVU 的完整角色状态，也不是世界书中的角色设定正文。 |
| **视觉资料** | Visual Data | visual profile / visual config | 角色档案中与视觉展示直接相关的部分，例如主立绘、相册、头像、封面、配色等。只有明确指这部分时才使用“视觉资料”。 |
| **远程图库** | Remote Gallery | 旧源码 / wire format 中可能出现 Gallery Pack | 角色档案只保存一个 HTTPS URL，运行时从该 URL 读取整套图片与缩略图。现行功能不是“把图库拆到另一本世界书”。兼容字段仍为 `gallery_pack_url`，协议标记仍为 `char-info-gallery-pack`。 |
| **旧档案格式** | Legacy Profile Format | legacy visual profile | `char_info_visuals[姓名]`、`char_info.visual[姓名]`、`char_info.visuals[姓名]` 等旧路径。 |
| **档案迁移** | Profile Migration | legacy migration | 角色档案编辑器读取可安全识别的旧档案，自动预填；只有用户确认保存时才升级成 `char_info.profiles` 并精确移除旧写入。 |
| **运行时兼容** | Runtime Compatibility | legacy runtime fallback | 查看器是否在运行时直接读取旧档案格式。自 v0.3.0 起停止；旧格式仅保留档案迁移能力。 |

### 角色档案与立绘角色卡的资格边界

“存在 `char_info.profiles[姓名]` 对象”与“已经是立绘角色卡”不是同一件事。正式判定固定为：

```text
消息 / MVU 中存在正确角色姓名
+
char_info.profiles[同名角色]
+
至少一个角色卡可用图片来源（本地 gallery 或成功解析的远程图库）
=
立绘角色卡（内部 special_npc）
```

`metadata`、作者、版本、故事栏目、颜色和登场台词本身都不能授予立绘角色卡。角色档案编辑器的快速模式只要求建立最小合法档案，因此是这条规则的参考实现。

## 4. 角色卡版式术语

| 统一中文术语 | 英文概念 | 当前源码值 | 准确定义 |
| --- | --- | --- | --- |
| **普通角色卡** | Normal Character Card | `default` / normal | 没有有效立绘时使用的无图角色卡。 |
| **立绘角色卡** | Illustrated Character Card | `special_npc` | 有有效 `char_info.profiles[姓名]` 立绘资料时使用的角色卡版式。它只是 UI / 路由分类，不代表该 NPC 在剧情上拥有“特殊身份”。 |

在人类交流、UI 和新文档中，不再把 `Special NPC` 当作产品术语。需要讨论源码时可写成：

> 立绘角色卡（内部路由 `special_npc`）

## 5. 用户身份术语

| 统一中文术语 | 英文概念 | 定义 |
| --- | --- | --- |
| **玩家** | Player | 使用角色内容进行聊天 / 游戏的人。 |
| **内容创作者** | Creator | 制作角色、世界书、DLC、角色档案等内容的人。 |

`Creator` 以后只表示“内容创作者这个人”，不再作为编辑器、模块或页面的人类名称。一个用户可以同时是玩家和内容创作者。

## 6. 人类术语使用规则

后续 UI、README、更新日志、Issue、设计讨论和 AI 回复遵守以下规则：

1. `CharInfo Manager` 首次出现可写成 **角色管理库（CharInfo Manager）**，之后优先使用“角色管理库”。
2. 玩家实际看到的内容叫 **角色卡**；负责渲染它的技术组件叫 **角色查看器 / Viewer**。
3. Library 统一叫 **角色资料库**；来源只分 **当前聊天角色库** 与 **世界书角色库**，不再引入 Workspace、玩家角色库、当前聊天角色资料库等额外名称。
4. 编辑 `char_info.profiles` 的完整产品统一叫 **角色档案编辑器**。
5. 角色档案编辑器只分 **快速模式（Flash Mode）** 和 **专业模式（Pro Mode）**。
6. `Creator` 只指 **内容创作者**，不再用来指编辑器。
7. `char_info.profiles[姓名]` 对应 **角色档案**；只有其中图片 / 配色等视觉部分才叫 **视觉资料**。档案对象存在本身不等于立绘角色卡，仍需有效图片。
8. `Special NPC` 只允许作为旧文档或内部 `special_npc` 路由的历史 / 技术指代；人类术语统一叫 **立绘角色卡**。
9. “Viewer Preview / Creator Preview” 在人类术语中统一叫 **角色卡预览**。

## 7. 源码命名迁移状态

主要源码术语重构已完成。新代码不得继续扩散旧概念名；`special_npc` 作为兼容路由值暂时保留。

兼容清理例外：运行时仍会保留旧按钮文字 `角色视觉编辑` 的匹配常量，仅用于识别并移除旧安装残留；这不是现行产品术语，不应重新用于新 UI、文档或新功能命名。

### 第一阶段已落实

| 旧源码命名 | 当前统一命名 | 原因 |
| --- | --- | --- |
| `char_info_creator_manager/` | `char_info_profile_editor/` | `Creator` 是用户身份，不是编辑器。 |
| `CreatorManager*` | `ProfileEditor*` | 与“角色档案编辑器”一一对应。 |
| `openCreatorManager()` / `closeCreatorManager()` | `openProfileEditor()` / `closeProfileEditor()` | 消除 Creator = editor 的歧义。 |
| `quickVisualMode` / `quickVisual*` | `flashMode` / `flash*` | 快速模式是 Profile Editor 的一个模式，而不是独立 Quick Visual 产品。 |
| `libraryWorkspace*` | `characterLibrary*` | 产品概念已经确定为 Character Library，不再使用 Workspace。 |
| `CREATOR_BUTTON_NAME` | `PROFILE_EDITOR_BUTTON_NAME` | 按钮打开的是角色档案编辑器。 |
| `CharacterVisualProfile` / `characterVisualProfile.ts` | `CharacterProfile` / `characterProfile.ts` | 档案是完整展示档案；Metadata 可选，视觉图片决定是否满足立绘角色卡门槛。 |
| `hasVisualProfile` | `hasProfileRecord` | 只表达“`char_info.profiles[姓名]` 是否存在记录”，不等同于 `special_npc` 资格。 |
| `galleryPackStorage.ts` | 已删除 | 旧世界书拆分图库方案已经废弃，不应继续维护死代码。 |
| `GalleryPack*` 运行时源码命名 | `RemoteGallery*` | 现行功能是一条 URL 在运行时读取整套图库。 |

### 仍可独立考虑

| 当前源码命名 | 目标命名方向 | 备注 |
| --- | --- | --- |
| `special_npc` | `illustrated` 一类更准确的内部路由名 | 属于持久化 / 测试影响较广的内部路由值，目前保留。 |

### 建议保留的技术词

以下源码技术词本身准确，不需要为了中文化而重命名：

```text
Viewer
Runtime
Profile
Metadata
Gallery
RemoteGallery
EJS
```

目标不是让源码全部变成中文，而是让 **Master 常用术语、人类文档和源码概念能够稳定一一映射**。


### 兼容命名例外

源码与人类术语统一使用 **Remote Gallery / 远程图库**。但下列既有 wire-format 名称不得为了术语美观而破坏兼容：

```text
gallery_pack_url
char-info-gallery-pack
```

它们只代表历史协议字段 / 格式标记，不代表旧的“Gallery Pack 世界书拆分存储”功能仍然存在。

## 8. 快速对照

```text
角色管理库 = CharInfo Manager
角色卡 = 玩家实际看到的 Character Card
角色查看器 = Viewer（负责渲染角色卡）
运行时 = Runtime

角色资料库 = Character Library
├─ 当前聊天角色库
└─ 世界书角色库

角色档案编辑器 = Profile Editor
├─ 快速模式 = Flash Mode
└─ 专业模式 = Pro Mode

角色档案 = char_info.profiles[角色名]
视觉资料 = 角色档案中的图片 / 配色等视觉部分
远程图库 = Remote Gallery（一条 URL 读取整套图片）
角色卡预览 = Character Card Preview

普通角色卡 = default / normal
立绘角色卡 = internal special_npc

玩家 = Player
内容创作者 = Creator
```
