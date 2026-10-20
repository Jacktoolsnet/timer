# Languages for usage guidance

Decision, 20 October 2026: usage guidance is available in German, English,
Spanish and French for every tool. Privacy notices and legal notices remain
German/English only. Spanish/French legal links explicitly point to English.

Tools: Timer (including Pomodoro and intervals), Clock, Stopwatch, Calculator,
Breathe, Relax, SceneScript and Lava. Calculator already had four-language
usage guidance and keeps its existing detailed content.

The existing DE/EN pages are preserved in each tool's
src/components/usage/Original.astro. New ES/FR content lives in
shared/usage-translations.ts, rendered by shared/UsageTranslation.astro.
shared/UsageLanguageNav.astro provides document navigation in all four languages.
Breathe and Relax reuse the existing translated safety dictionaries as well.
Update all language versions when controls or limitations change.

Usage pages retain noindex and remain excluded from sitemaps. Their canonical
URLs and hreflang links use /{language}/usage/. The legal layout flag controls
presentation; only privacy/legal documents restrict language alternatives to
German and English. No privacy/legal translations or hosting changes were made.

After building all eight tools:
  python3 scripts/check-usage-locales.py
  cd timer
  npm run test:e2e -- --config playwright.usage.config.ts

The checks cover 32 built usage pages and 32 desktop/mobile browser tests.
They verify language, content, document navigation, footer links, language-menu
navigation, noindex, hreflang, and the unchanged legal-language policy.
