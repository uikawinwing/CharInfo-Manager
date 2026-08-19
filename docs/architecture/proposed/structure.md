# CharInfo Manager Architecture — Proposed Target

**Status:** **PROPOSED — not implemented**  
**Snapshot basis:** 2026-08-18 current baseline in `docs/architecture/current/`.

> This document describes a target architecture for future refactoring. Nothing here should be treated as already shipped unless a later implementation explicitly updates the repository and validation records.

## 1. Target principles

**Proposed:** Make trust, presentation, and ownership boundaries explicit without changing user-authored data semantics.

**Intentionally unchanged:**

- exactly three Viewer routes;
- route priority: Trusted DX → Special NPC → Normal Character;
- DX trust comes only from the controlled loader/placeholder path;
- Special NPC comes from a valid named visual profile, never raw body image fields;
- Viewer display remains read-only except explicit import/save operations;
- v2 is authoritative when a same-name v2 key exists;
- legacy read compatibility never becomes field-level merge or automatic Viewer migration;
- native TavernHelper-rendered content remains outside CharInfo ownership except CharInfo hosts;
- Creator explicit save remains the normal migration/write boundary.

**Migration-sensitive:** Any refactor that accidentally infers DX from character data, changes v2/legacy precedence, writes during Viewer reads, or introduces a fourth route is an architecture regression rather than a cleanup.

## 2. Explicit Viewer presentation model

**Proposed:** Replace hidden-symbol presentation state on `CharacterData` with an explicit resolved model.

Conceptually:

```ts
type ViewerRoute = 'trusted_dx' | 'special_npc' | 'normal';

type ViewerPresentationModel = {
  data: CharacterData;
  visual: ResolvedCharacterVisual | null;
  route: ViewerRoute;
  warnings: ViewerWarning[];
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

**Intentionally unchanged:** Raw parsed character data remains the source for character semantics. The presentation model must not rewrite skill, story, inventory, status, race, identity, or other author data merely to make rendering convenient.

**Migration-sensitive:** Loader-trusted DX identity should remain an opaque controlled capability from the DX loader. Do not replace the existing private loader trust with a public `route: 'trusted_dx'` field that arbitrary parsed data can construct before trust resolution.

## 3. Separate parse, trust, visual, and route resolution

**Proposed:** Make Viewer preparation a small pipeline with explicit responsibilities:

1. parse source into domain `CharacterData`;
2. resolve controlled DX trust when source is a DX placeholder;
3. otherwise resolve named visual data through a pure visual resolver;
4. build `ViewerPresentationModel`;
5. build render ViewModel from that model;
6. render one of the existing three routes.

Potential module boundaries:

- `viewerPreparation.ts` — pipeline coordinator;
- `visualResolver.ts` — v2-first/legacy-only named visual lookup and normalization;
- `viewerRoute.ts` — route selection from trusted resolution output;
- `viewerWarnings.ts` — warning construction;
- `characterViewModel.ts` — display projection only.

The exact filenames are suggestions, not implementation requirements.

**Intentionally unchanged:** `yamlParser.ts`, controlled DX loader semantics, gallery-pack format, and current visual schema should remain reusable rather than being redesigned simply because the pipeline is split.

**Migration-sensitive:** Visual resolution must preserve `Object.hasOwn` semantics for same-name v2 keys. “Invalid v2” must not silently become “try legacy”.

## 4. Viewer component responsibility split

**Proposed:** Reduce `src/char_info_viewer/App.vue` to a Viewer composition shell.

It should primarily own:

- input props;
- loading/error state;
- invocation of the preparation pipeline;
- explicit import actions;
- top-level choice among the three presentations;
- lifecycle of effects that truly belong to the Viewer shell.

Move reusable non-UI preparation logic out of the component.

**Intentionally unchanged:** `IllustratedCharacterSheet.vue` may continue serving both Trusted DX and Special NPC variants if that remains the simplest implementation. The target is clearer responsibility boundaries, not a forced component rewrite.

**Migration-sensitive:** Moving code out of `App.vue` must not cause preview mode or read-only mode to execute live-world writes or controlled DX auto-import behavior.

## 5. Runtime split by existing responsibilities

**Proposed:** Keep `runtime.ts` as a thin lifecycle composition root and split its current responsibilities along real boundaries already visible in the code.

Suggested responsibilities:

### Message host lifecycle

Own:

- recent active-floor membership;
- source message projection;
- `nativeMessageMount.ts` integration;
- mounted message/card records;
- remount-loop guard;
- per-message mount/unmount operations.

### Dirty/refresh scheduler

Own:

- dirty message IDs;
- batched flush timing;
- visual-input invalidation;
- selective refresh requests;
- force-refresh fan-out.

### Event subscriptions

Own:

- SillyTavern event binding;
- MVU event binding;
- teardown of subscriptions;
- translation from host events to scheduler/library actions.

### DOM recovery

Own:

- MutationObserver lifecycle;
- detection of externally removed/mutated mount points;
- requesting a per-message recovery render.

This may remain adjacent to message-host lifecycle if splitting it would add needless indirection.

### Current-chat library state

Own:

- MVU snapshot refresh;
- affinity unread detection;
- selected character state;
- current-chat portrait preload hints.

### Settings

Own:

- script-scope settings read/write;
- floating-button position;
- propagation of changed settings to affected runtime services.

### Creator launch lifecycle

Own:

- opening/closing Creator from runtime UI;
- passing worldbook/entry and refresh callbacks;
- no Creator editing semantics.

**Intentionally unchanged:** `RuntimeRoot.vue` remains a UI composition layer and `nativeMessageMount.ts` keeps its current external-DOM ownership contract.

**Migration-sensitive:** Splitting runtime code must not make multiple event subscriptions, duplicate RuntimeRoot instances, or allow stale callbacks from a previous chat/runtime lifecycle to mutate current state.

## 6. Selective Viewer refresh ownership

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

## 7. Creator split around the existing five-step workflow

**Proposed:** Keep the five-step UX, but move data/I/O responsibilities out of the very large `Creator App.vue`.

Suggested domains:

### Editor/profile state

Own editable profile state, metadata, story sections, validation-facing projection, and step-level mutations.

### Target/worldbook I/O

Own worldbook discovery, entry loading, latest-entry reads, and target identity.

### Visual source inspection

Own managed-block inspection and the decision between:

- managed existing profile;
- safely importable legacy profile;
- blocked unsafe legacy;
- new profile.

### Legacy migration adapter

Wrap `char_info_shared/legacyVisualProfile.ts` for Creator use. It must remain a compatibility adapter, not leak legacy syntax throughout editor state.

### Gallery/media state

Own image groups, mirror sources, avatar-from-gallery selection, extension-gallery reference/state, and gallery preview lifecycle.

### Save/serialization service

Own:

- profile normalization;
- v2 managed EJS creation;
- explicit confirmation inputs;
- latest-read-before-write;
- exact legacy-statement replacement when eligible;
- gallery write/rollback;
- worldbook write/readback verification.

### Viewer preview adapter

Own preview-only data/config construction and must remain isolated from live chat writes.

`App.vue` should become the workflow/layout shell composing these domains rather than a generic form engine.

**Intentionally unchanged:** The editor remains five steps and continues using explicit save. There is no need for a generic schema-driven form framework.

**Migration-sensitive:** Importing old syntax must never modify the worldbook on open. Only explicit save may convert recognized legacy data.

## 8. Shared format layer

**Proposed:** Keep `src/char_info_shared/` as the canonical format/compatibility boundary and make consumers depend on it more deliberately.

Expected ownership:

- managed visual schema + validation;
- managed block parse/build;
- gallery-pack contract;
- metadata normalization;
- worldbook entry classification/fallback metadata helpers;
- quarantined legacy parser/migrator.

**Intentionally unchanged:** `schema_version: 2` remains the current managed output format unless a separate data-format change is explicitly designed. This architecture refactor does not require a schema v3.

**Migration-sensitive:** Architecture cleanup must not be disguised as data migration. User-authored worldbook data should stay byte-for-byte untouched outside the explicitly managed block/recognized legacy statement targeted by a user save.

## 9. Metadata resolver consolidation

**Proposed:** Preserve the already-working metadata-first behavior while centralizing fallback rules so worldbook cards, filters, sorting, and future surfaces do not independently reimplement them.

A shared library projection could expose resolved fields such as:

- `displayName`;
- `race`;
- `author`;
- `version`;
- `description`.

It should keep source provenance internally or in debug output when useful.

**Intentionally unchanged:** Managed metadata remains preferred; entry-title/body parsing stays fallback behavior.

**Migration-sensitive:** Consolidation must not write inferred fallback values into managed metadata automatically.

## 10. Legacy compatibility quarantine and retirement

**Proposed:** Make the temporary compatibility lifecycle explicit.

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

After a deliberately chosen release/migration threshold:

- remove legacy named-root runtime resolution;
- remove legacy deprecation UI after an appropriate transition;
- retain migration tooling only as long as it is still useful for explicit imports/upgrades;
- eventually remove obsolete dead migration code such as unused Viewer-side migration helpers once release safety permits.

**Intentionally unchanged:** Retirement is not part of this architecture-doc change and must not happen opportunistically during unrelated refactors.

**Migration-sensitive:** Do not interpret legacy retirement as permission to delete old user-authored worldbook statements automatically.

## 11. Creator lazy loading / code splitting

**Proposed only if deployment proves safe:** Replace the runtime's static Creator-controller import with dynamic loading so ordinary Viewer use does not pay the Creator bundle cost.

Before implementation, verify in real TavernHelper/SillyTavern deployment that:

- the installed runtime can resolve emitted chunk URLs;
- chunk files are actually deployed alongside the main script;
- reload/update behavior does not orphan chunk hashes;
- CSP/module loading permits the generated chunks;
- failure has a graceful UI path.

If any of those are unreliable, keep the static import.

**Intentionally unchanged:** Creator UI should still mount only after the explicit edit action regardless of whether its code is statically or dynamically included.

**Migration-sensitive:** Deployment reliability outranks bundle-size purity.

## 12. Things intentionally outside this refactor

**Proposed:** Keep unrelated product work separate from architecture cleanup unless it directly benefits from the new boundaries.

Examples:

- automatic thumbnail generation/fetching for future imgbed integration;
- broader media-host integrations;
- new Viewer route types;
- automatic conversion of user worldbooks;
- redesign of character semantic data;
- exposure of LLM-context summary internals to creators.

These may have their own future plans, but should not be smuggled into the architecture refactor.

## 13. Suggested implementation order

**Proposed:** Prefer low-risk boundary extraction before behavior changes.

1. Introduce explicit Viewer presentation model while keeping output behavior identical.
2. Move visual/route/warning resolution behind that model and remove hidden-symbol dependence once parity tests pass.
3. Extract runtime scheduler/message-host responsibilities without changing refresh breadth yet.
4. Add selective refresh on top of the extracted scheduler with conservative invalidation.
5. Extract Creator services/state around the existing five steps.
6. Consolidate metadata fallback resolver.
7. Consider Creator dynamic import only after deployment validation.
8. Retire legacy runtime compatibility only through a separately approved release plan.

**Intentionally unchanged:** Each step should remain independently testable and releasable; no “big bang” rewrite is required.

**Migration-sensitive:** At each step, compare behavior against `docs/architecture/current/` so refactoring does not quietly change trust or persistence semantics.
