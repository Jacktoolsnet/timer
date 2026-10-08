import { test, expect } from '@playwright/test';
test('homepage, preferences, opt-in and legal links', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Möglichkeiten');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'green');
  await expect(page.locator('html')).toHaveAttribute('data-style', 'technical');
  await expect(page.locator('.message-art .message-marker')).toHaveCount(3);
  await expect(page.locator('.marker-message')).toHaveAttribute('src', '/markers/message-marker.svg');
  await expect(page.locator('.brand-icon img')).toHaveAttribute('src', '/jacktools-icon.png');
  await expect(page.locator('link[rel=icon]')).toHaveAttribute('href', '/jacktools-icon.png');
  await expect(page.getByRole('link', { name: 'Timer öffnen' })).toHaveAttribute('href', 'https://timer.jacktools.net/de/');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByLabel('Einstellungen', { exact: true }).click();
  await page.locator('#theme').click();
  await page.locator('[name=colorScheme][value=blue]').check();
  await page.locator('[name=visualStyle][value=technical]').check();
  await page.locator('#font-size').fill('3');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'blue');
  await expect(page.locator('html')).toHaveAttribute('data-style', 'technical');
  await expect(page.locator('html')).toHaveAttribute('data-font-size', '3');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.locator('#remember-preferences').check();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-font-size', '3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const [path, heading] of [['/impressum/', 'Impressum'], ['/datenschutz/', 'Datenschutz'], ['/nutzungshinweise/', 'Nutzungshinweise']]) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveText(heading);
    await expect(page.locator('html')).toHaveAttribute('data-style', 'technical');
  }
  await page.locator('#privacy-open').click();
  await page.locator('#clear-storage').click();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-font-size', '0');
  expect(errors).toEqual([]);
});
test('settings keyboard and non-persisted appearance', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Einstellungen', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#palette-dropdown')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('#palette-dropdown')).not.toHaveAttribute('open');
  await page.getByLabel('Einstellungen', { exact: true }).click();
  await page.locator('#theme').click();
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});

 test('timer and clock cards stack preview above copy', async ({ page }) => {
  await page.goto('/');
  for (const card of await page.locator('.timer-feature').all()) {
    const preview = await card.locator('.timer-preview').boundingBox();
    const copy = await card.locator('.product-copy').boundingBox();
    expect(preview).not.toBeNull();
    expect(copy).not.toBeNull();
    expect(preview!.y + preview!.height).toBeLessThanOrEqual(copy!.y + 1);
  }
});

test('timer and clock are adjacent on desktop and stacked on mobile', async ({ page }) => {
  await page.goto('/');
  const timer = await page.locator('.time-tools-grid > .timer-feature').nth(0).boundingBox();
  const clock = await page.locator('.clock-feature').boundingBox();
  if (page.viewportSize()!.width > 760) {
    expect(Math.abs(timer!.y - clock!.y)).toBeLessThan(1);
    expect(clock!.x).toBeGreaterThanOrEqual(timer!.x + timer!.width);
  } else {
    expect(clock!.y).toBeGreaterThanOrEqual(timer!.y + timer!.height);
  }
});

test('Relax card and random spotlight link to the new tool',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>.7;});
 await page.goto('/');
 await expect(page.locator('#company-spotlight')).toHaveAttribute('data-tool','relax');
 await expect(page.locator('#company-spotlight .text-link')).toHaveAttribute('href','https://relax.jacktools.net/de/');
 await expect(page.locator('#company-spotlight .company-relax-scene')).toBeVisible();
 await expect(page.getByRole('link',{name:'Relax öffnen'})).toHaveAttribute('href','https://relax.jacktools.net/de/');
 await expect(page.locator('.relax-feature .company-relax-scene')).toBeVisible();
 await expect(page.locator('.relax-feature')).toContainText('Lagerfeuer');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
