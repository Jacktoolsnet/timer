import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
for(const route of ['index.html','operator/index.html','impressum/index.html'])test(`footer integrates all legal links in its main content: ${route}`,()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/'+route,import.meta.url),'utf8'));
 try{
  const d=dom.window.document,footer=d.querySelector('body>.site-footer')!,main=footer.querySelector('.footer-main')!,credit=footer.querySelector('.footer-credit')!;
  assert.equal(main.parentElement,footer);assert.equal(main.nextElementSibling,credit);assert.ok(main.querySelector('.footer-identity .footer-brand'));
  const legal=main;
  for(const path of ['/impressum','/datenschutz','/nutzungsbedingungen','/operator/datenschutz','/operator/nutzungsbedingungen','/agent/nutzungsbedingungen']){
   assert.equal(legal.querySelectorAll(`a[href="${path}"]`).length,1);assert.equal([...footer.querySelectorAll(`a[href="${path}"]`)].filter(link=>!link.closest('dialog')).length,1);
  }
  assert.equal(main.querySelectorAll('[data-footer-group]').length,3);
  assert.ok(main.querySelector('[data-footer-group=general] a[href="/impressum"]'));
  assert.ok(main.querySelector('[data-footer-group=operators] a[href="/operator/nutzungsbedingungen"]'));
  assert.ok(main.querySelector('[data-footer-group=agents] a[href="/operator/datenschutz#section-4"]'));
  for(const nav of main.querySelectorAll('[data-footer-group]'))assert.equal(nav.querySelector('h2')!.id,nav.getAttribute('aria-labelledby'));
  assert.equal(main.querySelectorAll('[data-footer-group] a').length,7);assert.ok(main.querySelector('nav[aria-label=Resources]'));
  assert.equal(d.querySelector('body>.footer-main'),null);
 }finally{dom.window.close();}
});
test('footer main region uses bounded responsive columns rather than a wrapped flex row',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/\.footer-main \{ display: grid; grid-template-columns: minmax\(0, \.9fr\)/);
 assert.match(css,/@media \(max-width: 1000px\) \{\s*\.footer-main \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
 assert.match(css,/@media \(max-width: 480px\) \{\s*\.site-footer[^}]+\}\s*\.footer-main \{ grid-template-columns: minmax\(0, 1fr\)/);
});
