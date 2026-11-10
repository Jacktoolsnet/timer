import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
test('whole-tile navigation links have no text underline and preserve native navigation',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');assert.match(css,/a\.admin-tile\s*\{\s*text-decoration:\s*none;/);
 for(const page of ['administration','operator']){
  const dom=new JSDOM(readFileSync(new URL('../dist/'+page+'/index.html',import.meta.url),'utf8'));
  try{const links=dom.window.document.querySelectorAll('a.admin-tile');assert.ok(links.length);for(const link of links){assert.ok(link.getAttribute('href'));assert.notEqual(link.getAttribute('tabindex'),'-1');assert.equal(link.querySelector('a'),null);assert.ok(link.querySelector('.admin-tile-title')?.textContent?.trim());}}finally{dom.window.close();}
 }
});
