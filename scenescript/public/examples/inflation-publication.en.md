# Inflation Explained with Chocolate — ultra-short publication package

## Audience and format
English-speaking mobile short-video viewers curious about everyday prices. This is an editorial assumption, not audience research or a promise of performance.

## Timing and design
- Portrait 9:16, total **4.3 seconds**.
- One-second title image: **INFLATION EXPLAINED WITH CHOCOLATE**.
- 0.3-second landmark-guided mesh morph to the 3D chart. Frozen endpoints align the cover with the held chart pose; simulation begins after the morph.
- **Exactly three seconds** of continuous simulation with a matching original whoosh.
- Two upright, fixed-width 3D bars stand side by side: a textured chocolate tablet on the left, a solid polished gold ingot on the right. Both start at 6 units. Chocolate shrinks to 3, gold grows to 7.5, with anchored bottoms and smooth vertical motion only. These are illustrative design ratios, not historical data; no percentage labels appear.
- An opaque near-black, subtly glossy backboard carries raised white, mildly reflective grid lines above the floor. The separated bars are opaque; the glass plinth is retained.
- The title uses original heavy sans-serif outline contours, proportioned to the cover: one closed beveled extrusion per letter, true through-holes (A/O/P/D), no overlapping stroke boxes, polished gold/cream/copper caps and darker side walls on one camera-facing plane. This is a geometric approximation of the generated cover typography, not an identical source font.
- No flowing area profiles or horizontal movement: only the two bar heights change.
- Real glass plinth with refraction, engraved grid, illuminated edges, polished chocolate/gold and a moving studio highlight. The procedural reflection map is offline and cached.
- Dark glossy 3D floor tiles with narrow grout joints echo the cover. Four instanced materials keep the floor inexpensive; highlights use the existing studio environment, not planar scene reflections.
- The title INFLATION EXPLAINED WITH CHOCOLATE persists above the chart as actual closed, beveled 3D lettering, not a flat bitmap. No additional captions, numbers, narration, music or explanation overlays.
- The cover preserves the cinematic title, lighting, glass plinth and glossy tiled floor, replacing the old curved areas with two separated upright bars: shorter chocolate on the left and taller gold bullion on the right. The chocolate uses its embedded tablet texture; the gold ingot uses a solid metallic gold material, without the coin texture.
- Texture files, built-in generation mode and final prompts: [material texture provenance](inflation-texture-prompts.en.md).
- Relative progression only, not actual years or historical prices; the project description makes the metaphor explicit.
- Final poses hold if the scene is extended. Reverse seeks are deterministic.

## Publication metadata
Title: **Inflation Explained with Chocolate**
Hashtags: **#Inflation #Shrinkflation #Shorts**

The authoritative description and first comment live in the generated JSON. Falling chocolate quantities and rising prices also allude to shrinkflation: a visual metaphor, not an economic time series.

## Files
- `inflation-explained.scenescript.json`: current default, standalone including cover and WAV.
- `inflation-cover-en.jpg`: title card and thumbnail, 1080 × 1920.
- `npm run example:inflation`: regenerate offline, preserve and embed the cover.
- Existing drafts remain untouched; explicitly load the example/start project. The race remains available separately.
- Source includes an SVG title-card fallback, replaced with the selected JPEG by the generation script.

## Cover generation
Mode: built-in image generator, precise-object edit of the existing cover (not CLI).
The selected generated PNG was technically resized/encoded to 1080 × 1920 JPEG
with Sharp; no semantic post-editing. It is embedded as both title-card asset and
project thumbnail by `npm run example:inflation`.

Final edit prompt:
> Use case: precise-object-edit. Edit target: the supplied existing portrait SceneScript cover. Change ONLY the lower diagram from overlapping curved area surfaces into TWO SEPARATE UPRIGHT RECTANGULAR 3D BARS standing side by side on the same existing glass plinth. Left bar: a rich brown chocolate tablet with clearly beveled chocolate squares, shorter. Right bar: one solid polished GOLD INGOT with clean broad metallic faces and elegant beveled edges, taller. Equal bar widths and depths, straight horizontal tops, anchored to the same baseline, a generous clear gap between them. Height ratio chocolate to gold approximately 3 : 7.5 (left about 40% of right). The gold bar must be solid bullion, NOT a stack of coins, NOT coin-covered, NOT a curved area, not translucent. No flowing ribbons, area curves or diagonally sloped chart surfaces remain. Preserve as closely as possible the existing spectacular premium cinematic 3D style, dark navy backdrop, warm gold rim lighting, crisp gleaming beveled edges, thick transparent cyan-lit glass plinth, glossy dark tiled floor with warm reflections, viewpoint and portrait 9:16 composition. Keep the entire upper typography and its layout EXACTLY as supplied: three lines 'INFLATION', 'EXPLAINED WITH', 'CHOCOLATE', with the same large extruded gold/copper letters, styling, safe margins and readability. Put the taller bar below the title with a clean breathing gap. The lower chocolate bar should remain visually substantial, not a tiny cube. Do not add ANY text, percentage labels, numbers, arrows, logos, watermarks or additional bars. Do not redesign the title, floor or plinth. The goal is the same beautiful cover with a simple two-bar chart instead of area graphs.

The generated illustration is illustrative, not a numerically exact chart; the
animated model implements the exact comparison ratios independently.

## General compositing
Optional `Stage.transparentBackground:true` omits sky, automatic ground and fog, revealing the 2D backdrop behind real 3D geometry. Resource studio previews and legacy stages remain opaque.

