import type {Page} from '@playwright/test';
export async function selectDialDesign(page:Page,design:string) {
 await page.locator('#trigger-dialShape').click();
 await page.locator('#options-dialShape [role=option]').nth(design.startsWith('square-')?1:0).click();
 await page.locator('#trigger-dialStyle').click();
 await page.locator('#options-dialStyle [role=option]').nth(['standard','roman','minimal','railway'].indexOf(design.replace(/^square-/,''))).click();
}
