import {test,expect} from '@playwright/test';
import {localizedGuides} from '../src/lib/guide-copy';
for(const [lang,binary] of [['de','binär'],['en','binary'],['es','binario'],['fr','binaire']] as const){
 test(`${lang}: clock marketing and guide describe current capabilities`,async({page})=>{
  await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));
  await page.goto(`/${lang}/`);
  expect((await page.locator('#online-uhr .product-copy').innerText()).toLowerCase()).toContain(binary);
  const guide=localizedGuides(lang).find(g=>g.slug==='clock')!;
  await page.goto(`/${lang}/tools/clock/`);
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content',guide.description);
  expect(guide.description.toLowerCase()).toContain(binary);
  await expect(page.locator('#streamen')).toContainText('clock.jacktools.net/stream');
  await expect(page.locator('#streamen ol li')).toHaveCount(4);
  await expect(page.locator('#streamen a')).toHaveAttribute('href', 'https://clock.jacktools.net/'+lang+'/stream/');
  await expect(page.locator('.guide-toc a[href="#streamen"]')).toBeVisible();
  await expect(page.locator('#binaeruhr')).toContainText('BCD');
  await expect(page.locator('#binaeruhr')).toContainText('1 + 4');
  for(const section of guide.sections)for(const paragraph of section.paragraphs)await expect(page.locator('#'+section.id)).toContainText(paragraph);
  const schemas=await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>nodes.flatMap(n=>{const value=JSON.parse(n.textContent!);return value['@graph']??[value];}));
  expect(schemas.some(s=>s['@type']==='WebPage'||s['@type']==='Article')).toBe(true);
 });
}
