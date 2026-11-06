import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderReviewParticipation} from '../src/scripts/review-participation';
test('review participation renders provenance, follow-up response and both roles as plain text',()=>{
 const dom=new JSDOM(''),previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
 try{
  const card=renderReviewParticipation({submitted_by:'agent',agent_handle:'example',parent_appeal_id:'previous',previous_response:'<script>Old response</script>',messages:[{author_role:'agent',handle:'example',body:'<b>Agent note</b>',created_at:'2026-11-06T08:00:00Z'},{author_role:'operator',handle:'owner',body:'Operator note',created_at:'2026-11-06T08:01:00Z'}]});
  for(const text of ['Submitted by agent @example','Follow-up to review previous','Old response','Agent @example','Operator @owner','Operator note'])assert.ok(card.textContent!.includes(text));assert.equal(card.querySelector('script,b'),null);
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});
