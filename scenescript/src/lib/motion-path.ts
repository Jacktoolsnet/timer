export type Point={x:number;y:number};
export const pathTypes=['line','bezier','ellipse'] as const;
export type MotionPath={type:typeof pathTypes[number];start:number;duration:number;easing:'linear'|'ease-in-out';repeat:'once'|'loop'|'ping-pong';after:'hold'|'reset';orient:boolean;from:Point;to:Point;control1:Point;control2:Point;center:Point;radiusX:number;radiusY:number;startAngle:number;clockwise:boolean};
export function defaultMotionPath(type:MotionPath['type']='line'):MotionPath{return {type,start:0,duration:3,easing:'linear',repeat:'once',after:'hold',orient:false,from:{x:0,y:0},to:{x:30,y:0},control1:{x:10,y:-20},control2:{x:20,y:20},center:{x:0,y:0},radiusX:15,radiusY:15,startAngle:0,clockwise:true};}
export function parseMotionPath(value:unknown,sceneDuration:number,path='motionPath'):MotionPath|null{
 if(value===null||value===undefined)return null;
 const object=(v:unknown,p:string)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');return v as Record<string,unknown>;};
 const raw=object(value,path),d=defaultMotionPath();for(const k of Object.keys(raw))if(!Object.hasOwn(d,k))throw new Error(path+'.'+k+': unknown field');
 const v={...d,...raw};
 const num=(n:unknown,p:string,min:number,max:number)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new Error(p+': expected number '+min+'–'+max);return n;};
 const choice=<T extends string>(n:unknown,p:string,options:readonly T[])=>{if(!options.includes(n as T))throw new Error(p+': '+options.join(', '));return n as T;};
 const bool=(n:unknown,p:string)=>{if(typeof n!=='boolean')throw new Error(p+': expected boolean');return n;};
 const point=(n:unknown,p:string)=>{const o=object(n,p);for(const k of Object.keys(o))if(!['x','y'].includes(k))throw new Error(p+'.'+k+': unknown field');return {x:num(o.x,p+'.x',-200,200),y:num(o.y,p+'.y',-200,200)};};
 return {type:choice(v.type,path+'.type',pathTypes),start:num(v.start,path+'.start',0,sceneDuration),duration:num(v.duration,path+'.duration',.01,3600),easing:choice(v.easing,path+'.easing',['linear','ease-in-out']),repeat:choice(v.repeat,path+'.repeat',['once','loop','ping-pong']),after:choice(v.after,path+'.after',['hold','reset']),orient:bool(v.orient,path+'.orient'),from:point(v.from,path+'.from'),to:point(v.to,path+'.to'),control1:point(v.control1,path+'.control1'),control2:point(v.control2,path+'.control2'),center:point(v.center,path+'.center'),radiusX:num(v.radiusX,path+'.radiusX',.1,200),radiusY:num(v.radiusY,path+'.radiusY',.1,200),startAngle:num(v.startAngle,path+'.startAngle',-360,360),clockwise:bool(v.clockwise,path+'.clockwise')};
}
export function pathPoint(m:MotionPath,t:number):Point{
 if(m.type==='line')return {x:m.from.x+(m.to.x-m.from.x)*t,y:m.from.y+(m.to.y-m.from.y)*t};
 if(m.type==='ellipse'){const a=(m.startAngle+(m.clockwise?360:-360)*t)*Math.PI/180;return {x:m.center.x+m.radiusX*Math.cos(a),y:m.center.y+m.radiusY*Math.sin(a)};}
 const u=1-t;return {x:u**3*m.from.x+3*u*u*t*m.control1.x+3*u*t*t*m.control2.x+t**3*m.to.x,y:u**3*m.from.y+3*u*u*t*m.control1.y+3*u*t*t*m.control2.y+t**3*m.to.y};
}
const tables=new WeakMap<MotionPath,{w:number;h:number;lengths:number[];total:number}>();
/** Sampled arc-length mapping makes linear motion approximately constant in stage pixels. */
function parameter(m:MotionPath,p:number,w:number,h:number){
 if(m.type==='line')return p;let table=tables.get(m);
 if(!table||table.w!==w||table.h!==h){const lengths=[0];let last=pathPoint(m,0);for(let j=1;j<=256;j++){const next=pathPoint(m,j/256);lengths.push(lengths[j-1]+Math.hypot((next.x-last.x)*w,(next.y-last.y)*h));last=next;}table={w,h,lengths,total:lengths[256]};tables.set(m,table);}
 if(table.total===0)return p;const target=p*table.total;let lo=0,hi=256;while(hi-lo>1){const mid=(lo+hi)>>1;if(table.lengths[mid]<target)lo=mid;else hi=mid;}const delta=table.lengths[hi]-table.lengths[lo];return (lo+(delta?(target-table.lengths[lo])/delta:0))/256;
}
export function motionPathState(m:MotionPath,time:number,w:number,h:number){
 const elapsed=Math.max(0,(time-m.start)/m.duration);let p:number,reverse=false;
 if(m.repeat==='loop')p=elapsed%1;
 else if(m.repeat==='ping-pong'){const phase=elapsed%2;reverse=phase>=1;p=reverse?2-phase:phase;}
 else p=m.after==='reset'&&elapsed>=1?0:Math.min(1,elapsed);
 if(m.easing==='ease-in-out')p=p*p*(3-2*p);const t=parameter(m,p,w,h),point=pathPoint(m,t);
 let dx:number,dy:number;
 if(m.type==='ellipse'){const a=(m.startAngle+(m.clockwise?360:-360)*t)*Math.PI/180,sign=m.clockwise?1:-1;dx=-m.radiusX*Math.sin(a)*sign;dy=m.radiusY*Math.cos(a)*sign;}
 else if(m.type==='line'){dx=m.to.x-m.from.x;dy=m.to.y-m.from.y;}
 else{const u=1-t;dx=3*u*u*(m.control1.x-m.from.x)+6*u*t*(m.control2.x-m.control1.x)+3*t*t*(m.to.x-m.control2.x);dy=3*u*u*(m.control1.y-m.from.y)+6*u*t*(m.control2.y-m.control1.y)+3*t*t*(m.to.y-m.control2.y);}
 const angle=Math.hypot(dx,dy)<1e-9?0:Math.atan2(dy*h*(reverse?-1:1),dx*w*(reverse?-1:1))*180/Math.PI;
 return {...point,angle:m.orient?angle:0};
}
