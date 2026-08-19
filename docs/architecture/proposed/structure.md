# CharInfo Manager Architecture — Proposed Target

**Status:** **PROPOSED — not implemented**  
**Snapshot basis:** 2026-08-18 current baseline in `docs/architecture/current/`, plus the 2026-08-19 presentation/backbone review.

> This document describes a target architecture for future refactoring. Nothing here should be treated as already shipped unless a later implementation explicitly updates the repository and validation records.

## 1. Target principles

**Proposed:** Make trust, presentation, rendering, and ownership boundaries explicit without changing user-authored data semantics.

The most important distinction in the target architecture is:

> **Viewer route is a trust/data-provenance decision. Renderer/backbone is a presentation implementation decision.**

Trusted DX and Special NPC remain different routes because they have different trust sources, but they do **not** need separate rendering engines.

**Intentionally unchanged:**

- exactly three Viewer trust routes;
- route priority: Trusted DX → Special NPC → Normal Character;
- DX trust comes only from the controlled loader/placeholder path;
- Special NPC comes from a valid named visual profile, never raw body image fields;
- Viewer display remains read-only except explicit import/save operations;
- v2 is authoritative when a same-name v2 key exists;
- legacy read compatibility never becomes field-level merge or automatic Viewer migration;
- native TavernHelper-rendered content remains outside CharInfo ownership except CharInfo hosts;
- Creator explicit save remains the normal migration/write boundary;
- the normal installed product remains one CharInfo runtime project rather than one independently managed script per DX character.

**Migration-sensitive:** Any refactor that accidentally infers DX from character data, changes v2/legacy precedence, writes during Viewer reads, or introduces a fourth trust route is an architecture regression rather than a cleanup.

## 2. Separate trust route from render surface

**Proposed:** Keep the existing three route identities, but stop treating them as three unrelated UI implementations.

Conceptually:

```ts
type ViewerRoute = 'trusted_dx' | 'special_npc' | 'normal';

type ViewerSurface = 'illustrated_v2' | 'normal';

function resolveViewerSurface(route: ViewerRoute): ViewerSurface {
  return route === 'normal' ? 'normal' : 'illustrated_v2';
}
```

The route answers **why this character is allowed to use a presentation path**. The surface answers **which UI backbone renders it**.

Target relationship:

```text
Trusted DX ─────┐
                ├─> Illustrated V2 backbone
Special NPC ────┘

Normal Character ─> Normal Viewer
```

This avoids keeping an old DX UI alive merely because DX has a different trust model.

**Intentionally unchanged:** Trusted DX and Special NPC must remain distinguishable in preparation output, warnings, controlled features, imports, and tests even when they share the same Vue/CSS backbone.

**Migration-sensitive:** Do not collapse `trusted_dx` and `special_npc` into one trust route simply because they share a renderer.

## 3. Explicit Viewer presentation model

**Proposed:** Replace hidden-symbol presentation state on `CharacterData` with an explicit resolved model.

Conceptually:

```ts
type ViewerPresentationModel = {
  data: CharacterData;
  visual: ResolvedCharacterVisual | null;
  route: ViewerRoute;
  surface: ViewerSurface;
  warnings: ViewerWarning[];
  illustrated?: IllustratedPresentation;
};

type IllustratedPresentation = {
  variant: 'trusted_dx' | 'special_npc';
  themeId: string;
  controlledDxExtensionId?: string;
};
```

`ResolvedCharacterVisual` should explicitly carry presentation-only information now spread across hidden symbols and copied fields, for example:

- source kind: managed v2 / legacy compatibility / controlled DX;
- normalized image source groups;
- optional custom theme colors;
- entrance quote override from the visual profile;
- normalized visual metadata;
- legacy source identity when applicable;
- gallery-extension resolution result;
- image-source randomization flag where still required.

`ViewerWarning` should represent compatibility/deprecation information without branding the character data object.

For Trusted DX, the presentation model may additionally resolve controlled theme/extension information from the trusted roster after loader trust is proven.

**Intentionally unchanged:** Raw parsed character data remains the source for character semantics. The presentation model must not rewrite skill, story, inventory, status, race, identity, or other author data merely to make rendering convenient.

**Migration-sensitive:** Loader-trusted DX identity should remain an opaque controlled capability from the DX loader. Do not replace the existing private loader trust with a public `route: 'trusted_dx'`, `themeId`, or extension field that arbitrary parsed YAML can construct before trust resolution.

## 4. Separate parse, trust, visual, route, and surface resolution

**Proposed:** Make Viewer preparation a small pipeline with explicit responsibilities:

1. parse source into domain `CharacterData`;
2. resolve controlled DX trust when source is a DX placeholder;
3. otherwise resolve named visual data through a pure visual resolver;
4. select one of the existing three trust routes;
5. resolve the render surface from the trusted route;
6. resolve safe presentation theme/extension data;
7. build `ViewerPresentationModel`;
8. build render ViewModel from that model;
9. render Normal Viewer or Illustrated V2.

Potential module boundaries:

- `viewerPreparation.ts` — pipeline coordinator;
- `visualResolver.ts` — v2-first/legacy-only named visual lookup and normalization;
- `viewerRoute.ts` — trust-route selection from trusted resolution output;
- `viewerSurface.ts` — route → renderer/backbone selection;
- `viewerWarnings.ts` — warning construction;
- `characterViewModel.ts` — display projection only.

The exact filenames are suggestions, not implementation requirements.

**Intentionally unchanged:** `yamlParser.ts`, controlled DX loader semantics, gallery-pack format, and current visual schema should remain reusable rather than being redesigned simply because the pipeline is split.

**Migration-sensitive:** Visual resolution must preserve `Object.hasOwn` semantics for same-name v2 keys. “Invalid v2” must not silently become “try legacy”.

## 5. Illustrated V2 as the shared backbone

**Proposed:** Promote the current Special-NPC v2 presentation behavior into a neutral **Illustrated V2 backbone** used by both Special NPC and Trusted DX.

The target is not to make DX characters visually identical to Special NPCs. The target is to make layout/infrastructure shared while keeping character-specific design as skin/extensions.

Conceptually:

```text
Illustrated V2 backbone
├─ shell/layout
├─ portrait/media loading + fallback
├─ overview/profile/story flows
├─ skills/equipment/inventory/status rendering
├─ shared cards/header/tabs
├─ desktop/mobile layout mechanics
├─ scrolling/responsive behavior
└─ import/read-only plumbing

Presentation layers
├─ standard Special NPC
├─ Iris DX theme
├─ Anastasia DX theme
├─ Venus DX theme
│  └─ Venus-only animation/widget extensions
└─ future DX themes/extensions
```

The current `IllustratedCharacterSheet.vue` already demonstrates the correct direction by sharing the same component tree between Trusted DX and Special NPC. The target should make this sharing deliberate rather than treating it as an optional implementation convenience.

### Naming

The implementation may originate from “Special NPC v2”, but the shared base should use a neutral name such as `IllustratedV2`, `IllustratedBackbone`, or equivalent.

Avoid a long-term architecture where Trusted DX is described as “using SpecialNpcV2” because that confuses trust taxonomy with renderer history.

### What belongs in the backbone

Shared behavior should include anything that is not meaningfully character-specific, for example:

- mobile/desktop layout mechanics;
- portrait/video loading and source fallback;
- overview/detail transitions;
- tab mechanics;
- cards and list structure;
- story/profile layout primitives;
- responsive scrolling;
- common accessibility behavior;
- common import/read-only actions;
- generic image/gallery behavior.

### What does not belong in the backbone

Do not force genuinely character-specific design into generic configuration merely to reduce file count.

Examples that should remain character/theme-specific when they are real design choices:

- Venus-specific CSS animation;
- unique portrait decorations;
- unique decorative widgets;
- character-exclusive divinity presentation;
- genuinely different special panels;
- theme-specific background art;
- intentional structural differences that cannot be expressed cleanly as tokens.

**Migration-sensitive:** “Shared backbone” must not become a giant universal component full of `if venus`, `if iris`, `if anastasia`, and future-character branches. Character-specific additions should live behind theme/extension boundaries.

## 6. DX theme and extension contract

**Proposed:** Future DX characters should normally be built as:

```text
Illustrated V2 core
+ DX theme/skin
+ optional controlled DX extensions
```

Use the smallest appropriate mechanism:

1. **Theme tokens** for color, border, background, typography, shadows, spacing values, and similar skin differences.
2. **Theme CSS** for real visual differences that cannot reasonably be reduced to variables.
3. **Small decorative components** for character-specific ornaments/widgets.
4. **Controlled extension components/behavior** for genuinely unique DX functionality.

A future DX should not begin by copying the whole Character Sheet or mobile stylesheet.

### Controlled DX extensions remain trusted

DX-only extension identity must be resolved from the already trusted DX roster/presentation profile, not from arbitrary `<char_info>` YAML or an ordinary Special NPC visual profile.

For example, a normal managed profile must not be able to set a field such as `extension: venus` and thereby acquire controlled Venus-only behavior if that behavior assumes Trusted DX state.

Purely cosmetic generic theme options may remain author-controlled where safe; controlled DX functionality remains roster-controlled.

### Do not over-generalize

The target is not a “universal theme schema” that can represent every possible future visual idea. If a beloved DX character needs one bespoke component or animation, keep it bespoke.

The reuse boundary is infrastructure and repeated structure, not artistic uniqueness.

## 7. One Mobile V2 core for DX and Special NPC

**Proposed:** The current Special-NPC v2 mobile behavior should become the default Illustrated V2 mobile backbone, and existing DX mobile v1 behavior should be migrated onto it.

The target relationship is:

```text
Illustrated V2 Mobile Core
├─ Standard Special NPC mobile skin
├─ Iris DX mobile skin
├─ Anastasia DX mobile skin
└─ Venus DX mobile skin + exclusive effects
```

Do not permanently maintain separate “DX mobile v1” and “Special NPC mobile v2” layout systems when their overall layout is now effectively the same.

### Responsive mobile and forced-mobile must use the same rules

`forceMobileLayout` should select the same mobile presentation mode used by a real mobile viewport. It should not require a second copy of the mobile stylesheet.

Conceptually:

```text
viewport <= mobile breakpoint ─┐
                              ├─> Illustrated mobile mode
forceMobileLayout = true ─────┘
```

Implementation may use a shared state class/data attribute, grouped selectors, container-query strategy, or another maintainable mechanism. The important rule is that there is one canonical mobile layout definition.

### Migration rule

Do not delete old DX mobile rules first.

For each existing DX:

1. render current DX v1 mobile as reference;
2. render the same character on Mobile V2 core;
3. preserve intentional theme/character differences;
4. move reusable v2 mechanics into the backbone;
5. keep only genuine DX-specific overrides;
6. remove old v1/duplicate rules only after parity is accepted.

**Migration-sensitive:** Mobile consolidation is a visual migration, not permission to change DX trust, data, or save behavior.

## 8. CSS/style ownership and bundle growth

**Proposed:** Treat style duplication as an architecture concern because Vue component CSS is shipped inside the runtime JavaScript bundle in the current build.

The target style hierarchy is:

```text
Illustrated V2 structural CSS
↓
Illustrated theme tokens
↓
Theme-specific CSS deltas
↓
Character-specific extensions/animations
```

Prefer shared structural rules with CSS custom properties when multiple themes repeat the same selector structure with different values.

Example concept:

```css
.illustrated-card {
  background: var(--illustrated-card-bg);
  border: var(--illustrated-card-border);
  box-shadow: var(--illustrated-card-shadow);
}

.illustrated-theme-venus {
  --illustrated-card-bg: ...;
  --illustrated-card-border: ...;
}
```

Do not convert every unique design into variables. Tokens are appropriate for repeated structure; unique animation/decorative CSS remains unique.

Bundle optimization should first remove duplicated style/layout logic before introducing deployment-sensitive runtime chunking.

## 9. Viewer component responsibility split

**Proposed:** Reduce `src/char_info_viewer/App.vue` to a Viewer composition shell.

It should primarily own:

- input props;
- loading/error state;
- invocation of the preparation pipeline;
- explicit import actions;
- top-level choice between Normal and Illustrated V2 surfaces;
- lifecycle of effects that truly belong to the Viewer shell.

Move reusable non-UI preparation logic out of the component.

`IllustratedCharacterSheet.vue` should evolve toward an Illustrated V2 composition shell. Shared panels/components may remain as they are. Theme- or character-specific additions should be isolated behind explicit presentation hooks rather than accumulating arbitrary branches in the sheet.

**Intentionally unchanged:** Preview mode and read-only mode must remain safe, and the refactor does not require a large component rewrite in one release.

**Migration-sensitive:** Moving code out of `App.vue` must not cause preview mode or read-only mode to execute live-world writes or controlled DX auto-import behavior.

## 10. Runtime split by existing responsibilities

**Proposed:** Keep `runtime.ts` as a thin lifecycle composition root and split its current responsibilities along real boundaries already visible in the code.

Suggested responsibilities:

### Message host lifecycle

Own recent active-floor membership, source message projection, `nativeMessageMount.ts` integration, mounted message/card records, remount-loop guard, and per-message mount/unmount operations.

### Dirty/refresh scheduler

Own dirty message IDs, batched flush timing, visual-input invalidation, selective refresh requests, and force-refresh fan-out.

### Event subscriptions

Own SillyTavern event binding, MVU event binding, teardown of subscriptions, and translation from host events to scheduler/library actions.

### DOM recovery

Own MutationObserver lifecycle, detection of externally removed/mutated mount points, and requesting per-message recovery render. This may remain adjacent to message-host lifecycle if splitting it would add needless indirection.

### Current-chat library state

Own MVU snapshot refresh, affinity unread detection, selected character state, and current-chat portrait preload hints.

### Settings

Own script-scope settings read/write, floating-button position, and propagation of changed settings to affected runtime services.

### Creator launch lifecycle

Own opening/closing Creator from runtime UI, passing worldbook/entry and refresh callbacks, and no Creator editing semantics.

**Intentionally unchanged:** `RuntimeRoot.vue` remains a UI composition layer and `nativeMessageMount.ts` keeps its current external-DOM ownership contract.

**Migration-sensitive:** Splitting runtime code must not make multiple event subscriptions, duplicate RuntimeRoot instances, or allow stale callbacks from a previous chat/runtime lifecycle to mutate current state.

## 11. Selective Viewer refresh ownership

**Proposed:** Replace broad “remove/remount all active cards” visual refresh with an invalidation model that can identify affected cards/messages.

Each mounted card should expose a small refresh signature/index derived from inputs that matter to rendering, such as:

- message/swipe/card source identity;
- resolved character name;
- relevant visual-profile version/signature;
- relevant avatar/profile/galleries where required;
- route/trust result;
- settings that affect presentation.

The runtime scheduler can then invalidate only cards whose inputs changed.

A practical first implementation can be deliberately conservative: refresh a whole message floor when one of its cards is affected. It does not need fine-grained Vue state patching on day one.

**Intentionally unchanged:** Text edits/swipes/message lifecycle events can continue to enqueue the affected message directly. Force refresh must remain available as a correctness fallback.

**Migration-sensitive:** Selective refresh must prefer false positives over false negatives until well tested. Missing a required refresh is worse than occasionally remounting an extra card.

## 12. Creator split around the existing five-step workflow

**Proposed:** Keep the five-step UX, but move data/I/O responsibilities out of the very large Creator `App.vue`.

Suggested domains:

### Editor/profile state

Own editable profile state, metadata, story sections, validation-facing projection, and step-level mutations.

### Target/worldbook I/O

Own worldbook discovery, entry loading, latest-entry reads, and target identity.

### Visual source inspection

Own managed-block inspection and the decision between managed existing profile, safely importable legacy profile, blocked unsafe legacy, and new profile.

### Legacy migration adapter

Wrap `char_info_shared/legacyVisualProfile.ts` for Creator use. It must remain a compatibility adapter, not leak legacy syntax throughout editor state.

### Gallery/media state

Own image groups, mirror sources, avatar-from-gallery selection, extension-gallery reference/state, and gallery preview lifecycle.

### Save/serialization service

Own profile normalization, v2 managed EJS creation, explicit confirmation inputs, latest-read-before-write, exact legacy-statement replacement when eligible, gallery write/rollback, and worldbook write/readback verification.

### Viewer preview adapter

Own preview-only data/config construction and remain isolated from live chat writes.

`App.vue` should become the workflow/layout shell composing these domains rather than a generic form engine.

**Intentionally unchanged:** The editor remains five steps and continues using explicit save. There is no need for a generic schema-driven form framework.

**Migration-sensitive:** Importing old syntax must never modify the worldbook on open. Only explicit save may convert recognized legacy data.

## 13. Shared format layer

**Proposed:** Keep `src/char_info_shared/` as the canonical format/compatibility boundary and make consumers depend on it more deliberately.

Expected ownership:

- managed visual schema + validation;
- managed block parse/build;
- gallery-pack contract;
- metadata normalization;
- worldbook entry classification/fallback metadata helpers;
- quarantined legacy parser/migrator.

**Intentionally unchanged:** `schema_version: 2` remains the current managed output format unless a separate data-format change is explicitly designed. The UI/backbone refactor does not require a schema v3.

**Migration-sensitive:** Architecture cleanup must not be disguised as data migration. User-authored worldbook data should stay untouched outside the explicitly managed block/recognized legacy statement targeted by a user save.

## 14. Metadata resolver consolidation

**Proposed:** Preserve the already-working metadata-first behavior while centralizing fallback rules so worldbook cards, filters, sorting, and future surfaces do not independently reimplement them.

A shared library projection could expose resolved fields such as `displayName`, `race`, `author`, `version`, and `description`, while keeping source provenance internally or in debug output when useful.

**Intentionally unchanged:** Managed metadata remains preferred; entry-title/body parsing stays fallback behavior.

**Migration-sensitive:** Consolidation must not write inferred fallback values into managed metadata automatically.

## 15. Legacy compatibility quarantine and retirement

**Proposed:** Keep the temporary compatibility lifecycle explicit.

### Runtime compatibility phase

- Viewer may read legacy-only named visual roots.
- It warns that the path is deprecated.
- It never merges same-name legacy fields into an existing v2 key.
- It never writes a migrated profile.

### Creator migration phase

- Creator recognizes only the safely parseable static subset.
- Opening prefills only.
- Explicit save writes v2 and removes exactly the recognized legacy statement.
- Unsafe/dynamic syntax remains user-managed/manual.

### Retirement phase

After a deliberately chosen release/migration threshold, remove legacy named-root runtime resolution and later obsolete compatibility UI/helpers through a separately approved release plan.

**Intentionally unchanged:** Retirement is not part of this architecture-doc change and must not happen opportunistically during unrelated refactors.

**Migration-sensitive:** Do not interpret legacy retirement as permission to delete old user-authored worldbook statements automatically.

## 16. Bundle/deployment policy

**Proposed:** Optimize the existing one-project runtime before depending on runtime chunks.

Priority:

1. remove duplicated DX-v1/Special-NPC-v2 layout rules;
2. remove duplicate responsive/forced-mobile rules;
3. consolidate repeated theme structure into base rules/tokens;
4. keep character-specific design that is genuinely unique;
5. measure production bundle before/after each migration;
6. only then consider dynamic loading where deployment has been proven reliable.

### Creator lazy loading / code splitting

Dynamic Creator loading remains optional and deployment-sensitive.

Before implementation, verify in real TavernHelper/SillyTavern deployment that emitted chunk URLs, deployment, reload/update behavior, CSP/module loading, and failure UI are reliable.

If any are unreliable, keep static imports.

### DX code splitting

Do not create one independently installed/managed script per DX character merely to reduce the main file.

Character-specific runtime chunks may be considered only if the deployment contract later proves safe and the measured benefit justifies it. They are not required for the Illustrated V2 backbone architecture.

**Migration-sensitive:** Deployment reliability and maintainability outrank bundle-size purity.

## 17. Things intentionally outside this refactor

Keep unrelated product work separate unless it directly benefits from the new boundaries.

Examples:

- automatic thumbnail generation/fetching for future imgbed integration;
- broader media-host integrations;
- new trust route types;
- automatic conversion of user worldbooks;
- redesign of character semantic data;
- exposure of LLM-context summary internals to creators;
- one separate app/script per DX character;
- forcing every DX character into a generic configuration-only theme system.

## 18. Suggested implementation order

**Proposed:** Prefer visual/backbone consolidation and low-risk boundary extraction before large behavior changes.

### Phase A — freeze references and measure

1. Record production `dist/char_info_viewer_runtime/index.js` size.
2. Create a visual-regression checklist/reference for at least Venus, Iris, Anastasia, and one standard Special NPC across desktop, real mobile, and forced-mobile modes.
3. Pin trust-route, v2/legacy precedence, read-only, and controlled-DX tests before presentation refactoring.

### Phase B — establish Illustrated V2 backbone

4. Treat current Special-NPC v2 layout/mobile behavior as the source for the neutral Illustrated V2 core.
5. Move shared mobile/layout mechanics into that core without changing trust logic.
6. Port existing DX presentations onto the core one character at a time.
7. Preserve only genuine DX theme/animation/widget differences as theme or controlled extensions.
8. Remove old DX-v1 layout/mobile rules only after visual parity for that character is accepted.

### Phase C — remove duplicate style paths

9. Make real responsive mobile and `forceMobileLayout` resolve to one canonical mobile rule set.
10. Consolidate repeated theme structure into base CSS + tokens while preserving unique artistic CSS.
11. Rebuild and record bundle-size change after each meaningful cleanup; do not assume savings without measurement.

### Phase D — explicit preparation boundaries

12. Introduce explicit Viewer presentation model while keeping trust behavior identical.
13. Move visual/route/surface/warning resolution behind that model and remove hidden-symbol dependence once parity tests pass.

### Phase E — runtime/Creator boundaries

14. Extract runtime scheduler/message-host responsibilities without changing refresh breadth yet.
15. Add selective refresh with conservative invalidation.
16. Extract Creator services/state around the existing five steps.
17. Consolidate metadata fallback resolver.

### Phase F — optional deployment optimizations and compatibility retirement

18. Consider Creator/dynamic import only after real deployment validation.
19. Retire legacy runtime compatibility only through a separately approved release plan.

**Intentionally unchanged:** Each step should remain independently testable and releasable; no “big bang” rewrite is required.

**Migration-sensitive:** At each step, compare behavior against `docs/architecture/current/`. Presentation cleanup must not quietly alter trust, persistence, or user-authored data semantics.
