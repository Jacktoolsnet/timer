import {CAST_NAMESPACE,type CastState} from '../lib/cast-state';
import {loadCastScript,type CastContext,type CastSession} from './cast-sdk';

export function createCastSender(snapshot:(shareLocation:boolean)=>CastState){
 const dialog=document.getElementById('clock-cast-dialog') as HTMLDialogElement;
 const t=JSON.parse(dialog.dataset.text!) as Record<string,string>;
 const status=document.getElementById('cast-status')!;
 const appId=document.getElementById('cast-app-id') as HTMLInputElement;
 const share=document.getElementById('cast-share-location') as HTMLInputElement;
 const connect=document.getElementById('cast-connect') as HTMLButtonElement;
 const disconnect=document.getElementById('cast-disconnect') as HTMLButtonElement;
 const stop=document.getElementById('cast-stop') as HTMLButtonElement;
 let context:CastContext|undefined,session:CastSession|null=null,loading:Promise<void>|undefined;
 let timer:number|undefined,retries=0,configuredId='';
 const say=(key:string)=>{status.textContent=t[key];};
 function controls(){
  const connected=!!session;
  disconnect.hidden=stop.hidden=!connected;connect.hidden=connected;appId.disabled=connected;
  document.getElementById('clock-cast')!.setAttribute('aria-label',connected?t.connected:t.button);
 }
 const message=(_namespace:string,data:string)=>{
  try{const value=JSON.parse(data);if(value.version===1)say(value.type==='applied'?'sent':'failed');}catch{}
 };
 async function send(){
  const current=session;if(!current)return;
  try{await current.sendMessage(CAST_NAMESPACE,snapshot(share.checked));retries=0;}
  catch{if(current!==session)return;if(retries++<2)timer=window.setTimeout(()=>void send(),1000);else say('failed');}
 }
 function update(){window.clearTimeout(timer);retries=0;if(session)timer=window.setTimeout(()=>void send(),150);}
 function changed(){
  const next=context?.getCurrentSession()||null;
  if(next===session)return;
  window.clearTimeout(timer);
  session?.removeMessageListener(CAST_NAMESPACE,message);session=next;controls();
  if(session){session.addMessageListener(CAST_NAMESPACE,message);say('connected');update();}
  else say('ready');
 }
 function prepare(){
  if(loading)return loading;
  say('loading');
  loading=new Promise<void>((resolve,reject)=>{
   let settled=false;
   const finish=(available:boolean)=>{
    if(settled)return;settled=true;window.clearTimeout(timeout);
    if(!available){reject(new Error('Cast unavailable'));return;}
    context=window.cast?.framework.CastContext?.getInstance();
    if(!context){reject(new Error('Cast unavailable'));return;}
    context.addEventListener(window.cast!.framework.CastContextEventType!.SESSION_STATE_CHANGED,changed);
    connect.disabled=false;say('ready');resolve();
   };
   const timeout=window.setTimeout(()=>finish(false),12000);
   window.__onGCastApiAvailable=finish;
   if(window.cast?.framework.CastContext){finish(true);return;}
   if(!window.isSecureContext){finish(false);return;}
   void loadCastScript('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1').catch(()=>finish(false));
  }).catch(()=>{say('unsupported');loading=undefined;});
  return loading;
 }
 document.getElementById('clock-cast')!.addEventListener('click',()=>{
  dialog.showModal();if(!context)void prepare();
 });
 document.getElementById('cast-close')!.addEventListener('click',()=>dialog.close());
 connect.addEventListener('click',()=>{
  const id=appId.value.trim().toUpperCase();
  if(!/^[A-F0-9]{8}$/.test(id)){say('invalid');appId.focus();return;}
  if(!context)return;
  try{
   if(configuredId!==id){
    context.setOptions({receiverApplicationId:id,autoJoinPolicy:'page_scoped',resumeSavedSession:false});configuredId=id;
   }
   // Called synchronously from a click: the device picker requires user activation.
   void context.requestSession().then(changed).catch(()=>say('failed'));
  }catch{say('failed');}
 });
 function end(stopReceiver:boolean){
  window.clearTimeout(timer);
  session?.removeMessageListener(CAST_NAMESPACE,message);session=null;
  context?.endCurrentSession(stopReceiver);controls();say(stopReceiver?'stopped':'disconnected');
 }
 disconnect.addEventListener('click',()=>end(false));stop.addEventListener('click',()=>end(true));
 share.addEventListener('change',update);
 // Theme/font/palette changes live outside the clock-settings form.
 new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['data-palette','data-theme','data-style','data-font-size']});
 return {update};
}
