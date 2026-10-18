import {test,expect} from '@playwright/test';
for(const background of [false,true]){
 test(`interval total is below buttons, background=${background}`,async({page})=>{
  await page.goto('/de/training/');
  if(background){
   await page.locator('#trigger-background').click();
   await page.getByRole('option',{name:'Küche',exact:true}).click();
  }
  const total=page.locator('#training-total');
  await expect(total).toContainText('Gesamt verbleibend');
  for(const focus of [false,true]){
   if(focus){
    await page.locator('#training-focus').click();
    await expect(page.locator('body')).toHaveClass(/focus-view/);
   }
   const controls=await page.locator('.timer-controls').boundingBox();
   const bounds=await total.boundingBox();
   expect(bounds!.y).toBeGreaterThanOrEqual(controls!.y+controls!.height);
   expect(Math.abs(bounds!.x+bounds!.width/2-controls!.x-controls!.width/2)).toBeLessThan(2);
   if(focus)expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
 });
}
