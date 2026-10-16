export type StopMotion={enabled:boolean;fps:number;jitter:number;rotation:number;seed:number};
export function defaultStopMotion():StopMotion{return {enabled:false,fps:12,jitter:1.5,rotation:.35,seed:17};}
export function parseStopMotion(value:unknown,path:string):StopMotion{
 const d=defaultStopMotion();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const key of Object.keys(o))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 const v={...d,...o};if(typeof v.enabled!=='boolean')throw new Error(path+'.enabled: expected boolean');
 const num=(key:'fps'|'jitter'|'rotation'|'seed',min:number,max:number,integer=false)=>{
  const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error(path+'.'+key+': expected '+(integer?'integer':'number')+' '+min+'–'+max);return n;
 };
 return {enabled:v.enabled,fps:num('fps',1,60,true),jitter:num('jitter',0,20),rotation:num('rotation',0,5),seed:num('seed',0,65535,true)};
}
/** Sample-and-hold on an element-local grid; visibility/audio keep real timeline time. */
export function stopMotionState(e:StopMotion,id:string,time:number,at:number,end=Infinity){
 if(!e.enabled||time<at)return {time,x:0,y:0,rotation:0};
 const frame=Math.floor(Math.max(0,Math.min(time,end)-at)*e.fps+1e-9);
 const sampled=time>=end?end:at+frame/e.fps;
 if(frame===0)return {time:sampled,x:0,y:0,rotation:0};
 let state=(e.seed^Math.imul(frame,374761393))>>>0;
 for(const c of id)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296*2-1;};
 return {time:sampled,x:random()*e.jitter,y:random()*e.jitter,rotation:random()*e.rotation};
}
