import {test,expect} from '@playwright/test';
test('the randomly selected spotlight retains a descriptive main heading',async({page},info)=>{
 await page.goto('/');
 await expect(page).toHaveTitle('Online-Tools: Timer, Uhr & Entspannung · Jacktools.net');
 await expect(page.locator('h1')).toHaveCount(1);
 await expect(page.locator('h1')).toContainText('Online-Tools');
 await expect(page.locator('.hero-slogan')).toBeVisible();
 for(const id of ['timer','clock','stopwatch','breathe','relax','message','calculator']){
  await page.evaluate(id=>{
   const template=document.querySelector<HTMLTemplateElement>(`template[data-spotlight="${id}"]`)!;
   document.getElementById('company-spotlight')!.replaceChildren(template.content.cloneNode(true));
  },id);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('Online-Tools');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`/tmp/jacktools-company-seo-${info.project.name}.png`,fullPage:true});
});
