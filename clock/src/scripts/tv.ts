import {createTvScanner} from './tv-scanner';
import {createTvKeypad} from './tv-keypad';
import QRCode from 'qrcode';
import type {tvText} from '../lib/tv-text';
export type TvSnapshot={version:1;settings:Record<string,string|number|boolean>;appearance:{palette:string;style:string;theme:string;fontSize:string};language:string};
type State={state:'waiting'|'pending'|'active'|'detached';revision:number;acknowledged:number;snapshot?:TvSnapshot};
class TvError extends Error{constructor(public status:number,public code:string){super(code);}}
export function createClockTv(options:{snapshot:()=>TvSnapshot;apply:(snapshot:TvSnapshot)=>void}){
 const root=document.getElementById('clock-tv');if(!root)return;
 const t=JSON.parse(root.dataset.text!) as typeof tvText.en,receiver=root.dataset.receiver==='true';
 const $=(id:string)=>document.getElementById(id)!;
 const base=root.dataset.api!.replace(/\/$/,'');
 let session:{id:string;token:string}|undefined,revision=0,lastSent='',timer:number|undefined,busy=false,backoff=2000,running=false,qrSecret='';
 let keypad:ReturnType<typeof createTvKeypad>|undefined;
 let scanner:ReturnType<typeof createTvScanner>|undefined;
 const status=(value:string)=>{ $('tv-status').textContent=value;const live=document.getElementById('tv-live-status');if(live)live.textContent=value;};
 async function api<T=Record<string,never>>(path:string,method='GET',body?:unknown,credential=session?.token):Promise<T>{
  const controller=new AbortController(),abortTimer=window.setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch(base+'/api/v1/tv/'+path+'/',{method,credentials:'omit',cache:'no-store',signal:controller.signal,headers:{...(credential?{Authorization:'Bearer '+credential}:{}),...(method==='GET'?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   if(!response.ok){const data=await response.json().catch(()=>({}));throw new TvError(response.status,data.error||'tv_error');}return response.status===204?undefined as T:await response.json();
  }finally{window.clearTimeout(abortTimer);}
 }
 function schedule(delay=2000){window.clearTimeout(timer);if(session)timer=window.setTimeout(()=>void poll(),delay);}
 function forget(){window.clearTimeout(timer);session=undefined;revision=0;lastSent='';}
 function showReceiver(ready:boolean){document.body.classList.toggle('tv-ready',ready);$('tv-receiver-panel').hidden=ready;$('tv-controls').hidden=!ready;}
 async function poll(){
  if(busy){schedule();return;}if(!session)return;busy=true;
  try{
   const state=await api<State>(session.id+'/'+(receiver?'receiver':'sender'));backoff=2000;
   if(receiver){
    if(state.state==='pending'){
     $('tv-proposal').hidden=false;$('tv-approve').hidden=false;$('tv-reject').hidden=false;$('tv-qr').hidden=true;$('tv-code').hidden=true;
     $('tv-preview').textContent=state.snapshot?`${state.snapshot.settings.view} · ${state.snapshot.settings.zone}`:'';status(t.pending);
    }else if((state.state==='active'||state.state==='detached')&&state.snapshot){
     if(revision<state.revision){options.apply(state.snapshot);running=true;showReceiver(true);revision=state.revision;}
     if(state.state==='active'&&state.acknowledged!==state.revision)await api(session.id+'/ack','POST',{revision:state.revision});
     status('');
     if(state.state==='detached'){forget();status(t.expired);return;}
    }
   }else{
    revision=state.revision;
    if(state.state==='active'){
     running=true;
     const snapshot=options.snapshot(),serialized=JSON.stringify(snapshot);
     if(serialized!==lastSent){const updated=await api<{revision:number}>(session.id+'/settings','PUT',{revision,snapshot});revision=updated.revision;lastSent=serialized;status(t.connected);}
     else status(state.acknowledged===revision?t.applied:t.connected);
    }else status(t.pending);
   }
   schedule(receiver||!running?2000:4000);
  }catch(error){
   if(error instanceof TvError&&[401,404,410].includes(error.status)){forget();status(t.expired);if(receiver){$('tv-retry').hidden=false;if(!running){$('tv-qr').hidden=true;$('tv-code').hidden=true;$('tv-approve').hidden=true;$('tv-reject').hidden=true;}}else{setSenderConnected(false);}return;}
   if(error instanceof TvError&&error.status===409){schedule();return;}
   status(t.offline);backoff=Math.min(backoff*2,30000);schedule(backoff);
  }finally{busy=false;}
 }
 function setSenderConnected(connected:boolean){if(connected)scanner?.close();$('tv-pair-form').hidden=connected;$('tv-detach').hidden=!connected;if(!connected){qrSecret='';const input=$('tv-pair-code') as HTMLInputElement;input.required=true;input.parentElement!.hidden=false;$('tv-code-entry').hidden=false;keypad?.sync();}}
 async function action(button:HTMLButtonElement,work:()=>Promise<void>){if(busy)return;busy=true;button.disabled=true;try{await work();}catch(error){if(error instanceof TvError&&error.code==='invalid_pairing'&&!receiver)setSenderConnected(false);status(error instanceof TvError&&error.code==='invalid_pairing'?t.invalid:t.failed);}finally{busy=false;button.disabled=false;keypad?.sync();schedule();}}
 if(receiver){
  async function start(){
   forget();running=false;showReceiver(false);status('');$('tv-retry').hidden=true;$('tv-proposal').hidden=true;$('tv-approve').hidden=true;$('tv-reject').hidden=true;$('tv-qr').hidden=true;$('tv-code').hidden=false;$('tv-code').textContent='…';
   try{
    const created=await api<{id:string;receiverToken:string;pairToken:string;code:string}>('receivers','POST',{},'');
    session={id:created.id,token:created.receiverToken};$('tv-code').textContent=created.code.replace(/(\d{4})(\d{4})/,'$1 $2');
    const link=new URL('/'+document.documentElement.lang+'/pair/',location.origin);link.hash='tv='+created.pairToken;
    try{await QRCode.toCanvas($('tv-qr') as HTMLCanvasElement,link.href,{width:208,margin:4,errorCorrectionLevel:'M'});$('tv-qr').hidden=false;}catch{/* Numeric code remains usable. */}
    schedule();
   }catch{status(t.failed);$('tv-code').textContent='';$('tv-retry').hidden=false;}
  }
  $('tv-approve').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,async()=>{
   await api(session!.id+'/approve','POST',{});schedule(10);
   // Fullscreen must be requested during a user gesture; the dedicated button remains available.
  }));
  async function stop(){if(session)await api(session.id+'/stop','POST',{});forget();running=false;document.body.classList.remove('tv-ready');await start();}
  $('tv-reject').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,stop));
  $('tv-stop').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,stop));
  $('tv-retry').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,async()=>{if(session)await api(session.id+'/stop','POST',{});await start();}));
  $('tv-fullscreen').addEventListener('click',()=>{void document.documentElement.requestFullscreen?.().catch(()=>{});});
  void start();
 }else{
  const dialog=$('tv-dialog') as HTMLDialogElement;
  let autoCode='';
  const startPairing=()=>{if(!busy&&!session)($('tv-pair-form') as HTMLFormElement).requestSubmit();};
  keypad=createTvKeypad($('tv-pair-code') as HTMLInputElement,$('tv-keypad'),$('tv-send') as HTMLButtonElement,()=>busy);
  scanner=createTvScanner(t,secret=>{
   qrSecret=secret;($('tv-pair-code') as HTMLInputElement).required=false;$('tv-code-entry').hidden=true;keypad!.sync();status(t.scanReady);startPairing();
  });
  const fragment=new URLSearchParams(location.hash.slice(1));const secret=fragment.get('tv');
  if(secret){history.replaceState(null,'',location.pathname+location.search);if(/^[a-f0-9]{64}$/.test(secret)){qrSecret=secret;($('tv-pair-code') as HTMLInputElement).required=false;$('tv-code-entry').hidden=true;keypad.sync();dialog.showModal();}}
  $('tv-open').addEventListener('click',()=>dialog.showModal());$('tv-close').addEventListener('click',()=>dialog.close());
  $('tv-pair-form').addEventListener('submit',event=>{
   event.preventDefault();void action($('tv-send') as HTMLButtonElement,async()=>{
    const snapshot=options.snapshot();
    const created=await api<{id:string;senderToken:string;revision:number}>('claim','POST',{...(qrSecret?{pairToken:qrSecret}:{code:($('tv-pair-code') as HTMLInputElement).value.replace(/\s/g,'')}),snapshot},'');
    qrSecret='';($('tv-pair-code') as HTMLInputElement).value='';session={id:created.id,token:created.senderToken};revision=created.revision;lastSent=JSON.stringify(snapshot);setSenderConnected(true);status(t.pending);dialog.close();$('tv-open').focus();
   });
  });
  $('tv-pair-code').addEventListener('input',()=>{
   const code=($('tv-pair-code') as HTMLInputElement).value;
   if(code.length<8){autoCode='';return;}
   if(/^\d{8}$/.test(code)&&code!==autoCode){autoCode=code;startPairing();}
  });
  $('tv-detach').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,async()=>{await api(session!.id+'/detach','POST',{});forget();setSenderConnected(false);status(t.expired);}));
  const changed=()=>{if(session)schedule(600);};document.getElementById('clock-settings')!.addEventListener('change',changed);document.getElementById('clock-settings')!.addEventListener('input',changed);
  new MutationObserver(changed).observe(document.documentElement,{attributes:true,attributeFilter:['data-palette','data-style','data-font-size','data-theme']});
 }
 // Never persist capabilities, codes or snapshots. The receiver keeps rendering on network loss.
 window.addEventListener('pagehide',()=>{window.clearTimeout(timer);session=undefined;});
}
