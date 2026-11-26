// Optional end-to-end regression: real PostgreSQL + Express + Astro + two browsers.
// Uses test-only credentials and a disposable database, never the operator .env.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import type {Config} from '../src/config.js';
export async function tvBrowserTest(base:string,config:Config){
 const require=createRequire(import.meta.url);
 const {chromium,expect}=require('../../clock/node_modules/@playwright/test');
 const listener=createServer();await new Promise<void>(r=>listener.listen(0,'127.0.0.1',r));const port=(listener.address() as {port:number}).port;await new Promise<void>(r=>listener.close(()=>r()));
 const origin=`http://127.0.0.1:${port}`;config.tv.origins.push(origin);
 const app=spawn('npm',['run','dev','--','--port',String(port),'--ignore-lock'],{cwd:fileURLToPath(new URL('../../clock/',import.meta.url)),env:{...process.env,PUBLIC_BACKEND_URL:base},stdio:'ignore',detached:true});
 let browser:any;
 try{
  let ready=false;for(let i=0;i<150;i++){try{if((await fetch(origin+'/de/stream/')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Clock dev server did not start');
  browser=await chromium.launch();const tvContext=await browser.newContext({viewport:{width:1280,height:720}}),phoneContext=await browser.newContext({viewport:{width:412,height:915}});
  await phoneContext.route('https://pagead2.googlesyndication.com/**',(route:any)=>route.abort());
  await tvContext.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){throw new Error('TV must not request location');},watchPosition(){throw new Error('TV must not watch location');},clearWatch(){}}});});
  const tv=await tvContext.newPage(),phone=await phoneContext.newPage();const errors:string[]=[];
  tv.on('response',async(r:any)=>{if(r.url().includes('/api/v1/tv/')&&r.status()>=400){let code='';try{code=(await r.json()).error;}catch{}console.log('TV test API failure',new URL(r.url()).pathname,r.status(),r.headers()['content-type'],code);}});
  tv.on('pageerror',(e:Error)=>errors.push(e.message));phone.on('pageerror',(e:Error)=>errors.push(e.message));
  await tv.goto(origin+'/de/stream/');await expect(tv.locator('#tv-code')).toHaveText(/\d{4} \d{4}/);await expect(tv.locator('#tv-qr')).toBeVisible();await expect(tv.locator('meta[name=robots]')).toHaveAttribute('content','noindex, follow');
  const code=await tv.locator('#tv-code').textContent();
  await phone.goto(origin+'/de/');await phone.locator('[name=view]').selectOption('binary',{force:true});await phone.locator('[name=binaryReadout]').selectOption('flip',{force:true});await phone.locator('[name=background]').selectOption('mountains',{force:true});
  await phone.evaluate(()=>{document.documentElement.dataset.palette='blue';});
  await phone.locator('#tv-open').click();await phone.locator('#tv-pair-code').fill(code);await phone.locator('#tv-send').click();await expect(tv.locator('#tv-approve')).toBeVisible({timeout:15000});await expect(tv.locator('#tv-preview')).toContainText('binaryFlip');await expect(tv.locator('body')).not.toHaveClass(/tv-ready/);
  await tv.locator('#tv-approve').click();await expect(tv.locator('.clock-display')).toHaveAttribute('data-view','binaryFlip',{timeout:15000});await expect(tv.locator('html')).toHaveAttribute('data-palette','blue');await expect(tv.locator('.clock-card')).toHaveAttribute('data-background','mountains');await expect(tv.locator('body')).toHaveClass(/tv-ready/);
  await phone.locator('#tv-close').click();await phone.locator('[name=view]').selectOption('orbit',{force:true});await phone.locator('[name=orbitReadout]').selectOption('digital',{force:true});await expect(tv.locator('.clock-display')).toHaveAttribute('data-view','orbit',{timeout:15000});
  await phone.close();const before=await tv.locator('#digital-clock').textContent();await expect.poll(()=>tv.locator('#digital-clock').textContent(),{timeout:4000}).not.toBe(before);
  await tvContext.setOffline(true);const offline=await tv.locator('#digital-clock').textContent();await expect.poll(()=>tv.locator('#digital-clock').textContent(),{timeout:4000}).not.toBe(offline);await tvContext.setOffline(false);
  await tv.screenshot({path:'/tmp/jacktools-tv-running.png'});
  const createdPromise=tv.waitForResponse((r:any)=>r.url().endsWith('/api/v1/tv/receivers/')&&r.status()===201);await tv.locator('#tv-stop').click();const created=await (await createdPromise).json();await expect(tv.locator('#tv-code')).toHaveText(/\d{4} \d{4}/);
  const qr=await phoneContext.newPage();let claims=0;qr.on('request',(r:any)=>{if(r.url().endsWith('/tv/claim/'))claims++;});
  await qr.goto(origin+'/de/pair/#tv='+created.pairToken);await expect(qr.locator('#tv-dialog')).toBeVisible();assert.equal(new URL(qr.url()).hash,'');assert.equal(claims,0);
  await qr.locator('#tv-send').click();await expect(tv.locator('#tv-approve')).toBeVisible({timeout:15000});await tv.locator('#tv-approve').click();await expect(tv.locator('body')).toHaveClass(/tv-ready/,{timeout:15000});
  await qr.locator('#tv-detach').click();await expect(qr.locator('#tv-pair-form')).toBeVisible();await expect(tv.locator('#tv-live-status')).toContainText('beendet',{timeout:15000});await expect(tv.locator('body')).toHaveClass(/tv-ready/);
  assert.equal(await qr.evaluate(()=>localStorage.length),0);assert.equal(await qr.evaluate(()=>sessionStorage.length),0);assert.deepEqual(errors,[]);
 }finally{await browser?.close();if(app.pid)try{process.kill(-app.pid,'SIGTERM');}catch{}}
}
