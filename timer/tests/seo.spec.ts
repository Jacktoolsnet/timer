import {test,expect} from '@playwright/test';
import {getDictionary} from '../src/lib/i18n';
import {toolSeo} from '../../shared/seo';
for(const lang of ['de','en','es','fr'] as const){
 for(const [route,tool] of [['','countdown'],['pomodoro/','pomodoro'],['training/','interval']] as const){
  test(`descriptive title survives initial client render: ${lang}/${route}`,async({page})=>{
   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   const seo=toolSeo[tool][lang];
   await page.goto(`/${lang}/${route}`);
   const start=page.locator('#start, #training-start');
   await expect(start).toBeEnabled();
   await expect(page).toHaveTitle(`${seo.title} · Jacktools`);
   await expect(page.locator('h1')).toHaveText(seo.heading);
   await expect(page.locator('.intro-copy')).toHaveText(seo.description);
   await expect(page.locator('meta[name=description]')).toHaveAttribute('content',seo.description);
   await start.click();
   await expect(start).toHaveAttribute('aria-label',getDictionary(lang).pause);
   await expect(page).not.toHaveTitle(`${seo.title} · Jacktools`);
   await page.locator('#reset, #training-reset').click();
   await expect(page).toHaveTitle(`${seo.title} · Jacktools`);
   expect(errors).toEqual([]);
  });
 }
}
