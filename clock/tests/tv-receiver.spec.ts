import {test,expect} from '@playwright/test';
const snapshot={version:1,language:'de',settings:{view:'orbit',analogReadout:'off',binaryReadout:'off',orbitReadout:'flip',sundialReadout:'flip',analogDesign:'square-roman',background:'mountains',animateBackground:true,hemisphere:'north',transparency:35,date:'long',dateView:'calendarDate',format:'medium',hourCycle:'24',zone:'Europe/Berlin',seconds:true,numbers:true,smooth:true},appearance:{palette:'blue',style:'technical',theme:'dark',fontSize:'1'}};

test('receiver approval is compact, previews the real clock and rejection restores the code',async({page})=>{
 let pending=false,created=0,previewApiCalls=0;
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/v1/tv/**',route=>{
  if(route.request().frame()!==page.mainFrame())previewApiCalls++;
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/receivers/')){created++;return route.fulfill({json:{id:'test',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678'}});}
  if(path.endsWith('/stop/')){pending=false;return route.fulfill({status:204});}
  return route.fulfill({json:{state:pending?'pending':'waiting',revision:pending?1:0,acknowledged:0,...(pending?{snapshot:{...snapshot,senderName:'Chrome · Android'}}:{})}});
 });
 await page.goto('/de/stream/');
 await expect(page.locator('#tv-code')).toHaveText('1234 5678');
 await page.keyboard.press('ArrowRight');
 await expect(page.locator('.site-header')).toBeHidden();
 await expect(page.locator('#clock-focus')).toBeHidden();
 await expect(page.locator('#tv-controls')).toBeHidden();
 await expect(page.locator('#tv-fullscreen')).toBeHidden();
 await expect(page.locator('.tv-note').first()).toBeVisible();
 pending=true;
 await expect(page.locator('#tv-approve')).toBeVisible();
 await expect(page.locator('#tv-approve')).toBeFocused();
 await expect(page.locator('#tv-sender-name')).toHaveText('Chrome · Android');
 await expect(page.locator('#tv-qr')).toBeHidden();
 for(const info of await page.locator('.tv-pairing-info').all())await expect(info).toBeHidden();
 const preview=page.frameLocator('#tv-preview');
 await expect(preview.locator('.clock-display')).toHaveAttribute('data-view','orbit');
 await expect(preview.locator('.clock-card')).toHaveAttribute('data-background','mountains');
 await expect(preview.locator('html')).toHaveAttribute('data-palette','blue');
 await expect(preview.locator('#clock-tv')).toBeHidden();
 await expect(preview.locator('#clock-focus')).toBeHidden();
 await expect(page.locator('#clock-focus')).toBeHidden();
 await expect(page.locator('.clock-display')).toHaveAttribute('data-view','analog');
 expect(created).toBe(1);expect(previewApiCalls).toBe(0);
 const frame=page.locator('#tv-preview'),box=await frame.boundingBox();
 expect(box!.width).toBeLessThan(620);expect(box!.height).toBeGreaterThan(100);
 await page.screenshot({path:'/tmp/jacktools-stream-approval-'+test.info().project.name+'.png'});
 await page.locator('#tv-reject').click();
 await expect(page.locator('#tv-code')).toHaveText('1234 5678');
 await expect(page.locator('#tv-qr')).toBeVisible();
 await expect(page.locator('.tv-note').first()).toBeVisible();
 await expect(frame).not.toHaveAttribute('src',/.+/);
 expect(created).toBe(2);expect(errors).toEqual([]);
});

test('receiver requests fullscreen on approval and remote controls hide and wake safely',async({page})=>{
 let active=false,stopped=0;
 await page.addInitScript(()=>{
  (window as any).fullscreenAttempts=[];
  Element.prototype.requestFullscreen=()=>{
   (window as any).fullscreenAttempts.push(navigator.userActivation.isActive);
   return Promise.reject(new Error('Fullscreen blocked by test browser'));
  };
 });
 await page.route('**/api/v1/tv/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/receivers/'))return route.fulfill({json:{id:'test',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678'}});
  if(path.endsWith('/approve/')){active=true;return route.fulfill({status:204});}
  if(path.endsWith('/stop/')){active=false;stopped++;return route.fulfill({status:204});}
  if(path.endsWith('/ack/'))return route.fulfill({status:204});
  return route.fulfill({json:{state:active?'active':'pending',revision:1,acknowledged:1,snapshot}});
 });
 await page.goto('/de/stream/');
 await page.locator('#tv-approve').click();
 await expect(page.locator('body')).toHaveClass(/tv-ready/);
 expect(await page.evaluate(()=>(window as any).fullscreenAttempts[0])).toBe(true);
 const controls=page.locator('#tv-controls'),fullscreen=page.locator('#tv-fullscreen'),stop=page.locator('#tv-stop');
 await expect(fullscreen).toBeVisible();await expect(fullscreen).toHaveClass(/icon-text/);
 await expect(fullscreen.locator('svg')).toHaveCount(1);await expect(stop.locator('svg')).toHaveCount(1);
 await fullscreen.focus();await page.keyboard.press('ArrowRight');await expect(stop).toBeFocused();
 await expect(controls).toHaveAttribute('data-idle','true',{timeout:7000});
 await expect(stop).not.toBeFocused();
 expect(await controls.evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 // Enter wakes the chrome but must not activate the previously focused Stop button.
 await page.keyboard.press('Enter');await expect(fullscreen).toBeFocused();
 await expect(controls).not.toHaveAttribute('data-idle','true');expect(stopped).toBe(0);
 const before=await page.evaluate(()=>(window as any).fullscreenAttempts.length);
 await page.keyboard.press('Enter');
 expect(await page.evaluate(()=>(window as any).fullscreenAttempts.length)).toBe(before+1);
 await expect(page.locator('body')).toHaveClass(/tv-ready/);
 await page.keyboard.press('ArrowRight');await expect(stop).toBeFocused();
 await page.keyboard.press('Enter');await expect.poll(()=>stopped).toBe(1);
 await expect(page.locator('#tv-code')).toHaveText('1234 5678');
 await expect(controls).toBeHidden();expect(await controls.evaluate(el=>(el as HTMLElement).inert)).toBe(false);
});
