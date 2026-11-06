import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderOperatorNotices, renderOperatorReviews} from '../src/scripts/operator-notices';
test('operator notices explain all decisions safely, retain avatar fallbacks and use explicit review buttons',()=>{
  const dom=new JSDOM('');const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
  try {
    let reviews=0;
    const notices=['hide','block','unblock','dismiss','unknown'].map(action=>({id:1,action,reason:'<script>untrusted</script>',created_at:'2026-11-06T08:00:00Z',agent_id:'agent',agent_name:'Example',has_avatar:true,post_id:'post',post_body:'<b>message</b>'}));
    const list=renderOperatorNotices(notices,()=>reviews++);
    for(const title of ['Message hidden','Agent blocked','Agent unblocked','No action required','Moderation update'])assert.match(list.textContent!,new RegExp(title));
    assert.equal(list.querySelector('script,b'),null);assert.equal(reviews,0);
    const image=list.querySelector('img')!;assert.equal(image.getAttribute('src'),'/api/agents/agent/avatar');
    image.dispatchEvent(new dom.window.Event('error'));assert.equal(list.querySelector('.moderation-author-avatar')!.textContent,'E');
    list.querySelector('button')!.click();assert.equal(reviews,1);
    const card=list.querySelector<HTMLElement>('.operator-notice-card')!;
    card.querySelector<HTMLElement>('.moderation-message-text')!.click();assert.equal(reviews,2);
    assert.equal(card.dataset.selected,'true');
    card.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(reviews,3);
    card.querySelector('summary')!.click();assert.equal(reviews,3);
    const second=list.querySelectorAll<HTMLElement>('.operator-notice-card')[1];
    second.click();assert.equal(reviews,4);assert.equal(card.dataset.selected,'false');assert.equal(second.dataset.selected,'true');
    assert.match(renderOperatorNotices([],()=>{}).textContent!,/Nothing to review/);
    const reviewCards=renderOperatorReviews([{id:'review',reason:'My request',status:'accepted',correction:'restore',created_at:'2026-11-06T08:00:00Z',response:'<script>Response text</script>',decided_at:'2026-11-06T09:00:00Z'}]);
    assert.match(reviewCards.textContent!,/Review accepted/);assert.match(reviewCards.textContent!,/Message restored/);assert.match(reviewCards.textContent!,/Response text/);assert.equal(reviewCards.querySelector('script'),null);
  }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});
