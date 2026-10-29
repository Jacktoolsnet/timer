// Build all nine tools first. Uses local static servers, not deployed sites.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {get} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../company/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const projects=['metronome','timer','clock','stopwatch','calculator','breathe','relax','lava','scenescript'];
const browser=await chromium.launch({headless:true});
let checked=0;
try {
 for(const project of projects) {
  const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
  const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',fileURLToPath(new URL(`../${project}/dist/`,import.meta.url))],{stdio:'ignore'});
  const base=`http://127.0.0.1:${port}`;
  try {
   let ready=false;
   for(let i=0;i<100;i++) { try {await new Promise((resolve,reject)=>{get(base,res=>{res.resume();res.on('end',resolve);}).on('error',reject);});ready=true;break;}catch{} await new Promise(resolve=>setTimeout(resolve,50)); }
   assert(ready,project+' static server did not start');
   for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    const page=await browser.newPage({viewport});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/de/');
    await page.evaluate(()=>window.scrollTo(0,500));
    await page.waitForTimeout(150);
    const box=await page.locator('.site-header').boundingBox();
    assert(box && Math.abs(box.y)<1,`${project}: header not sticky`);
    await page.locator('#palette-dropdown > summary').click();
    const panel=await page.locator('.preferences-panel').boundingBox();
    assert(panel && panel.y>=box.height-1,`${project}: settings overlap header`);
    assert(panel.y+panel.height<=viewport.height+1,`${project}: settings exceed viewport`);
    await page.locator('#preferences-close').click();
    // Assert CSS visibility contracts without invoking browser fullscreen APIs.
    await page.evaluate(()=>document.body.classList.add('focus-view'));
    assert.equal(await page.locator('.site-header').isVisible(),false,`${project}: focus mode`);
    await page.evaluate(()=>document.body.classList.remove('focus-view'));
    if(project==='scenescript') {
     for(const mode of ['editor-fullscreen','recording']) {
      await page.evaluate(mode=>document.body.classList.add(mode),mode);
      assert.equal(await page.locator('.site-header').isVisible(),false,project+': '+mode);
      await page.evaluate(mode=>document.body.classList.remove(mode),mode);
     }
    }
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.site-header').isVisible(),false,project+': print view');
    assert.deepEqual(errors,[],project+': browser errors');
    await page.close();checked++;
    console.log(`${project}: ${viewport.width}px sticky header, settings, focus and print OK`);
   }
  }finally {server.kill();}
 }
}finally{await browser.close();}
console.log(`${checked} desktop/mobile checks passed across ${projects.length} tools.`);
