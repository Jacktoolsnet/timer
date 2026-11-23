import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const pictures=JSON.parse(readFileSync(new URL('../src/lib/timer-gallery.json',import.meta.url),'utf8'));
test.beforeEach(async({page})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,route=>route.fulfill({body:''}));
});

test('all live screenshots can be selected and opened in the gallery',async({page},info)=>{
 await page.goto('/de/tools/timer/');
 const section=page.locator('.timer-showcase');
 await expect(section.locator('.timer-gallery-thumb')).toHaveCount(pictures.length);
 for(const [index,picture] of pictures.entries()){
  const thumb=section.getByRole('link',{name:picture.title,exact:true});
  await thumb.click();
  await expect(thumb).toHaveAttribute('aria-current','true');
  await expect(section.locator('#showcase-image')).toHaveAttribute('src',new RegExp(picture.id+'\\.png$'));
  await expect.poll(()=>section.locator('#showcase-image').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  await expect(section.getByRole('status')).toHaveText(`${index+1} / ${pictures.length}`);
 }
 await section.locator('.showcase-open').click();
 const gallery=page.getByRole('dialog',{name:'Timer-Galerie'});
 await expect(gallery).toBeVisible();
 await expect(gallery.locator('img')).toHaveAttribute('src',/focus-background\.png$/);
 await page.keyboard.press('Escape');
 await expect(gallery).toBeHidden();
 await section.getByRole('button',{name:'Nächste Timer-Ansicht'}).click();
 await expect(section.getByRole('status')).toHaveText('1 / 13');
 await section.screenshot({path:`/tmp/timer-showcase-${info.project.name}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>document.documentElement.dataset.fontSize='3');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.emulateMedia({media:'print'});
 await expect(section).toBeHidden();
});

test('carousel supports keyboard and touch gestures without autoplay',async({page})=>{
 await page.goto('/de/tools/timer/');
 const section=page.locator('.timer-showcase');
 const next=section.getByRole('button',{name:'Nächste Timer-Ansicht'});
 await next.focus();await page.keyboard.press('ArrowRight');
 await expect(section.getByRole('status')).toHaveText('2 / 13');
 const stage=section.locator('.showcase-open');
 await stage.dispatchEvent('pointerdown',{pointerType:'touch',clientX:200,clientY:100});
 await stage.dispatchEvent('pointerup',{pointerType:'touch',clientX:80,clientY:100});
 await expect(section.getByRole('status')).toHaveText('3 / 13');
 await page.waitForTimeout(700);
 await expect(section.getByRole('status')).toHaveText('3 / 13');
 await expect(page.getByRole('dialog',{name:'Timer-Galerie'})).toBeHidden();
});

test.describe('without JavaScript',()=>{
 test.use({javaScriptEnabled:false});
 test('all screenshot originals remain accessible as ordinary links',async({page})=>{
  await page.goto('/de/tools/timer/');
  await expect(page.locator('.timer-gallery-thumb')).toHaveCount(pictures.length);
  for(const link of await page.locator('.timer-gallery-thumb').all())expect((await page.request.get((await link.getAttribute('href'))!)).ok()).toBe(true);
  await expect(page.locator('#showcase-next')).toBeHidden();
 });
});
