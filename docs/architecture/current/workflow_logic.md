# CharInfo Manager Workflow & Logic — Current Baseline

**Snapshot:** 2026-08-18 (Asia/Taipei)

> This document records the actual workflow in the current working tree. It is not a target design.

## 1. Message → CharInfo card → Viewer

Current runtime flow:

1. `src/char_info_viewer_runtime/runtime.ts` watches recent assistant message floors.
2. For an active floor, `projectCharInfoMessage()` in `src/char_info_viewer/runtime/charInfoMessage.ts` scans raw assistant text for complete `<char_info>...</char_info>` blocks.
3. A message may produce at most four CharInfo cards. If the limit is exceeded, the runtime keeps the native message rather than partially mounting CharInfo cards.
4. `nativeMessageMount.ts` replaces the raw CharInfo spans with temporary tokens, asks TavernHelper/SillyTavern to render the tokenized message, then replaces those tokens with CharInfo-owned hosts.
5. Existing TavernHelper frontend render nodes are preserved when possible; CharInfo does not restore a stale whole-message HTML snapshot.
6. `RuntimeRoot.vue` teleports a `ViewerApp` instance into each CharInfo-owned host.

## 2. Viewer parse and route flow

The current `ViewerApp` initialization path is:

`yamlText` → DX reference check → normal YAML parse when not DX → visual resolution → ViewModel → one of exactly three routes.

### 2.1 Trusted DX path

1. `parseDxCharacterReference()` checks whether the complete CharInfo payload is exactly an allowed DX placeholder/reference.
2. If it is a DX reference, `loadDxCharacterReference()` is called.
3. The loader verifies the reference exists in the controlled roster and has registry data.
4. It locates a unique active-worldbook entry named `char_info_dx_characters`.
5. It reads the matching `<dx_character>` record.
6. `inject_var` is parsed as the minimal first-appearance state payload.
7. Optional `display_only` data is parsed and shallowly merged on top for display/manual import purposes.
8. The roster name is checked against both injected and merged display data.
9. The resulting display object is registered in a private `WeakMap` identity inside the DX loader.
10. Only objects that retain that private loader identity pass `isLoadedDxCharacterData()`.
11. The ViewModel resolves the controlled DX presentation profile and selects the DX/illustrated route.

A manually constructed object with the same name or `__dx_character_ref` does not become Trusted DX because it lacks the loader identity.

### 2.2 Normal YAML path

If the input is not an exact DX reference:

1. `parseCharacterYaml()` parses normal character YAML.
2. `stripUntrustedDxReference()` removes any raw `__dx_character_ref` field from normally parsed character data.
3. `applyParsedCharacterData()` calls `resolveCharacterVisualConfigWithExtensions()`.
4. Visual resolution strips untrusted inline/body image fields.
5. Named visual data is resolved from chat variables by exact character name.
6. Any gallery-extension reference is resolved from its worldbook when possible.
7. The resulting data is passed to `buildCharacterViewModel()`.
8. `layoutKind` becomes `special_npc` only when the resolved data carries the Special NPC visual brand and has usable image groups.
9. Otherwise `layoutKind` is `default`.

## 3. v2 / legacy visual-resolution precedence

For a character named `name`, `themeService.ts` performs this resolution:

1. Read `chatVariables.char_info.profiles`.
2. If that object has its own property `name`, return that value immediately as the authoritative named config.
3. Do **not** field-merge legacy data into it.
4. Do **not** fall back to same-name legacy data even if the v2 value is invalid or `null`.
5. Only when the v2 key does not exist, look for the first available legacy source in this order:
   - `char_info_visuals[name]`
   - `char_info.visual[name]`
   - `char_info.visuals[name]`
6. If a legacy source is used, attach legacy-source branding for the warning path.
7. If the selected config contains a usable image, attach Special NPC branding.
8. If old body-level image syntax was present, attach a deprecated-inline-syntax warning brand, but do not use those fields as image data.

This rule applies both to actual Viewer resolution and visual preload lookup.

## 4. Special NPC flow

A non-DX character enters Special NPC presentation only through trusted named visual resolution:

`normal parsed data` → strip body image fields → resolve same-name v2/legacy visual profile → valid image found → internal Special NPC brand → ViewModel `layoutKind = special_npc`.

Legacy-only profiles can still follow this route during the compatibility period, but the UI warns that the source is deprecated.

The Special NPC route currently reuses `IllustratedCharacterSheet.vue` with `specialNpc=true`; there is no fourth “ordinary illustrated character” route.

## 5. Normal Character flow

A character reaches Normal Character when:

- it is not loader-trusted DX; and
- named visual resolution does not produce a trusted Special NPC image profile.

Raw body image fields are removed, so they cannot change this result.

The normal route uses the default Viewer rendering branch in `App.vue`.

## 6. Theme and presentation metadata flow

After visual resolution:

1. custom profile colors and entrance quote may be copied into resolved display data;
2. profile metadata is attached through a hidden non-enumerable symbol;
3. `resolveTheme()` derives final theme values;
4. `buildCharacterViewModel()` reads the hidden metadata for story sections, author, version, author note, sex, and race display data;
5. hidden visual brands also influence image use and final route selection.

This means current presentation state is partly encoded inside the resolved `CharacterData` object rather than in an explicit separate presentation model.

## 7. Gallery-extension read flow

When a selected v2/legacy config contains a valid `gallery_extension` reference:

1. `resolveGalleryExtension()` normalizes the reference.
2. It reads the referenced worldbook.
3. It finds the matching gallery-pack entry.
4. Extension images are appended to the embedded gallery in memory.
5. If the gallery pack is absent or unreadable, the Viewer logs a warning and keeps using the embedded gallery.

Viewer resolution does not write missing gallery data back to the source.

## 8. Current-chat library flow

`runtime.ts` maintains the current-chat library from latest MVU message data.

1. Wait for MVU initialization.
2. Read `Mvu.getMvuData({ type: 'message', message_id: 'latest' })`.
3. `collectCurrentCharacterSnapshots()` reads `stat_data.关系列表`.
4. For each character it derives name, race, identity, level, presence, affinity, inner thought, and chat-scope avatar URL.
5. The runtime preloads avatar/main visual candidates for the first several characters.
6. Affinity changes detected during `VARIABLE_UPDATE_ENDED` add unread character markers.
7. Opening a character clears its unread marker.
8. `RuntimeRoot.vue` mounts `ViewerApp` in `read-only` mode for the selected current-chat character.
9. The current `心里话` is supplied as `entranceQuoteOverride`, replacing the normal entrance-quote display for this read-only view.

This library does not create a second persistent copy of character data.

## 9. Worldbook character-library flow

`WorldbookCharacterLibrary.vue` performs:

1. Resolve current character-bound primary/additional worldbooks.
2. Merge them with the full available worldbook list, keeping character-bound books prioritized.
3. Read the selected worldbook.
4. Classify character entries through shared character-entry helpers.
5. Inspect managed visual blocks when present; otherwise create an empty display profile for entries without managed visuals.
6. Combine metadata and fallback sources:
   - race prefers managed metadata, then encountered MVU data, then body inference, then entry-title metadata;
   - author prefers managed metadata, then title metadata;
   - version comes from managed metadata;
   - description/author note prefers managed metadata, then title metadata.
7. Support filtering, race filtering, and sorting by original order/name/race/author/encountered/enabled.
8. Read-only detail view shows gallery plus entry body after excluding the managed EJS block.
9. The enabled toggle explicitly writes only the target entry's `enabled` state and reads back for verification.
10. Editing launches Creator for the selected worldbook/UID.

## 10. Creator open → inspect → edit flow

The runtime calls `openCreatorManager()` only after an explicit edit action.

1. `controller.ts` destroys any existing Creator overlay.
2. `overlay.ts` creates an isolated full-screen iframe in the host document.
3. Creator styles are teleported into the iframe.
4. `App.vue` mounts into the iframe.
5. On close/destroy, Vue, styles, viewport listeners, overlay, and iframe are removed.

The runtime import of the Creator controller is currently static, so code inclusion and UI mounting are separate concerns.

## 11. Creator profile-load flow

After a worldbook entry is selected:

1. `inspectManagedBlock()` checks for managed v2 or managed v1 blocks.
2. If valid, Creator loads and normalizes that managed profile.
3. If the managed profile references an extension gallery, Creator reads and appends the external images for editing.
4. If no managed block exists, `inspectLegacyVisualProfile()` checks the quarantined legacy parser.
5. Only one statically recognizable direct `setLocalVar` assignment to a supported legacy root is importable.
6. Static legacy data is converted in memory to the current `CharacterVisualProfile` shape and prefills the editor.
7. The source worldbook remains unchanged at this stage.
8. Dynamic expressions, mixed writes, multiple legacy assignments, name mismatch, malformed calls, or unsupported structures are blocked from automatic conversion.
9. If neither managed nor safely importable legacy visual data exists, Creator starts an empty profile and may use parsed entry-display name as an initial name.

## 12. Creator save / migration flow

Saving is explicit and requires confirmation.

1. Validate the full profile.
2. Normalize the managed v2 profile.
3. Re-read the latest worldbook entry before writing.
4. If an importable legacy statement exists, `upsertManagedEjsBlockWithLegacyMigration()` removes exactly that recognized statement and inserts managed v2 output.
5. If an existing managed block exists, only that managed block is replaced.
6. Other entry content is preserved.
7. Optional extension-gallery data is written first; if the subsequent character-entry write fails, Creator attempts to roll the gallery change back to its previous state.
8. The character entry is updated through `updateWorldbookWith(..., { render: 'immediate' })`.
9. Creator re-reads the resulting entry state and verifies a valid managed block exists.

The resulting generated EJS writes:

- `char_info.profiles[name]` with `schema_version: 2`;
- optional custom colors, entrance quote, gallery, extension reference, and metadata;
- `status.externalAvatars.partners[name].url` when an avatar is configured.

Creator does not generate new legacy-root visual data.

## 13. Apply-saved-profile-to-current-chat flow

This is a separate explicit Creator action after saving:

1. Re-read the current worldbook entry.
2. Extract only the managed EJS block.
3. Execute that managed EJS through Creator's EJS runtime.
4. Read current chat variables back and confirm the expected `char_info.profiles[name]` exists.
5. Call the runtime force-refresh callback.

This is explicit user-driven application; it is not Viewer-side automatic migration.

## 14. Viewer read-only boundary

Normal Viewer display flows are read-only unless the user explicitly invokes a save/import action.

Important distinctions:

- resolving v2 or legacy visual data does not write chat/worldbook data;
- reading gallery extensions does not repair/write gallery data;
- current-chat library detail is read-only;
- worldbook detail body is read-only;
- legacy profile recognition in Creator only prefills until explicit save;
- worldbook entry enable/disable is an explicit user action;
- Viewer import buttons and DX controlled first-appearance injection are separate intentional write paths.

## 15. Runtime refresh/event flow

At start, `runtime.ts`:

1. initializes library state;
2. mounts `RuntimeRoot` into a host-page div;
3. teleports styles;
4. binds SillyTavern events;
5. starts a MutationObserver on `#chat`;
6. scans recent message floors;
7. waits for MVU, then binds MVU variable events.

Message events generally enqueue only the affected message floor. Dirty message IDs are processed in batches.

MVU variable events currently do two broader operations:

- refresh the current-chat library;
- schedule a visual-card refresh that removes and remounts **all active CharInfo cards**.

`forceRefreshCharInfo()` likewise refreshes the library and remounts all active CharInfo cards.

This broad visual refresh is a current behavior and a known future optimization target.

## 16. Native-message DOM recovery flow

The MutationObserver ignores CharInfo-owned DOM changes. For external changes under mounted message floors:

1. find the owning message ID;
2. check whether the source element or CharInfo host disappeared;
3. enqueue that message for re-render;
4. `renderMessage()` uses a short remount-loop guard to avoid repeatedly fighting an unstable external DOM.

On runtime stop, CharInfo hosts are removed and native message display is refreshed through the host formatter when restoration is requested.

## 17. Preload flow

The runtime preloads only likely near-term image candidates.

Current-chat library snapshot refresh:

- takes the first several characters;
- includes avatar URL;
- asks `resolveCharacterVisualPreloadUrls()` for named visual candidates;
- applies user-configured image-source priority without rewriting stored source order.

Opening one character asks for more of that character's visual candidates.

The preload resolver follows the same v2-authoritative / legacy-only fallback rule as normal visual resolution.

## 18. Compatibility retirement boundary

Current compatibility is intentionally split:

- **Viewer:** may read legacy-only named visual roots and warn; does not automatically migrate them.
- **Creator:** may safely prefill one recognized static legacy assignment; explicit save converts it to v2.
- **Unsafe legacy:** remains blocked from automatic editing.
- **New output:** managed v2 only.

This separation must be preserved until legacy runtime compatibility is intentionally retired.
