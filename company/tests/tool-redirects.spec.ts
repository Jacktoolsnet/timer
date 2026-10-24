import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {toolRedirects} from '../src/lib/tool-redirects';
for(const [alias,target] of Object.entries(toolRedirects)){
 test(`/${alias} redirects to its fixed tool destination`,async({page})=>{
  const url=new URL(target);url.search='?from=shortcut';url.hash='#example';
  await page.route('https://**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Destination</title><p>Tool destination</p>'}));
  await page.goto(`/${alias}/?from=shortcut#example`);
  await expect(page).toHaveURL(url.href);
 });
}

test('build includes server rules and keeps redirect pages out of the sitemap',async()=>{
 const apache=readFileSync(new URL('../dist/.htaccess',import.meta.url),'utf8');
 const nginx=readFileSync(new URL('../hosting/tool-redirects.nginx.conf',import.meta.url),'utf8');
 const sitemap=readFileSync(new URL('../dist/sitemap.xml',import.meta.url),'utf8');
 for(const [alias,target] of Object.entries(toolRedirects)){
  expect(apache).toContain(`RewriteRule ^${alias}/?$ ${target} [R=301,L,NE]`);
  expect(nginx).toContain(`location = /${alias} { return 301 ${target}$is_args$args; }`);
  expect(nginx).toContain(`location = /${alias}/ { return 301 ${target}$is_args$args; }`);
  const html=readFileSync(new URL(`../dist/${alias}/index.html`,import.meta.url),'utf8');
  expect(html).toContain('content="noindex, follow"');
  expect(html).toContain(`href="${target}"`);
  expect(sitemap).not.toContain(`https://jacktools.net/${alias}`);
 }
});

test.describe('without JavaScript',()=>{
 test.use({javaScriptEnabled:false});
 test('meta refresh still forwards the clock shortcut',async({page})=>{
  await page.route('https://clock.jacktools.net/**',route=>route.fulfill({contentType:'text/html',body:'<title>Clock destination</title>'}));
  await page.goto('/clock/');
  await expect(page).toHaveURL(toolRedirects.clock);
 });
});

test('clock shortcut also works without a trailing slash',async({page})=>{
 await page.route('https://clock.jacktools.net/**',route=>route.fulfill({contentType:'text/html',body:'<title>Clock destination</title>'}));
 await page.goto('/clock');
 await expect(page).toHaveURL(toolRedirects.clock);
});

test('unknown shortcuts are not redirected to an arbitrary destination',async({page})=>{
 const response=await page.goto('/not-a-tool/?next=https://example.com/');
 expect(response?.status()).toBe(404);
 await expect(page).toHaveURL(/\/not-a-tool\//);
});
