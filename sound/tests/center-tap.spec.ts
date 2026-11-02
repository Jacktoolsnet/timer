import {test,expect,type Page} from '@playwright/test';
async function tapCenter(page:Page,touch=false){
 const orbit=page.locator('#orbit'),b=(await orbit.boundingBox())!;
 if(touch)await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
 else await orbit.click({position:{x:b.width/2,y:b.height/2}});
}
test('centre taps cycle the five concrete animations in tile order without changing notes or transport',async({page})=>{
 await page.goto('/de/');
 const before=await page.locator('.steps button[aria-pressed=true]').count();
 for(const mode of ['filled','sun','sine','bars','ring']){
  await tapCenter(page,test.info().project.name==='mobile');
  await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant',mode);
  await expect(page.locator('[data-center-mode='+mode+']')).toHaveAttribute('aria-pressed','true');
 }
 expect(await page.locator('.steps button[aria-pressed=true]').count()).toBe(before);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('centre remains interactive with orbit hidden, centre off and no enabled tracks; random becomes a fixed next variant',async({page})=>{
 await page.goto('/de/');await page.locator('[data-orbit-mode=off]').click();
 await page.locator('[data-center-mode=off]').click();
 for(const toggle of await page.locator('.track-enabled').all())await toggle.evaluate((input:HTMLInputElement)=>{input.checked=false;input.dispatchEvent(new Event('change'));});
 await tapCenter(page);await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','ring');
 await page.locator('[data-center-mode=random]').click();
 const mode=await page.locator('#orbit').getAttribute('data-center-variant'),variants=['ring','filled','sun','sine','bars'];
 await tapCenter(page);await expect(page.locator('[data-center-mode='+variants[(variants.indexOf(mode!)+1)%5]+']')).toHaveAttribute('aria-pressed','true');
});
test('right clicks do not change the centre; focus-mode tapping keeps playback running',async({page})=>{
 await page.goto('/de/');const orbit=page.locator('#orbit'),b=(await orbit.boundingBox())!;
 await orbit.click({button:'right',position:{x:b.width/2,y:b.height/2}});
 await expect(page.locator('[data-center-mode=ring]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');await page.locator('#play').click();await page.locator('#focus').click();
 await tapCenter(page);await expect(orbit).toHaveAttribute('data-center-variant','filled');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('body')).toHaveClass(/focus-view/);
});
