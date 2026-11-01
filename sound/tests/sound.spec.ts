import {test,expect} from '@playwright/test';
test('drawing, audio and appearance',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('h1')).toHaveText('Zeichne deinen Rhythmus');
 await page.locator('#clear').click();
 await expect(page.locator('.count').first()).toHaveText('0 / 16');
 await page.locator('#drawing').scrollIntoViewIfNeeded();
 const r=await page.locator('#drawing').boundingBox();if(!r)throw Error('Missing drawing');
 await page.mouse.move(r.x+20,r.y+20);await page.mouse.down();
 for(let n=1;n<15;n++)await page.mouse.move(r.x+r.width*n/16,r.y+20);
 await page.mouse.up();
 await expect(page.locator('.count').first()).not.toHaveText('0 / 16');
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.waitForTimeout(500);await page.locator('#play').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#theme-light').click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await expect(page.locator('.dot-0')).toHaveCSS('background-color','rgb(0, 134, 155)');
 await page.locator('#theme').click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.locator('#preferences-close').click();
 await expect(page.locator('.instruments-tile')).toBeVisible();
 await page.locator('#focus').click();await expect(page.locator('body')).toHaveClass(/focus-view/);
 await expect(page.locator('.instruments-tile')).toBeHidden();
 await page.locator('#focus').click();
 await expect(page.locator('.instruments-tile')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'test-results/'+info.project.name+'.png',fullPage:true});
 expect(errors).toEqual([]);
});
for(const lang of ['en','es','fr'])test('localized '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await expect(page.locator('html')).toHaveAttribute('lang',lang);
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://sound.jacktools.net/'+lang+'/');
});
test('all instruments can replace a track without losing points',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 const track=page.locator('[data-track="0"]');
 const count=await track.locator('.count').textContent();
 await track.locator('summary').click();
 await page.locator('#tempo').fill('180');
 await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#play').click();
 const select=track.locator('.instrument-select');
 const ids=await select.locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));
 expect(ids).toHaveLength(18);
 for(const id of ids){
  await select.selectOption(id,{force:true});
  await expect(track.locator('.count')).toHaveText(count!);
  await page.waitForTimeout(400);
 }
 await page.locator('#play').click();
 expect(errors).toEqual([]);
});
test('eight optional orbits and drawing on added tracks',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('.instrument')).toHaveCount(8);
 await expect(page.locator('.instrument[data-enabled=true]')).toHaveCount(5);
 for(let i=5;i<8;i++){
  const row=page.locator('[data-track="'+i+'"]');
  await row.locator('summary').click();await row.locator('.track-enabled').check();
 }
 await expect(page.locator('.instrument[data-enabled=true]')).toHaveCount(8);
 await page.locator('#clear').click();
 await page.locator('#drawing').scrollIntoViewIfNeeded();
 const r=await page.locator('#drawing').boundingBox();if(!r)throw Error('No drawing surface');
 await page.mouse.move(r.x+r.width*.6,r.y+r.height*.95);await page.mouse.down();await page.mouse.up();
 await expect(page.locator('[data-track="7"] .count')).not.toHaveText('0 / 16');
 await page.locator('[data-track="7"] .track-enabled').uncheck();
 await expect(page.locator('[data-track="7"]')).toHaveAttribute('data-enabled','false');
 await page.locator('[data-track="7"] .track-enabled').check();
 await expect(page.locator('[data-track="7"] .count')).not.toHaveText('0 / 16');
 for(let i=0;i<8;i++){
  const row=page.locator('[data-track="'+i+'"]');
  if(!(await row.getAttribute('open')!==null))await row.locator('summary').click();
  await row.locator('.track-enabled').uncheck();
 }
 await expect(page.locator('.instrument[data-enabled=true]')).toHaveCount(0);
 await page.locator('#drawing').scrollIntoViewIfNeeded();await page.locator('#drawing').click();
 await page.locator('#play').click();await page.waitForTimeout(150);await page.locator('#play').click();
 expect(errors).toEqual([]);
});

test('styled dropdown keyboard selection and slide toggles',async({page})=>{
 await page.goto('/de/');
 const row=page.locator('[data-track="0"]');
 await row.locator('summary').click();
 const trigger=row.locator('#trigger-instrument-0');
 await expect(trigger).toHaveAccessibleName(/Instrument.*Kick/);
 await trigger.click();
 await expect(row.locator('#options-instrument-0')).toBeVisible();
 await page.keyboard.press('End');await page.keyboard.press('Enter');
 await expect(row.locator('.instrument-name')).toHaveText('Flächenklang');
 await expect(trigger).toHaveAttribute('aria-expanded','false');
 await trigger.press('ArrowDown');await page.keyboard.press('Escape');
 await expect(trigger).toBeFocused();
 const mute=row.locator('.mute');
 await mute.check();await expect(mute).toBeChecked();
 await mute.uncheck();await expect(mute).not.toBeChecked();
 await expect(mute).toHaveAttribute('role','switch');
});
test('drawing toggles points only once per gesture',async({page})=>{
 await page.goto('/de/');await page.locator('#clear').click();
 await page.locator('#drawing').scrollIntoViewIfNeeded();
 const r=await page.locator('#drawing').boundingBox();if(!r)throw Error('No drawing');
 const x=r.x+r.width*.4,y=r.y+r.height*.08;
 await page.mouse.move(x,y);await page.mouse.down();
 for(let n=0;n<4;n++){await page.waitForTimeout(45);await page.mouse.move(x+(n%2),y);}
 await page.mouse.up();
 await expect(page.locator('[data-track="0"] .count')).toHaveText('1 / 16');
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.up();
 await expect(page.locator('[data-track="0"] .count')).toHaveText('0 / 16');
});
test('random evolution starts playback and can stop without pausing',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});
 await page.goto('/de/');
 const points=()=>page.locator('[data-step]').evaluateAll(buttons=>buttons.map(b=>b.getAttribute('aria-pressed')).join(','));
 const initial=await points();
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#evolve').click();
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.waitForTimeout(500);expect(await points()).toBe(initial);
 await expect.poll(points,{timeout:6000}).not.toBe(initial);
 await page.locator('#evolve').click();
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 const frozen=await points();await page.waitForTimeout(3000);expect(await points()).toBe(frozen);
 await page.locator('#evolve').click();await page.locator('#play').click();
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#evolution-status')).toBeEmpty();
});
test('focus requests and releases screen wake lock',async({page})=>{
 await page.addInitScript(()=>{
  const state={requests:0,releases:0};(window as any).wakeTest=state;
  Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async(type:string)=>{
   if(type!=='screen')throw Error('Unexpected lock type');
   state.requests++;
   const sentinel=new EventTarget() as any;
   sentinel.release=async()=>{state.releases++;sentinel.dispatchEvent(new Event('release'));};
   return sentinel;
  }}});
 });
 await page.goto('/de/');
 await page.locator('#focus').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).wakeTest.requests)).toBe(1);
 await expect(page.locator('#wake-status')).toBeEmpty();
 await page.keyboard.press('Escape');
 await expect.poll(()=>page.evaluate(()=>(window as any).wakeTest.releases)).toBe(1);
 await page.locator('#focus').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).wakeTest.requests)).toBe(2);
});
test('wake lock rejection displays a localized warning',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>{throw Error('Denied');}}}));
 await page.goto('/de/');await page.locator('#focus').click();
 await expect(page.locator('#wake-status')).toContainText('Bildschirm');
 await page.locator('#focus').click();await expect(page.locator('#wake-status')).toBeEmpty();
});
test('ambient canvas renders without blocking the instrument',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('#sound-atmosphere')).toHaveAttribute('aria-hidden','true');
 await expect(page.locator('#sound-atmosphere')).toHaveCSS('pointer-events','none');
 await expect.poll(()=>page.locator('#sound-atmosphere').evaluate((c:HTMLCanvasElement)=>c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.some((value,index)=>index%4===3&&value>0)?1:0)).toBeGreaterThan(0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#focus').click();await expect(page.locator('#sound-atmosphere')).toBeVisible();
 await page.locator('#play').click();
});
test('style presets change instruments and defer live changes to a bar',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('.style-tile')).toHaveCount(6);
 const choose=(id:string)=>page.locator('[data-style-preset='+id+']').click();
 await choose('classical');
 await expect(page.locator('[data-style-preset=classical]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-style-preset=electronic]')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-track="0"] .instrument-name')).toHaveText('Klavier');
 await expect(page.locator('#tempo')).toHaveValue('76');
 await expect(page.locator('[data-track="1"] .instrument-name')).toHaveText('Streicher');
 await choose('house');
 await expect(page.locator('#tempo')).toHaveValue('124');
 await expect(page.locator('.instrument[data-enabled=true]')).toHaveCount(6);
 await page.locator('#play').click();
 await choose('rock');
 await expect(page.locator('#style-status')).not.toBeEmpty();
 await expect(page.locator('#tempo')).toHaveValue('124');
 await expect(page.locator('#tempo')).toHaveValue('118',{timeout:5000});
 await expect(page.locator('#style-status')).toBeEmpty();
 await page.locator('#play').click();
 for(const id of ['pop','ambient','electronic']){
  await choose(id);
  await page.locator('#play').click();await page.waitForTimeout(150);await page.locator('#play').click();
 }
 expect(errors).toEqual([]);
});
test('focus idle stage enlarges orbit and restores controls on activity',async({page})=>{
 await page.addInitScript(()=>{
  // Test the equally supported fullscreen-denied fallback deterministically.
  Element.prototype.requestFullscreen=async()=>{throw Error('Not allowed');};
  const state={requests:0,releases:0};(window as any).idleWake=state;
  Object.defineProperty(navigator,'wakeLock',{value:{request:async()=>{
   state.requests++;const sentinel=new EventTarget() as any;
   sentinel.release=async()=>{state.releases++;sentinel.dispatchEvent(new Event('release'));};return sentinel;
  }}});
 });
 await page.goto('/de/');await page.locator('#focus').click();
 const before=await page.locator('.orbit-wrap').boundingBox();
 await expect(page.locator('body')).toHaveClass(/focus-idle/,{timeout:5000});
 await expect(page.locator('.flow-side')).toBeHidden();
 await expect(page.locator('#focus')).toBeHidden();
 await page.waitForTimeout(750);
 const after=await page.locator('.orbit-wrap').boundingBox();
 expect(after!.width).toBeGreaterThan(before!.width);
 const viewport=page.viewportSize()!;
 expect(Math.abs(after!.x+after!.width/2-viewport.width/2)).toBeLessThan(3);
 expect(Math.abs(after!.y+after!.height/2-viewport.height/2)).toBeLessThan(3);
 expect(await page.evaluate(()=>(window as any).idleWake)).toEqual({requests:1,releases:0});
 await page.mouse.move(12,12);
 await expect(page.locator('.flow-side')).toBeVisible();
 await expect(page.locator('body')).not.toHaveClass(/focus-idle/);
 await expect(page.locator('body')).toHaveClass(/focus-idle/,{timeout:5000});
 await page.keyboard.press('Tab');await expect(page.locator('.flow-side')).toBeVisible();
 await page.locator('#focus').click();
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 await expect.poll(()=>page.evaluate(()=>(window as any).idleWake.releases)).toBe(1);
});
test('focus requests fullscreen and exits it on leaving',async({page})=>{
 await page.addInitScript(()=>{
  let element:Element|null=null;(window as any).fullscreenCalls={enter:0,exit:0};
  Object.defineProperty(document,'fullscreenElement',{get:()=>element});
  Element.prototype.requestFullscreen=async()=>{
   (window as any).fullscreenCalls.enter++;element=document.documentElement;document.dispatchEvent(new Event('fullscreenchange'));
  };
  document.exitFullscreen=async()=>{
   (window as any).fullscreenCalls.exit++;element=null;document.dispatchEvent(new Event('fullscreenchange'));
  };
 });
 await page.goto('/de/');await page.locator('#focus').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).fullscreenCalls.enter)).toBe(1);
 await page.locator('#focus').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).fullscreenCalls.exit)).toBe(1);
 await page.locator('#focus').click();
 await page.evaluate(()=>document.exitFullscreen());
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);
});
test('background follows applied style and remains still for reduced motion',async({page})=>{
 await page.goto('/de/');
 for(const style of ['electronic','house','pop','rock','classical','ambient']){
  await page.locator('[data-style-preset='+style+']').click();
  await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-style',style);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('#play').click();
 const pixels=()=>page.locator('#sound-atmosphere').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());
 const first=await pixels();await page.waitForTimeout(350);
 expect(await pixels()).toBe(first);
 await page.locator('#play').click();
});
test('animation switches are independent and do not stop playback',async({page})=>{
 await page.goto('/de/');await page.locator('#play').click();
 await page.locator('[data-background-mode=off]').click();
 await expect(page.locator('#sound-atmosphere')).toBeHidden();
 await page.locator('[data-orbit-mode=off]').click();
 await page.locator('[data-center-mode=off]').click();
 await expect(page.locator('#orbit')).toHaveAttribute('data-animated','false');
 await page.waitForTimeout(100);
 const image=()=>page.locator('#orbit').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());
 const first=await image();await page.waitForTimeout(250);expect(await image()).toBe(first);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-background-mode=auto]').click();
 await expect(page.locator('#sound-atmosphere')).toBeVisible();
 await expect(page.locator('[data-orbit-mode=off]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-orbit-mode=comet]').click();
 await expect(page.locator('#orbit')).toHaveAttribute('data-animated','true');
 await page.locator('#play').click();
});
test('random patterns offset orbits and reset restores alignment',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>.5;});
 await page.goto('/de/');
 await page.locator('#random').click();
 await expect(page.locator('[data-track="0"]')).toHaveAttribute('data-phase','0');
 await expect(page.locator('[data-track="1"]')).toHaveAttribute('data-phase','4');
 await page.locator('#reset').click();
 for(let i=0;i<8;i++)await expect(page.locator('[data-track="'+i+'"]')).toHaveAttribute('data-phase','0');
});
test('manual volume and random dynamics control actual note gain',async({page})=>{
 await page.addInitScript(()=>{
  Math.random=()=>0;(window as any).noteGains=[];
  const original=AudioParam.prototype.exponentialRampToValueAtTime;
  AudioParam.prototype.exponentialRampToValueAtTime=function(value:number,time:number){
   if(value>.001&&value<1)(window as any).noteGains.push(value);
   return original.call(this,value,time);
  };
 });
 await page.goto('/de/');await page.locator('#clear').click();
 const row=page.locator('[data-track="0"]');
 await row.locator('summary').click();await row.locator('[data-step="0"]').click();
 await row.locator('.track-volume').fill('0.8');await row.locator('.track-volume').dispatchEvent('input');
 await expect(row.locator('.track-volume-value')).toHaveText('80 %');
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).noteGains.some((n:number)=>Math.abs(n-.24)<.00001))).toBe(true);
 await row.locator('.track-volume').fill('0.4');await row.locator('.track-volume').dispatchEvent('input');
 await row.locator('.random-dynamics').check();
 await expect.poll(()=>page.evaluate(()=>(window as any).noteGains.some((n:number)=>Math.abs(n-.054)<.00001)),{timeout:5000}).toBe(true);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();
});
test('manual and automatic direction changes apply at bar boundaries',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});
 await page.goto('/de/');
 const row=page.locator('[data-track="1"]');
 await row.locator('summary').click();
 await row.locator('.track-direction').selectOption('reverse',{force:true});
 await expect(row).toHaveAttribute('data-direction','-1');
 await expect(page.locator('[id="trigger-direction-0"]')).toBeDisabled();
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#play').click();
 await page.waitForTimeout(150);
 await row.locator('.track-direction').selectOption('forward',{force:true});
 await expect(row).toHaveAttribute('data-direction','-1');
 await expect(row).toHaveAttribute('data-direction','1',{timeout:4000});
 await row.locator('.track-direction').selectOption('random',{force:true});
 await page.locator('#evolve').click();
 await expect(row).toHaveAttribute('data-direction','-1',{timeout:6000});
 await page.locator('#play').click();
 await page.locator('#reset').click();
 await expect(row).toHaveAttribute('data-direction','1');
});
test('centre animation is independently switchable',async({page})=>{
 await page.goto('/de/');
 const alpha=()=>page.locator('#orbit').evaluate((c:HTMLCanvasElement)=>c.getContext('2d')!.getImageData(285,285,130,130).data.some((value,index)=>index%4===3&&value>0)?1:0);
 await expect.poll(alpha).toBeGreaterThan(0);
 await page.locator('[data-center-mode=off]').click();
 await expect.poll(alpha).toBe(0);
 await page.locator('#play').click();
 await page.locator('[data-orbit-mode=off]').click();
 await page.locator('[data-center-mode=sun]').click();
 await expect.poll(alpha).toBeGreaterThan(0);
 await expect(page.locator('[data-orbit-mode=off]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();
});
test('background tiles offer style, light clouds and off independently',async({page})=>{
 await page.goto('/de/');
 await page.locator('[data-background-mode=clouds]').click();
 await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','clouds');
 await expect(page.locator('[data-background-mode=clouds]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-style-preset=rock]').click();
 await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','clouds');
 await page.locator('[data-background-mode=off]').click();
 await expect(page.locator('#sound-atmosphere')).toBeHidden();
 await expect(page.locator('[data-center-mode=ring]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-background-mode=auto]').click();
 await expect(page.locator('#sound-atmosphere')).toBeVisible();
 await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-style','rock');
});
test('all six centre tiles render and respect reduced motion',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('[data-center-mode]')).toHaveCount(6);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('[data-orbit-mode=off]').click();
 await page.locator('#play').click();
 for(const mode of ['filled','sine','bars','sun','ring']){
  await page.locator('[data-center-mode='+mode+']').click();
  await expect(page.locator('[data-center-mode='+mode+']')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(100);
  const snapshot=()=>page.locator('#orbit').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  const before=await snapshot();await page.waitForTimeout(100);expect(await snapshot()).toBe(before);
 }
 await page.locator('#play').click();
});
test('evolution changes animations but respects every off setting',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});
 await page.goto('/de/');
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('[data-orbit-mode=off]').click();
 await page.locator('#evolve').click();
 await expect(page.locator('[data-center-mode=filled]')).toHaveAttribute('aria-pressed','true',{timeout:6000});
 await page.locator('[data-center-mode=off]').click();
 await expect(page.locator('[data-background-mode=clouds]')).toHaveAttribute('aria-pressed','true',{timeout:6000});
 await page.locator('[data-background-mode=off]').click();
 await page.waitForTimeout(3000);
 await expect(page.locator('[data-center-mode=off]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-background-mode=off]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#sound-atmosphere')).toBeHidden();
 await expect(page.locator('[data-orbit-mode=off]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();
});
test('new background variants are selectable and render during playback',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('[data-background-mode]')).toHaveCount(6);
 await page.locator('#play').click();
 for(const mode of ['aurora','stars','waves']){
  await page.locator('[data-background-mode='+mode+']').click();
  await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode',mode);
  await page.waitForTimeout(150);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForTimeout(100);
 const pixels=()=>page.locator('#sound-atmosphere').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 const first=await pixels();await page.waitForTimeout(150);expect(await pixels()).toBe(first);
 await page.locator('#play').click();expect(errors).toEqual([]);
});
test('separate animation panel offers orbit variants and hides in focus',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('.animations-tile .animation-category')).toHaveCount(3);
 await expect(page.locator('.sound-app [data-center-mode]')).toHaveCount(0);
 await page.locator('#play').click();
 for(const mode of ['dot','pulse','comet','off']){
  await page.locator('[data-orbit-mode='+mode+']').click();
  await expect(page.locator('#orbit')).toHaveAttribute('data-mode',mode);
  await page.waitForTimeout(100);
 }
 await page.locator('#focus').click();await expect(page.locator('.animations-tile')).toBeHidden();
 await page.locator('#focus').click();await expect(page.locator('.animations-tile')).toBeVisible();
 await page.locator('#play').click();expect(errors).toEqual([]);
});
test('random play enables directions and dynamics without per-track setup',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});
 await page.goto('/de/');
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#evolve').click();
 await expect(page.locator('[data-track="1"] .track-direction')).toHaveValue('random');
 await expect(page.locator('[data-track="1"] .random-dynamics')).toBeChecked();
 await expect(page.locator('[data-track="1"]')).toHaveAttribute('data-direction','-1',{timeout:6000});
 await expect(page.locator('[data-track="5"]')).toHaveAttribute('data-enabled','false');
 await page.locator('#evolve').click();
 await expect(page.locator('[data-track="1"] .track-direction')).toHaveValue('forward');
 await expect(page.locator('[data-track="1"] .random-dynamics')).not.toBeChecked();
});
test('orbit off removes tracks and nodes without hiding centre or backdrop',async({page})=>{
 await page.goto('/de/');
 await page.locator('[data-orbit-mode=off]').click();
 const outerPixels=()=>page.locator('#orbit').evaluate((c:HTMLCanvasElement)=>c.getContext('2d')!.getImageData(0,0,c.width,200).data.some((value,index)=>index%4===3&&value>0));
 await expect.poll(outerPixels).toBe(false);
 await expect(page.locator('#sound-atmosphere')).toBeVisible();
 await expect(page.locator('[data-center-mode=ring]')).toHaveAttribute('aria-pressed','true');
 const centrePixels=()=>page.locator('#orbit').evaluate((c:HTMLCanvasElement)=>c.getContext('2d')!.getImageData(285,285,130,130).data.some((value,index)=>index%4===3&&value>0));
 await expect.poll(centrePixels).toBe(true);
 await page.locator('[data-orbit-mode=comet]').click();
 await expect.poll(outerPixels).toBe(true);
});
