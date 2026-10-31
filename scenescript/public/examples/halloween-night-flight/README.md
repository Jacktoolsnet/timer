# Halloween After Dark — asset provenance

New assets for the separate Halloween/Christmas starter; the older romantic project is not replaced on disk.

- `forest.webp`, `pumpkin.webp`, `witch.webp`, `santa.webp`: generated with the built-in imagegen tool, then downscaled and encoded as WebP. Original alpha is retained on the three cutouts. The forest is full-bleed 9:16.
- `reference-bat.webp`, `reference-spider.webp`: still renders of the native editable resource geometry.
- `cover-tiktok.webp`, `cover-youtube.webp`: rendered from this film (native captions included); YouTube cover adds a layout around the portrait frame, not letterboxing in the actual film.
- `santa-ho-ho-ho.wav`: original locally synthesized eSpeak NG demonstration voice, English “Ho! Ho! Ho!”, not a recording of an identifiable person. Optional reproducible source: `scripts/generate-santa-demo-voice.py`. No external stock music or voice rights are claimed. Music and effects use the project's editable native score.

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

