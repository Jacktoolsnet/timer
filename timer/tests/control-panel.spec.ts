import {test,expect} from '@playwright/test';
for(const route of ['/de/','/de/pomodoro/','/de/training/']){
 test(`control panel spacing and transparency on ${route}`,async({page},info)=>{
  await page.goto(route);
  await page.locator('#trigger-background').click();
  await page.getByRole('option',{name:'Küche',exact:true}).click();
  const panel=page.locator('.focus-details');
  const background=()=>panel.evaluate(el=>getComputedStyle(el).backgroundColor);
  const opaque=await background();
  await page.locator('#timer-transparency').fill('50');
  expect(await background()).not.toBe(opaque);
  await page.locator('#timer-transparency').fill('100');
  expect(await panel.evaluate(el=>getComputedStyle(el).backgroundColor)).toMatch(/(?:\/ 0\)|, 0\))/);
  const buttons=page.locator('.timer-controls button');
  const bounds=await buttons.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(const box of bounds){expect(box.h).toBeGreaterThanOrEqual(48);expect(box.y).toBe(bounds[0].y);}
  for(let i=1;i<bounds.length;i++)expect(bounds[i].x-bounds[i-1].x-bounds[i-1].w).toBeCloseTo(10,0);
  await page.locator('#timer-transparency').fill('40');
  await page.screenshot({path:`/tmp/timer-controls-${info.project.name}-${route.includes('training')?'interval':route.includes('pomodoro')?'pomodoro':'countdown'}.png`,fullPage:true});
  await page.locator('#focus-view, #training-focus').click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement!==null)).toBeTruthy();
  expect(await background()).not.toBe(opaque);
  await expect(page.locator('.timer-controls')).toBeVisible();
 });
}
