import {test,expect} from '@playwright/test';
import {getBlogPath,getBlogPost} from '../src/lib/blog';
for(const lang of ['de','en','es','fr'] as const) {
 test(`${lang}: clock update links, real screenshots and calculation details`,async({page})=>{
  await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));
  await page.goto(`/${lang}/`);
  await page.locator('.blog-home .blog-post-card').click();
  await expect(page).toHaveURL(new RegExp(getBlogPath(lang,'clock')+'$'));
  await expect(page.locator('h1')).toHaveText(getBlogPost(lang,'clock').title);
  await expect(page.locator('.article-body section').last()).toHaveAttribute('id','orbit');
  await expect(page.locator('#orbit p')).toHaveCount(2);
  await expect(page.locator('#sun')).toContainText('SunCalc');
  await expect(page.locator('#shadow')).toContainText('L = H / tan(α)');
  await expect(page.locator('.article-body section')).toHaveCount(5);
  for(const img of await page.locator('.article-cover img, .article-diagram img').all()) {
   await img.scrollIntoViewIfNeeded();
   await expect(img).not.toHaveAttribute('alt','');
   await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  }
  await expect(page.locator(`.article-body a[href="https://clock.jacktools.net/${lang}/"]`)).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
