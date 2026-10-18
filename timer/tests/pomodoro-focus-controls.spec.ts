import {test,expect} from '@playwright/test';

test('Pomodoro phase summary stays below the focus controls',async({page})=>{
 await page.goto('/de/pomodoro/');
 await page.locator('#focus-view').click();
 await expect(page.locator('body')).toHaveClass(/focus-view/);
 const controls=await page.locator('.timer-controls').boundingBox();
 const summary=await page.locator('.phase-summary').boundingBox();
 expect(summary!.y).toBeGreaterThanOrEqual(controls!.y+controls!.height);
 expect(Math.abs(summary!.x+summary!.width/2-controls!.x-controls!.width/2)).toBeLessThan(2);
 expect(summary!.y+summary!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
 await expect(page.locator('#summary-focus')).toHaveText('25');
 await expect(page.locator('#summary-short')).toHaveText('5');
 await expect(page.locator('#summary-long')).toHaveText('15');
});
