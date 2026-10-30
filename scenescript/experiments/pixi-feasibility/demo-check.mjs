import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createDemoServer} from './serve.mjs';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const dir=new URL('./demo-results/',import.meta.url);await fs.mkdir(dir,{recursive:true});
const server=createDemoServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:1100},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.motionDemo);
 assert.equal(await page.evaluate(()=>window.motionDemo.getState().playing),false,'Reduced motion starts paused');
 const states=[];
 for(const t of [1.8,4.9,7.05,7.95,8.8,11.5,13.5]){
  states.push(await page.evaluate(t=>window.motionDemo.seek(t),t));
  await page.locator('#stage').screenshot({path:fileURLToPath(new URL(`frame-${t}.png`,dir))});
 }
 await page.screenshot({path:fileURLToPath(new URL('desktop.png',dir))});
 const hash=async t=>page.evaluate(t=>{window.motionDemo.seek(t);const source=window.motionDemo.canvas;const c=document.createElement('canvas');c.width=960;c.height=540;const ctx=c.getContext('2d');ctx.drawImage(source,0,0,960,540);let h=2166136261;for(const b of ctx.getImageData(0,0,960,540).data)h=Math.imul(h^b,16777619);return h>>>0;},t);
 const hashes=[];for(const t of [4.9,7.95,4.9,13.5,11.5,13.5])hashes.push(await hash(t));
 assert.equal(hashes[0],hashes[2],'Articulated pose is deterministic after seeking');assert.equal(hashes[3],hashes[5],'Ending deterministic after reverse seek');assert.notEqual(hashes[0],hashes[1]);
 assert.ok((await page.evaluate(()=>window.motionDemo.seek(8.05))).handDistance<.01,'Spark meets the articulated hand');
 assert.ok(states[1].wave>.9);assert.ok(states[2].stretch<0);assert.ok(states[3].flight>.9);assert.ok(states[5].reveal>0&&states[5].reveal<1);assert.equal(states[6].reveal,1);
 await page.locator('[data-time="4.6"]').click();assert.equal(await page.evaluate(()=>window.motionDemo.getState().time),4.6);
 await page.locator('#play').click();await page.waitForTimeout(150);assert.ok((await page.evaluate(()=>window.motionDemo.getState().time))>4.6);await page.locator('#play').click();
 await page.locator('#scrub').fill('8.1');await page.locator('#scrub').dispatchEvent('input');assert.equal(await page.evaluate(()=>window.motionDemo.getState().time),8.1);
 const download=page.waitForEvent('download');await page.locator('#still').click();assert.match((await download).suggestedFilename(),/^lichtsammler-8\.10s\.png$/);
 await page.locator('#loop').uncheck();await page.evaluate(()=>window.motionDemo.seek(15.99));await page.locator('#play').click();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.motionDemo.getState().playing),false);assert.equal(await page.evaluate(()=>window.motionDemo.getState().time),16);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.motionDemo.seek(4.9));await page.screenshot({path:fileURLToPath(new URL('mobile.png',dir))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal overflow');
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('results.json',dir),JSON.stringify({states,hashes,errors},null,2));console.log('PASS: poses, deterministic seeking, iris mask, playback, scrubber, PNG, ending, reduced motion and mobile layout');
}finally{await browser?.close();server.close();}
