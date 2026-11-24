import {test,expect} from '@playwright/test';
import {getBlogPath,getBlogPost} from '../src/lib/blog';
for(const lang of ['de','en','es','fr'] as const) {
 test(`${lang}: clock update links, original SVG diagrams and calculation details`,async({page})=>{
  await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));
  await page.goto(`/${lang}/blog/`);
  await page.locator(`.blog-post-card[href="${getBlogPath(lang,'clock')}"]`).click();
  await expect(page).toHaveURL(new RegExp(getBlogPath(lang,'clock')+'$'));
  await expect(page.locator('h1')).toHaveText(getBlogPost(lang,'clock').title);
  await expect(page.locator('.article-body section').last()).toHaveAttribute('id','try');
  await expect(page.locator('#orbit')).toHaveCount(0);
  await expect(page.locator('.article-cover img')).toHaveCount(1);
  await expect(page.locator('.article-diagram')).toHaveCount(0);
  await expect(page.locator('#sun')).toContainText('SunCalc');
  await expect(page.locator('#shadow')).toContainText('L = H / tan(α)');
  await expect(page.locator('.article-body section')).toHaveCount(4);
  for(const img of await page.locator('.article-cover img, .article-diagram img').all()) {
   await img.scrollIntoViewIfNeeded();
   await expect(img).toHaveAttribute('src',new RegExp(`-${lang}\\.svg$`));
   await expect(img).not.toHaveAttribute('alt','');
   await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  }
  await expect(page.locator(`.article-body a[href="https://clock.jacktools.net/${lang}/"]`)).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}

test('clock article no longer references screenshots while the tool gallery keeps them',async({request})=>{
 for(const lang of ['de','en','es','fr']){
  const response=await request.get(getBlogPath(lang as 'de'|'en'|'es'|'fr','clock'));
  const html=await response.text();expect(html).not.toContain('/images/galleries/clock/');expect(html).not.toContain('/images/blog/clock/orbit-');
  for(const kind of ['sundial']){
   const graphic=await request.get(`/images/blog/clock/${kind}-${lang}.svg`);
   expect(graphic.ok()).toBe(true);const svg=await graphic.text();
   expect(svg).toContain('<title');expect(svg).toContain('<desc');expect(svg).not.toMatch(/<script|<image/);
  }
 }
 expect((await request.get('/images/galleries/clock/10.png')).ok()).toBe(true);
});
