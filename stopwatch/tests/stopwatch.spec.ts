import {test,expect} from '@playwright/test';
test('timing, laps, pause, reset and focus',async({page})=>{
 await page.goto('/de/'); await page.locator('#toggle-timing').click(); await page.waitForTimeout(150);
 await expect(page.locator('#elapsed')).not.toHaveText('00:00:00.00'); await page.locator('#lap').click(); await expect(page.locator('#laps-body tr')).toHaveCount(1);
 await expect(page.locator('#reset-timing')).toBeDisabled(); await page.locator('#toggle-timing').click(); const paused=await page.locator('#elapsed').textContent(); await page.waitForTimeout(120);await expect(page.locator('#elapsed')).toHaveText(paused!);
 await page.locator('#toggle-timing').click();await page.locator('#lap').click();await expect(page.locator('#laps-body tr')).toHaveCount(2);await page.locator('#toggle-timing').click();
 page.once('dialog',dialog=>dialog.accept()); await page.locator('#reset-timing').click();await expect(page.locator('#elapsed')).toHaveText('00:00:00.00');await expect(page.locator('#laps-table')).toBeHidden();
 await page.locator('#stopwatch-focus').click();await expect(page.locator('body')).toHaveClass(/focus-view/);await expect(page.locator('#toggle-timing')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('four languages and legal links',async({page})=>{for(const [lang,title] of [['de','Online-Stoppuhr'],['en','Online stopwatch'],['es','Cronómetro online'],['fr','Chronomètre en ligne']]){await page.goto('/'+lang+'/');await expect(page.locator('h1')).toHaveText(title);await expect(page.locator('#toggle-timing')).toBeEnabled();}await page.goto('/de/privacy/');await expect(page.locator('main')).toContainText('Die Webstatistik ist deaktiviert.');await expect(page.locator('main')).toContainText('Rundenzeiten');});
test('wake lock active only while running and privacy opt-in',async({page})=>{
 await page.addInitScript(()=>{(window as any).wakeRequests=0;(window as any).wakeReleases=0;Object.defineProperty(navigator,'wakeLock',{value:{request:async()=>{(window as any).wakeRequests++;const sentinel=new EventTarget();return Object.assign(sentinel,{release:async()=>{(window as any).wakeReleases++;sentinel.dispatchEvent(new Event('release'));}});}}});});
 await page.goto('/en/');await page.locator('#awake').check();expect(await page.evaluate(()=>localStorage.length)).toBe(0);expect(await page.evaluate(()=>(window as any).wakeRequests)).toBe(0);
 await page.locator('#toggle-timing').click();await expect(page.locator('#wake-status')).toContainText('Screen kept awake');expect(await page.evaluate(()=>(window as any).wakeRequests)).toBe(1);await page.locator('#toggle-timing').click();expect(await page.evaluate(()=>(window as any).wakeReleases)).toBe(1);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.stopwatch.settings.v1')!).awake)).toBe(true);
 await page.locator('#remember-preferences').uncheck();expect(await page.evaluate(()=>localStorage.length)).toBe(0);await expect(page.locator('#awake')).not.toBeChecked();
});
