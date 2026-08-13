# CharInfo Manager NEXT：当前状态与后续执行路线

> 更新日期：2026-08-13  
> 本文件是当前需求范围与执行顺序的唯一依据。旧版英文路线图已经作废。  
> 如果其他旧文档、预览说明或测试名称与本文件冲突，以本文件和仓库根目录 `AGENTS.md` 为准。

## 1. 已确认且不得自行改变的产品分类

CharInfo Viewer 只有三种版式，不存在“普通立绘版”“普通带图版”或第四种中间版式。

| 分类 | 判定方式 | 当前范围 |
| --- | --- | --- |
| 普通角色 | 没有有效立绘，且不是可信 DX | 保留现有无图版式；未经 Master 明确要求，不重做布局、页签或视觉 |
| Special NPC | 不是可信 DX，并且该姓名在 `char_info.profiles` 或暂时兼容的 `char_info_visuals` 中拥有有效立绘 | 使用 `special_npc` 版式；当前响应式重设计只属于这一类 |
| DX | roster 固定四名；当前只有前三名可通过可信 DX 占位符与 loader 加载，Siren（瑟涟）待确认启用 | 使用 DX 版式；不能通过姓名、立绘、profile 或 metadata 获得 DX 身份 |

路由优先级固定为：

```text
可信 DX > 受信视觉资料授予的 Special NPC > 普通角色
```

必须遵守：

- `char_info.profiles[姓名]` 是 Special NPC 的正式视觉资料来源；`char_info_visuals[姓名]` 仅作暂时兼容。
- `<char_info>` 内直接出现的图片 URL、普通变量占位符或其他图片字段不能授予 Special NPC 身份，也不能改变 UI 路由。
- 没有受信视觉资料且不是可信 DX 的角色继续使用普通版；即使正文里出现图片字段，也不能因此升级成 Special NPC。
- `char_info.profiles[姓名]` 不是 DX 身份凭证。
- 不使用 `presentation.kind = special` 作为 Special NPC 开关。
- 不允许 `presentation.kind = dx`、metadata、姓名匹配或手造 `__dx_character_ref` 授予 DX 身份。
- 不把 Special NPC 的六页签、雷达面板或响应式样式套到普通无图版。
- DX 可以共享基础组件，但四名 DX 角色可以拥有不同布局、页签与交互。

## 2. 当前实现状态说明

状态标记：

- ✅ 已完成并进入 `main` savepoint
- 🟡 已在当前工作区完成并通过测试，但尚未形成新的 savepoint
- ⬜ 尚未完成
- ❓ 需要 Master 决定

当前验证基线：`pnpm test` 共 241 项，241 项通过。

## 3. 已完成

### 3.1 Special NPC 响应式版式

状态：✅ 已进入 `main` savepoint `82d6956`

- 非 DX 角色只要解析到有效立绘，就进入 `special_npc`。
- 无立绘角色继续使用普通无图版。
- Special NPC 桌面使用左侧立绘、右侧资料和 72px 右侧导航栏。
- Special NPC 手机卡片使用宽度驱动的 `2:3` 固定比例，不依赖 `vh` / `dvh`。
- 手机底栏为六个同层等宽入口：`首页 / 档案 / 技能 / 持有 / 登神 / 面板`。
- 手机首页以立绘为主体，姓名、身份、等级、层级和台词叠在渐变上。
- 手机首页不显示五维属性与 HP / SP / MP。
- 档案页不显示五维旗帜和 HP / SP / MP，并已压缩文字块与间距。
- 技能页使用紧凑行式设计，复用现有效果解析与品质色。
- 持有页合并装备、背包、道具和特殊物品，并沿用技能页的紧凑设计。
- 登神页在 Special NPC 手机端使用紧凑样式。
- 面板页使用雷达图、HP / SP / MP 数字和可选状态效果，不使用五张旗帜。
- Special NPC 立绘失败时可以回退到普通无图版。
- 上述样式通过 `specialNpc` 条件隔离，没有要求普通无图版同步改版。

### 3.2 DX 身份门禁

状态：🟡 当前工作区已完成

- DX 只能由保留占位符进入 loader。
- loader 使用对象身份认证，不接受公开 boolean、可复制 Symbol 或手造对象。
- 对象展开、跨角色改写姓名或 ref、伪造 DX 字段都不能获得 DX 身份。
- 受控的登场台词 clone 可以保留可信 DX 身份，但不能覆盖姓名或 ref。
- Theme 与 ViewModel 使用同一份 DX 身份判定。
- 普通角色即使与 DX roster 同名，也不会获得 DX 图片、主题、故事入口或自动注入。
- 普通完整 YAML 夹带 `__dx_character_ref` 时会剥离该保留字段，并按普通／Special 路由处理。
- DX 优先级高于 Special NPC。

### 3.3 DX 专用目录整理

状态：🟡 当前工作区已完成

DX 相关公共资料已经集中到：

```text
src/char_info_viewer/dx/
├─ index.ts
├─ loader.ts
├─ roster.ts
├─ importQueue.ts
├─ images.ts
├─ storyBooks.ts
└─ dx_character_profiles.worldentry.txt
```

- 旧的 `dxCharacterData.ts`、`dxCharacterRoster.ts`、`characterImageMap.ts`、`characterStoryBookMap.ts` 和 `services/dxCharacterImportQueue.ts` 已迁移或删除。
- Venus 与 Anna 的独立 sample 文件已移除，正式资料保留在 DX registry。
- `venus_worldentry.txt` 使用 `$dx_venus_appear` 与 `__dx_character_ref: dx_venus`。
- roster 中共有四名：Venus、Anastasia、Iris、Siren（瑟涟·赛瑞利亚）。
- 可信 DX Venus 的故事书入口仍可使用，普通或 Special 的同名角色不能取得该入口。

### 3.4 Viewer 与 Creator Manager 模块边界

状态：🟡 当前工作区先完成过双脚本拆分；v0.1.7 将重新合并为单安装脚本

- 对用户与发布只保留一个 CharInfo Manager 脚本，避免同时安装、更新和管理 Viewer / Creator 两份脚本。
- 源码职责仍保持分离：Viewer Runtime 负责玩家功能，Creator Manager 只负责编辑和保存角色视觉资料。
- Viewer、Creator、shared、runtime 文件与函数不能因为重新合包而重新混在一起。
- Editor 只在用户进入编辑流程时 mount，关闭后销毁；合包不代表 Editor 常驻运行。
- v0.1.7 删除只为双脚本通信存在的 host bridge，改为同 bundle 内的窄 Creator API；Viewer 不直接操作 Creator 的 Vue 状态。
- 玩家世界书角色库和条目启停逻辑继续属于 Viewer Runtime，不移回 Creator。
- 未来 bundle 真的大到值得重新拆分时，应只替换入口／打包边界，不重新拆业务模块。

### 3.5 玩家世界书角色库

状态：🟡 当前工作区已完成

- 保留原有桌面角色库设计，而不是重新制作简化版。
- 支持当前聊天角色／世界书角色切换、世界书选择、搜索、状态筛选、种族筛选、紧凑列表和图片卡片。
- 角色卡正文与封面可打开只读详情。
- 玩家可以直接启用或禁用目标世界书角色条目。
- 详情页可以查看图库和世界书正文；只有编辑按钮会调用 Creator Manager。
- 角色库关闭时不挂载 32 张角色卡、详情 DOM 或图片节点。
- 图片使用浏览器懒加载与缓存。

### 3.6 世界书角色库 lazy-load 评估

状态：✅ 已评估，决定暂不实施代码分块

- 关闭页面时已经不挂载角色卡和图片，不会持续渲染。
- 当前世界书角色库组件源码约 53 KB，gzip 约 11 KB。
- 整个 Runtime 约 899 KB，gzip 约 197 KB。
- 仅把该组件改为动态 chunk，理论收益约 6%，实际还会受到共享依赖影响。
- 动态 chunk 会增加本地服务器、CDN 与发布文件缺失导致首次打开失败的风险。
- 当前优先保证正常运行，因此不增加 `KeepAlive`，也暂不做该组件的代码级 lazy-load。

## 4. 部分完成

### 4.1 角色故事入口

- ✅ 可信 DX Venus 的既有故事书入口正常。
- ⬜ 通用 `metadata.story_sections` 尚未实现。
- ⬜ Creator 自定义故事栏目尚未实现。
- ⬜ Viewer 的通用“角色故事”页签尚未实现。

### 4.2 图库功能

- ✅ Viewer 玩家详情可以显示图片、视频和备用图床资料。
- 🟡 立绘首页已有上一张／下一张与备用源代码，但真实页面存在 `URL0` 失败后无法可靠切到 `URL1` 的已知 bug；v0.1.7 必须重新验证并修复 Creator Preview 与 Special Viewer 两条路径。
- 🟡 Runtime 目前会把 `status.externalGalleries.partners` 自动迁移并写回 `char_info.profiles`；这违反 Viewer 只读边界，v0.1.7 必须移除写回。旧 status gallery 可作为只读 fallback 来源。
- ⬜ status gallery 的显式 Import-to-draft、保存时兼容输出及安全移除旧 EJS 属于 Creator UX，默认放到 v0.1.8，不扩大 v0.1.7。
- ⬜ 独立 Gallery Lightbox 尚未实现。
- ⬜ 键盘左右键、Escape、手机滑动和手机底部关闭控制尚未实现。

### 4.3 DX 独立角色 presentation

- ✅ DX 公共 loader、roster、图片、导入队列、故事书和 registry 已集中整理。
- ✅ Venus、Anastasia、Iris 现有主题仍可运行。
- ⬜ 尚未建立四名 DX 各自独立的角色子目录／presentation 模块。
- ⬜ 尚未逐名确认四名 DX 最终布局、页签与交互。

## 5. 尚未完成

### 5.1 Creator metadata 存储与 round-trip

状态：⬜

当前 `CharacterVisualProfile` 只有：

```text
characterName
avatarUrl
raceColor
tierColor
entranceQuote
gallery
galleryExtension
```

尚未实现：

- `metadata.author`
- `metadata.sex`
- `metadata.race`
- `metadata.story_sections`
- metadata 的 normalize / validate / load / save / managed EJS round-trip
- 旧 profile 打开后再保存时保留可选 metadata 的测试

这里的 metadata 是“角色资料附加信息”，不是 `<char_info>` 正文，也不是 DX 或 Special 的版式开关。

### 5.2 自定义角色故事编辑器

状态：⬜

- Creator Step 2 尚未提供故事栏目新增、编辑、上移、下移和删除。
- 尚未定义只保存 `title` / `content`、不保存临时编辑器 ID 的序列化规则。
- 尚未实现零栏目时不创建 metadata 子树。

### 5.3 Viewer 自定义角色故事页

状态：⬜

- 尚未从 profile metadata 读取 `story_sections`。
- 尚未在 ViewModel 输出 `storySections`。
- 尚未实现按作者顺序显示的独立故事面板。
- 尚未实现“有栏目才出现角色故事页签；没有栏目时背景故事留在档案”的规则。

### 5.4 Creator 使用真实 Viewer 预览

状态：⬜

当前 Creator 只有单张相册图片预览，不是完整 Viewer。

尚未实现：

- 在 Creator 内挂载真实 Viewer 进行完整角色卡预览。
- 使用草稿颜色、图库和台词预览但不写入聊天变量或世界书。
- 预览模式禁止 DX 自动注入和普通导入副作用。
- 角色姓名与 profile 不匹配时禁止借用另一个角色的视觉资料。
- 反复打开／关闭预览时的生命周期与监听器清理验证。

### 5.5 Gallery Lightbox

状态：⬜

- 单图点击放大。
- 多图上一张／下一张。
- 桌面左右键与 Escape。
- 手机滑动与底部关闭控制。
- 图片与视频混合时的索引一致性。
- 备用图床失败回退。

### 5.6 最终浏览器回归与清理

状态：⬜

- 在实际 SillyTavern 中逐项检查桌面与手机 Special NPC。
- 分别检查 Venus、Anastasia、Iris 和 Siren 的 DX 页面。
- 检查普通无图版没有被 Special 或 DX CSS 影响。
- 检查页签、内部滚动、图片回退、长文本和 iframe 高度。
- 清理确认无用的 CSS、旧路径文案和过时测试名称。
- 完成后运行 lint、test、build，并检查最终 diff。

## 6. 需要 Master 确认

### 6.1 Siren（瑟涟）是否现在启用 DX loader

状态：❓

当前 registry 已有资料，但 roster 明确保持禁用；这些资料是否已经足够完整，需要 Master 确认：

- DX registry 已经存在 `dx_seren` 的 `display_only` 与 `inject_var`。
- roster 仍把 Siren 标记为 `hasRegistryData: false`。
- 因此 `__dx_character_ref: dx_seren` 目前会被 loader 拒绝。

需要 Master 确认：现有 Siren registry 是否已经算完整，可以把 roster 改为启用；还是继续保留为未启用草稿。

### 6.2 四名 DX 的独立 presentation 先做谁

状态：❓

建立每名 DX 的独立 presentation 前，需要 Master 指定顺序，并提供或确认该角色的目标预览。不要自行把四名角色套进同一模板。

## 7. 后续执行顺序：一次只完成一个 checkpoint

每个 checkpoint 必须：实现、运行相关测试、检查实际结果、报告并停止。没有 Master 的下一句确认，不自动进入下一个 checkpoint。

### v0.1.7 — Stabilization + Reunification

v0.1.7 不增加新的视觉设计或故事功能。目标是把当前工作线收稳，修复已知功能／数据边界问题，并建立下一轮功能开发可依赖的干净基线。

#### Checkpoint 0 — 保存 pre-0.1.7 工作区

状态：✅ `checkpoint/pre-0.1.7` / `860ffa4`

- 审查当前尚未提交的 DX 门禁、DX 目录、双脚本拆分、玩家角色库等现有工作。
- 排除明确的临时／生成物，不凭文件名删除可能属于既有迁移的内容。
- 运行 lint、test、build，确认当前基线仍可工作。
- 不直接继续堆在 `main`；保存为可回退的 pre-0.1.7 checkpoint，并从该状态建立 `fix/v0.1.7-stabilization` 工作分支。
- 完成后停止。

#### Checkpoint 1 — Viewer / Creator 单脚本 reunification

状态：✅ 源码 / test / lint / production build / 实际 SillyTavern lifecycle 已验证

- 用户只安装和管理一个 CharInfo Manager 脚本。
- Viewer、Creator、shared、runtime 模块继续分目录、分职责。
- 删除仅为双脚本通信存在的 host bridge，改为同 bundle 内窄 API。
- Editor 只在需要时 mount，关闭后销毁；不能因为合包变成常驻开销。
- 不把玩家角色库、世界书启停或 Viewer 状态逻辑搬进 Creator。
- 完成后在实际 SillyTavern 验证 Viewer 与 Editor 都可打开、关闭并重复使用，再停止。

#### Checkpoint 2 — 路由与只读数据边界

状态：✅ Special NPC 路由白名单 / Viewer legacy gallery 只读边界 / test / lint / production build / 实际 SillyTavern Special NPC 已验证

- DX 只认可信 DX placeholder + loader；不得通过姓名、profile、metadata 或手造字段升级。
- Special NPC 只由 `char_info.profiles[姓名]` 与暂时兼容的 `char_info_visuals[姓名]` 授予。
- `<char_info>` 内直接图片 URL、普通变量占位符及其他旧图片字段一律忽略，不进入 Viewer 图片数据；旧语法判定优先于聊天中残留的同名 visual profile，角色必须回退为真正的无图 Normal，并复用现有解析 warning 样式在卡片顶部提示作者在角色视觉编辑器中重新保存、升级至 v2。
- Viewer Runtime 停止把 `status.externalGalleries` 迁移并写回 `char_info.profiles`；Viewer 保持只读。
- 旧 status gallery 如需兼容，只能作为只读 fallback；显式迁移与兼容输出留给 Creator 后续功能。
- 普通无图版不得因本 checkpoint 发生布局或视觉变化。
- 完成后停止。

#### Checkpoint 3 — DX production 防泄漏

状态：✅ DX stable adapter / production no-op replacement / stale DX dist cleanup / emitted asset anti-leak scan / 248 tests / lint / production + development build 已验证

- `pnpm watch` 继续包含真实 DX，供本地开发与 Live Server / SillyTavern 调试。
- `pnpm build` 的公开 dist 必须物理排除 DX 实现、registry、专用资料和可识别角色数据，而不是只在 runtime 设为 disabled。
- 处理独立 DX entry 与主 Viewer 静态 import 两条泄漏路径。
- 加 production regression，检查最终 dist 不含已知 DX identifiers / registry signatures。
- 不修改 DX UI 布局、视觉或角色 presentation。
- 完成后停止。

#### Checkpoint 4 — Viewer 玩家 Save 与图片 fallback bug

状态：🟡 图片 fallback 与 Special NPC Viewer Save 已修复；Save 桌面位置已在当前 SillyTavern 实机确认，写入菜单与 fallback 仍待可交互 DevTools session 完成现场回归。

- Viewer 卡片必须保留给玩家使用的 Save 操作；点击后可选择写入 MVU 角色状态或聊天世界书。Special NPC 不得因为 side-rail 分支而硬编码隐藏该入口；只读 Viewer 仍不得显示写入操作。
- 修复 Creator Preview 与 Special Viewer 的备用图床：`URL0` error 或长时间 pending 时必须可靠尝试 `URL1`；进入“立绘无法加载”状态后，用户点击重试也应切换到下一备用 source（耗尽后再 wrap），不能永久卡回同一失败源。
- Creator 允许作者对同一图片的 `sources[]` 逐条上移／下移，明确保存 URL0、URL1 等默认 fallback 顺序；玩家侧 hostname 优先级仍是独立的本机覆盖层。
- Runtime Settings 增加默认关闭的 Debug 模式；开启后 Viewer 与从 Runtime 打开的 Creator 使用 `[CharInfo][ImageFallback]` Console 日志记录实际尝试 URL、source index、error／timeout、fallback、loaded、all failed 与 retry。
- 增加真实行为覆盖，不再只依赖正则静态测试。
- 修复后在当前 SillyTavern session 实测 Save 菜单与图片 fallback。
- 完成后停止。

#### Checkpoint 5 — 图片加载异常与 v0.1.7 收尾

- 使用 Chrome Network / DOM 先诊断同一 PNG 在 CharInfo 中明显更慢的原因。
- 如果确认是重复请求、错误 proxy、lazy-load、retry 或其他实现 bug，则在 v0.1.7 修复；如果只是一般优化机会则记录并延期。
- 完成 Special NPC 桌面／手机、普通无图版、可信 DX、Editor lifecycle、图片 fallback、Console / Network 的实际回归。
- 运行 lint、test、build，并检查最终 diff、production DX 泄漏与只读边界。
- v0.1.7 完成后停止。

### v0.1.8 以后 — 功能开发

#### Checkpoint 6 — metadata 存储契约

- 只实现数据类型、normalize、validate、managed EJS、load/save round-trip 与测试。
- 不做故事编辑 UI。
- 不改普通版、Special UI 或 DX UI。
- 完成后停止。

#### Checkpoint 7 — Creator 自定义故事编辑器

- 只实现 Step 2 的故事栏目编辑。
- 复用 metadata 存储契约。
- 完成后停止。

#### Checkpoint 8 — Viewer 自定义角色故事

- 只实现 service / ViewModel / 故事面板／条件页签。
- 无自定义栏目时，背景故事继续留在档案。
- 不重构普通无图版。
- 完成后停止。

#### Checkpoint 9 — Creator 真实 Viewer 预览

- 使用真实 Viewer，不再制作第二套假预览。
- 预览完全只读，并隔离 DX 自动注入、MVU 导入和世界书写入。
- 完成后停止。

#### Checkpoint 10 — Gallery / status compatibility Creator UX

- 实现 status gallery 缺图检测、显式 Import-to-draft、保存时兼容输出，以及只对可安全识别的纯 status-gallery EJS 提供迁移／移除。
- 再实现独立 Gallery Lightbox、键盘、手机滑动与关闭控制。
- 复用现有图片 URL 规范化与备用源逻辑。
- 完成后停止。

#### Checkpoint 11 — DX 独立 presentation

- 先由 Master 选择一名 DX。
- 一次只建立／完成一名角色的 presentation。
- 不修改普通版或 Special NPC 的既有布局。
- 每名角色完成后停止并验收，再进入下一名。

#### Checkpoint 12 — 性能与最终清理

- 先测量 Runtime 启动、MVU 刷新、MutationObserver 和长期运行成本。
- 只优化能量化证明有明显收益的路径。
- 不为了减少少量 bundle 字节增加脆弱的动态 chunk 或缓存层。
- 完成浏览器回归、CSS 清理、lint、test、build 与最终 diff 检查。
- 完成后停止。

## 8. 已删除的旧路线图错误

以下内容不再是需求，不能据此实施：

- 用 `presentation.kind = special` 决定 Special NPC。
- 存在“普通立绘版”或“普通带图版”。
- 把 Special NPC 的六页签、雷达和响应式外壳同步到普通无图版。
- 把普通版、Special NPC 和 DX 强行统一为同一套页面模型。
- 通过姓名或 `char_info.profiles[name]` 把普通／Special 角色升级为 DX。
- 继续引用已删除的 `dxCharacterData.ts`、`dxCharacterRoster.ts`、`characterImageMap.ts` 或 `characterStoryBookMap.ts`。
- 继续把玩家世界书角色库放在 Creator Manager 内。
- 把 Creator 的单张图片预览误称为“真实 Viewer 预览已完成”。
- 把计划中的 metadata 或 `story_sections` 误写成已经实现。

## 9. 完成标准

只有满足以下条件，相关 checkpoint 才能标记完成：

- 实现范围与本文件一致，没有改普通无图版等范围外功能。
- DX、Special NPC、普通角色三类路由没有互相泄漏。
- 旧 profile 与旧角色无需迁移即可继续使用。
- Creator 不会在无意中擦除未知或可选资料。
- 只读操作不会改聊天原文、聊天变量、世界书或 MVU 数据。
- 实际 SillyTavern 页面中的 DOM、Console、交互和响应式结果已经检查。
- 相关测试、lint 和 build 已运行；未验证项目必须明确列出。
- diff 没有无关文件、重复路径、死代码或意外生成物。
