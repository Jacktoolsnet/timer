# Space adventure — executable SceneScript

## Load the finished project

Open **Projektdatei importieren** in the editor's main project toolbar and choose
`space-adventure.scenescript.json`. This is a **complete video project**, not a
storyboard-only response: do not load it through the Storyboard JSON importer.
Save your current project first if you want to keep another video.

The supplied `spaceadventure_scenescript.json` remains untouched. Its approved
storyboard (ID, revision 27, reviews, resolved comment/reply, all eight sketches)
is preserved exactly in the generated project. Space Adventure is the application's default project. Existing browser-saved
work takes precedence and is not overwritten; the start-project button loads
Space Adventure explicitly.

## Production

- Portrait 9:16, exactly 30 seconds, English mission display/publication metadata.
- Eight approved storyboard shots, with shot seven split into a three-second
  exterior attack and a one-second cockpit confirmation: nine executable scenes.
- Original smooth seed-hull fighter with smoked canopy, copper seams, offset fin,
  recessed turquoise propulsion slots and animated torpedo launch hatch.
- 3D cockpit, anonymous gloved hands, editable 2D mission screen and six lights.
- Six individually tracked, unmanned relays. Impacts at 7.30 / 9.00 / 12.20 /
  16.40 / 19.35 / 24.25 seconds. Targets stay destroyed in later shots.
- Laser attacks on targets 1, 2, 4 and 6; curved torpedoes on targets 3 and 5.
- Separate arrival, fleet and escape apertures, animated native geometry.
- One hostile command vessel and exactly four escorts; final volley fires only
  after the fighter has left and the escape aperture has closed.
- Continuous flight route, chase/side/cockpit views, and seek-safe animation.
- Embedded original synthesized effects (24 kHz PCM WAV) and an electronic score;
  no narration, downloaded audio, remote assets or AI services needed to play.
- The existing arrival sketch doubles as publication cover. Storyboard images
  are references, not pre-rendered animation frames.

The runtime deliberately uses the editor's existing declarative vocabulary:
3D geometry, joints, paths, camera keys, transparency, layered aperture rings,
2D HUD and SVG starfield. It is a stylized interpretation, not a pixel-identical
recreation of the illustrated concept art or a volumetric portal simulation.
Reusable fighter/cockpit resources and the animated sector live in the project's
3D library and can be exported with the existing resource tools.

## Rebuild and checks

From `scenescript/`, Node 24:

```sh
npm run example:space
npm test
npx playwright test tests/space-adventure.spec.ts
```

Generation is entirely offline and validates the project before writing it
atomically. It refuses an unapproved storyboard and never modifies the input.
Regression checks cover storyboard preservation, individual target destruction,
portal/fleet/volley order, reverse seeking, embedded audio, native project load,
rendered scene beats, persistence of approvals and publication cover.


## Export verification

A complete MP4 export with audio was verified: 270 × 480, 24 fps,
30.037 seconds including encoder padding, 3,715,241 bytes.
`space-adventure-preview.mp4` is that low-resolution check export.
Use the native project to export a higher-resolution master in the editor.
