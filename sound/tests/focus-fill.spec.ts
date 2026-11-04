import {test,expect} from '@playwright/test';
import {chooseAnimation} from './animation-helpers';

for(const visualization of ['orbit','flower','stream','landscape','constellation']){
 test('animation-only focus fills the viewport: '+visualization,async({page})=>{
  await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('fallback');};});
  await page.goto('/de/');
  await chooseAnimation(page,`button[data-visualization=${visualization}]`);
  await page.locator('#focus').click();
  await page.locator('#hide-focus-controls').click();
  await expect(page.locator('body')).toHaveClass(/focus-idle/);
  await page.waitForTimeout(800); // Focus FLIP animation has settled.
  const check=async()=>{
   const viewport=page.viewportSize()!;
   for(const selector of ['.orbit-wrap','#orbit']){
    const box=(await page.locator(selector).boundingBox())!;
    expect(box.x).toBeCloseTo(0,0);expect(box.y).toBeCloseTo(0,0);
    expect(box.width).toBeCloseTo(viewport.width,0);expect(box.height).toBeCloseTo(viewport.height,0);
   }
   expect(await page.locator('#orbit').evaluate(el=>getComputedStyle(el).objectFit)).toBe('cover');
   await expect(page.locator('.flow-side')).toBeHidden();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);
  };
  await check();
  const original=page.viewportSize()!;
  await page.setViewportSize({width:original.height,height:original.width});
  await check();
  await page.keyboard.press('Tab');
  await expect(page.locator('body')).not.toHaveClass(/focus-idle/);
  await expect(page.locator('.flow-side')).toBeVisible();
  await page.locator('#focus').click();
  await expect(page.locator('body')).not.toHaveClass(/focus-view/);
  expect(await page.locator('#orbit').evaluate(el=>getComputedStyle(el).objectFit)).not.toBe('cover');
 });
}
