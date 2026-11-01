import {test,expect} from '@playwright/test';
test('focus action belongs to the header and stays reachable',async({page})=>{
 await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Fullscreen denied');};});
 await page.goto('/de/timer/');
 const button=page.locator('#focus-view');
 await expect(page.locator('.site-header #focus-view')).toHaveCount(1);
 await expect(button).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await button.click();await expect(page.locator('body')).toHaveClass(/focus-view/);
 await expect(button).toBeVisible();await button.click();
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 await expect(button).toBeVisible();
});

test('interval training focus action belongs to the header',async({page})=>{
 await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Fullscreen denied');};});
 await page.goto('/de/training/');
 const button=page.locator('.site-header #training-focus');
 await expect(button).toBeVisible();await button.click();
 await expect(page.locator('body')).toHaveClass(/focus-view/);
 await expect(button).toBeVisible();await button.click();
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);
});
