import {ADS_PUBLISHER,ADS_SLOTS,advertisingConsent,productionAdLocation,PRODUCTION_VISITOR_KEY,type TCData} from '../lib/advertising';
import {VISITOR_TERMS_VERSION} from '../lib/visitor-legal-versions';
type TCAPI=(command:string,version:number,callback:(data:TCData,success:boolean)=>void,parameter?:number)=>void;
type AdWindow=Window&{__tcfapi?:TCAPI;adsbygoogle?:{push:(request:Record<string,never>)=>unknown};nulltopicAdsStarted?:boolean};
/** Google supplies the CMP. No application checkbox or storage flag grants ad consent. */
export function initializeAdvertising(){
 const win=window as AdWindow;
 if(win.nulltopicAdsStarted||win.navigator.webdriver===true||/bot|crawler|spider|headless/i.test(win.navigator.userAgent))return;
 const placements=Array.from(document.querySelectorAll<HTMLElement>('[data-ad-placement]'));
 if(!productionAdLocation(win.location)||!placements.some(p=>p.dataset.adEnabled==='true'))return;
 win.nulltopicAdsStarted=true;
 const allowed=placements.filter(p=>p.dataset.adEnabled==='true');
 let active=true,consented=false,api:TCAPI|undefined,listenerId:number|undefined;
 let poll:number|undefined,pollCount=0,attached=false,bootstrapped=false;
 let script:HTMLScriptElement|undefined;
 const units=new Map<HTMLElement,{ins:HTMLElement;observer:MutationObserver;timer:number;expired:boolean}>();
 const requested=new Set<HTMLElement>();
 const acknowledged=()=>{try{return localStorage.getItem(PRODUCTION_VISITOR_KEY)===VISITOR_TERMS_VERSION;}catch{return false;}};
 const block=(p:HTMLElement)=>{const unit=units.get(p);if(unit){unit.observer.disconnect();win.clearTimeout(unit.timer);units.delete(p);}p.querySelector('.ad-unit')?.replaceChildren();p.dataset.adState='blocked';p.dataset.adActive='false';p.setAttribute('aria-hidden','true');};
 const blockAll=()=>allowed.forEach(block);
 const display=(p:HTMLElement)=>{
  const unit=units.get(p);if(!unit)return;
  const status=unit.ins.getAttribute('data-ad-status');
  const filled=active&&consented&&acknowledged()&&status==='filled';
  p.dataset.adState=filled?'filled':status==='unfilled'||status==='unfill-optimized'||unit.expired?'empty':'pending';
  p.dataset.adActive=String(filled);p.setAttribute('aria-hidden',String(!filled));
 };
 const request=(p:HTMLElement)=>{
  if(!active||!consented||!acknowledged()||requested.has(p))return;
  const holder=p.querySelector<HTMLElement>('.ad-unit');if(!holder||holder.getBoundingClientRect().width<1)return;
  // Choose once per page view; never manufacture new impressions on resize or reconsent.
  requested.add(p);
  const vertical=win.matchMedia('(min-width: 761px)').matches;
  const ins=document.createElement('ins');ins.className='adsbygoogle';ins.style.display='block';
  ins.dataset.adClient=ADS_PUBLISHER;ins.dataset.adSlot=vertical?ADS_SLOTS.vertical:ADS_SLOTS.horizontal;
  ins.dataset.adFormat='auto';ins.dataset.fullWidthResponsive='true';
  p.dataset.adLayout=vertical?'vertical':'horizontal';p.dataset.adState='pending';p.dataset.adActive='false';p.setAttribute('aria-hidden','true');
  holder.append(ins);
  const observer=new MutationObserver(()=>display(p));observer.observe(ins,{attributes:true,attributeFilter:['data-ad-status']});
  const timer=win.setTimeout(()=>{const unit=units.get(p);if(unit){unit.expired=true;display(p);}},10000);
  units.set(p,{ins,observer,timer,expired:false});
  try{(win.adsbygoogle ||= [] as Record<string,never>[]).push({});}catch{block(p);}
 };
 const receive=(data:TCData,success:boolean)=>{
  if(typeof data?.listenerId==='number')listenerId=data.listenerId;
  if(!active)return;
  consented=advertisingConsent(data,success);
  if(!consented||!acknowledged()){blockAll();return;}
  allowed.forEach(request);
 };
 const attach=()=>{
  if(!active||attached||!acknowledged())return;
  if(typeof win.__tcfapi==='function'){
   api=win.__tcfapi;attached=true;
   try{api('addEventListener',2,receive);}catch{attached=false;consented=false;blockAll();}
  }
  if(!attached&&pollCount++<120)poll=win.setTimeout(attach,500);
 };
 const bootstrap=()=>{
  if(!active)return;
  if(!acknowledged()){consented=false;blockAll();return;}
  if(!bootstrapped){
   bootstrapped=true;
   // AdSense's tag also bootstraps Google's published consent message. No ad push here.
   // Auto ads must be OFF in the publisher account; this page owns manual placements only.
   script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';
   script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+ADS_PUBLISHER;
   script.addEventListener('error',()=>{consented=false;blockAll();});document.head.append(script);
  }
  if(poll)win.clearTimeout(poll);pollCount=0;attach();
 };
 const storage=(event:StorageEvent)=>{if(event.key===PRODUCTION_VISITOR_KEY||event.key===null)bootstrap();};
 win.addEventListener('nulltopic:visitor-confirmation',bootstrap);win.addEventListener('storage',storage);
 win.addEventListener('pagehide',()=>{
  active=false;consented=false;if(poll)win.clearTimeout(poll);blockAll();
  if(api&&listenerId!==undefined){try{api('removeEventListener',2,()=>{},listenerId);}catch{/* CMP unavailable during teardown. */}}
  win.removeEventListener('nulltopic:visitor-confirmation',bootstrap);win.removeEventListener('storage',storage);
 });
 // Never reuse a restored ad iframe or consent snapshot after history navigation.
 win.addEventListener('pageshow',event=>{if(event.persisted)win.location.reload();});
 bootstrap();
}
