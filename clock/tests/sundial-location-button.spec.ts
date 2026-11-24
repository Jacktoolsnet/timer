import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
});
test('dial button uses the shared radio, waits for permission and hides on success',async({page})=>{
 await page.addInitScript(()=>{
  Object.assign(window,{requests:0});
  navigator.geolocation.getCurrentPosition=success=>{
   (window as any).requests++;
   (window as any).completeLocation=()=>success({coords:{latitude:52.52,longitude:13.405,accuracy:10},timestamp:Date.now()} as GeolocationPosition);
  };
  navigator.geolocation.watchPosition=()=>1;
 });
 await page.goto('/de/');await page.locator('#trigger-view').click();await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 const button=page.getByRole('button',{name:'Für Sonnenuhr bitte Standort aktivieren'}),radio=page.locator('#seasonal-location');
 await expect(button).toBeVisible();await expect(radio).not.toBeChecked();
 expect(await page.evaluate(()=>(window as any).requests)).toBe(0);
 await button.focus();await page.keyboard.press('Enter');
 await expect(radio).toBeChecked();await expect(button).toBeDisabled();await expect(button).toHaveAttribute('aria-busy','true');
 expect(await page.evaluate(()=>(window as any).requests)).toBe(1);
 await page.evaluate(()=>(window as any).completeLocation());
 await expect(button).toBeHidden();await expect(page.locator('#sundial-coordinates')).toContainText('52,5200');
 await page.locator('#seasonal-north').check();await expect(button).toBeVisible();await expect(button).toBeEnabled();
 await expect(radio).not.toBeChecked();
 // Switching on via the original control also hides the dial button on success.
 await radio.check();await page.evaluate(()=>(window as any).completeLocation());await expect(button).toBeHidden();
});
test('denied dial request offers retry without a second independent location mode',async({page})=>{
 await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=(_success,error)=>error?.({code:1,message:'',PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3});});
 await page.goto('/en/');await page.locator('#trigger-view').click();await page.getByRole('option',{name:'Sundial',exact:true}).click();
 const button=page.getByRole('button',{name:'Enable location for the sundial'});
 await button.click();await expect(button).toBeEnabled();await expect(button).toContainText('denied');
 await expect(page.locator('#seasonal-location')).not.toBeChecked();
 await expect(page.locator('#sundial-coordinates-area')).toHaveAttribute('visibility','hidden');
});
