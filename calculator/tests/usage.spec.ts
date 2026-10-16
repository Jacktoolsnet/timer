import {test,expect} from '@playwright/test';
const titles={de:'Nutzungshinweise',en:'Usage notes',es:'Indicaciones de uso',fr:'Conseils d’utilisation'};

test('usage notes are localized and linked in every supported language',async({page})=>{
 for(const [lang,title] of Object.entries(titles)){
  await page.goto('/'+lang+'/');const footer=page.locator('.site-footer a[href="/'+lang+'/usage/"]');await expect(footer).toHaveText(title);await footer.click();
  await expect(page).toHaveURL(new RegExp('/'+lang+'/usage/$'));await expect(page.getByRole('heading',{level:1})).toHaveText(title);await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, follow');
  await expect(page.locator('.usage-page>section')).toHaveCount(10);await expect(page.locator('.usage-contents a')).toHaveCount(10);
  for(const link of await page.locator('.usage-contents a').all()){const target=await link.getAttribute('href');await expect(page.locator(target!)).toHaveCount(1);}
  for(const language of Object.keys(titles)){
   await expect(page.locator('.legal-nav a[lang='+language+']')).toHaveAttribute('href','/'+language+'/usage/');
   await expect(page.locator('.language-menu a[lang='+language+']')).toHaveAttribute('href','/'+language+'/usage/');
   await expect(page.locator('link[rel=alternate][hreflang='+language+']')).toHaveAttribute('href','https://calculator.jacktools.net/'+language+'/usage/');
  }
 }
});

test('usage notes document current rounding, currency, storage and export behaviour',async({page})=>{
 await page.goto('/de/usage/');
 await expect(page.locator('section[aria-labelledby=logic]')).toContainText('240 und nicht 140');
 await expect(page.locator('section[aria-labelledby=editing]')).toContainText('vereinfachte Papierstreifen');
 await expect(page.locator('section[aria-labelledby=start]')).toContainText('Minustaste auf der Tastatur wählt Subtrahieren');
 await expect(page.locator('section[aria-labelledby=rounding]')).toContainText('0,99');
 await expect(page.locator('section[aria-labelledby=currency]')).toContainText('rechnet keine Beträge um');
 await expect(page.locator('section[aria-labelledby=saving]')).toContainText('Lokales Speichern ist deshalb kein Backup');
 await expect(page.locator('section[aria-labelledby=export]')).toContainText('nur aktive Schritte');await expect(page.locator('section[aria-labelledby=export]')).toContainText('auch deaktivierte Schritte mit Status');
 await expect(page.locator('section[aria-labelledby=export]')).toContainText('selbst an eine E-Mail anhängen');await expect(page.locator('#email,#email-dialog')).toHaveCount(0);
 await page.locator('.usage-contents a[href="#rounding"]').click();await expect(page).toHaveURL(/#rounding$/);await expect(page.locator('#rounding')).toBeInViewport();
});

test('usage notes remain readable on narrow screens and print as a standalone document',async({page})=>{
 await page.setViewportSize({width:320,height:844});
 for(const lang of Object.keys(titles)){
  await page.goto('/'+lang+'/usage/');await page.locator('html').evaluate(el=>{const root=el as HTMLElement;root.dataset.theme='dark';root.dataset.fontSize='3';root.dataset.style='technical';});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.setViewportSize({width:794,height:1123});await page.emulateMedia({media:'print'});
 await expect(page.locator('.usage-page')).toBeVisible();await expect(page.locator('.usage-page>section')).toHaveCount(10);await expect(page.locator('.usage-page>section').first()).toBeVisible();
 await expect(page.locator('.usage-contents')).toBeHidden();await expect(page.locator('.legal-nav')).toBeHidden();await expect(page.locator('.site-header')).toBeHidden();await expect(page.locator('.site-footer')).toBeHidden();
});
