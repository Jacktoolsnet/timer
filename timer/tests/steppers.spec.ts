import {test,expect} from '@playwright/test';
for(const route of ['de','de/pomodoro','de/training','fr/training']) {
 test(route+' number fields have touch steppers',async({page})=>{
  await page.goto('/'+route+'/');
  const field=page.locator('input[type=number]').first();
  const id=await field.getAttribute('id');
  const previous=Number(await field.inputValue());
  const up=page.locator('[data-step-target="'+id+'"][data-step-direction="1"]');
  await up.click(); await expect(field).toHaveValue(String(previous+1));
  await page.locator('[data-step-target="'+id+'"][data-step-direction="-1"]').click();
  await expect(field).toHaveValue(String(previous));
  const box=await up.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
