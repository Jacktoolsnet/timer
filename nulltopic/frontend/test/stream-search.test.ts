import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {renderPost,startFeed,streamSearchUrl} from '../src/scripts/client';
import {conversationBackUrl,renderConversation} from '../src/scripts/conversation';
const sample={id:'root',conversation_id:'root',parent_id:null,agent_id:'agent',name:'Example',handle:'example',body:'Original message',technical:{},state:'visible',created_at:'2026-11-05T12:00:00Z'};
const html=readFileSync(new URL('../dist/conversations/index.html',import.meta.url),'utf8');
function globals(values:Record<string,unknown>){const original=Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);for(const [key,value]of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,value});return()=>{for(const [key,value]of original)if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);};}

test('stream subheader provides an accessible, themed search without moving the inert ad',()=>{
 const dom=new JSDOM(html),doc=dom.window.document;const subheader=doc.querySelector('.stream-subheader')!;
 assert.equal(subheader.querySelector('#stream-search-hint'),null);assert.equal(subheader.querySelector('#stream-query')!.hasAttribute('aria-describedby'),false);
 assert.equal(subheader.querySelector('h1'),null);assert.equal(doc.querySelector('header h1 .brand-name')!.textContent,'null.topic.stream');assert.equal(subheader.querySelector('#live'),null);assert.ok(doc.querySelector('header #live'));assert.equal(subheader.querySelector('#stream-search')!.getAttribute('role'),'search');assert.equal(subheader.querySelector('input[type=search]')!.getAttribute('maxlength'),'200');assert.ok(subheader.querySelector('label[for=stream-query]'));assert.equal(subheader.querySelector('button')!.getAttribute('aria-label'),'Search');assert.equal(doc.querySelector('aside .ad')!.getAttribute('data-ad-active'),'false');dom.window.close();
});

test('new search URLs reset pages/anchors, preserve only tag/language and safely encode literal queries',()=>{
 const url=streamSearchUrl('http://localhost/conversations?pages=6&tag=old&lang=de&private=do-not-carry#post-old',{q:'<script> %_ & café',tag:'art'}),parsed=new URL(url,'http://localhost');
 assert.equal(parsed.pathname,'/conversations');assert.equal(parsed.searchParams.get('q'),'<script> %_ & café');assert.equal(parsed.searchParams.get('tag'),'art');assert.equal(parsed.searchParams.get('lang'),'de');assert.equal(parsed.searchParams.has('pages'),false);assert.equal(parsed.searchParams.has('private'),false);assert.equal(parsed.hash,'#conversation-stream');
 assert.equal(streamSearchUrl('http://localhost/?lang=bad',{tag:'art'}),'/conversations?tag=art#conversation-stream');
});

test('search context survives original/comment links and parent-to-stream navigation without interpreting content',()=>{
 const dom=new JSDOM('<div id="root"></div><div id="comments"></div>'),restore=globals({document:dom.window.document});
 try{const query='<script> café %_';const post=renderPost(sample,{streamPages:3,streamTag:'art',streamQuery:query});const link=new URL(post.querySelector<HTMLAnchorElement>('.message-link')!.href,'http://localhost');assert.equal(link.searchParams.get('streamQuery'),query);assert.equal(post.querySelector('script'),null);
 const root=document.getElementById('root')!,comments=document.getElementById('comments')!;renderConversation([sample,{...sample,id:'child',parent_id:'root'}],root,comments,3,undefined,'art',query);assert.equal(new URL(comments.querySelector<HTMLAnchorElement>('.message-link')!.href,'http://localhost').searchParams.get('streamQuery'),query);
 const parent=new URL(conversationBackUrl('root',{...sample,id:'child',parent_id:'parent'},3,'art',query),'http://localhost');assert.equal(parent.searchParams.get('streamQuery'),query);const stream=new URL(conversationBackUrl('root',sample,3,'art',query),'http://localhost');assert.equal(stream.searchParams.get('q'),query);assert.equal(stream.searchParams.get('tag'),'art');assert.equal(stream.searchParams.get('pages'),'3');assert.equal(stream.hash,'#post-root');
 }finally{restore();dom.window.close();}
});

test('server-side query is retained for pagination, live refresh, search input and independent filter clearing',async()=>{
 const dom=new JSDOM(html,{url:'http://localhost/conversations?q=%3Cscript%3E&tag=Art&lang=fr'}),paths:string[]=[];let change=()=>{};
 class Source{readyState=1;addEventListener(event:string,callback:()=>void){if(event==='change')change=callback;}close(){}}
 const restore=globals({document:dom.window.document,window:dom.window,location:dom.window.location,navigator:{onLine:true},EventSource:Source,fetch:async(path:string)=>{paths.push(path);return new Response(JSON.stringify({items:[sample],eventCursor:'0',nextCursor:path.includes('cursor=')?null:'next-page'}));}});
 try{await startFeed();const doc=dom.window.document;assert.equal(doc.querySelector<HTMLInputElement>('#stream-query')!.value,'<script>');assert.equal(doc.querySelector<HTMLAnchorElement>('#stream-search-clear')!.hidden,false);assert.equal(new URL(doc.querySelector<HTMLAnchorElement>('#stream-search-clear')!.href).searchParams.get('tag'),'art');assert.equal(new URL(doc.querySelector<HTMLAnchorElement>('.hashtag-clear')!.href).searchParams.get('q'),'<script>');doc.querySelector<HTMLButtonElement>('#more')!.click();await new Promise(r=>setTimeout(r,0));change();await new Promise(r=>setTimeout(r,0));assert.ok(paths.length>=3);assert.ok(paths.some(path=>path.includes('cursor=')));for(const path of paths){const url=new URL(path,'http://localhost');assert.equal(url.searchParams.get('q'),'<script>');assert.equal(url.searchParams.get('tag'),'art');}assert.equal(doc.querySelector('#feed script'),null);assert.equal(new URL(doc.querySelector<HTMLAnchorElement>('#feed .message-link')!.href).searchParams.get('streamQuery'),'<script>');
 }finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));restore();dom.window.close();}
});

test('invalid oversized searches make no request, and empty results have a human-readable message',async()=>{
 for(const query of ['x'.repeat(201),'missing']){const dom=new JSDOM(html,{url:'http://localhost/conversations?q='+encodeURIComponent(query)});let requests=0;class Source{readyState=1;addEventListener(){}close(){}}
 const restore=globals({document:dom.window.document,window:dom.window,location:dom.window.location,navigator:{onLine:true},EventSource:Source,fetch:async()=>{requests++;return new Response(JSON.stringify({items:[],eventCursor:'0',nextCursor:null}));}});
 try{await startFeed();assert.equal(requests,query.length>200?0:1);assert.equal(document.querySelector('#status')!.textContent,query.length>200?'Invalid search. Use up to 200 characters.':'No conversations match this search.');}finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));restore();dom.window.close();}}
});
