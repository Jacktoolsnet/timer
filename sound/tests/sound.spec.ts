import {test,expect} from '@playwright/test';
test('drawing, audio and appearance',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('h1')).toHaveText('Zeichne deinen Rhythmus');
 await page.locator('#clear').click();
 await expect(page.locator('.count').first()).toHaveText('0 / 16');
 await page.locator('#drawing').scrollIntoViewIfNeeded();
 const r=await page.locator('#drawing').boundingBox();if(!r)throw Error('Missing drawing');
 await page.mouse.move(r.x+20,r.y+20);await page.mouse.down();
 for(let n=1;n<15;n++)await page.mouse.move(r.x+r.width*n/16,r.y+20);
 await page.mouse.up();
 await expect(page.locator('.count').first()).not.toHaveText('0 / 16');
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.waitForTimeout(500);await page.locator('#play').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('#palette-dropdown summary').click();await page.locator('#theme').click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.locator('#preferences-close').click();
 await page.locator('#focus').click();await expect(page.locator('body')).toHaveClass(/focus-view/);
 await page.locator('#focus').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'test-results/'+info.project.name+'.png',fullPage:true});
 expect(errors).toEqual([]);
});
for(const lang of ['en','es','fr'])test('localized '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await expect(page.locator('html')).toHaveAttribute('lang',lang);
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://sound.jacktools.net/'+lang+'/');
});
