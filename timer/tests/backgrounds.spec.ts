import {test,expect} from '@playwright/test';
import {timerBackgrounds} from '../src/lib/timer-backgrounds';
for(const route of ['/de/','/de/pomodoro/','/de/training/']){
 test(`timer backgrounds and transparency on ${route}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(route);
  const card=page.locator('.timer-card');
  await expect(card).toHaveAttribute('data-background','none');
  await expect(page.locator('#timer-transparency-field')).toBeHidden();
  for(const id of timerBackgrounds){
   expect((await page.request.get(`/backgrounds/${id}.svg`)).ok()).toBeTruthy();
   await page.locator('#trigger-background').click();
   await page.locator('#options-background [role=option]').nth(timerBackgrounds.indexOf(id)+1).click();
   await expect(card).toHaveAttribute('data-background',id);
   await expect(page.locator('#trigger-background img')).toHaveAttribute('src',`/backgrounds/${id}.svg`);
  }
  await page.locator('#timer-transparency').fill('65');
  await expect(page.locator('#timer-transparency-value')).toHaveText('65 %');
  expect(await card.evaluate(el=>getComputedStyle(el).getPropertyValue('--timer-display-opacity'))).toBe('35%');
  await page.locator('#trigger-timerView').click();
  await page.getByRole('option',{name:'Analog + Digital',exact:true}).click();
  await expect(page.locator('#analog-timer')).toBeVisible();
  await page.locator('#focus-view, #training-focus').click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement!==null)).toBeTruthy();
  expect(await card.evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('/backgrounds/tea.svg');
  await page.locator('#focus-view, #training-focus').click();
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBeTruthy();
  await expect(page.locator('body')).not.toHaveClass(/focus-view/);
  await page.locator('#trigger-background').focus();
  await page.locator('#trigger-background').press('ArrowDown');
  await page.getByRole('option',{name:'Keiner',exact:true}).click();
  await expect(page.locator('#timer-transparency-field')).toBeHidden();
  expect(await card.evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
  expect(errors).toEqual([]);
 });
}

test('background persistence and invalid saved values',async({page})=>{
 await page.goto('/de/');
 await page.locator('#trigger-background').click();
 await page.getByRole('option',{name:'Küche',exact:true}).click();
 await page.reload();
 await expect(page.locator('.timer-card')).toHaveAttribute('data-background','none');
 await page.locator('#trigger-background').click();
 await page.getByRole('option',{name:'Fokus-Schreibtisch',exact:true}).click();
 await page.locator('#timer-transparency').fill('40');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('.timer-card')).toHaveAttribute('data-background','desk');
 await expect(page.locator('#timer-transparency')).toHaveValue('40');
 await page.evaluate(()=>localStorage.setItem('jacktools.timer.display.v1',JSON.stringify({background:'invalid',transparency:999})));
 await page.reload();
 await expect(page.locator('.timer-card')).toHaveAttribute('data-background','none');
 await expect(page.locator('#timer-transparency')).toHaveValue('0');
});

test('background layout preview',async({page},info)=>{
 await page.goto('/de/');
 await page.locator('#trigger-background').click();
 await page.getByRole('option',{name:'Küche',exact:true}).click();
 await page.screenshot({path:`/tmp/timer-background-${info.project.name}.png`,fullPage:true});
});
