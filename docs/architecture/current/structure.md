# CharInfo Manager Architecture — Current Baseline

**Snapshot:** 2026-08-18 (Asia/Taipei)  
**Scope:** Current repository working tree, including the uncommitted v2/legacy visual-resolution changes present at snapshot time.

> **Baseline rule:** This document records the implementation that exists at this snapshot. It must not be silently rewritten to resemble a later refactor. If the architecture changes materially, preserve this snapshot and create or explicitly date a newer baseline.

## 1. Deployment shape and entrypoints

CharInfo Manager is shipped to SillyTavern / TavernHelper primarily as one runtime script:

- `src/char_info_viewer_runtime/index.ts` — runtime entrypoint.
- `dist/char_info_viewer_runtime/index.js` — installed production artifact described by the README.

The runtime entrypoint creates a single `CharInfoRuntime`, stores it on the host window as `CHAR_INFO_VIEWER_RUNTIME`, and stops/replaces an older runtime instance before starting a new one.

Two important source areas are intentionally internal modules rather than separate top-level webpack entries:

- `src/char_info_creator_manager/index.ts`
- `src/char_info_viewer/dx/index.ts`

`webpack.config.ts` excludes those paths from top-level entry discovery. The runtime currently imports the Creator controller statically, even though the Creator UI itself is mounted only when editing is requested.

Webpack is configured with async-chunk support, but the current user-facing deployment contract is still the single installed runtime script. The repository does not currently establish that TavernHelper deployment can safely fetch additional runtime chunks, so code splitting is not part of the baseline architecture.

## 2. Source-area ownership

### `src/char_info_viewer/`

Owns character parsing, visual resolution, Viewer presentation, Viewer imports, and DX-specific Viewer behavior.

Key files:

- `App.vue` — large Viewer orchestrator. It owns YAML initialization, DX reference handling, visual resolution, deprecation warnings, route presentation setup, import actions, DX first-appearance auto-import scheduling, themes, and default-layout rendering.
- `services/yamlParser.ts` — strict/loose character YAML parsing.
- `services/themeService.ts` — visual-profile resolution, v2/legacy precedence, untrusted inline-image stripping, Special NPC branding, legacy/deprecation branding, metadata attachment, theme/color resolution, and visual preload URL resolution.
- `services/characterViewModel.ts` — converts resolved `CharacterData` into display-ready data and selects the final Viewer layout kind.
- `services/galleryPackService.ts` — resolves optional gallery-extension references from worldbooks and appends extension images to the embedded gallery.
- `services/importService.ts` — Viewer save/import behavior.
- `runtime/charInfoMessage.ts` — projects raw assistant messages into text parts and up to four `<char_info>` card parts.
- `components/illustrated/IllustratedCharacterSheet.vue` — shared illustrated surface used by both Trusted DX and Special NPC presentations, with `specialNpc` controlling the Special NPC variant.

### `src/char_info_viewer/dx/`

Owns the controlled Trusted DX path.

Key files:

- `loader.ts` — recognizes exact `__dx_character_ref`, loads the controlled registry, validates roster identity, constructs display/inject data, and brands loaded DX objects through a private `WeakMap` identity.
- `roster.ts` — controlled DX roster and presentation profiles.
- `importQueue.ts` — serializes DX first-appearance state injection.
- `storyBooks.ts` — DX story-book links.
- `images.ts` and illustrated asset helpers — DX presentation assets.

`src/char_info_viewer/dxRuntime.ts` is a narrow re-export boundary used by the Viewer.

### `src/char_info_viewer_runtime/`

Owns persistent TavernHelper integration around the Viewer.

Key files:

- `index.ts` — runtime lifecycle entrypoint.
- `runtime.ts` — current central orchestrator. It owns message-floor discovery, dirty queues, event subscriptions, MutationObserver recovery, Viewer host lifecycle, broad visual refresh, current-chat library state, preload scheduling, settings, and Creator launch/close lifecycle.
- `RuntimeRoot.vue` — teleports `ViewerApp` instances into message hosts and renders current-chat library/settings/worldbook-library UI.
- `nativeMessageMount.ts` — inserts CharInfo hosts into TavernHelper-rendered message HTML while preserving existing TavernHelper frontend render nodes.
- `currentCharacterLibrary.ts` — projects latest MVU relationship data into read-only current-chat character snapshots.
- `WorldbookCharacterLibrary.vue` — reads worldbook character entries, displays/filter/sorts them, shows read-only details, toggles entry enabled state, and launches Creator editing.
- `runtimeSettings.ts` — script-scope Viewer UI settings and floating-button position.
- `types.ts` — runtime UI state types.

`legacyGalleryMigration.ts` still exists as a source file, but no active `src` import/reference connects it to the current runtime path. Current runtime behavior therefore does not automatically migrate `status.externalGalleries` into `char_info.profiles`.

### `src/char_info_creator_manager/`

Owns explicit author/user editing and persistence.

Key files:

- `App.vue` — large five-step editor and current main Creator state owner.
- `controller.ts` — singleton open/close controller.
- `overlay.ts` — creates an isolated iframe overlay, teleports styles into it, mounts Creator Vue, and fully destroys the overlay on close.
- `viewerPreview.ts` — creates Viewer preview data/config without writing it to the live chat.
- `ejsRuntime.ts` — explicit execution of a saved managed EJS block against the current chat.
- `galleryPackStorage.ts` — explicit gallery-pack worldbook persistence.

The five existing Creator steps are:

1. target worldbook/entry;
2. character/profile data;
3. theme colors;
4. gallery/avatar;
5. generate/write.

### `src/char_info_shared/`

Owns format contracts and reusable worldbook/profile logic shared by Viewer Runtime and Creator.

Key files:

- `characterVisualProfile.ts` — managed visual-profile schema, validation, metadata normalization, managed v1/v2 block inspection, and v2 EJS generation.
- `legacyVisualProfile.ts` — intentionally constrained parser/migrator for statically recognizable legacy visual EJS.
- `characterEntryLibrary.ts` — worldbook character-entry classification/name/body helpers.
- `galleryPack.ts` — gallery-extension reference and payload format.
- `worldbookList.ts` — worldbook ordering/deduplication helpers.
- `creatorManagerHostBridge.ts` — shared Creator host bridge types/helpers.

## 3. Current Viewer route model

CharInfo Manager currently has exactly three Viewer routes, with this priority:

1. **Trusted DX**
2. **Special NPC**
3. **Normal Character**

No fourth intermediate route exists.

### Trusted DX

Trusted DX is established only by the controlled DX loader:

- the source must be an exact DX placeholder/reference;
- the reference must exist in the controlled roster and have registry data;
- a unique `char_info_dx_characters` registry entry must be found in active worldbooks;
- roster identity and registry identity must match;
- the loaded object is recorded in a private `WeakMap` by `loader.ts`.

`isLoadedDxCharacterData()` requires this private loader identity. Manually adding `__dx_character_ref`, copying a DX name, or constructing matching fields does not create Trusted DX status.

### Special NPC

Special NPC presentation is granted after named visual resolution finds a usable image configuration and the resolved `CharacterData` receives the internal Special NPC brand.

The primary managed source is:

`char_info.profiles[角色姓名]`

During the compatibility window, a legacy-only named visual profile can also reach the Special NPC display path when it contains a valid image. That path remains explicitly deprecated and produces a warning.

Raw image-looking fields inside `<char_info>` are stripped before presentation resolution and cannot independently grant Special NPC status.

### Normal Character

If the data is not loader-trusted DX and does not have a trusted/resolved Special NPC image profile, `characterViewModel.ts` selects the default layout.

## 4. Current visual-profile data model

### Managed v2 source

Managed visual profiles are written to:

`char_info.profiles[角色姓名]`

The generated managed format uses `schema_version: 2`.

A profile can contain:

- custom race/tier colors;
- entrance quote;
- gallery image groups with mirror `sources`;
- optional `gallery_extension` reference;
- optional metadata (`author`, `version`, `author_note`, `sex`, `race`, `story_sections`).

Avatar is separate and is written to:

`status.externalAvatars.partners[角色姓名].url`

### Legacy compatibility sources

Temporary read compatibility recognizes these three named roots:

- `char_info_visuals[角色姓名]`
- `char_info.visual[角色姓名]`
- `char_info.visuals[角色姓名]`

The runtime visual resolver does not merge these with a same-name v2 entry.

### Authoritative precedence

For an exact character name:

1. If `char_info.profiles[name]` **has its own key**, that value is authoritative.
2. The same-name legacy roots are not consulted or field-merged.
3. This remains true even when the existing v2 value is invalid or `null`.
4. Legacy roots are consulted only when the v2 key does not exist.

This is a read-compatibility policy, not a data-merging policy.

### Deprecated inline/image sources

The Viewer strips and ignores body-level image fields such as:

- `角色图片`
- `立绘`
- `特殊立绘`
- `图片`
- `portrait`
- `image`

`status.externalGalleries` is also not a Viewer visual source.

## 5. Presentation state is currently coupled to `CharacterData`

`themeService.ts` attaches non-enumerable hidden-symbol state directly to resolved `CharacterData` objects:

- Special NPC visual trust/brand;
- deprecated inline-image warning state;
- legacy visual source identity;
- visual-profile metadata.

`characterViewModel.ts` then reads those brands to decide which image data can be used and which route to select.

This works, but it means raw/domain character data and presentation/trust state are not currently represented as separate explicit objects.

## 6. Current Runtime coupling

`runtime.ts` is the largest cross-responsibility runtime coordinator. It currently owns all of the following in one closure:

- active floor selection;
- raw-message projection and Viewer host mounting;
- dirty-message batching;
- remount-loop protection;
- MutationObserver recovery;
- SillyTavern event subscriptions;
- MVU event subscriptions;
- broad visual refresh scheduling;
- current-chat library state and affinity unread tracking;
- portrait preload scheduling;
- UI settings persistence;
- floating-button position persistence;
- worldbook-library opening;
- Creator lifecycle calls;
- runtime start/stop cleanup.

The behavior is intentional and working, but the module is a major coupling hotspot.

## 7. Native message ownership boundary

`nativeMessageMount.ts` does not take ownership of the entire TavernHelper message DOM.

Its current strategy is:

1. replace raw `<char_info>` card spans with unique temporary tokens;
2. ask TavernHelper/SillyTavern to format the tokenized message;
3. replace those tokens with CharInfo-owned hosts;
4. preserve existing `.TH-render` frontend nodes when the formatted message contains matching TavernHelper frontend mount points;
5. on restore, remove the CharInfo hosts rather than restoring a stale HTML snapshot.

This boundary is important because TavernHelper-rendered content may have its own live DOM/lifecycle.

## 8. Current Creator coupling and persistence boundary

`char_info_creator_manager/App.vue` owns most Creator workflow state directly, including:

- worldbook/entry loading and selection;
- profile form state;
- metadata and story sections;
- avatar/gallery editing;
- optional extension gallery;
- validation;
- legacy import inspection;
- Viewer preview state;
- managed EJS generation;
- save/update/rollback flow.

Creator persistence is explicit and user-triggered. It is the normal write boundary for converting recognized legacy syntax into managed v2 syntax.

A statically recognizable legacy profile is only **prefilled** when opened. The worldbook is not modified until the user explicitly saves.

Dynamic, mixed, ambiguous, malformed, or otherwise unsafe legacy code is blocked from automatic modification.

## 9. Worldbook library metadata behavior

The worldbook character library already prefers managed metadata when available.

Current fallback order includes:

- race: profile metadata → encountered MVU race → inferred entry body race → entry-title metadata;
- author: profile metadata → entry-title metadata;
- version: profile metadata;
- description/author note: profile metadata → entry-title metadata.

Worldbook entry-name/body parsing therefore acts as fallback behavior rather than replacing valid managed metadata.

## 10. Data-scope ownership

Current intended variable ownership is:

| Scope | CharInfo responsibility |
| --- | --- |
| `chat` | `char_info.profiles`, separate external avatar URL data |
| `message` | MVU story/relationship snapshot and DX appeared/injection state per swipe |
| `character` | No persistent NPC visual library |
| `script` | Viewer UI settings and floating-button position |
| `global` | No CharInfo project data |

Viewer reading visual compatibility data does not imply that Viewer may migrate or write those data sources.

## 11. Major architectural hotspots at this snapshot

These are observations about the current code, not proposed changes:

- `src/char_info_viewer/App.vue` combines parsing, DX loading, visual-resolution coordination, warnings, importing, theming, effects, and rendering.
- `src/char_info_viewer_runtime/runtime.ts` is a broad runtime orchestrator.
- `src/char_info_creator_manager/App.vue` is a very large five-step editor with I/O and presentation state in the same component.
- Viewer presentation/trust metadata is attached to `CharacterData` using hidden symbols.
- Visual-variable updates currently trigger broad remount of all active CharInfo cards rather than a per-character/per-message refresh decision.
- Creator code is included through a static runtime import even though its UI mounts only on demand.

These hotspots are the starting point for the separate proposed-architecture snapshot; they must not be mistaken for already-completed refactors.
