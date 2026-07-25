# Ailisi Layout Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone responsive preview for 艾璃丝·赛瑞利亚 that communicates jellyfish, dream, and childlike toy themes without inheriting SillyTavern colors or repeating prior SVG and layout bugs.

**Architecture:** Add one self-contained HTML preview under the existing preview directory. Scope all CSS under a single root, use the local portrait asset, create decoration with HTML/CSS, and use class-based desktop/mobile and tab switching without changing the outer geometry.

**Tech Stack:** Semantic HTML, scoped CSS, vanilla browser JavaScript.

## Global Constraints

- Do not modify the production character viewer.
- Use `assets/char_info_viewer/portraits/alice.png` as the only image dependency.
- Do not use external SVG decoration or remote resources.
- Do not use `vh` for iframe or panel sizing.
- Verify desktop and 412px mobile layouts.

---

### Task 1: Standalone preview structure and visual system

**Files:**
- Create: `docs/previews/char_info_viewer/ailisi-layout-preview.html`

**Interfaces:**
- Consumes: `assets/char_info_viewer/portraits/alice.png`
- Produces: A directly openable preview page with desktop/mobile controls and tab buttons.

- [x] **Step 1: Add the semantic two-pane shell and local portrait**

Create one `.ailisi-preview` root containing the preview toolbar, portrait pane, data pane, overview content, detail content, and tab navigation.

- [x] **Step 2: Add the isolated palette and responsive geometry**

Define local custom properties on `.ailisi-preview`, explicitly color all content surfaces, and use grid/flex plus `aspect-ratio` and bounded widths instead of `vh`.

- [x] **Step 3: Add stable CSS jellyfish, bubble, and dream decorations**

Build decorations from pseudo-elements and fixed wrapper boxes so no external SVG or intrinsic SVG viewBox can shift alignment.

- [x] **Step 4: Add desktop/mobile and tab interactions**

Toggle only root state classes and `aria-pressed`/`aria-selected`; preserve the shell width and keep every tab inside the scrollable navigation flow.

- [x] **Step 5: Validate HTML structure**

Run:

```powershell
rg -n "ailisi-preview|color-scheme|isolation|data-layout|data-tab|alice.png" docs/previews/char_info_viewer/ailisi-layout-preview.html
```

Expected: The root isolation rules, local portrait, layout controls, and tab controls are present.

### Task 2: Visual QA and correction

**Files:**
- Modify: `docs/previews/char_info_viewer/ailisi-layout-preview.html`

**Interfaces:**
- Consumes: The Task 1 preview.
- Produces: Desktop and mobile layouts without clipping, theme leakage, overlap, or layout jumps.

- [x] **Step 1: Capture desktop and 412px mobile screenshots**

Open the standalone preview through a local HTTP server and capture both modes.

- [x] **Step 2: Inspect contrast and geometry**

Confirm that the portrait head is unobstructed, text remains navy on light surfaces, attributes use a three-over-two layout, decorations stay behind content, and mobile navigation remains reachable.

- [x] **Step 3: Correct only observed defects**

Adjust scoped CSS values without modifying production components or unrelated previews.

- [x] **Step 4: Run final repository inspection**

Run:

```powershell
git diff --check -- docs/previews/char_info_viewer/ailisi-layout-preview.html docs/superpowers/specs/2026-07-16-ailisi-layout-preview-design.md docs/superpowers/plans/2026-07-16-ailisi-layout-preview.md
```

Expected: No whitespace errors.
