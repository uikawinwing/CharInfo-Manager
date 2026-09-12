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
| **角色档案编辑器** | Profile Editor | Creator Manager、Creator Editor、角色视觉编辑器、角色资料编辑器 | 编辑 `char_info.profiles[角色名]` 的编辑器。它不只处理图片，也处理配色、登场台词、作者、版本、故事展示 Metadata、Gallery Pack 等，因此不再称“角色视觉编辑器”。 |
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
| **角色档案** | Character Profile | profile、visual profile、`CharacterVisualProfile` | `char_info.profiles[角色名]` 对应的展示档案。它可以包含图片、头像、封面、配色、登场台词、作者、版本、故事展示 Metadata 等。它不是 MVU 的完整角色状态，也不是世界书中的角色设定正文。 |
| **视觉资料** | Visual Data | visual profile / visual config | 角色档案中与视觉展示直接相关的部分，例如主立绘、相册、头像、封面、配色等。只有明确指这部分时才使用“视觉资料”。 |
| **扩展图库包** | Gallery Pack | Gallery Pack | 外部图库资料包。角色档案保存其引用，不把大型图库完整复制进角色条目。 |
| **旧档案格式** | Legacy Profile Format | legacy visual profile | `char_info_visuals[姓名]`、`char_info.visual[姓名]`、`char_info.visuals[姓名]` 等旧路径。 |
| **档案迁移** | Profile Migration | legacy migration | 角色档案编辑器读取可安全识别的旧档案，自动预填；只有用户确认保存时才升级成 `char_info.profiles` 并精确移除旧写入。 |
| **运行时兼容** | Runtime Compatibility | legacy runtime fallback | 查看器是否在运行时直接读取旧档案格式。自 v0.3.0 起停止；旧格式仅保留档案迁移能力。 |

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
7. `char_info.profiles[姓名]` 对应 **角色档案**；只有其中图片 / 配色等视觉部分才叫 **视觉资料**。
8. `Special NPC` 只允许作为旧文档或内部 `special_npc` 路由的历史 / 技术指代；人类术语统一叫 **立绘角色卡**。
9. “Viewer Preview / Creator Preview” 在人类术语中统一叫 **角色卡预览**。

## 7. 源码命名迁移方向

源码不要求因为本文一次性进行大规模重命名。现有稳定 symbol 可以在专门的重构中逐步迁移，但**新代码应避免继续扩散旧概念名**。

### 优先重命名方向

| 当前源码命名 | 目标命名方向 | 原因 |
| --- | --- | --- |
| `char_info_creator_manager/` | `char_info_profile_editor/` | `Creator` 是用户身份，不是编辑器。 |
| `CreatorManager*` | `ProfileEditor*` | 与“角色档案编辑器”一一对应。 |
| `openCreatorManager()` / `closeCreatorManager()` | `openProfileEditor()` / `closeProfileEditor()` | 消除 Creator = editor 的歧义。 |
| `quickVisualMode` / `quickVisual*` | `flashMode` / `flash*` | 快速模式是 Profile Editor 的一个模式，而不是独立 Quick Visual 产品。 |
| `libraryWorkspace*` | `characterLibrary*` | 产品概念已经确定为 Character Library，不再使用 Workspace。 |
| `CREATOR_BUTTON_NAME` | `PROFILE_EDITOR_BUTTON_NAME` | 按钮打开的是角色档案编辑器。 |

### 第二阶段可考虑

| 当前源码命名 | 目标命名方向 | 备注 |
| --- | --- | --- |
| `CharacterVisualProfile` | `CharacterProfile` | 现在档案已包含 Metadata / 作者 / 故事等，不再只是视觉数据。 |
| `hasVisualProfile` | `hasProfile` 或更精确的能力名 | 需要先检查调用点到底判断“有档案”还是“有有效立绘”，不能机械替换。 |
| `special_npc` | `illustrated` 一类更准确的内部路由名 | 引用范围较广，应作为独立路由重构处理；目前可保留。 |

### 建议保留的技术词

以下源码技术词本身准确，不需要为了中文化而重命名：

```text
Viewer
Runtime
Profile
Metadata
Gallery
GalleryPack
EJS
```

目标不是让源码全部变成中文，而是让 **Master 常用术语、人类文档和源码概念能够稳定一一映射**。

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
角色卡预览 = Character Card Preview

普通角色卡 = default / normal
立绘角色卡 = internal special_npc

玩家 = Player
内容创作者 = Creator
```
