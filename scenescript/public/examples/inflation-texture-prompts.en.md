# Inflation material textures

Generated with the built-in image generator, not CLI. The selected square PNGs were technically resized to 1024 × 1024 JPEGs at quality 0.90; no semantic post-editing. These are color images, not normal/roughness maps. Actual glass, reflection and clearcoat lighting still come from the renderer. These textures are independent of the cover; the cover lettering was subsequently updated to Inflation Explained with Chocolate.

Final workspace assets:
- `public/examples/inflation-chocolate-texture.jpg`
- `public/examples/inflation-money-texture.jpg`

Both are also embedded under `chocolateTexture` and `moneyTexture` in the default SceneScript and its generated `src/lib/inflation-textures.json` source package.

## Chocolate — final prompt
> Seamless tileable flat 2D diffuse/albedo texture for a premium milk chocolate material, square image filling the entire frame edge to edge. A neat 2 by 2 grid of molded chocolate tablet squares with subtly beveled edges and narrow shallow scored grooves. Rich appetizing warm dark milk-chocolate brown, extremely fine natural cocoa surface grain and tiny imperfections, subtle detail. Orthographic straight overhead, uniform neutral diffuse illumination, no perspective, no cast shadows, no specular white highlights or baked dramatic lighting (the 3D engine supplies lighting). Precisely repeatable left-right and top-bottom boundaries. No background, packaging, wrapper, labels, letters, logos, text, border or watermark. This is a reusable PBR color-map bitmap, not a scene or a rendered chocolate bar.

## Money — final prompt
> Seamless tileable square diffuse COLOR TEXTURE for an imaginary gold money material in a 3D chart. Edge-to-edge repeating 3 by 3 grid of circular gold coin medallions pressed into a continuous warm golden metal sheet, with engraved concentric coin rims, fine guilloche filigree and tiny radial ridges. Each coin has a simple embossed dollar symbol in its center, no other lettering or numbers. Rich warm gold and amber, subtle wear and fine metal grain. Orthographic perfectly straight-on flat view, uniform diffuse lighting, NO perspective, NO cast shadows, NO specular white highlights or baked dramatic light; the 3D renderer supplies actual gloss. Seamless repeatable edges. It must read instantly as MONEY rather than generic metal. This is a reusable PBR color-map bitmap, not a scene, not a pile of coins, no packaging, brand logos, border, watermark or background.
