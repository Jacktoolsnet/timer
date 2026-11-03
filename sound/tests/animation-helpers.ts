import {expect,type Page} from '@playwright/test';

/** Follow the same settings navigation as a user; leave the live canvas accessible. */
export async function chooseAnimation(page:Page,selector:string){
 const dialog=page.locator('#animation-settings');
 if(await dialog.isVisible())await page.locator('#animation-settings-close').click();
 await page.locator('#animation-settings-open').click();
 if(selector.includes('data-background-mode')){
  await page.locator('[data-animation-open=background]').click();
 }else{
  await page.locator('[data-animation-open=sound]').click();
  if(selector.includes('data-stream-variant'))await page.locator('#stream-settings-open').click();
  else if(selector.includes('data-landscape-variant'))await page.locator('#landscape-settings-open').click();
  else if(selector.includes('data-flower-center-mode'))await page.locator('#flower-settings-open').click();
  else if(!selector.includes('data-visualization')){
   await page.locator('#orbit-settings-open').click();
   await page.locator(selector.includes('data-center-mode')?'[data-animation-open=orbit-center]':'[data-animation-open=orbit-trail]').click();
  }
 }
 await page.locator(selector).click();
 await page.locator('#animation-settings-close').click();
 await expect(dialog).toBeHidden();
}
