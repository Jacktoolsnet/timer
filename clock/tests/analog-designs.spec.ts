import {selectDialDesign} from './helpers/dial-design';
import { analogDesigns } from '../src/lib/analog-designs';
import { test, expect } from '@playwright/test';

test.beforeEach(async({page})=>{await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));});

test('analog designs have previews, preserve controls and support keyboard selection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/de/');
  const face = page.locator('#analog-clock');
  await expect(face).toHaveAttribute('data-design', 'standard');
  await expect(page.locator('#options-dialStyle [role=option] img')).toHaveCount(4);
  await expect(page.locator('#trigger-dialStyle img')).toBeVisible();
  await page.locator('#trigger-dialStyle').click();
  await page.getByRole('option', { name:'Römisch', exact:true }).click();
  await expect(face).toHaveAttribute('data-design', 'roman');
  await expect(face.locator('text').last()).toHaveText('XII');
  await page.locator('input[name=numbers]').uncheck();
  await expect(face.locator('.dial-numerals')).toBeHidden();
  await page.locator('#trigger-dialShape').focus();
  await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');
  await expect(face).toHaveAttribute('data-design','square-roman');
  await page.locator('#trigger-dialStyle').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(face).toHaveAttribute('data-design', 'square-railway');
  await expect(face.locator('.dial-numerals')).toBeHidden();
  await page.locator('input[name=numbers]').check();
  await expect(face.locator('.dial-numerals')).toBeVisible();
  await page.locator('#trigger-dialStyle').click();
  await page.getByRole('option', { name:'Minimalistisch', exact:true }).click();
  await expect(face.locator('text')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('design selection persists only with preference consent', async ({ page }) => {
  await page.goto('/de/');
  await page.locator('#trigger-dialStyle').click();
  await page.getByRole('option', { name:'Römisch', exact:true }).click();
  await page.reload();
  await expect(page.locator('#analog-clock')).toHaveAttribute('data-design', 'standard');
  await page.locator('#trigger-dialStyle').click();
  await page.getByRole('option', { name:'Römisch', exact:true }).click();
  await page.locator('#palette-dropdown summary').click();
  await page.locator('#remember-preferences').check();
  await page.reload();
  await expect(page.locator('#analog-clock')).toHaveAttribute('data-design', 'roman');
});


test('rounded square variants use matching previews and preserve numeral controls', async ({ page }) => {
  await page.goto('/de/');
  for(const design of analogDesigns.filter(id=>id.startsWith('square-'))) {
    await selectDialDesign(page,design);
    const face=page.locator('#analog-clock');
    await expect(face).toHaveAttribute('data-design',design);
    await expect(face.locator('rect.dial')).toHaveAttribute('rx','30');
    await expect(face.locator('text')).toHaveCount(design==='square-minimal'?4:12);
    if(design==='square-roman')await expect(face.locator('text').last()).toHaveText('XII');
    const preview=await page.locator('#trigger-dialStyle img').getAttribute('src');
    expect(decodeURIComponent(preview!)).toContain('data-design="'+design+'"');
    expect(decodeURIComponent(preview!)).toContain('rx="30"');
    await page.locator('input[name=numbers]').uncheck();
    await expect(face.locator('.dial-numerals')).toBeHidden();
    await page.locator('input[name=numbers]').check();
  }
});

test('dial selectors only appear for supported views, without resetting the design',async({page})=>{
 await page.goto('/de/');await selectDialDesign(page,'square-roman');
 for(const [view,label,visible] of [
  ['binary','Binär',false],['binaryDigital','Binär + Digital',false],['binaryFlip','Binär + Klappzahlen',false],
  ['digital','Digital',false],['flip','Klappzahlen',false],['orbit','Orbit-Uhr',true],['sundial','Sonnenuhr',true],
  ['combined','Analog + Digital',true],['analogFlip','Analog + Klappzahlen',true],['analog','Analog',true],
 ] as const){
  await page.locator('#trigger-view').click();await page.getByRole('option',{name:label,exact:true}).click();
  await expect(page.locator('#clock-dial-options')).toBeVisible({visible});
  await expect(page.locator('select[name=analogDesign]')).toHaveValue('square-roman');
  if(visible){
   await expect(page.locator('#trigger-dialShape')).toContainText('Eckig');await expect(page.locator('#trigger-dialStyle')).toContainText('Römisch');
   for(const img of await page.locator('#options-dialStyle img').all())expect(decodeURIComponent((await img.getAttribute('src'))!)).toContain('square-');
  }
 }
});
test('legacy combined settings restore the separate shape and style selectors',async({page})=>{
 await page.goto('/de/');await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();
 await page.evaluate(()=>localStorage.setItem('jacktools.clock.settings.v1',JSON.stringify({analogDesign:'square-minimal',view:'orbit'})));
 await page.reload();await expect(page.locator('#orbit-clock')).toHaveAttribute('data-design','square-minimal');
 await expect(page.locator('#trigger-dialShape')).toContainText('Eckig');await expect(page.locator('#trigger-dialStyle')).toContainText('Minimalistisch');
});
