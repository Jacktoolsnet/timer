import { test, expect } from '@playwright/test';

for (const [lang, orbit, sundial] of [
 ['de', 'Orbit-Uhr', 'Sonnenuhr'],
 ['en', 'orbit', 'sundial'],
 ['es', 'orbital', 'solar'],
 ['fr', 'orbitale', 'solaire'],
]) {
 test(`clock SEO includes new views in server-rendered ${lang} content`, async ({ request }) => {
  const response = await request.get(`/${lang}/`);
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  expect(description?.toLowerCase()).toContain(sundial.toLowerCase());
  expect(description?.toLowerCase()).toContain(lang === 'de' ? 'orbit' : orbit);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
   .map(match => JSON.parse(match[1]));
  const app = schemas.find(schema => schema['@type'] === 'WebApplication');
  expect(app).toBeTruthy();
  expect(app.inLanguage).toBe(lang);
  expect(app.featureList.join(' ').toLowerCase()).toContain(sundial.toLowerCase());
  expect(app.featureList.join(' ').toLowerCase()).toContain(orbit.toLowerCase());
  expect(html).toContain(`hreflang="${lang}"`);
  expect(html).toContain(`https://clock.jacktools.net/${lang}/`);
  expect(html).toContain('class="faq"');
 });
}
