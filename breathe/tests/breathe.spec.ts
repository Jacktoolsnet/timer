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
test('touch steppers support counts, decimal pace and zero holds',async({page})=>{
 await page.goto('/de/');
 const up=page.locator('[data-step-target="duration-0"][data-step-direction="1"]');
 await up.click(); await expect(page.locator('#duration-0')).toHaveValue('5');
 await page.locator('[data-step-target="count-seconds"][data-step-direction="1"]').click();
 await expect(page.locator('#count-seconds')).toHaveValue('1.1');
 await page.locator('#duration-1').fill('1'); await page.locator('#duration-1').dispatchEvent('change');
 await page.locator('[data-step-target="duration-1"][data-step-direction="-1"]').click();
 await expect(page.locator('#duration-1')).toHaveValue('0');
 await page.locator('[data-step-target="duration-1"][data-step-direction="-1"]').click();
 await expect(page.locator('#duration-1')).toHaveValue('0');
 const box=await up.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('full-width breathing view and responsive grouped settings',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('.breathe-settings-tile')).toHaveCount(3);
 for(const width of [1440,900,390]){
  await page.setViewportSize({width,height:1000});
  const layout=await page.evaluate(()=>{
   const app=document.querySelector('#breathe-app')!.getBoundingClientRect();
   const stage=document.querySelector('.breath-card')!.getBoundingClientRect();
   const settings=document.querySelector('.breathe-settings')!.getBoundingClientRect();
   return {width:app.width,stage:stage.width,below:settings.top>=stage.bottom,
    columns:getComputedStyle(document.querySelector('.breathe-settings-grid')!).gridTemplateColumns.split(' ').length,
    overflow:document.documentElement.scrollWidth>innerWidth};
  });
  expect(Math.abs(layout.width-layout.stage)).toBeLessThan(2);
  expect(layout.below).toBe(true);
  expect(layout.columns).toBe(width===1440?3:width===900?2:1);
  expect(layout.overflow).toBe(false);
 }
});

test('polar background follows palette, supports focus and optional motion',async({page})=>{
 await page.goto('/de/');
 const card=page.locator('.breath-card');
 await expect(card).toHaveAttribute('data-background','none');
 await page.locator('#background-picker summary').click();
 await page.locator('[name=breath-background][value=polar]').check();
 await expect(card).toHaveAttribute('data-background','polar');
 await expect(page.locator('.breathe-polar-scene')).toBeVisible();
 await expect(page.locator('.polar-aurora-front')).toHaveCSS('animation-play-state','running');
 const before=await page.locator('.polar-light-top').first().evaluate(el=>getComputedStyle(el).stopColor);
 await page.getByLabel('Einstellungen',{exact:true}).click();
 await page.locator('[name=colorScheme][value=blue]').check();
 await page.locator('#preferences-close').click();
 expect(await page.locator('.polar-light-top').first().evaluate(el=>getComputedStyle(el).stopColor)).not.toBe(before);
 await page.locator('#background-motion').uncheck();
 await expect(page.locator('.polar-aurora-front')).toHaveCSS('animation-play-state','paused');
 await page.locator('#focus').click();
 await expect(page.locator('.breathe-polar-scene')).toBeVisible();
 await expect(page.locator('.breathe-settings')).toBeHidden();
 await page.screenshot({path:'/tmp/breathe-polar-'+test.info().project.name+'.png'});
 await page.locator('#focus').click();
 await page.locator('#background-picker summary').click();
 await page.locator('[name=breath-background][value=none]').check();
 await expect(page.locator('.breathe-polar-scene')).toBeHidden();
});

test('phase counter tile can be hidden independently of background and focus',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('.breath-caption')).toBeVisible();
 await page.locator('#show-caption').uncheck();
 await expect(page.locator('.breath-caption')).toBeHidden();
 await page.locator('#background-picker summary').click();
 await page.locator('[name=breath-background][value=polar]').check();
 await expect(page.locator('.breath-caption')).toBeHidden();
 await page.locator('#focus').click();
 await expect(page.locator('.breath-caption')).toBeHidden();
 await expect(page.locator('#breath-circle')).toBeVisible();
 await page.locator('#focus').click();
 await page.locator('#show-caption').check();
 await expect(page.locator('.breath-caption')).toBeVisible();
});

test('six nature landscapes can be selected and animated independently',async({page})=>{
 await page.goto('/de/');
 for(const scene of ['valley','beach','forest','lake','dunes','meadow']){
  await page.locator('#background-picker summary').click();
  await page.locator('[name=breath-background][value='+scene+']').check();
  await expect(page.locator('.breath-card')).toHaveAttribute('data-background',scene);
  await expect(page.locator('.breathe-nature-scene[data-scene='+scene+']')).toBeVisible();
  await expect(page.locator('.breathe-nature-scene:visible')).toHaveCount(1);
  await expect(page.locator('.breathe-polar-scene')).toBeHidden();
  await page.locator('.breath-card').screenshot({path:'/tmp/breathe-'+scene+'-'+test.info().project.name+'.png'});
 }
 await page.locator('#background-motion').uncheck();
 await expect(page.locator('[data-scene=meadow] .nature-cloud')).toHaveCSS('animation-play-state','paused');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#background-picker summary').click();
 await page.locator('[name=breath-background][value=none]').check();
 await expect(page.locator('.breathe-nature-scene:visible')).toHaveCount(0);
});

test('window candle has flame and wax animations that can be disabled',async({page})=>{
 await page.goto('/de/');
 await page.locator('#background-picker summary').click();
 await page.locator('[name=breath-background][value=candle]').check();
 await expect(page.locator('.breathe-candle-scene')).toBeVisible();
 await expect(page.locator('.candle-flame')).toHaveCSS('animation-play-state','running');
 await expect(page.locator('.candle-wax-drop')).toHaveCSS('animation-play-state','running');
 await page.locator('.breath-card').screenshot({path:'/tmp/breathe-candle-'+test.info().project.name+'.png'});
 await page.locator('#background-motion').uncheck();
 await expect(page.locator('.candle-flame')).toHaveCSS('animation-play-state','paused');
 await expect(page.locator('.candle-wax-drop')).toHaveCSS('animation-play-state','paused');
 await page.locator('#focus').click();
 await expect(page.locator('.candle-object')).toBeVisible();
 await page.locator('#focus').click();
 await page.locator('#background-picker summary').click();
 await page.locator('[name=breath-background][value=none]').check();
 await expect(page.locator('.breathe-candle-scene')).toBeHidden();
});
