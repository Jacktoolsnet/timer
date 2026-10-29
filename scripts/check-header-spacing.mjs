// Build all sites first. Tests local static output, including narrow/enlarged layouts.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {get} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../company/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const projects=['company','timer','clock','metronome','stopwatch','breathe','relax','calculator','scenescript','lava'];
const browser=await chromium.launch({headless:true});
let checked=0;
try {
 for(const project of projects){
  const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
  const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',fileURLToPath(new URL(`../${project}/dist/`,import.meta.url))],{stdio:'ignore'});
  const base=`http://127.0.0.1:${port}`;
  try {
   let ready=false;
   for(let i=0;i<100;i++){try{await new Promise((resolve,reject)=>get(base,res=>{res.resume();res.on('end',resolve);}).on('error',reject));ready=true;break;}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
   assert(ready,project+': static server did not start');
   const page=await browser.newPage();
   await page.goto(base+'/de/');
   for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:900});
    for(const level of ['0','3']){
     await page.evaluate(level=>document.documentElement.dataset.fontSize=level,level);
     const header=await page.locator('.site-header').boundingBox();
     const icon=await page.locator('.site-header .brand-icon').boundingBox();
     const trigger=await page.locator('#palette-dropdown > summary').boundingBox();
     const label=`${project}: ${width}px / font ${level}`;
     assert(icon.x-header.x>=11.5,label+': logo too close to header edge');
     assert(header.x+header.width-trigger.x-trigger.width>=11.5,label+': settings too close to header edge');
     assert(trigger.width>=43.5 && trigger.height>=43.5,label+': small settings target');
     assert(icon.x+icon.width<trigger.x,label+': header controls overlap');
     const brand=await page.locator('.site-header .brand').boundingBox();
     assert(brand.x+brand.width<=trigger.x-3,label+': brand overlaps settings');
     await page.locator('#palette-dropdown > summary').click();
     const panel=await page.locator('.preferences-panel').boundingBox();
     assert(panel.x>=-1 && panel.x+panel.width<=width+1,label+': preferences outside viewport');
     await page.locator('#preferences-close').click();
     const headerOverflow=await page.locator('.site-header').evaluate(el=>el.scrollWidth>el.clientWidth+1);
     assert(!headerOverflow,label+': header overflow');
     checked++;
    }
   }
   await page.goto(base+(project==='company'?'/impressum/':'/de/legal/'));
   const header=await page.locator('.site-header').boundingBox(),icon=await page.locator('.site-header .brand-icon').boundingBox();
   assert(icon.x-header.x>=11.5,project+': legal page spacing');
   await page.close();console.log(`${project}: header spacing, settings and legal page OK`);
  }finally{server.kill();}
 }
}finally{await browser.close();}
console.log(`${checked} layout checks passed across ${projects.length} sites.`);
