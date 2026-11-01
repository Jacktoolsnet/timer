import {acousticWave,type AcousticInstrument} from './acoustic';
export type WaltzPulse='bass'|'chord';
/** Only sparse accompaniment, never the user's melody or sustained string lines. */
export function waltzPulseRole(beats:number,id:string,points:readonly boolean[]):WaltzPulse|null{
 if(beats!==3)return null;
 const active=points.slice(0,12).flatMap((on,s)=>on?[s]:[]);
 if(!active.length)return null;
 if(['bass','doublebass'].includes(id)&&active.every(s=>s===0))return 'bass';
 if(['piano','epiano','guitar','harp'].includes(id)&&active.every(s=>s===4||s===8))return 'chord';
 return null;
}
export function waltzVoicing(role:WaltzPulse,root:number,third:number,transpose:number,id:AcousticInstrument){
 // Bass root + a quiet octave remains audible on small speakers. The two chord
 // strokes use a fixed close-position triad, not the wandering lead-note motif.
 const folded=((root%12)+12)%12,register=folded>7?folded-12:folded;
 const base=role==='bass'?65.4065:id==='guitar'?130.813:261.626;
 return (role==='bass'?[{note:folded,weight:.9},{note:folded+12,weight:.35}]
  :[0,third,7].map(note=>({note:register+note,weight:.6})))
  .map(({note,weight})=>({frequency:base*2**((note+transpose)/12),weight}));
}
export function waltzPulseDuration(role:WaltzPulse,bpm:number,crisp=false){
 const beat=60/bpm;
 return role==='bass'?Math.min(.42,beat*(crisp?.44:.52)):Math.min(.24,beat*(crisp?.27:.34));
}
/** Dry, articulated UM–pah–pah. Silence between beats is intentional. */
export function waltzPulseWave(id:AcousticInstrument,role:WaltzPulse,root:number,third:number,transpose:number,bpm:number,sampleRate:number,brightness:number,crisp=false){
 const seconds=waltzPulseDuration(role,bpm,crisp),length=Math.ceil(seconds*sampleRate),data=new Float32Array(length);
 for(const {frequency,weight} of waltzVoicing(role,root,third,transpose,id)){
  const wave=acousticWave(id,frequency,sampleRate,brightness,seconds);
  for(let i=0;i<length;i++)data[i]+=(wave[i]||0)*weight;
 }
 const release=Math.min(.04,seconds*.25);
 for(let i=0;i<length;i++){
  const t=i/sampleRate;
  data[i]*=Math.min(1,t/(crisp?.0025:.004),Math.max(0,(seconds-t)/release));
 }
 return data;
}
