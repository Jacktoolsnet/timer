import { test, expect } from '@playwright/test';
test('session, focus, patterns and consent',async({page})=>{
 const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await page.locator('#start').click(); await expect(page.locator('#phase')).toHaveText('Einatmen');
 await page.locator('#start').click(); await expect(page.locator('#phase')).toHaveText('Pausiert');
 await page.locator('#reset').click(); await expect(page.locator('#start')).toHaveText('Starten');
 await page.locator('#focus').click(); await expect(page.locator('body')).toHaveClass(/focus-view/);
 await page.locator('#focus').click(); await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 await page.locator('#preset').selectOption('gentle');
 await expect(page.locator('#duration-1')).toHaveValue('0'); await expect(page.locator('#duration-2')).toHaveValue('6');
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.breathe.settings.v1'))).toBeNull();
 await page.locator('#palette-dropdown summary').click(); await page.locator('#remember-preferences').check();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.breathe.settings.v1')!).preset)).toBe('gentle');
 await page.reload(); await expect(page.locator('#preset')).toHaveValue('gentle');
 await page.locator('#palette-dropdown summary').click(); await page.locator('#remember-preferences').uncheck();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.breathe.settings.v1'))).toBeNull();
 expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('skips zero holds and pauses in background',async({page})=>{
 await page.goto('/en/');
 await page.locator('#preset').selectOption('balanced');
 await page.locator('#duration-0').fill('1'); await page.locator('#duration-0').dispatchEvent('change');
 await page.locator('#start').click(); await expect(page.locator('#phase')).toHaveText('Breathe out',{timeout:4000});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#phase')).toHaveText('Paused');
});
