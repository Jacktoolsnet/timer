import { test, expect } from '@playwright/test';
import { seasonalState } from '../src/lib/seasonal-background';

test('simulation uses selected zone, both hemispheres and four daily phases', () => {
  for (const [hour, phase] of [[2, 'night'], [7, 'morning'], [12, 'day'], [19, 'evening']] as const) {
    expect(seasonalState(new Date(`2026-04-01T${String(hour).padStart(2, '0')}:00:00Z`), 'UTC', 'north').phase).toBe(phase);
  }
  const now = new Date('2026-01-01T12:00:00Z');
  expect(seasonalState(now, 'UTC', 'north').season).toBe(0);
  expect(seasonalState(now, 'UTC', 'south').season).toBe(2);
  expect(seasonalState(now, 'Asia/Tokyo', 'north').phase).toBe('night');
  expect(seasonalState(new Date('2026-12-31T23:30:00Z'), 'Asia/Tokyo', 'north').season).toBe(0);
  expect(seasonalState(new Date('2028-02-29T12:00:00Z'), 'UTC', 'north').blend).toBeGreaterThan(0);
});

test('seasonal scene updates with time, hemisphere and background selection', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T07:00:00Z') });
  await page.goto('/de/');
  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>('select[name=zone]')!;
    select.value = 'UTC'; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#trigger-background').click();
  await page.locator('#options-background [role=option]').last().click();
  await expect(page.locator('#trigger-background img')).toHaveAttribute('src', '/backgrounds/seasonal-preview.svg');
  expect(await page.locator('#trigger-background img').evaluate(async el => {
    const image = el as HTMLImageElement; await image.decode(); return image.naturalWidth > 0;
  })).toBeTruthy();
  const scene = page.locator('#seasonal-background');
  await expect(scene).toBeVisible();
  expect(await scene.evaluate(el => el.lastElementChild?.getAttribute('data-seasonal'))).toBe('trees');
  await expect(scene).toHaveAttribute('data-phase', 'morning');
  await expect(scene).toHaveAttribute('data-season', 'winter');
  await expect(page.locator('#seasonal-settings')).toBeVisible();
  await expect(page.locator('#clock-transparency')).toBeVisible();
  const sun = page.locator('[data-seasonal=sun]');
  const before = await sun.getAttribute('transform');
  await page.clock.fastForward(5 * 3600000);
  await expect(scene).toHaveAttribute('data-phase', 'day');
  expect(await sun.getAttribute('transform')).not.toBe(before);
  await page.locator('#seasonal-south').check();
  await expect(scene).toHaveAttribute('data-season', 'summer');
  await page.clock.fastForward(10 * 3600000);
  await expect(scene).toHaveAttribute('data-phase', 'night');
  expect(await sun.evaluate(el => getComputedStyle(el).opacity)).toBe('0');
  expect(await page.locator('[data-seasonal=moon]').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await page.locator('#trigger-background').click();
  await page.locator('#options-background [role=option]').first().click();
  await expect(scene).toBeHidden();
  await expect(page.locator('#seasonal-settings')).toBeHidden();
});

test('reduced motion keeps the celestial position still within the hour', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-07-01T12:00:00Z') });
  await page.goto('/de/');
  await page.locator('#trigger-background').click();
  await page.locator('#options-background [role=option]').last().click();
  const sun = page.locator('[data-seasonal=sun]');
  const before = await sun.getAttribute('transform');
  await page.clock.fastForward(30000);
  expect(await sun.getAttribute('transform')).toBe(before);
});
