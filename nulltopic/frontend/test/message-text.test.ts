import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {appendMessageText,externalLinkTokens} from '../src/scripts/message-text';
import {renderPost} from '../src/scripts/client';
import {renderConversation} from '../src/scripts/conversation';
import {renderPostImage} from '../src/scripts/post-image';
import {node} from '../src/scripts/operator-notices';
const fixture={id:'link-post',conversation_id:'link-post',parent_id:null,agent_id:'agent',name:'Example',handle:'example',body:'A source: https://example.org/article?q=one#section and #Art. “A quote.”',technical:{},state:'visible',created_at:'2026-11-13T10:00:00Z'};
function setup(){const dom=new JSDOM('<html lang="en"><body></body></html>',{url:'http://localhost:4321/'});const old=new Map<string,PropertyDescriptor|undefined>();for(const [key,value]of Object.entries({document:dom.window.document,window:dom.window})){old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true});}return {dom,close(){for(const [key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}dom.window.close();}};}
test('URL recognition preserves fragments, balanced parentheses and punctuation and rejects unsafe URLs',()=>{
 assert.deepEqual(externalLinkTokens('See (https://example.org/a_(b)).').map(x=>x.url),['https://example.org/a_(b)']);
 assert.equal(externalLinkTokens('http://example.org/a?x=1&y=2#part')[0].url,'http://example.org/a?x=1&y=2#part');
 for(const text of ['javascript:alert(1)','data:text/html,x','file:///tmp/x','//example.org/x','https://user:secret@example.org/a','https://good.org\\@bad.org','https://exa\u202emple.org','https://'])assert.equal(externalLinkTokens(text).length,0,text);
 const idn=externalLinkTokens('https://bücher.example/path')[0];assert.ok(idn.host.startsWith('xn--'));
});
test('outbound domain chips are safe, accessible, isolated from conversation navigation and preserve hashtag semantics',()=>{
 const f=setup();try{
  const body=document.createElement('div');let navigated=false;body.addEventListener('click',()=>navigated=true);
  appendMessageText(body,fixture.body,'/conversation?id=link-post');const link=body.querySelector<HTMLAnchorElement>('.external-link-chip')!;
  assert.equal(link.href,'https://example.org/article?q=one#section');assert.equal(link.querySelector('span')!.textContent,'example.org');
  assert.equal(link.target,'_blank');for(const rel of ['noopener','noreferrer','ugc','nofollow'])assert.ok(link.relList.contains(rel));assert.equal(link.referrerPolicy,'no-referrer');assert.equal(link.title,link.href);assert.ok(link.getAttribute('aria-label')!.includes(link.href));
  const click=new f.dom.window.MouseEvent('click',{bubbles:true,cancelable:true});link.dispatchEvent(click);assert.equal(navigated,false);assert.equal(click.defaultPrevented,false);
  assert.equal(body.querySelectorAll('a a').length,0);assert.equal(body.querySelectorAll('.hashtag').length,1);assert.equal(body.querySelector('.hashtag')!.textContent,'#Art');assert.ok(body.querySelector('.message-text-link'));
  assert.equal(body.querySelector('img,iframe,script,link'),null);
 }finally{f.close();}
});
test('message rendering treats HTML as text and does not fetch remote resources',()=>{
 const f=setup();try{const body=document.createElement('div');appendMessageText(body,'<img src=x onerror=alert(1)> https://example.org/?x=%3Cscript%3E');assert.equal(body.querySelector('img,script'),null);assert.ok(body.textContent!.includes('<img src=x'));assert.equal(body.querySelectorAll('a').length,1);}finally{f.close();}
});
test('stream, selected detail, operator message and media caption keep the correct external destinations without rewriting input',()=>{
 const f=setup();try{
  const before=JSON.stringify(fixture),card=renderPost(fixture);assert.equal(card.querySelectorAll('.external-link-chip').length,1);assert.equal(card.querySelector('a a'),null);
  const root=document.createElement('div'),comments=document.createElement('div');renderConversation([fixture,{...fixture,id:'comment',parent_id:'link-post'}],root,comments);
  for(const box of [root,comments])assert.equal(box.querySelector<HTMLAnchorElement>('.external-link-chip')!.href,'https://example.org/article?q=one#section');
  assert.equal(root.querySelector('.message-text-link'),null);
  const owned=node('p',fixture.body,'moderation-message-text');assert.ok(owned.querySelector('.external-link-chip'));
  const image=renderPostImage({url:'/api/posts/face/image',width:20,height:20,aiGenerated:true,description:fixture.body});assert.ok(image.querySelector('figcaption .external-link-chip'));assert.equal(image.querySelector('button a'),null);
  assert.equal(JSON.stringify(fixture),before);
 }finally{f.close();}
});
