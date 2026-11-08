import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Never request real ads or generate ad impressions during automated tests.
  await page.route(/https?:\/\/[^/]*(googlesyndication\.com|doubleclick\.net|googleadservices\.com)\//, route => route.fulfill({
    contentType: 'application/javascript', body: '',
  }));
});

test('responsive ad sits between spotlight and tools in every language', async ({ page }) => {
  for (const [lang, label] of Object.entries({ de: 'Werbung', en: 'Advertisement', es: 'Publicidad', fr: 'Publicité' })) {
    await page.goto('/' + lang + '/');
    const banner = page.getByRole('complementary', { name: label, exact: true });
    await expect(banner).toBeVisible();
    await expect(banner.locator('ins.adsbygoogle')).toHaveAttribute('data-ad-slot', '4560273012');
    await expect(banner.locator('ins')).toHaveAttribute('data-ad-client', 'ca-pub-5182500947872057');
    await expect(banner.locator('ins')).toHaveAttribute('data-ad-format', 'auto');
    await expect(page.locator('script[src*="pagead/js/adsbygoogle.js"]')).toHaveCount(1);
    expect(await page.evaluate(() => {
      const ad = document.querySelector('.company-ad')!;
      const hero = document.querySelector('#company-spotlight')!;
      const tools = document.querySelector('#tools')!;
      return Boolean(hero.compareDocumentPosition(ad) & Node.DOCUMENT_POSITION_FOLLOWING)
        && Boolean(ad.compareDocumentPosition(tools) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    expect(await page.evaluate(() => (window as any).adsbygoogle.length)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('legal pages do not load the ad unit', async ({ page }) => {
  await page.goto('/datenschutz/');
  await expect(page.locator('.company-ad')).toHaveCount(0);
  await expect(page.locator('script[src*="pagead/js/adsbygoogle.js"]')).toHaveCount(0);
  await expect(page.locator('main')).toContainText('Google AdSense');
});
