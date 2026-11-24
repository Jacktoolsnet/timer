import {test,expect,type Page} from '@playwright/test';
import type {CastState} from '../src/lib/cast-state';

const senderSDK=`
window.__castMessages=[];window.__castEnds=[];let connected=false;let callback;let onMessage;
const session={sendMessage:async(ns,data)=>{window.__castMessages.push(data);onMessage?.(ns,JSON.stringify({version:1,type:'applied'}));},addMessageListener:(ns,fn)=>{onMessage=fn;},removeMessageListener:()=>{onMessage=null;}};
const context={setOptions:options=>window.__castOptions=options,addEventListener:(type,fn)=>callback=fn,getCurrentSession:()=>connected?session:null,requestSession:async()=>{connected=true;callback();},endCurrentSession:stop=>{window.__castEnds.push(stop);connected=false;callback();}};
window.cast={framework:{CastContext:{getInstance:()=>context},CastContextEventType:{SESSION_STATE_CHANGED:'session'}}};window.__onGCastApiAvailable(true);
`;
const receiverSDK=`
window.__castAcks=[];
const receiver={addCustomMessageListener:(ns,fn)=>{window.__receive=data=>fn({data,senderId:'phone'});},sendCustomMessage:(ns,id,data)=>window.__castAcks.push(data),start:options=>{window.__receiverOptions=options;}};
window.cast={framework:{CastReceiverContext:{getInstance:()=>receiver},system:{MessageType:{JSON:'JSON'}}}};
`;
async function mockSender(page:Page){await page.route('**/cast_sender.js?*',route=>route.fulfill({contentType:'text/javascript',body:senderSDK}));}
async function connect(page:Page){
 await page.locator('#clock-cast').click();await expect(page.locator('#cast-connect')).toBeEnabled();
 await page.locator('#cast-app-id').fill('ABCD1234');await page.locator('#cast-connect').click();
 await expect.poll(()=>page.evaluate('window.__castMessages.length')).toBeGreaterThan(0);
}
async function snapshot(page:Page){return await page.evaluate('window.__castMessages.at(-1)') as CastState;}

test('Cast SDK loads only on demand, validates app ID and sends live settings without alarms',async({page})=>{
 let sdkRequests=0;await page.route('**/cast_sender.js?*',route=>{sdkRequests++;return route.fulfill({contentType:'text/javascript',body:senderSDK});});
 await page.goto('/de/');await page.locator('.clock-display').waitFor();expect(sdkRequests).toBe(0);
 await page.locator('#clock-cast').click();await expect(page.locator('#cast-connect')).toBeEnabled();expect(sdkRequests).toBe(1);
 await page.locator('#cast-app-id').fill('bad');await page.locator('#cast-connect').click();await expect(page.locator('#cast-status')).toContainText('gültige');
 await page.locator('#cast-app-id').fill('abcdef12');await page.locator('#cast-connect').click();
 await expect(page.locator('#cast-status')).toContainText('übernommen');
 const state=await snapshot(page);expect(state.location).toBeNull();expect(state.settings.awake).toBe(false);expect(state.settings.zone).not.toBe('local');expect(Object.keys(state)).not.toContain('alarm');
 expect(await page.evaluate('window.__castOptions.receiverApplicationId')).toBe('ABCDEF12');
 await page.locator('#cast-close').click();
 await page.locator('[name=view]').selectOption('orbit',{force:true});await page.locator('[name=orbitReadout]').selectOption('flip',{force:true});
 await expect.poll(async()=> (await snapshot(page)).settings.orbitReadout).toBe('flip');
 await page.evaluate(()=>document.documentElement.dataset.palette='violet');
 await expect.poll(async()=> (await snapshot(page)).appearance.palette).toBe('violet');
 await page.locator('#clock-cast').click();await page.locator('#cast-disconnect').click();expect(await page.evaluate('window.__castEnds')).toEqual([false]);
 await page.locator('#cast-connect').click();await expect(page.locator('#cast-stop')).toBeVisible();await page.locator('#cast-stop').click();expect(await page.evaluate('window.__castEnds')).toEqual([false,true]);
});

test('location requires separate Cast consent and can be removed while connected',async({page,context})=>{
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:52.52,longitude:13.405});
 await mockSender(page);await page.goto('/en/');await page.locator('[name=view]').selectOption('sundial',{force:true});
 await page.locator('#seasonal-location').check();await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await connect(page);expect((await snapshot(page)).location).toBeNull();
 await page.locator('#cast-share-location').check();await expect.poll(async()=>(await snapshot(page)).location).toEqual({latitude:52.52,longitude:13.405});
 await page.locator('#cast-share-location').uncheck();await expect.poll(async()=>(await snapshot(page)).location).toBeNull();
});

test('unsupported browser reports a useful error without breaking clock',async({page})=>{
 await page.route('**/cast_sender.js?*',route=>route.fulfill({contentType:'text/javascript',body:'window.__onGCastApiAvailable(false);'}));
 await page.goto('/en/');await page.locator('#clock-cast').click();await expect(page.locator('#cast-status')).toContainText('unavailable');await expect(page.locator('#cast-connect')).toBeDisabled();await expect(page.locator('#cast-stop')).toBeHidden();await expect(page.locator('#cast-disconnect')).toBeHidden();
 await page.locator('#cast-close').click();await page.locator('[name=view]').selectOption('binary',{force:true});await expect(page.locator('.clock-display')).toHaveAttribute('data-view','binary');
});

test('receiver applies a sanitized snapshot, runs independently, never requests location or persists settings',async({page,browser})=>{
 await mockSender(page);await page.goto('/en/');await page.locator('[name=view]').selectOption('sundial',{force:true});await page.locator('[name=sundialReadout]').selectOption('digital',{force:true});await page.locator('[name=background]').selectOption('seasonal',{force:true});await connect(page);
 const state=await snapshot(page);state.settings.zone='America/Argentina/Ushuaia';state.location={latitude:-23.55,longitude:-46.63};state.appearance.palette='violet';state.language='de';
 const receiver=await browser.newPage({viewport:{width:1920,height:1080}});
 let adRequests=0;receiver.on('request',request=>{if(request.url().includes('googlesyndication'))adRequests++;});
 await receiver.addInitScript(()=>{navigator.geolocation.getCurrentPosition=()=>{throw new Error('Receiver must not request geolocation');};});
 await receiver.route('**/cast_receiver_framework.js',route=>route.fulfill({contentType:'text/javascript',body:receiverSDK}));
 await receiver.goto('/cast/');await expect.poll(()=>receiver.evaluate('!!window.__receive')).toBe(true);
 await expect(receiver.locator('body')).toHaveClass(/focus-view/);await expect(receiver.locator('.site-header')).toBeHidden();await expect(receiver.locator('meta[name=robots]')).toHaveAttribute('content','noindex, follow');
 expect(await receiver.evaluate('window.__receiverOptions.disableIdleTimeout')).toBe(true);expect(adRequests).toBe(0);
 await receiver.evaluate('window.__receive('+JSON.stringify(state)+')');
 await expect(receiver.locator('#cast-receiver-status')).toBeHidden();await expect(receiver.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');await expect(receiver.locator('#sundial-view')).toHaveAttribute('data-readout','digital');
 await expect(receiver.locator('html')).toHaveAttribute('data-palette','violet');await expect(receiver.locator('#clock-zone')).toContainText('America/Argentina/Ushuaia');
 expect(await receiver.evaluate('localStorage.length')).toBe(0);
 const before=await receiver.locator('#sundial-digital').getAttribute('datetime');await page.close();
 await expect.poll(()=>receiver.locator('#sundial-digital').getAttribute('datetime')).not.toBe(before);
 // Untrusted Cast messages cannot inject a URL/design or change a valid running display.
 for(const bad of [{...state,location:{latitude:91,longitude:0}},{...state,settings:{...state.settings,background:'https://evil.example/x'}},{...state,appearance:{...state.appearance,palette:'<script>'}}]){
  await receiver.evaluate('window.__receive('+JSON.stringify(bad)+')');expect(await receiver.evaluate('window.__castAcks.at(-1).type')).toBe('rejected');
 }
 await expect(receiver.locator('html')).toHaveAttribute('data-palette','violet');
 await receiver.evaluate('window.__receive('+JSON.stringify({...state,location:null})+')');await expect(receiver.locator('#sundial-view')).not.toHaveAttribute('data-location-state','ready');
 await receiver.close();
});

for(const lang of ['de','en','es','fr'])test(`Cast dialog has translated controls in ${lang}`,async({page})=>{
 await mockSender(page);await page.goto('/'+lang+'/');await page.locator('#clock-cast').click();await expect(page.locator('#clock-cast-dialog')).toBeVisible();await expect(page.locator('#cast-share-location')).not.toBeChecked();await expect(page.locator('#cast-connect')).toBeEnabled();
});
