import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderModerationInbox, type ModerationReport} from '../src/scripts/moderation-inbox';
const report: ModerationReport = {id: 'report-id', post_id: 'message', reason: 'Please review this message.', created_at: '2026-11-05T10:00:00Z', resolved: false, post_body: 'An example message.', post_state: 'visible', conversation_id: 'thread', parent_id: 'parent', agent_id: 'agent', agent_handle: 'example', agent_name: 'Example agent'};
function fixture(run: () => void) {
  const dom = new JSDOM('');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {configurable: true, value: dom.window.document});
  try { run(); }
  finally {if (previous) Object.defineProperty(globalThis, 'document', previous); else Reflect.deleteProperty(globalThis, 'document'); dom.window.close();}
}
test('moderation inbox presents report context and operator requests as readable cards', () => fixture(() => {
  let selected: ModerationReport | undefined;
  const inbox = renderModerationInbox({reports:[report], appeals:[{id:'appeal', operator_id:'operator', operator_handle:'example_operator', reason:'Please reconsider the action.', created_at:'2026-11-05T11:00:00Z'}]}, item => {selected=item;});
  assert.equal(inbox.querySelectorAll('.moderation-report-card').length, 1);
  assert.equal(inbox.querySelectorAll('.moderation-review-card').length, 1);
  assert.match(inbox.textContent!, /Why it was reported/);
  assert.match(inbox.textContent!, /@example_operator/);
  assert.equal(inbox.querySelector('.moderation-message-text')!.textContent, report.post_body);
  assert.equal(inbox.querySelector('.moderation-report-actions a')?.getAttribute('href'), '/conversation?id=thread&post=message');
  assert.equal(inbox.querySelector('.moderation-report-actions a')?.getAttribute('rel'), 'noopener noreferrer');
  assert.equal((inbox.querySelector('details') as HTMLDetailsElement).open, false);
  inbox.querySelector('button')!.click();
  assert.equal(selected?.id, report.id);
}));
test('moderation values remain text and unavailable/hidden messages have explicit labels', () => fixture(() => {
  const inbox = renderModerationInbox({reports:[{...report, reason:'<img src=x onerror=alert(1)>', post_body:'<script>bad</script>', agent_name:'<b>name</b>', post_state:'hidden'}, {...report, id:'gone', post_id:null, post_body:null, resolved:true}], appeals:[]}, () => {});
  assert.equal(inbox.querySelector('img,script,b'), null);
  assert.match(inbox.textContent!, /Currently hidden/);
  assert.match(inbox.textContent!, /Message text no longer available/);
  assert.match(inbox.textContent!, /Resolved/);
  assert.equal(inbox.querySelectorAll('button').length, 1);
}));
test('empty moderation inbox has a friendly themed illustration rather than raw JSON', () => fixture(() => {
  const inbox = renderModerationInbox({reports:[], appeals:[]}, () => {});
  assert.match(inbox.textContent!, /All clear for now/);
  assert.equal(inbox.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
  assert.equal(inbox.querySelector('pre'), null);
}));

test('moderation preview shows the local agent avatar and falls back to initials on load failure', () => fixture(() => {
  const inbox = renderModerationInbox({reports:[{...report, has_avatar:true}], appeals:[]}, () => {});
  const image = inbox.querySelector<HTMLImageElement>('.moderation-author-avatar img')!;
  assert.equal(image.getAttribute('src'), '/api/agents/agent/avatar');
  assert.equal(image.alt, '');
  assert.equal(image.loading, 'lazy');
  image.dispatchEvent(new document.defaultView!.Event('error'));
  assert.equal(inbox.querySelector('.moderation-author-avatar img'), null);
  assert.equal(inbox.querySelector('.moderation-author-avatar')!.textContent, 'E');
  for (const item of [{...report, has_avatar:false}, {...report, has_avatar:true, agent_id:null}]) {
    assert.equal(renderModerationInbox({reports:[item], appeals:[]}, () => {}).querySelector('img'), null);
  }
}));


test('agent reports display profile context and can be selected without a message',()=>fixture(()=>{
  let selected:ModerationReport|undefined;
  const inbox=renderModerationInbox({reports:[{...report,target_kind:'agent',post_id:null,post_body:null,conversation_id:null}],appeals:[]},item=>selected=item);
  assert.match(inbox.textContent!,/Agent report/);assert.doesNotMatch(inbox.textContent!,/Message text no longer available/);
  assert.equal(inbox.querySelector('a')!.getAttribute('href'),'/agents?id=agent');inbox.querySelector('button')!.click();assert.equal(selected?.agent_id,'agent');
}));
