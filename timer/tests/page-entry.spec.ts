import { test, expect } from '@playwright/test';

const projects = ['company','timer','clock','stopwatch','breathe','relax','calculator','lava','metronome','sound','scenescript'];
test.beforeEach(async ({page})=>{
 // Never contact live ads, analytics or external resources from these tests.
 await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
for(const [index,project] of projects.entries()){
 const origin='http://127.0.0.1:'+(4390+index);
 test(project+': homepage/legal fade, accessibility and focus',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference',forcedColors:'none'});
  for(const path of ['/de/',project==='company'?'/datenschutz/':'/de/privacy/']){
   await page.goto(origin+path);
   const main=page.locator('.site-shell > main');
   const footer=page.locator('.site-shell > .site-footer');
   await expect(main).toHaveCSS('animation-name','jacktools-page-content-in');
   await expect(main).toHaveCSS('animation-duration','0.6s');
   await expect(main).toHaveCSS('transform','none');
   await expect(footer).toHaveCSS('animation-name','jacktools-page-footer-in');
   await expect(footer).toHaveCSS('animation-delay','0.6s');
   await expect(page.locator('.site-header')).toHaveCSS('opacity','1');
   await expect(main).toHaveCSS('opacity','1');
   await page.evaluate(()=>document.body.classList.add('focus-view'));
   await expect(main).toHaveCSS('animation-duration','0s');
   await expect(main).toHaveCSS('opacity','1');
   await page.evaluate(()=>document.body.classList.remove('focus-view'));
   expect(await main.evaluate(el=>el.getAnimations().length)).toBe(0);
   await page.emulateMedia({reducedMotion:'reduce'});
   await expect(main).toHaveCSS('animation-name','none');
   await expect(main).toHaveCSS('opacity','1');
   await expect(footer).toHaveCSS('animation-name','none');
   await page.emulateMedia({reducedMotion:'no-preference',forcedColors:'active'});
   await expect(main).toHaveCSS('animation-name','none');
   await expect(main).toHaveCSS('opacity','1');
   await page.emulateMedia({media:'print',forcedColors:'none'});
   await expect(main).toHaveCSS('animation-name','none');
   await page.emulateMedia({media:'screen',reducedMotion:'no-preference'});
  }
 });
 test(project+': content stays readable without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:'no-preference'});
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const page=await context.newPage();
  await page.goto(origin+'/de/');
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('.site-shell > main')).toHaveCSS('opacity','1');
  await context.close();
 });
}
