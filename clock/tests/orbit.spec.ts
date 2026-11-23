import { test, expect } from '@playwright/test';

test('orbit view uses zoned time, supports smooth seconds and preserves preferences', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-23T10:20:30.500Z') });
  await page.goto('/de/');
  await page.clock.pauseAt(new Date('2026-11-23T10:21:30.500Z'));
  await page.locator('#trigger-view').click();
  await page.getByRole('option', { name: 'Orbit-Uhr', exact: true }).click();
  await expect(page.locator('#orbit-clock')).toBeVisible();
  await expect(page.locator('#orbit-clock .orbit-sun-core')).toBeVisible();
  await expect(page.locator('#orbit-clock .orbit-sun-ray')).toHaveCount(8);
  await expect(page.locator('#analog-clock')).toBeHidden();
  await expect(page.locator('#flip-clock')).toBeHidden();
  await expect(page.locator('#orbit-second circle')).toHaveAttribute('cy', '268');
  await page.locator('input[name=smooth]').check();
  await page.clock.runFor(100);
  const angle = await page.locator('#orbit-second circle').getAttribute('cx');
  expect(Number(angle)).not.toBeCloseTo(160, 3);
  await page.locator('input[name=seconds]').uncheck();
  await expect(page.locator('.orbit-second')).toBeHidden();
  await expect(page.locator('.orbit-minute')).toBeVisible();
  await page.locator('#palette-dropdown summary').click();
  await page.locator('#remember-preferences').check();
  await page.reload();
  await expect(page.locator('#orbit-clock')).toBeVisible();
  await expect(page.locator('input[name=smooth]')).toBeChecked();
  await expect(page.locator('.orbit-second')).toBeHidden();
});

test('reduced motion keeps orbit seconds discrete', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-23T10:20:30.500Z') });
  await page.goto('/en/');
  await page.clock.pauseAt(new Date('2026-11-23T10:21:30.500Z'));
  await page.locator('#trigger-view').click();
  await page.getByRole('option', { name: 'Orbit clock', exact: true }).click();
  await page.locator('input[name=smooth]').check();
  await page.clock.runFor(100);
  await expect(page.locator('#orbit-second circle')).toHaveAttribute('cy', '268');
});


test('orbit inherits all dial designs, numerals and square trajectories', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-23T10:20:07.500Z') });
  await page.goto('/de/');
  await page.clock.pauseAt(new Date('2026-11-23T10:21:07.500Z'));
  await page.locator('#trigger-view').click();
  await page.getByRole('option', { name: 'Orbit-Uhr', exact: true }).click();
  const face=page.locator('#orbit-clock');
  await expect(face.locator('circle.dial')).toBeVisible();
  await expect(face.locator('.dial-numerals text')).toHaveCount(12);
  await expect(face.locator('.dial-numerals text').last()).toHaveAttribute('y','34');
  const point=face.locator('#orbit-second circle');
  const x=Number(await point.getAttribute('cx')), y=Number(await point.getAttribute('cy'));
  expect(Math.hypot(x-160,y-160)).toBeCloseTo(108,5);
  const roundX=Number(await face.locator('#orbit-second circle').getAttribute('cx'));
  await page.locator('#trigger-analogDesign').click();
  await page.getByRole('option', { name:'Römisch · Eckig', exact:true }).click();
  await expect(face).toHaveAttribute('data-design','square-roman');
  await expect(face.locator('rect.dial')).toBeVisible();
  await expect(face.locator('.dial-numerals text').last()).toHaveText('XII');
  expect(Number(await face.locator('#orbit-second circle').getAttribute('cx'))).toBeGreaterThan(roundX);
  await page.locator('input[name=numbers]').uncheck();
  await expect(face.locator('.dial-numerals')).toBeHidden();
  await page.locator('#trigger-analogDesign').click();
  await page.getByRole('option', { name:'Minimalistisch', exact:true }).click();
  await expect(face.locator('.dial-numerals text')).toHaveCount(4);
  await expect(face.locator('.dial-numerals')).toBeHidden();
  await page.locator('input[name=numbers]').check();
  await expect(face.locator('.dial-numerals')).toBeVisible();
});
