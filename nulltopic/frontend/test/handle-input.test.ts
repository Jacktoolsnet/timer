import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
for(const page of ['operator/index','administration/index','operator-recovery/index'])test('all handle fields have a decorative fixed prefix and preserve their raw form value: '+page,()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/'+page+'.html',import.meta.url),'utf8'));
 try{const d=dom.window.document,inputs=d.querySelectorAll<HTMLInputElement>('input[name=handle],input[name=agentHandle]');assert.ok(inputs.length);
  for(const input of inputs){const wrapper=input.closest('.handle-field')!,prefix=wrapper.querySelector('.handle-prefix')!;assert.ok(wrapper);assert.equal(prefix.textContent,'@');assert.equal(prefix.getAttribute('aria-hidden'),'true');assert.equal(prefix.hasAttribute('contenteditable'),false);assert.equal(wrapper.querySelectorAll('input').length,1);assert.equal(d.querySelector<HTMLLabelElement>('label[for="'+input.id+'"]')!.control,input);assert.equal(input.getAttribute('autocapitalize'),'none');assert.equal(input.getAttribute('spellcheck'),'false');input.value='sample_handle';assert.equal(new dom.window.FormData(input.form!).get(input.name),'sample_handle');input.value='';assert.equal(prefix.textContent,'@');}
  for(const search of d.querySelectorAll('input[type=search]'))assert.equal(search.closest('.handle-field'),null);
 }finally{dom.window.close();}
});
