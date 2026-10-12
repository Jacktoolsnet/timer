import {test,expect,type Page} from '@playwright/test';
import {clockBackgrounds} from '../src/lib/clock-backgrounds';
async function select(page:Page,id:string){await page.locator('#trigger-background').click();await page.locator('#options-background [role=option]').nth(clockBackgrounds.indexOf(id as typeof clockBackgrounds[number])+1).click();}

test('aurora animation is opt-in, pauses when hidden and returns to static artwork',async({page})=>{
 await page.goto('/de/');const toggle=page.locator('input[name=animateBackground]'),scene=page.locator('#animated-aurora');
 await expect(toggle).toBeHidden();await select(page,'aurora');await expect(toggle).toBeVisible();await expect(toggle).not.toBeChecked();await expect(scene).toBeHidden();
 await toggle.check();await expect(scene).toBeVisible();
 expect(await scene.locator('.aurora-green').evaluate(el=>getComputedStyle(el).animationName)).toBe('aurora-green-drift');
 const dial=await page.locator('#analog-clock').boundingBox();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 expect(await scene.locator('.aurora-green').evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 expect(await scene.locator('.aurora-green').evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('running');
 expect(await page.locator('#analog-clock').boundingBox()).toEqual(dial);
 await toggle.uncheck();await expect(scene).toBeHidden();
 expect(await page.locator('.clock-card').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('/backgrounds/aurora.svg');
 await select(page,'sea');await expect(toggle).toBeVisible();await expect(scene).toBeHidden();
});
test('reduced motion uses static aurora even with the animation preference enabled',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/de/');await select(page,'aurora');await page.locator('input[name=animateBackground]').check();
 await expect(page.locator('#animated-aurora')).toBeHidden();
 expect(await page.locator('.clock-card').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('/backgrounds/aurora.svg');
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('#animated-aurora')).toBeVisible();
});
test('aurora animation preference only restores with storage consent',async({page})=>{
 await page.goto('/de/');await select(page,'aurora');await page.locator('input[name=animateBackground]').check();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.clock.settings.v1'))).toBeNull();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.reload();
 await expect(page.locator('input[name=animateBackground]')).toBeChecked();await expect(page.locator('#animated-aurora')).toBeVisible();
});
