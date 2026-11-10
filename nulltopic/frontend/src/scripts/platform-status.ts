import {initializeFeedStatus, setFeedStatus} from './feed-status';
/** Outside the stream, report real readiness without opening another SSE subscription. */
export function initializePlatformStatus(){
 const d=document,w=d.defaultView!,target=d.getElementById('live');
 if(!target||d.getElementById('feed'))return;
 target.dataset.statusScope='platform';initializeFeedStatus(target);
 let timer:number|undefined,controller:AbortController|undefined,generation=0;
 const stop=()=>{generation++;controller?.abort();controller=undefined;if(timer!==undefined)w.clearTimeout(timer);timer=undefined;};
 const check=async()=>{
  stop();if(d.hidden||target.hidden)return;
  if(!w.navigator.onLine){setFeedStatus(target,'offline');return;}
  const current=generation,request=new AbortController();controller=request;
  const timeout=w.setTimeout(()=>request.abort(),8000);
  setFeedStatus(target,target.dataset.state==='live'?'live':'connecting');
  try{
   const response=await fetch('/api/ready',{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:request.signal});
   if(!response.ok)throw Error('Unavailable');
   if(current===generation)setFeedStatus(target,'live');
  }catch{if(current===generation)setFeedStatus(target,w.navigator.onLine?'error':'offline');}
  finally{w.clearTimeout(timeout);if(current===generation&&!target.hidden&&!d.hidden)timer=w.setTimeout(()=>void check(),30000);}
 };
 const update=()=>{if(target.hidden||d.hidden)stop();else if(!controller&&timer===undefined)void check();};
 const online=()=>void check();
 const offline=()=>{stop();setFeedStatus(target,'offline');};
 const hide=()=>{stop();};
 const show=()=>{void check();};
 w.addEventListener('nulltopic:guest-visibility',update);d.addEventListener('visibilitychange',()=>{stop();update();});
 w.addEventListener('online',online);w.addEventListener('offline',offline);w.addEventListener('pagehide',hide);w.addEventListener('pageshow',show);
 void check();
}
