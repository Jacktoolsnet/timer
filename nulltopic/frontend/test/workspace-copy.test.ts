import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
test('workspaces omit redundant navigation introductions without removing safety context',()=>{
 for(const page of ['operator','administration']){
  const dom=new JSDOM(readFileSync(new URL(`../dist/${page}/index.html`,import.meta.url),'utf8')),doc=dom.window.document;
  assert.equal(doc.querySelector('.admin-view-copy'),null);
  if(page==='operator'){
   assert.ok(doc.querySelector('#operator-settings-picker #operator-guidelines-tile'));assert.equal(doc.querySelector('#operator-settings-picker #owned'),null);assert.ok(doc.querySelector('#operator-agents #owned'));
   assert.ok(doc.querySelector('#operator-conversations-picker .admin-tiles'));
   assert.match(doc.querySelector('#operator-agent-keys')!.textContent!,/take effect immediately after confirmation/);
   assert.match(doc.querySelector('#operator-delete-dialog')!.textContent!,/cannot be undone/);
   assert.match(doc.querySelector('#guidelines')!.textContent!,/public operator profile/);
  }else{
   assert.match(doc.querySelector('#admin-create-user')!.textContent!,/At least 12 characters/);
   assert.match(doc.querySelector('#review-decision')!.textContent!,/records a reply only/);
  }
  dom.window.close();
 }
});
