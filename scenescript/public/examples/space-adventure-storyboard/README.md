# Space adventure — Storyboard with sketches

## Executable video project

The approved user export has now been turned into a native 30-second 3D project:
- [space-adventure.scenescript.json](space-adventure.scenescript.json) — load through
  the **main project importer**, not the Storyboard overlay.
- [space-adventure-preview.mp4](space-adventure-preview.mp4) — complete test export
  with sound, 270 × 480, 24 fps (low-resolution preview, not a 1080p master).
- [PRODUCTION.md](PRODUCTION.md) — implementation, timing and rebuild instructions.

The supplied `spaceadventure_scenescript.json` and its approved storyboard are
preserved. Space Adventure is the application default. Existing browser-saved projects still take precedence; the “Beispiel / Startprojekt laden” button opens Space Adventure explicitly.


Eight portrait concept sketches were created with the **built-in image_gen tool**.
The prompts, including design and continuity constraints, are in `prompts.json`.
The JPEG files are resized/encoded copies of those generated images, not video
renders. Character, object and setting references reuse matching shot sketches; dedicated
model sheets have not been generated.

- `index.html`: visual overview of the eight shots (also opens locally).
- `space-adventure.storyboard.json`: importable response, all eight JPEGs embedded.
- `space-adventure.plan.json`: the editable text-only source for offline repackaging,
  updated to the current storyboard structure.
- `01-*.jpg` through `08-*.jpg`: individual illustrations.

## Import

Open **Storyboard**, use the folder icon **JSON-Datei öffnen** in its top toolbar, choose
`space-adventure.storyboard.json`, review the cards and **Änderungen speichern**.
Do not use the main executable SceneScript/video importer for this envelope.

The board ID `18f5f639-2ce9-4b30-aae5-bdbf13a0937b` and response revision **7** match
the user's exported input. The editor increments the revision on import. Existing
user fields, descriptions, IDs, comments, eight sketches and the 30-second plan
were preserved. The current structure explicitly distinguishes:
- **Charaktere:** the anonymous pilot, visible only through cockpit POV (no invented portrait).
- **Objekte:** Needlefin, the six relays and the hostile fleet.
- **Kulissen:** the relay sector, cockpit and fold-space apertures.
- **Szenen:** the original eight shots, with the pilot linked to cockpit shots.

Objects remain in `board.characters` with `kind:"object"`; people use
`kind:"character"`. Scene references still use `characters` for both categories.
All characters, objects, settings and shots have explicit `status:"draft"`.
Nothing is pre-approved and the original user comment remains unresolved.
The pilot reference reuses the existing cockpit sketch, not a new model sheet.
Review each entry in the left-hand list and its grouped properties on the right;
approval is a user-controlled switch. The JSON imports into either the original
prefilled revision-7 board or the enriched revision-7 plan. If a later revision is
already saved, the file loader offers an explicit full replacement confirmation.
Cancel to keep current edits and comments; confirm only when you want the file
to replace the entire board, then choose “Änderungen speichern”. Export a backup
first if needed. For incremental AI revisions, request fresh feedback JSON;
pasted AI responses still enforce the revision check. Do not manually change
the revision to bypass this protection.

Images describe composition, lighting and design, not an exact animation state.
The text controls the six-target destruction sequence and four fleet escorts;
not every generated drawing depicts counts and consecutive beats exactly. Original
visual designs were requested, but resemblance to existing works still requires
human review. No production-ready 3D geometry, rigs, audio or executable video is
included. The existing default project and any stored user project are unchanged.

## Rebuild and validation

From `scenescript/`, with Node 24:

```sh
node --experimental-strip-types scripts/generate-space-storyboard.mjs
```

Packaging uses the JPEGs already in this directory and makes no network requests.
It validates the native plan and its image references, checks import against
revision 7, checks eight shots / eight embedded images / 30 seconds, and verifies
that all pre-existing text and comments are unchanged.
