import {test,expect} from '@playwright/test';

for(const lang of ['de','en','es','fr'])test('separate slider tile and enlarged playing surface '+lang,async({page})=>{
 await page.goto('/'+lang+'/');
 const tile=page.locator('.controls-tile'),music=page.locator('.music-tile'),app=page.locator('.sound-app');
 await expect(tile).toBeVisible();await expect(tile.locator('h2')).not.toBeEmpty();
 await expect(tile.locator('input[type=range]')).toHaveCount(4);
 await expect(app.locator('input[type=range]')).toHaveCount(0);
 for(const id of ['play','evolve','random','reset','clear'])await expect(app.locator('#'+id)).toBeVisible();
 const t=(await tile.boundingBox())!,m=(await music.boundingBox())!,a=(await app.boundingBox())!,pad=(await page.locator('#drawing').boundingBox())!;
 expect(t.y).toBeGreaterThanOrEqual(a.y+a.height);
 expect(t.y+t.height).toBeLessThanOrEqual(m.y);
 expect(Math.abs(pad.width-pad.height)).toBeLessThan(2);
 expect(await page.locator('#drawing').getAttribute('height')).toBe('700');
 await page.locator('#volume').fill('0.56');await page.locator('#volume').dispatchEvent('input');
 await expect(page.locator('#volume-value')).toHaveText('80 %');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(lang==='de')await page.locator('main').screenshot({path:'test-results/controls-tile-'+test.info().project.name+'.png'});
 await page.locator('#focus').click();
 await expect(tile).toBeHidden();await expect(page.locator('#drawing')).toBeVisible();
 await page.locator('#focus').click();await expect(tile).toBeVisible();
});
