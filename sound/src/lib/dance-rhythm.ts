import {acousticWave,type AcousticInstrument} from './acoustic';
import {waltzVoicing,type WaltzPulse} from './waltz';
import type {VoiceRecipe} from './voice-recipes';
export const rhythmDances=['slowfox','quickstep','samba','chacha','rumba','pasodoble','jive','discofox'] as const;
export type RhythmDance=typeof rhythmDances[number];
export type PulseInstrument=AcousticInstrument|'synthbass';
export function isRhythmDance(dance:string|null):dance is RhythmDance{return (rhythmDances as readonly unknown[]).includes(dance);}
/** Only the four protected accompaniment tracks, never a lead chosen by drawing. */
export function danceRhythmRole(dance:string|null,index:number,id:string):WaltzPulse|null{
 if(!isRhythmDance(dance)||index>=4)return null;
 if(['bass','doublebass','synthbass'].includes(id))return 'bass';
 return ['piano','epiano','guitar','harp'].includes(id)?'chord':null;
}
export function rhythmDuration(dance:RhythmDance,role:WaltzPulse,bpm:number,step:number){
 const bass=role==='bass',beat=60/bpm;
 const beats=dance==='slowfox'?(bass?.82:.48)
  :dance==='quickstep'?(bass?.52:.3)
  :dance==='samba'?([3,7].includes(step)?.2:bass?.36:.3)
  :dance==='chacha'?(bass?.46:.3)
  :dance==='rumba'?(bass?.56:step===12?1.25:.42)
  :dance==='pasodoble'?(bass?.5:.36)
  :dance==='jive'?(bass?.48:.28)
  :bass?.64:.3;
 return Math.min(dance==='rumba'?.9:dance==='slowfox'?.48:.34,beat*beats);
}
export function rhythmBassDegree(dance:RhythmDance,step:number,third:number){
 const quarter=Math.floor(step/4)%4;
 if(['slowfox','quickstep','jive'].includes(dance))return [0,third,7,third===3?8:9][quarter];
 if(dance==='discofox')return quarter%2?12:0;
 if(dance==='samba')return [3,7].includes(step)?7:0;
 if(dance==='chacha')return [6,14].includes(step)?7:0;
 if(dance==='rumba')return step===12?7:0;
 return quarter%2?7:0;
}
export function danceRhythmWave(dance:RhythmDance,id:PulseInstrument,role:WaltzPulse,root:number,third:number,transpose:number,bpm:number,step:number,sampleRate:number,brightness:number){
 const seconds=rhythmDuration(dance,role,bpm,step),length=Math.ceil(seconds*sampleRate),data=new Float32Array(length);
 const shift=role==='bass'?rhythmBassDegree(dance,step,third):0;
 const voices=waltzVoicing(role,root,third,transpose+shift,id==='synthbass'?'bass':id);
 for(const {frequency,weight} of voices){
  if(id==='synthbass'){
   // A restrained electronic octave bass; unlike the lead synth, no random register hops.
   for(let i=0;i<length;i++){
    const t=i/sampleRate,phase=2*Math.PI*frequency*t;
    data[i]+=(Math.sin(phase)+.18*Math.sin(phase*2)+.09*Math.sin(phase*3))*.55*weight*Math.exp(-t/.4);
   }
  }else{
   const wave=acousticWave(id,frequency,sampleRate,brightness,seconds);
   for(let i=0;i<length;i++)data[i]+=(wave[i]||0)*weight;
  }
 }
 const attack=dance==='slowfox'||dance==='rumba'?.006:.003,release=Math.min(.045,seconds*.22);
 for(let i=0;i<length;i++){
  const t=i/sampleRate;data[i]*=Math.min(1,t/attack,Math.max(0,(length-1-i)/(sampleRate*release)));
 }
 return data;
}
/** Track-specific emphasis is more useful than accenting every instrument alike. */
export function rhythmAccent(dance:string|null,index:number|undefined,id:string,step:number,base:number){
 if(!isRhythmDance(dance)||index===undefined||index>=4)return base;
 const bass=['bass','doublebass','synthbass'].includes(id),chord=['piano','epiano','guitar','harp'].includes(id);
 if(dance==='slowfox')return bass?(step===0?.96:.86):id==='rim'?.9:chord?.82:.58;
 if(dance==='quickstep')return bass?.96:id==='snare'?1:chord?.88:.8;
 if(dance==='samba')return id==='kick'?(step===4?1:.8):id==='shaker'?([3,7].includes(step)?.94:step%4===2?.45:.65):bass?(step===4?1:[3,7].includes(step)?.76:.9):[3,6].includes(step)?.95:.72;
 if(dance==='chacha')return chord?([0,12,14].includes(step)?1:.88):bass?.92:id==='shaker'?(step%4===2?.72:.55):.82;
 if(dance==='rumba')return chord?(step===4?1:step===8?.94:step===12?.88:.5):bass?.94:id==='shaker'?.48:step===0?.5:.75;
 if(dance==='pasodoble')return id==='snare'?(step===4?.92:step%4===2?.46:.62):step===0?1:step===4?.92:.72;
 if(dance==='jive')return id==='snare'?([4,12].includes(step)?1:.5):chord?([6,14].includes(step)?1:.86):bass?.95:.9;
 return id==='kick'||id==='clap'?1:chord?.9:.96;
}
/** Shorten percussion tails to the dance tempo; preserve each instrument's recipe. */
export function rhythmDrums(dance:string|null,index:number,id:string,bpm:number,recipe:VoiceRecipe):VoiceRecipe{
 if(!isRhythmDance(dance)||index>=4||!['kick','snare','clap','rim','hat','shaker'].includes(id))return recipe;
 const beat=60/bpm,fraction=id==='kick'?.6: id==='snare'?(dance==='quickstep'?.24:.32):.35;
 const cap=Math.min(.32,beat*fraction);
 return {tones:recipe.tones.map(t=>({...t,duration:Math.min(t.duration,cap)})),noise:recipe.noise.map(n=>({...n,duration:Math.min(n.duration,cap)}))};
}
export function rhythmClarity(dance:string|null,index:number,step:number){
 if(!isRhythmDance(dance)||index<4)return 1;
 const anchors=dance==='samba'?[0,3,4,7]:dance==='chacha'?[0,4,8,12,14]:dance==='rumba'?[4,8,12]:dance==='jive'?[0,4,6,8,12,14]:dance==='discofox'?[0,2,4,6,8,10,12,14]:[0,4,8,12];
 return anchors.includes(step)?(dance==='slowfox'?.82:dance==='rumba'?.8:.72):anchors.includes(step-1)?.9:1;
}
