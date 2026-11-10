import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {initializeStatistics,renderStatistics} from '../src/scripts/statistics';
import {initializeHumanLanguage} from '../src/lib/i18n';
const html=readFileSync(new URL('../dist/administration/index.html',import.meta.url),'utf8');
const data={timezone:'Europe/Berlin',date:'2026-11-10',asOf:'2026-11-10T10:00:00Z',operators:{today:'0',total:'9007199254740993',lastSevenDays:'7'},agents:{today:'2',total:'15',lastSevenDays:'7'},messages:{today:'4',total:'1000',lastSevenDays:'7'}};
const tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(run:(dom:JSDOM,state:any)=>Promise<void>,lang='en'){
 const dom=new JSDOM(html,{url:'http://localhost/administration?lang='+lang});dom.window.document.documentElement.lang=lang;
 const state:any={active:true,requests:0,errors:[],result:data};const prior=new Map<string,PropertyDescriptor|undefined>();
 for(const [key,value] of Object.entries({document:dom.window.document,fetch:async()=>{state.requests++;if(state.pending)await state.pending;if(state.failure)throw Error('Synthetic failure');return Response.json(state.result);}})){prior.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true});}
 try{initializeHumanLanguage(dom.window.document);state.ui=initializeStatistics({active:()=>state.active,onError:async(error)=>{state.errors.push(error);}});await run(dom,state);}finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();for(const [key,value] of prior){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}
}
for(const lang of ['en','de','es','fr'])test('statistics render localized exact counts, zero and accessible icon actions: '+lang,async()=>fixture(async(dom,state)=>{
 await state.ui.load();const d=dom.window.document;assert.equal(d.querySelectorAll('.statistics-card').length,3);const value=d.querySelector('[data-statistic=operators] dd')!.textContent!;assert.equal(value.replace(/\D/g,''),'9007199254740993');assert.equal(d.querySelector('[data-statistic=operators] dd:nth-of-type(2)')!.textContent,'0');assert.equal(d.querySelector('[data-statistic=operators] dd:last-child')!.textContent,'7');assert.equal(d.querySelectorAll('.statistics-card dd').length,9);assert.ok(d.getElementById('statistics-updated')!.textContent!.includes('Europe/Berlin'));assert.equal(d.getElementById('statistics-status')!.textContent,'');
 for(const button of d.querySelectorAll('#admin-statistics button')){assert.equal(button.textContent,'');assert.equal(button.getAttribute('aria-label'),button.getAttribute('data-tooltip'));assert.ok(button.querySelector('svg'));}
},lang));
test('statistics do not duplicate requests or repopulate a departed view; errors do not show invented zeroes',async()=>fixture(async(dom,state)=>{
 let release!:()=>void;state.pending=new Promise<void>(r=>release=r);const first=state.ui.load();void state.ui.load();assert.equal(state.requests,1);assert.equal(dom.window.document.querySelector<HTMLButtonElement>('#statistics-refresh')!.disabled,true);state.active=false;state.ui.clear();release();await first;assert.equal(dom.window.document.querySelector('#statistics-cards')!.children.length,0);
 state.pending=null;state.active=true;state.failure=true;await state.ui.load();assert.equal(dom.window.document.querySelector('#statistics-cards')!.children.length,0);assert.ok(dom.window.document.getElementById('statistics-status')!.textContent);assert.equal(state.errors.length,1);assert.equal(dom.window.document.querySelector<HTMLButtonElement>('#statistics-refresh')!.disabled,false);
 state.failure=false;await state.ui.load();assert.equal(dom.window.document.querySelectorAll('.statistics-card').length,3);
}));
test('statistics reject malformed or injected values instead of rendering markup',async()=>fixture(async(dom,state)=>{
 const target=dom.window.document.getElementById('statistics-cards')!;assert.throws(()=>renderStatistics(target,{...data,messages:{today:'1',total:'<img src=x onerror=alert(1)>',lastSevenDays:'7'}}));assert.equal(target.children.length,0);assert.equal(target.querySelector('img'),null);state.result={...data,asOf:'not a date'};await state.ui.load();assert.equal(target.children.length,0);assert.equal(state.errors.length,1);
}));

test('back-forward restoration reloads only the active statistics view after clearing private values',async()=>fixture(async(dom,state)=>{
 await state.ui.load();dom.window.dispatchEvent(new dom.window.Event('pagehide'));assert.equal(dom.window.document.querySelector('#statistics-cards')!.children.length,0);dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow',{persisted:true}));await tick();assert.equal(state.requests,2);assert.equal(dom.window.document.querySelectorAll('.statistics-card').length,3);state.active=false;dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow',{persisted:true}));await tick();assert.equal(state.requests,2);
}));
