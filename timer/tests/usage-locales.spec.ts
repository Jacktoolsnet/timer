import {test,expect} from '@playwright/test';
import {createServer,type Server} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
test.skip(process.env.USAGE_LOCALE_TESTS!=='1','Run with playwright.usage.config.ts after building all tools.');
const tools=['timer','clock','stopwatch','calculator','breathe','relax','scenescript','lava'];
const origins=new Map<string,string>(),servers:Server[]=[];
test.beforeAll(async()=>{
 for(const tool of tools){
  const root=resolve(process.cwd(),'..',tool,'dist');
  const server=createServer(async(req,res)=>{
   const pathname=decodeURIComponent(new URL(req.url||'/','http://localhost').pathname);
   const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
   try{
    const data=await readFile(path);
    res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8');
    res.end(data);
   }catch{res.writeHead(404).end();}
  });
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  servers.push(server);
  const address=server.address();
  if(!address||typeof address==='string')throw Error('Missing test server');
  origins.set(tool,'http://127.0.0.1:'+address.port);
 }
});
test.afterAll(async()=>{await Promise.all(servers.map(server=>new Promise<void>((done,reject)=>server.close(e=>e?reject(e):done()))));});
for(const tool of tools)for(const lang of ['es','fr']){
 test(tool+' usage in '+lang,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(origins.get(tool)+'/'+lang+'/usage/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.locator('article h1')).toContainText(lang==='es'?/uso/:/utilisation/);
  const nav=page.locator('article .legal-nav');
  await expect(nav.locator('a')).toHaveCount(4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.site-footer a[href="/'+lang+'/usage/"]')).toBeVisible();
  await expect(page.locator('.site-footer a[href="/en/privacy/"]')).toBeVisible();
  await page.locator('#palette-dropdown summary').click();
  await page.locator('.language-menu a[lang="'+(lang==='es'?'fr':'es')+'"]').click();
  await expect(page).toHaveURL(new RegExp('/'+(lang==='es'?'fr':'es')+'/usage/$'));
  expect(errors).toEqual([]);
 });
}
