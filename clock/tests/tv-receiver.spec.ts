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
 await expect(page.locator('.tv-note')).toHaveCount(0);
 await expect(page.locator('#tv-validity')).toBeVisible();
 pending=true;
 await expect(page.locator('#tv-approve')).toBeVisible();
 await expect(page.locator('#tv-approve')).toBeFocused();
 await expect(page.locator('.site-header')).toBeHidden();
 await expect(page.locator('#tv-fullscreen')).toBeHidden();
 await expect(page.locator('#tv-stop')).toBeHidden();
 await expect(page.locator('#tv-sender-name')).toHaveText('Chrome · Android');
 await expect(page.locator('#tv-qr')).toBeHidden();
 for(const info of await page.locator('.tv-pairing-info').all())await expect(info).toBeHidden();
 const preview=page.frameLocator('#tv-preview');
 await expect(preview.locator('.clock-display')).toHaveAttribute('data-view','orbit');
 await expect(preview.locator('.clock-card')).toHaveAttribute('data-background','mountains');
 await expect(preview.locator('html')).toHaveAttribute('data-palette','blue');
 await expect(preview.locator('#clock-tv')).toBeHidden();
 await expect(preview.locator('#clock-focus')).toBeHidden();
 await expect(preview.locator('.site-header')).toBeHidden();
 await expect(preview.locator('#tv-fullscreen')).toBeHidden();
 await expect(page.locator('#clock-focus')).toBeHidden();
 await expect(page.locator('.clock-display')).toHaveAttribute('data-view','analog');
 expect(created).toBe(1);expect(previewApiCalls).toBe(0);
 const frame=page.locator('#tv-preview'),box=await frame.boundingBox();
 expect(box!.width).toBeLessThan(620);expect(box!.height).toBeGreaterThan(100);
 await page.screenshot({path:'/tmp/jacktools-stream-approval-'+test.info().project.name+'.png'});
 await page.locator('#tv-approve').focus();
 await page.keyboard.press('ArrowRight');await expect(page.locator('#tv-reject')).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('#tv-code')).toHaveText('1234 5678');
 await expect(page.locator('#tv-qr')).toBeVisible();
 await expect(page.locator('#tv-validity')).toBeVisible();
 await expect(frame).not.toHaveAttribute('src',/.+/);
 expect(created).toBe(2);expect(errors).toEqual([]);
});

for(const allowFullscreen of [true,false])test('receiver stream has only a stop icon, wakes safely and exits fullscreen (allowed: '+allowFullscreen+')',async({page})=>{
 let active=false,stopped=0;
 await page.addInitScript(allow=>{
  (window as any).fullscreenAttempts=[];
  (window as any).fullscreenExits=0;
  let fullscreen:Element|null=null;
  Object.defineProperty(document,'fullscreenElement',{get:()=>fullscreen});
  document.exitFullscreen=async()=>{fullscreen=null;(window as any).fullscreenExits++;document.dispatchEvent(new Event('fullscreenchange'));};
  Element.prototype.requestFullscreen=()=>{
   (window as any).fullscreenAttempts.push(navigator.userActivation.isActive);
   if(!allow)return Promise.reject(new Error('Fullscreen blocked by test browser'));
   fullscreen=document.documentElement;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();
  };
 },allowFullscreen);
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
 const controls=page.locator('#tv-controls'),stop=page.locator('#tv-stop');
 await expect(controls.locator('button')).toHaveCount(1);
 await expect(page.locator('#tv-fullscreen')).toHaveCount(0);
 await expect(stop).toBeVisible();await expect(stop).toHaveClass(/icon-text/);
 await expect(stop.locator('svg')).toHaveCount(1);await expect(stop).toHaveText('');
 await expect(stop).toHaveAccessibleName('Stream beenden');await expect(stop).toHaveAttribute('title','Stream beenden');
 await page.keyboard.press('ArrowRight');await expect(stop).toBeFocused();
 await expect(controls).toHaveAttribute('data-idle','true',{timeout:7000});
 await expect(stop).not.toBeFocused();
 expect(await controls.evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 // Enter wakes the chrome but must not activate the previously focused Stop button.
 await page.keyboard.press('Enter');await expect(stop).toBeFocused();
 await expect(controls).not.toHaveAttribute('data-idle','true');expect(stopped).toBe(0);
 await page.keyboard.press('Enter');await expect.poll(()=>stopped).toBe(1);
 await expect(page.locator('#tv-code')).toHaveText('1234 5678');
 await expect(controls).toBeHidden();expect(await controls.evaluate(el=>(el as HTMLElement).inert)).toBe(false);
 expect(await page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
 expect(await page.evaluate(()=>(window as any).fullscreenExits)).toBe(allowFullscreen?1:0);
});

test('pairing validity counts down, expires without displaying an old QR and resets for a new code',async({page})=>{
 await page.clock.install();
 let created=0;
 await page.route('**/api/v1/tv/**',route=>{
  if(route.request().url().endsWith('/receivers/')){
   created++;return route.fulfill({json:{id:'test-'+created,receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:10}});
  }
  return route.fulfill({json:{state:'waiting',revision:0,acknowledged:0}});
 });
 await page.goto('/de/stream/');
 await expect(page.locator('#tv-countdown')).toHaveText('00:10');
 await expect(page.locator('#tv-validity-progress')).toHaveAttribute('max','10');
 await expect(page.locator('#tv-validity-progress')).toHaveAttribute('value','10');
 await page.clock.runFor(3000);
 await expect(page.locator('#tv-countdown')).toHaveText('00:07');
 await expect(page.locator('#tv-validity-progress')).toHaveAttribute('value','7');
 await page.clock.fastForward(8000);
 await expect(page.locator('#tv-validity-label')).toHaveText('Code abgelaufen');
 await expect(page.locator('#tv-validity-progress')).toHaveAttribute('value','0');
 await expect(page.locator('#tv-qr')).toBeHidden();await expect(page.locator('#tv-code')).toBeHidden();
 await expect(page.locator('#tv-retry')).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('#tv-countdown')).toHaveText('00:10');
 await expect(page.locator('#tv-validity-label')).toHaveText('Code gültig für');
 await expect(page.locator('#tv-qr')).toBeVisible();expect(created).toBe(2);
});

test('receiver remote navigation survives delayed preview loading and preserves the chosen button',async({page})=>{
 let approved=0,polls=0,releasePreview!:()=>void;
 const previewGate=new Promise<void>(resolve=>releasePreview=resolve);
 await page.addInitScript(()=>{
  Element.prototype.requestFullscreen=()=>Promise.reject(new Error('No fullscreen in navigation test'));
 });
 await page.route('**/stream/?preview=1',async route=>{await previewGate;await route.continue();});
 await page.route('**/api/v1/tv/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/receivers/'))return route.fulfill({json:{id:'remote-test',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:600}});
  if(path.endsWith('/approve/')){approved++;return route.fulfill({status:204});}
  if(path.endsWith('/ack/'))return route.fulfill({status:204});
  polls++;
  return route.fulfill({json:{state:approved?'active':'pending',revision:1,acknowledged:1,snapshot}});
 });
 await page.goto('/de/stream/');
 const approve=page.locator('#tv-approve'),reject=page.locator('#tv-reject');
 await expect(approve).toBeFocused();
 // The preview is still loading: remote navigation must already work.
 await page.keyboard.press('ArrowRight');await expect(reject).toBeFocused();
 releasePreview();
 await expect(page.frameLocator('#tv-preview').locator('.clock-display')).toHaveAttribute('data-view','orbit');
 await expect(reject).toBeFocused();
 await expect.poll(()=>polls).toBeGreaterThan(1);
 await expect(reject).toBeFocused(); // Polling must not reset the user's selection.
 await page.keyboard.press('Shift+Tab');await expect(approve).toBeFocused();
 await page.keyboard.press('Tab');await expect(reject).toBeFocused();
 for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']){
  await approve.focus();
  await page.keyboard.press(key);await expect(reject).toBeFocused();
  await page.keyboard.press(key);await expect(approve).toBeFocused();
 }
 expect(approved).toBe(0);
 await expect(page.locator('.tv-clock-preview')).toHaveAttribute('inert','');
 await reject.focus();
 await page.locator('#tv-preview').evaluate((frame:HTMLIFrameElement)=>frame.focus());
 await expect(reject).toBeFocused(); // A modern browser keeps the frame inert.
 // Simulate a TV browser without inert support stealing focus on frame load.
 await page.locator('#tv-preview').evaluate((frame:HTMLIFrameElement)=>{
  frame.parentElement!.inert=false;frame.focus();
 });
 await expect(reject).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(approve).toBeFocused();
 await page.keyboard.press('Enter');
 await expect.poll(()=>approved).toBe(1);
 await expect(page.locator('body')).toHaveClass(/tv-ready/);
});

test('receiver retry is focused on initial and repeated failures and works with Enter',async({page})=>{
 let attempts=0;
 await page.route('**/api/v1/tv/**',route=>{
  if(route.request().url().endsWith('/receivers/')){
   attempts++;
   if(attempts<=2)return route.fulfill({status:503,json:{error:'unavailable'}});
   return route.fulfill({json:{id:'retry-test',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:600}});
  }
  return route.fulfill({json:{state:'waiting',revision:0,acknowledged:0}});
 });
 await page.goto('/en/stream/');
 const retry=page.locator('#tv-retry');
 await expect(retry).toBeFocused();expect(attempts).toBe(1);
 await page.keyboard.press('Enter');
 await expect.poll(()=>attempts).toBe(2);
 await expect(retry).toBeEnabled();await expect(retry).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('#tv-code')).toHaveText('1234 5678');
 await expect(retry).toBeHidden();expect(attempts).toBe(3);
});

test('receiver retry takes focus when a pending pairing session expires',async({page})=>{
 let expired=false;
 await page.route('**/api/v1/tv/**',route=>{
  if(route.request().url().endsWith('/receivers/'))return route.fulfill({json:{id:'expired-test',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:600}});
  if(expired)return route.fulfill({status:410,json:{error:'expired'}});
  return route.fulfill({json:{state:'pending',revision:1,acknowledged:0,snapshot}});
 });
 await page.goto('/en/stream/');
 await expect(page.locator('#tv-approve')).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(page.locator('#tv-reject')).toBeFocused();
 expired=true;
 await expect(page.locator('#tv-retry')).toBeFocused();
 await expect(page.locator('#tv-approve')).toBeHidden();
 await expect(page.locator('#tv-reject')).toBeHidden();
});

for(const remoteKey of ['Enter','Select'])test('receiver recovers ignored focus and accepts remote key without DOM focus ('+remoteKey+')',async({page})=>{
 let approved=0;
 await page.addInitScript(()=>{
  const original=HTMLElement.prototype.focus;
  let focusAllowedAt=0;
  (window as any).ignoredApprovalFocus=0;
  HTMLElement.prototype.focus=function(options?:FocusOptions){
   if(this.id==='tv-approve'){
    if(!focusAllowedAt)focusAllowedAt=Date.now()+700;
    if(Date.now()<focusAllowedAt){(window as any).ignoredApprovalFocus++;return;}
   }
   original.call(this,options);
  };
  Element.prototype.requestFullscreen=()=>Promise.reject(new Error('No fullscreen in focus test'));
 });
 await page.route('**/api/v1/tv/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/receivers/'))return route.fulfill({json:{id:'slow-focus',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:600}});
  if(path.endsWith('/approve/')){approved++;return route.fulfill({status:204});}
  if(path.endsWith('/ack/'))return route.fulfill({status:204});
  return route.fulfill({json:{state:approved?'active':'pending',revision:1,acknowledged:1,snapshot}});
 });
 await page.goto('/en/stream/');
 const approve=page.locator('#tv-approve'),reject=page.locator('#tv-reject');
 await expect(approve).toBeFocused();
 expect(await page.evaluate(()=>(window as any).ignoredApprovalFocus)).toBeGreaterThan(0);
 expect(approved).toBe(0);
 await page.keyboard.press('ArrowRight');await expect(reject).toBeFocused();
 await reject.evaluate((button:HTMLButtonElement)=>button.blur());
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(reject).toBeFocused(); // Restore the selected action, not always Approve.
 await page.keyboard.press('ArrowLeft');await expect(approve).toBeFocused();
 await approve.evaluate((button:HTMLButtonElement)=>button.blur());
 if(remoteKey==='Enter')await page.keyboard.press('Enter');
 else await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Select',bubbles:true,cancelable:true})));
 await expect.poll(()=>approved).toBe(1);
 await expect(page.locator('body')).toHaveClass(/tv-ready/);
});
