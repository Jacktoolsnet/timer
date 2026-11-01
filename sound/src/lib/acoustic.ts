export type AcousticInstrument='piano'|'guitar'|'bass'|'strings'|'marimba'|'kalimba'|'saxophone'|'harp'|'doublebass'|'epiano';
export const acousticInstruments:readonly string[]=['piano','guitar','bass','strings','marimba','kalimba','saxophone','harp','doublebass','epiano'];
/** Local physical/modal synthesis, not recordings. Fixed excitation makes caching safe. */
export function acousticWave(id:AcousticInstrument,frequency:number,sampleRate:number,brightness:number,maximumSeconds?:number):Float32Array{
 const naturalSeconds=id==='strings'?2.2:id==='harp'?2.4:id==='piano'?2.2:id==='epiano'?2.6:id==='kalimba'?1.5:id==='guitar'?1.4:id==='saxophone'?1.2: .9;
 const seconds=Math.min(naturalSeconds,maximumSeconds??naturalSeconds);
 const data=new Float32Array(Math.ceil(sampleRate*seconds));
 const bright=Math.max(0,Math.min(1,brightness));
 if(['guitar','bass','harp','doublebass'].includes(id)){
  // Fractional-delay Karplus–Strong string; compensate the averaging filter's half sample.
  const delay=Math.max(2,sampleRate/frequency-.5),size=Math.ceil(delay)+2;
  const ring=new Float32Array(size);
  let seed=517,previous=0;
  for(let i=0;i<data.length;i++){
   const read=i-delay,base=Math.floor(read),fraction=read-base;
   const at=(n:number)=>ring[((n%size)+size)%size];
   let value:number;
   if(i<Math.ceil(delay)){
    seed=(Math.imul(seed,1664525)+1013904223)|0;
    value=seed/2147483648;
    // A softer finger excitation avoids the bright synthetic "ping".
    value=value*.55+previous*.45;
   }else value=(at(base)*(1-fraction)+at(base+1)*fraction)*(id==='harp'?.997+bright*.002:id==='doublebass'?.98+bright*.012:.985+bright*.012);
   const filtered=(value+previous)*.5;previous=value;
   ring[i%size]=filtered;
   const t=i/sampleRate;
   data[i]=filtered*(1-Math.exp(-t/ .002))*Math.exp(-t/(id==='bass'?.45:id==='doublebass'?.38:id==='harp'?1.6:.7));
  }
 }else{
  const ratios=id==='saxophone'?[1,2,3,4,5,6,7,8]:id==='epiano'?[1,2,3,7]:id==='marimba'?[1,4,9.9]:id==='kalimba'?[1,2,2.98,5.1]:[1,2,3,4,5,6];
  const strings=id==='strings',wind=id==='saxophone';
  const modes=ratios.filter(ratio=>ratio*frequency<sampleRate*.45).map((ratio,h)=>{
   const stretch=id==='piano'?Math.sqrt(1+.00012*ratio*ratio):1;
   const angle=2*Math.PI*frequency*ratio*stretch/sampleRate;
   return {s:0,c:1,sin:Math.sin(angle),cos:Math.cos(angle),angle,
    amplitude:h===0?1:wind?Math.pow(.7+bright*.1,h)*(h===2?1.15:1):id==='epiano'?[1,.24,.12,.035+bright*.04][h]:Math.pow(strings?.36+bright*.16:.45+bright*.22,h)/(strings?Math.sqrt(ratio):1),
    decay:strings||wind?1:Math.exp(-1/(sampleRate*(id==='marimba'?[.32,.045,.022][h]:id==='kalimba'?[.6,.18,.085,.04][h]:id==='epiano'?[1.1,.5,.28,.12][h]:(.85*Math.pow(220/frequency,.22))/(1+h*.8))))};
  });
  let attack=0;
  const attackStep=1-Math.exp(-1/(sampleRate*(strings?.22:wind?.045:id==='epiano'?.007:.003)));
  for(let i=0;i<data.length;i++){
   const t=i/sampleRate;
   attack+=(1-attack)*attackStep;
   const vibrato=strings||wind?(strings?.0012:.002)*Math.sin(2*Math.PI*5.1*t)*Math.max(0,Math.min(1,(t-.15)/.5)):0;
   let value=0;
   for(const mode of modes){
    value+=mode.s*mode.amplitude;
    // Rotate a harmonic oscillator; tiny FM creates delayed, restrained bow vibrato.
    const delta=mode.angle*vibrato,cos=mode.cos-mode.sin*delta,sin=mode.sin+mode.cos*delta;
    const next=mode.s*cos+mode.c*sin;
    mode.c=mode.c*cos-mode.s*sin;mode.s=next;mode.amplitude*=mode.decay;
    if((strings||wind)&&i%256===0){const norm=Math.hypot(mode.s,mode.c);mode.s/=norm;mode.c/=norm;}
   }
   const release=strings?.65:wind?.18:0;
   // Deterministic breath noise, tapered with the reed rather than an exposed hiss.
   const breath=wind?.012*Math.sin(i*1.731)*Math.sin(i*.827):0;
   const tail=release?Math.min(1,(seconds-t)/release):1;
   data[i]=(value+breath)*attack*(strings?tail*tail*(3-2*tail):tail);
  }
 }
 // Fixed peak ceiling, smooth final release, no discontinuity at buffer end.
 let peak=0;for(const value of data)peak=Math.max(peak,Math.abs(value));
 const gain=peak>0?.7/peak:0;
 const tail=id==='piano'||id==='epiano'?.12:id==='kalimba'?.07:.025;
 for(let i=0;i<data.length;i++)data[i]*=gain*Math.min(1,(data.length-1-i)/(sampleRate*tail));
 return data;
}
