import {test,expect,type Page} from '@playwright/test';
async function view(page:Page,value:'orbit'|'sundial'){
 await page.locator('#trigger-view').click();await page.getByRole('option',{name:value==='orbit'?'Orbit-Uhr':'Sonnenuhr',exact:true}).click();
}
async function mode(page:Page,view:string,value:string){
 await page.locator(`#trigger-${view}Readout`).click();await page.locator(`#options-${view}Readout [role=option]`).nth(['off','digital','flip'].indexOf(value)).click();
}
test.beforeEach(async({page})=>{
 await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));
 await page.clock.install({time:new Date('2026-11-24T14:25:36Z')});await page.clock.pauseAt(new Date('2026-11-24T14:25:36.001Z'));
 await page.goto('/de/');
 await page.locator('[name=zone]').evaluate(el=>{(el as HTMLSelectElement).value='UTC';el.dispatchEvent(new Event('change',{bubbles:true}));});
});
test('orbit and sundial choose off, digital or flip independently and retain date controls',async({page})=>{
 for(const dial of ['orbit','sundial'] as const){
  await view(page,dial);
  await expect(page.locator(`#${dial}-readout-options`)).toBeVisible();
  await expect(page.locator(`#${dial==='orbit'?'sundial':'orbit'}-readout-options`)).toBeHidden();
  for(const choice of ['digital','flip','off']){
   await mode(page,dial,choice);
   const digital=page.locator(`#${dial}-digital`),flip=page.locator(`#${dial}-flip`);
   await expect(digital).toBeVisible({visible:choice==='digital'});await expect(flip).toBeVisible({visible:choice==='flip'});
   if(choice==='digital')await expect(digital).toHaveText('14:25:36');
   if(choice==='flip')expect(await flip.locator('.flip-digit').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.value).join(''))).toBe('142536');
   await expect(page.locator('.date-calendar')).toBeVisible();
  }
 }
 await view(page,'orbit');await mode(page,'orbit','flip');await view(page,'sundial');await mode(page,'sundial','digital');
 await view(page,'orbit');await expect(page.locator('#orbit-flip')).toBeVisible();
 await page.locator('[name=seconds]').uncheck();await expect(page.locator('#orbit-flip .flip-digit')).toHaveCount(4);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.reload();
 await expect(page.locator('#orbit-flip')).toBeVisible();await view(page,'sundial');await expect(page.locator('#sundial-digital')).toHaveText('14:25');
 await page.locator('#trigger-view').click();await page.getByRole('option',{name:'Binär',exact:true}).click();
 await expect(page.locator('#orbit-readout-options')).toBeHidden();await expect(page.locator('#sundial-readout-options')).toBeHidden();
});
test('all companion modes keep the dial left of the calendar in phone landscape',async({page},info)=>{
 for(const size of [{width:568,height:320},{width:844,height:390},{width:390,height:844}]){
  await page.setViewportSize(size);
  for(const dial of ['orbit','sundial'] as const)for(const choice of ['off','digital','flip']){
   await page.evaluate(()=>document.body.classList.remove('focus-view'));await view(page,dial);await mode(page,dial,choice);
   await page.evaluate(()=>document.body.classList.add('focus-view'));
   const face=(await page.locator(`#${dial}-view`).boundingBox())!,calendar=(await page.locator('.date-calendar').boundingBox())!;
   if(size.width>size.height)expect(face.x+face.width).toBeLessThan(calendar.x);else expect(face.y+face.height).toBeLessThan(calendar.y);
   for(const b of [face,calendar]){expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(size.width+1);expect(b.y+b.height).toBeLessThanOrEqual(size.height+1);}
   if(size.width===844)await page.screenshot({path:`/tmp/${dial}-${choice}-${info.project.name}.png`});
  }
 }
});
