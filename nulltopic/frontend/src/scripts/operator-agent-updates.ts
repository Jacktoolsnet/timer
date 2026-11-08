/** Bounded passive polling. The caller must use a server endpoint that does not refresh idle sessions. */
export function initializeAgentUpdates<T>(options:{document:Document;enabled:()=>boolean;generation:()=>number;read:(signal:AbortSignal)=>Promise<T>;apply:(value:T)=>void;expired:()=>void;interval?:number}){
 const doc=options.document,win=doc.defaultView!,interval=options.interval??10000;
 let timer:number|undefined,controller:AbortController|undefined,inFlight=false,suspended=false,stopped=false,epoch=0,nextAt=0,failures=0;
 const available=()=>!stopped&&!suspended&&options.enabled()&&doc.visibilityState==='visible'&&win.navigator.onLine!==false;
 const clear=()=>{win.clearTimeout(timer);timer=undefined;};
 function schedule(delay=interval){clear();if(!stopped&&!suspended&&doc.visibilityState==='visible'&&win.navigator.onLine!==false)timer=win.setTimeout(()=>{void check();},delay);}
 async function check(){
  if(inFlight||stopped)return;
  if(!available()){schedule();return;}
  if(nextAt>Date.now()){schedule(nextAt-Date.now());return;}
  clear();inFlight=true;const current=epoch,generation=options.generation();controller=new win.AbortController();let delay=interval;
  try{
   const value=await options.read(controller.signal);
   if(current!==epoch||generation!==options.generation()||!available())return;
   failures=0;options.apply(value);
  }catch(error){
   if(current!==epoch||generation!==options.generation()||!available())return;
   const fault=error as {status?:number;retryAt?:string};
   if(fault.status===401||fault.status===403){options.expired();return;}
   failures++;delay=Math.min(120000,interval*2**Math.min(failures,4));
   if(fault.status===429){const until=Date.parse(fault.retryAt||'');delay=Math.max(delay,Number.isFinite(until)?until-Date.now():60000);}
  }finally{inFlight=false;controller=undefined;nextAt=Date.now()+delay;schedule(Math.min(delay,2147483647));}
 }
 function pause(){epoch++;clear();controller?.abort();}
 function wake(){if(available())void check();else{pause();schedule();}}
 const hide=()=>{suspended=true;pause();};
 const show=()=>{suspended=false;wake();};
 doc.addEventListener('visibilitychange',wake);win.addEventListener('focus',wake);win.addEventListener('online',wake);win.addEventListener('offline',pause);win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);schedule();
 return {check,stop(){stopped=true;pause();doc.removeEventListener('visibilitychange',wake);win.removeEventListener('focus',wake);win.removeEventListener('online',wake);win.removeEventListener('offline',pause);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);}};
}
