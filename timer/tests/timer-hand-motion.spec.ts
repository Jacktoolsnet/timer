import {test,expect} from '@playwright/test';
for(const route of ['/de/','/de/pomodoro/','/de/training/']) {
 test(`second hand sweeps by default and can tick on ${route}`,async({page})=>{
  await page.goto(route);
  await page.clock.install();
  await page.locator('#trigger-timerView').click();
  await page.getByRole('option',{name:'Analog',exact:true}).click();
  const toggle=page.getByRole('switch',{name:'Fließender Sekundenzeiger',exact:true});
  await expect(toggle).toBeChecked();
  await expect(page.locator('.behavior-options input[name=smooth]')).toHaveCount(1);
  await toggle.uncheck();
  await page.locator('#start, #training-start').click();
  const hand=page.locator('.timer-second-hand');
  const initial=await hand.getAttribute('transform');
  await page.clock.runFor(300);
  await expect(hand).toHaveAttribute('transform',initial!);
  await page.clock.runFor(700);
  await expect(hand).not.toHaveAttribute('transform',initial!);
  await toggle.check();
  const before=await hand.getAttribute('transform');
  await page.clock.runFor(150);
  await expect(hand).not.toHaveAttribute('transform',before!);
  await page.locator('#start, #training-start').click();
  const paused=await hand.getAttribute('transform');
  await page.clock.runFor(500);
  await expect(hand).toHaveAttribute('transform',paused!);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(async()=>{
   const reduced=await hand.getAttribute('transform');
   return Number(reduced!.match(/rotate\(([^ ]+)/)![1])%6;
  }).toBe(0);
 });
}

test('hand movement defaults on and stores an explicit off choice only with consent',async({page})=>{
 await page.goto('/de/');
 const toggle=page.locator('input[name=smooth]');
 await expect(toggle).toBeChecked();
 await toggle.uncheck();
 await page.reload();
 await expect(toggle).toBeChecked();
 await toggle.uncheck();
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(toggle).not.toBeChecked();
});
