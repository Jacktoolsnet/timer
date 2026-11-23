import {test,expect} from '@playwright/test';
for(const lang of ['de','en','es','fr']) {
 test(`${lang}: homepage tool names do not repeat online`,async({page})=>{
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
  await page.goto(`/${lang}/`);
  for(const heading of await page.locator('h1, #tools h2, #tools h3').all()) {
   await expect(heading).not.toContainText(/online|en ligne|en línea/i);
  }
  await expect(page.locator('#online-uhr .tool-open')).toHaveAttribute('href',`https://clock.jacktools.net/${lang}/`);
  await expect(page.locator('#online-timer')).toBeAttached();
  await expect(page.locator('#online-metronom')).toBeAttached();
 });
}
