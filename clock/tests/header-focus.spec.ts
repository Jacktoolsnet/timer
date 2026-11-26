import {test,expect} from '@playwright/test';
test('focus action belongs to the header and stays reachable',async({page})=>{
 await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Fullscreen denied');};});
 await page.goto('/de/');
 const button=page.locator('#clock-focus');
 await expect(page.locator('.site-header #clock-focus')).toHaveCount(1);
 await expect(button).toBeVisible();
 await expect(page.locator('.site-header .header-focus-actions #tv-open')).toHaveCount(1);
 await expect(page.locator('#tv-open')).toBeVisible();await expect(page.locator('#tv-open')).toHaveAccessibleName('Uhr streamen');
 await page.locator('#tv-open').click();await expect(page.locator('#tv-dialog')).toBeVisible();await page.locator('#tv-close').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await button.click();await expect(page.locator('body')).toHaveClass(/focus-view/);
 await expect(button.locator('span')).toBeHidden();
 await expect(page.locator('#tv-open span')).toBeHidden();
 await expect(button).toHaveAttribute('title',await button.getAttribute('aria-label') as string);
 await expect(page.locator('#tv-open')).toHaveAttribute('title','Uhr streamen');
 await expect(button).toBeVisible();await button.click();
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 await expect(button).toBeVisible();
});

test('TV routes work with and without a trailing slash',async({request})=>{
 for(const path of ['/stream','/stream/','/de/stream','/de/stream/','/tv','/tv/','/de/tv','/de/tv/']){
  const response=await request.get(path);expect(response.status()).toBe(200);
  expect(await response.text()).toContain('id="tv-receiver-panel"');
 }
});

test('legacy TV URLs redirect to stream and receiver copy is device-neutral',async({request})=>{
 for(const lang of ['de','en','es','fr']){
  const response=await request.get(`/${lang}/tv/`,{maxRedirects:0});expect(response.status()).toBe(301);expect(response.headers().location).toBe(`/${lang}/stream/`);
 }
 const page=await request.get('/de/stream/');const html=await page.text();expect(html).toContain('Stream beenden');expect(html).not.toContain('TV-Anzeige beenden');
});
