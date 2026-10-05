import { test, expect, type Page } from '@playwright/test';

async function openPreferences(page: Page) {
  if (await page.locator('#palette-dropdown').getAttribute('open') === null) {
    await page.locator('#palette-dropdown summary').click();
  }
}
async function toggleTheme(page: Page) {
  await openPreferences(page);
  const dark = await page.locator('html').getAttribute('data-theme') === 'dark';
  await page.locator(dark ? '#theme-light' : '#theme').click();
}
async function selectPalette(page: Page, color: string) {
  const dropdown = page.locator('#palette-dropdown');
  if (await dropdown.getAttribute('open') === null) await dropdown.locator('summary').click();
  await page.locator('[name=colorScheme][value=' + color + ']').check();
}

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
test('appearance persists automatically, timer preferences persist automatically and both can be removed', async ({ page }) => {
  await page.goto('/de/timer/');
  await toggleTheme(page);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('[name=minutes]').fill('12');
  await page.locator('.apply-button').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#time')).toHaveText('12:00');
  await expect(page.locator('[name=remember]')).toHaveCount(0);
  await page.locator('#privacy-open').click();
  await expect(page.locator('#privacy-dialog')).toBeVisible();
  await page.locator('#clear-storage').click();
  await expect(page.locator('#privacy-status')).toContainText('gelöscht');
  await page.locator('#privacy-dialog form button').click();
  await page.reload();
  await expect(page.locator('#time')).toHaveText('05:00');
  await expect(page.locator('[name=remember]')).toHaveCount(0);
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
  await openPreferences(page);
  await page.locator('.language-menu a[lang=de]').click();
  await expect(page).toHaveURL(/de\/pomodoro/);
  await page.locator('#focus-view').click();
  await expect(page.locator('.site-header')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.site-header')).toBeVisible();
  await page.goto('/de/legal/');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('.legal-page .notice')).toHaveCount(0);
  await expect(page.locator('.legal-page')).toContainText('Amtsgericht Ingolstadt');
  await page.goto('/en/legal/');
  await expect(page.locator('.legal-page .notice')).toHaveCount(0);
  await expect(page.locator('.legal-page')).toContainText('Amtsgericht Ingolstadt');
  await page.goto('/de/privacy/');
  await expect(page.locator('.legal-page > .notice').first()).toContainText('Nicht veröffentlichungsfertig');
  const sitemap = await request.get('/sitemap.xml');
  expect((await sitemap.text()).match(/<loc>/g)?.length).toBe(12);
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
  await page.locator('.apply-button').click();
  await expect(page.locator('#settings-status')).toContainText('unavailable');
  await page.locator('#start').click();
  await expect(page.locator('#start')).toHaveText('Pause');
});
test('screenshots', async ({ page }, info) => {
  await page.goto('/de/timer/');
  await page.screenshot({ path: 'test-results/' + info.project.name + '-light.png', fullPage: true });
  await toggleTheme(page);
  await page.goto('/de/pomodoro/');
  await toggleTheme(page);
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
    await openPreferences(page);
    await page.locator('.language-menu a[lang=fr]').click();
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
    if (dark) await toggleTheme(page);
    for (const palette of ['terracotta', 'blue', 'green', 'orange', 'red', 'violet', 'teal', 'rose']) {
      await selectPalette(page, palette);
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
  await openPreferences(page);
  await expect(page.locator('[name=colorScheme][value=rose]')).toBeChecked();
  await selectPalette(page, 'blue');
  await page.locator('.apply-button').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'blue');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('[name=colorScheme][value=blue]')).toBeChecked();
  await selectPalette(page, 'orange');
  await page.goto('/de/pomodoro/');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'orange');
  await page.locator('#next').click();
  await expect(page.locator('#phase-label')).toHaveText('Kurze Pause');
  await selectPalette(page, 'red');
  await expect(page.locator('#phase-label')).toHaveText('Kurze Pause');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'red');
  await page.locator('#privacy-open').click();
  await page.locator('#clear-storage').click();
  await page.reload();
  await expect(page.locator('[name=colorScheme][value=terracotta]')).toBeChecked();
});

test('unified preferences provide all controls and dismiss with Escape or outside click', async ({ page }) => {
  await page.goto('/de/timer/');
  const panel = page.locator('#palette-dropdown');
  const trigger = panel.locator('summary');
  await expect(page.locator('.header-tools > *')).toHaveCount(1);
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toHaveAttribute('open', '');
  await expect(page.locator('.language-menu a')).toHaveCount(4);
  await expect(page.locator('#theme')).toBeVisible();
  await expect(page.locator('[name=colorScheme]')).toHaveCount(8);
  await expect(page.locator('[name=visualStyle]')).toHaveCount(4);
  await expect(page.locator('#font-size')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('#preferences-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();
  await openPreferences(page);
  await page.locator('.site-header').click({position:{x:2,y:2}});
  await expect(panel).not.toHaveAttribute('open', '');
  await selectPalette(page, 'rose');
  await expect(panel).toHaveAttribute('open', '');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'rose');
  await toggleTheme(page);
  await expect(panel).toHaveAttribute('open', '');
  await page.locator('#preferences-close').click();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({width:320,height:600});
  await openPreferences(page);
  const box = await page.locator('.preferences-panel').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(box!.y + box!.height).toBeLessThanOrEqual(600);
  await page.locator('.language-menu a[lang=es]').click();
  await expect(page).toHaveURL(/\/es\/timer\/$/);
  await page.goto('/de/legal/');
  await openPreferences(page);
  await expect(page.locator('.language-menu a')).toHaveCount(2);
});

test('style, appearance and manual language restore on the next visit without an opt-in switch', async ({ page }) => {
  await page.goto('/de/timer/');
  await selectPalette(page, 'teal');
  await openPreferences(page);
  await page.locator('[name=visualStyle][value=technical]').check();
  await toggleTheme(page);
  await openPreferences(page);
  await page.locator('.language-menu a[lang=fr]').click();
  await page.goto('/');
  await expect(page).toHaveURL(/\/fr\/timer\/$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-style', 'technical');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'teal');
  await expect(page.locator('[name=remember]')).toHaveCount(0);
  await page.goto('/de/pomodoro/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  for (const style of ['warm', 'minimal', 'technical', 'soft']) {
    await openPreferences(page);
    await page.locator('[name=visualStyle][value=' + style + ']').check();
    await toggleTheme(page);
    await expect(page.locator('html')).toHaveAttribute('data-style', style);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-style', 'soft');
  await page.locator('#privacy-open').click();
  await page.locator('#clear-storage').click();
  expect(await page.evaluate(() => localStorage.getItem('jacktools.timer.appearance.v1'))).toBeNull();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-style', 'warm');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'terracotta');
});

test('four icon styles fit one row and keep accessible names', async ({ page }) => {
  await page.goto('/de/timer/');
  await openPreferences(page);
  const inputs = page.locator('[name=visualStyle]');
  await expect(inputs).toHaveCount(4);
  const positions = await page.locator('.style-picker label').evaluateAll(labels => labels.map(label => label.getBoundingClientRect().top));
  expect(new Set(positions).size).toBe(1);
  for (const name of ['Warm', 'Minimal', 'Technisch', 'Soft']) {
    await expect(page.getByRole('radio', { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('.appearance-hint')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Soft', exact: true }).check();
  await toggleTheme(page);
  await expect(page.locator('html')).toHaveAttribute('data-style', 'soft');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('timer edits save without Apply and do not reset a running timer', async ({ page }) => {
  await page.clock.install();
  await page.goto('/de/timer/');
  await page.locator('#start').click();
  await page.locator('[name=minutes]').fill('17');
  await page.locator('[name=sound]').uncheck();
  await expect(page.locator('#start')).toHaveText('Pausieren');
  await page.reload();
  await expect(page.locator('#time')).toHaveText('17:00');
  await expect(page.locator('[name=sound]')).not.toBeChecked();
  await page.locator('[name=minutes]').fill('99');
  await expect(page.locator('#settings-status')).toContainText('prüfe');
  await page.reload();
  await expect(page.locator('#time')).toHaveText('17:00');
  await page.goto('/de/pomodoro/');
  await page.locator('[name=focus]').fill('42');
  await page.locator('[name=short]').fill('7');
  await page.locator('[name=rounds]').fill('6');
  await page.reload();
  await expect(page.locator('#time')).toHaveText('42:00');
  await expect(page.locator('[name=short]')).toHaveValue('7');
  await expect(page.locator('[name=rounds]')).toHaveValue('6');
  await page.goto('/de/timer/');
  await expect(page.locator('#time')).toHaveText('17:00');
});

test('small screens keep the logo and header controls in one row', async ({ page }) => {
  for (const width of [320, 375, 390, 680]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/fr/timer/');
    await expect(page.locator('.brand-wordmark')).toBeVisible();
    await expect(page.locator('.brand-product')).toBeVisible();
    await expect(page.locator('.brand-icon')).toBeVisible();
    const logo = await page.locator('.brand').boundingBox();
    const controls = await page.locator('.header-tools').boundingBox();
    expect(Math.abs(logo!.y + logo!.height / 2 - controls!.y - controls!.height / 2)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(page.locator('.brand-wordmark')).toBeVisible();
});

test('font size has four steps, grows text, restores and fits small screens', async ({ page }) => {
  await page.goto('/de/timer/');
  await openPreferences(page);
  const slider = page.getByRole('slider', { name: 'Schriftgröße' });
  await expect(slider).toHaveValue('0');
  const initial = await page.locator('.intro-copy').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveValue('3');
  await expect(slider).toHaveAttribute('aria-valuetext', '130 %');
  expect(await page.locator('.intro-copy').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(initial * 1.3, 1);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-font-size', '3');
  await page.setViewportSize({ width: 320, height: 720 });
  for (const lang of ['de', 'en', 'es', 'fr']) {
    await page.goto('/' + lang + '/pomodoro/');
    for (const style of ['warm', 'minimal', 'technical', 'soft']) {
      await openPreferences(page);
      await page.locator('[name=visualStyle][value=' + style + ']').check();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      await page.keyboard.press('Escape');
    }
  }
  await page.locator('#privacy-open').click();
  await page.locator('#clear-storage').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-font-size', '0');
});

test('focus requests fullscreen, exits it and follows browser fullscreen exit', async ({ page }) => {
  await page.addInitScript(() => {
    let element: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', { get: () => element });
    Element.prototype.requestFullscreen = async function () {
      element = this;
      document.dispatchEvent(new Event('fullscreenchange'));
    };
    document.exitFullscreen = async () => {
      element = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    };
  });
  await page.goto('/de/timer/');
  await page.locator('#focus-view').click();
  await expect(page.locator('body')).toHaveClass(/focus-view/);
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBeTruthy();
  await page.locator('#focus-view').click();
  await expect(page.locator('body')).not.toHaveClass(/focus-view/);
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  await page.locator('#focus-view').click();
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator('#focus-view')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#focus-view').click();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
});
test('focus remains usable when fullscreen is denied', async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = async () => { throw new Error('Denied'); };
  });
  await page.goto('/de/timer/');
  await page.locator('#focus-view').click();
  await expect(page.locator('body')).toHaveClass(/focus-view/);
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toHaveClass(/focus-view/);
});

test('privacy-first footer has ordinary support links and loads no external resources', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url());
  });
  await page.goto('/de/timer/');
  await expect(page.locator('.ad-slot')).toHaveCount(0);
  await expect(page.locator('.privacy-promise')).toHaveText('Ohne Werbung. Ohne Tracking.');
  await expect(page.locator('.footer-credit')).toContainText('Für Dich mit');
  await expect(page.locator('.footer-credit')).toContainText('entwickelt von JackTools.Net');
  for (const href of ['https://buymeacoffee.com/jacktoolsnet', 'https://app.messagedrop.de']) {
    const link = page.locator('a[href="' + href + '"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
  }
  await page.locator('#privacy-open').click();
  await expect(page.locator('#privacy-dialog')).toContainText('lokal gespeicherte Einstellungen löschen');
  await expect(page.locator('#privacy-dialog')).not.toContainText('zertifizierte');
  expect(externalRequests).toEqual([]);
});

test('persistent settings require opt-in and deletion revokes it', async ({ page }) => {
  await page.goto('/de/timer/');
  await page.locator('#palette-dropdown summary').click();
  await page.locator('#theme').click();
  expect(await page.evaluate(() => localStorage.getItem('jacktools.timer.appearance.v1'))).toBeNull();

  await expect(page.locator('#remember-preferences')).not.toBeChecked();
  await page.locator('#remember-preferences').check();
  expect(await page.evaluate(() => localStorage.getItem('jacktools.timer.storage-consent.v1'))).toBe('yes');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#palette-dropdown summary').click();
  await expect(page.locator('#remember-preferences')).toBeChecked();
  await page.locator('#remember-preferences').uncheck();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('jacktools.timer.')))).toEqual([]);
  await page.reload();
  await page.locator('#palette-dropdown summary').click();
  await expect(page.locator('#remember-preferences')).not.toBeChecked();
});

test('training advances automatically and finishes without final rest', async ({ page }) => {
  await page.goto('/de/training/');
  await page.locator('[name=preparation]').fill('0');
  await page.locator('[name=work]').fill('1');
  await page.locator('[name=rest]').fill('1');
  await page.locator('[name=rounds]').fill('2');
  await page.locator('#training-form button[type=submit]').click();
  await page.locator('#training-start').click();
  await expect(page.locator('#training-phase')).toHaveText('Training abgeschlossen!', { timeout: 7000 });
  await expect(page.locator('#training-time')).toHaveText('00:00');
  expect(await page.evaluate(() => localStorage.getItem('jacktools.timer.training.v1'))).toBeNull();
});
