# Illustrated Character Platform 架构约定

> 本文定义立绘角色卡渲染系统的分层、状态 ownership、可替换边界与禁止事项。
> 人类术语以 `docs/terminology-keymap.md` 为准：本文中的「立绘角色卡」= 内部路由 `special_npc`；`Special NPC` 只在指代源码路由值时出现。

修改 `src/char_info_viewer/components/illustrated/` 下的任何文件前，先读本文。

---

## 1. 当前状态

Phase 0–5 已完成。默认 renderer 已从「单文件壳 + 大半 CSS」拆成 `core/` 行为层与 `default/` 视觉层，旧文件名只保留兼容 wrapper，五个可替换模块已有 fallback seam。

### 当前 ownership 事实

| 事实 | 位置 |
| --- | --- |
| 默认 renderer 实现 | `default/IllustratedDefaultSheet.vue` |
| 兼容入口（只转发） | `illustrated/IllustratedCharacterSheet.vue` |
| 立绘行为 | `core/useIllustratedPortrait.ts` |
| tab / 子视图 / 折叠 / 台词弹窗 | `core/useIllustratedSheetController.ts` |
| visual token 定义 | `default/IllustratedDefaultSheet.vue` 的 `.illustrated-wrapper` 块 |
| Viewer 入口 | `src/char_info_viewer/App.vue`，条件 `shouldShowSpecialNpcLayout && vm` |

`IllustratedCharacterSheet.vue` 只做 props / events 转发，**不持有实现**。新增功能一律改 `default/` 内的文件，不要往 wrapper 里加逻辑。

### 迁移历史（仅供追溯，不作为当前事实）

重构前 `IllustratedCharacterSheet.vue` 是 2119 行的单文件（template 1–307、script 309–523、style 525–1515）。拆分过程见 §9 的 phase 表与对应 commit。**不要用旧行数判断当前结构**——行数只是迁移副产品，不是契约。

### 已知的历史教训（Phase 1 踩过）

1. **`scoped` 只给最后一个复合选择器打 `data-v-*`。** 因此 `.illustrated-shell.is-x .child` 搬进子组件后**仍然有效**，而父级里写成 `.shell .child[data-v-parent] :deep(...)` 的规则，在 `child` 移入子组件后**会静默失效**——`child` 只带 child 的 scope id。跨组件覆盖必须把整条后代链收进一个 `:deep()`。
2. **源码正则测试和 transpile-only 构建都抓不到未定义标识符。** `captureDetailWallpaper` 曾在 Phase 1 漏了解构 `portraitLoaded` / `portraitLoadFailed`，build 与全部测试全绿，但真实运行时一离开首页 tab 就抛 `ReferenceError`。父级引用 controller 的任何字段，必须有对应断言守住。
3. **一个状态的旧契约可能只迁了一半。** Phase 3 把 renderer 搬进 `default/` 时，`App.vue` 已改传 `:save-phase`，wrapper 与 default sheet 仍声明 `importing` / `importButtonText`。搬迁时必须同时迁移 props 契约，并全链核对。
4. **`<script setup>` 里的 Ref 不能当 prop 传下去再用 `:ref` 接收。** binding 属于 `setup-maybe-ref`，编译产物是 `_unref(x)`，子组件拿到 `.value`。`setRef` 的实现本身是对的（`rawRef.f` 为 false 时直接 `ref.value = value`），错在 prop 传过去之前就被解包了——只读 runtime 源码、不看编译产物会得出相反结论。要跨组件传 DOM 引用就用 callback template-ref。


### DX 代码当前不在 `dev` 上

DX 实现在 `origin/feat/dx-character-v2-dev-sync` 与 `origin/DX-character-V2-remake`，**尚未合入本分支**（Phase 6 才接入）。`IllustratedV2Sheet.vue` 是 690 行 wrapper：template + script 只有 27 行，其余 654 行是 CSS，其中 81 个 selector 直接打在默认 renderer 私有 class 上。

这就是本平台存在的理由：**外部设计一旦依赖默认 renderer 的私有 DOM，默认 DOM 一动，外部一起坏。**

### 1.1 DX selector 分类（Phase 5 实证）

**81 个 selector 是 evidence，不是 specification。** Phase 5 逐条读过，分类如下：

| 类别 | 实际内容 | 处置 |
| --- | --- | --- |
| **已在 token contract 内** | `.illustrated-v2-theme-* .illustrated-wrapper { --illustrated-*: ... }` 两个大块，单块就重定义 60+ token | **已由 Level 1 覆盖**，不需要 override |
| **theme token 缺口** | `illustrated-tab-button` x11、`illustrated-tabs` x7、`illustrated-header` x7、`illustrated-page-title` x4、`illustrated-attribute` x4、`illustrated-tag` / `illustrated-tier` / `illustrated-subtitle` / `illustrated-level` / `illustrated-name` / `illustrated-line` / `illustrated-text-block` / `illustrated-list-item` / `illustrated-attribute-total` 等 | 改的是颜色、阴影、圆角、边框——**应该补进 token contract，不是 module replacement** |
| **default layout coordination** | `illustrated-shell` x4、`illustrated-data-pane` x4、`illustrated-portrait-pane` x5、`illustrated-group-panel` x2 | renderer 拥有的骨架，**不属于任何可替换模块**；塞进 override 会让 seam 变形 |
| **DX 私有 styling** | `iris-v2-*` / `anastasia-v2-*` 装饰层、bubble、jellyfish、dream-dice | 本来就该留在 DX 自己文件里，**platform 不需要 seam** |

**结论：Level 2 module override 只覆盖 5 个模块边界，DX 现有 81 个 selector 里绝大多数仍属于 Level 1 token 或 DX 私有样式。** 这正是想要的窄 seam。Phase 6 接入 DX 时，应先把剩余非 token 规则补进 token contract，**而不是扩张 override 槽位**。

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

核心文件（当前已存在）：

```text
core/useIllustratedSheetController.ts
core/useIllustratedPortrait.ts
```

`illustrated/types.ts` **继续作为 platform shared types 留在 root**，不为了对齐早期计划草图而提前移动。它目前同时被 core、default renderer、compatibility wrapper 消费，将来还会被 Phase 5 的 renderer override contracts 与 DX 消费——留在 `components/illustrated/` 根是当前最清楚的位置。

Phase 5 建立 `IllustratedRendererOverrides` / renderer contracts 时，再按**真实 ownership** 判断每个类型该去哪里：

```text
behavior-only type          → core/
platform-wide shared contract → 保留 root types.ts
default-only presentation   → default/
DX-only type                → dx/
```

如果结论是 root 就是最清楚的位置，就永久保留，不需要为了「完成计划」移动。

### 3.2 default

官方默认 Renderer 与它的可复用视觉模块。默认路径就是这一层，普通创作者只需要看到它。

```text
default/IllustratedDefaultSheet.vue   薄组合层 + visual token 定义
default/IllustratedPortraitPane.vue
default/IllustratedQuoteDialog.vue
default/IllustratedStoryPanel.vue
default/IllustratedHeader.vue
default/IllustratedOverviewPanel.vue
default/IllustratedProfilePanel.vue
default/IllustratedItemCard.vue
default/IllustratedDefaultDivinityPanel.vue
default/IllustratedCharacterPanel.vue
default/IllustratedPageTitle.vue
default/IllustratedTabNav.vue
default/divinitySections.ts
```

`IllustratedDefaultSheet.vue` 只做组合、路由、layout 与跨模块布局协调，不做数据解析、不做 save 业务逻辑。

**当前组件名不含 `SpecialNpc`**：它是「默认稳定 renderer」，不是「special_npc 版式」。`special_npc` 只作为 Viewer 内部路由值出现。

Phase 4 之后，sheet 里已不再有 domain-detail markup：故事与完整台词各自成模块。

`IllustratedQuoteDialog.vue` 用 **callback template-ref** 把关闭按钮 DOM 交回 controller：controller 暴露 `setQuoteDialogCloseButton(element)`，父级传 `:set-close-button="setQuoteDialogCloseButton"`，子组件写 `:ref="setCloseButton"`。

**绝对不要把 controller 的 Ref 对象当 prop 传下去再用 `:ref` 接收。** `<script setup>` 模板里该 binding 的类型是 `setup-maybe-ref`，跨 component 传 prop 时编译产物是 `_unref(quoteDialogCloseButton)`——子组件收到的是 `.value`（`null`），DOM 永远写不回 controller。Phase 4 最初就是这么写的，源码正则、build、358 条测试全绿，但 `openQuote()` 的 nextTick focus 与 `keepQuoteDialogFocus()` 在运行时静默失效。真实 runtime 回归测试见 `tests/char_info_viewer/quote-dialog-focus.test.mjs`。

### 3.3 themes

跨 Renderer 的**可选**共享语言（前景、表面、边框、强调色、阴影）。共享 token 是为了方便复用，不是视觉限制；DX full renderer 可以完全定义自己的 CSS。

**当前 `themes/` 目录还不存在。** visual token 定义在 `default/IllustratedDefaultSheet.vue` 的 `.illustrated-wrapper` 块（commit `5476e34` 建立契约，`a008409` 让各 panel 消费）。等真正出现第二个 renderer 时再抽目录。

### 3.4 dx

DX 专属实现。DX 分支尚未合入，本层当前为空。


---

## 4. DX 的三级自由度

| Level | 手段 | 适用 |
| --- | --- | --- |
| 1 | Theme Skin：只换 token | 结构相同、艺术风格不同 |
| 2 | Module Override：替换少数模块，其余 fallback 到默认 | 绝大多数 DX |
| 3 | Full Renderer：自实现 Renderer，只用 core controller | 完全不同的信息架构 |

Level 3 必须作为 escape hatch 存在，否则所有特殊 DX 最终都会退化成 `!important` 覆盖。

**禁止用大量 slot 实现可替换性**，那会变成 slot spaghetti。**也禁止把模块切得过细**（`NameText.vue` / `TierBadge.vue` / `TagChip.vue` 这类），DX 拼几十个 Lego 的维护成本更高。合理的 module 粒度是「设计师真的会整块重新设计」的区域。

### 4.1 Module Override contract

`IllustratedRendererOverrides` 定义在 `illustrated/types.ts`（platform shared types，不新建 `core/types.ts`）：

```text
header?      IllustratedHeader
overview?    IllustratedOverviewPanel
portrait?    IllustratedPortraitPane
itemCard?    IllustratedItemCard
navigation?  IllustratedTabNav
```

五项**全部可选**，逐项独立回落。`IllustratedDefaultSheet.vue` 用五个 `computed` 逐项解析（`props.overrides?.x ?? Default`），模板用 `<component :is>` 绑定。

不提供 registry、plugin loader、slot、JSON layout DSL、动态发现、创作者配置项。需要时用显式 import + props 表达。

**ItemCard 只有一个 override 槽位**，不是按 tab 分裂成 Skill/Equipment/Inventory/Status 四套。六个调用点共用 `itemCardModule`，差异全部经由既有 `variant` prop 表达。DX 若真需要不同 renderer，再在 override 内部按 `variant` 分支。

`portrait` 有一项额外义务：必须 `defineExpose({ captureCurrentFrame })`。移动端详情快照由父级 canvas 绘制，父级只调这个方法，不接触媒体 DOM。缺少它不会崩，但移动端详情页会静默失去背景图。

#### seam 必须脱离 default implementation

两处容易被忽略、但会让 seam 名存实亡的地方：

1. **compatibility wrapper 显式声明 `overrides`。** 历史 DX 正是通过 `illustrated/IllustratedCharacterSheet.vue` 进入渲染器。Vue 当前可能因为单根 component 让它靠 `$attrs` fallthrough 碰巧工作——**但 seam 不能建在隐式行为上**。wrapper 用现有的 `v-bind="$props"` 转发，不新增 adapter。
2. **portrait template ref 依赖 capability，不依赖默认组件 instance。** `portraitPaneElement` 的类型是 `IllustratedPortraitModuleHandle`，不是 `InstanceType<typeof IllustratedPortraitPane>`。否则 portrait override 一接上，父级在类型层就重新依赖回默认实现。

```ts
export type IllustratedPortraitFrame = {
  source: CanvasImageSource;
  width: number;
  height: number;
};

export type IllustratedPortraitModuleHandle = {
  captureCurrentFrame(): IllustratedPortraitFrame | null;
};
```

默认 `IllustratedPortraitPane.captureCurrentFrame()` 返回同一个 `IllustratedPortraitFrame`。父级只问「现在显示的是哪一帧」，不关心媒体是 `<img>` 还是 `<video>`。

#### 五个模块的 contract

| 模块 | props | emits | expose |
| --- | --- | --- | --- |
| `header` | `vm`, `compact?` | `layoutChange` | — |
| `overview` | `attributes`, `resourceBoxes`, `entranceQuoteText?` | `toggleAttributeFormula(key)`, `openEntranceQuote` | — |
| `portrait` | `vm`, `portrait`, `isOverviewTab`, `forceMobileLayout` | `fallbackToDefault`, `openEntranceQuote(event)` | `captureCurrentFrame()` |
| `itemCard` | `item`, `showCost?`, `variant?` | — | — |
| `navigation` | `tabs`, `activeTab`, `savePhase`, `showImportAction`, `forceMobileLayout?`, `sideRail?` | `setTab(tab)`, `toggleImportMenu` | — |

当前阶段刻意保持 `Component`，不做 Vue generic 化——五个模块共用一个槽位类型已经够用，等真的出现类型冲突再拆。

---

## 5. 状态 ownership：一个状态一个 owner

```text
portrait index / source index / loaded / failed / timeout  → portrait controller
active tab / profile subview / group collapse / quote dialog → sheet controller
save phase                                                 → viewer core / runtime
```

不允许父组件持一个 ref、子组件再复制一个、再用 watch 互相同步。这是 Vue 史山最常见的来源。

Renderer 只接收 `ViewModel` / `Controller` / module props，不在 UI 组件里重新解析 YAML / Worldbook / MVU。

### save phase contract

`savePhase` 是当前唯一的保存状态契约，定义在 `src/char_info_shared/viewerSaveUi.ts`：

```ts
type ViewerSavePhase = 'idle' | 'pending' | 'success' | 'error';
```

它取代了旧的 `importing: boolean` + `importButtonText: string`。按钮文案由 `VIEWER_SAVE_NAV_LABELS[savePhase]` 推导，**不允许再由调用方传入自由文本**。导入菜单的按钮文案同样来自 `VIEWER_IMPORT_MVU_LABEL` / `VIEWER_IMPORT_WORLDBOOK_LABEL` 常量。

链路是 `viewer core`（持有真实 phase）→ `IllustratedCharacterSheet`（wrapper 转发）→ `IllustratedDefaultSheet` → `IllustratedTabNav`。wrapper 只透传，不解释、不转换。

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

1. `IllustratedDefaultSheet.vue` 不实现 domain detail。新 feature 超过一个完整 UI region 时，优先放进独立 module。
2. 不为减少行数拆微型组件，除非出现真实复用或独立行为需求。
3. 一个状态只允许一个 owner，禁止父子复制 ref + watch 互同步。
4. Renderer 不做数据解析。
5. core 不含视觉参数。
6. DX 不允许依赖默认 Renderer 私有 class。需要 `.default .xxx .yyy` 时先问：是缺 theme token，还是应该做成 module override？
7. 公开 contract 数量受控，不因 DX 实验新增创作者配置。
8. 不提前实现 renderer registry / plugin loader / layout DSL / drag-drop builder。当前没有这个需求，先用显式 import 与 props。

---

## 8. 已知测试约束

以下测试通过**正则匹配源码文本**断言 illustrated 各组件的内部实现，不是行为测试。搬迁代码时必须同步迁移断言的**路径与断言内容**，否则会整片变红：

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

| Phase | 内容 | 状态 |
| --- | --- | --- |
| 0 | 本文（不改功能） | 完成 `d3f0576` |
| 1 | portrait seam：抽 `useIllustratedPortrait` + `IllustratedPortraitPane` | 完成 `9d6817f` / `f7ae986` |
| 2 | sheet controller：抽 `useIllustratedSheetController` | 完成 `a301d7e` |
| 3 | 默认 renderer 收薄为 `IllustratedDefaultSheet`，旧文件名保留兼容 wrapper | 完成 `80c0dc3` / `17efa45` |
| 4 | 剩余自然模块：Story panel、Quote dialog | 完成 `4d97d6c` |
| 5 | `IllustratedRendererOverrides`：Header / Overview / Portrait / ItemCard / Navigation，默认 fallback | 完成 |
| 6 | 把 DX 接入新 seam（本轮**不做**，见下） | 不做 |

每 phase 至少满足：行为测试通过、build 通过、lint 0 error、默认视觉无意外改变、mobile / desktop 路由 contract 保持。

除自动化门禁外，**每次搬迁样式或状态都必须额外做一次 CSS 零差异比对**：编译所有 illustrated SFC 的 scoped style，把每条规则展开成

```text
identity = at-rule ancestry  >>  selector  {  排序后的 declarations  }
```

**at-rule ancestry 必须参与 identity**，至少包含 `@container`、`@media`、`@supports`。只比 selector + declarations 会把「同一条规则从 `@container` 内搬到外面」误判成零差异——条件消失了，但文本完全一样。

切分前还要整体剥掉注释：sass 会把 SCSS 注释保留在编译产物里，注释中的 `@container` 字样与花括号会让规则切分错位。剥不干净时报出的差异全是假的（曾经因此把 5 条真实存在的规则误报成丢失）。

**必须比对「整条规则集合」而不是归一化后的单行文本。** 早期版本用正则压平整份 CSS 再 diff，报告被 `@charset` 顺序噪声淹没。按规则集合比对后，同一次搬迁精确显示 0 条丢失、0 条新增。

比对逻辑本身要有自检：构造「同一 selector + declarations，分别放在 `@container` 内 / 外 / `@media` 内」三种情况，确认三者被判为不同。工具本身没验证过就等于没测。

这套比对能发现源码正则测试完全看不到的「规则被搬到组件外导致 scope 不匹配」。行为部分则需要用真实 runtime 挂载断言——`scoped`、`_unref` 这类编译期与运行期行为，源码正则和 transpile-only 构建都抓不到。

**当前测试数是 373**（357 基线 + Phase 4 的 5 条 + Phase 5 的 11 条 override 契约）。基线 357 不是回归：`c63a883`（dev）删除了锁定立绘审美实现细节的源码正则测试，属于有意清理。判断测试是否丢失，要比对**测试清单**而不是总数——本分支相对 `dev` 只多出 seam 断言，没有删除任何 dev 侧测试。

### 搬迁中确认的既有问题（尚未修，不要在 Phase 5 顺手改）

这两条是 Phase 4 做零差异比对时查实的**既有**问题，不是本次引入的。修它们会改变视觉或删代码，超出「只做 ownership extraction」的范围：

1. **台词弹窗的移动端版式在 `force-mobile-layout` 下不生效。** `IllustratedQuoteDialog.vue` 里的移动端规则只是 `@container char-info-viewer (max-width: 900px)` 的直接子规则，**不在** `illustrated-mobile-content` mixin 内——拆分前也是这样。sheet 的其余移动端规则都同时走 `@container` 和 `force-mobile-layout` 两条触发路径，弹窗是唯一的例外。
2. **`illustrated-story-block h3` 没有对应节点。** 该样式在模板里没有标题元素，属于历史残留。

修 1 属于行为变更（会改变 force-mobile 下的弹窗版式），必须单独一个 commit 并单独验收。

**Phase 6 之前不 merge DX 分支。** 这样整个迁移过程零 DX 干扰，回归只可能来自本次改动本身。

本轮同时**不做**：Theme Lab redesign、立绘角色卡新 UI、新 DX feature、新创作者设置、safe-area B、breakpoint B、drag & drop、layout schema、JSON module DSL、dynamic plugin loading、完整 design system。同时改视觉会让回归无法归因。

---

## 10. 维护体验目标

新维护者（或新 LLM）打开项目应该能直接定位：

```text
改 portrait 加载行为          → core/useIllustratedPortrait
改默认 portrait 外观          → default/IllustratedPortraitPane
改默认导航                    → default/IllustratedTabNav
改完整台词弹窗                → default/IllustratedQuoteDialog（状态仍在 core）
改兜底故事块                  → default/IllustratedStoryPanel
改默认布局 / 组合              → default/IllustratedDefaultSheet
让 DX 换掉某一整块             → types.ts 的 IllustratedRendererOverrides
改立绘模块的帧能力 contract     → types.ts 的 IllustratedPortraitModuleHandle
改共享平台类型                → illustrated/types.ts（root，不下沉）
改兼容入口签名                → illustrated/IllustratedCharacterSheet（只转发）
给 DX 一个完全不同的渲染        → Level 3 full renderer，只用 core controller
把成熟 DX 玩具开放给创作者     → 先 reusable module，再接创作者 preset
```

而不是「搜一下 `illustrated-xxx`，看看哪 14 个文件都有这个 class」。

判断任何抽象是否该加，只问一句：

> **它能帮助「持续生产 DX 玩具、并把成熟玩具安全下放给普通创作者」吗？** 不能就删掉。
