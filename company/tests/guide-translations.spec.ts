import {test,expect} from '@playwright/test';
import {localizedGuides,guideTranslator} from '../src/lib/guide-copy';
import {languages} from '../src/lib/i18n';
import copy from '../src/lib/guide-copy.json' with { type: 'json' };
const slugs=['timer','clock','stopwatch','calculator','breathe','relax','metronome','messagedrop'];
test.beforeEach(async({page})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
});
test('all copy is complete and preserves interpolation placeholders',()=>{
 for(const [source,translations] of Object.entries(copy)){
  for(const lang of ['en','es','fr'] as const){
   expect(translations[lang].trim(),`${lang}: ${source}`).not.toBe('');
   expect(translations[lang].match(/\{\w+\}/g)||[]).toEqual(source.match(/\{\w+\}/g)||[]);
  }
 }
 expect(()=>guideTranslator('fr')('Unbekannter Text')).toThrow('Missing guide translation');
});
for(const lang of ['en','es','fr'] as const){
 test(`${lang}: homepage links to all eight localized guides`,async({page})=>{
  await page.goto(`/${lang}/`);
  await expect(page.locator('.timer-guide-link')).toHaveCount(8);
  for(const slug of slugs) await expect(page.locator(`.timer-guide-link[href="/${lang}/tools/${slug}/"]`)).toHaveCount(1);
 });
 for(const slug of slugs){
  test(`${lang}/${slug}: localized content, SEO, language links, gallery and print`,async({page})=>{
   const t=guideTranslator(lang);
   await page.goto(`/${lang}/tools/${slug}`);
   const canonical=`https://jacktools.net/${lang}/tools/${slug}/`;
   await expect(page.locator('html')).toHaveAttribute('lang',lang);
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',canonical);
   await expect(page.locator('h1')).toHaveCount(1);
   await expect(page.locator('link[hreflang]')).toHaveCount(5);
   for(const language of languages){
    const path=`/${language}/tools/${slug}/`;
    await expect(page.locator(`link[hreflang="${language}"]`)).toHaveAttribute('href',`https://jacktools.net${path}`);
    await expect(page.locator(`.language-menu a[lang="${language}"]`)).toHaveAttribute('href',new RegExp(path+'$'));
   }
   const article=page.locator('article.timer-guide, article.tool-guide');
   await expect(article).not.toContainText(/Weitere Tools kennenlernen|Häufige Fragen und wichtige Grenzen|Die Screenshots zeigen|Eigene Werte sind möglich/);
   await expect(page.locator('.related-guides h2')).toHaveText(t('Weitere Tools kennenlernen'));
   await expect(page.locator(`.related-guides a[href^="/${lang}/tools/"]`)).toHaveCount(7);
   await expect(article.locator('a[href^="/de/"]')).toHaveCount(0);
   await expect(article.locator('a[href*="jacktools.net/de/"]')).toHaveCount(0);
   const graph=await page.locator('script[type="application/ld+json"]').evaluateAll(els=>els.flatMap(el=>JSON.parse(el.textContent!)['@graph']||[]));
   const schema=graph.find(x=>x['@type']==='Article');
   expect(schema.inLanguage).toBe(lang);
   expect(schema.mainEntityOfPage['@id']).toBe(canonical);
   expect(schema.headline.replace(/\s/g,'')).toBe((await page.locator('h1').textContent())!.replace(/\s/g,''));
   if(slug!=='timer'){
    const guide=localizedGuides(lang).find(g=>g.slug===slug)!;
    await expect(page.locator('h1')).toHaveText(guide.title);
    for(const section of guide.sections){
     await expect(page.locator(`#${section.id} h2`)).toHaveText(section.title);
     for(const paragraph of section.paragraphs) await expect(page.locator(`#${section.id}`)).toContainText(paragraph);
    }
   }
   const thumbs=page.locator('.timer-gallery-thumb');
   await expect(thumbs).toHaveCount(slug==='timer'?14:slug==='clock'?10:8);
   await thumbs.last().click();
   await page.locator('.showcase-open').click();
   await expect(page.locator('#screenshot-gallery')).toBeVisible();
   await expect(page.locator('#gallery-image')).toHaveAttribute('alt',await thumbs.last().getAttribute('data-alt') as string);
   await page.keyboard.press('Escape');
   await expect(page.locator('#screenshot-gallery')).toBeHidden();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.emulateMedia({media:'print'});
   await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
   await expect(article.locator('details:not([open])')).toHaveCount(0);
   await expect(page.locator('.related-guides')).toBeHidden();
   await expect(page.locator('.timer-showcase')).toBeHidden();
  });
 }
}
test.describe('translated articles without JavaScript',()=>{
 test.use({javaScriptEnabled:false});
 test('all translations remain readable with working native links',async({page})=>{
  for(const lang of ['en','es','fr'] as const) for(const slug of slugs){
   await page.goto(`/${lang}/tools/${slug}/`);
   await expect(page.locator('h1')).toBeVisible();
   await expect(page.locator('article details')).toHaveCount(slug==='timer'?5:4);
   await expect(page.locator('.related-guides a')).toHaveCount(8);
   await expect(page.locator('.showcase-open')).toHaveAttribute('href',/\.(png|svg)$/);
  }
 });
});
