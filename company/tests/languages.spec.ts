import {test,expect} from '@playwright/test';
const titles={de:'Online-Tools',en:'Online tools',es:'Herramientas online',fr:'Outils en ligne'};
test('company language tiles translate content, tool links and metadata',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 for(const [lang,heading] of Object.entries(titles)) {
  await page.goto('/'+lang+'/');
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.locator('h1')).toContainText(heading);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://jacktools.net/'+lang+'/');
  await expect(page.locator('link[rel=alternate][hreflang]')).toHaveCount(5);
  await expect(page.locator('#online-timer .tool-open')).toHaveAttribute('href','https://timer.jacktools.net/'+lang+'/');
  await page.locator('#palette-dropdown > summary').click();
  await expect(page.locator('.preferences-language a')).toHaveCount(4);
  await expect(page.locator('.preferences-language a[lang='+lang+']')).toHaveAttribute('aria-current','page');
  await page.locator('#font-size').fill('3');
  await page.locator('#preferences-close').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
test('switching languages preserves appearance after opt-in and keeps the section',async({page})=>{
 await page.goto('/de/#tools');
 await page.locator('#palette-dropdown > summary').click();
 await page.locator('#remember-preferences').check();
 await page.locator('#theme').click();
 await page.locator('.language-menu a[lang=fr]').click();
 await expect(page).toHaveURL(/\/fr\/#tools$/);
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.locator('#tools-heading')).toContainText('Outils en ligne');
});
test('browser-language entry uses English when the browser language is unsupported',async({browser,baseURL})=>{
 for(const [locale,target] of [['de-CH','de'],['en-US','en'],['es-MX','es'],['fr-CA','fr'],['it-IT','en']]) {
  const context=await browser.newContext({locale});const page=await context.newPage();
  await page.goto(baseURL+'/?from=test#tools');
  await expect(page).toHaveURL(baseURL+'/'+target+'/?from=test#tools');
  await page.goto(baseURL+'/de/');
  await expect(page.locator('html')).toHaveAttribute('lang','de');
  await context.close();
 }
});
test('company German legal originals stay accessible and correctly labelled',async({page})=>{
 await page.goto('/fr/');
 await expect(page.locator('.site-footer a[href="/impressum/"]')).toContainText('(DE)');
 await page.locator('.site-footer a[href="/impressum/"]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','de');
 await expect(page.locator('h1')).toHaveText('Impressum');
 await page.locator('#palette-dropdown > summary').click();
 await page.locator('.language-menu a[lang=en]').click();
 await expect(page).toHaveURL(/\/en\/$/);
});
