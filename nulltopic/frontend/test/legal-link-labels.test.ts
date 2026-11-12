import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {translate, languages} from '../src/lib/i18n';

test('terms links omit visible new-tab suffixes in every language but retain separate-tab behavior',()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8'));
 try {
  for(const selector of ['[data-visitor-terms]','#register-terms-link']){
   const link=dom.window.document.querySelector<HTMLAnchorElement>(selector)!;
   assert.ok(link);
   assert.equal(link.target,'_blank');
   assert.equal(link.rel,'noopener noreferrer');
   for(const language of languages){
    const label=translate(link.textContent!.trim(),language);
    assert.doesNotMatch(label,/\((?:new tab|neuer Tab|nouvel onglet|pestaña nueva|nueva pestaña)\)/i);
    assert.ok(label.length>0);
   }
  }
 }finally{dom.window.close();}
});
