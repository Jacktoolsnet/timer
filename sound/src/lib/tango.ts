import {acousticWave,type AcousticInstrument} from './acoustic';
import {waltzVoicing,type WaltzPulse} from './waltz';
/** Ballroom pulse: regular marcato bass, with a dotted 3–1–2–2 chord figure.
 * Four-quarter notation, not a universal recipe for all Argentine tango styles. */
export const tangoBassSteps=[0,4,8,12];
export const tangoChordSteps=[0,6,8,12];
export function tangoPulseRole(dance:string|null,index:number,id:string):WaltzPulse|null{
 if(dance!=='tango'||index>=4)return null;
 if(['bass','doublebass'].includes(id))return 'bass';
 return ['piano','epiano','guitar','harp'].includes(id)?'chord':null;
}
export function tangoPulseDuration(role:WaltzPulse,bpm:number,step:number){
 const beats=role==='bass'?.42:step===6?.22:.4;
 return Math.min(role==='bass'?.23:.22,60/bpm*beats);
}
export function tangoPulseWave(id:AcousticInstrument,role:WaltzPulse,root:number,third:number,transpose:number,bpm:number,step:number,sampleRate:number,brightness:number){
 const seconds=tangoPulseDuration(role,bpm,step),length=Math.ceil(seconds*sampleRate),data=new Float32Array(length);
 // Root/fifth bass reinforces the march instead of wandering with the lead motif.
 const bassRoot=role==='bass'&&[4,12].includes(step)?root+7:root;
 for(const {frequency,weight} of waltzVoicing(role,bassRoot,third,transpose,id)){
  const wave=acousticWave(id,frequency,sampleRate,Math.min(1,brightness+.12),seconds);
  for(let i=0;i<length;i++)data[i]+=(wave[i]||0)*weight;
 }
 const release=Math.min(.025,seconds*.2);
 for(let i=0;i<length;i++){
  const t=i/sampleRate;
  data[i]*=Math.min(1,t/.0025,Math.max(0,(seconds-t)/release));
 }
 return data;
}
/** Make room for the attack, without increasing master gain or erasing the melody. */
export function dancePulseClarity(dance:string|null,index:number,step:number){
 if(index<4)return 1;
 if(dance==='viennese')return step%4===0?.65:step%4===1?.85:1;
 if(dance==='tango')return [0,4,6,8,12].includes(step)?.68:[1,5,7,9,13].includes(step)?.85:1;
 return 1;
}
