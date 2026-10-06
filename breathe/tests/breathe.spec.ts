import { test, expect } from '@playwright/test';
test('session, focus, patterns and consent',async({page})=>{
 const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await page.locator('#start').click(); await page.locator('#safety-continue').click(); await expect(page.locator('#phase')).toHaveText('Einatmen');
 await page.locator('#start').click(); await expect(page.locator('#phase')).toHaveText('Pausiert');
 await page.locator('#reset').click(); await expect(page.locator('#start')).toHaveAttribute('aria-label','Starten');
 await page.locator('#focus').click(); await expect(page.locator('body')).toHaveClass(/focus-view/);
 await page.locator('#focus').click(); await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 await page.locator('#preset-picker summary').click();
 await page.locator('[name=breathing-preset][value=gentle]').check();
 await expect(page.locator('#preset-selected')).toHaveText('Sanft · 4–6');
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
 await page.locator('#preset-picker summary').click();
 await page.locator('[name=breathing-preset][value=balanced]').check();
 await page.locator('#duration-0').fill('1'); await page.locator('#duration-0').dispatchEvent('change');
 await page.locator('#start').click(); await page.locator('#safety-continue').click(); await expect(page.locator('#phase')).toHaveText('Breathe out',{timeout:4000});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#phase')).toHaveText('Paused');
});
test('sound switch plays an audible preview without a volume slider',async({page})=>{
 await page.addInitScript(()=>{
  const original=AudioContext.prototype.createGain;
  const meters:AnalyserNode[]=[];
  (window as unknown as {soundMeters:AnalyserNode[]}).soundMeters=meters;
  AudioContext.prototype.createGain=function(){
   const gain=original.call(this), meter=this.createAnalyser();
   gain.connect(meter); meters.push(meter); return gain;
  };
 });
 await page.goto('/en/');
 await expect(page.locator('#volume')).toHaveCount(0);
 await expect(page.locator('#sound')).toBeChecked();
 await expect(page.locator('#chime')).toBeChecked();
 await page.locator('#sound').uncheck();
 await page.locator('#sound').check();
 await expect.poll(()=>page.evaluate(()=>{
  const meters=(window as unknown as {soundMeters:AnalyserNode[]}).soundMeters;
  return meters.some(meter=>{
   const samples=new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(samples);
   return samples.some(value=>Math.abs(value)>.01);
  });
 })).toBe(true);
 await page.locator('#sound').uncheck();
 await expect(page.locator('#audio-status')).toBeEmpty();
});
