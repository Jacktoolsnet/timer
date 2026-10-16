/** Reproducible fragment motion: no random clock, identical while scrubbing/exporting. */
export const particleExits=['particles-dust','particles-sparks','particles-confetti'] as const;
export type ParticleExit=typeof particleExits[number];
export function isParticleExit(value:string):value is ParticleExit{return (particleExits as readonly string[]).includes(value);}
export function particleProgress(at:number,until:number|null,duration:number,exitDuration:number,time:number){
 const end=until??duration,length=Math.min(exitDuration,Math.max(0,end-at));
 return length>0?Math.max(0,Math.min(1,(time-end+length)/length)):time>=end?1:0;
}
export function fragmentState(id:string,index:number,kind:ParticleExit,progress:number,width:number,height:number){
 let seed=2166136261;for(const c of id+':'+index)seed=Math.imul(seed^c.charCodeAt(0),16777619);
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const angle=random()*Math.PI*2,speed=.3+random()*.7,spin=(random()-.5)*720,delay=random()*.22;
 const p=Math.max(0,Math.min(1,(progress-delay)/(1-delay))),reach=Math.max(60,Math.min(600,Math.max(width,height)*.6));
 const x=Math.cos(angle)*reach*speed*p+(kind==='particles-dust'?reach*p*.5:0);
 const y=kind==='particles-confetti'?(-reach*speed*p+reach*1.8*p*p):Math.sin(angle)*reach*speed*p-(kind==='particles-sparks'?reach*p*.5:0);
 return {x,y,rotation:kind==='particles-dust'?spin*p*.2:spin*p,scale:kind==='particles-dust'?1-p:1-p*.4,opacity:1-p};
}
