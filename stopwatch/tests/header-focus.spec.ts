import {test,expect} from '@playwright/test';
test('focus action belongs to the header and stays reachable',async({page})=>{
 await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Fullscreen denied');};});
 await page.goto('/de/');
 const button=page.locator('#stopwatch-focus');
 await expect(page.locator('.site-header #stopwatch-focus')).toHaveCount(1);
 await expect(button).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await button.click();await expect(page.locator('body')).toHaveClass(/focus-view/);
 await expect(button).toBeVisible();await button.click();
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 await expect(button).toBeVisible();
});
