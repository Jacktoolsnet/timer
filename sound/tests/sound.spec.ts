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
 expect(ids).toHaveLength(22);
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
 await expect(page.locator('.style-tile')).toHaveCount(16);
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
test('focus hide button enlarges orbit and restores controls on activity',async({page})=>{
 test.setTimeout(40000);
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
 await page.waitForTimeout(10500);
 await expect(page.locator('.flow-side')).toBeVisible();
 await expect(page.locator('body')).not.toHaveClass(/focus-idle/);
 await page.locator('#hide-focus-controls').click();
 await expect(page.locator('body')).toHaveClass(/focus-idle/,{timeout:12000});
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
 await page.locator('#hide-focus-controls').click();
 await expect(page.locator('body')).toHaveClass(/focus-idle/,{timeout:12000});
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
  await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','clouds');
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
 await page.locator('[data-background-mode=clouds]').click();
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
 await expect(page.locator('.instrument').nth(2)).toHaveAttribute('data-direction','-1',{timeout:6000});
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
 await page.locator('[data-background-mode=clouds]').click();
 await expect(page.locator('#sound-atmosphere')).toBeVisible();
 await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','clouds');
});
test('all six centre tiles render and respect reduced motion',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('[data-center-mode]')).toHaveCount(7);
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
test('random animation tiles work with normal play and preserve explicit choices',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});
 await page.goto('/de/');
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('[data-center-mode=random]').click();
 await page.locator('[data-background-mode=random]').click();
 await page.locator('[data-orbit-mode=off]').click();
 await page.locator('#play').click();
 await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','ring');
 await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','clouds');
 await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','filled',{timeout:6000});
 await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','aurora');
 await expect(page.locator('[data-center-mode=random]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-orbit-mode=off]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-center-mode=sun]').click();
 await page.locator('[data-background-mode=off]').click();
 await page.locator('#evolve').click();
 await page.waitForTimeout(3000);
 await expect(page.locator('[data-center-mode=sun]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-background-mode=off]')).toHaveAttribute('aria-pressed','true');
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
 await expect(page.locator('.instrument').nth(2)).toHaveAttribute('data-direction','-1',{timeout:6000});
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
test('musical journey morphs over multiple cycles with bounded tempo steps',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});
 await page.goto('/de/');
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#evolve').click();
 const track=page.locator('[data-track="0"]');
 await expect(track).toHaveAttribute('data-morph','0.25',{timeout:6000});
 await expect(track.locator('.instrument-name')).toHaveText('Kick');
 await expect(page.locator('#tempo')).toHaveValue('178');
 await expect(track).toHaveAttribute('data-morph','0.5',{timeout:6000});
 await expect(track.locator('.instrument-name')).toHaveText('Kick');
 await expect(page.locator('#tempo')).toHaveValue('176');
 await expect(track).toHaveAttribute('data-morph','0.75',{timeout:6000});
 await expect(track.locator('.instrument-name')).toHaveText('Kick');
 await expect(track.locator('.instrument-name')).toHaveText('Snare',{timeout:6000});
 await page.locator('#play').click();
});
test('focus and sport presets load and preserve explicit visual selections',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await page.locator('[data-background-mode=stars]').click();
 await page.locator('[data-center-mode=filled]').click();
 await page.locator('[data-style-preset=focus]').click();
 await expect(page.locator('#tempo')).toHaveValue('80');
 await expect(page.locator('[data-track="0"] .instrument-name')).toHaveText('Flächenklang');
 await expect(page.locator('[data-background-mode=stars]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-center-mode=filled]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-background-mode=clouds]').click();
 await page.locator('#play').click();await page.waitForTimeout(150);await page.locator('#play').click();
 await page.locator('[data-style-preset=sport]').click();
 await expect(page.locator('#tempo')).toHaveValue('136');
 await expect(page.locator('[data-track="0"] .instrument-name')).toHaveText('Kick');
 await expect(page.locator('.instrument[data-enabled=true]')).toHaveCount(6);
 await page.locator('#evolve').click();await page.waitForTimeout(150);await page.locator('#play').click();
 expect(errors).toEqual([]);
});
test('jazz and coffeehouse provide blues scales and audible swing presets',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await page.locator('[data-style-preset=jazz]').click();
 await expect(page.locator('#tempo')).toHaveValue('92');
 await expect(page.locator('[data-track="0"] .instrument-name')).toHaveText('Klavier');
 await page.locator('#play').click();await page.waitForTimeout(500);await page.locator('#play').click();
 await page.locator('[data-style-preset=coffeehouse]').click();
 await expect(page.locator('#tempo')).toHaveValue('78');
 await expect(page.locator('[data-track="1"] .instrument-name')).toHaveText('Gitarre');
 await page.locator('#evolve').click();await page.waitForTimeout(300);await page.locator('#play').click();
 expect(errors).toEqual([]);
});
test('optional storage restores music, tracks and animations without autoplay',async({page})=>{
 await page.goto('/de/');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.locator('#preferences-close').click();
 await page.locator('[data-style-preset=coffeehouse]').click();
 await page.locator('#tempo').fill('83');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#volume').fill('0.22');await page.locator('#volume').dispatchEvent('input');
 await page.locator('[data-center-mode=bars]').click();
 await page.locator('[data-background-mode=random]').click();
 await page.locator('[data-orbit-mode=off]').click();
 const row=page.locator('[data-track="1"]');
 await row.locator('summary').click();
 await row.locator('.track-volume').fill('0.4');await row.locator('.track-volume').dispatchEvent('input');
 await row.locator('.instrument-select').selectOption('organ',{force:true});
 await row.locator('.track-direction').selectOption('reverse',{force:true});
 await row.locator('.random-dynamics').check();
 await row.locator('[data-step="7"]').click();
 await page.waitForTimeout(350);await page.reload();
 await expect(page.locator('[data-style-preset=coffeehouse]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#tempo')).toHaveValue('83');await expect(page.locator('#volume')).toHaveValue('0.22');
 await expect(page.locator('[data-center-mode=bars]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-background-mode=random]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-orbit-mode=off]')).toHaveAttribute('aria-pressed','true');
 await expect(row.locator('.instrument-select')).toHaveValue('organ');
 await expect(row.locator('.track-volume')).toHaveValue('0.4');
 await expect(row.locator('.track-direction')).toHaveValue('reverse');
 await expect(row.locator('.random-dynamics')).toBeChecked();
 await expect(row.locator('[data-step="7"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','false');
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').uncheck();
 await page.waitForTimeout(350);
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();
 await page.reload();await expect(page.locator('#tempo')).toHaveValue('100');
});
test('music preferences are not stored without consent',async({page})=>{
 await page.goto('/de/');await page.locator('[data-style-preset=jazz]').click();
 await page.locator('[data-background-mode=stars]').click();await page.waitForTimeout(350);
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();
 await page.reload();await expect(page.locator('[data-style-preset=electronic]')).toHaveAttribute('aria-pressed','true');
});
test('drawing reshapes a melodic motif in electronic and jazz styles',async({page})=>{
 await page.goto('/de/');
 for(const style of ['electronic','jazz']){
  if(style==='jazz')await page.locator('[data-style-preset=jazz]').click();
  const index=style==='jazz'?0:4;
  const row=page.locator('[data-track="'+index+'"]'),before=await row.getAttribute('data-motif');
  await page.locator('#drawing').scrollIntoViewIfNeeded();
  const r=await page.locator('#drawing').boundingBox();if(!r)throw Error('No drawing surface');
  // Near the top of this track's band maps to a high, consonant phrase degree.
  await page.mouse.move(r.x+r.width*.4,r.y+r.height*(index+.05)/5);
  await page.mouse.down();await page.mouse.up();
  await expect(row).not.toHaveAttribute('data-motif',before!);
  expect((await row.getAttribute('data-motif'))!.split(',')[3]).toBe('4');
  await page.locator('#play').click();await page.waitForTimeout(100);await page.locator('#play').click();
 }
});
test('random play creates and advances a song while normal play stays a loop',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});
 await page.goto('/de/');
 await expect(page.locator('#song-structure')).toBeHidden();
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#evolve').click();
 await expect(page.locator('#song-structure')).toBeVisible();
 await expect(page.locator('#song-structure')).toHaveAttribute('data-part','intro');
 await expect(page.locator('#song-parts .song-part')).toHaveCount(8);
 await expect(page.locator('#song-label')).toHaveText('Intro');
 await expect(page.locator('#song-structure')).toHaveAttribute('data-part','verse',{timeout:10000});
 await expect(page.locator('#song-label')).toHaveText('Strophe');
 await page.locator('#evolve').click();
 await expect(page.locator('#song-structure')).toBeHidden();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();
});
test('a drawn refrain motif returns on the next chorus',async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>{Math.random=()=>0;});
 await page.goto('/de/');
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#evolve').click();
 await expect(page.locator('#song-structure')).toHaveAttribute('data-part','chorus',{timeout:30000});
 await page.locator('#drawing').scrollIntoViewIfNeeded();
 const r=await page.locator('#drawing').boundingBox();if(!r)throw Error('No pad');
 await page.mouse.move(r.x+r.width*.4,r.y+r.height*.81);await page.mouse.down();await page.mouse.up();
 const track=page.locator('[data-track="4"]'),hook=await track.getAttribute('data-motif');
 expect(hook!.split(',')[3]).toBe('4');
 await expect(page.locator('#song-structure')).toHaveAttribute('data-part','verse',{timeout:25000});
 await expect(page.locator('#song-structure')).toHaveAttribute('data-part','chorus',{timeout:25000});
 await expect(track).toHaveAttribute('data-motif',hook!);
 await page.locator('#play').click();
});
for(const lang of ['de','en','es','fr'])test('localized overview, metadata and separate usage guide '+lang,async({page})=>{
 await page.goto('/'+lang+'/');
 await expect(page.locator('[data-tool-information=sound]')).toBeVisible();
 await expect(page.locator('.sound-faq details')).toHaveCount(4);
 const schema=await page.locator('script[type="application/ld+json"]').evaluateAll(scripts=>scripts.map(s=>JSON.parse(s.textContent||'{}')));
 expect(schema.some(s=>s['@type']==='WebApplication'&&s.applicationCategory==='MultimediaApplication')).toBe(true);
 await expect(page.locator('.usage-link a')).toHaveAttribute('href','/'+lang+'/usage/');
 await page.locator('#focus').click();
 await expect(page.locator('[data-tool-information=sound]')).toBeHidden();
 await expect(page.locator('.sound-faq')).toBeHidden();
 await page.locator('#focus').click();
 await page.locator('.usage-link a').click();
 await expect(page.locator('.legal-page>section')).toHaveCount(6);
});

test('sound defaults to dark and respects saved theme choices',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto('/de/');
 await expect(page.locator('html')).toHaveAttribute('data-theme-mode','dark');
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.addInitScript(()=>{
  localStorage.setItem('jacktools.sound.storage-consent.v1','yes');
  localStorage.setItem('jacktools.sound.appearance.v1',JSON.stringify({themeMode:'auto'}));
 });
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-theme-mode','auto');
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('new genres support random playback and live drawing',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 for(const [id,bpm] of [['hiphop','88'],['lofi','74'],['funk','108'],['reggae','76'],['drumandbass','168'],['latin','104']]){
  await page.locator('[data-style-preset="'+id+'"]').click();
  await expect(page.locator('#tempo')).toHaveValue(bpm);
  await page.locator('#evolve').click();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#song-structure')).toBeVisible();
  const canvas=page.locator('#drawing');await canvas.scrollIntoViewIfNeeded();
  const rect=(await canvas.boundingBox())!;
  await page.mouse.move(rect.x+rect.width*.2,rect.y+rect.height*.8);
  await page.mouse.down();await page.mouse.move(rect.x+rect.width*.6,rect.y+rect.height*.75,{steps:8});await page.mouse.up();
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 }
 expect(errors).toEqual([]);
});

test('all twenty-two instruments play through the complete audio graph',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 const select=page.locator('select[name="instrument-0"]');
 const ids=await select.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value));
 expect(ids).toHaveLength(22);
 for(const id of ids){
  await select.selectOption(id,{force:true});
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(160);
  await expect(page.locator('#audio-status')).toBeEmpty();
  await page.locator('#play').click();
 }
 expect(errors).toEqual([]);
});
