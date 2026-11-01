import {test,expect} from '@playwright/test';
import {partsForStyle,presets,styleIds} from '../src/lib/presets';
test('all styles fill eight tracks with quiet sparse accompaniment',()=>{
 for(const style of styleIds){
  const original=JSON.stringify(presets[style]),parts=partsForStyle(style);
  expect(parts).toHaveLength(8);
  expect(parts.slice(0,presets[style].parts.length)).toEqual(presets[style].parts);
  for(const extra of parts.slice(presets[style].parts.length)){
   expect(extra.steps).toHaveLength(1);expect(extra.volume).toBeLessThanOrEqual(.2);
   expect(presets[style].grid).toContain(extra.steps[0]);
  }
  parts[0].steps.push(15);expect(JSON.stringify(presets[style])).toBe(original);
 }
});
test('random play respects manually disabled tracks',async({page})=>{
 await page.goto('/de/');
 const row=page.locator('.instrument').last();
 await row.locator('summary').click();await row.locator('.track-enabled').uncheck();
 await page.locator('#evolve').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(row).toHaveAttribute('data-enabled','false');
 await page.locator('#play').click();
 await expect(row).toHaveAttribute('data-enabled','false');
});
