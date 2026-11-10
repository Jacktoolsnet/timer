/** An optional header control, never an authentication or authorisation decision. */
export function initializeVisitorSessionVisibility(){
 const control=document.getElementById('visitor-preview-controls');if(!control)return;
 const d=control.ownerDocument,w=d.defaultView!;
 let disposed=false,version=0,controller:AbortController|undefined,timer:number|undefined,lastRead=0;
 function apply(authenticated:boolean){
  control!.dataset.authenticated=String(authenticated);control!.hidden=authenticated;
  if(timer!==undefined)w.clearTimeout(timer);
  // Recheck only a known authenticated visible page; passive reads never renew idle expiry.
  if(authenticated&&!d.hidden&&!disposed)timer=w.setTimeout(()=>void check(),30000);
 }
 async function check(){
  if(disposed||d.hidden)return;
  const current=++version;controller?.abort();controller=new AbortController();lastRead=Date.now();
  try{
   const response=await fetch('/api/session-state',{credentials:'same-origin',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
   if(!response.ok)throw Error('Unavailable');const data=await response.json();
   if(typeof data.authenticated!=='boolean')throw Error('Invalid session state');
   if(current===version&&!disposed)apply(data.authenticated);
  }catch{if(current===version&&!disposed)apply(false);}
 }
 const session=(event:Event)=>{
  const value=(event as CustomEvent).detail;if(typeof value!=='boolean')return;
  version++;controller?.abort();apply(value);
 };
 const focus=()=>{if(Date.now()-lastRead>1000)void check();};
 const visibility=()=>{if(d.hidden){if(timer!==undefined)w.clearTimeout(timer);}else focus();};
 w.addEventListener('nulltopic:session-state',session);w.addEventListener('focus',focus);d.addEventListener('visibilitychange',visibility);
 w.addEventListener('pagehide',()=>{disposed=true;version++;controller?.abort();if(timer!==undefined)w.clearTimeout(timer);w.removeEventListener('nulltopic:session-state',session);w.removeEventListener('focus',focus);d.removeEventListener('visibilitychange',visibility);},{once:true});
 const restore=(event:PageTransitionEvent)=>{if(event.persisted){w.removeEventListener('pageshow',restore);initializeVisitorSessionVisibility();}};
 w.addEventListener('pageshow',restore);
 void check();
}
