import type {SustainedInstrument} from './phrasing';
export function createSustainedVoice(ctx:AudioContext,destination:AudioNode,id:SustainedInstrument,frequency:number,time:number,level:number,hold:number,vowel:number,onEnded:()=>void){
 const gain=ctx.createGain(),vibrato=ctx.createOscillator(),depth=ctx.createGain();
 const strings=id==='strings',pad=id==='vocalpad',choir=id==='choir';
 const attack=strings?.22:pad?.32:choir?.16:.08,release=strings?.55:pad?.5:.3;
 const real=new Float32Array(25),imag=new Float32Array(25);
 for(let h=1;h<imag.length;h++)imag[h]=strings?Math.pow(.55,h-1)/Math.sqrt(h):1/Math.pow(h,1.1);
 const wave=ctx.createPeriodicWave(real,imag);
 const oscillators=(strings||choir||pad?[.9985,1.0015]:[1]).map(detune=>{
  const osc=ctx.createOscillator();osc.setPeriodicWave(wave);
  osc.frequency.setValueAtTime(frequency*detune,time);
  return {osc,detune};
 });
 const filters:BiquadFilterNode[]=[],routes:GainNode[]=[];
 const inlet=ctx.createGain();inlet.gain.value=1/oscillators.length;
 oscillators.forEach(({osc})=>osc.connect(inlet));
 if(strings){
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2600;filter.Q.value=.5;
  inlet.connect(filter);filter.connect(gain);filters.push(filter);
 }else{
  for(let i=0;i<3;i++){
   const filter=ctx.createBiquadFilter(),route=ctx.createGain();
   filter.type='bandpass';filter.Q.value=[5,7,9][i];route.gain.value=[1,.7,.25][i];
   inlet.connect(filter);filter.connect(route);route.connect(gain);filters.push(filter);routes.push(route);
  }
 }
 gain.connect(destination);
 vibrato.frequency.value=5;depth.gain.setValueAtTime(0,time);
 depth.gain.linearRampToValueAtTime(frequency*.0015,time+.6);
 vibrato.connect(depth);oscillators.forEach(({osc})=>depth.connect(osc.frequency));
 let until=time+hold,alive=true,last=time;
 function shapeVowel(at:number,position:number){
  if(strings)return;
  const p=Math.max(0,Math.min(2,position)),index=Math.min(1,Math.floor(p)),mix=p-index;
  const vowels=[[800,1150,2800],[450,800,2830],[325,700,2530]];
  filters.forEach((filter,i)=>filter.frequency.setTargetAtTime(vowels[index][i]*(1-mix)+vowels[index+1][i]*mix,at,.16));
 }
 function stopAt(at:number){oscillators.forEach(({osc})=>osc.stop(at));vibrato.stop(at);}
 function envelope(at:number,target:number,duration:number,first=false){
  const peak=Math.max(.0001,target);
  gain.gain.cancelAndHoldAtTime(at);
  gain.gain.linearRampToValueAtTime(peak,at+(first?attack:.1));
  until=at+Math.max(duration,attack+.05);
  gain.gain.setValueAtTime(peak,until);
  gain.gain.linearRampToValueAtTime(0,until+release);
  stopAt(until+release+.02);
 }
 gain.gain.setValueAtTime(0,time);shapeVowel(time,vowel);
 oscillators.forEach(({osc})=>osc.start(time));vibrato.start(time);
 envelope(time,level,hold,true);
 let remaining=oscillators.length;
 oscillators.forEach(({osc})=>{osc.onended=()=>{
  osc.disconnect();
  if(--remaining)return;
  alive=false;vibrato.disconnect();depth.disconnect();inlet.disconnect();gain.disconnect();
  filters.forEach(filter=>filter.disconnect());routes.forEach(route=>route.disconnect());onEnded();
 };});
 return {
  canContinue(at:number){return alive&&at>=last&&at<=until+.035;},
  note(at:number,hz:number,target:number,duration:number,position:number){
   oscillators.forEach(({osc,detune})=>{
    osc.frequency.cancelAndHoldAtTime(at);
    osc.frequency.exponentialRampToValueAtTime(hz*detune,at+.1);
   });
   depth.gain.cancelAndHoldAtTime(at);depth.gain.linearRampToValueAtTime(hz*.0015,at+.2);
   shapeVowel(at,position);envelope(at,target,duration);last=at;
  },
  release(at:number){
   if(!alive)return;
   gain.gain.cancelAndHoldAtTime(at);gain.gain.linearRampToValueAtTime(0,at+.12);
   stopAt(at+.14);until=at;
  }
 };
}
