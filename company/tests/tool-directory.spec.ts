import {test,expect} from '@playwright/test';
const cards=[
 ['online-timer','Online-Timer','https://timer.jacktools.net/de/'],
 ['online-uhr','Online-Uhr mit Datum','https://clock.jacktools.net/de/'],
 ['online-stoppuhr','Online-Stoppuhr mit Rundenzeiten','https://stopwatch.jacktools.net/de/'],
 ['taschenrechner','Online-Taschenrechner mit Rechenstreifen','https://calculator.jacktools.net/de/'],
 ['atemuebungen','Breathe – Atemübungen online','https://breathe.jacktools.net/de/'],
 ['naturgeraeusche','Relax – Naturgeräusche und Klänge','https://relax.jacktools.net/de/'],
 ['messagedrop','MessageDrop – Nachrichten auf der Karte','https://app.messagedrop.de'],
] as const;
test('all published tools have permanent descriptive cards and matching structured data',async({page},info)=>{
 await page.goto('/');
 await expect(page.locator('.time-tools-grid > article')).toHaveCount(7);
 const graph=await page.locator('script[type="application/ld+json"]').evaluateAll(els=>els.flatMap(el=>JSON.parse(el.textContent!)['@graph']||[]));
 const items=graph.find(x=>x['@type']==='ItemList').itemListElement;
 expect(items).toHaveLength(cards.length);
 for(const [index,[id,title,url]] of cards.entries()){
  const card=page.locator(`#${id}`);
  await expect(card.getByRole('heading',{level:3})).toHaveText(title);
  await expect(card.locator('.tool-open')).toHaveAttribute('href',url);
  expect(items[index]).toMatchObject({position:index+1,name:title,url});
  await expect(page.locator(`.tool-shortcuts a[href="#${id}"]`)).toHaveCount(1);
 }
 await expect(page.locator('.time-tools-grid')).not.toContainText('Trainingstimer');
 await expect(page.locator('#online-timer a[href="https://timer.jacktools.net/de/pomodoro/"]')).toBeVisible();
 await expect(page.locator('#online-timer a[href="https://timer.jacktools.net/de/training/"]')).toBeVisible();
 await expect(page.locator('a[href*="scenescript.jacktools.net"]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.locator('#online-stoppuhr').screenshot({path:`/tmp/company-stopwatch-card-${info.project.name}.png`});
});

test.describe('without JavaScript',()=>{
 test.use({javaScriptEnabled:false});
 test('the directory including the stopwatch is present in static HTML',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.time-tools-grid > article')).toHaveCount(7);
  await expect(page.locator('#online-stoppuhr .tool-open')).toHaveAttribute('href','https://stopwatch.jacktools.net/de/');
  await page.locator('.tool-shortcuts a[href="#online-stoppuhr"]').click();
  await expect(page).toHaveURL(/#online-stoppuhr$/);
 });
});

test('calculator has a calculation preview in its card and spotlight',async({page},info)=>{
 await page.addInitScript(()=>{Math.random=()=>.99;});
 await page.goto('/');
 await expect(page.locator('#company-spotlight')).toHaveAttribute('data-tool','calculator');
 await expect(page.locator('#company-spotlight .company-calculation')).toBeVisible();
 await expect(page.locator('#company-spotlight .text-link')).toHaveAttribute('href','https://calculator.jacktools.net/de/');
 await expect(page.locator('#taschenrechner .company-calculation')).toContainText('144,00');
 await page.locator('#taschenrechner').screenshot({path:`/tmp/company-calculator-card-${info.project.name}.png`});
});
