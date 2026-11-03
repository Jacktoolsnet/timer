import {test,expect} from '@playwright/test';
test('editing surfaces use a large dual-contrast cursor with a precise central hotspot in both themes',async({page,request})=>{
 const asset=await request.get('/cursors/edit-crosshair.svg');expect(asset.ok()).toBe(true);const svg=await asset.text();expect(svg).toContain('width="32"');expect(svg).toContain('stroke="#08111b"');expect(svg).toContain('stroke="#ffffff"');
 await page.goto('/de/');
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  for(const selector of ['#drawing','#orbit'])expect(await page.locator(selector).evaluate(el=>getComputedStyle(el).cursor)).toMatch(/edit-crosshair\.svg.*16 16, crosshair/);
  await page.locator('[data-pad-mode=notes]').click();await page.locator('[data-score-track="4"]').click();await page.locator('#score-grid').scrollIntoViewIfNeeded();
  expect(await page.locator('#score-grid').evaluate(el=>getComputedStyle(el).cursor)).toMatch(/edit-crosshair\.svg.*16 16, crosshair/);
  expect(await page.locator('.score-point').first().evaluate(el=>getComputedStyle(el).cursor)).toBe('pointer');
  await page.locator('#score-cancel').click();await expect(page.locator('#score-expanded-dialog')).not.toBeVisible();await page.locator('[data-pad-mode=draw]').click();
 }
});
