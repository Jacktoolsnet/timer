import {test,expect} from '@playwright/test';
import {createServer,type Server} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
test.skip(process.env.USAGE_LOCALE_TESTS!=='1','Run with playwright.usage.config.ts after building all tools.');
const tools=['timer','clock','stopwatch','calculator','breathe','relax','scenescript','lava'];
const origins=new Map<string,string>(),servers:Server[]=[];
test.beforeAll(async()=>{
 for(const tool of [...tools,'company']){
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


for(const tool of [...tools,'company']){
 test(tool+' header icon follows palettes and theme without changing favicon',async({page})=>{
  await page.goto(origins.get(tool)+(tool==='company'?'/':'/de/usage/'));
  const icon=page.locator('.brand-icon svg[data-brand-icon]');
  await expect(icon).toHaveAttribute('data-brand-icon',tool);
  await expect(page.locator('.brand-icon img')).toHaveCount(0);
  const favicon=await page.locator('link[rel=icon]').getAttribute('href');
  await page.locator('#palette-dropdown summary').click();
  const colours=new Set<string>();
  for(const palette of ['terracotta','blue','green','orange','red','violet','teal','rose']){
   await page.locator('[name=colorScheme][value="'+palette+'"]').check();
   await expect(page.locator('html')).toHaveAttribute('data-palette',palette);
   const paint=await icon.evaluate(el=>{
    const target=el.querySelector('linearGradient stop:last-child')||el.querySelector('g');
    return target?getComputedStyle(target).getPropertyValue(target.tagName==='stop'?'stop-color':'fill'):'';
   });
   expect(paint).not.toBe('');colours.add(paint);
  }
  expect(colours.size).toBe(8);
  const before=await icon.evaluate(el=>getComputedStyle(el).getPropertyValue('--accent'));
  await page.locator('#theme').click();
  const after=await icon.evaluate(el=>getComputedStyle(el).getPropertyValue('--accent'));
  expect(after).not.toBe(before);
  await expect(page.locator('link[rel=icon]')).toHaveAttribute('href',favicon!);
  await page.locator('#preferences-close').click();
  const size=await icon.boundingBox();
  expect(size!.width).toBeGreaterThan(30);
  expect(size!.height).toBeGreaterThan(30);
  if(tool==='company'||tool==='lava')await page.screenshot({path:'/tmp/header-icon-'+tool+'-'+test.info().project.name+'.png'});
 });
}
