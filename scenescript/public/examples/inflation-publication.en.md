# Inflation for Dummies — ultra-short publication package

## Audience and format
English-speaking mobile short-video viewers curious about everyday prices. This is an editorial assumption, not audience research or a promise of performance.

## Timing and design
- Portrait 9:16, total **4.3 seconds**.
- One-second title image: **INFLATION FOR DUMMIES**.
- 0.3-second crossfade to a perspective 3D chart; its initial state holds during the transition.
- **Exactly three seconds** of continuous simulation with a matching original whoosh.
- The thick chocolate-filled area shrinks; the embossed golden money-filled area grows. Non-linear, uneven curves, chocolate-tablet top tiles and coin-like gold details.
- Real glass plinth with refraction, engraved grid, illuminated edges, polished chocolate/gold and a moving studio highlight. The procedural reflection map is offline and cached.
- The title INFLATION FOR DUMMIES persists above the chart as actual extruded 3D stroke geometry, not a flat bitmap. No additional captions, numbers, narration, music or explanation overlays.
- The existing generated cover is unchanged. Chocolate and money now use their own embedded color-texture images, with runtime PBR reflections and gloss.
- Texture files, built-in generation mode and final prompts: [material texture provenance](inflation-texture-prompts.en.md).
- Relative progression only, not actual years or historical prices; the project description makes the metaphor explicit.
- Final poses hold if the scene is extended. Reverse seeks are deterministic.

## Publication metadata
Title: **Inflation for Dummies 🍫💰**
Hashtags: **#Inflation #Shrinkflation #Shorts**

The authoritative description and first comment live in the generated JSON. Falling chocolate quantities and rising prices also allude to shrinkflation: a visual metaphor, not an economic time series.

## Files
- `inflation-explained.scenescript.json`: current default, standalone including cover and WAV.
- `inflation-cover-en.jpg`: title card and thumbnail, 1080 × 1920.
- `npm run example:inflation`: regenerate offline, preserve and embed the cover.
- Existing drafts remain untouched; explicitly load the example/start project. The race remains available separately.
- Source includes an SVG title-card fallback, replaced with the selected JPEG by the generation script.

## Cover generation
Mode: built-in image generator, not CLI. The generated PNG was technically resized/encoded to JPEG, with no semantic post-editing.

Final prompt:
> Create a premium cinematic vertical 9:16 cover/title card for a very fast economics short. The ONLY text is the exact English title 'INFLATION FOR DUMMIES', set huge in a stylish bold legible typographic layout across the top third. No other letters, labels, numbers, logos or watermark. Below it an impressive dimensional area chart sculpted from two materials: a rich segmented milk-chocolate tablet landscape that slopes and curves down from high left to low right, and an embossed golden money/coin-like solid landscape that curves up from low left to high right. These are thick continuous filled areas, not line charts, not separate bar graphs, and not a tower of coins. Dynamic camera in three-quarter perspective, translucent glass-like chart plinth with subtle cyan grid, moody deep navy backdrop, warm gold and chocolate studio lighting, tactile beveled surfaces and dramatic glossy highlights. Beautiful minimalist high-end 3D editorial rendering, visually understandable instantly. Mobile first, energetic but uncluttered. Typography safely inset from edges. No actual years, no numeric axes, no arrows needed.

## General compositing
Optional `Stage.transparentBackground:true` omits sky, automatic ground and fog, revealing the 2D backdrop behind real 3D geometry. Resource studio previews and legacy stages remain opaque.

