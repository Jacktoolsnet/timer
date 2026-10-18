import {test,expect} from '@playwright/test';
for(const route of ['/de/','/de/pomodoro/','/de/training/']) {
 test(`full-width timer with grouped options on ${route}`,async({page})=>{
  await page.goto(route);
  const workspace=await page.locator('.timer-workspace').boundingBox();
  const timer=await page.locator('.timer-card').boundingBox();
  const options=await page.locator('.timer-options').boundingBox();
  expect(Math.abs(timer!.width-workspace!.width)).toBeLessThan(2);
  expect(options!.y).toBeGreaterThanOrEqual(timer!.y+timer!.height);
  const groups=page.locator('.timer-options-group');
  await expect(groups).toHaveCount(3);
  const boxes=await Promise.all([0,1,2].map(i=>groups.nth(i).boundingBox()));
  if(page.viewportSize()!.width>900){
   // Fieldset legends protrude slightly above the panel top.
   expect(Math.abs(boxes[0]!.y-boxes[1]!.y)).toBeLessThan(20);
   expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x);
   expect(boxes[2]!.x).toBeGreaterThan(boxes[1]!.x);
  }else{
   expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y+boxes[0]!.height);
   expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y+boxes[1]!.height);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  const input=page.locator(route.includes('training')?'input[name=work]':route.includes('pomodoro')?'input[name=focus]':'input[name=minutes]');
  await input.fill('2');
  await page.locator('.apply-button').click();
  await expect(page.locator(route.includes('training')?'#training-time':'#time')).toHaveText(route.includes('training')?'00:10':route.includes('pomodoro')?'2':'02:00');
  await page.locator('#focus-view, #training-focus').click();
  await expect(page.locator('.timer-options')).toBeHidden();
 });
}
