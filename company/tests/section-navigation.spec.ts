import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
 await page.route('**/*', route => {
  const url = new URL(route.request().url());
  return ['127.0.0.1','localhost'].includes(url.hostname) ? route.continue() : route.abort();
 });
});

for (const viewport of [{width:1440,height:1000},{width:1920,height:1400},{width:390,height:844}]) {
 test('section navigation at document bottom '+viewport.width+'x'+viewport.height, async ({page}) => {
  await page.setViewportSize(viewport);
  await page.goto('/de/');
  const tools = page.locator('.header-nav a[href$="#tools"]');
  const idea = page.locator('.header-nav a[href$="#idee"]');
  await page.evaluate(() => {
   document.documentElement.style.scrollBehavior = 'auto';
   window.scrollTo(0, document.getElementById('tools')!.offsetTop);
  });
  await expect(tools).toHaveAttribute('aria-current','location');
  await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
  await expect(idea).toHaveAttribute('aria-current','location');
  await expect(tools).not.toHaveAttribute('aria-current','location');
  // Returning to the top must clear both active states again.
  await page.evaluate(() => window.scrollTo(0,0));
  await expect(idea).not.toHaveAttribute('aria-current','location');
  await expect(tools).not.toHaveAttribute('aria-current','location');
 });
}
