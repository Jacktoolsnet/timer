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
 await page.locator('#gap').check();
 await expect(page.locator('.gap-options')).toBeVisible();
 await page.locator('#audible-bars').fill('1');await page.locator('#audible-bars').press('Tab');
 await page.locator('#beats').fill('1');await page.locator('#beats').press('Tab');await page.locator('#hide-gap').check();
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
 await page.goto('/en/');await page.locator('#trigger-subdivision').click();await page.locator('#options-subdivision [role=option]').nth(1).click();
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
test('pendulum readout stays inside its body',async({page})=>{
 await page.goto('/de/');await page.locator('button[data-view="pendulum"]').click();
 const body=await page.locator('.pendulum-case').boundingBox();
 const readout=await page.locator('.beat-readout').boundingBox();
 expect(body).not.toBeNull();expect(readout).not.toBeNull();
 expect(readout!.x).toBeGreaterThan(body!.x);
 expect(readout!.y).toBeGreaterThan(body!.y);
 expect(readout!.x+readout!.width).toBeLessThan(body!.x+body!.width);
 expect(readout!.y+readout!.height).toBeLessThan(body!.y+body!.height);
 await expect(page.locator('#current-beat')).toBeVisible();await expect(page.locator('#bar-label')).toBeVisible();
});

test('pendulum tiles flank the pivot without covering it',async({page})=>{
 await page.goto('/de/');await page.locator('button[data-view="pendulum"]').click();
 const pivot=await page.locator('#pendulum-arm circle').boundingBox();
 const left=await page.locator('.beat-tile').boundingBox();const right=await page.locator('#bar-label').boundingBox();
 expect(left!.x+left!.width).toBeLessThan(pivot!.x);
 expect(right!.x).toBeGreaterThan(pivot!.x+pivot!.width);
 for(const tile of [left!,right!]){expect(tile.y).toBeLessThan(pivot!.y);expect(tile.y+tile.height).toBeGreaterThan(pivot!.y+pivot!.height);}
});
test('beat and bar numerals use a consistent monospace font',async({page})=>{
 await page.goto('/de/');
 for(const view of ['orbit','pendulum']){
  await page.locator(`button[data-view="${view}"]`).click();
  const style=await page.locator('#current-beat').evaluate(el=>{
   const css=getComputedStyle(el);return {font:css.fontFamily,variant:css.fontVariantNumeric};
  });
  expect(style.font).toContain('monospace');expect(style.variant).toContain('lining-nums');expect(style.variant).toContain('tabular-nums');
  if(view==='pendulum')expect(await page.locator('#current-bar').evaluate(el=>getComputedStyle(el).fontFamily)).toBe(style.font);
 }
});
test('normal card matches the clock workspace width without enlarging the instrument',async({page})=>{
 await page.setViewportSize({width:1440,height:1100});await page.goto('/de/');
 const card=await page.locator('.metronome-card').boundingBox();
 const stage=await page.locator('.instrument-stage').boundingBox();
 expect(card!.width).toBe(1000);expect(stage!.width).toBe(350);
 expect(stage!.x+stage!.width/2).toBeCloseTo(card!.x+card!.width/2,0);
});
test('settings are separate, grouped responsively and hidden in focus view',async({page})=>{
 await page.goto('/de/');
 const card=await page.locator('.metronome-card').boundingBox();const settings=await page.locator('.metronome-settings-card').boundingBox();
 expect(settings!.y).toBeGreaterThan(card!.y+card!.height);expect(settings!.width).toBe(card!.width);
 await expect(page.locator('.metronome-settings-group')).toHaveCount(3);
 const groups=await page.locator('.metronome-settings-group').all();
 const a=await groups[0].boundingBox(),b=await groups[1].boundingBox();
 if(page.viewportSize()!.width>=1000){expect(b!.x).toBeGreaterThan(a!.x);expect(b!.y).toBeCloseTo(a!.y,0);}
 else if(page.viewportSize()!.width<700)expect(b!.y).toBeGreaterThan(a!.y+a!.height);
 await expect(page.locator('#gap')).toBeVisible();await page.locator('#gap').check();await expect(page.locator('#audible-bars')).toBeVisible();
 await page.locator('#focus').click();await expect(page.locator('.metronome-settings-card')).not.toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.metronome-settings-card')).toBeVisible();
});

test('styled dropdown lists support keyboard selection, dismissal and synchronized state',async({page})=>{
 await page.goto('/de/');
 const trigger=page.locator('#trigger-subdivision'),options=page.locator('#options-subdivision');
 await trigger.click();await expect(options).toBeVisible();await expect(options.locator('[aria-selected=true]')).toContainText('Grundschlag');
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(trigger).toHaveText('Achtel · 2');await expect(page.locator('#subdivision')).toHaveValue('2');
 await trigger.press('ArrowDown');await expect(options).toBeVisible();await page.keyboard.press('Escape');await expect(options).toBeHidden();await expect(trigger).toBeFocused();
 await trigger.click();await page.locator('#trigger-sound').click();await expect(options).toBeHidden();
 await page.locator('#options-sound [role=option]').nth(2).click();await expect(page.locator('#sound')).toHaveValue('soft');
 for(const id of ['gap','reduced']){const input=page.locator('#'+id);await expect(input).toHaveAttribute('role','switch');await input.check();await expect(input).toBeChecked();}
 await page.locator('#hide-gap').check();await expect(page.locator('#hide-gap')).toBeChecked();
});

test('beats stepper supports buttons, direct entry and limits',async({page})=>{
 await page.goto('/de/');await page.locator('#beats-plus').click();await expect(page.locator('#beats')).toHaveValue('5');await expect(page.locator('#beat-buttons button')).toHaveCount(5);
 await page.locator('#beats-minus').click();await expect(page.locator('#beats')).toHaveValue('4');
 await page.locator('#beats').fill('1');await page.locator('#beats').press('Tab');await expect(page.locator('#beats-minus')).toBeDisabled();
 await page.locator('#beats').fill('99');await page.locator('#beats').press('Tab');await expect(page.locator('#beats')).toHaveValue('12');await expect(page.locator('#beats-plus')).toBeDisabled();await expect(page.locator('#beat-buttons button')).toHaveCount(12);
});
test('muted accent lettering fades and restores when enabled',async({page})=>{
 await page.goto('/de/');
 const beat=page.locator('#beat-buttons button').first();
 await beat.click();await beat.click();
 await expect(beat).toHaveAttribute('data-accent','0');
 await expect(beat.locator('b')).toHaveCSS('opacity','0.4');await expect(beat.locator('span')).toHaveCSS('opacity','0.4');
 await beat.click();await expect(beat).toHaveAttribute('data-accent','2');await expect(beat.locator('b')).toHaveCSS('opacity','1');
});
