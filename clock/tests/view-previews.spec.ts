import {test,expect} from '@playwright/test';
import {clockViews,clockTypes,viewPreview} from '../src/lib/view-previews';
test('every clock view has a distinct self-contained SVG preview',()=>{
 expect(new Set(clockViews.map(viewPreview)).size).toBe(clockViews.length);
 for(const view of clockViews){const svg=decodeURIComponent(viewPreview(view).split(',')[1]);expect(svg).toContain('viewBox="0 0 96 60"');expect(svg).not.toMatch(/<script|https?:\/\/(?!www.w3.org)/);}
});
for(const lang of ['de','en','es','fr'])test(`${lang}: view selector shows previews and retains keyboard selection`,async({page},info)=>{
 await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));
 await page.goto(`/${lang}/`);
 const trigger=page.locator('#trigger-view'),preview=trigger.locator('img');
 await expect(preview).toBeVisible();await expect(preview).toHaveAttribute('alt','');
 await trigger.click();const options=page.locator('#options-view [role=option]');await expect(options).toHaveCount(clockTypes.length);
 for(let i=0;i<clockTypes.length;i++){
  const img=options.nth(i).locator('img');await img.scrollIntoViewIfNeeded();await expect(img).toBeVisible();
  await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth===96)).toBe(true);
 }
 if(lang==='de')await page.screenshot({path:`/tmp/clock-view-previews-${info.project.name}.png`});
 await page.keyboard.press('End');await page.keyboard.press('Enter');
 await expect(page.locator('.clock-display')).toHaveAttribute('data-view','flip');
 await expect(preview).toHaveAttribute('src',viewPreview('flip'));
 await expect(trigger).toHaveAttribute('aria-expanded','false');
 // Switching by pointer also synchronizes the trigger thumbnail.
 await trigger.click();await options.nth(3).click();await expect(preview).toHaveAttribute('src',viewPreview('binary'));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
