# Illustrated Character Platform 架构约定

> 本文定义立绘角色卡渲染系统的分层、状态 ownership、可替换边界与禁止事项。
> 人类术语以 `docs/terminology-keymap.md` 为准：本文中的「立绘角色卡」= 内部路由 `special_npc`；`Special NPC` 只在指代源码路由值时出现。

修改 `src/char_info_viewer/components/illustrated/` 下的任何文件前，先读本文。

---

## 1. 现状基线（`origin/dev` @ `640251e`）

| 事实 | 值 |
| --- | --- |
| `IllustratedCharacterSheet.vue` 总行数 | 2119 |
| 其中 template | 1–364 |
| 其中 script | 366–795（约 430 行） |
| 其中 style | 797–2119（1323 行，**约 62%**） |
| 已存在的 panel 模块 | `IllustratedHeader` / `IllustratedOverviewPanel` / `IllustratedProfilePanel` / `IllustratedItemCard` / `IllustratedCharacterPanel` / `IllustratedDefaultDivinityPanel` / `IllustratedTabNav` |
| 入口 | `src/char_info_viewer/App.vue:82`，条件 `shouldShowSpecialNpcLayout && vm` |

**这个文件不是「还没拆」，而是「壳 + portrait 状态 + tab 状态 + 大半 CSS 还没拆」。** panel 层已经拆好了。所以后续工作的重点是状态与 CSS ownership 的搬迁，不是继续切组件。

### DX 代码当前不在 `dev` 上

DX 实现在 `origin/feat/dx-character-v2-dev-sync`。`IllustratedV2Sheet.vue` 是 690 行 wrapper：template 只有一行 `<IllustratedCharacterSheet v-bind="$attrs" side-rail-navigation />` 加一层装饰，script 5 行，style 654 行，其中约 82 个 selector 直接打在默认 renderer 私有 class 上（`.illustrated-shell`、`.illustrated-portrait-pane`、`.illustrated-data-pane`、`.illustrated-group-panel`、`.illustrated-tabs.is-side-rail`、`.illustrated-attribute-total` 等）。

这就是本平台存在的理由：**外部设计一旦依赖默认 renderer 的私有 DOM，默认 DOM 一动，外部一起坏。**

---

## 2. 平台目的

立绘角色卡要同时服务两种角色：

- **立绘角色卡（默认）**：给普通内容创作者的稳定、统一、低门槛展示工具。默认路径必须永远简单。
- **DX**：用于实验、展示和推广新 UI / 新交互的高级设计。

产品流程：

```text
DX 实验新玩具
    ↓
验证是否好用
    ↓
抽取角色专属部分
    ↓
变成 reusable module
    ↓
定义少量稳定参数
    ↓
加入默认立绘角色卡
```

架构目标不是减少文件行数，而是建立一个明确的 seam：

```text
共享行为核心
      │
      ├── 默认立绘角色卡 Renderer
      │
      └── DX Renderer / DX Module Override
```

---

## 3. 四层 ownership

```text
src/char_info_viewer/components/illustrated/
│
├─ core/        行为与状态，无设计倾向，无 px
├─ default/     官方默认 Renderer 与可复用视觉模块
├─ themes/      可选共享 design token
└─ dx/          DX 专属实现
```

目录放在 `components/illustrated/` 下而不是新建 `src/char_info_viewer/illustrated/`，因为已有 9 个测试文件通过相对路径读取这些源码，移动目录会产生与本次重构无关的失败。

### 3.1 core

`core` 持有行为与状态，不含任何视觉决策。

允许包含：当前 tab、可见 tab 列表、profile 子视图、group collapse、quote dialog 开关、save phase、CharacterViewModel、feature availability、portrait 索引与媒体源状态机。

禁止包含：`px`、`em`、`%` 宽度、`border-radius`、`gradient`、`object-fit`、断点值、任何「tab 在底栏还是侧栏」的信息。

核心文件：

```text
core/useIllustratedSheetController.ts
core/useIllustratedPortrait.ts
core/types.ts
core/illustratedTabs.ts
```

### 3.2 default

官方默认 Renderer 与它的可复用视觉模块。默认路径就是这一层，普通创作者只需要看到它。

```text
default/SpecialNpcIllustratedSheet.vue   薄组合层
default/IllustratedPortraitPane.vue
default/IllustratedHeader.vue
default/IllustratedOverviewPanel.vue
default/IllustratedProfilePanel.vue
default/IllustratedStoryPanel.vue
default/IllustratedItemCard.vue
default/IllustratedDefaultDivinityPanel.vue
default/IllustratedCharacterPanel.vue
default/IllustratedTabNav.vue
default/IllustratedQuoteDialog.vue
```

`SpecialNpcIllustratedSheet.vue` 只做组合、路由、layout 与跨模块布局协调，不做数据解析、不做 save 业务逻辑。

### 3.3 themes

跨 Renderer 的**可选**共享语言（前景、表面、边框、强调色、阴影）。共享 token 是为了方便复用，不是视觉限制；DX full renderer 可以完全定义自己的 CSS。

### 3.4 dx

DX 专属实现。DX 分支尚未合入 `dev`，本层当前为空。

---

## 4. DX 的三级自由度

| Level | 手段 | 适用 |
| --- | --- | --- |
| 1 | Theme Skin：只换 token | 结构相同、艺术风格不同 |
| 2 | Module Override：替换少数模块，其余 fallback 到默认 | 绝大多数 DX |
| 3 | Full Renderer：自实现 Renderer，只用 core controller | 完全不同的信息架构 |

Level 3 必须作为 escape hatch 存在，否则所有特殊 DX 最终都会退化成 `!important` 覆盖。

**禁止用大量 slot 实现可替换性**，那会变成 slot spaghetti。**也禁止把模块切得过细**（`NameText.vue` / `TierBadge.vue` / `TagChip.vue` 这类），DX 拼几十个 Lego 的维护成本更高。合理的 module 粒度是「设计师真的会整块重新设计」的区域。

---

## 5. 状态 ownership：一个状态一个 owner

```text
portrait index / source index / loaded / failed / timeout  → portrait controller
active tab / profile subview / group collapse / quote dialog → sheet controller
save phase                                                 → viewer core / runtime
```

不允许父组件持一个 ref、子组件再复制一个、再用 watch 互相同步。这是 Vue 史山最常见的来源。

Renderer 只接收 `ViewModel` / `Controller` / module props，不在 UI 组件里重新解析 YAML / Worldbook / MVU。

---

## 6. 模块成熟度生命周期

```text
Experimental  →  Reusable Internal  →  Creator-facing Stable
```

- **Experimental**：仅 DX 使用，可自由变化，不承诺兼容。
- **Reusable Internal**：已证明多角色可共用，有明确 props / controller contract。
- **Creator-facing Stable**：API 已简化、mobile / desktop 已验收、可给普通用户配置；进入此级别后尽量保持向后兼容。

**每加一个创作者配置字段，必须先走完这条链。** 否则每个 DX 实验都会立刻变成永久 public API。

底层可以自由，但创作者看到的只能是稳定 preset（立绘样式、导航位置、台词样式、故事样式、技能卡密度、显示开关），不是 component registry / slot / module id / render function。

---

## 7. 禁止事项

1. `SpecialNpcIllustratedSheet.vue` 不实现 domain detail。新 feature 超过一个完整 UI region 时，优先放进独立 module。
2. 不为减少行数拆微型组件，除非出现真实复用或独立行为需求。
3. 一个状态只允许一个 owner，禁止父子复制 ref + watch 互同步。
4. Renderer 不做数据解析。
5. core 不含视觉参数。
6. DX 不允许依赖默认 Renderer 私有 class。需要 `.default .xxx .yyy` 时先问：是缺 theme token，还是应该做成 module override？
7. 公开 contract 数量受控，不因 DX 实验新增创作者配置。
8. 不提前实现 renderer registry / plugin loader / layout DSL / drag-drop builder。当前没有这个需求，先用显式 import 与 props。

---

## 8. 已知测试约束

以下测试通过**正则匹配源码文本**断言 `IllustratedCharacterSheet.vue` 与 `IllustratedTabNav.vue` 的内部实现，不是行为测试。搬迁代码时必须同步迁移断言，否则会整片变红：

```text
tests/char_info_viewer/image-preload.test.cjs
tests/char_info_viewer/portrait-gallery-controls.test.cjs
tests/char_info_viewer/mobile-entrance-quote.test.cjs
tests/char_info_viewer/special-npc-shell.test.mjs
tests/char_info_viewer/special-npc-story.test.mjs
tests/char_info_viewer/illustrated-navigation.test.mjs
tests/char_info_viewer/illustrated-overview.test.mjs
tests/char_info_viewer/progressive-loading-performance.test.mjs
tests/char_info_viewer/save-actions.test.cjs
tests/char_info_viewer_runtime/force-mobile-layout.test.mjs
tests/char_info_viewer_runtime/debug-mode.test.mjs
tests/char_info_viewer/viewer-host-boundary.test.mjs
```

每一步迁移都必须让这批测试跟着新文件一起走，保持绿色。

---

## 9. 迁移顺序与验证

每个 phase 一个 commit，可单独回滚。默认视觉、mobile / desktop 路由 contract 必须保持。

| Phase | 内容 |
| --- | --- |
| 0 | 本文（不改功能） |
| 1 | portrait seam：抽 `useIllustratedPortrait` + `IllustratedPortraitPane` |
| 2 | sheet controller：抽 `useIllustratedSheetController` |
| 3 | 默认 renderer 收薄为 `SpecialNpcIllustratedSheet`，旧文件名保留兼容 wrapper |
| 4 | 剩余自然模块：Story panel、Quote dialog |
| 5 | `IllustratedRendererOverrides`：Header / Overview / Portrait / ItemCard / Navigation，默认 fallback |
| 6 | 把 DX 接入新 seam（本轮**不做**，见下） |

每 phase 至少满足：行为测试通过、build 通过、lint 0 error、默认视觉无意外改变、mobile / desktop 路由 contract 保持。

**Phase 6 之前不 merge DX 分支。** 这样整个迁移过程零 DX 干扰，回归只可能来自本次改动本身。

本轮同时**不做**：Theme Lab redesign、立绘角色卡新 UI、新 DX feature、新创作者设置、safe-area B、breakpoint B、drag & drop、layout schema、JSON module DSL、dynamic plugin loading、完整 design system。同时改视觉会让回归无法归因。

---

## 10. 维护体验目标

新维护者（或新 LLM）打开项目应该能直接定位：

```text
改 portrait 加载行为          → core/useIllustratedPortrait
改默认 portrait 外观          → default/IllustratedPortraitPane
改默认导航                    → default/IllustratedTabNav
给 DX 一个完全不同的导航       → dx/<该 dx>
新增所有角色通用的 tab 行为    → core
把成熟 DX 玩具开放给创作者     → 先 reusable module，再接创作者 preset
```

而不是「搜一下 `illustrated-xxx`，看看哪 14 个文件都有这个 class」。

判断任何抽象是否该加，只问一句：

> **它能帮助「持续生产 DX 玩具、并把成熟玩具安全下放给普通创作者」吗？** 不能就删掉。
