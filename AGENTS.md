# AGENTS.md

本仓库用于编写 Tavern Helper / SillyTavern 的前端界面、后台脚本与 MVU 角色卡。
本文件只定义 Agent 的入口规则；具体领域知识由对应 Skill 和仓库现有代码提供。

## 回复与协作

- 始终使用中文回复，并称呼用户为 Master。
- 先给结果或下一步，少套话和空泛总结。
- 需求明确时直接执行；只有缺失信息会明显改变方案或带来风险时才提问。
- 多步骤任务先发送一句简短进度说明，再开始读取和修改。
- 不扩写需求，不顺手添加无关功能，不为了“更完整”进行大重构。
- 发现方案存在风险时直接指出，并给出可执行替代方案。

## 开始任务

修改、调试、重构或排错前：

1. 读取 `README.md`、目标目录附近的实现、模板、类型定义和局部 `AGENTS.md`。
2. 根据任务读取对应 Skill。
3. 确认现有项目结构、数据流和写法后，再选择最小修改范围。
4. 不要凭通用前端经验直接编写；优先复用仓库已有实现。

目标不明确时，先用 `rg --files` 和关键词搜索查找相近文件、调用方式与命名模式。

## Skill 路由

任务涉及下列内容时，必须先读取对应 Skill；具体实现规则以 Skill 为准，不在本文件重复：

- 前端界面、状态栏、楼层 UI、Vue、HTML、CSS、响应式布局：`tavern-helper-frontend`
- 后台脚本、事件监听、脚本按钮、操作酒馆页面 DOM、向页面挂载组件：`tavern-helper-script`
- MVU、`stat_data`、变量读写、MVU 事件、变量解析：`mvu-variable-framework`
- 整张 MVU 角色卡、`schema.ts`、角色卡脚本、界面与世界书：`mvu-character-card`

任务跨越多个领域时组合读取对应 Skills。
仅在任务实际涉及 MVU 时读取 MVU Skills。
制作整张 MVU 角色卡时，同时读取 `mvu-variable-framework` 和 `mvu-character-card`。

## 开发原则

- 使用 TypeScript，不新建 JavaScript 脚本。
- 运行环境是浏览器，不使用 Node.js 专用库。
- 修改前查看同目录已有写法，保持项目风格。
- 优先复用 `util/`、`@types/`、现有模板和 `package.json` 已有依赖。
- 不随意新增依赖、抽象层、兼容层或隐藏 fallback。
- 只修改与任务直接相关的文件；发现无关问题时说明，不要静默修复。
- 删除被新实现取代的旧逻辑，避免重复路径、吞错和死代码。

## 页面调试

- SillyTavern 地址以 `.vscode/launch.json` 为准。
- Chrome DevTools MCP 连接 `http://127.0.0.1:9222`。
- 需要检查实际页面时，连接用户已经打开并操作到当前状态的 SillyTavern 页面；不要重新打开首页后猜测状态。
- 连接后检查 `#extensions_settings` 中“酒馆助手-实时监听-允许监听”是否启用。
- 若实时监听已启用，使用热重载验证；不要为了同步代码无意义地刷新页面或完整构建。
- 页面问题必须检查实际 DOM、Console 和交互结果，不能只根据源码推测。

## 验证

- 优先验证用户要求的目标行为，再运行与改动规模匹配的类型检查、lint、构建或页面 smoke test。
- 忽略来自 `@vueuse/core`、`vue3-pixi` 或 `@types/web-bluetooth` 的 Bluetooth 相关诊断，前提是它们与当前任务无关且不会导致构建失败。
- 不以无关的大范围检查拖延任务。
- 最终回复前检查 diff，确认没有无关改动、症状补丁、重复逻辑、未清理资源或未说明的行为变化。
- 未实际验证的内容必须明确说明，不得假装成功。

## 发布与 tag

- `.github/workflows/bundle.yaml` 会在 `main` / `master` 收到非 `dist/**` 的 push 后自动重建 `dist`、提交 `[bot] bundle` 并创建下一个 `vX.Y.Z` tag。
- 除非用户明确要求，不要手动创建或推送 tag。
- 通常只 push 主分支，等待 GitHub Actions 创建 tag 后再 fetch tags 验证。
- 用户要求手动 tag 时，先提醒自动 workflow 可能继续生成下一个版本。
