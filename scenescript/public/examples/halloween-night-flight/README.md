# Halloween After Dark — asset provenance

New assets for the separate Halloween/Christmas starter; the older romantic project is not replaced on disk.

- `forest.webp`, `pumpkin.webp`, `witch.webp`, `santa.webp`: generated with the built-in imagegen tool, then downscaled and encoded as WebP. Original alpha is retained on the three cutouts. The forest is full-bleed 9:16.
- `reference-bat.webp`, `reference-spider.webp`: still renders of the native editable resource geometry.
- `cover-tiktok.webp`, `cover-youtube.webp`: rendered from this film (native captions included); YouTube cover adds a layout around the portrait frame, not letterboxing in the actual film.
- `santa-ho-ho-ho.wav`: original locally synthesized eSpeak NG demonstration voice, English “Ho! Ho! Ho!”, not a recording of an identifiable person. Long internal pauses are compressed to roughly 90 ms; the voice timbre and syllables are retained. Optional reproducible source: `scripts/generate-santa-demo-voice.py`. No external stock music or voice rights are claimed. Music and effects use the project's editable native score.

The JSON package is self-contained and needs no API key or remote asset at playback.
All generated art was inspected before packaging. Full-resolution generation originals remain in CODEX_HOME, but the project references only committed embedded assets.

## Final generation prompts (built-in mode)

### forest

Use case: stylized-concept. Asset: full-bleed 9:16 portrait animated film background. A richly textured cinematic mystical Halloween forest clearing at midnight, twisted black trees framing the sides, luminous large moon at upper center, deep indigo and plum sky, low lavender ground fog, tiny distant crooked tombstones, damp moss and autumn leaves near bottom, magical volumetric moon rays. Premium painterly animated movie look, saturated jewel tones, exquisite lighting, dark but legible. Composition: open sky in middle upper half for flying characters, open foreground bottom quarter for separate pumpkin. Only environment, NO pumpkin, NO characters, NO spider, NO bat, NO witch, NO Santa, NO text or lettering. Full bleed, no borders.

### pumpkin

Use case: stylized-concept. Asset: transparent cutout for animated film. One spectacular creepy Halloween jack-o-lantern pumpkin, facing camera slightly three-quarter, squat substantial rounded deeply ribbed vivid burnt orange glossy textured skin, crooked dark stem, sharply carved wicked triangular eyes and jagged mischievous grin blazing golden orange from within. Premium painterly animated movie style, rich saturated colors, dramatic violet moon rim light from left and amber internal light. Entire pumpkin visible, isolated on actual transparent background, no floor no scenery no text, no cast shadow outside object. Centered single object.

### witch

Use case: stylized-concept. Asset: transparent flying character sprite for animated Halloween film. One mysterious slender witch in profile flying LEFT on a long rustic broomstick, black purple flowing cloak and tall crooked pointed hat, tiny green-gold magical lantern hanging below broom. Side profile, broom horizontal, cloak billowing behind to right. Charming spooky, not grotesque, premium painterly animated movie look, rich purple highlights and moonlit silver rim. Entire broom and hat and cloak visible, isolated on actual transparent background, NO scenery, NO moon, NO text, no other figures.

### santa

Use case: stylized-concept. Asset: transparent cutout for animated holiday film. Santa Claus with a jovial face and voluminous white beard in a luxurious red gold sleigh loaded with gifts, TWO flying reindeer pulling in front on the LEFT, facing LEFT in dynamic side three-quarter flight. Golden reins connect them, reindeer legs stretched in midair, red glowing nose on lead deer. Clear coherent complete sleigh team silhouette, not a collection of separate items. Premium painterly animated movie style, exquisite warm golden bells and rich red velvet, icy blue rim lighting. Entire team visible incl antlers and runners, isolated on actual transparent background, no snow ground, no scenery, no text.


Lighting revision: all added northern-light ribbons/folds and stronger pumpkin firelight/spill are native editable vector layers and tracks, not new raster generations. No visible flame geometry, full-frame strobe or destructive repainting of the original art. Covers were re-rendered from the revised film.

## Bat camera fly-by revision

`bat-face.webp`: new transparent painterly frontal bat head/upper torso, generated with built-in imagegen (not the CLI), alpha retained, downscaled to 768px. Embedded as a separate detail sprite inside the bat resource; independently flapping native wings and their finger/vein geometry remain editable. The `approach` clip scales the bat only, not the scene camera, and reveals the face. The actual scene actor then exits above the lens. The first, distant bat is unaffected. The storyboard links this new close-up reference.

### Final bat-face generation prompt

Use case: stylized-concept. Asset: isolated transparent character head and upper torso for a close-up in a richly painterly Halloween animated film. A genuinely BAT-LIKE spooky vampire bat looking straight into the camera, not a cat: large thin translucent leathery bat ears with rounded angular tips, wrinkled short broad leaf-shaped bat nose, textured charcoal and deep plum fur, luminous amber eyes with sinister eyebrows, mouth slightly open showing TWO small ivory vampire fangs, a little dark furry chest tapering naturally below. Slightly frightening but magical and cinematic, no blood or gore. Beautiful realistic-painterly animated movie material detail, violet moon rim light, amber light on face. Entire ears and head visible, centered symmetrical frontal composition, real transparent background, NO wings (added separately for animation), no scene, no moon, no ground, no words, no borders. Not a flat vector icon and not cute cat anatomy.

Aurora motion revision: 24 overlapping feathered light pleats now carry phase-offset
traveling waves (position, length and brightness), complemented by independently
drifting ribbons/folds. All primitives stay below y=285 including blur extent;
no restoration image or opaque moon mask is pasted over the sky. Moon protection
is checked by conservative geometry bounds and native-rendered on/off pixel comparisons.

Witch direction/depth revision: the existing transparent art is unchanged. A native
`moon-flight` clip mirrors the entire rider/lantern/wake around the model origin,
shrinks it proportionally, and fades only the distant silhouette. Three scene
movement segments lead from offscreen left to the moon. No new raster generation.

## Stationary expressive Santa rig

New built-in imagegen artwork: `santa-sleigh.webp` (resting viewer-right forearm removed), `santa-wave-arm.webp` (independent waving arm), `reindeer-body.webp` (no baked legs), `reindeer-leg.webp` (textured full leg). Preparation only: alpha-preserving WebP downscaling and two overlapping crops, `reindeer-leg-upper.webp` / `reindeer-leg-lower.webp`, for native knee joints. Full-resolution originals remain in CODEX_HOME. The old `santa.webp` is retained on disk, not repackaged into the new default.

`reference-santa-rig.webp` and both covers are renders of the actual layered model. No duplicate complete-team image hides under the moving parts. Four legs per deer, separate knee joints, local body movement, blinking eyelids, brows and a waving arm are authored independently. The sleigh itself has no idle transform or exit movement. It stops at (270,610) after 1.85 seconds and stays there, including the ending.

Santa's lips use a small layered mouth overlay aligned to the base face. The `laugh` clip is baked from 40 ms RMS windows of the actual embedded Ho-ho-ho WAV; it is speech-activity animation, not phoneme recognition or a universal runtime lip-sync feature. Scene narration and action both start at 2.1 seconds (global 12.1), after arrival. The mouth stays closed in silent gaps and during the final greeting. Regenerate the package if replacing the source recording.

### Final Santa rig prompts (built-in imagegen; original team as style reference)

#### santa-sleigh

Use case: stylized-concept. Asset: layered animation base for the same painterly Santa character shown in the reference. Keep the rich red velvet, white fur, detailed gold filigree sleigh, warm gold illumination and violet moon rim. NEW composition: Santa seated in his red/gold sleigh, seen almost frontally in a slight three-quarter view, looking toward the viewer. Much larger readable face, warm smile with MOUTH CLOSED so a separate animated mouth can be added. BOTH EYES OPEN clearly visible, no glasses. Entire red hat and runners visible, compact nearly square portrait-oriented silhouette. Gifts behind him. Only his viewer-left arm/hand is visible, holding reins extending a short distance left; his viewer-right arm is fully concealed behind his torso and sleigh side, NO hand on that side (a waving arm will be attached as another layer). No reindeer in this asset, no snow or scenery, no ground, no text. Isolated on real transparent background. Do not change into a flat cartoon icon. Premium painterly animation material and friendly Santa, detailed face, neutral mouth.

#### reindeer-body

Use case: stylized-concept. Asset: one separate reindeer torso rig layer for the same richly painterly Christmas film as reference. ONE friendly flying reindeer, side profile facing LEFT. Entire antlers and head, warm brown fur with cream throat and belly, red leather harness with golden bells and red glowing nose. Torso and head ONLY: legs are separate animation layers, so all four leg silhouettes must be OMITTED below the belly; clean soft fur edge, no injury or wounds. A small tail at right. Keep the lively happy animal expression, gold light and violet moon rim. No reins or sleigh or Santa. Isolated on real transparent background, no scenery, no text. Wide body, generous antler room. Preserve painterly textured movie quality.

#### santa-wave-arm

Use case: stylized-concept. Asset: separate waving-arm animation rig layer matching Santa in reference, red velvet coat with luxurious white fur cuff and ivory-white mitten glove. One bent Santa arm, glove raised with palm facing viewer in a friendly wave, rounded fingers visible. The shoulder attachment is at the bottom LEFT, sleeve curves up to elbow on right, forearm goes upward, glove at TOP. Entire single arm and hand only, isolated on real transparent background, no torso, no face, no scenery, no text. Detailed warm red velvet, golden light with cool violet rim, premium painterly animated movie rendering, not a flat icon.

#### santa-sleigh-clean

Edit target is the supplied Santa/sleigh layer. Keep the same exact pixel composition, Santa face, hat, beard, closed mouth, open eyes, gifts, sleigh runners and overall transparency. Remove ONLY the resting arm on the VIEWER'S RIGHT: remove its red forearm, big white fur cuff and the resting brown glove from Santa's lap/right side. Fill that area naturally with the uninterrupted red coat belly and the dark red sleigh seat behind it. Santa's shoulder may remain as a red rounded shoulder but there must be NO arm, forearm, cuff, mitten or hand on the viewer-right side; a separate waving arm will attach there later. Keep the viewer-left hand holding reins intact. Do not change the face, dimensions or framing. Preserve real transparent background. Not an injury, simply a layered animation costume with the arm omitted behind the body.

#### santa-wave-arm-clean

Edit target is the supplied isolated waving Santa arm. Keep exactly the same waving palm, white glove, white fur WRIST cuff, bent pose, colors and shape. Remove the extra large WHITE FUR CIRCLE at the bottom LEFT shoulder end, replacing it with RED VELVET sleeve material ending in a simple rounded red shoulder attachment. Only ONE white fur cuff, at the wrist below the glove, not at the shoulder. Preserve transparent background, whole arm visible, no face or torso, no text. Keep same painterly material detail.

#### reindeer-leg

Use case: stylized-concept. Asset: ONE separate reindeer leg animation layer matching the brown-furred reindeer reference exactly in painterly material, warm light and violet rim light. A SINGLE complete slender deer leg from fluffy upper thigh/shoulder attachment at TOP to a small dark brown-black cloven hoof at BOTTOM. A gentle anatomical bend through knee and hock, nearly vertical overall, side view pointing LEFT. Warm brown fur above, tan lower leg, realistic fur texture and tendon shape, NO red cuff, no harness, no torso, no head, no antlers, no second leg. Whole leg visible centered with very little empty space around it. This is a clean reusable animation puppet component, no blood or wounds. True transparent background, no ground, no text. Tall narrow composition. The knee is approximately halfway down so upper/lower segments can be rigged separately.
