import {videoTime,type VideoAsset,type VideoSettings} from '../lib/video';
const urls=new Map<string,string>();
function videoBlob(data:string){const raw=atob(data.slice(data.indexOf(',')+1)),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:data.slice(5,data.indexOf(';'))});}
export function videoURL(a:VideoAsset){let url=urls.get(a.data);if(!url){url=URL.createObjectURL(videoBlob(a.data));urls.set(a.data,url);}return url;}
export function releaseVideoURL(a:VideoAsset){const u=urls.get(a.data);if(u)URL.revokeObjectURL(u);urls.delete(a.data);}
export function clearVideoURLs(){for(const u of urls.values())URL.revokeObjectURL(u);urls.clear();}
export function createVideo(a:VideoAsset){const v=document.createElement('video');v.src=videoURL(a);v.preload='auto';v.playsInline=true;v.muted=true;return v;}
export async function inspectVideo(data:string):Promise<number>{
 const v=document.createElement('video'),url=URL.createObjectURL(videoBlob(data));v.src=url;v.muted=true;v.preload='auto';
 try{return await new Promise<number>((resolve,reject)=>{const timer=setTimeout(()=>finish(new Error('Video: decode timed out')),15000);function finish(error?:Error){clearTimeout(timer);v.onloadeddata=null;v.onerror=null;v.ondurationchange=null;if(error)reject(error);else resolve(v.duration);}const ready=()=>{if(v.readyState>=2&&Number.isFinite(v.duration)&&v.duration>0)finish();else if(v.readyState>=2&&v.duration===Infinity){v.currentTime=1e10;}};v.onloadeddata=ready;v.ondurationchange=ready;v.onerror=()=>finish(new Error('Video: unsupported format or codec'));v.load();});}finally{v.pause();v.removeAttribute('src');v.load();URL.revokeObjectURL(url);}
}
/** Wait for a useful native decode/buffer lead before starting the timeline. */
export async function prepareVideo(v:HTMLVideoElement,signal:AbortSignal){
 signal.throwIfAborted();
 await new Promise<void>((resolve,reject)=>{
  const events=['loadeddata','canplay','canplaythrough','progress','seeked'];
  const timer=setTimeout(()=>finish(new Error('Video buffering timed out')),15000);
  const ready=()=>{
   if(v.error){finish(new Error('Video cannot be played'));return;}
   if(v.seeking||v.readyState<3)return;
   const end=Math.min(v.duration,v.currentTime+2);
   for(let i=0;i<v.buffered.length;i++)if(v.buffered.start(i)<=v.currentTime+.01&&v.buffered.end(i)>=end-.01){finish();return;}
   if(v.readyState>=4)finish();
  };
  function finish(error?:unknown){clearTimeout(timer);events.forEach(name=>v.removeEventListener(name,ready));v.removeEventListener('error',ready);signal.removeEventListener('abort',abort);if(error)reject(error);else resolve();}
  const abort=()=>finish(signal.reason);
  events.forEach(name=>v.addEventListener(name,ready));v.addEventListener('error',ready);signal.addEventListener('abort',abort,{once:true});ready();
 });
}
/** A non-looping video can clock its overlays without chasing output latency. */
export function videoPlayhead(v:HTMLVideoElement,c:VideoSettings,origin:number,time:number){
 if(c.loop||v.readyState<2||v.ended||v.dataset.playbackFailed||time<origin||time>=origin+(c.end??v.duration)-c.start)return null;
 return Math.max(time,origin+v.currentTime-c.start);
}
const positionedVideos=new WeakSet<HTMLVideoElement>();
export function syncVideo(v:HTMLVideoElement,c:VideoSettings,duration:number,elapsed:number,running:boolean,audible=true){
 if(v.style.objectFit!==c.fit)v.style.objectFit=c.fit;
 const muted=c.muted||!audible;if(v.muted!==muted)v.muted=muted;if(v.volume!==c.volume)v.volume=c.volume;
 const target=videoTime(c,duration,elapsed),end=c.end??duration,active=running&&elapsed>=0&&(c.loop||elapsed<end-c.start);
 if(v.readyState<1){v.pause();return;}
 const initial=!positionedVideos.has(v);positionedVideos.add(v);
 const drift=target-v.currentTime,wrap=c.loop&&(v.currentTime>=end||v.currentTime<c.start-.015);
 // Small live drift is corrected gradually, not by repeatedly interrupting audio.
 if(!v.seeking&&(Math.abs(drift)>(active&&!initial?.75:.015)||active&&wrap)){if(!active)v.pause();v.currentTime=target;return;}
 if(v.seeking){if(!active)v.pause();return;}
 const speed=active&&Math.abs(drift)>.05?1+Math.max(-.02,Math.min(.02,drift*.1)):1;
 if(v.playbackRate!==speed)v.playbackRate=speed;
 if(active){if(v.paused)void v.play().then(()=>{delete v.dataset.playbackFailed;}).catch(()=>{v.dataset.playbackFailed='true';});}else v.pause();
}
