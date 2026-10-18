import { analogDesigns } from '../src/lib/analog-designs';
import { test, expect } from '@playwright/test';

test('analog designs have previews, preserve controls and support keyboard selection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/de/');
  const face = page.locator('#analog-clock');
  await expect(face).toHaveAttribute('data-design', 'standard');
  await expect(page.locator('#options-analogDesign [role=option] img')).toHaveCount(analogDesigns.length);
  await expect(page.locator('#trigger-analogDesign img')).toBeVisible();
  await page.locator('#trigger-analogDesign').click();
  await page.getByRole('option', { name:'Römisch', exact:true }).click();
  await expect(face).toHaveAttribute('data-design', 'roman');
  await expect(face.locator('text').last()).toHaveText('XII');
  await page.locator('input[name=numbers]').uncheck();
  await expect(face.locator('.dial-numerals')).toBeHidden();
  await page.locator('#trigger-analogDesign').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(face).toHaveAttribute('data-design', 'square-railway');
  await expect(face.locator('.dial-numerals')).toBeHidden();
  await page.locator('input[name=numbers]').check();
  await expect(face.locator('.dial-numerals')).toBeVisible();
  await page.locator('#trigger-analogDesign').click();
  await page.getByRole('option', { name:'Minimalistisch', exact:true }).click();
  await expect(face.locator('text')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('design selection persists only with preference consent', async ({ page }) => {
  await page.goto('/de/');
  await page.locator('#trigger-analogDesign').click();
  await page.getByRole('option', { name:'Römisch', exact:true }).click();
  await page.reload();
  await expect(page.locator('#analog-clock')).toHaveAttribute('data-design', 'standard');
  await page.locator('#trigger-analogDesign').click();
  await page.getByRole('option', { name:'Römisch', exact:true }).click();
  await page.locator('#palette-dropdown summary').click();
  await page.locator('#remember-preferences').check();
  await page.reload();
  await expect(page.locator('#analog-clock')).toHaveAttribute('data-design', 'roman');
});


test('rounded square variants use matching previews and preserve numeral controls', async ({ page }) => {
  await page.goto('/de/');
  for(const design of analogDesigns.filter(id=>id.startsWith('square-'))) {
    await page.locator('#trigger-analogDesign').click();
    await page.locator('#options-analogDesign [role=option]').nth(analogDesigns.indexOf(design)).click();
    const face=page.locator('#analog-clock');
    await expect(face).toHaveAttribute('data-design',design);
    await expect(face.locator('rect.dial')).toHaveAttribute('rx','30');
    await expect(face.locator('text')).toHaveCount(design==='square-minimal'?4:12);
    if(design==='square-roman')await expect(face.locator('text').last()).toHaveText('XII');
    const preview=await page.locator('#trigger-analogDesign img').getAttribute('src');
    expect(decodeURIComponent(preview!)).toContain('data-design="'+design+'"');
    expect(decodeURIComponent(preview!)).toContain('rx="30"');
    await page.locator('input[name=numbers]').uncheck();
    await expect(face.locator('.dial-numerals')).toBeHidden();
    await page.locator('input[name=numbers]').check();
  }
});
