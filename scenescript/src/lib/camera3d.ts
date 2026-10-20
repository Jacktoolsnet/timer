import {add,sub,mul,norm,cross,dot,vec,localVector3D,record3D,fields3D,numeric3D,vector3DInput,type V3,type Frame3D} from './path3d.ts';
export type CameraFollow3D={actor:string;mode:'chase'|'onboard'|'track';offset:V3;target:V3};
export type CameraKey3D={at:number;position:V3;target:V3;roll:number};
export type CameraRig3D={follow?:CameraFollow3D|null;keys?:CameraKey3D[]};
export const defaultCameraFollow3D=():CameraFollow3D=>({actor:'actor',mode:'chase',offset:vec(0,3,-7),target:vec(0,1,2)});
export function parseCameraRig3D(v:Record<string,unknown>,duration:number,p:string):Required<CameraRig3D>{
 let follow:CameraFollow3D|null=null;
 if(v.follow!==undefined&&v.follow!==null){const path=p+'.follow',r=record3D(v.follow,path);fields3D(r,['actor','mode','offset','target'],path);if(typeof r.actor!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(r.actor))throw new Error(path+'.actor: expected actor ID');const mode=r.mode===undefined?'chase':r.mode;if(!['chase','onboard','track'].includes(mode as string))throw new Error(path+'.mode: chase, onboard, track');
  follow={actor:r.actor,mode:mode as CameraFollow3D['mode'],offset:vector3DInput(r.offset,path+'.offset',mode==='onboard'?vec(0,1.6,.6):mode==='track'?vec(8,4,8):vec(0,3,-7)),target:vector3DInput(r.target,path+'.target',mode==='onboard'?vec(0,1.6,8):vec(0,1,2))};
  if(mode!=='track'&&Math.hypot(...Object.values(sub(follow.offset,follow.target)))<1e-5)throw new Error(path+': offset and target must differ');
 }
 const raw=v.keys===undefined?[]:v.keys;if(!Array.isArray(raw)||raw.length>64)throw new Error(p+'.keys: maximum 64');let previous=-1;
 const keys=raw.map((item,i)=>{const path=p+'.keys['+i+']',r=record3D(item,path);fields3D(r,['at','position','target','roll'],path);const at=numeric3D(r.at,path+'.at',0,duration);if(i===0&&at!==0||at<=previous)throw new Error(path+'.at: first key at 0, then strictly increasing');previous=at;if(r.position===undefined||r.target===undefined)throw new Error(path+': position and target required');const position=vector3DInput(r.position,path+'.position'),target=vector3DInput(r.target,path+'.target'),roll=numeric3D(r.roll===undefined?0:r.roll,path+'.roll',-3600,3600);if(Math.hypot(...Object.values(sub(position,target)))<1e-5)throw new Error(path+': position and target must differ');return {at,position,target,roll};});
 if(follow&&keys.length)throw new Error(p+': choose follow or keys, not both');return {follow,keys};
}
export type CameraPose3D={position:V3;target:V3;up:V3};
/** Pure scene-local camera, shared by timeline, stills and video; never integrates state. */
export function cameraPose3D(c:{yaw:number;pitch:number;distance:number;targetX:number;targetY:number;targetZ:number;orbit:number}&CameraRig3D,time:number,actorFrame:(id:string)=>Frame3D):CameraPose3D{
 if(c.follow){const f=c.follow,frame=actorFrame(f.actor);return {position:f.mode==='track'?f.offset:add(frame.position,localVector3D(frame,f.offset)),target:add(frame.position,localVector3D(frame,f.target)),up:f.mode==='track'?vec(0,1,0):frame.up};}
 if(c.keys?.length){let a=c.keys[0],b=a;for(const k of c.keys){if(k.at>time){b=k;break;}a=b=k;}const t=b.at>a.at?Math.max(0,Math.min(1,(time-a.at)/(b.at-a.at))):0,lerp=(a:V3,b:V3)=>add(mul(a,1-t),mul(b,t)),position=lerp(a.position,b.position),target=lerp(a.target,b.target),roll=(a.roll+(b.roll-a.roll)*t)*Math.PI/180,forward=norm(sub(target,position));
  const reference=Math.abs(dot(forward,vec(0,1,0)))>.999?vec(0,0,1):vec(0,1,0),right=norm(cross(forward,reference)),up=norm(cross(right,forward));return {position,target:Math.hypot(...Object.values(sub(target,position)))>1e-7?target:add(position,vec(0,0,1)),up:add(mul(up,Math.cos(roll)),mul(right,Math.sin(roll)))};
 }
 const yaw=(c.yaw+c.orbit*time)*Math.PI/180,pitch=c.pitch*Math.PI/180,target=vec(c.targetX,c.targetY,c.targetZ);return {position:add(target,vec(Math.sin(yaw)*Math.cos(pitch)*c.distance,Math.sin(pitch)*c.distance,Math.cos(yaw)*Math.cos(pitch)*c.distance)),target,up:vec(0,1,0)};
}
