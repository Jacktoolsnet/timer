import { test, expect } from '@playwright/test';
const tools = ['timer','clock','stopwatch','breathe','relax','calculator','lava','metronome','sound'];
test.beforeEach(async ({page}) => {
 // No real ad requests, impressions or external tracking in tests.
 await page.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.hostname === 'pagead2.googlesyndication.com' && url.pathname.endsWith('/adsbygoogle.js')) return route.fulfill({contentType:'application/javascript',body:''});
  return ['127.0.0.1','localhost'].includes(url.hostname) ? route.continue() : route.abort();
 });
});
for (const [index,tool] of tools.entries()) {
 test(tool + ': localized placement, focus and legal pages', async ({page}) => {
  const origin = 'http://127.0.0.1:'+(4380+index);
  for (const lang of ['de','en','es','fr']) {
   await page.goto(origin+'/'+lang+'/');
   const ad = page.locator('.tool-ad');
   await expect(ad).toHaveCount(1);
   await expect(ad).toBeVisible();
   await expect(ad.locator('ins')).toHaveAttribute('data-ad-format','horizontal');
   await expect(ad.locator('ins')).toHaveAttribute('data-ad-slot','4560273012');
   await expect(page.locator('script[src*="pagead/js/adsbygoogle.js"]')).toHaveCount(1);
   expect(await page.evaluate(() => (window as any).adsbygoogle.length)).toBe(1);
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
   if (!['calculator','sound'].includes(tool)) {
    const boxes = await page.evaluate(() => ({
     ad:document.querySelector('.tool-ad')!.getBoundingClientRect().toJSON(),
     settings:document.querySelector('.settings-card')!.getBoundingClientRect().toJSON(),
    }));
    expect(boxes.ad.bottom).toBeLessThanOrEqual(boxes.settings.top+1);
   }
   await page.evaluate(() => document.body.classList.add('focus-view'));
   await expect(ad).toBeHidden();
   await page.evaluate(() => document.body.classList.remove('focus-view'));
   await expect(ad).toBeVisible();
   expect(await page.evaluate(() => (window as any).adsbygoogle.length)).toBe(1);
  }
  for (const lang of ['de','en']) {
   await page.goto(origin+'/'+lang+'/privacy/');
   await expect(page.locator('main')).toContainText('Google AdSense');
   await expect(page.locator('.tool-ad')).toHaveCount(0);
   await expect(page.locator('script[src*="pagead/js/adsbygoogle.js"]')).toHaveCount(0);
   await expect(page.locator('main')).not.toContainText('Wir binden keine Werbeskripte');
  }
 });
}
test('interval timer also places advertising before settings', async ({page}) => {
 await page.goto('http://127.0.0.1:4380/de/training/');
 await expect(page.locator('.tool-ad')).toHaveCount(1);
 await page.evaluate(() => document.body.classList.add('focus-view'));
 await expect(page.locator('.tool-ad')).toBeHidden();
});

test('empty and blocked slots collapse, late ads restore them, focus stays ad-free', async ({page}) => {
 await page.clock.install();
 await page.goto('http://127.0.0.1:4380/de/');
 const ad = page.locator('.tool-ad');
 const slot = ad.locator('ins');
 // The pending slot is measurable, but not labelled as an actual advertisement.
 await expect(ad.locator('p')).toBeHidden();
 await page.clock.fastForward(11000);
 await expect(ad).toHaveAttribute('data-ad-state','empty');
 expect(await ad.evaluate(el => el.getBoundingClientRect().height)).toBe(0);
 await slot.evaluate(el => el.setAttribute('data-ad-status','filled'));
 await expect(ad).toHaveAttribute('data-ad-state','filled');
 await expect(ad.locator('p')).toBeVisible();
 expect(await ad.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(0);
 await page.evaluate(() => document.body.classList.add('focus-view'));
 await expect(ad).toBeHidden();
 await page.evaluate(() => document.body.classList.remove('focus-view'));
 for (const status of ['unfilled','unfill-optimized']) {
  await slot.evaluate((el,value) => el.setAttribute('data-ad-status',value), status);
  await expect(ad).toHaveAttribute('data-ad-state','empty');
  expect(await ad.evaluate(el => el.getBoundingClientRect().height)).toBe(0);
 }
 expect(await page.evaluate(() => (window as any).adsbygoogle.length)).toBe(1);
});
