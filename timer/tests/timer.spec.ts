import { test, expect } from '@playwright/test';

test('countdown, pause, resume, completion, reset, presets and no horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/de/timer/');
  await page.clock.install();
  await expect(page.locator('h1')).toContainText('was dir wichtig ist');
  await page.locator('[name=minutes]').fill('0');
  await page.locator('[name=seconds]').fill('3');
  await page.locator('.apply-button').click();
  await expect(page.locator('#time')).toHaveText('00:03');
  await page.locator('#start').click();
  await page.clock.runFor(1000);
  await page.locator('#start').click();
  const paused = await page.locator('#time').textContent();
  await page.clock.runFor(10000);
  await expect(page.locator('#time')).toHaveText(paused!);
  await page.locator('#start').click();
  await page.clock.runFor(4000);
  await expect(page.locator('#time')).toHaveText('00:00');
  await expect(page.locator('#timer-status')).toContainText('Die Zeit ist um');
  await page.locator('#reset').click();
  await expect(page.locator('#time')).toHaveText('00:03');
  await page.locator('[data-minutes="10"]').click();
  await expect(page.locator('#time')).toHaveText('10:00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});
test('preferences and dark mode persist only with opt-in and can be removed', async ({ page }) => {
  await page.goto('/de/timer/');
  await page.locator('#theme').click();
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await page.locator('#theme').click();
  await page.locator('[name=minutes]').fill('12');
  await page.locator('[name=remember]').check();
  await page.locator('.apply-button').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#time')).toHaveText('12:00');
  await expect(page.locator('[name=remember]')).toBeChecked();
  await page.locator('#privacy-open').click();
  await expect(page.locator('#privacy-dialog')).toBeVisible();
  await page.locator('#clear-storage').click();
  await expect(page.locator('#privacy-status')).toContainText('gelöscht');
  await page.locator('#privacy-dialog form button').click();
  await page.reload();
  await expect(page.locator('#time')).toHaveText('05:00');
  await expect(page.locator('[name=remember]')).not.toBeChecked();
});
test('pomodoro waits for the user and advances through breaks', async ({ page }) => {
  await page.goto('/en/pomodoro/');
  await page.clock.install();
  await page.locator('[name=focus]').fill('1');
  await page.locator('[name=rounds]').fill('2');
  await page.locator('.apply-button').click();
  await page.locator('#start').click();
  await page.clock.runFor(61000);
  await expect(page.locator('#timer-status')).toContainText('Phase complete');
  await expect(page.locator('#phase-label')).toHaveText('Focus time');
  await page.locator('#start').click();
  await expect(page.locator('#phase-label')).toHaveText('Short break');
  await page.locator('#next').click();
  await expect(page.locator('#round-label')).toHaveText('Round 2 of 2');
  await page.locator('#next').click();
  await expect(page.locator('#phase-label')).toHaveText('Long break');
  await page.locator('#next').click();
  await expect(page.locator('#round-label')).toHaveText('Round 1 of 2');
});
test('language routes, SEO, legal drafts and focus view', async ({ page, request }) => {
  for (const lang of ['de', 'en', 'es', 'fr']) {
    await page.goto('/' + lang + '/pomodoro/');
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://timer.jacktools.net/' + lang + '/pomodoro/');
    await expect(page.locator('link[hreflang=x-default]')).toHaveAttribute('href', 'https://timer.jacktools.net/en/pomodoro/');
    expect(await page.locator('link[rel=alternate]').count()).toBe(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.locator('#language').selectOption('/de/pomodoro/');
  await expect(page).toHaveURL(/de\/pomodoro/);
  await page.locator('#focus-view').click();
  await expect(page.locator('.site-header')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.site-header')).toBeVisible();
  await page.goto('/de/legal/');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('.legal-page .notice')).toContainText('Nicht veröffentlichungsfertig');
  const sitemap = await request.get('/sitemap.xml');
  expect((await sitemap.text()).match(/<loc>/g)?.length).toBe(8);
});
test('works with corrupt or unavailable storage', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jacktools.timer.settings.v1', '{broken'));
  await page.goto('/en/timer/');
  await expect(page.locator('#time')).toHaveText('05:00');
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
  });
  await page.reload();
  await page.locator('[name=remember]').check();
  await page.locator('.apply-button').click();
  await expect(page.locator('#settings-status')).toContainText('unavailable');
  await page.locator('#start').click();
  await expect(page.locator('#start')).toHaveText('Pause');
});
test('screenshots', async ({ page }, info) => {
  await page.goto('/de/timer/');
  await page.screenshot({ path: 'test-results/' + info.project.name + '-light.png', fullPage: true });
  await page.locator('#theme').click();
  await page.goto('/de/pomodoro/');
  await page.locator('#theme').click();
  await page.screenshot({ path: 'test-results/' + info.project.name + '-dark.png', fullPage: true });
});

test('neutral entry selects the browser language, keeping explicit language URLs unchanged', async ({ browser }) => {
  for (const [languages, expected] of [
    [['de-DE', 'en-US'], 'de'],
    [['es-MX'], 'es'],
    [['fr-CA'], 'fr'],
    [['en-GB', 'de'], 'en'],
    [['it-IT', 'de-AT'], 'de'],
    [['ja-JP'], 'en'],
    [[], 'de'],
  ] as [string[], string][]) {
    const context = await browser.newContext({ locale: 'de-DE' });
    await context.addInitScript(languages => {
      Object.defineProperty(navigator, 'languages', { get: () => languages });
    }, languages);
    const page = await context.newPage();
    await page.goto('/?source=test#main');
    await expect(page).toHaveURL(new RegExp('/' + expected + '/timer/\\?source=test#main$'));
    await expect(page.locator('html')).toHaveAttribute('lang', expected);
    await page.goto('/en/pomodoro/');
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page).toHaveURL(/\/en\/pomodoro\/$/);
    await page.locator('#language').selectOption('/fr/pomodoro/');
    await expect(page).toHaveURL(/\/fr\/pomodoro\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await context.close();
  }
});

test('palettes preview without resetting, persist with opt-in and work in light and dark mode', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const now = new Date('2026-10-04T12:00:00Z');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto('/de/timer/');
  await page.locator('#start').click();
  await page.clock.runFor(1000);
  await expect(page.locator('#time')).toHaveText('04:59');
  const remaining = await page.locator('#time').textContent();
  for (const dark of [false, true]) {
    if (dark) await page.locator('#theme').click();
    for (const palette of ['terracotta', 'blue', 'green', 'orange', 'red']) {
      await page.locator('[name=colorScheme][value=' + palette + ']').check();
      await expect(page.locator('html')).toHaveAttribute('data-palette', palette);
      await expect(page.locator('#start')).toHaveText('Pausieren');
      await expect(page.locator('#time')).toHaveText(remaining!);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      const contrast = await page.evaluate(() => {
        function luminance(color: string) {
          const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(c => {
            c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
          });
          return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
        }
        const button = getComputedStyle(document.querySelector('#start')!);
        const a = luminance(button.color), b = luminance(button.backgroundColor);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  }
  await page.reload();
  await expect(page.locator('[name=colorScheme][value=terracotta]')).toBeChecked();
  await page.locator('[name=colorScheme][value=blue]').check();
  await page.locator('[name=remember]').check();
  await page.locator('.apply-button').click();
  await page.locator('#theme').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'blue');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('[name=colorScheme][value=blue]')).toBeChecked();
  await page.locator('[name=colorScheme][value=orange]').check();
  await page.goto('/de/pomodoro/');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'orange');
  await page.locator('#next').click();
  await expect(page.locator('#phase-label')).toHaveText('Kurze Pause');
  await page.locator('[name=colorScheme][value=red]').check();
  await expect(page.locator('#phase-label')).toHaveText('Kurze Pause');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'red');
  await page.locator('#privacy-open').click();
  await page.locator('#clear-storage').click();
  await page.reload();
  await expect(page.locator('[name=colorScheme][value=terracotta]')).toBeChecked();
});
