import { test, expect } from '@playwright/test';

test('timer guide is discoverable, readable and has correct SEO', async ({ page }, info) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/');
  await page.getByRole('link', { name: 'Timer kennenlernen: Anleitung & Beispiele' }).click();
  await expect(page).toHaveURL(/\/de\/tools\/timer\/$/);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('Drei Arten');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://jacktools.net/de/tools/timer/');
  await expect(page.locator('link[hreflang]')).toHaveCount(5);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  for (const link of await page.locator('.guide-toc a').all()) {
    const id = await link.getAttribute('href');
    await expect(page.locator(id!)).toHaveCount(1);
  }
  await page.getByText('Läuft der Timer bei geschlossenem Browser weiter?', { exact: true }).click();
  await expect(page.getByText('Verlasse dich darauf nicht.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: `/tmp/timer-guide-${info.project.name}.png`, fullPage: true });
  await page.evaluate(() => document.documentElement.dataset.fontSize = '3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const sitemap = await page.request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain('<loc>https://jacktools.net/de/tools/timer/</loc>');
});


test('guide paragraphs use the same full content width as the blocks below', async ({ page }) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/tools/timer/');
  for (const id of ['modi', 'pomodoro', 'intervalle', 'einstellungen']) {
    const widths = await page.locator('#' + id).evaluate(section => ({
      section: section.getBoundingClientRect().width,
      paragraph: section.querySelector('p:not(.eyebrow)')!.getBoundingClientRect().width,
    }));
    expect(Math.abs(widths.section - widths.paragraph)).toBeLessThan(2);
  }
});

test('print view hides chrome and ads, expands FAQs and restores their state', async ({ page }) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/tools/timer/');
  const closed = await page.locator('.timer-guide details:not([open])').count();
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('.timer-guide details:not([open])')).toHaveCount(0);
  for (const selector of ['.site-header', '.site-footer', '.guide-toc', '.guide-preview', '.company-ad']) {
    await expect(page.locator(selector)).toBeHidden();
  }
  for (const figure of await page.locator('.tool-screenshot').all()) await expect(figure).toBeHidden();
  await expect(page.locator('h1')).toBeVisible();
  for (const answer of await page.locator('.timer-guide details p').all()) await expect(answer).toBeVisible();
  expect(await page.locator('.timer-guide').evaluate(el => getComputedStyle(el).color)).toBe('rgb(0, 0, 0)');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('.timer-guide details:not([open])')).toHaveCount(closed);
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('#print-guide')).toHaveCount(0);
});


test('real tool screenshots load and fit the guide on desktop and mobile', async ({ page }) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/tools/timer/');
  await expect(page.locator('.tool-screenshot')).toHaveCount(1);
  await expect(page.locator('.timer-gallery-thumb')).toHaveCount(14);
  for (const image of await page.locator('.tool-screenshot img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 1000)).toBe(true);
    expect(await image.getAttribute('alt')).toBeTruthy();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('closing section offers all three timer modes', async ({ page }) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/tools/timer/');
  const closing = page.locator('.guide-end');
  await expect(closing.getByRole('heading', { name: 'Wie möchtest du starten?' })).toBeVisible();
  for (const [label, route] of [['Countdown starten', 'timer'], ['Pomodoro starten', 'pomodoro'], ['Intervalle starten', 'training']]) {
    await expect(closing.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', `https://timer.jacktools.net/de/${route}/`);
  }
  await expect(closing.locator('.start-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('header opens timer directly without breadcrumb navigation', async ({ page }) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/tools/timer/');
  await expect(page.locator('.breadcrumbs')).toHaveCount(0);
  const action = page.locator('.site-header').getByRole('link', { name: 'Timer öffnen', exact: true });
  await expect(action).toBeVisible();
  await expect(action).toHaveAttribute('href', 'https://timer.jacktools.net/de/timer/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('hero offers all three modes with icons', async ({ page }) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/tools/timer/');
  const actions = page.getByRole('group', { name: 'Timer-Modus öffnen' });
  for (const [name, mode] of [['Countdown', 'timer'], ['Pomodoro', 'pomodoro'], ['Intervalle', 'training']]) {
    const link = actions.getByRole('link', { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', `https://timer.jacktools.net/de/${mode}/`);
    await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.emulateMedia({ media: 'print' });
  await expect(actions).toBeHidden();
});

test('mode buttons and header action have readable contrast without hover', async ({ page }) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/tools/timer/');
  await page.addStyleTag({content:'*, *::before, *::after { transition:none!important; animation:none!important; }'});
  await page.mouse.move(0, 0);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    for (const palette of ['terracotta', 'blue', 'green', 'orange', 'red', 'violet', 'teal', 'rose']) {
      await page.evaluate(palette => document.documentElement.dataset.palette = palette, palette);
      for (const button of await page.locator('.hero-mode-button, .timer-header-action').all()) {
        const contrast = await button.evaluate(el => {
          const style = getComputedStyle(el);
          const luminance = (color: string) => {
            const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => {
              const v = n / 255; return v <= 0.04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
            });
            return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
          };
          const a = luminance(style.color), b = luminance(style.backgroundColor);
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        });
        expect(contrast, `${theme}/${palette}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

test('screenshot gallery supports navigation, Escape and focus restoration', async ({ page }) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/tools/timer/');
  const opener = page.locator('.tool-screenshot a').first();
  await opener.click();
  const gallery = page.getByRole('dialog', { name: 'Timer-Galerie' });
  await expect(gallery).toBeVisible();
  await expect(gallery.locator('#gallery-image')).toHaveAttribute('src', /\/digital-green\.png$/);
  await expect(gallery.getByRole('status')).toHaveText('1 / 14');
  await gallery.getByRole('button', { name: 'Nächstes Bild' }).click();
  await expect(gallery.locator('#gallery-image')).toHaveAttribute('src', /\/round-standard\.png$/);
  await page.keyboard.press('ArrowLeft');
  await expect(gallery.getByRole('status')).toHaveText('1 / 14');
  await page.keyboard.press('ArrowLeft');
  await expect(gallery.getByRole('status')).toHaveText('14 / 14');
  await page.keyboard.press('Escape');
  await expect(gallery).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await gallery.getByRole('button', { name: 'Galerie schließen' }).click();
  await expect(gallery).toBeHidden();
});

test('homepage timer action buttons have equal widths', async ({ page }) => {
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/, route => route.fulfill({contentType:'application/javascript', body:''}));
  await page.goto('/de/');
  const buttons = page.locator('#online-timer .timer-card-actions > a');
  await expect(buttons).toHaveCount(2);
  const widths = await buttons.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().width));
  expect(Math.abs(widths[0] - widths[1])).toBeLessThan(1);
});
