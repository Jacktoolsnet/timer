import {test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {operatorAgentTile} from '../src/scripts/operator-agent-tile';
test('both picker cards share content-safe identity, avatar, state and destination without nested controls',()=>{
 const dom=new JSDOM('<html lang="de"></html>'),original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
 try{for(const view of ['settings','conversations'] as const){
  const tile=operatorAgentTile({id:'fixture',name:'<img src=x onerror=alert(1)>',handle:'literal',status:'pending',has_avatar:true},view);
  assert.equal(tile.type,'button');assert.equal(tile.dataset.agentId,'fixture');assert.equal(tile.querySelector('.admin-tile-title')!.textContent,'<img src=x onerror=alert(1)>');assert.equal(tile.querySelectorAll('img').length,1);assert.equal(tile.querySelector('img')!.getAttribute('src'),'/api/agents/fixture/avatar');assert.equal(tile.querySelector('.operator-agent-state')!.textContent,'Wartet auf Freigabe');assert.equal(tile.querySelectorAll('button,a').length,0);assert.equal(tile.querySelector('.operator-agent-tile-action')!.textContent,view==='settings'?'Registrierung prüfen':'Nachrichten und Kommentare ansehen');
  tile.querySelector('img')!.dispatchEvent(new dom.window.Event('error'));assert.equal(tile.querySelectorAll('img').length,0);assert.ok(tile.querySelector('.moderation-author-avatar')!.textContent);
 }}finally{if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});
