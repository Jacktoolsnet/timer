/** Bounded, data-only paths. Arc length + parallel transport frames are cached per definition. */
export type V3={x:number;y:number;z:number};
export type Path3D={points:V3[];closed:boolean;interpolation:'smooth'|'linear'};
export type PathMotion3D={path:string;at:number;duration:number;laps:number;start:number;offset:number;orient:boolean};
export type Frame3D={position:V3;right:V3;up:V3;forward:V3};
export const vec=(x=0,y=0,z=0):V3=>({x:x+0,y:y+0,z:z+0});
export const add=(a:V3,b:V3):V3=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a:V3,b:V3):V3=>vec(a.x-b.x,a.y-b.y,a.z-b.z);
export const mul=(a:V3,n:number):V3=>vec(a.x*n,a.y*n,a.z*n);
export const dot=(a:V3,b:V3)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const cross=(a:V3,b:V3):V3=>vec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
export const norm=(v:V3):V3=>{const n=Math.hypot(v.x,v.y,v.z);return n>1e-10?mul(v,1/n):vec(0,0,1);};
const mix=(a:V3,b:V3,t:number)=>add(mul(a,1-t),mul(b,t));
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function record3D(v:unknown,p:string){if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');return v as Record<string,unknown>;}
export function fields3D(v:Record<string,unknown>,names:string[],p:string){for(const k of Object.keys(v))if(!names.includes(k))throw new Error(p+'.'+k+': unknown field');}
export function numeric3D(v:unknown,p:string,min:number,max:number){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(p+': expected number '+min+'–'+max);return v;}
export function vector3DInput(v:unknown,p:string,fallback:V3=vec()):V3{const o=v===undefined?{}:record3D(v,p);fields3D(o,['x','y','z'],p);return vec(...(['x','y','z'] as const).map(k=>numeric3D(o[k]===undefined?fallback[k]:o[k],p+'.'+k,-100,100)) as [number,number,number]);}
export const defaultPathMotion3D=():PathMotion3D=>({path:'route',at:0,duration:4,laps:1,start:0,offset:0,orient:true});
export function parsePaths3D(value:unknown,p='paths'):Record<string,Path3D>{
 const values=value===undefined?{}:record3D(value,p),out:Record<string,Path3D>={};if(Object.keys(values).length>16)throw new Error(p+': maximum 16');
 for(const [id,raw]of Object.entries(values)){
  const path=p+'.'+id;if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw new Error(path+': invalid identifier');
  const v=record3D(raw,path);fields3D(v,['points','closed','interpolation'],path);
  const closed=v.closed===undefined?false:v.closed;if(typeof closed!=='boolean')throw new Error(path+'.closed: expected boolean');
  const interpolation=v.interpolation===undefined?'smooth':v.interpolation;if(interpolation!=='linear'&&interpolation!=='smooth')throw new Error(path+'.interpolation: smooth, linear');
  if(!Array.isArray(v.points)||v.points.length<(closed?3:2)||v.points.length>128)throw new Error(path+'.points: expected '+(closed?3:2)+'–128 points');
  const points=v.points.map((v,i)=>vector3DInput(v,path+'.points['+i+']'));
  for(let i=1;i<points.length+(closed?1:0);i++)if(Math.hypot(...Object.values(sub(points[i%points.length],points[i-1])))<1e-5)throw new Error(path+'.points: consecutive points must differ; closed paths omit repeated endpoint');
  Object.defineProperty(out,id,{value:{points,closed,interpolation},enumerable:true,writable:true,configurable:true});
 }return out;
}
export function parsePathMotion3D(value:unknown,paths:Record<string,Path3D>,duration:number,p='path'):PathMotion3D|null{
 if(value===undefined||value===null)return null;const v=record3D(value,p),d=defaultPathMotion3D();fields3D(v,Object.keys(d),p);
 if(typeof v.path!=='string'||!Object.hasOwn(paths,v.path))throw new Error(p+'.path: missing stage path');
 const at=numeric3D(v.at===undefined?0:v.at,p+'.at',0,duration-.01),span=numeric3D(v.duration,p+'.duration',.01,duration-at+1e-9),laps=numeric3D(v.laps===undefined?1:v.laps,p+'.laps',.001,100),start=numeric3D(v.start===undefined?0:v.start,p+'.start',0,1),offset=numeric3D(v.offset===undefined?0:v.offset,p+'.offset',-10,10),orient=v.orient===undefined?true:v.orient;
 if(typeof orient!=='boolean')throw new Error(p+'.orient: expected boolean');if(!paths[v.path].closed&&start+laps>1+1e-9)throw new Error(p+': open path requires start + laps <= 1');
 return {path:v.path,at,duration:span,laps,start,offset,orient};
}
function point(path:Path3D,u:number):V3{
 const n=path.points.length,segments=path.closed?n:n-1,t=clamp(u)*segments,i=Math.min(segments-1,Math.floor(t)),f=t-i;
 const at=(j:number)=>path.points[path.closed?(j%n+n)%n:Math.max(0,Math.min(n-1,j))],b=at(i),c=at(i+1);
 if(path.interpolation==='linear')return mix(b,c,f);
 // Uniform Catmull-Rom, endpoint tangents clamped. Equal-distance sampling below controls speed.
 const a=at(i-1),d=at(i+2),out=vec();for(const k of ['x','y','z'] as const)out[k]=.5*((2*b[k])+(-a[k]+c[k])*f+(2*a[k]-5*b[k]+4*c[k]-d[k])*f*f+(-a[k]+3*b[k]-3*c[k]+d[k])*f*f*f);return out;
}
function rotate(v:V3,axis:V3,angle:number){return add(add(mul(v,Math.cos(angle)),mul(cross(axis,v),Math.sin(angle))),mul(axis,dot(axis,v)*(1-Math.cos(angle))));}
function transport(up:V3,a:V3,b:V3):V3{const axis=cross(a,b),s=Math.hypot(axis.x,axis.y,axis.z),c=Math.max(-1,Math.min(1,dot(a,b)));return s>1e-8?rotate(up,mul(axis,1/s),Math.atan2(s,c)):c<0?mul(up,-1):up;}
function perpendicular(up:V3,forward:V3){const projected=sub(up,mul(forward,dot(up,forward)));return Math.hypot(projected.x,projected.y,projected.z)>1e-8?norm(projected):norm(cross(forward,Math.abs(forward.x)<.9?vec(1,0,0):vec(0,1,0)));}
type Sample={u:number;length:number;forward:V3;up:V3};
const cache=new WeakMap<Path3D,{samples:Sample[];length:number;twist:number}>();
function compiled(path:Path3D){
 const old=cache.get(path);if(old)return old;
 const count=(path.closed?path.points.length:path.points.length-1)*32,samples:Sample[]=[];let length=0,previous=point(path,0);
 for(let i=0;i<=count;i++){
  const u=i/count,position=point(path,u),a=path.closed?(u-1e-5+1)%1:Math.max(0,u-1e-5),b=path.closed?(u+1e-5)%1:Math.min(1,u+1e-5),forward=norm(sub(point(path,b),point(path,a)));
  length+=Math.hypot(...Object.values(sub(position,previous)));previous=position;
  const up=i?perpendicular(transport(samples[i-1].up,samples[i-1].forward,forward),forward):perpendicular(vec(0,1,0),forward);samples.push({u,length,forward,up});
 }
 const first=samples[0],last=samples.at(-1)!,twist=path.closed?Math.atan2(dot(last.forward,cross(last.up,first.up)),dot(last.up,first.up)):0,result={samples,length,twist};cache.set(path,result);return result;
}
/** Arc-length fraction; frame has +Z forward, +Y up, +X right, including upside-down loops. */
export function samplePath3D(path:Path3D,fraction:number,offset=0):Frame3D{
 const {samples,length,twist}=compiled(path),progress=path.closed?((fraction%1)+1)%1:clamp(fraction),distance=progress*length;
 let lo=0,hi=samples.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid].length<=distance)lo=mid;else hi=mid;}
 const a=samples[lo],b=samples[hi],t=b.length>a.length?(distance-a.length)/(b.length-a.length):0,u=a.u+(b.u-a.u)*t,forward=norm(mix(a.forward,b.forward,t));
 let up=perpendicular(mix(a.up,b.up,t),forward);if(twist)up=rotate(up,forward,twist*progress);
 const right=norm(cross(up,forward));up=norm(cross(forward,right));return {position:add(point(path,u),mul(right,offset)),right,up,forward};
}
export function pathMotionFrame3D(paths:Record<string,Path3D>,motion:PathMotion3D,time:number){return samplePath3D(paths[motion.path],motion.start+clamp((time-motion.at)/motion.duration)*motion.laps,motion.offset);}
export function localVector3D(frame:Frame3D,v:V3){return add(add(mul(frame.right,v.x),mul(frame.up,v.y)),mul(frame.forward,v.z));}
/** Same XYZ Euler convention as construction meshes / THREE.Euler. Angles in radians. */
export function eulerFrame3D(x:number,y:number,z:number):Frame3D{
 const a=Math.cos(x),b=Math.sin(x),c=Math.cos(y),d=Math.sin(y),e=Math.cos(z),f=Math.sin(z);
 return {position:vec(),right:vec(c*e,a*f+b*e*d,b*f-a*e*d),up:vec(-c*f,a*e-b*f*d,b*e+a*f*d),forward:vec(d,-b*c,a*c)};
}
