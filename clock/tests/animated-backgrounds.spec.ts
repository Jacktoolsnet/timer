import {test,expect} from '@playwright/test';
import {clockBackgrounds} from '../src/lib/clock-backgrounds';

test('every static motif animates only its scene and pauses when the page is hidden',async({page})=>{
 await page.goto('/de/');
 for(const id of clockBackgrounds.filter(id=>id!=='aurora')){
  await page.locator('#trigger-background').click();await page.locator('#options-background [role=option]').nth(clockBackgrounds.indexOf(id)+1).click();
  const toggle=page.locator('input[name=animateBackground]');await expect(toggle).toBeVisible();await toggle.check();
  const scene=page.locator(`#animated-background-${id}`);await expect(scene).toBeVisible();
  await expect(page.locator('.animated-background-scene[data-active=true],#animated-aurora[data-active=true]')).toHaveCount(1);
  expect(await scene.evaluate(el=>el.getAnimations({subtree:true}).length),id).toBeGreaterThan(0);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  expect(await scene.evaluate(el=>el.getAnimations({subtree:true}).every(animation=>animation.playState==='paused')),id).toBeTruthy();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await toggle.uncheck();await expect(scene).toBeHidden();
  expect(await page.locator('.clock-card').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain(`/backgrounds/${id}.svg`);
 }
 const ids=await page.locator('[id]').evaluateAll(elements=>elements.map(el=>el.id));expect(new Set(ids).size).toBe(ids.length);
});
test('reduced motion keeps all static motifs static and seasonal simulation stays separate',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/de/');
 for(const id of clockBackgrounds){
  await page.locator('#trigger-background').click();await page.locator('#options-background [role=option]').nth(clockBackgrounds.indexOf(id)+1).click();
  await page.locator('input[name=animateBackground]').check();
  await expect(page.locator('.animated-background-scene[data-active=true],#animated-aurora[data-active=true]')).toHaveCount(0);
 }
 await page.locator('#trigger-background').click();await page.locator('#options-background [role=option]').last().click();
 await expect(page.locator('input[name=animateBackground]')).toBeHidden();await expect(page.locator('#seasonal-background')).toBeVisible();
});
