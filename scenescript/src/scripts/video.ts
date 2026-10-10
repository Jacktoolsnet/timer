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
export function syncVideo(v:HTMLVideoElement,c:VideoSettings,duration:number,elapsed:number,running:boolean,audible=true){
 v.style.objectFit=c.fit;v.muted=c.muted||!audible;v.volume=c.volume;
 const target=videoTime(c,duration,elapsed),end=c.end??duration,active=running&&elapsed>=0&&(c.loop||elapsed<end-c.start);
 if(v.readyState<1){v.pause();return;}
 if(!v.seeking&&Math.abs(v.currentTime-target)>(active?.2:.015)){v.pause();v.currentTime=target;return;}
 if(v.seeking){v.pause();return;}
 if(active){if(v.paused)void v.play().catch(()=>{});}else v.pause();
}
