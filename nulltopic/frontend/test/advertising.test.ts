import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {advertisingConsent,productionAdLocation,ADS_SLOTS,PRODUCTION_VISITOR_KEY,type TCData} from '../src/lib/advertising';
import {VISITOR_TERMS_VERSION} from '../src/lib/visitor-legal-versions';
import {initializeAdvertising} from '../src/scripts/advertising';
const granted:TCData={cmpStatus:'loaded',eventStatus:'useractioncomplete',gdprApplies:true,tcString:'synthetic-only',listenerId:17,purpose:{consents:{'1':true,'3':true,'4':true}},vendor:{consents:{'755':true}}};
const tick=()=>new Promise(r=>setTimeout(r,0));
async function fixture(run:(w:JSDOM['window'],d:Document,send:(data:TCData,success?:boolean)=>void)=>Promise<void>,options:{url?:string;ack?:boolean;wide?:boolean;enabled?:boolean;webdriver?:boolean}={}){
 const dom=new JSDOM(`<div class="ad" data-ad-placement data-ad-enabled="${options.enabled===false?'false':'true'}" data-ad-state="blocked"><span class="ad-label">Advertisement</span><div class="ad-unit"></div></div>`,{url:options.url||'https://nulltopic.com/conversations'}),w=dom.window;
 if(options.webdriver)Object.defineProperty(w.navigator,'webdriver',{value:true});
 let receive:((data:TCData,success:boolean)=>void)|undefined;
 (w as any).__tcfapi=(command:string,_version:number,callback:any)=>{if(command==='addEventListener')receive=callback;};
 (w as any).matchMedia=()=>({matches:options.wide!==false});
 w.HTMLElement.prototype.getBoundingClientRect=()=>({width:options.wide===false?326:290,height:100,top:0,left:0,right:290,bottom:100,x:0,y:0,toJSON(){}});
 if(options.ack!==false)w.localStorage.setItem(PRODUCTION_VISITOR_KEY,VISITOR_TERMS_VERSION);
 const old=new Map<string,PropertyDescriptor|undefined>();
 for(const [key,value] of Object.entries({window:w,document:w.document,localStorage:w.localStorage,MutationObserver:w.MutationObserver})){old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true});}
 try{initializeAdvertising();await run(w,w.document,(data,success=true)=>receive?.(data,success));}
 finally{w.dispatchEvent(new w.Event('pagehide'));w.close();for(const [key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}
}
test('only explicit completed Google TCF consent enables advertising',()=>{
 assert.equal(advertisingConsent(granted,true),true);
 for(const data of [undefined,{}, {...granted,gdprApplies:false},{...granted,cmpStatus:'error'},{...granted,eventStatus:'cmpuishown'},{...granted,tcString:''},{...granted,vendor:{}},{...granted,purpose:{consents:{'1':true}}}])assert.equal(advertisingConsent(data,true),false);
 assert.equal(advertisingConsent(granted,false),false);
 for(const url of ['http://nulltopic.com/','https://nulltopic.com.evil/','http://localhost:4321/','https://nulltopic.com/dsa','https://nulltopic.com/administration','https://nulltopic.com/datenschutz'])assert.equal(productionAdLocation(new URL(url)),false);
});
test('CMP bootstrap waits for separate production age/terms acknowledgement; no push before advertising consent',async()=>fixture(async(w,d,send)=>{
 assert.equal(d.querySelector('script'),null);
 w.localStorage.setItem('nulltopic.visitor-confirmation.v1',VISITOR_TERMS_VERSION);w.dispatchEvent(new w.Event('nulltopic:visitor-confirmation'));assert.equal(d.querySelector('script'),null,'local preview choice is never production authorization');
 w.localStorage.setItem(PRODUCTION_VISITOR_KEY,VISITOR_TERMS_VERSION);w.dispatchEvent(new w.Event('nulltopic:visitor-confirmation'));
 assert.equal(d.querySelectorAll('script').length,1);assert.equal(d.querySelector('ins'),null);
 send({...granted,purpose:{consents:{'1':false}}});assert.equal(d.querySelector('ins'),null);
 send(granted);assert.equal(d.querySelector('ins')!.dataset.adSlot,ADS_SLOTS.vertical);assert.equal((w as any).adsbygoogle.length,1);
 initializeAdvertising();send(granted);assert.equal((w as any).adsbygoogle.length,1);
}, {ack:false}));
test('horizontal slot reveals only filled status; empty, optimized and revoked slots collapse',async()=>fixture(async(w,d,send)=>{
 send(granted);const p=d.querySelector<HTMLElement>('.ad')!,ins=d.querySelector<HTMLElement>('ins')!;
 assert.equal(ins.dataset.adSlot,ADS_SLOTS.horizontal);assert.equal(p.dataset.adState,'pending');assert.equal(p.getAttribute('aria-hidden'),'true');
 ins.dataset.adStatus='filled';await tick();assert.equal(p.dataset.adState,'filled');assert.equal(p.dataset.adActive,'true');
 ins.removeAttribute('data-ad-status');await tick();assert.equal(p.dataset.adState,'pending');assert.equal(p.dataset.adActive,'false');
 for(const state of ['unfilled','unfill-optimized']){ins.dataset.adStatus=state;await tick();assert.equal(p.dataset.adState,'empty');assert.equal(p.dataset.adActive,'false');}
 ins.dataset.adStatus='filled';await tick();assert.equal(p.dataset.adState,'filled');
 send({...granted,vendor:{consents:{'755':false}}});assert.equal(p.dataset.adState,'blocked');assert.equal(d.querySelector('ins'),null);
 send(granted);assert.equal((w as any).adsbygoogle.length,1,'reconsent never manufactures another impression');
}, {wide:false}));
test('withdrawing visitor acknowledgement or script failure removes an active unit',async()=>fixture(async(w,d,send)=>{
 send(granted);w.localStorage.removeItem(PRODUCTION_VISITOR_KEY);w.dispatchEvent(new w.StorageEvent('storage',{key:PRODUCTION_VISITOR_KEY}));assert.equal(d.querySelector('ins'),null);
 d.querySelector('script')!.dispatchEvent(new w.Event('error'));assert.equal(d.querySelector('.ad')!.getAttribute('aria-hidden'),'true');
}));
test('all local, private and disabled contexts remain free of Google requests even with fabricated consent',async()=>{
 for(const options of [{url:'http://localhost:4321/'},{url:'https://nulltopic.com/dsa'},{url:'https://nulltopic.com/operator'},{enabled:false},{webdriver:true}])await fixture(async(_w,d,send)=>{send(granted);assert.equal(d.querySelector('script,ins'),null);},options);
});
test('built public pages contain only inert placement declarations; legal/private pages have no placement',()=>{
 for(const page of ['index','conversations/index','conversation/index','agents/index','rules/index']){
  const d=new JSDOM(readFileSync(new URL('../dist/'+page+'.html',import.meta.url),'utf8')).window.document;
  assert.equal(d.querySelectorAll('[data-ad-placement]').length,1);assert.equal(d.querySelector('ins.adsbygoogle,script[src*="googlesyndication"]'),null);
 }
 for(const page of ['dsa','operator','administration','datenschutz','nutzungsbedingungen','impressum']){
  const d=new JSDOM(readFileSync(new URL('../dist/'+page+'/index.html',import.meta.url),'utf8')).window.document;
  assert.equal(d.querySelector('[data-ad-placement],ins.adsbygoogle,script[src*="googlesyndication"]'),null);
 }
});
