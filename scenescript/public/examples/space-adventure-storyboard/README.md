# Space adventure — Storyboard with sketches

Eight portrait concept sketches were created with the **built-in image_gen tool**.
The prompts, including design and continuity constraints, are in `prompts.json`.
The JPEG files are resized/encoded copies of those generated images, not video
renders. Character and setting references reuse matching shot sketches; dedicated
model sheets have not been generated.

- `index.html`: visual overview of the eight shots (also opens locally).
- `space-adventure.storyboard.json`: importable response, all eight JPEGs embedded.
- `space-adventure.plan.json`: the previously proposed text-only plan, retained as
  an editable source for offline repackaging.
- `01-*.jpg` through `08-*.jpg`: individual illustrations.

## Import

Open **Storyboard → Austausch mit der KI → JSON-Datei öffnen**, choose
`space-adventure.storyboard.json`, review the cards and **Änderungen speichern**.
Do not use the main executable SceneScript/video importer for this envelope.

The board ID `18f5f639-2ce9-4b30-aae5-bdbf13a0937b` and response revision **7** match
the user's exported input. The editor increments the revision on import. Existing
user fields, descriptions, IDs, comments and the 30-second plan were preserved;
only the image library and image references were added. The user comment remains
unresolved and shots remain drafts. The JSON imports into either the original
prefilled revision-7 board or the enriched revision-7 plan. If a later revision is
already saved, request fresh feedback JSON before preparing another response;
do not defeat the stale-response protection by blindly changing the revision.

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
