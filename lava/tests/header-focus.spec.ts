import {test,expect} from '@playwright/test';
test('focus action belongs to the header and stays reachable',async({page})=>{
 await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Fullscreen denied');};});
 await page.goto('/de/');
 const button=page.locator('#lava-fullscreen');
 await expect(page.locator('.site-header #lava-fullscreen')).toHaveCount(1);
 await expect(button).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await button.click();await expect(button).toBeVisible();
});
