# Sitemaps and Search Console

All seven projects build `dist/sitemap.xml`. Deploy the complete `dist/` contents
(including `robots.txt`) to the corresponding domain root:

- https://jacktools.net/sitemap.xml — company homepage only
- https://timer.jacktools.net/sitemap.xml — 4 languages × timer/Pomodoro/training
- https://clock.jacktools.net/sitemap.xml — 4 languages
- https://stopwatch.jacktools.net/sitemap.xml — 4 languages
- https://breathe.jacktools.net/sitemap.xml — 4 languages
- https://relax.jacktools.net/sitemap.xml — 4 languages
- https://scenescript.jacktools.net/sitemap.xml — 4 languages × editor/AI guide (not deployed)

Noindex legal pages, redirects and 404 pages are intentionally excluded.
Tool sitemaps contain reciprocal language alternatives plus English x-default.
All generators use `site` from Astro config, XML escaping and readable indentation.
XML needs no visual stylesheet for Google. In a static deployment, nginx/Apache
controls HTTP Content-Type; the endpoint headers alone do not configure hosting.
Serve `.xml` as `application/xml` (or `text/xml`), not as an HTML fallback.

## Local verification

Build each project with `npm run build`, then from the repository root:

```bash
python3 scripts/check-sitemaps.py
node --experimental-strip-types --test scripts/sitemap-response.test.mjs
```

## Live findings, 6 October 2026

- Timer and Clock: HTTP 200, application/xml, well-formed XML, no redirects;
  also reachable with a Googlebot User-Agent from this environment. This does
  not prove access from Google's network or establish Search Console's failure.
- Company: `/sitemap.xml` returned 404, robots.txt disallowed all crawling.
  Local project now generates a sitemap and allows crawling at user's request.
- Stopwatch: HTTPS certificate hostname mismatch; fix the certificate in hosting
  (e.g. Plesk certificate/Let's Encrypt for stopwatch.jacktools.net).

No hosting changes or deployment were performed. Upload the new builds, check
HTTP 200 and HTTPS certificates, then use Search Console's URL Inspection live
fetch and resubmit each sitemap under its matching property. If Timer still
fails, inspect the expanded sitemap error, last-read time and hosting access/error
logs; a successful browser fetch is not evidence of a successful Google fetch.

Official guidance:
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=de
- https://support.google.com/webmasters/answer/7451001?hl=de
