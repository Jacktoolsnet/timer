import {test,expect} from '@playwright/test';

test('countdown switches to minute labels below one hour',async({page})=>{
 await page.goto('/de/');
 await page.clock.install();
 await page.locator('input[name=hours]').fill('1');
 await page.locator('input[name=minutes]').fill('0');
 await page.locator('.apply-button').click();
 await page.locator('#trigger-timerView').click();
 await page.getByRole('option',{name:'Analog',exact:true}).click();
 const face=page.locator('#analog-timer');
 await expect(face).toHaveAttribute('data-scale','hours');
 await expect(face.locator('text').last()).toHaveText('12');
 await page.locator('#start').click();
 await page.clock.runFor(1000);
 await expect(face).toHaveAttribute('data-scale','minutes');
 await expect(face.locator('text').first()).toHaveText('5');
 await expect(face.locator('text').last()).toHaveText('60');
 await expect(face.locator('.timer-hour-hand')).toHaveCSS('display','none');
 await page.locator('#trigger-analogDesign').click();
 await page.getByRole('option',{name:'Römisch · Eckig',exact:true}).click();
 await expect(face.locator('text').first()).toHaveText('V');
 await expect(face.locator('text').last()).toHaveText('LX');
 await page.locator('input[name=hours]').fill('15');
 await page.locator('.apply-button').click();
 await expect(face).toHaveAttribute('data-scale','hours');
 await expect(face.locator('text').first()).toHaveText('XIII');
 await expect(face.locator('.timer-hour-hand')).not.toHaveCSS('display','none');
});

for(const route of ['/de/pomodoro/','/de/training/']){
 test(`short phases use minute scale on ${route}`,async({page})=>{
  await page.goto(route);
  await page.locator('#trigger-timerView').click();
  await page.getByRole('option',{name:'Analog + Digital',exact:true}).click();
  await expect(page.locator('#analog-timer')).toHaveAttribute('data-scale','minutes');
  await expect(page.locator('#analog-timer text').last()).toHaveText('60');
 });
}
