import {test,expect,type Page} from '@playwright/test';
async function set(page:Page,name:string,value:string){await page.locator(`[name=${name}]`).evaluate((el,value)=>{(el as HTMLSelectElement).value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},value);}
for(const lang of ['de','en','es','fr'])test(`${lang}: six types and contextual companion controls`,async({page})=>{
 await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));await page.goto('/'+lang+'/');
 await page.locator('#trigger-view').click();await expect(page.locator('#options-view [role=option]')).toHaveCount(6);await page.keyboard.press('Escape');
 for(const type of ['analog','binary','orbit','sundial']){
  await set(page,'view',type);await expect(page.locator('#'+type+'-readout-options')).toBeVisible();
  for(const readout of ['digital','flip','off']){
   await set(page,type+'Readout',readout);
   const effective=type==='analog'?(readout==='digital'?'combined':readout==='flip'?'analogFlip':type):type==='binary'?(readout==='digital'?'binaryDigital':readout==='flip'?'binaryFlip':type):type;
   await expect(page.locator('.clock-display')).toHaveAttribute('data-view',effective);await expect(page.locator('[name=view]')).toHaveValue(type);
   await set(page,'zone','UTC');await expect(page.locator('.clock-display')).toHaveAttribute('data-view',effective);
  }
 }
 await set(page,'view','analog');await set(page,'analogReadout','flip');await set(page,'view','binary');await set(page,'binaryReadout','digital');await set(page,'view','analog');await expect(page.locator('.clock-display')).toHaveAttribute('data-view','analogFlip');
 for(const type of ['digital','flip']){await set(page,'view',type);for(const base of ['analog','binary','orbit','sundial'])await expect(page.locator('#'+base+'-readout-options')).toBeHidden();}
});
for(const legacy of ['combined','analogFlip','binaryDigital','binaryFlip'])test(`legacy ${legacy} is restored and remains stable`,async({page})=>{
 await page.addInitScript(legacy=>{localStorage.setItem('jacktools.clock.storage-consent.v1','yes');localStorage.setItem('jacktools.clock.settings.v1',JSON.stringify({view:legacy}));},legacy);await page.goto('/en/');
 await expect(page.locator('.clock-display')).toHaveAttribute('data-view',legacy);await set(page,'zone','UTC');await page.reload();await expect(page.locator('.clock-display')).toHaveAttribute('data-view',legacy);
});
