import {test,expect} from '@playwright/test';
import {information,informationLabels,toolUrl} from '../../shared/tool-information';
for(const lang of ['de','en','es','fr'] as const){
 for(const [route,tool] of [['','countdown'],['pomodoro/','pomodoro'],['training/','interval']] as const){
  test(`visible facts and structured application data: ${lang}/${route}`,async({page})=>{
   await page.goto(`/${lang}/${route}`);
   const section=page.locator('[data-tool-information]');
   await expect(section).toBeVisible();
   await expect(section.locator('h2')).toHaveText(information[tool][lang].name);
   await expect(section.locator('dt')).toHaveCount(2);
   const schema=await page.locator('script[type="application/ld+json"]').evaluateAll(els=>els.map(el=>JSON.parse(el.textContent!)).find(x=>x['@type']==='WebApplication'));
   expect(schema.url).toBe(toolUrl(tool,lang));
   expect(schema.description).toBe(information[tool][lang].summary);
   await expect(section).toContainText(informationLabels[lang].accountAnswer);
   await page.locator('#focus-view, #training-focus').click();
   await expect(section).toBeHidden();
  });
 }
}
