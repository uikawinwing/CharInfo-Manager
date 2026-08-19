# CharInfo Manager Workflow & Logic — Proposed Target

**Status:** **PROPOSED — not implemented**  
**Baseline:** `docs/architecture/current/workflow_logic.md`  
**Presentation review:** 2026-08-19

> The target is to make the current trust/read/write rules explicit and easier to test while consolidating the evolved Special-NPC v2 presentation into a shared Illustrated V2 backbone. Trust semantics and rendering implementation must remain separate concerns.

## 1. Target Viewer preparation flow

**Proposed:** Replace the current implicit mutation/branding pipeline with an explicit preparation result:

`source` → `domain data` → `trust/visual resolution` → `ViewerPresentationModel` → `ViewModel` → renderer.

Conceptually:

```ts
type ViewerPreparationResult = {
  data: CharacterData;
  visual: ResolvedCharacterVisual | null;
  route: 'trusted_dx' | 'special_npc' | 'normal';
  surface: 'illustrated_v2' | 'normal';
  warnings: ViewerWarning[];
  illustrated?: IllustratedPresentation;
};
```

Route and surface intentionally answer different questions:

- `route` = why this character is trusted/eligible for a presentation path;
- `surface` = which rendering backbone is used.

**Intentionally unchanged:** There are still exactly three trust routes, in priority order Trusted DX → Special NPC → Normal Character.

**Migration-sensitive:** The preparation result is produced by trusted code. It must not accept a route/trust flag from normal parsed YAML.

## 2. Proposed Trusted DX path

**Proposed flow:**

1. Inspect the complete source for the controlled DX placeholder format.
2. If it is not a DX placeholder, do not attempt DX trust inference later from parsed fields.
3. If it is a placeholder, call the existing controlled DX loader.
4. The loader validates roster membership, registry uniqueness, registry identity, appear variable, and character name.
5. Keep the loader's opaque/private trust identity.
6. Build a preparation result with `route = trusted_dx` only after loader trust is established.
7. Resolve controlled DX presentation profile from the trusted roster.
8. Resolve `surface = illustrated_v2`.
9. Resolve the DX theme and any controlled character extension from the trusted presentation identity.
10. Render through the Illustrated V2 backbone.

**Intentionally unchanged:** DX status is never inferred from character name, metadata, `__dx_character_ref` copied into a normal object, or manually built profile fields.

**Migration-sensitive:** Do not simplify this to `if (__dx_character_ref) route = trusted_dx`. The controlled-loader capability is the trust boundary.

A DX-only extension such as a Venus-specific widget/behavior must not become activatable by an ordinary visual profile simply because the UI backbone is shared.

## 3. Proposed non-DX parse flow

**Proposed flow:**

1. Parse normal `<char_info>` YAML into plain `CharacterData`.
2. Remove/reserve fields that normal data is not allowed to use as trust capabilities, including raw DX reference fields.
3. Preserve the remaining character semantic data without presentation mutations.
4. Resolve named visual information separately.
5. Produce warnings separately.
6. Select Special NPC or Normal Character based on the resolved visual result.
7. Resolve renderer surface from that trusted route.

**Intentionally unchanged:** Strict/loose parser behavior can remain as it is unless a separate parser task changes it.

**Migration-sensitive:** Presentation cleanup must not rewrite character semantics or persist cleaned data back to the message/worldbook.

## 4. Proposed v2-first named visual resolution

**Proposed:** Make named visual resolution a pure/read-only function with an explicit result.

For exact `name`:

1. Read `char_info.profiles`.
2. If `Object.hasOwn(profiles, name)` is true:
   - select only that value;
   - mark source as managed-v2/current;
   - never consult same-name legacy roots.
3. Only if the v2 key does not exist, search legacy roots in current compatibility order:
   - `char_info_visuals[name]`
   - `char_info.visual[name]`
   - `char_info.visuals[name]`.
4. Normalize the selected config into `ResolvedCharacterVisual`.
5. Resolve gallery extension in memory if referenced.
6. Return explicit warnings when a legacy source or deprecated body syntax was observed.
7. Never write any migration result.

**Intentionally unchanged:** Existing-v2-but-invalid still does not fall back to legacy. There is no field merge.

**Migration-sensitive:** Tests must pin this precedence before moving resolver code, because a seemingly friendly fallback would recreate two sources of truth.

## 5. Proposed route and surface selection

**Proposed:** Centralize trust-route selection in one auditable function, then select the renderer independently.

Conceptually:

```ts
function resolveRoute(input: TrustedPreparationInput): ViewerRoute {
  if (input.trustedDx) return 'trusted_dx';
  if (input.visual?.hasUsableImage) return 'special_npc';
  return 'normal';
}

function resolveSurface(route: ViewerRoute): ViewerSurface {
  return route === 'normal' ? 'normal' : 'illustrated_v2';
}
```

The actual route function should also validate that Special NPC visual data came from the allowed named-profile resolver, not arbitrary parsed data.

**Intentionally unchanged:** Special NPC requires usable profile-driven image presentation. Normal Character remains the fallback.

**Migration-sensitive:** Do not add an “illustrated normal”, “legacy NPC”, or other fourth trust route to encode compatibility state. Compatibility belongs in warnings/source, while renderer identity belongs in `surface`.

## 6. Proposed presentation/ViewModel flow

**Proposed:** `characterViewModel.ts` should consume the explicit presentation result rather than discover trust state through hidden symbols.

It should receive:

- plain character data;
- resolved visual information;
- final trust route;
- render surface;
- resolved theme/presentation profile;
- image source priority;
- optional display-only overrides such as current-chat inner thought.

It then builds normalized display text, tabs, skills/items/resources, story sections, image groups, and render properties.

**Intentionally unchanged:** Human-authored visual metadata can continue to affect human display without altering the underlying `<char_info>` semantic/context data.

**Migration-sensitive:** Display-only story/metadata must not be written back into the LLM/context-oriented character data merely because Viewer consumes both.

## 7. Proposed Illustrated V2 rendering flow

**Proposed:** Trusted DX and Special NPC both enter one neutral Illustrated V2 composition flow after trust resolution.

```text
trusted_dx ─────┐
                ├─> Illustrated V2 core → theme → optional extension → render
special_npc ────┘
```

### 7.1 Core stage

The Illustrated V2 core owns shared rendering behavior:

1. choose portrait/video source and source fallback;
2. build the shared shell;
3. render common header/overview/profile/story/card/tab primitives;
4. apply desktop/mobile layout mechanics;
5. manage common scrolling and overview/detail behavior;
6. expose controlled extension slots/hooks where needed;
7. keep read-only/import plumbing common.

### 7.2 Standard Special NPC stage

For `route = special_npc`:

1. use the same Illustrated V2 core;
2. apply standard managed-profile colors/images/metadata;
3. apply safe generic theme tokens where supported;
4. do not gain controlled DX-only extensions.

### 7.3 Trusted DX stage

For `route = trusted_dx`:

1. use the same Illustrated V2 core;
2. resolve controlled DX roster presentation;
3. apply character theme/skin;
4. mount optional trusted character extensions;
5. preserve unique animation/widget CSS where the design genuinely requires it.

Examples:

- Iris may be mostly core + theme/flags/background changes;
- Anastasia may be core + its theme deltas;
- Venus may be core + Venus theme + Venus-specific animation/decorative/divinity extensions.

**Migration-sensitive:** Sharing the renderer must not allow ordinary Special NPC data to spoof DX-specific extension identity.

## 8. Proposed Mobile V2 flow

**Proposed:** Make the evolved Special-NPC v2 mobile layout the shared Illustrated V2 mobile backbone and migrate existing DX mobile v1 presentation onto it.

### 8.1 Resolve mobile mode once

Conceptually:

```text
real mobile/breakpoint ──────┐
                             ├─> illustratedMobile = true
forceMobileLayout = true ────┘
```

After that decision, both paths use the same canonical mobile layout rules.

`forceMobileLayout` is a way to **select mobile mode**, not a reason to maintain a second mobile stylesheet.

### 8.2 Apply mobile core before theme deltas

Target order:

1. resolve mobile mode;
2. apply Illustrated V2 mobile shell/layout;
3. apply route-neutral mobile mechanics such as overview/detail behavior, wallpaper handling, scrolling, and tab positioning;
4. apply standard Special NPC or DX theme deltas;
5. apply genuine character-specific mobile exceptions only when needed.

### 8.3 Existing DX migration

For Venus, Iris, and Anastasia:

1. capture/reference current DX mobile appearance before removal;
2. run the character on the V2 mobile backbone;
3. identify which old v1 rules represent intentional character design;
4. convert repeated structural differences into shared V2 rules or theme tokens;
5. retain unique character CSS/animations;
6. delete obsolete v1 rules only after visual acceptance.

### 8.4 Forced-mobile cleanup

The current pattern where real responsive mobile rules are followed by a largely repeated `.force-mobile-layout ...` rule set should be removed through shared mode resolution/grouped ownership.

The exact CSS technique is an implementation detail; the invariant is **one canonical mobile layout definition**.

**Migration-sensitive:** Do not “clean up” by making Venus/Iris/Anastasia visually identical. The migration removes duplicated mechanics, not intentional art direction.

## 9. Proposed DX theme/extension decision flow

When adding a future DX character, choose the smallest mechanism that expresses the real difference:

1. **Only values differ** → add/update theme tokens.
2. **CSS skin/decor differs** → add a scoped theme CSS delta.
3. **Small decorative DOM differs** → add a small theme/decoration component.
4. **Real character-specific behavior/panel/animation differs** → add a controlled DX extension.
5. **Do not** copy the whole Illustrated sheet/mobile stylesheet as the default starting point.

A future character is allowed to be artistically unique. Reuse should target infrastructure and repeated structure.

## 10. Proposed warning flow

**Proposed:** Warnings become structured preparation output rather than hidden brands.

Examples:

- `legacy_visual_profile` with source root;
- `deprecated_inline_image_syntax`;
- gallery-extension unavailable;
- parser recovery warning.

`ViewerApp` decides how to render those warnings.

**Intentionally unchanged:** Legacy-only profiles remain displayable during the compatibility window and receive a deprecation warning.

**Migration-sensitive:** A warning is informational state, not permission to mutate or auto-repair data.

## 11. Proposed runtime message flow

**Proposed:** Keep the existing external-message ownership model while routing work through smaller runtime services.

`host events` → `message scheduler` → `message host lifecycle` → `projectCharInfoMessage()` → `nativeMessageMount()` → `RuntimeRoot/Viewer`.

Message host lifecycle should own mounted records and source/render signatures. The scheduler should only request actions such as:

- `invalidateMessage(messageId)`;
- `invalidateVisuals(characterNames?)`;
- `scanRecentFloors()`;
- `forceRefresh()`.

**Intentionally unchanged:** More than four `<char_info>` blocks still falls back to the original/native message unless a separate product decision changes that limit.

**Migration-sensitive:** `nativeMessageMount.ts` must continue preserving TavernHelper frontend render nodes and must not become snapshot-based whole-message ownership.

## 12. Proposed selective refresh flow

**Proposed:** Separate three kinds of invalidation.

### Message-content invalidation

Triggered by message received/rendered/edited/updated/swiped or host DOM mount loss for that floor.

Action: re-project/re-render that message floor.

### Visual/profile invalidation

Triggered by relevant chat-variable/profile/avatar/gallery changes.

Action:

1. identify affected character names when possible;
2. find mounted cards whose preparation index references those characters;
3. enqueue only those message floors/cards;
4. if change provenance cannot be safely determined, use a conservative broader refresh.

### Global presentation invalidation

Triggered by settings such as forced mobile layout, effects policy, or image source priority.

Action: invalidate all affected active Viewers because the setting genuinely applies globally.

**Intentionally unchanged:** `forceRefresh()` remains a correctness escape hatch.

**Migration-sensitive:** Initial selective-refresh implementation should be conservative. Never skip a refresh merely to optimize remount count.

## 13. Proposed current-chat library flow

**Proposed:** Give current-chat library state its own service/store-like owner, independent from message host mounting.

Flow:

1. MVU event notifies library service.
2. Library service reads latest relationship snapshot.
3. It projects current characters and compares affinity/presence state.
4. It updates unread markers and selected-character snapshot.
5. Preload service receives likely image candidates.
6. `RuntimeRoot` consumes the library state.
7. Selected character opens Viewer in read-only mode with display-only inner-thought override.

**Intentionally unchanged:** No second persistent character database is created. The library is a projection of current MVU/chat state.

**Migration-sensitive:** Library refresh and message visual refresh may share event inputs, but they should not become one mutable data store that writes derived fields back into MVU/chat variables.

## 14. Proposed worldbook library flow

**Proposed:** Preserve current user behavior while moving metadata/fallback projection to a shared resolver.

Flow:

1. Read selected worldbook.
2. Classify candidate character entries.
3. Inspect managed visual profile if present.
4. Resolve display metadata with canonical fallback rules.
5. Filter/sort/display.
6. Open detail as read-only body + visual metadata/gallery.
7. Explicit enabled toggle may write only the requested `enabled` state.
8. Explicit edit launches Creator with worldbook + entry UID.

**Intentionally unchanged:** Managed metadata remains first-class and entry-name/body parsing remains fallback.

**Migration-sensitive:** Fallback-derived race/author/etc. must not be auto-saved as metadata.

## 15. Proposed Creator open/load flow

**Proposed:** Keep the existing explicit edit action and five-step UX while decomposing internals.

Flow:

1. Runtime Creator launcher receives optional worldbook/UID.
2. Creator overlay mounts isolated UI.
3. Target service reads worldbooks/entries.
4. Source-inspection service classifies selected entry:
   - valid managed block;
   - safely importable legacy statement;
   - unsupported/unsafe legacy or malformed managed data;
   - new profile.
5. Editor-state service receives a normalized editable profile.
6. Gallery service loads optional extension gallery.
7. UI presents the same five-step editing flow.

**Intentionally unchanged:** Opening/importing recognized legacy data is non-destructive and does not write the worldbook.

**Migration-sensitive:** Source classification must happen against the selected/latest target identity; changing entry selection during async loads must not apply stale results.

## 16. Proposed Creator save flow

**Proposed:** Put write semantics behind a dedicated save service with explicit inputs and verification.

Flow:

1. User triggers save.
2. Validate editor state and extension-gallery references.
3. Show explicit target/migration confirmation.
4. Re-read the latest target entry.
5. Re-inspect it before modification to protect against stale editor assumptions.
6. Normalize current profile to managed v2.
7. If a recognized legacy statement is the migration source, remove exactly that statement.
8. Upsert only the managed block.
9. Preserve all unrelated entry content.
10. If extension gallery is enabled:
    - capture previous gallery state;
    - write new gallery state;
    - write character entry;
    - roll gallery back if character write fails.
11. Read resulting entry back and verify a valid managed v2 block/profile.
12. Update UI state from the verified saved result.

**Intentionally unchanged:** Creator writes new visual output only as v2 and keeps avatar data in its separate existing scope.

**Migration-sensitive:** Do not expand “recognized legacy statement” deletion into substring cleanup, whole-entry replacement, or automatic cleanup of dynamic legacy code.

## 17. Proposed explicit apply-to-current-chat flow

**Proposed:** Retain this as a separate command from save.

1. User requests apply.
2. Re-read saved entry.
3. Extract only valid managed EJS.
4. Execute it against current chat.
5. Verify expected `char_info.profiles[name]` readback.
6. Ask runtime scheduler to invalidate affected character Viewer(s), falling back to force refresh if needed.

**Intentionally unchanged:** Saving a worldbook and applying it to current chat remain conceptually separate operations.

**Migration-sensitive:** Do not execute arbitrary unmanaged entry EJS as part of this convenience path.

## 18. Proposed legacy retirement flow

**Proposed:** Treat retirement as a staged product/release decision, not an internal refactor side effect.

### Stage A — current compatibility

- Viewer reads legacy-only roots and warns.
- Creator can import safe static legacy and save v2.

### Stage B — migration push

- warning copy becomes more explicit if desired;
- documentation tells authors to open/save recognized profiles;
- telemetry/manual adoption checks, if available and privacy-appropriate, inform readiness.

### Stage C — runtime legacy removal

- remove legacy named-root fallback from Viewer resolver;
- v2 remains sole runtime visual source;
- old worldbooks are not modified automatically.

### Stage D — tooling cleanup

- keep or remove explicit legacy import tooling based on remaining migration need;
- remove truly dead compatibility helpers only after the release window is complete.

**Intentionally unchanged:** Same-name v2 authority is preserved throughout every stage.

**Migration-sensitive:** Retirement must never rewrite historical/current user content merely to make the codebase cleaner.

## 19. Proposed preload flow

**Proposed:** Move preload triggering behind a small preload service that accepts resolved candidates rather than duplicating visual lookup logic.

- current-chat library provides likely character names/avatars;
- Viewer preparation/visual resolver provides normalized visual source groups;
- image-source priority is applied at read/display time;
- preload service deduplicates and starts bounded preloads.

**Intentionally unchanged:** Creators still provide one logical gallery entry with mirror sources; user-facing workflows should not require separate technical “thumbnail vs original” management as part of this refactor.

**Migration-sensitive:** Preload optimizations must not reorder or rewrite stored image source arrays.

## 20. Bundle and deployment decision flow

**Proposed:** Reduce duplicated code/style inside the existing single runtime before relying on runtime chunks.

### 20.1 Illustrated cleanup measurement loop

For each presentation cleanup step:

1. record current production `dist/char_info_viewer_runtime/index.js` size;
2. change one bounded area, such as mobile-core duplication or theme-structure duplication;
3. run tests/lint/build;
4. inspect Venus/Iris/Anastasia/Special-NPC visual parity where relevant;
5. record new production bundle size;
6. keep the change only if behavior is correct; bundle savings are a benefit, not permission for visual regression.

Do not claim a specific byte saving from source-line reduction without measuring the emitted production artifact.

### 20.2 Creator lazy-load decision

Only after deployment verification:

1. build a local dynamic-import prototype;
2. confirm emitted chunk structure;
3. install/test it through the real TavernHelper/SillyTavern delivery path;
4. confirm chunk URL loading, reload/update behavior, and CSP/module behavior;
5. if all pass, dynamically import Creator when an explicit edit action occurs;
6. if any fail, retain static Creator code inclusion.

### 20.3 DX chunking

Do not split each DX into a separately installed script as the default architecture.

Optional character-specific runtime chunks may be considered later only if deployment is proven reliable and bundle analysis shows meaningful benefit. Illustrated V2 + theme/extensions does not require chunking.

**Migration-sensitive:** Deployment reliability outranks bundle-size purity.

## 21. Refactor validation flow

**Proposed:** Every migration step should compare against the frozen Current baseline and validate behavior in this order when applicable:

1. targeted tests for the changed boundary;
2. full tests;
3. lint;
4. production build;
5. SillyTavern/browser runtime inspection for UI/runtime changes;
6. production bundle-size comparison for presentation/style cleanup.

High-value trust/data parity assertions include:

- controlled DX cannot be spoofed;
- exactly three trust routes remain;
- Trusted DX and Special NPC may share `illustrated_v2` without sharing trust identity;
- same-name v2 blocks legacy fallback/merge;
- legacy-only still displays during compatibility stage;
- raw body image fields cannot grant Special NPC;
- Viewer reads do not migrate/write visual data;
- Creator legacy prefill does not write until save;
- explicit save preserves unrelated entry content;
- native message mounts preserve TavernHelper frontend DOM;
- selective refresh updates all truly affected cards and leaves unrelated cards stable.

High-value Illustrated V2 visual assertions include at least:

- standard Special NPC desktop;
- standard Special NPC real mobile;
- standard Special NPC forced-mobile;
- Venus desktop/mobile with its exclusive animation/decoration intact;
- Iris desktop/mobile with intended theme/flag/background differences intact;
- Anastasia desktop/mobile with intended theme differences intact;
- overview/detail/tab/scroll behavior remains usable after the mobile-core migration;
- real mobile and forced-mobile use equivalent layout mechanics.

**Intentionally unchanged:** Code inspection alone is not runtime verification.

**Migration-sensitive:** If a browser/tool bridge fails, report tool failure separately from application failure.

## 22. Recommended migration sequence

1. Freeze visual references and bundle-size baseline.
2. Promote Special-NPC v2 layout/mobile mechanics into a neutral Illustrated V2 core without changing trust logic.
3. Move Venus, Iris, and Anastasia onto that backbone one by one.
4. Preserve character-specific art direction as theme CSS/tokens/extensions.
5. Remove obsolete DX-v1 layout/mobile rules only after each character passes visual review.
6. Collapse real-responsive and forced-mobile duplication into one canonical mobile path.
7. Consolidate repeated theme structure/tokens and measure emitted bundle change.
8. Introduce explicit Viewer preparation/presentation model and separate trust route from render surface in code.
9. Extract runtime scheduler/message-host boundaries, then selective refresh.
10. Extract Creator state/I/O boundaries.
11. Consider dynamic loading only after real deployment validation.
12. Retire legacy compatibility only through a separately approved release plan.

This sequence intentionally avoids a big-bang rewrite and keeps the visually proven Special-NPC v2 work as the forward backbone rather than continuing to invest in the older DX mobile v1 structure.
