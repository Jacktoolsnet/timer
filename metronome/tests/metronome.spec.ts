import {test,expect} from '@playwright/test';
test('instrument, practice, persistence and focus',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/de/');
 await expect(page.locator('h1')).toHaveText('Finde deinen Rhythmus.');
 await expect(page.locator('#beat-buttons button')).toHaveCount(4);
 await expect(page.locator('#beat-buttons button').first()).toHaveAttribute('aria-label','Schlag 1: Betont');
 await page.locator('#beat-buttons button').first().click();
 await expect(page.locator('#beat-buttons button').first()).toHaveAttribute('aria-label','Schlag 1: Normal');
 await page.locator('#bpm').fill('180');await page.locator('#bpm').press('Tab');
 await expect(page.locator('#tempo-range')).toHaveValue('180');
 await page.locator('#start').click();await expect(page.locator('#start')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#bar-label')).not.toHaveText('Takt 1',{timeout:5000});
 await page.locator('[data-view="pendulum"]').first().click();
 await expect(page.locator('.pendulum-art')).toBeVisible();
 await page.locator('#focus').click();await expect(page.locator('.site-header')).not.toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.site-header')).toBeVisible();
 await page.locator('#start').click();await expect(page.locator('#start')).toHaveAttribute('aria-pressed','false');
 await page.locator('.practice-panel summary').click();await page.locator('#gap').check();
 await expect(page.locator('.gap-options')).toBeVisible();
 await page.locator('#audible-bars').fill('1');await page.locator('#audible-bars').press('Tab');
 await page.locator('#beats').selectOption('1');await page.locator('#hide-gap').check();
 await page.locator('#start').click();await expect(page.locator('.instrument-stage')).toHaveClass(/gap-hidden/,{timeout:4000});
 await page.locator('#start').click();
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('jacktools.metronome')))).toEqual([]);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.metronome.settings.v1'))).toContain('180');
 await page.reload();await expect(page.locator('#bpm')).toHaveValue('180');await expect(page.locator('#start')).toHaveAttribute('aria-pressed','false');
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').uncheck();
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('jacktools.metronome')))).toEqual([]);
 expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('tap, keyboard, reduced motion, localization and documents',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/en/');
 await page.keyboard.press('t');await page.waitForTimeout(500);await page.keyboard.press('t');
 expect(Number(await page.locator('#bpm').inputValue())).toBeGreaterThan(95);
 await page.keyboard.press('Space');await expect(page.locator('#start')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.instrument-stage')).toHaveClass(/reduced/);
 await page.keyboard.press('Space');await expect(page.locator('#start')).toHaveAttribute('aria-pressed','false');
 for(const lang of ['de','en','es','fr']){
  await page.goto('/'+lang+'/');await expect(page.locator('html')).toHaveAttribute('lang',lang);
  const response=await page.goto('/'+lang+'/usage/');expect(response?.status()).toBe(200);
 }
 for(const path of ['/de/privacy/','/en/legal/','/sitemap.xml','/robots.txt'])expect((await page.goto(path))?.status()).toBe(200);
});
test('audio uses clock-scheduled subdivisions and stops on inactivity',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).scheduled=[];
  const create=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){
   const osc=create.call(this),start=osc.start.bind(osc);
   osc.start=(when=0)=>{(window as any).scheduled.push(when);start(when);};return osc;
  };
 });
 await page.goto('/en/');await page.locator('.practice-panel summary').click();await page.locator('#subdivision').selectOption('2');
 await page.locator('#start').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).scheduled.length)).toBeGreaterThan(3);
 const clicks:number[]=await page.evaluate(()=>(window as any).scheduled);
 for(let i=1;i<clicks.length;i++)expect(clicks[i]-clicks[i-1]).toBeCloseTo(1/3,5);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#start')).toHaveAttribute('aria-pressed','false');
 const length=await page.evaluate(()=>(window as any).scheduled.length);await page.waitForTimeout(400);
 expect(await page.evaluate(()=>(window as any).scheduled.length)).toBe(length);
});
test('narrow screen with enlarged text stays within viewport',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.goto('/de/');
 await page.evaluate(()=>document.documentElement.dataset.fontSize='3');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#palette-dropdown summary').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
