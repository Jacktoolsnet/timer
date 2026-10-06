import {test,expect,type Page} from '@playwright/test';
import {dictionaries} from '../src/lib/breathe-i18n';
const KEY='jacktools.breathe.settings.v1';
async function begin(page:Page) {
 await page.locator('#start').click();
 await expect(page.locator('#first-start-dialog')).toBeVisible();
 await page.locator('#safety-continue').click();
}
for(const lang of ['de','en','es','fr'] as const) {
 test(lang+' safety guidance and ending in normal/focus views',async({page})=>{
  const t=dictionaries[lang];
  await page.setViewportSize({width:320,height:740});
  await page.goto('/'+lang+'/');
  await page.locator('#start').click();
  await expect(page.locator('#first-start-dialog')).toBeVisible();
  await expect(page.locator('#first-start-dialog')).toContainText(t.safePlace);
  await expect(page.locator('#first-start-dialog input')).toHaveCount(0);
  await expect(page.locator('#phase')).toHaveText(t.ready);
  await page.keyboard.press('Escape');
  await expect(page.locator('#first-start-dialog')).not.toBeVisible();
  await expect(page.locator('#start')).toBeFocused();
  await begin(page);
  await expect(page.locator('#start')).toHaveAttribute('aria-label',t.pause);
  await expect(page.locator('.breath-safety')).toContainText(t.reminder);
  await page.locator('#end-session').click();
  await expect(page.locator('#session-status')).toHaveText(t.natural);
  await expect(page.locator('#count')).toHaveText('–');
  await page.locator('#focus').click();
  await page.locator('#start').click();
  await expect(page.locator('#first-start-dialog')).not.toBeVisible();
  await expect(page.locator('#end-session')).toBeVisible();
  await page.locator('#safety-open').click();
  await expect(page.locator('#safety-dialog')).toBeVisible();
  await expect(page.locator('#safety-dialog')).toContainText('112');
  await expect(page.locator('#safety-dialog li')).toHaveCount(6);
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveClass(/focus-view/);
  await expect(page.locator('#start')).toHaveAttribute('aria-label',t.resume);
  await page.locator('#end-session').click();
  await expect(page.locator('#session-status')).toHaveText(t.natural);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
test('first-use status persists only with existing storage consent',async({page})=>{
 await page.goto('/en/'); await begin(page); await page.locator('#end-session').click();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.breathe.settings.v1'))).toBeNull();
 await page.reload(); await begin(page); await page.locator('#end-session').click();
 await page.locator('#palette-dropdown summary').click(); await page.locator('#remember-preferences').check();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).safetySeen,KEY)).toBe(true);
 await page.reload(); await page.locator('#start').click();
 await expect(page.locator('#first-start-dialog')).not.toBeVisible();
 await expect(page.locator('#phase')).toHaveText('Breathe in');
 await page.locator('#end-session').click();
 await page.locator('#palette-dropdown summary').click(); await page.locator('#remember-preferences').uncheck();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 await page.reload(); await page.locator('#start').click();
 await expect(page.locator('#first-start-dialog')).toBeVisible();
});
test('hold skipping, count tempo and background pause remain synchronous',async({page})=>{
 await page.goto('/en/');
 await page.locator('#duration-0').fill('1'); await page.locator('#duration-0').dispatchEvent('change');
 await page.locator('#count-seconds').fill('0.5'); await page.locator('#count-seconds').dispatchEvent('change');
 await begin(page); await expect(page.locator('#skip-hold')).toBeVisible({timeout:2000});
 await expect(page.locator('#tile-phase')).toHaveText('Hold');
 await page.locator('#skip-hold').click();
 await expect(page.locator('#tile-phase')).toHaveText('Breathe out');
 await expect(page.locator('#skip-hold')).toBeHidden();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#phase')).toHaveText('Paused');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#start')).toHaveAttribute('aria-label','Resume');
 await page.locator('#start').click(); await expect(page.locator('#start')).toHaveAttribute('aria-label','Pause');
 await page.locator('#end-session').click();
 await page.locator('#preset-picker summary').click(); await page.locator('[name=breathing-preset][value=balanced]').check();
 await expect(page.locator('#holds-hint')).toBeHidden();
 await page.locator('#duration-1').fill('0'); await page.locator('#duration-1').dispatchEvent('change');
 await expect(page.locator('#duration-1')).toHaveValue('0');
});
test('ending stops all audio and animation, including in landscape focus',async({page})=>{
 await page.addInitScript(()=>{
  const original=AudioContext.prototype.createGain, meters:AnalyserNode[]=[];
  (window as unknown as {meters:AnalyserNode[]}).meters=meters;
  AudioContext.prototype.createGain=function(){const gain=original.call(this),meter=this.createAnalyser();gain.connect(meter);meters.push(meter);return gain;};
 });
 await page.setViewportSize({width:740,height:360});
 await page.goto('/en/');
 await page.locator('#sound').check(); await page.locator('#chime').check();
 await page.locator('#focus').click(); await begin(page);
 await expect.poll(()=>page.evaluate(()=>{
  return (window as unknown as {meters:AnalyserNode[]}).meters.some(m=>{
   const data=new Float32Array(m.fftSize);m.getFloatTimeDomainData(data);return data.some(n=>Math.abs(n)>.005);
  });
 })).toBe(true);
 await page.locator('#end-session').click();
 await expect.poll(()=>page.evaluate(()=>{
  return (window as unknown as {meters:AnalyserNode[]}).meters.every(m=>{
   const data=new Float32Array(m.fftSize);m.getFloatTimeDomainData(data);return data.every(n=>Math.abs(n)<.0001);
  });
 })).toBe(true);
 const transform=await page.locator('#breath-circle').getAttribute('style');
 await page.waitForTimeout(600);
 expect(await page.locator('#breath-circle').getAttribute('style')).toBe(transform);
 await expect(page.locator('#count')).toHaveText('–');
 await expect(page.locator('#session-status')).toHaveText(dictionaries.en.natural);
 await expect(page.locator('#safety-open')).toBeVisible();
 for(const id of ['end-session','safety-open']) {
  const box=await page.locator('#'+id).boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y+box!.height).toBeLessThanOrEqual(360);
 }
});
test('automatic completion is neutral and stops the session',async({page})=>{
 // Shift the session clock after start without waiting a full minute.
 await page.addInitScript(()=>{
  const original=performance.now.bind(performance);
  (window as unknown as {clockOffset:number}).clockOffset=0;
  performance.now=()=>original()+(window as unknown as {clockOffset:number}).clockOffset;
 });
 await page.goto('/en/'); await page.locator('#minutes').fill('1'); await page.locator('#minutes').dispatchEvent('change');
 await begin(page);
 await page.evaluate(()=>{(window as unknown as {clockOffset:number}).clockOffset=61000;});
 await expect(page.locator('#session-status')).toHaveText(dictionaries.en.natural);
 await expect(page.locator('#count')).toHaveText('–');
 await expect(page.locator('#end-session')).toBeDisabled();
 await expect(page.locator('#session-progress')).toHaveAttribute('aria-valuenow','60');
});
test('focus requests fullscreen and follows browser exit',async({page})=>{
 await page.goto('/en/'); await page.locator('#focus').click();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement === document.documentElement)).toBe(true);
 await page.locator('#focus').click();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement === null)).toBe(true);
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 await page.locator('#focus').click();
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 await page.evaluate(()=>document.exitFullscreen());
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);
});
test('focus stays usable if fullscreen is denied',async({page})=>{
 await page.addInitScript(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Denied'));});
 await page.goto('/en/'); await page.locator('#focus').click();
 await expect(page.locator('body')).toHaveClass(/focus-view/);
 await page.locator('#safety-open').click(); await expect(page.locator('#safety-dialog')).toBeVisible();
 await page.keyboard.press('Escape'); await expect(page.locator('body')).toHaveClass(/focus-view/);
 await page.locator('#focus').click(); await expect(page.locator('body')).not.toHaveClass(/focus-view/);
});
