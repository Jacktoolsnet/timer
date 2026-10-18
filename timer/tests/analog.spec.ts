import {test,expect} from '@playwright/test';
import {analogDesigns} from '../../shared/analog-designs';

for(const route of ['/de/','/de/pomodoro/','/de/training/']) {
 test(`analog designs and countdown hands on ${route}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(route);
  await expect(page.locator('#analog-timer')).toBeHidden();
  await page.locator('#trigger-timerView').click();
  await page.getByRole('option',{name:'Analog',exact:true}).click();
  const face=page.locator('#analog-timer');
  await expect(face).toBeVisible();
  for(const design of analogDesigns){
   await page.locator('#trigger-analogDesign').click();
   await page.locator('#options-analogDesign [role=option]').nth(analogDesigns.indexOf(design)).click();
   await expect(face).toHaveAttribute('data-design',design);
   await expect(page.locator('#trigger-analogDesign img')).toBeVisible();
   if(design.startsWith('square-'))await expect(face.locator('rect.dial')).toHaveAttribute('rx','30');
  }
  const hand=face.locator('.timer-second-hand');
  const before=await hand.getAttribute('transform');
  await page.locator('#start, #training-start').click();
  await expect.poll(()=>hand.getAttribute('transform')).not.toBe(before);
  await page.locator('#start, #training-start').click();
  const paused=await hand.getAttribute('transform');
  await page.waitForTimeout(400);
  await expect(hand).toHaveAttribute('transform',paused!);
  await page.locator('#focus-view, #training-focus').click();
  await expect(face).toBeVisible();
  const bounds=await face.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.keyboard.press('Escape');
  await page.locator('#trigger-timerView').click();
  await page.getByRole('option',{name:'Digital',exact:true}).click();
  await expect(face).toBeHidden();
  expect(errors).toEqual([]);
 });
}

test('appearance persists only with consent',async({page})=>{
 await page.goto('/de/');
 await page.locator('#trigger-timerView').click();
 await page.getByRole('option',{name:'Analog',exact:true}).click();
 await page.reload();
 await expect(page.locator('#analog-timer')).toBeHidden();
 await page.locator('#trigger-timerView').click();
 await page.getByRole('option',{name:'Analog',exact:true}).click();
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#analog-timer')).toBeVisible();
 await page.goto('/de/training/');
 await expect(page.locator('#analog-timer')).toBeVisible();
});
