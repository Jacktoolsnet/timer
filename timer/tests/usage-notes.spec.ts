import {test,expect} from '@playwright/test';
for(const lang of ['de','en']){
 test(`usage notes describe timer display options in ${lang}`,async({page})=>{
  await page.goto(`/${lang}/usage/`);
  const article=page.locator('.legal-page');
  for(const text of ['25–36','13–24','1–12','25:00'])await expect(article).toContainText(text);
  await expect(page.getByRole('heading',{name:lang==='de'?'Hintergründe, Transparenz und Fokusansicht':'Backgrounds, transparency and focus view'})).toBeVisible();
  await expect(article).toContainText(lang==='de'?'Fließender Sekundenzeiger':'Smooth second hand');
 });
}
test('analog settings no longer include the usage explanation',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await page.locator('#trigger-timerView').click();
 await page.getByRole('option',{name:'Analog + Digital',exact:true}).click();
 await expect(page.locator('#analog-timer')).toBeVisible();
 await expect(page.locator('#timer-appearance')).not.toContainText('Die Zeiger zeigen');
 expect(errors).toEqual([]);
});
