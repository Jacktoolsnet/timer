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
- The title uses one camera-facing lettering plane, thinner strokes with open counters (including A), polished front caps and shallow dark extrusions that meet the caps without overlapping.
- No flowing area profiles or horizontal movement: only the two bar heights change.
- Real glass plinth with refraction, engraved grid, illuminated edges, polished chocolate/gold and a moving studio highlight. The procedural reflection map is offline and cached.
- Dark glossy 3D floor tiles with narrow grout joints echo the cover. Four instanced materials keep the floor inexpensive; highlights use the existing studio environment, not planar scene reflections.
- The title INFLATION EXPLAINED WITH CHOCOLATE persists above the chart as actual extruded 3D stroke geometry, not a flat bitmap. No additional captions, numbers, narration, music or explanation overlays.
- Only the cover title lettering has been updated; the chocolate/gold chart and glass styling are retained. The chocolate uses its embedded tablet texture; the gold ingot uses a solid metallic gold material, without the coin texture.
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
Mode: built-in image generator, edit of the existing title card (not CLI). The requested title is now “INFLATION EXPLAINED WITH CHOCOLATE”, in three lines. Output was technically resized/encoded to 1080 × 1920 JPEG; no semantic post-editing.

Final edit prompt:
> Edit ONLY the title lettering in this existing cover image. Preserve the entire lower chocolate-and-gold 3D area chart, glass plinth, lighting, background, layout, viewpoint, all materials, style and portrait aspect ratio as faithfully as possible. Replace the old title 'INFLATION FOR DUMMIES' completely with the exact English title 'INFLATION EXPLAINED WITH CHOCOLATE'. Set this in three mobile-readable lines in the same upper title area: 'INFLATION' large gold letters, 'EXPLAINED WITH' smaller warm gold letters, and 'CHOCOLATE' large rich chocolate/copper letters with golden bevel highlights. Maintain the original impressive extruded 3D typography, premium cinematic finish, generous safe margins, no overlap of title and chart. No other new text, no remaining DUMMIES words, no logos, no watermark. Do not redesign the chart.

## General compositing
Optional `Stage.transparentBackground:true` omits sky, automatic ground and fog, revealing the 2D backdrop behind real 3D geometry. Resource studio previews and legacy stages remain opaque.

