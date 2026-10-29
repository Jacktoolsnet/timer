# Social previews: Company and all JackTools.Net tools

Each project serves a fixed 1200×630 PNG at `/social/<project>.png`, with the SVG
source alongside it. Company shows the tool family; each tool has its own motif.
Artwork is independent of saved colours, style, font size and dark mode. Titles
and descriptions remain page-specific; image alternative text is localized.
The artwork uses short English product labels consistently across all languages.

`shared/SocialMeta.astro` provides the common Open Graph image and Twitter/X
large-card metadata, image type/dimensions, site name and language. Existing
canonical URLs, indexing rules and language redirects are unchanged. Minimal
redirect pages intentionally do not receive an extra metadata layout.

## Regenerate images

From the repository root, using Node >=24.17.0 and installed Company dependencies:

```sh
node scripts/generate-social-images.mjs
# Or regenerate just selected projects:
node scripts/generate-social-images.mjs timer company
```

The script uses Company's Playwright Chromium (`cd company && npx playwright
install chromium` if necessary). It uses only local assets and system fonts;
it does not visit a live website, load external fonts or invoke an image service.
Product names, taglines, accent colours and translated alternative texts are in
`shared/social.ts`. Illustration source and composition are in the generator.
PNG files are checked in, so normal Astro builds do not need a browser.

## Verification and deployment

Build all nine projects, then:

```sh
python3 scripts/check-social-previews.py
```

The checker verifies every rendered social head and sitemap target, absolute
image URLs on the correct domain, PNG dimensions, image size, unique metadata,
localized image text and parity between Open Graph and Twitter/X fields.

Deploy each project's complete `dist/`, including its `social/` directory.
Verify the image URL is publicly accessible as `image/png` with HTTP 200 and that
page source contains the metadata. Social services may cache earlier previews;
correct metadata cannot guarantee their presentation. This improves sharing,
not a promise of improved Google rankings. No hosting changes are made by the
image generator or checker.
