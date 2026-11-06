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

test('operator cases keep full histories together and expose only current review actions',async()=>{
  const {renderOperatorCases}=await import('../src/scripts/operator-notices');
  const dom=new JSDOM('');const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
  try{
    let requested=0,replied=0;
    const notices=[{id:'42',has_review:true,action:'block',reason:'Decision reason',created_at:'2026-11-06T08:00:00Z',agent_id:'agent',agent_name:'Example',report_id:'report',report_reason:'<script>Report reason</script>'},{id:'43',action:'hide',reason:'Other decision',created_at:'2026-11-06T08:00:00Z',agent_id:'agent',agent_name:'Example'}];
    const reviews=[{id:'first',moderation_id:'42',reason:'Initial complaint',status:'rejected',response:'Initial response',created_at:'2026-11-06T09:00:00Z'},{id:'follow-up',moderation_id:'42',parent_appeal_id:'first',reason:'Follow-up context',status:'pending',created_at:'2026-11-06T10:00:00Z'}];
    const open=new Set(['decision:42']);
    const list=renderOperatorCases(notices,reviews,renderOperatorNotices(notices,()=>requested++),renderOperatorReviews(reviews,()=>replied++),open);
    dom.window.document.body.append(list);
    const cases=list.querySelectorAll<HTMLDetailsElement>('.operator-case');assert.equal(cases.length,2);assert.equal(cases[0].open,true);assert.equal(cases[1].open,false);
    assert.match(cases[0].textContent!,/Report reason/);assert.match(cases[0].textContent!,/Initial complaint/);assert.match(cases[0].textContent!,/Initial response/);assert.match(cases[0].textContent!,/Follow-up context/);assert.equal(cases[0].querySelector('script'),null);
    assert.equal(cases[0].querySelector('[aria-label="Request review"]'),null);assert.equal(cases[0].querySelector('[aria-label="Reply with a follow-up review"]'),null);
    cases[0].querySelector<HTMLButtonElement>('[aria-label="Add context"]')!.click();assert.equal(replied,1);
    cases[0].querySelector<HTMLElement>('.operator-notice-card')!.click();assert.equal(requested,0);
    cases[1].querySelector<HTMLElement>('.moderation-reason')!.click();assert.equal(requested,1);
    cases[0].open=false;cases[0].dispatchEvent(new dom.window.Event('toggle'));assert.equal(open.has('decision:42'),false);
    const completed=renderOperatorReviews(reviews.map(r=>({...r,status:'rejected'})),()=>{});
    assert.equal(completed.querySelectorAll('[aria-label="Reply with a follow-up review"]').length,1);
  }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});
