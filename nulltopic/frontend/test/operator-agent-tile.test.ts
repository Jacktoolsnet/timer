import {test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {operatorAgentTile} from '../src/scripts/operator-agent-tile';
test('both picker cards share content-safe identity, avatar, state and destination without nested controls',()=>{
 const dom=new JSDOM('<html lang="de"></html>'),original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
 try{for(const view of ['settings','conversations'] as const){
  const tile=operatorAgentTile({id:'fixture',name:'<img src=x onerror=alert(1)>',handle:'literal',status:'pending',has_avatar:true},view);
  assert.equal(tile.type,'button');assert.equal(tile.dataset.agentId,'fixture');assert.equal(tile.querySelector('.admin-tile-title')!.textContent,'<img src=x onerror=alert(1)>');assert.equal(tile.querySelectorAll('img').length,1);assert.equal(tile.querySelector('img')!.getAttribute('src'),'/api/agents/fixture/avatar');assert.equal(tile.querySelector('.operator-agent-state')!.textContent,'Wartet auf Freigabe');assert.equal(tile.querySelectorAll('button,a').length,0);assert.equal(tile.querySelector('.operator-agent-tile-action')!.textContent,view==='settings'?'Registrierung prüfen':'Nachrichten und Kommentare ansehen');
  tile.querySelector('img')!.dispatchEvent(new dom.window.Event('error'));assert.equal(tile.querySelectorAll('img').length,0);assert.ok(tile.querySelector('.moderation-author-avatar')!.textContent);
 }}finally{if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});

test('overview agent cards expose four separate destination rows without nested buttons',async()=>{
 const {operatorAgentOverviewCard}=await import('../src/scripts/operator-agent-tile');const dom=new JSDOM('<html lang="en"></html>'),original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
 try{const visited:string[]=[];const card=operatorAgentOverviewCard({id:'a',name:'<script>literal</script>',handle:'one',status:'active'},view=>visited.push(view));assert.equal(card.tagName,'ARTICLE');assert.equal(card.querySelectorAll('button[data-agent-action]').length,4);assert.equal(card.querySelector('button button,script'),null);assert.equal(card.querySelector('.admin-tile-title')!.textContent,'<script>literal</script>');assert.ok(card.querySelector('[data-delete-identity=agent][aria-label="Delete agent"]'));for(const button of card.querySelectorAll<HTMLButtonElement>('button[data-agent-action]'))button.click();assert.deepEqual(visited,['settings','conversations','connections','moderation']);assert.ok(card.querySelector('.moderation-author-avatar'));assert.ok(card.querySelector('.operator-agent-state'));}finally{if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});

test('overview deletion tooltips escape the tile and align inward without losing rounded decoration',async()=>{
 const {readFileSync}=await import('node:fs');const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/\.admin-tile\.operator-overview-agent\s*\{ overflow: visible; \}/);
 assert.match(css,/\.operator-overview-agent::before\s*\{ border-radius: inherit; \}/);
 assert.match(css,/\.operator-overview-agent:is\(:hover,:focus-within\)\s*\{ z-index: 3; \}/);
 assert.match(css,/\.operator-overview-agent \.operator-agent-remove\[data-tooltip\]::after\s*\{ left: auto; right: 0;/);
});

test('renewed authorization is a distinct tile action without hiding active, paused or blocked status',async()=>{
 const {operatorAgentOverviewCard}=await import('../src/scripts/operator-agent-tile');const dom=new JSDOM('<html lang="de"></html>'),original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 try{for(const status of ['active','paused','blocked']){
  const visited:string[]=[];const agent={id:'a',name:'Faden',handle:'faden',status,authorization_required:true};
  const card=operatorAgentOverviewCard(agent,view=>visited.push(view));const review=card.querySelector<HTMLButtonElement>('[data-agent-action=authorization]')!;
  assert.ok(review);assert.equal(review.textContent,'Neue Veröffentlichungsfreigabe erforderlich');assert.equal(card.querySelector('.operator-agent-state')!.getAttribute('data-state'),status);assert.equal(card.querySelectorAll('button button').length,0);
  review.click();card.querySelector<HTMLButtonElement>('[data-agent-action=settings]')!.click();assert.deepEqual(visited,['authorization','settings']);
  assert.equal(operatorAgentOverviewCard({...agent,authorization_required:false},()=>{}).querySelector('.operator-agent-authorization-hint'),null);
  assert.ok(operatorAgentTile(agent,'conversations').querySelector('.operator-agent-authorization-hint'));
 }}finally{if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');dom.window.close();}
});
