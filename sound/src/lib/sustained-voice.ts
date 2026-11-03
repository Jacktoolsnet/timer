import type {VoiceArticulation} from './performance';
import type {SustainedInstrument} from './phrasing';
export function sustainedProfile(id:SustainedInstrument){
 if(id==='flute')return {attack:.065,release:.22,glide:.055,vibrato:.0018,rate:5.5};
 if(id==='clarinet')return {attack:.045,release:.19,glide:.045,vibrato:.0008,rate:4.7};
 if(id==='trumpet')return {attack:.035,release:.16,glide:.035,vibrato:.0013,rate:5.8};
 if(id==='horn')return {attack:.12,release:.32,glide:.075,vibrato:.0007,rate:4.5};
 if(id==='cello')return {attack:.24,release:.58,glide:.11,vibrato:.0016,rate:4.6};
 if(id==='analoglead')return {attack:.018,release:.16,glide:.065,vibrato:.0008,rate:5};
 if(id==='shimmer')return {attack:.55,release:1.1,glide:.22,vibrato:.001,rate:.45};
 if(id==='saxophone')return {attack:.055,release:.24,glide:.065,vibrato:.0022,rate:5.3};
 if(id==='organ')return {attack:.018,release:.08,glide:.008,vibrato:0,rate:5};
 if(id==='pad')return {attack:.4,release:.8,glide:.18,vibrato:.0006,rate:.7};
 if(id==='strings')return {attack:.22,release:.55,glide:.1,vibrato:.0015,rate:5};
 if(id==='vocalpad')return {attack:.32,release:.5,glide:.14,vibrato:.0015,rate:5};
 if(id==='choir')return {attack:.16,release:.3,glide:.1,vibrato:.0015,rate:5};
 return {attack:.08,release:.3,glide:.1,vibrato:.0015,rate:5};
}
/** Deliberately distinct harmonic bodies; coefficients are relative to the fundamental. */
export function sustainedHarmonic(id:SustainedInstrument,h:number){
 if(id==='flute')return h===1?1:h===2?.16:h===3?.045:.008/h;
 if(id==='clarinet')return (h%2?1:.07)/Math.pow(h,1.15);
 if(id==='trumpet')return Math.exp(-h/7)/Math.pow(h,.5);
 if(id==='horn')return Math.exp(-h/2.5)/Math.pow(h,.8);
 if(id==='cello')return Math.pow(.68,h-1)/Math.sqrt(h);
 if(id==='analoglead')return 1/Math.pow(h,1.2);
 if(id==='shimmer')return ([1,.3,.12,.18,.035,.06,.02,.045][h-1]||0);
 return id==='organ'?([.2,1,0,.38,0,.22,0,.12][h-1]||0):id==='strings'?Math.pow(.55,h-1)/Math.sqrt(h):id==='saxophone'?1/Math.pow(h,.85):id==='pad'?Math.pow(.45,h-1):1/Math.pow(h,1.1);
}
const breathBuffers=new WeakMap<BaseAudioContext,AudioBuffer>();
export function createSustainedVoice(ctx:AudioContext,destination:AudioNode,id:SustainedInstrument,frequency:number,time:number,level:number,hold:number,vowel:number,onEnded:()=>void,articulation:VoiceArticulation={}){
 const gain=ctx.createGain(),vibrato=ctx.createOscillator(),depth=ctx.createGain();
 const strings=id==='strings'||id==='cello',synth=id==='pad'||id==='shimmer'||id==='analoglead',pad=id==='vocalpad'||id==='pad'||id==='shimmer',choir=id==='choir',wind=['saxophone','flute','clarinet','trumpet','horn'].includes(id),organ=id==='organ';
 const profile={...sustainedProfile(id),...articulation},{attack,release}=profile;
 const real=new Float32Array(25),imag=new Float32Array(25);
 for(let h=1;h<imag.length;h++)imag[h]=sustainedHarmonic(id,h);
 const wave=ctx.createPeriodicWave(real,imag);
 const oscillators=(strings||choir||pad?[.9985,1.0015]:[1]).map(detune=>{
  const osc=ctx.createOscillator();osc.setPeriodicWave(wave);
  osc.frequency.setValueAtTime(frequency*detune*2**((profile.scoop??0)/12),time);
  if(profile.scoop)osc.frequency.exponentialRampToValueAtTime(frequency*detune,time+.085);
  return {osc,detune};
 });
 const filters:BiquadFilterNode[]=[],routes:GainNode[]=[];
 const inlet=ctx.createGain();inlet.gain.value=1/oscillators.length;
 oscillators.forEach(({osc})=>osc.connect(inlet));
 if(strings||wind||organ||synth){
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=id==='flute'?5200:id==='horn'?1900:id==='trumpet'?5800:wind?3400:organ?5500:id==='analoglead'?4200:id==='shimmer'?3200:synth?1800:2600;filter.Q.value=.5;
  if(wind){
   const body=ctx.createBiquadFilter();body.type='peaking';body.frequency.value=id==='flute'?2100:id==='horn'?650:id==='clarinet'?1500:1100;body.Q.value=.8;body.gain.value=id==='flute'?1:3;
   inlet.connect(body);body.connect(filter);filters.push(body);
  }else inlet.connect(filter);
  if(id==='analoglead'){filter.Q.value=1.1;filter.frequency.setValueAtTime(900,time);filter.frequency.exponentialRampToValueAtTime(4200,time+.08);filter.frequency.exponentialRampToValueAtTime(1700,time+.4);}
  if(id==='shimmer'){filter.frequency.setValueAtTime(1600,time);filter.frequency.linearRampToValueAtTime(3200,time+.8);}
  filter.connect(gain);filters.push(filter);
 }else{
  for(let i=0;i<3;i++){
   const filter=ctx.createBiquadFilter(),route=ctx.createGain();
   filter.type='bandpass';filter.Q.value=[5,7,9][i];route.gain.value=[1,.7,.25][i];
   inlet.connect(filter);filter.connect(route);route.connect(gain);filters.push(filter);routes.push(route);
  }
 }
 let breath:AudioBufferSourceNode|undefined,air:GainNode|undefined,airFilter:BiquadFilterNode|undefined;
 if(wind){
  let buffer=breathBuffers.get(ctx);
  if(!buffer){
   buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
   const samples=buffer.getChannelData(0);let seed=173;
   for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;samples[i]=seed/2147483648;}
   breathBuffers.set(ctx,buffer);
  }
  breath=ctx.createBufferSource();breath.buffer=buffer;breath.loop=true;
  air=ctx.createGain();air.gain.value=id==='flute'?.035:id==='trumpet'||id==='horn'?.006:.018;
  airFilter=ctx.createBiquadFilter();airFilter.type='bandpass';airFilter.frequency.value=1700;airFilter.Q.value=.6;
  breath.connect(airFilter);airFilter.connect(air);air.connect(inlet);breath.start(time);
 }
 gain.connect(destination);
 vibrato.frequency.value=profile.rate;depth.gain.setValueAtTime(0,time);
 depth.gain.linearRampToValueAtTime(frequency*profile.vibrato,time+.6);
 vibrato.connect(depth);oscillators.forEach(({osc})=>depth.connect(osc.frequency));
 let until=time+hold,alive=true,last=time;
 function shapeVowel(at:number,position:number){
  if(strings||wind||organ||synth)return;
  const p=Math.max(0,Math.min(2,position)),index=Math.min(1,Math.floor(p)),mix=p-index;
  const vowels=[[800,1150,2800],[450,800,2830],[325,700,2530]];
  filters.forEach((filter,i)=>filter.frequency.setTargetAtTime(vowels[index][i]*(1-mix)+vowels[index+1][i]*mix,at,.16));
 }
 function stopAt(at:number){oscillators.forEach(({osc})=>osc.stop(at));vibrato.stop(at);breath?.stop(at);}
 function envelope(at:number,target:number,duration:number,first=false){
  const peak=Math.max(.0001,target);
  gain.gain.cancelAndHoldAtTime(at);
  const rise=articulation.detached?Math.min(attack,duration*.5):first?attack:.1;
  gain.gain.linearRampToValueAtTime(peak,at+rise);
  until=at+Math.max(duration,articulation.detached?rise+.003:attack+.05);
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
  alive=false;breath?.disconnect();air?.disconnect();airFilter?.disconnect();vibrato.disconnect();depth.disconnect();inlet.disconnect();gain.disconnect();
  filters.forEach(filter=>filter.disconnect());routes.forEach(route=>route.disconnect());onEnded();
 };});
 return {
  canContinue(at:number){return !articulation.detached&&alive&&at>=last&&at<=until+.035;},
  note(at:number,hz:number,target:number,duration:number,position:number){
   oscillators.forEach(({osc,detune})=>{
    osc.frequency.cancelAndHoldAtTime(at);
    osc.frequency.exponentialRampToValueAtTime(hz*detune,at+profile.glide);
   });
   depth.gain.cancelAndHoldAtTime(at);depth.gain.linearRampToValueAtTime(hz*profile.vibrato,at+.2);
   shapeVowel(at,position);envelope(at,target,duration);last=at;
  },
  release(at:number){
   if(!alive)return;
   const tail=Math.min(.12,release);
   gain.gain.cancelAndHoldAtTime(at);gain.gain.linearRampToValueAtTime(0,at+tail);
   stopAt(at+tail+.02);until=at;
  }
 };
}
