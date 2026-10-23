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

- Portrait 9:16, 28.6 seconds, ending immediately after the aperture seals, English mission display/publication metadata.
- Eight approved storyboard shots, with shot seven split into a three-second
  exterior attack and a one-second cockpit confirmation: nine executable scenes.
- Original smooth seed-hull fighter with smoked canopy, copper seams, offset fin,
  recessed turquoise propulsion slots and animated torpedo launch hatch.
- Detailed 3D cockpit with inset instrument housings, copper trim, bezel screws,
  cooling slots, backlit switches, cuffs, moving gauge needles and throttle levers.
- Editable native HUD: timed speed readouts, target acquisition / firing / ready
  states, a moving charge indicator, three system bars, thermal cursor and radar
  scope with orbiting scan dot and drifting contacts. The fourth-target counter,
  firing display and mission lights switch at the actual attack/impact times.
  Mission text stays readable in the central display.
- Six individually tracked, unmanned relays. Impacts at 7.30 / 9.00 / 12.20 /
  16.40 / 19.35 / 24.25 seconds. Targets stay destroyed in later shots.
- Laser attacks on targets 1, 2, 4 and 6; curved torpedoes on targets 3 and 5.
- Separate arrival, fleet and escape apertures, animated native geometry.
- One hostile command vessel and exactly four escorts; final volley fires only
  during the retreat. The first tracer centre reaches the entrance at about 28.52 s,
  just after it seals at 28.50 s; the fighter clears it immediately beforehand.
- Widely distributed targets, a banked slalom, barrel roll, diving attack and
  tight U-turn away from the fleet. The final cameras keep the portal in view.
- Three large textured planetary spheres, including a ringed gas giant.
- Opaque cyan/violet vortex interiors, animated together with their aperture rims:
  the opening no longer reveals the ordinary galaxy behind it.
- Chase/side/cockpit views and seek-safe animation.
- Embedded original synthesized effects (24 kHz PCM WAV) and an electronic score;
  no narration, downloaded audio, remote assets or AI services needed to play.
- The existing arrival sketch doubles as publication cover. Storyboard images
  are references, not pre-rendered animation frames.

The runtime deliberately uses the editor's existing declarative vocabulary:
3D geometry, joints, paths, camera keys, transparency, layered aperture rings,
2D HUD, SVG starfield and deterministic, procedurally authored PNG textures. It is a stylized interpretation, not a pixel-identical
recreation of the illustrated concept art or a volumetric portal simulation. The new tunnel image is a texture mapped to native 3D aperture geometry.
Reusable fighter/cockpit resources and the animated sector live in the project's
3D library and can be exported with the existing resource tools.

## Rebuild and checks

From `scenescript/`, Node 24:

```sh
npm run example:space-textures # optional: regenerate the mathematical texture artwork
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

The updated low-resolution `space-adventure-preview.mp4` accompanies this production (270 × 480, 12 fps, approximately 28.6 seconds). A complete export and its decoded audio track were verified.
Use the native project to export a higher-resolution master in the editor.
The approved storyboard remains the original planning record; these runtime
revisions implement the user's subsequent feedback without fabricating new approvals.

The final scene is shortened to 2.6 seconds without speeding up its flight path.
The escape resource rests hidden: it cannot reappear when its animation ends
or when the playhead lands on the exact final timestamp. The original approved
30-second storyboard remains unchanged as the planning record.

The arrival opens from a tall narrow seam to a full aperture before Needlefin
becomes visible. The ship starts behind the opaque vortex plane and crosses it
nose-first; the aperture contracts only after the tail clears it. The exterior
camera keeps the complete opening in frame rather than cropping it at the edge.
