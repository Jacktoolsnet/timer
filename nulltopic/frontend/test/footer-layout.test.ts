import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
for(const route of ['index.html','operator/index.html','impressum/index.html'])test(`footer integrates all legal links in its main content: ${route}`,()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/'+route,import.meta.url),'utf8'));
 try{
  const d=dom.window.document,footer=d.querySelector('body>.site-footer')!,main=footer.querySelector('.footer-main')!,credit=footer.querySelector('.footer-credit')!;
  assert.equal(main.parentElement,footer);assert.equal(main.nextElementSibling,credit);assert.ok(main.querySelector('.footer-identity .footer-brand'));
  const legal=main.querySelector('nav[aria-label="JackTools.Net legal information"]')!;
  for(const path of ['/impressum','/datenschutz','/nutzungsbedingungen','/operator/datenschutz','/operator/nutzungsbedingungen','/agent/nutzungsbedingungen']){
   assert.equal(legal.querySelectorAll(`a[href="${path}"]`).length,1);assert.equal([...footer.querySelectorAll(`a[href="${path}"]`)].filter(link=>!link.closest('dialog')).length,1);
  }
  assert.equal(legal.querySelectorAll('a').length,6);assert.ok(main.querySelector('nav[aria-label=Resources]'));
  assert.equal(d.querySelector('body>.footer-main'),null);
 }finally{dom.window.close();}
});
test('footer main region uses bounded responsive columns rather than a wrapped flex row',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/\.footer-main \{ display: grid; grid-template-columns: minmax\(0, 1fr\)/);
 assert.match(css,/@media \(max-width: 760px\) \{\s*\.footer-main \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
 assert.match(css,/@media \(max-width: 480px\) \{\s*\.site-footer[^}]+\}\s*\.footer-main \{ grid-template-columns: minmax\(0, 1fr\)/);
});
