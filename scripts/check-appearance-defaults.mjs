// Build Company, all eight tools and the MessageDrop public site first.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {get} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
const require=createRequire(new URL('../company/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const projects=['company','timer','clock','stopwatch','calculator','breathe','relax','lava','scenescript'].map(project=>({project,dist:new URL(`../${project}/dist/`,import.meta.url),namespace:'jacktools.'+project}));
projects.push({project:'messagedrop',dist:new URL('../../messagedrop/platform/messagedrop/dist/',import.meta.url),namespace:'messagedrop.site'});
let htmlCount=0;
async function checkHtml(directory) {
 for(const entry of await readdir(directory,{withFileTypes:true})) {
  const url=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
  if(entry.isDirectory()) {await checkHtml(url);continue;}
  if(!entry.name.endsWith('.html'))continue;
  const html=await readFile(url,'utf8');
  const root=html.match(/<html\b[^>]*>/)?.[0]||'';
  if(!root.includes('data-font-size'))continue; // minimal redirect pages have no themed UI
  for(const attr of ['data-palette="green"','data-style="technical"','data-theme="dark"'])assert(root.includes(attr),url.pathname+': '+attr);
  htmlCount++;
 }
}
const browser=await chromium.launch({headless:true});
let checks=0;
try {
 for(const {project,dist,namespace} of projects) {
  await checkHtml(dist);
  const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',fileURLToPath(dist)],{stdio:'ignore'});
  const base=`http://127.0.0.1:${port}`;
  try {
   let ready=false;
   for(let i=0;i<100;i++){try{await new Promise((resolve,reject)=>get(base,res=>{res.resume();res.on('end',resolve);}).on('error',reject));ready=true;break;}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
   assert(ready,project+': static server did not start');
   for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const state=()=>page.evaluate(()=>({...document.documentElement.dataset}));
    await page.goto(base+'/de/');
    let appearance=await state();
    assert.equal(appearance.theme,'dark',project);assert.equal(appearance.palette,'green',project);assert.equal(appearance.style,'technical',project);
    assert.equal(await page.evaluate(()=>localStorage.length),0,project+': defaults must not write storage');
    await page.locator('#palette-dropdown > summary').click();
    assert.equal(await page.locator('#theme').getAttribute('aria-pressed'),'true',project);
    assert.equal(await page.locator('#theme-light').getAttribute('aria-pressed'),'false',project);
    assert(await page.locator('[name=colorScheme][value=green]').isChecked(),project);
    assert(await page.locator('[name=visualStyle][value=technical]').isChecked(),project);
    await page.locator('#remember-preferences').check();
    await page.locator('#theme-light').click();await page.locator('[name=colorScheme][value=blue]').check();await page.locator('[name=visualStyle][value=soft]').check();
    await page.reload();appearance=await state();
    assert.equal(appearance.theme,'light',project+': preserve saved light mode');assert.equal(appearance.palette,'blue',project);assert.equal(appearance.style,'soft',project);
    await page.evaluate(namespace=>localStorage.removeItem(namespace+'.storage-consent.v1'),namespace);
    await page.reload();appearance=await state();
    assert.equal(appearance.theme,'dark',project+': ignore saved appearance without consent');assert.equal(appearance.palette,'green',project);assert.equal(appearance.style,'technical',project);
    assert.deepEqual(errors,[],project+': browser errors');
    await context.close();checks++;
    console.log(`${project} ${viewport.width}px: defaults and saved overrides OK`);
   }
  }finally{server.kill();}
 }
}finally{await browser.close();}
console.log(`${htmlCount} static HTML defaults and ${checks} desktop/mobile appearance checks passed.`);
