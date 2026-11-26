import { test, expect } from '@playwright/test';

for (const [lang, orbit, sundial, binary] of [
 ['de', 'Orbit-Uhr', 'Sonnenuhr', 'binär'],
 ['en', 'orbit', 'sundial', 'binary'],
 ['es', 'orbital', 'solar', 'binario'],
 ['fr', 'orbitale', 'solaire', 'binaire'],
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
  expect(description?.toLowerCase()).toContain(binary);
  expect(app.featureList.join(' ').toLowerCase()).toContain(binary);
  const streaming={de:'streamen',en:'stream',es:'transmite',fr:'diffusez'}[lang]!;
  expect(description?.toLowerCase()).toContain(streaming);
  expect(app.featureList.join(' ')).toContain('QR');
  expect(html).toContain('clock.jacktools.net/stream');
  expect(html).not.toContain('The clock neither stores nor transmits coordinates.');
  expect(html).toContain('BCD');
  expect(html).toContain('class="faq"');
 });
}

test('stream pairing pages remain outside the search index in all languages',async({request})=>{
 for(const lang of ['de','en','es','fr']){
  const response=await request.get('/'+lang+'/stream/');
  expect(response.ok()).toBe(true);
  expect(await response.text()).toMatch(/<meta name="robots" content="noindex/);
 }
});
