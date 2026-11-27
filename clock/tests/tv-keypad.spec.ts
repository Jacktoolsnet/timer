import {test,expect} from '@playwright/test';

test('stream dialog is compact and its keypad supports remote navigation, editing and submission',async({page})=>{
 let submitted='';
 await page.route('**/api/v1/tv/**',route=>{
  if(route.request().url().endsWith('/claim/')){submitted=route.request().postDataJSON().code;return route.fulfill({contentType:'application/json',body:JSON.stringify({id:'test',senderToken:'a'.repeat(64),revision:1})});}
  return route.fulfill({contentType:'application/json',body:JSON.stringify({state:'pending',revision:1,acknowledged:0})});
 });
 await page.goto('/de/');await page.locator('#tv-open').click();
 await expect(page.locator('#tv-title')).toHaveText('Deine Uhr streamen');
 await expect(page.locator('#tv-pair-hint .tv-receiver-url')).toHaveText('clock.jacktools.net/stream');
 await expect(page.locator('#tv-pair-hint .tv-receiver-url')).toHaveAttribute('href','/stream/');
 await expect(page.locator('#tv-pair-hint .tv-receiver-url')).toHaveAttribute('target','_blank');
 await expect(page.locator('#tv-dialog .dialog-inner>p:not(#tv-status)')).toHaveCount(1);
 await expect(page.locator('#tv-pair-code')).toBeFocused();
 const input=page.locator('#tv-pair-code'),send=page.locator('#tv-send');await expect(send).toBeDisabled();await expect(input).toHaveAttribute('placeholder','Kopplungscode');await expect(input).toHaveAccessibleName('Kopplungscode');
 await input.focus();await page.keyboard.press('ArrowDown');await expect(page.locator('[data-key="1"]')).toBeFocused();
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(input).toHaveValue('2');
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(input).toHaveValue('25');
 await page.keyboard.press('Backspace');await expect(input).toHaveValue('2');await page.keyboard.press('Delete');await expect(input).toHaveValue('');
 for(const key of '1234567')await page.locator(`[data-key="${key}"]`).click();await expect(input).toHaveValue('1234567');await expect(send).toBeDisabled();
 await page.getByRole('button',{name:'Letzte Ziffer löschen',exact:true}).click();await expect(input).toHaveValue('123456');
 await page.getByRole('button',{name:'Code komplett löschen',exact:true}).click();await expect(input).toHaveValue('');
 await input.fill('12a34 5678');await expect.poll(()=>submitted).toBe('12345678');await expect(page.locator('#tv-dialog')).toBeVisible();
 await expect(page.locator('#tv-display-size')).toBeFocused();
 await expect(page.locator('#tv-pair-hint')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('QR pairing hides the entire numeric pad but still requires explicit sending',async({page})=>{
 let claims=0;
 await page.route('**/api/v1/tv/**',route=>{claims++;return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'invalid_pairing'})});});
 await page.goto('/de/pair/#tv='+'a'.repeat(64));await expect(page.locator('#tv-dialog')).toBeVisible();await expect(page.locator('#tv-code-entry')).toBeHidden();await expect(page.locator('#tv-send')).toBeEnabled();expect(claims).toBe(0);
 await page.locator('#tv-send').click();await expect(page.locator('#tv-code-entry')).toBeVisible();await expect(page.locator('#tv-send')).toBeDisabled();
});

test('a complete code pairs automatically; an invalid code keeps the dialog open',async({page})=>{
 let claims=0;await page.route('**/api/v1/tv/**',route=>{claims++;return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'invalid_pairing'})});});
 await page.goto('/de/');await page.locator('#tv-open').click();await page.locator('#tv-pair-code').fill('1234567');expect(claims).toBe(0);
 await page.locator('[data-key="8"]').click();await expect.poll(()=>claims).toBe(1);await expect(page.locator('#tv-status')).toContainText('Code ungültig');await expect(page.locator('#tv-dialog')).toBeVisible();
 await page.locator('[data-key="9"]').click();expect(claims).toBe(1);
});
