import {test,expect,type Page} from '@playwright/test';
async function tapOrbit(page:Page,x:number,y:number){
 const orbit=page.locator('#orbit');await orbit.scrollIntoViewIfNeeded();const b=(await orbit.boundingBox())!;
 if(test.info().project.name==='mobile')await page.touchscreen.tap(b.x+x/700*b.width,b.y+y/700*b.height);
 else await orbit.click({position:{x:x/700*b.width,y:y/700*b.height}});
}
test('free inner orbit space cycles the three styles without editing notes, centre or background',async({page})=>{
 await page.goto('/de/');const before=await page.locator('.steps button[aria-pressed=true]').count();
 for(const mode of ['dot','pulse','comet']){
  await tapOrbit(page,450,350);
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
 await tapOrbit(page,350,50);await expect(note).toHaveAttribute('aria-pressed',before==='true'?'false':'true');
 await expect(page.locator('[data-orbit-mode=comet]')).toHaveAttribute('aria-pressed','true');
 await tapOrbit(page,350,50);await expect(note).toHaveAttribute('aria-pressed',before!);
 const angle=Math.PI/16-Math.PI/2;
 await tapOrbit(page,350+Math.cos(angle)*300,350+Math.sin(angle)*300);
 await expect(page.locator('[data-orbit-mode=dot]')).toHaveAttribute('aria-pressed','true');
 await expect(note).toHaveAttribute('aria-pressed',before!);
});
test('hidden orbit restarts on a free tap; random advances from its current style, also in focus mode',async({page})=>{
 await page.goto('/de/');await page.locator('[data-orbit-mode=off]').click();await tapOrbit(page,450,350);
 await expect(page.locator('[data-orbit-mode=comet]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-orbit-mode=random]').click();const current=await page.locator('#orbit').getAttribute('data-mode');
 await page.locator('#play').click(); // Random animation choices may update when starting.
 const started=await page.locator('#orbit').getAttribute('data-mode');expect(current).toBeTruthy();
 await page.locator('#focus').click();await tapOrbit(page,450,350);
 const modes=['comet','dot','pulse'];
 await expect(page.locator('[data-orbit-mode='+modes[(modes.indexOf(started!)+1)%3]+']')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('body')).toHaveClass(/focus-view/);
});
