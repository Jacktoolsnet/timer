import {test,expect,type Page} from '@playwright/test';
import QRCode from 'qrcode';

async function fakeCamera(page:Page,image:string){
 await page.addInitScript(async image=>{
  const state={calls:0,stops:0,audio:undefined as boolean|undefined};(window as any).__camera=state;
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async(options:MediaStreamConstraints)=>{
   state.calls++;state.audio=options.audio as boolean;
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
   const picture=new Image();picture.src=image;await picture.decode();canvas.getContext('2d')!.drawImage(picture,0,0,512,512);
   const stream=canvas.captureStream(5);for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{state.stops++;stop();};}return stream;
  }}});
 },image);
}

test('camera scanner decodes a real pairing QR locally, releases camera and starts pairing automatically',async({page,baseURL})=>{
 const secret='b'.repeat(64),qr=await QRCode.toDataURL(baseURL+'/de/pair/#tv='+secret,{width:512,margin:4});await fakeCamera(page,qr);
 let claim:Record<string,unknown>|undefined;
 await page.route('**/api/v1/tv/**',route=>{if(route.request().url().endsWith('/claim/')){claim=route.request().postDataJSON();return route.fulfill({contentType:'application/json',body:JSON.stringify({id:'test',senderToken:'a'.repeat(64),revision:1})});}return route.fulfill({contentType:'application/json',body:JSON.stringify({state:'pending',revision:1,acknowledged:0})});});
 await page.goto('/de/');await page.locator('#tv-open').click();await expect(page.locator('#tv-send')).toHaveText('Stream starten');expect(await page.evaluate(()=>(window as any).__camera.calls)).toBe(0);
 await page.locator('#tv-scan').click();await expect.poll(()=>claim?.pairToken,{timeout:15000}).toBe(secret);
 await expect(page.locator('#tv-scanner-dialog')).not.toBeVisible();await expect(page.locator('#tv-code-entry')).toBeHidden();await expect(page.locator('#tv-dialog')).toBeVisible();await expect(page.locator('#tv-display-size')).toBeFocused();
 expect(await page.evaluate(()=>(window as any).__camera.audio)).toBe(false);await expect.poll(()=>page.evaluate(()=>(window as any).__camera.stops)).toBeGreaterThan(0);
 expect(await page.locator('#tv-scanner-video').evaluate((video:HTMLVideoElement)=>video.srcObject)).toBeNull();
 await expect.poll(()=>claim?.pairToken).toBe(secret);
});

test('foreign QR links are rejected without navigating and Escape releases the camera',async({page})=>{
 await fakeCamera(page,await QRCode.toDataURL('https://evil.example/de/pair/#tv='+'c'.repeat(64),{width:512,margin:4}));
 let requests=0;await page.route('**/api/v1/tv/**',route=>{requests++;return route.abort();});
 await page.goto('/de/');await page.locator('#tv-open').click();await page.locator('#tv-scan').click();await expect(page.locator('#tv-scanner-status')).toContainText('kein passender',{timeout:15000});
 expect(requests).toBe(0);await page.keyboard.press('Escape');await expect(page.locator('#tv-scanner-dialog')).not.toBeVisible();await expect.poll(()=>page.evaluate(()=>(window as any).__camera.stops)).toBeGreaterThan(0);
 await expect(page.locator('#tv-code-entry')).toBeVisible();await expect(page.locator('#tv-send')).toBeDisabled();
});

test('camera denial leaves manual code entry available',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))}}));
 await page.goto('/de/');await page.locator('#tv-open').click();await page.locator('#tv-pair-code').fill('1234');await page.locator('#tv-scan').click();await expect(page.locator('#tv-scanner-status')).toContainText('Kamerazugriff nicht erlaubt');
 await page.locator('#tv-scanner-close').click();await expect(page.locator('#tv-pair-code')).toHaveValue('1234');await page.locator('#tv-pair-code').fill('1234567');await expect(page.locator('#tv-send')).toBeDisabled();
});

test('a permission response arriving after close does not leak a camera stream',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).__lateStops=0;
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:()=>new Promise<MediaStream>(resolve=>{
   (window as any).__grant=()=>{const canvas=document.createElement('canvas');const stream=canvas.captureStream();stream.getTracks().forEach(track=>{const stop=track.stop.bind(track);track.stop=()=>{(window as any).__lateStops++;stop();};});resolve(stream);};
  })}});
 });
 await page.goto('/de/');await page.locator('#tv-open').click();await page.locator('#tv-scan').click();await expect(page.locator('#tv-scanner-dialog')).toBeVisible();await page.locator('#tv-scanner-close').click();await page.evaluate(()=>(window as any).__grant());
 await expect.poll(()=>page.evaluate(()=>(window as any).__lateStops)).toBeGreaterThan(0);await expect(page.locator('#tv-scanner-dialog')).not.toBeVisible();
});
