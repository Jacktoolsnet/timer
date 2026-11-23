import {test,expect} from '@playwright/test';
import {toolGuides} from '../src/lib/tool-guides';
import galleries from '../src/lib/tool-galleries.json' with {type:'json'};
test.beforeEach(async({page})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,route=>route.fulfill({body:''}));
});
for(const guide of toolGuides){
 test(`${guide.slug}: suitable images, centered controls and working overlay`,async({page})=>{
  const count=(galleries as Record<string,unknown[]>)[guide.slug].length;
  await page.goto(`/de/tools/${guide.slug}/`);
  const root=page.locator('.timer-showcase');
  const thumbs=root.locator('.timer-gallery-thumb');
  await expect(thumbs).toHaveCount(count);
  await root.scrollIntoViewIfNeeded();
  const centerDifference=await root.evaluate(el=>{
   const button=el.querySelector('#showcase-next')!.getBoundingClientRect();
   const image=el.querySelector('.timer-gallery-thumb img')!.getBoundingClientRect();
   return Math.abs((button.top+button.bottom-image.top-image.bottom)/2);
  });
  expect(centerDifference).toBeLessThan(4);
  for(let i=0;i<count;i++){
   await thumbs.nth(i).click();
   await expect(root.getByRole('status')).toHaveText(`${i+1} / ${count}`);
   await expect.poll(()=>root.locator('#showcase-image').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  }
  await root.locator('.showcase-open').click();
  const modal=page.getByRole('dialog',{name:'Bildergalerie'});
  await expect(modal).toBeVisible();
  await modal.getByRole('button',{name:'Nächstes Bild'}).click();
  await expect(modal.getByRole('status')).toHaveText(`1 / ${count}`);
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
