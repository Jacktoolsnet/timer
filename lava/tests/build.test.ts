import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('localized pages and domain-specific SEO',()=>{
 for(const lang of ['de','en','es','fr']){
  const html=readFileSync(new URL('../dist/'+lang+'/index.html',import.meta.url),'utf8');
  assert.ok(html.includes('https://lava.jacktools.net/'+lang+'/'));
  assert.ok(!/<link[^>]+rel="canonical"[^>]+href="https:\/\/relax\.jacktools\.net/.test(html));
 }
 const sitemap=readFileSync(new URL('../dist/sitemap.xml',import.meta.url),'utf8');
 assert.equal((sitemap.match(/<loc>/g)||[]).length,4);
});
test('application schema matches visible facts in all languages',()=>{
 for(const lang of ['de','en','es','fr']){
  const html=readFileSync(new URL('../dist/'+lang+'/index.html',import.meta.url),'utf8');
  const match=html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s);
  assert.ok(match);
  const app=JSON.parse(match[1]);
  assert.equal(app['@type'],'WebApplication');
  assert.equal(app.applicationCategory,'LifestyleApplication');
  assert.equal(app.inLanguage,lang);
  assert.equal(app.url,'https://lava.jacktools.net/'+lang+'/');
  assert.ok(html.includes(app.name));
  assert.ok(html.includes(app.description));
  for(const feature of app.featureList)assert.ok(html.includes(feature));
  assert.ok(!html.includes('S L O W'));
 }
});
test('usage guidance covers current controls in German and English',()=>{
 for(const [lang,terms] of [
  ['de',['Vorlagen','Zähigkeit','Berührungsaktion','Endlose Verwandlung','Blasentöne','Lautstärke','Fokusansicht','Speicherung']],
  ['en',['Presets','Viscosity','Touch interaction','Endless transformation','Bubble sounds','Volume','Focus view','Preferences']]
 ] as const){
  const html=readFileSync(new URL('../dist/'+lang+'/usage/index.html',import.meta.url),'utf8');
  assert.ok(html.includes('noindex, follow'));
  for(const term of terms)assert.ok(html.toLowerCase().includes(term.toLowerCase()),term);
  assert.ok(html.includes('2026'));
 }
});
