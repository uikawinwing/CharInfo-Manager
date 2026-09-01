# CharInfo Manager 当前架构约束

本文件只记录当前源码仍然成立、后续维护不应随意破坏的稳定边界。版本发布历史应交给 Git tag / commit history，而不是继续维护 `v0.x.x_handover` 一类会迅速过期的执行文档。

## 模块职责

```text
src/
├─ char_info_viewer/          # 角色资料解析、ViewModel、主题与 Viewer UI
├─ char_info_viewer_runtime/  # SillyTavern 页面挂载、角色库、运行时生命周期
├─ char_info_creator_manager/ # Creator 编辑、预览与显式保存流程
└─ char_info_shared/          # Viewer / Creator 共用的数据契约、legacy inspector、媒体与世界书工具
```

边界：

- Viewer / Runtime 负责玩家浏览、当前聊天角色库、世界书角色库和正常渲染生命周期。
- Creator 只在用户明确进入编辑流程时挂载，负责视觉资料编辑、预览与显式保存；关闭后应清理自己的 UI / Vue / iframe / listener。
- `char_info_shared` 只能放真正被多个模块共用的数据规则与纯工具，不把 Viewer 或 Creator 的 UI 流程塞进去。
- 普通 Viewer 流程保持只读；不能因为“查看”角色而静默迁移或改写聊天 / 世界书资料。

## 当前 Viewer 路由

公开源码当前只有两种 `CharacterLayoutKind`：

```text
default
special_npc
```

规则：

- 有受信视觉资料且能解析到有效图片时才进入 `special_npc`。
- 没有有效视觉资料时使用 `default` 普通无图版。
- `<char_info>` 中直接出现的 `角色图片 / 立绘 / image / portrait` 等字段不是可信视觉身份来源；解析前会被剥离，不能靠手写图片字段升级成 Special NPC。
- 不要自行创造第三种公开 Viewer 路由，或用 metadata / 姓名匹配偷偷改变路由。

## 视觉资料 Source of Truth

当前正式聊天级视觉资料路径：

```text
char_info.profiles[角色姓名]
```

当前 profile schema：

```text
schema_version = 2
```

核心数据由 `src/char_info_shared/characterVisualProfile.ts` 定义，包括：

```text
characterName
avatarUrl
coverUrl
raceColor
tierColor
entranceQuote
gallery[]
galleryPackUrl?        # 当前源码仍存在；未来若废弃应单独迁移，不在这里兼容叠层
metadata?
```

`gallery[]` 每项使用：

```text
title
sources[]
thumbnail?
viewerVisible?
```

同一图片的多个 `sources[]` 是 fallback 来源，必须保持作者给定顺序。

## Metadata 语义

schema v2 支持：

```text
metadata.author
metadata.version
metadata.author_note
metadata.sex
metadata.race
metadata.story_sections[]
```

`story_sections` 每项只有：

```text
title
content
```

稳定规则：

- metadata 是作者 / 展示资料，不是 Viewer 路由凭证。
- `story_sections` 是人类阅读用展示内容；有自定义故事时 Viewer 可以优先显示它，但不能把长故事反写进 `<char_info>.背景故事` 或其他 LLM 上下文资料。
- story section 顺序按作者顺序保存。
- 空 metadata / 空 section 应在 normalize 时去掉，不保存无意义对象。
- Creator 生成的 EJS-safe 文本不得包含 `<%` / `%>`。

## Legacy 兼容边界

当前 Viewer 仍可读取这些旧视觉根：

```text
char_info_visuals[姓名]
char_info.visual[姓名]
char_info.visuals[姓名]
```

这只是兼容入口，不是新内容应继续写入的正式格式。

`src/char_info_shared/legacyVisualProfile.ts` 负责 legacy 识别 / 导入边界。维护时遵循：

- 优先静态识别已知结构，不执行任意 EJS 来“猜”数据。
- 不认识或动态表达式的 legacy 内容宁可报告 unsupported，也不要猜测或删除。
- 迁移只修改能够精确证明属于目标配置的范围；无关世界书正文 / EJS 必须保持不变。
- 新保存的受管 profile 使用 `char_info.profiles[姓名]`。

## 写入安全

- Viewer 浏览默认不写数据。
- Creator Preview 必须基于草稿并保持只读，不因预览产生聊天 / 世界书副作用。
- 保存动作必须由用户显式触发。
- 修改世界书时只处理已识别的 managed block / 精确 legacy 范围，不能用“大概匹配”覆盖整条 entry。
- 写入后需要重新读取并确认最终状态，不能只因为 API Promise 返回就假设数据正确。

## 媒体与 UI

- 头像、角色库封面、Viewer 图库是不同用途，不要自动把任意主立绘强行当头像。
- 图片 / 视频 fallback 由媒体 source state machine 处理；不要在不同 Viewer / Creator 组件各写一套失败重试逻辑。
- 移动端嵌套 Viewer 的定位优先相对 CharInfo host，而不是反复叠 `position: fixed` 到浏览器 viewport。
- flex 高度问题要一起检查 `height / min-height: 0 / overflow` 的责任层，不要用随机固定尺寸盖症状。
- `forceMobileLayout` 必须改变实际组件结构 / 布局输入，而不是只复制一套外层 media-query CSS。

## 文档与版本历史

- 当前行为以源码、测试、`AGENTS.md` 和本文件为准。
- 旧版本做过什么请查 Git tag / commit history；不要重新建立版本号 handover 文档作为新的 source of truth。
- `docs/previews/` 是人工保留的预览 / UI 基准资产，尤其 `.html` 不属于自动文档清理范围，不得擅自删除、移动或改名。
