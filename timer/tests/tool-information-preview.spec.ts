import {test,expect} from '@playwright/test';
// Uses the multi-site built previews started by playwright.tools.config.ts.
test.skip(!process.env.TOOL_PREVIEW_TESTS,'Run with TOOL_PREVIEW_TESTS=1 and playwright.tools.config.ts');
const apps=['timer','clock','stopwatch','breathe','relax','calculator','scenescript'];
for(const [index,app] of apps.entries()){
 test(`built ${app} information layout`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${4350+index}/de/`);
  const section=page.locator('[data-tool-information]');
  await expect(section).toBeVisible();
  await expect(section.locator('dt')).toHaveCount(2);
  const links=await section.locator('nav a').evaluateAll(els=>els.map(el=>(el as HTMLAnchorElement).href));
  expect(links.every(url=>!url.includes('scenescript.'))).toBeTruthy();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await section.screenshot({path:`/tmp/${app}-tool-information-${info.project.name}.png`});
  expect(errors).toEqual([]);
 });
}
