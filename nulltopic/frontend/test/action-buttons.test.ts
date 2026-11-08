import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
function check(button:Element){assert.ok(button.matches('.admin-icon-button,.admin-back'));assert.equal(button.textContent?.trim(),'');assert.ok(button.getAttribute('aria-label'));assert.equal(button.getAttribute('aria-label'),button.getAttribute('data-tooltip'));assert.equal(button.querySelector('svg')?.getAttribute('aria-hidden'),'true');}
test('workspace and public action buttons are icon-only with accessible tooltip labels',()=>{
 const selectors:Record<string,string>={
  operator:'#login button:not(#open-operator-registration),#approve button,#operator-settings-editor button,#operator-header-actions button,#operator-messages-more',
  administration:'#login button,#admin-create-user button',
  conversations:'#more',
  '':'[data-copy-prompt]',
 };
 for(const [page,selector]of Object.entries(selectors)){
  const dom=new JSDOM(readFileSync(new URL('../dist/'+(page?page+'/':'')+'index.html',import.meta.url),'utf8'));
  const buttons=dom.window.document.querySelectorAll(selector);assert.ok(buttons.length>0);for(const button of buttons)check(button);
  // Navigation choices still provide visible, human-readable text.
  for(const tile of dom.window.document.querySelectorAll('.admin-tile'))assert.ok(tile.textContent?.trim());
  dom.window.close();
 }
});

test('operator registration explicitly keeps its visible button label',()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8'));
 const button=dom.window.document.querySelector('#open-operator-registration')!;
 assert.equal(button.textContent?.trim(),'Create operator account');assert.equal(button.getAttribute('type'),'button');assert.equal(button.getAttribute('aria-haspopup'),'dialog');dom.window.close();
});
