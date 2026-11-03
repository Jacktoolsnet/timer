import {ORBIT_OUTER_RADIUS,orbitRadius,ORBIT_COUNT,orbitHitTolerance,ORBIT_HIT_RADIUS} from '../src/lib/orbit-layout';
import {test,expect,type Page} from '@playwright/test';
async function tapOrbit(page:Page,x:number,y:number){
 const orbit=page.locator('#orbit');await orbit.scrollIntoViewIfNeeded();const b=(await orbit.boundingBox())!;
 if(test.info().project.name==='mobile')await page.touchscreen.tap(b.x+x/700*b.width,b.y+y/700*b.height);
 else await orbit.click({position:{x:x/700*b.width,y:y/700*b.height}});
}
async function tapFreeOrbit(page:Page){
 const a=-Math.PI/2+Math.PI/16;
 await tapOrbit(page,350+Math.cos(a)*200,350+Math.sin(a)*200);
}
test('free inner orbit space cycles the three styles without editing notes, centre or background',async({page})=>{
 await page.goto('/de/');const before=await page.locator('.steps button[aria-pressed=true]').count();
 for(const mode of ['dot','pulse','comet']){
  await tapFreeOrbit(page);
  await expect(page.locator('[data-orbit-mode='+mode+']')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#orbit')).toHaveAttribute('data-mode',mode);
 }
 expect(await page.locator('.steps button[aria-pressed=true]').count()).toBe(before);
 await expect(page.locator('[data-center-mode=ring]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-background-mode=clouds]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('actual dots toggle only their note; tapping between dots on the same ring switches the animation',async({page})=>{
 await page.goto('/de/');const note=page.locator('[data-track="0"] [data-step="0"]'),before=await note.getAttribute('aria-pressed');
 await tapOrbit(page,350,350-ORBIT_OUTER_RADIUS);await expect(note).toHaveAttribute('aria-pressed',before==='true'?'false':'true');
 await expect(page.locator('[data-orbit-mode=comet]')).toHaveAttribute('aria-pressed','true');
 await tapOrbit(page,350,350-ORBIT_OUTER_RADIUS);await expect(note).toHaveAttribute('aria-pressed',before!);
 const angle=Math.PI/16-Math.PI/2;
 await tapOrbit(page,350+Math.cos(angle)*ORBIT_OUTER_RADIUS,350+Math.sin(angle)*ORBIT_OUTER_RADIUS);
 await expect(page.locator('[data-orbit-mode=dot]')).toHaveAttribute('aria-pressed','true');
 await expect(note).toHaveAttribute('aria-pressed',before!);
});
test('hidden orbit restarts on a free tap; random advances from its current style, also in focus mode',async({page})=>{
 await page.goto('/de/');await page.locator('[data-orbit-mode=off]').click();await tapFreeOrbit(page);
 await expect(page.locator('[data-orbit-mode=comet]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-orbit-mode=random]').click();const current=await page.locator('#orbit').getAttribute('data-mode');
 await page.locator('#play').click(); // Random animation choices may update when starting.
 const started=await page.locator('#orbit').getAttribute('data-mode');expect(current).toBeTruthy();
 await page.locator('#focus').click();await tapFreeOrbit(page);
 const modes=['comet','dot','pulse'];
 await expect(page.locator('[data-orbit-mode='+modes[(modes.indexOf(started!)+1)%3]+']')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('body')).toHaveClass(/focus-view/);
});

test('wider ring spacing preserves the centre, outer margins and distinct note hit areas',()=>{
 expect(orbitRadius(0,9)).toBe(316);expect(orbitRadius(8,9)).toBe(100);
 expect(orbitRadius(0,1)).toBe(316);
 for(let count=2;count<=ORBIT_COUNT;count++)for(let rank=1;rank<count;rank++){
  const spacing=orbitRadius(rank-1,count)-orbitRadius(rank,count);
  expect(spacing).toBeGreaterThanOrEqual(27);
  expect(orbitHitTolerance(count)*2).toBeLessThanOrEqual(spacing);
 }
 expect(orbitRadius(8,9)-orbitHitTolerance(9)).toBeGreaterThan(80);
 expect(ORBIT_OUTER_RADIUS+orbitHitTolerance(9)).toBeLessThan(ORBIT_HIT_RADIUS);
 expect(ORBIT_HIT_RADIUS).toBeLessThan(350);
});
test('all nine widened rings toggle their own note without changing centre or background',async({page})=>{
 await page.goto('/de/');
 // Isolate ring hit geometry from group-member targets, which intentionally toggle their parent.
 await page.locator('.instrument-select').evaluateAll(selects=>selects.forEach(select=>select.dispatchEvent(new Event('change',{bubbles:true}))));
 for(let index=0;index<ORBIT_COUNT;index++){
  const note=page.locator(`[data-track="${index}"] [data-step="8"]`),before=await note.getAttribute('aria-pressed');
  await tapOrbit(page,350,350+orbitRadius(index,ORBIT_COUNT));
  await expect(note).toHaveAttribute('aria-pressed',before==='true'?'false':'true');
 }
 await expect(page.locator('[data-center-mode=ring]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-background-mode=clouds]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-orbit-mode=comet]')).toHaveAttribute('aria-pressed','true');
});
