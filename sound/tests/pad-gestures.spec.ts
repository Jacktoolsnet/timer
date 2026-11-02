import {test,expect} from '@playwright/test';
import {gestureMode,holdSteps,ringAppearance,HOLD_DELAY,RING_FADE} from '../src/lib/pad-gestures';

test('gesture thresholds separate taps, holds and drawing; rhythm growth is bounded in every meter',()=>{
 expect(gestureMode('pending',3,200)).toBe('pending');expect(gestureMode('pending',3,HOLD_DELAY)).toBe('holding');expect(gestureMode('pending',8,50)).toBe('drawing');expect(gestureMode('holding',9,900)).toBe('drawing');expect(gestureMode('drawing',0,10)).toBe('drawing');
 for(const steps of [8,12,16]){
  expect(holdSteps(steps-1,280,120,steps)).toEqual([steps-1]);
  const pulses=holdSteps(steps-1,90000,120,steps);expect(new Set(pulses).size).toBe(pulses.length);expect(pulses.length).toBeLessThanOrEqual(4);expect(pulses.every(s=>s>=0&&s<steps)).toBe(true);
 }
 expect(holdSteps(2,800,120,16)).toEqual([2,6]);
 expect(ringAppearance(2000,null,false).radius).toBeGreaterThan(ringAppearance(100,null,false).radius);
 expect(ringAppearance(2000,RING_FADE,false).alpha).toBe(0);expect(ringAppearance(2000,null,true).radius).toBe(24);
});

test('tap commits once on release, and holding builds a quarter-note rhythm without autoplay',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await page.locator('#clear').click();
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!;
 await page.mouse.move(r.x+r.width*.15,r.y+r.height*.02);await page.mouse.down();await page.waitForTimeout(100);
 await expect(page.locator('[data-track="0"] .count')).toHaveText('0 / 16');await page.mouse.up();await expect(page.locator('[data-track="0"] .count')).toHaveText('1 / 16');
 await page.mouse.down();await page.mouse.up();await expect(page.locator('[data-track="0"] .count')).toHaveText('0 / 16');
 await page.mouse.down();await expect(pad).toHaveAttribute('data-input','holding');await page.waitForTimeout(700);await page.mouse.up();
 await expect(page.locator('[data-track="0"] [data-step="2"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-track="0"] [data-step="6"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');await expect(pad).toHaveAttribute('data-pointers','0');expect(Number(await pad.getAttribute('data-rings'))).toBeGreaterThan(0);
 await expect(pad).toHaveAttribute('data-rings','0',{timeout:3000});expect(errors).toEqual([]);
});

test('real multi-touch holds edit independent tracks and one release does not stop the other finger',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await page.locator('#clear').click();
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!,cdp=await page.context().newCDPSession(page);
 const a={x:r.x+r.width*.15,y:r.y+r.height*.02,id:1},b={x:r.x+r.width*.6,y:r.y+r.height*.53,id:2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});await expect(pad).toHaveAttribute('data-pointers','2');
 await expect(pad).toHaveAttribute('data-input','holding');await page.waitForTimeout(700);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[a]});await expect(pad).toHaveAttribute('data-pointers','1');
 await expect(page.locator('[data-track="4"] [data-step="1"]')).toHaveAttribute('aria-pressed','true',{timeout:2000});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(pad).toHaveAttribute('data-pointers','0');
 await expect(page.locator('[data-track="0"] [data-step="2"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-track="4"] [data-step="9"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-track="4"] [data-step="1"]')).toHaveAttribute('aria-pressed','true');
 await pad.screenshot({path:'test-results/pad-rings-'+test.info().project.name+'.png'});expect(errors).toEqual([]);
});

test('moving becomes a drawing stroke rather than leaving an expanding held rhythm',async({page})=>{
 await page.goto('/de/');await page.locator('#clear').click();const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!;
 await page.mouse.move(r.x+r.width*.1,r.y+r.height*.54);await page.mouse.down();await page.mouse.move(r.x+r.width*.6,r.y+r.height*.54,{steps:12});await expect(pad).toHaveAttribute('data-input','drawing');
 await page.waitForTimeout(400);await page.mouse.up();await expect(pad).toHaveAttribute('data-input','idle');
 const count=await page.locator('[data-track="4"] .count').textContent();await page.waitForTimeout(700);await expect(page.locator('[data-track="4"] .count')).toHaveText(count!);
});

test('cancellation and preset changes never turn an unfinished touch into a tap',async({page})=>{
 await page.goto('/de/');await page.locator('#clear').click();const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!,cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+20,y:r.y+20,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(pad).toHaveAttribute('data-pointers','0');await expect(page.locator('[data-track="0"] .count')).toHaveText('0 / 16');
 await page.mouse.move(r.x+20,r.y+20);await page.mouse.down();await expect(pad).toHaveAttribute('data-input','holding');await page.locator('#clear').evaluate((b:HTMLButtonElement)=>b.click());await page.mouse.up();await expect(page.locator('[data-track="0"] .count')).toHaveText('0 / 16');
});

test('keyboard taps and holds work in three-quarter meter without changing the dance foundation',async({page})=>{
 await page.goto('/de/');await page.locator('[data-dance=viennese]').click();const pad=page.locator('#drawing');
 const before=await page.locator('.instrument').evaluateAll(rows=>rows.slice(0,4).map(row=>Array.from(row.querySelectorAll('[data-step]')).map(b=>b.getAttribute('aria-pressed'))));
 await pad.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.down(' ');await page.waitForTimeout(1100);await page.keyboard.up(' ');
 expect(await page.locator('.instrument').evaluateAll(rows=>rows.slice(0,4).map(row=>Array.from(row.querySelectorAll('[data-step]')).map(b=>b.getAttribute('aria-pressed'))))).toEqual(before);
 await expect(pad).toHaveAttribute('data-pointers','0');await expect(page.locator('#meter-value')).toHaveText('3/4');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});

for(const lang of ['de','en','es','fr'])test('gesture guidance and reduced motion stay accessible '+lang,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/'+lang+'/');
 const pad=page.locator('#drawing');await expect(pad).toHaveAttribute('tabindex','0');await expect(page.locator('#gesture-help')).not.toBeEmpty();await expect(page.locator('#gesture-keyboard')).not.toBeEmpty();
 await pad.focus();await page.keyboard.press('Enter');await expect(pad).toHaveAttribute('data-pointers','0');expect(Number(await pad.getAttribute('data-rings'))).toBeGreaterThan(0);
});

test('two held contacts work during Random Play and style changes cancel them safely',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await page.locator('#clear').click();await page.locator('#evolve').click();
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!,cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width*.15,y:r.y+r.height*.02,id:1},{x:r.x+r.width*.6,y:r.y+r.height*.53,id:2}]});
 await expect(pad).toHaveAttribute('data-input','holding');await page.waitForTimeout(800);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-track="0"] [data-step="6"]')).toHaveAttribute('aria-pressed','true');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(pad).toHaveAttribute('data-pointers','0');await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();await pad.scrollIntoViewIfNeeded();const next=(await pad.boundingBox())!;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:next.x+40,y:next.y+40,id:3}]});
 await page.locator('[data-style-preset=jazz]').evaluate((b:HTMLButtonElement)=>b.click());await expect(pad).toHaveAttribute('data-pointers','0');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('[data-style-preset=jazz]')).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});
