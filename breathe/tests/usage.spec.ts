import {test,expect} from '@playwright/test';
for(const lang of ['de','en']) {
 test(lang+' usage notes include safety without a contents list',async({page})=>{
  await page.setViewportSize({width:320,height:740});
  await page.goto('/'+lang+'/usage/');
  await expect(page.locator('.legal-page h2')).toHaveCount(11);
  await expect(page.locator('.legal-page')).toContainText('112');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, follow');
  await expect(page.locator('.legal-page a[href^="#usage-"]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
