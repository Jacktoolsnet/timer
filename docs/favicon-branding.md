# Favicon brand colors

All twelve sites inside this workspace use the Company header's default green
(`#396315`, light green/technical palette), independent of a visitor's appearance
settings. Existing vector geometry is preserved. The fixed SVGs do not depend on
CSS variables from a document, which cannot style a separate favicon resource.

`shared/favicon-palette.json` documents the primary colors and URL revision.
Company's six logo layers use the corresponding explicit default sRGB colors.
The icon links carry `?v=brand-green-1` so browsers request the new resources
instead of indefinitely displaying cached warm/brown favicons.

Validation:

```sh
python3 -B scripts/check-favicons.py          # source assets and layout links
python3 -B scripts/check-favicons.py --built  # also check current dist assets/HTML
```

The existing full-build runner covers ten static sites. Sound and NullTopic's
frontend must additionally be built using their own build commands. No backend,
database, theme preference, or deployment change is involved.
