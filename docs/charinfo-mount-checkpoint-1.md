# Checkpoint 1 result

日期：2026-09-06。工作区：`C:\Project\TavernDev\Scripts\CharInfo-Manager`。
分支：`codex/render-issue-analysis`；HEAD：`b01635fa5095009b4af6376fe887a9bd60a68fd6`。
检查对象为当前工作树，包含任务开始前已有的 `[CharInfo Mount]` 诊断补丁。

Master 随后澄清：当前正在使用的 `0.2.10` 页面正常；目标是解决无法预测的再次失效，不是修复此刻可见的坏页面。旧版正则方案较稳定，但不接受退回旧版体验。设计应保留新版 Manager 的功能与使用方式。下述测试针对当前工作树，不应直接等同于线上 `0.2.10` 的完整复现。

## Proven

- 真实 `runtime.ts`、`nativeMessageMount.ts`、原始消息投影和浏览器 MutationObserver 能确定性重现消息挂载失效。
- 单次 jQuery `.html(...)` 写回会断开原 Vue Teleport 目标，即使新 HTML 复制了相同的 host 属性。节点数量不能证明 Viewer 仍然有效。
- 首次断开通常能恢复，但恢复会重建整段 `.mes_text`，覆盖外部渲染器已改写的正文。
- 初始 1 个 TH-render 对应格式化后 2 个前端 pre 时，实际触发 `TH_RENDER_COUNT_MISMATCH`，挂载返回 null。0 个和完整 2 个均可挂载。
- 首次失败后，仅把第二个 pre 转换完成不会恢复 Viewer；虚拟时间推进 10 秒后仍无挂载、无待执行计时器。之后发送 `MESSAGE_UPDATED` 可立即恢复。
- 两次外部重写之间仅隔 20ms 时，第一次恢复成功，第二次命中 `REMOUNT_LOOP_GUARD`。保护移除已挂载记录，之后 DOM 变动和冷却时间流逝都不能自行恢复。新的消息事件仍可恢复。
- 同一消息及事件集合，全部事件发生在前端转换完成前时失败，完成后再发事件时成功。稳定节点上的重复事件不会重复挂载。
- 两张内容完全相同的卡片得到不同 ordinal ID：`0:0:0`、`0:0:1`。测试过程中所有 raw message 保持不变，停止 runtime 后清除所有自有 host。

## Still uncertain

- 尚未成功连接 Master 已打开的酒馆页面，因此不能声称该页面已经复现问题，也未读取实时监听开关、实际扩展设置和页面 Console。
- 最新一次连接：`127.0.0.1:9222` 拒绝连接；Cotel 的 Chrome DevTools 桥报找不到默认配置目录的 `DevToolsActivePort`；Codex 浏览器清单没有 Chrome 标签页。
- 已核对当前上游 JS-Slash-Runner 的 `render$mes()`：扫描和包装 pre 是同步循环。普通 JavaScript 计时器不能插入同一次同步循环的两个包装操作之间。因此，测试中的 1/2 部分状态证明“这种 DOM 输入会失败”，没有证明“慢设备必然让 TH 自己产生这种中间态”。真实来源仍需用户 trace，例如另一个渲染器分批更新、已有节点与格式化结果结构不同。
- 测试使用窄范围 ST 格式化夹具（正文、HTML fenced code），没有完整加载 ST、EJS 执行器或 TH iframe 生命周期。jQuery、Vue、Teleport 模板、DOM、Observer 及挂载 runtime 使用真实实现。
- 叶子 Viewer 替换为可交互按钮；未验证角色资料解析后的完整视觉 UI、Creator、当前角色库、实际 swipe/regeneration、编辑、旧消息加载、聊天切换和移动设备。这些仍属后续验收。
- MVU 初始化在夹具中保持 pending，避免无关的变量刷新掩盖挂载自己的恢复路径。实际 MVU 更新可能额外触发 force-refresh，因此“长期失踪”的精确定义是：没有后续显式消息/变量刷新事件时不能自行恢复，并非刷新或重开聊天也无法恢复。

## Files inspected

- 根目录 `AGENTS.md`、`README.md`、`package.json`、`.vscode/launch.json`；不存在 `.trellis/workflow.md` 或目标目录局部 AGENTS。
- `src/char_info_viewer_runtime/runtime.ts`：事件、队列、Observer、guard、清理路径。
- `src/char_info_viewer_runtime/nativeMessageMount.ts`：raw slots、TH 数量检查、整段重建。
- `src/char_info_viewer_runtime/RuntimeRoot.vue`：内联卡片的实际 Teleport 模板。
- `src/char_info_viewer_runtime/runtimeSettings.ts`：使用实际默认设置。
- `src/char_info_viewer/runtime/charInfoMessage.ts`、`recentMessages.ts`。
- `tests/register-ts-node.cjs`、`tests/char_info_viewer/message-renderer-compatibility.test.mjs`。
- [ST-Prompt-Template handler.ts](https://github.com/zonde306/ST-Prompt-Template/blob/main/src/modules/handler.ts)：2026-09-06 核对上游 main，读取当前 HTML 后以 `container.html(newContent)` 写回；不是本机已安装版本的确认。
- [JS-Slash-Runner message.ts](https://github.com/N0VI028/JS-Slash-Runner/blob/main/src/store/iframe_runtimes/message.ts)：2026-09-06 核对上游 main，pre 包装同步执行并复用已有 TH-render。

## Files changed

- 新增 `tests/char_info_viewer_runtime/mount-lifecycle.browser.ts`：显式运行的浏览器失败复现测试。
- 新增本交接文件。
- 未修改生产代码、生成的 dist、依赖声明、锁文件或聊天内容；未使用子代理。
- 原有未提交文件保持：`.vscode/settings.json`，3 个 dist 路径，`IllustratedV2Sheet.vue`，`nativeMessageMount.ts`，`runtime.ts`，`variable-scope-lifecycle.test.mjs`，`viewer-host-boundary.test.mjs`，`current-character-library.test.mjs`。

## Tests run

在 Git Bash、仓库根目录运行：

```bash
CHARINFO_PLAYWRIGHT_MODULE=C:/Users/kcwan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright \
node --require ./tests/register-ts-node.cjs --test tests/char_info_viewer_runtime/mount-lifecycle.browser.ts
```

使用本机已安装 Playwright 和 Chrome 152.0.7977.77；不新增仓库依赖。
其他机器可把环境变量指向已有 Playwright 模块；已能 `require('playwright')` 时可省略该变量。

最终结果：8 项，4 通过、4 失败，exit 1，约 8 秒。失败是尚未修复的验收断言，没有用 skip/TODO 或反向断言伪装通过。
首次运行曾被夹具的多余 Vue listener 警告阻断；修正夹具 `inheritAttrs` 后，再次得到相同的四条业务失败。最后一次补上全场景 raw 不变与 stop 清理断言，并验证 TH 节点身份保留，结果仍为 4/4。

| 测试 | 结果 | 关键信号 |
| --- | --- | --- |
| 两张重复卡片、重复事件 | 通过 | 2 张 live card，1 次成功挂载 |
| A：一次 `.html(...)` 后恢复 | 通过 | 0 → 1 张 live card |
| A：保留外部正文变换 | 失败 | `AFTER` 被改回 `BEFORE` |
| B：0 个 / 完整 TH-render | 通过 | 均挂载；原 TH 元素身份保留 |
| B/D：首次失败后 DOM 就绪 | 失败 | 1/2 mismatch；10 秒后仍 0 张；新事件后 1 张 |
| C：短间隔两次重写 | 失败 | guard 后 0 张；10 秒后仍 0 张；新事件后 1 张 |
| C：超过 3 秒间隔重写 | 通过 | 3 次挂载成功，没有 guard |
| E：事件在就绪之前 / 之后 | 失败 | 就绪前事件无法恢复；就绪后事件可恢复 |

未运行完整测试、全仓 lint、build 或 release 检查；本阶段交付是明确的失败复现，不是发布修复。

## Key evidence

### 生命周期时间线（虚拟时钟）

| 时间 | C：连续整段重写 | 有效 Viewer |
| --- | --- | --- |
| 0ms | runtime.start → 扫描、注册事件及 Observer | 0 |
| 20ms | 队列执行 → `MOUNT_SUCCESS` | 1 |
| 20ms 后 | 外部 `.html(...)` → `HOST_DISCONNECTED` → 入队 | 0 |
| 40ms | 第一次恢复，记录 attemptedAt=40 → `MOUNT_SUCCESS` | 1 |
| 40ms 后 | 第二次 `.html(...)` → Observer 入队 | 0 |
| 60ms | elapsed=20 < 3000 → `REMOUNT_LOOP_GUARD` → removeMessage | 0 |
| 10060ms | 追加普通 DOM 节点、推进时间；无恢复计时器 | 0 |
| 10080ms | `MESSAGE_UPDATED` 触发新挂载 | 1 |

B/D：20ms 首次尝试遇到 1/2 mismatch → mountedMessages 为空 → 转换第二个 pre → Observer 返回 → 10020ms 仍无 Viewer → MESSAGE_UPDATED → 10040ms 成功。

A：20ms 挂载 → jQuery 把当前 HTML 中正文 `BEFORE` 改为 `AFTER` 并整段写回 → 原 host 已断开，复制出来的同属性节点不是原 Teleport 目标 → 40ms runtime 从 raw 重建 → Viewer 回来，但正文又变成 `BEFORE`。

### 失败码与确切分支

| 诊断码 | 条件与位置 | 本阶段证据 |
| --- | --- | --- |
| `TH_RENDER_COUNT_MISMATCH` | nativeMessageMount.ts:136，已有 TH 数量 > 0 且不等于 staged frontend pre 数量 | 已执行真实分支：1 vs 2 |
| `HOST_DISCONNECTED` | runtime.ts:667，已登记 message 的 source/任一卡片 host 不再 connected | 已由真实 Observer 触发 |
| `REMOUNT_LOOP_GUARD` | runtime.ts:495，仍有 current、signature 相同、距上次恢复 < 3000ms | 已执行真实分支：20ms；移除记录后没有定时唤醒 |
| 无诊断（首次失败后） | runtime.ts:652，mountedMessages.size === 0，Observer 立即返回 | DOM 就绪后 attempts 保持 1；随后显式事件成功 |
| 无诊断（覆盖外部变换） | nativeMessageMount.ts:225、239，从 raw format 后 replaceChildren | 以成功挂载的形式覆盖 `AFTER` |
| `MESSAGE_DOM_UNAVAILABLE` / `SKIP_EDITING` | runtime.ts:426 / 437 | 本轮静态阅读，未构造 |
| `MESSAGE_ID_UNRESOLVED` / `RAW_MESSAGE_UNAVAILABLE` / `CARD_SLOT_BUILD_FAILED` / `TOKEN_INJECTION_FAILED` | nativeMessageMount.ts 的输入/slot 前置失败 | 本轮未复现，不宣称受影响用户命中 |
| `ROOT_REPLACE_FAILED` / `HOST_COLLECTION_FAILED` / `RENDER_THROWN` | 替换异常、host 数量失败、runtime 捕获异常 | 本轮未出现 |

补充：即使其他楼层已挂载，runtime.ts:665–666 也只处理当前有 mounted 记录的楼层；仅删除 size===0 的早退不能构成完整首次失败恢复方案（此项为静态代码证据）。

## Decision / recommendation

已满足 Checkpoint 1 的确定性复现目标。最有力的证据是整段 DOM 所有权冲突及失败后没有自主恢复路径，而不是一个特定的延时数值。
不应直接增加重试、删除 guard 或让 Observer 更频繁扫描。Checkpoint 2 应比较 TH 标准 frontend/iframe 路径与只插入局部锚点路径，检查显示正则 API 与 raw 数据传输；当前尚未选择或实现方案。

## Next checkpoint

Master 最新澄清后，不以等待当前页面偶发失效作为推进前提。实际浏览器连接限制仍保留；未来用于确认兼容性和已安装版本差异，不能用“当前正常”否定受控复现。
Checkpoint 2 比较保留新版 Manager 使用方式的方案；借鉴旧版的隔离边界，不以回退旧版正则包作为目标。提供具体方案、数据通道和生命周期，再实施生产修改。

## Stop here

Checkpoint 1 不改生产架构。本文件不能作为真实酒馆兼容性通过或 staging 就绪的声明。
