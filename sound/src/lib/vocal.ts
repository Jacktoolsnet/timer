export const vocalInstruments=['voice','choir','vocalpad'] as const;
export type VocalInstrument=typeof vocalInstruments[number];
/** Keep generated registers in a useful singing range, before manual transposition. */
export function vocalFundamental(note:number){
 let frequency=note/2;
 while(frequency>440)frequency/=2;
 while(frequency<110)frequency*=2;
 return frequency;
}
const vowels=[[800,1150,2800],[450,800,2830],[325,700,2530]];
/** A slow Ah–Oh–Uh trajectory, independent of randomness at individual note attacks. */
export function vowelPosition(bar:number,seed:number){return Math.round((1-Math.cos(bar*Math.PI/16+seed))*8)/8;}
/** Harmonic glottal source shaped by vowel resonances, not speech or voice recordings. */
export function vocalWave(id:VocalInstrument,frequency:number,sampleRate:number,vowel:number):Float32Array{
 const position=Math.max(0,Math.min(2,vowel)),index=Math.min(1,Math.floor(position)),mix=position-index;
 const formants=vowels[index].map((f,i)=>f*(1-mix)+vowels[index+1][i]*mix);
 const seconds=id==='voice'?1.25:id==='choir'?1.85:2.3;
 const attack=id==='voice'?.055:id==='choir'?.16:.32,release=id==='voice'?.2:.4;
 const data=new Float32Array(Math.ceil(seconds*sampleRate));
 const detunes=id==='voice'?[1]:[.997,1.003];
 const modes=detunes.flatMap(detune=>Array.from({length:Math.min(24,Math.floor(sampleRate*.43/frequency))},(_,i)=>{
  const harmonic=i+1,hz=frequency*harmonic*detune,angle=2*Math.PI*hz/sampleRate;
  const resonance=(opening:number)=>formants.reduce((sum,formant,j)=>sum+Math.exp(-.5*((hz-formant*opening)/[110,150,230][j])**2)*[1,.9,.45][j],0);
  const scale=1/Math.pow(harmonic,.85)/detunes.length;
  return {s:0,c:1,angle,sin:Math.sin(angle),cos:Math.cos(angle),weight:(.06+resonance(1))*scale,closed:(.06+resonance(.82))*scale};
 }));
 let onset=0,noise=719;
 const rise=1-Math.exp(-1/(sampleRate*attack));
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate;onset+=(1-onset)*rise;
  const vibrato=.0022*Math.sin(2*Math.PI*5*t)*Math.max(0,Math.min(1,(t-.12)/.35));
  const opening=id==='voice'?Math.min(1,t/.18):1;
  const mouth=opening*opening*(3-2*opening);
  let value=0;
  for(const m of modes){
   value+=m.s*(m.closed+(m.weight-m.closed)*mouth);
   const delta=m.angle*vibrato,c=m.cos-m.sin*delta,s=m.sin+m.cos*delta;
   const next=m.s*c+m.c*s;m.c=m.c*c-m.s*s;m.s=next;
   if(i%256===0){const norm=Math.hypot(m.s,m.c);m.s/=norm;m.c/=norm;}
  }
  noise=(Math.imul(noise,1664525)+1013904223)|0;
  data[i]=(value+noise/2147483648*(id==='voice'?.008:.004))*onset*Math.min(1,(seconds-t)/release);
 }
 let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));
 const scale=peak? .65/peak:0;
 for(let i=0;i<data.length;i++)data[i]*=scale*Math.min(1,i/(sampleRate*.004),(data.length-1-i)/(sampleRate*.02));
 return data;
}
