import {test,expect} from '@playwright/test';
import {toolGuides} from '../src/lib/tool-guides';

const guides = [{slug:'timer',name:'Timer',url:'https://timer.jacktools.net/de/timer/'},...toolGuides];
test.beforeEach(async({page})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,route=>route.fulfill({body:''}));
});
for(const guide of guides){
 test(`${guide.slug}: metadata, canonical variants, schema and crawlable links`,async({page,request})=>{
  // A request without a trailing slash must still identify the same canonical page.
  await page.goto(`/de/tools/${guide.slug}`);
  const url=`https://jacktools.net/de/tools/${guide.slug}/`;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',url);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content',url);
  await expect(page.locator('html')).toHaveAttribute('lang','de');
  await expect(page.locator('link[hreflang]')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  const description=await page.locator('meta[name="description"]').getAttribute('content');
  expect(description!.length).toBeGreaterThan(70);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content',description!);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content',description!);
  const graph=await page.locator('script[type="application/ld+json"]').evaluateAll(els=>els.flatMap(el=>JSON.parse(el.textContent!)['@graph']||[]));
  const webpage=graph.find(x=>x['@type']==='WebPage');
  const article=graph.find(x=>x['@type']==='Article');
  expect(webpage).toMatchObject({'@id':url,inLanguage:'de',mainEntity:{'@id':url+'#anleitung'}});
  expect(article).toMatchObject({about:{name:guide.name,url:guide.url},mainEntityOfPage:{'@id':url}});
  expect(article.headline.replace(/\s/g,'')).toBe((await page.locator('h1').textContent())!.replace(/\s/g,''));
  expect(graph.some(x=>x.aggregateRating||x.review||x.datePublished)).toBe(false);
  const image=await page.locator('meta[property="og:image"]').getAttribute('content');
  const project=guide.slug==='messagedrop'?'company':guide.slug;
  expect(image).toBe(`https://jacktools.net/social/${project}.png`);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content','JackTools.Net');
  expect((await request.get(new URL(image!).pathname)).ok()).toBe(true);
  expect((await request.get(new URL(article.image).pathname)).ok()).toBe(true);
  for(const related of guides.filter(g=>g.slug!==guide.slug)){
   await expect(page.locator(`.related-guides a[href="/de/tools/${related.slug}/"]`)).toHaveCount(1);
  }
  await page.goto(`/de/tools/${guide.slug}/`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',url);
 });
}
