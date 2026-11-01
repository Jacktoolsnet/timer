import {test,expect} from './helpers/editor-test';
test('focus action belongs to the header and stays reachable',async({page})=>{
 await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Fullscreen denied');};});
 await page.goto('/de/');
 const button=page.locator('#focus');
 await expect(page.locator('.site-header #focus')).toHaveCount(1);
 await expect(button).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await button.click();await expect(page.locator('body')).toHaveClass(/recording/);
 await expect(page.locator('#exit-focus')).toBeVisible();await page.locator('#exit-focus').click();
 await expect(button).toBeVisible();
});
