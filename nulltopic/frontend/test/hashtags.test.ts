import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {normalizeHashtag,hashtagTokens} from '../../shared/hashtags';
import {renderPost,startFeed} from '../src/scripts/client';
import {renderConversation,conversationBackUrl} from '../src/scripts/conversation';
const post={id:'root',conversation_id:'root',parent_id:null,agent_id:'agent',name:'Example',handle:'example',body:'[Local test] A quiet #Art moment. #Grüße <script>untrusted</script>',technical:{},state:'visible',created_at:'2026-11-06T12:00:00Z'};
function globals(values:Record<string,unknown>){const old=Object.entries(values).map(([key])=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);for(const [key,value]of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,value});return()=>{for(const [key,d]of old){if(d)Object.defineProperty(globalThis,key,d);else Reflect.deleteProperty(globalThis,key);}};}
test('hashtags normalize Unicode/case, respect word boundaries and reject oversized or URL fragments',()=>{
 assert.equal(normalizeHashtag('GrÜßE'),'grüße');assert.equal(normalizeHashtag('Cafe\u0301'),'café');
 for(const bad of ['','bad tag','#art','x'.repeat(65),'art|.*'])assert.equal(normalizeHashtag(bad),null);
 assert.deepEqual(hashtagTokens('#Art #ai_agent (#Grüße) #Cafe\u0301').map(t=>t.tag),['art','ai_agent','grüße','café']);
 assert.deepEqual(hashtagTokens('word#art https://test/#art ##art &#art #'+ 'a'.repeat(65)),[]);
});
test('root messages and comments contain safe, separate native hashtag and conversation links',()=>{
 const dom=new JSDOM('<div id="root"></div><div id="comments"></div>');const restore=globals({document:dom.window.document});
 try{
  const card=renderPost(post,{streamPages:2,streamTag:'art'});
  assert.equal(card.querySelector('script'),null);assert.equal(card.querySelector('a a'),null);assert.equal(card.querySelector('.body')!.textContent,post.body);
  assert.equal(card.querySelector('.hashtag')!.getAttribute('href'),'/conversations?tag=art#conversation-stream');assert.match(card.querySelector('.message-text-link')!.getAttribute('href')!,/streamTag=art/);
  const root=document.getElementById('root')!,comments=document.getElementById('comments')!;
  renderConversation([post,{...post,id:'comment',parent_id:'root'}],root,comments,2,undefined,'art');
  assert.equal(root.querySelectorAll('.hashtag').length,2);assert.equal(root.querySelector('.message-text-link'),null);assert.equal(comments.querySelectorAll('.hashtag').length,2);
  assert.equal(renderPost({...post,state:'hidden'}).querySelector('.hashtag'),null);
  assert.equal(conversationBackUrl('root',post,2,'art'),'/conversations?pages=2&tag=art#post-root');
  assert.match(conversationBackUrl('root',{...post,parent_id:'parent'},2,'art'),/streamTag=art/);
 }finally{restore();dom.window.close();}
});
test('filtered feed retains the hashtag on pagination and live refresh and shows a removable filter',async()=>{
 const dom=new JSDOM('<div id="hashtag-filter" hidden><strong data-hashtag-label></strong></div><div id="feed"></div><p id="status"></p><button id="more"></button><span id="live"></span>',{url:'http://localhost/conversations?tag=Art'});
 const paths:string[]=[];let change=()=>{};let page=0;
 class Source{readyState=1;onopen=null;onerror=null;addEventListener(event:string,callback:()=>void){if(event==='change')change=callback;}close(){}}
 const restore=globals({document:dom.window.document,window:dom.window,location:dom.window.location,navigator:{onLine:true},EventSource:Source,fetch:async(path:string)=>{paths.push(path);const paginated=path.includes('cursor=');page++;return new Response(JSON.stringify({items:[{...post,id:paginated?'older':'root'}],eventCursor:'0',nextCursor:paginated?null:'cursor-value'}));}});
 try{await startFeed();assert.equal(document.querySelector<HTMLElement>('#hashtag-filter')!.hidden,false);assert.equal(document.querySelector('[data-hashtag-label]')!.textContent,'#art');document.querySelector<HTMLButtonElement>('#more')!.click();await new Promise(r=>setTimeout(r,0));change();await new Promise(r=>setTimeout(r,0));assert.ok(page>=3);assert.ok(paths.every(p=>new URL(p,'http://localhost').searchParams.get('tag')==='art'));assert.ok(paths.some(p=>p.includes('cursor=')));}
 finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));restore();dom.window.close();}
});
