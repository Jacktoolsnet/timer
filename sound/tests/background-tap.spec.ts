import {test,expect,type Page} from '@playwright/test';
async function tapBackground(page:Page,touch=false){
 const orbit=page.locator('#orbit'),b=(await orbit.boundingBox())!;
 // Transparent canvas corner, safely outside the circular orbit and its note targets.
 if(touch)await page.touchscreen.tap(b.x+8,b.y+8);
 else await orbit.click({position:{x:8,y:8}});
}
test('outside taps cycle backgrounds without changing centre, notes or playback',async({page})=>{
 await page.goto('/de/');const notes=await page.locator('.steps button[aria-pressed=true]').count();
 for(const mode of ['aurora','stars','waves','clouds']){
  await tapBackground(page,test.info().project.name==='mobile');
  await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode',mode);
  await expect(page.locator('[data-background-mode='+mode+']')).toHaveAttribute('aria-pressed','true');
 }
 expect(await page.locator('.steps button[aria-pressed=true]').count()).toBe(notes);
 await expect(page.locator('[data-center-mode=ring]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('free app background cycles even with hidden orbit and background, including focus view',async({page})=>{
 await page.goto('/de/');await page.locator('[data-background-mode=off]').click();await page.locator('[data-orbit-mode=off]').click();
 const app=page.locator('#sound-app'),bounds=(await app.boundingBox())!;await app.click({position:{x:bounds.width/2,y:8}});
 await expect(page.locator('[data-background-mode=clouds]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();await page.locator('#focus').click();await tapBackground(page);
 await expect(page.locator('[data-background-mode=aurora]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('body')).toHaveClass(/focus-view/);
});
test('drawing, controls, centre, orbit notes and secondary clicks do not change the background',async({page})=>{
 await page.goto('/de/');await page.locator('#drawing').click();await page.locator('[data-pad-mode=rhythm]').click();
 const orbit=page.locator('#orbit'),b=(await orbit.boundingBox())!;
 await orbit.click({position:{x:b.width/2,y:b.height/2}});
 await orbit.click({position:{x:b.width/2,y:50/700*b.height}}); // Outermost orbit note
 await orbit.click({button:'right',position:{x:8,y:8}});await page.keyboard.press('Escape');
 await expect(page.locator('[data-background-mode=clouds]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-background-mode=random]').click();
 const current=await page.locator('#sound-atmosphere').getAttribute('data-mode'),modes=['clouds','aurora','stars','waves'];
 await tapBackground(page);
 await expect(page.locator('[data-background-mode='+modes[(modes.indexOf(current!)+1)%4]+']')).toHaveAttribute('aria-pressed','true');
});
