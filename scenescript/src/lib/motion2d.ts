import type {Actor2D,Stage2D} from './stage2d.ts';
export const clamp2D=(x:number)=>Math.min(1,Math.max(0,x));
export const ease2D=(x:number)=>{x=clamp2D(x);return x*x*(3-2*x);};
export const mix2D=(a:number,b:number,t:number)=>a+(b-a)*t;
const pulse=(x:number,a:number,b:number)=>Math.sin(clamp2D((x-a)/(b-a))*Math.PI);
/** Scene actions are evaluated from absolute time; instances never share mutable pose state. */
export function actorFrame2D(actor:Actor2D,time:number){
 let x=actor.x,y=actor.y,walk=0,phase=0,flight=0,pre=0,landing=0,wave=0,wavePhase=0,jumpOffset=0,opacity=actor.opacity,question=0;
 for(const a of [...actor.actions].sort((a,b)=>a.at-b.at)){
  const elapsed=time-a.at,q=elapsed/a.duration,p=ease2D(q);
  if((a.type==='walk'||a.type==='move'||a.type==='jump')&&elapsed>=0){
   if(a.type==='jump'){
    const u=q*3;pre=pulse(u,0,.7);flight=pulse(u,.7,2);landing=u>=2?Math.exp(-7*(u-2))*Math.sin(17*(u-2)):0;
    const travel=ease2D((u-.7)/1.3);x=mix2D(x,a.toX,travel);y=mix2D(y,a.toY,travel);jumpOffset=-flight*a.height+pre*12+landing*11;
   }else{const distance=Math.hypot(a.toX-x,a.toY-y);x=mix2D(x,a.toX,p);y=mix2D(y,a.toY,p);if(a.type==='walk'&&q<1){walk=1-ease2D((q-.82)/.18);phase=p*distance/70*Math.PI*2;}}
  }
  if(a.type==='wave'&&q>=0&&q<=1){wave=ease2D(q/.24)*(1-ease2D((q-.78)/.22));wavePhase=q*Math.min(2.3,a.duration)*14;question=ease2D(q/.1)*(1-ease2D((q-.15)/.2));}
  if(a.type==='float'&&elapsed>=0)y+=Math.sin(Math.min(elapsed,a.duration)*2)*a.height;
  if(a.type==='fade'&&elapsed>=0)opacity*=1-p;
 }
 const groundY=y; y+=jumpOffset-Math.abs(Math.sin(phase))*5*walk;
 return {x,y,groundY,walk,phase,flight,pre,landing,wave,wavePhase,question,opacity,stretch:flight*.13-pre*.16-landing*.1};
}
export function cameraFrame2D(keys:Stage2D['camera'],time:number){
 if(!keys.length)return {x:0,y:0,zoom:1};let a=keys[0];if(time<=a.at)return a;
 for(const b of keys.slice(1)){if(time<=b.at){const q=ease2D((time-a.at)/(b.at-a.at));return {x:mix2D(a.x,b.x,q),y:mix2D(a.y,b.y,q),zoom:mix2D(a.zoom,b.zoom,q)};}a=b;}return a;
}
