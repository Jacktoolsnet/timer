import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeReviewDecisionPicker} from '../src/scripts/review-decision-picker';
const html=readFileSync(new URL('../dist/administration/index.html',import.meta.url),'utf8');
function fixture(){
  const dom=new JSDOM(html),doc=dom.window.document;
  for(const id of ['dashboard','admin-moderation','review-decision'])doc.getElementById(id)!.hidden=false;
  doc.querySelector('dialog')!.setAttribute('open','');
  const select=doc.querySelector<HTMLSelectElement>('#review-outcome')!,response=doc.querySelector<HTMLTextAreaElement>('#review-response')!;
  const sync=initializeReviewDecisionPicker(select,response);
  return {dom,doc,select,response,sync,trigger:doc.querySelector<HTMLButtonElement>('#review-decision-trigger')!,list:doc.querySelector<HTMLElement>('#review-decision-options')!};
}
test('review picker starts empty and keeps required validation on the accessible trigger',()=>{
  const {dom,doc,select,response,trigger,list}=fixture();
  assert.equal(select.hidden,true);assert.equal(select.value,'');assert.equal(list.hidden,true);
  assert.match(trigger.textContent!,/Choose a decision/);
  assert.equal(doc.querySelectorAll('#review-response-presets button').length,0);
  response.value='My response';assert.equal(select.form!.reportValidity(),false);
  assert.equal(doc.activeElement,trigger);assert.equal(trigger.getAttribute('aria-invalid'),'true');
  assert.equal(doc.querySelector('#review-outcome-label')!.getAttribute('for'),trigger.id);
  dom.window.close();
});
test('each review outcome has two optional editable responses and preserves form data without auto-submitting',()=>{
  const {dom,doc,select,response,trigger,list}=fixture();let submits=0;
  select.form!.addEventListener('submit',event=>{event.preventDefault();submits++;});
  for(const option of list.querySelectorAll<HTMLButtonElement>('[role=option]:not([hidden])')){
    response.value='My draft';trigger.click();option.click();
    assert.equal(select.value,option.dataset.value);assert.equal(option.getAttribute('aria-selected'),'true');
    assert.equal(new dom.window.FormData(select.form!).get('outcome'),select.value);
    assert.equal(response.value,'My draft','changing a decision must not overwrite a draft');
    assert.equal(list.hidden,true);assert.equal(trigger.hasAttribute('aria-invalid'),false);
    const presets=doc.querySelectorAll<HTMLButtonElement>('#review-response-presets button');assert.equal(presets.length,2);
    for(const preset of presets){preset.click();assert.equal(response.value,preset.textContent);assert.equal(doc.activeElement,response);response.value+=' Additional context.';assert.match(response.value,/Additional context/);}
  }
  assert.equal(submits,0);dom.window.close();
});
test('review options support keyboard navigation, Escape without closing the modal, outside click and reset',async()=>{
  const {dom,doc,select,response,trigger,list}=fixture();
  const key=(target:Element,value:string)=>{const event=new dom.window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true});target.dispatchEvent(event);return event;};
  key(trigger,'ArrowDown');const options=list.querySelectorAll<HTMLButtonElement>('[role=option]:not([hidden])');assert.equal(options.length,3);
  assert.equal(doc.activeElement,options[0]);key(options[0],'End');assert.equal(doc.activeElement,options[2]);
  key(options[2],'ArrowDown');assert.equal(doc.activeElement,options[0]);key(options[0],'ArrowUp');assert.equal(doc.activeElement,options[2]);
  assert.equal(key(options[2],'Escape').defaultPrevented,true);assert.equal(list.hidden,true);assert.equal(doc.activeElement,trigger);
  trigger.click();doc.body.click();assert.equal(list.hidden,true);
  trigger.click();options[0].click();response.value='Draft';select.form!.reset();await Promise.resolve();
  assert.equal(select.value,'');assert.equal(response.value,'');assert.match(trigger.textContent!,/Choose a decision/);
  assert.equal(doc.querySelectorAll('#review-response-presets button').length,0);assert.equal(list.hidden,true);dom.window.close();
});


test('linked hide and block decisions expose only their corresponding corrective outcome',()=>{
  const {dom,doc,select,response,sync,list}=fixture();
  for(const [action,value] of [['hide','accepted_restore'],['block','accepted_unblock']]){
    sync(action);const options=list.querySelectorAll<HTMLButtonElement>('[role=option]:not([hidden])');assert.equal(options.length,4);
    const correction=Array.from(options).find(option=>option.dataset.value===value)!;correction.click();
    assert.equal(select.value,value);const presets=doc.querySelectorAll<HTMLButtonElement>('#review-response-presets button');assert.equal(presets.length,2);presets[0].click();assert.ok(response.value.length>0);
  }
  sync(null);assert.equal(select.value,'');assert.equal(list.querySelectorAll('[role=option]:not([hidden])').length,3);dom.window.close();
});
