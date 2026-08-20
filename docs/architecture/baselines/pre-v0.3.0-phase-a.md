# CharInfo Manager pre-v0.3.0 — Phase A Refactor Baseline

**Status:** FROZEN REFERENCE  
**Branch:** `pre-v0.3.0`  
**Captured:** 2026-08-20 (Asia/Taipei)  
**Target:** `docs/architecture/proposed/structure.md` Phase A

> This file records the verified pre-refactor baseline used for the Illustrated V2 migration. Do not rewrite these values to match later implementation results. Add later measurements separately.

## 1. Production bundle baseline

Command:

`pnpm build`

Verified result:

- production build: PASS
- `dist/char_info_viewer_runtime/index.js`: **1.12 MiB** as reported by webpack
- webpack reported Viewer modules at approximately **520 KiB**
- webpack reported `src/char_info_viewer_runtime/` modules at approximately **1.07 MiB**
- build completed with only webpack asset/entrypoint performance-size warnings
- the production build left no tracked workspace changes

This is the size reference for presentation/layout/style consolidation. Later cleanup steps must record a fresh production build result instead of estimating savings from source-line count.

## 2. Automated behavior baseline

Command:

`pnpm test`

Verified result:

- tests: **316**
- pass: **316**
- fail: **0**
- skipped: **0**
- cancelled: **0**

Node emitted existing `MODULE_TYPELESS_PACKAGE_JSON` performance warnings for several TypeScript modules. They did not fail the suite and are not part of this refactor.

## 3. Trust/data invariants already pinned by tests

The following pre-refactor behavior is already protected and must remain unchanged while presentation code moves:

### Controlled DX cannot be spoofed

Primary references:

- `tests/char_info_viewer/image-layout-routing.test.cjs`
  - normal data with an exact DX roster name does not gain DX presentation
  - a normal full YAML payload containing a matching `__dx_character_ref` still does not become Trusted DX
  - only the controlled loader product is accepted by `App.vue` as Trusted DX
  - loaded DX trust identity does not leak through ordinary object spread

### Special NPC cannot be granted by raw body image fields

Primary reference:

- `tests/char_info_viewer/image-layout-routing.test.cjs`
  - explicit body image fields do not grant the Special NPC layout
  - named visual-profile resolution remains the presentation source

### Same-name v2 remains authoritative over legacy

Primary reference:

- `tests/char_info_viewer/custom-visual-config.test.cjs`
  - existing same-name v2 does not inherit legacy colors or entrance quote
  - an existing but invalid same-name v2 key still blocks legacy fallback

### Viewer/runtime reads remain non-destructive

Primary references:

- `tests/char_info_viewer/message-renderer-compatibility.test.mjs`
  - Viewer message mounting is read-only with respect to stored chat text
- `tests/char_info_viewer_runtime/legacy-gallery-migration.test.cjs`
  - Viewer Runtime does not perform legacy-gallery migration or writeback
- `tests/char_info_viewer_runtime/viewer-host-boundary.test.mjs`
  - runtime ownership stays inside CharInfo hosts and preserves native/frontend DOM boundaries

### Current presentation taxonomy remains three-way

Current implementation projection:

- `default` → Normal Character
- `special_npc` → Special NPC
- `illustrated` → controlled Trusted DX presentation

Primary implementation reference:

- `src/char_info_viewer/services/characterViewModel.ts`
  - `CharacterLayoutKind = 'default' | 'illustrated' | 'special_npc'`

This is a pre-refactor implementation taxonomy, not the proposed final naming. The target architecture may introduce `ViewerRoute` and `ViewerSurface`, but it must preserve exactly three trust routes: Trusted DX, Special NPC, Normal Character.

## 4. Visual-regression reference matrix

The purpose of this matrix is to preserve intentional art direction while shared layout/mobile mechanics move into Illustrated V2. It is not permission to make the DX characters visually identical.

| Reference | Desktop | Real mobile | Forced mobile | Existing repository evidence |
| --- | --- | --- | --- | --- |
| Venus DX | required | required | required | `docs/previews/char_info_viewer/venus-layout-preview.html`, `docs/previews/char_info_viewer/venus-layout-preview-divinity-stage-bg-v8.html`, current illustrated/DX tests |
| Iris DX | required | required | required | `tests/char_info_viewer/iris-theme.test.mjs`, shared illustrated overview/navigation tests |
| Anastasia DX | required | required | required | `docs/previews/char_info_viewer/anastasia-layout-preview.html`, `tests/char_info_viewer/anastasia-item-card-styles.test.mjs` |
| Standard Special NPC | required | required | required | current Special NPC shell/story/routing tests and the production `IllustratedCharacterSheet.vue` Special-NPC path |

### Visual acceptance checklist

For every row above, compare the migrated result against the current reference and confirm:

- portrait/media composition and fallback remain intentional;
- character name/header scale and placement remain intentional;
- overview/profile/story hierarchy remains intact;
- tab/navigation behavior remains usable;
- skills/equipment/inventory/status cards keep their intended density;
- mobile overview/detail scrolling remains usable;
- real mobile and forced-mobile preserve the same intended content hierarchy;
- Venus-only animation/divinity/decorative behavior remains Venus-only;
- Iris theme/flag/background differences remain intact;
- Anastasia theme/item-card differences remain intact;
- Special NPC does not acquire controlled DX-only presentation or behavior.

## 5. Browser evidence status at capture time

The configured SillyTavern target is `http://localhost:8000` / `http://127.0.0.1:8000`.

The browser bridge successfully connected to the user's existing SillyTavern page. The current chat contained a Statusbar demo but no mounted CharInfo character card, so no live Viewer screenshot was claimed as a baseline from that chat. The repository previews and automated UI contracts above are therefore the frozen references available at this capture point.

Do not mutate chat/worldbook data merely to manufacture a screenshot baseline. When a real Viewer fixture or suitable existing chat is available, browser screenshots can be added as supplementary evidence without changing the baseline facts above.

## 6. Phase A gate before presentation refactor

Phase A is considered safe to proceed when all of the following remain true:

- production build passes;
- the recorded pre-refactor bundle reference is 1.12 MiB;
- full test suite is green at 316/316;
- trust/data invariants above are preserved;
- the visual-reference matrix is used during each character migration;
- old DX layout/mobile rules are not removed before the migrated character passes its visual acceptance review.

The next implementation step is Phase B: promote the current Special-NPC v2 layout/mobile mechanics into a neutral Illustrated V2 backbone **without changing trust logic**.
