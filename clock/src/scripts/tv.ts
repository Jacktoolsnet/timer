import {createReceiverApproval} from './tv-approval-controls';
import {createReceiverControls} from './tv-receiver-controls';
import {createTvScanner} from './tv-scanner';
import {createTvKeypad} from './tv-keypad';
import QRCode from 'qrcode';
import type {tvText} from '../lib/tv-text';
export type TvSnapshot={version:1;settings:Record<string,string|number|boolean>;appearance:{palette:string;style:string;theme:string;fontSize:string};language:string;senderName?:string;coordinates?:{latitude:number;longitude:number}};
type State={state:'waiting'|'pending'|'active'|'detached';revision:number;acknowledged:number;snapshot?:TvSnapshot};
// Browsers do not expose a reliable device hostname. Send only a coarse, advisory label.
export function senderDeviceName(){
 const ua=navigator.userAgent;
 const browser=/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox\/|FxiOS\//.test(ua)?'Firefox':/Chrome\/|CriOS\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Browser';
 const os=/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?'iPad':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Macintosh|Mac OS X/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'';
 return [browser,os].filter(Boolean).join(' · ');
}
class TvError extends Error{constructor(public status:number,public code:string){super(code);}}
export function createClockTv(options:{snapshot:(includeLocation?:boolean)=>TvSnapshot;apply:(snapshot:TvSnapshot)=>void}){
 const root=document.getElementById('clock-tv');if(!root)return;
 const t=JSON.parse(root.dataset.text!) as typeof tvText.en,receiver=root.dataset.receiver==='true';
 const $=(id:string)=>document.getElementById(id)!;
 // Preview renders the same clock in an isolated frame, without pairing, location or wake lock.
 if(receiver&&window.parent!==window&&new URLSearchParams(location.search).get('preview')==='1'){
  document.body.classList.add('tv-preview','tv-ready');
  window.addEventListener('message',event=>{
   if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='clock-stream-preview')return;
   const snapshot=event.data.snapshot as TvSnapshot;
   if(snapshot?.version===1&&snapshot.settings&&snapshot.appearance)options.apply(snapshot);
  });
  window.parent.postMessage({type:'clock-stream-preview-ready'},location.origin);
  return;
 }

 const receiverControls=receiver?createReceiverControls($('tv-controls')):undefined;
 const receiverApproval=receiver?createReceiverApproval($('tv-receiver-panel'),$('tv-preview') as HTMLIFrameElement):undefined;
 const base=root.dataset.api!.replace(/\/$/,'');
 let session:{id:string;token:string}|undefined,revision=0,lastSent='',timer:number|undefined,busy=false,backoff=2000,running=false,qrSecret='';
 let pendingSnapshot:TvSnapshot|undefined,lastPreview='';
 const shareLocation=()=>!receiver&&($('tv-share-location') as HTMLInputElement).checked;
 let validityTimer:number|undefined,refreshCountdown:(()=>void)|undefined;
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
 function forget(){refreshCountdown=undefined;window.clearInterval(validityTimer);window.clearTimeout(timer);session=undefined;revision=0;lastSent='';}
 function clearPreview(){
  receiverApproval?.reset();
  pendingSnapshot=undefined;lastPreview='';
  const frame=document.getElementById('tv-preview') as HTMLIFrameElement|null;
  frame?.removeAttribute('src');frame?.removeAttribute('data-loaded');
  document.getElementById('tv-receiver-panel')?.removeAttribute('data-pending');
 }
 function sendPreview(){
  const frame=document.getElementById('tv-preview') as HTMLIFrameElement|null;
  if(pendingSnapshot&&frame?.dataset.loaded==='true'){
   const serialized=JSON.stringify(pendingSnapshot);if(serialized===lastPreview)return;
   frame.contentWindow?.postMessage({type:'clock-stream-preview',snapshot:pendingSnapshot},location.origin);lastPreview=serialized;
  }
 }
 if(receiver){
  window.addEventListener('message',event=>{
   const frame=$('tv-preview') as HTMLIFrameElement;
   if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='clock-stream-preview-ready'){
    frame.dataset.loaded='true';sendPreview();receiverApproval?.ensureFocus();
   }
  });
  const box=$('tv-preview').parentElement!;
  new ResizeObserver(()=>box.style.setProperty('--preview-scale',String(box.clientWidth/960))).observe(box);
 }
 function showReceiver(ready:boolean){receiverControls?.setActive(ready);document.body.classList.toggle('tv-ready',ready);$('tv-receiver-panel').hidden=ready;$('tv-controls').hidden=!ready;}
 async function poll(){
  if(busy){schedule();return;}if(!session)return;busy=true;
  try{
   const currentSession=session;
   const state=await api<State>(session.id+'/'+(receiver?'receiver':'sender'));if(session!==currentSession)return;backoff=2000;
   if(receiver){
    if(state.state==='pending'){
     $('tv-proposal').hidden=false;$('tv-approve').hidden=false;$('tv-reject').hidden=false;$('tv-qr').hidden=true;$('tv-code').hidden=true;
     const first=!pendingSnapshot;pendingSnapshot=state.snapshot;
     $('tv-receiver-panel').dataset.pending='true';
     $('tv-sender-name').textContent=state.snapshot?.senderName||t.unknownDevice;
     const frame=$('tv-preview') as HTMLIFrameElement;
     if(!frame.hasAttribute('src'))frame.src='/'+document.documentElement.lang+'/stream/?preview=1';
     sendPreview();status('');
     if(first)receiverApproval?.focusDefault();else receiverApproval?.ensureFocus();
    }else if((state.state==='active'||state.state==='detached')&&state.snapshot){
     if(revision<state.revision){refreshCountdown=undefined;window.clearInterval(validityTimer);clearPreview();options.apply(state.snapshot);running=true;showReceiver(true);revision=state.revision;}
     if(state.state==='active'&&state.acknowledged!==state.revision)await api(session.id+'/ack','POST',{revision:state.revision});
     status('');
     if(state.state==='detached'){forget();status(t.expired);return;}
    }
   }else{
    revision=state.revision;
    if(state.state==='active'){
     running=true;
     const snapshot=options.snapshot(shareLocation()),serialized=JSON.stringify(snapshot);
     if(serialized!==lastSent){const updated=await api<{revision:number}>(session.id+'/settings','PUT',{revision,snapshot});revision=updated.revision;lastSent=serialized;status(t.connected);}
     else status(state.acknowledged===revision?t.applied:t.connected);
    }else status(t.pending);
   }
   schedule(receiver||!running?2000:4000);
  }catch(error){
   if(error instanceof TvError&&[401,404,410].includes(error.status)){forget();status(t.expired);if(receiver){clearPreview();$('tv-validity').hidden=true;$('tv-proposal').hidden=true;showRetry();if(!running){$('tv-qr').hidden=true;$('tv-code').hidden=true;$('tv-approve').hidden=true;$('tv-reject').hidden=true;}}else{($('tv-share-location') as HTMLInputElement).checked=false;setSenderConnected(false);}return;}
   if(error instanceof TvError&&error.status===409){schedule();return;}
   status(t.offline);backoff=Math.min(backoff*2,30000);schedule(backoff);
  }finally{busy=false;}
 }
 function focusRetry(){
  if(!receiver||$('tv-receiver-panel').hidden)return;
  const button=$('tv-retry') as HTMLButtonElement;
  if(!button.hidden&&!button.disabled)button.focus();
 }
 function showRetry(){$('tv-retry').hidden=false;focusRetry();}
 function setSenderConnected(connected:boolean){if(connected)scanner?.close();$('tv-pair-form').hidden=connected;$('tv-detach').hidden=!connected;if(!connected){qrSecret='';const input=$('tv-pair-code') as HTMLInputElement;input.required=true;input.parentElement!.hidden=false;$('tv-code-entry').hidden=false;keypad?.sync();}}
 async function action(button:HTMLButtonElement,work:()=>Promise<void>){if(busy)return;busy=true;button.disabled=true;try{await work();}catch(error){if(error instanceof TvError&&error.code==='invalid_pairing'&&!receiver)setSenderConnected(false);status(error instanceof TvError&&error.code==='invalid_pairing'?t.invalid:t.failed);}finally{busy=false;button.disabled=false;focusRetry();keypad?.sync();schedule();}}
 if(receiver){
  function startCountdown(seconds:number,requestedAt:number){
   const duration=Number.isFinite(seconds)&&seconds>0?Math.min(seconds,600):600;
   const expiresAt=requestedAt+duration*1000;
   const progress=$('tv-validity-progress') as HTMLProgressElement;
   progress.max=duration;$('tv-validity').hidden=false;$('tv-validity-label').textContent=t.codeValidFor;
   function update(){
    const remaining=Math.max(0,Math.ceil((expiresAt-Date.now())/1000));
    progress.value=remaining;
    const time=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');
    $('tv-countdown').textContent=time;progress.setAttribute('aria-valuetext',time);
    if(remaining===0){
     forget();clearPreview();$('tv-validity-label').textContent=t.codeExpired;
     $('tv-qr').hidden=true;$('tv-code').hidden=true;$('tv-proposal').hidden=true;
     $('tv-approve').hidden=true;$('tv-reject').hidden=true;showRetry();status('');
    }
   }
   refreshCountdown=update;validityTimer=window.setInterval(update,1000);update();
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCountdown?.();});
  async function start(){
   clearPreview();forget();running=false;showReceiver(false);status('');$('tv-validity').hidden=true;$('tv-retry').hidden=true;$('tv-proposal').hidden=true;$('tv-approve').hidden=true;$('tv-reject').hidden=true;$('tv-qr').hidden=true;$('tv-code').hidden=false;$('tv-code').textContent='…';
   try{
    const requestedAt=Date.now();
    const created=await api<{id:string;receiverToken:string;pairToken:string;code:string;pairSeconds:number}>('receivers','POST',{},'');
    session={id:created.id,token:created.receiverToken};$('tv-code').textContent=created.code.replace(/(\d{4})(\d{4})/,'$1 $2');
    const link=new URL('/'+document.documentElement.lang+'/pair/',location.origin);link.hash='tv='+created.pairToken;
    try{await QRCode.toCanvas($('tv-qr') as HTMLCanvasElement,link.href,{width:208,margin:4,errorCorrectionLevel:'M'});$('tv-qr').hidden=false;}catch{/* Numeric code remains usable. */}
    startCountdown(created.pairSeconds,requestedAt);schedule();
   }catch{status(t.failed);$('tv-code').textContent='';showRetry();}
  }
  $('tv-approve').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,async()=>{
   receiverControls?.requestFullscreen();
   await api(session!.id+'/approve','POST',{});refreshCountdown=undefined;window.clearInterval(validityTimer);schedule(10);
  }));
  async function stop(){
   if(session)await api(session.id+'/stop','POST',{});
   forget();running=false;receiverControls?.setActive(false);
   if(document.fullscreenElement&&document.exitFullscreen)try{await document.exitFullscreen();}catch{/* The QR page remains usable if browser fullscreen cannot be closed. */}
   document.body.classList.remove('tv-ready');await start();
  }
  $('tv-reject').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,stop));
  $('tv-stop').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,stop));
  $('tv-retry').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,async()=>{if(session)await api(session.id+'/stop','POST',{});await start();}));
  void start();
 }else{
  const dialog=$('tv-dialog') as HTMLDialogElement;
  let autoCode='';
  const locationChoice=$('tv-share-location') as HTMLInputElement;
  function syncLocationChoice(){
   const available=!!options.snapshot(true).coordinates;
   locationChoice.disabled=!available&&!locationChoice.checked;
   $('tv-share-location-hint').textContent=available?t.shareLocationHint:t.shareLocationUnavailable;
  }
  locationChoice.addEventListener('change',()=>{if(session)schedule(10);syncLocationChoice();});
  document.addEventListener('clock-location-changed',()=>{syncLocationChoice();if(session)schedule(10);});
  syncLocationChoice();
  const startPairing=()=>{if(!busy&&!session)($('tv-pair-form') as HTMLFormElement).requestSubmit();};
  keypad=createTvKeypad($('tv-pair-code') as HTMLInputElement,$('tv-keypad'),$('tv-send') as HTMLButtonElement,()=>busy);
  scanner=createTvScanner(t,secret=>{
   qrSecret=secret;($('tv-pair-code') as HTMLInputElement).required=false;$('tv-code-entry').hidden=true;keypad!.sync();status(t.scanReady);startPairing();
  });
  const fragment=new URLSearchParams(location.hash.slice(1));const secret=fragment.get('tv');
  if(secret){history.replaceState(null,'',location.pathname+location.search);if(/^[a-f0-9]{64}$/.test(secret)){qrSecret=secret;($('tv-pair-code') as HTMLInputElement).required=false;$('tv-code-entry').hidden=true;keypad.sync();dialog.showModal();}}
  $('tv-open').addEventListener('click',()=>{syncLocationChoice();dialog.showModal();if(!session&&!qrSecret)($('tv-pair-code') as HTMLInputElement).focus();});$('tv-close').addEventListener('click',()=>dialog.close());
  $('tv-pair-form').addEventListener('submit',event=>{
   event.preventDefault();void action($('tv-send') as HTMLButtonElement,async()=>{
    const snapshot=options.snapshot(shareLocation());
    const created=await api<{id:string;senderToken:string;revision:number}>('claim','POST',{...(qrSecret?{pairToken:qrSecret}:{code:($('tv-pair-code') as HTMLInputElement).value.replace(/\s/g,'')}),snapshot},'');
    qrSecret='';($('tv-pair-code') as HTMLInputElement).value='';session={id:created.id,token:created.senderToken};revision=created.revision;lastSent=JSON.stringify(snapshot);setSenderConnected(true);status(t.pending);dialog.close();$('tv-open').focus();
   });
  });
  $('tv-pair-code').addEventListener('input',()=>{
   const code=($('tv-pair-code') as HTMLInputElement).value;
   if(code.length<8){autoCode='';return;}
   if(/^\d{8}$/.test(code)&&code!==autoCode){autoCode=code;startPairing();}
  });
  $('tv-detach').addEventListener('click',event=>void action(event.currentTarget as HTMLButtonElement,async()=>{await api(session!.id+'/detach','POST',{});forget();locationChoice.checked=false;syncLocationChoice();setSenderConnected(false);status(t.expired);}));
  const changed=()=>{if(session)schedule(600);};document.getElementById('clock-settings')!.addEventListener('change',changed);document.getElementById('clock-settings')!.addEventListener('input',changed);
  new MutationObserver(changed).observe(document.documentElement,{attributes:true,attributeFilter:['data-palette','data-style','data-font-size','data-theme']});
 }
 // Never persist capabilities, codes or snapshots. The receiver keeps rendering on network loss.
 window.addEventListener('pagehide',()=>{window.clearInterval(validityTimer);window.clearTimeout(timer);session=undefined;});
}
