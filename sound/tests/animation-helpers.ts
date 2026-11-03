import {expect,type Page} from '@playwright/test';

/** Follow the same settings navigation as a user; leave the live canvas accessible. */
export async function chooseAnimation(page:Page,selector:string){
 const dialog=page.locator('#animation-settings-dialog');
 if(await dialog.isVisible())await page.locator('#animation-settings-close').click();
 await page.locator('#animation-settings-open').click();
 if(selector.includes('data-background-mode')){
  await page.locator('[data-animation-open=background]').click();
 }else{
  await page.locator('[data-animation-open=sound]').click();
  if(selector.includes('data-flower-center-mode'))await page.locator('#flower-settings-open').click();
  else if(!selector.includes('data-visualization'))await page.locator('#orbit-settings-open').click();
 }
 await page.locator(selector).click();
 await page.locator('#animation-settings-close').click();
 await expect(dialog).toBeHidden();
}
