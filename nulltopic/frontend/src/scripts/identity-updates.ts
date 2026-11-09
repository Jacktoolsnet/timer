/** Bounded ID-only invalidations; authoritative API responses remain the source of truth. */
export function watchIdentityRemoval(refresh:()=>void){
 const doc=document,win=doc.defaultView!;let source:EventSource|undefined,timer:number|undefined,disposed=false;
 const schedule=()=>{if(timer!==undefined||disposed||doc.hidden)return;timer=win.setTimeout(()=>{timer=undefined;refresh();},150);};
 const stop=()=>{source?.close();source=undefined;if(timer!==undefined)win.clearTimeout(timer);timer=undefined;};
 const start=()=>{if(disposed||doc.hidden||source||!win.EventSource)return;source=new win.EventSource('/api/events');source.addEventListener('change',event=>{try{if(JSON.parse((event as MessageEvent).data).kind==='identity_removed')schedule();}catch{}});source.addEventListener('reset',schedule);source.addEventListener('open',schedule);};
 const visibility=()=>{if(doc.hidden)stop();else{schedule();start();}};
 const hide=()=>stop();const show=()=>{schedule();start();};
 doc.addEventListener('visibilitychange',visibility);win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);start();
 return ()=>{disposed=true;stop();doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);};
}
