import {styleIds} from '../src/lib/presets';
import {test,expect} from '@playwright/test';
for(const lang of ['de','en','es','fr'])test('simplified music controls hide groove and dances in '+lang,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/'+lang+'/');
 await expect(page.locator('.groove-controls')).toBeHidden();await expect(page.locator('.dances-tile')).toBeHidden();
 await expect(page.locator('.music-tile')).toBeVisible();await expect(page.locator('.style-tile:visible')).toHaveCount(styleIds.length);await expect(page.locator('.instruments-tile')).toBeVisible();await expect(page.locator('.animations-tile')).toBeVisible();
 await page.locator('[data-style-preset=slowwaltz]').click();await expect(page.locator('#orbit')).toHaveAttribute('data-steps','12');
 await page.locator('[data-style-preset=electronic]').click();await expect(page.locator('#orbit')).toHaveAttribute('data-steps','16');
 await page.locator('#evolve').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(300);await page.locator('#play').click();
 await page.locator('#focus').click();await expect(page.locator('.groove-controls')).toBeHidden();await expect(page.locator('.dances-tile')).toBeHidden();await page.locator('#focus').click();
 await expect(page.locator('.music-tile')).toBeVisible();await expect(page.locator('.dances-tile')).toBeHidden();expect(errors).toEqual([]);
 await page.goto('/'+lang+'/usage/');await expect(page.locator('.legal-page')).toBeVisible();
 expect(await page.locator('.legal-page').textContent()).not.toMatch(/Discofox|Cha-cha|Cha-Cha|Cha-cha-chá|cha-cha-cha/);
});
