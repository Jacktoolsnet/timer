import type {InstrumentId} from './instruments';
import {voiceRecipe} from './voice-recipes';
import {rhythmInstruments,type RhythmLane} from './tap-rhythm';
// Pad-only voicing: leave style-specific orbit instruments and the already clear snare alone.
export function tapDrumRecipe(lane:0|1|2){return tapInstrumentRecipe(rhythmInstruments[lane]);}
export function tapInstrumentRecipe(id:InstrumentId){
 const recipe=voiceRecipe(id,false,1),gain=id==='hat'?1.8:id==='kick'?1.35:1;
 return {
  tones:recipe.tones.map(tone=>({...tone,level:tone.level*gain})),
  noise:recipe.noise.map(burst=>({...burst,level:burst.level*gain,...(id==='hat'?{frequency:5000,duration:.09}:{})}))
 };
}
/** Reuse our drum recipes on the shared master, independent of random track/timbre changes. */
export function createRhythmPlayer(ctx:BaseAudioContext,output:AudioNode){
 const laneMix=Array.from({length:9},()=>{const gain=ctx.createGain();gain.connect(output);return gain;});
 const active=new Map<AudioScheduledSourceNode,{lane:RhythmLane;time:number}>();
 const noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),data=noise.getChannelData(0);
 for(let n=0;n<data.length;n++)data[n]=Math.random()*2-1;
 function envelope(at:number,duration:number,attack:number,level:number,volume:number){
  const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level*.7*volume/.55),at+attack);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);return gain;
 }
 function connect(source:AudioScheduledSourceNode,gain:GainNode,at:number,duration:number,lane:RhythmLane,filter?:BiquadFilterNode){
  active.set(source,{lane,time:at});source.connect(filter||gain);if(filter)filter.connect(gain);gain.connect(laneMix[lane]);
  source.onended=()=>{active.delete(source);source.disconnect();gain.disconnect();filter?.disconnect();};
  source.start(at);source.stop(at+duration+.02);
 }
 return {
  setLaneLevel(lane:RhythmLane,level:number){laneMix[lane].gain.setTargetAtTime(level,ctx.currentTime,.08);},
  hit(lane:RhythmLane,time:number,id:InstrumentId=rhythmInstruments[lane%3],volume=.55){
   if(active.size>96)return 0;
   const at=Math.max(ctx.currentTime,time),recipe=tapInstrumentRecipe(id);
   for(const tone of recipe.tones){
    const osc=ctx.createOscillator();osc.type=tone.type||'sine';osc.frequency.setValueAtTime(tone.hz!,at);
    if(tone.endHz)osc.frequency.exponentialRampToValueAtTime(tone.endHz,at+Math.min(tone.duration,tone.glide??.18));
    connect(osc,envelope(at,tone.duration,tone.attack??.004,tone.level,volume),at,tone.duration,lane);
   }
   for(const burst of recipe.noise){
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=noise;
    filter.type=burst.type||'highpass';filter.frequency.value=burst.frequency;filter.Q.value=.7;
    const start=at+(burst.offset||0);
    connect(source,envelope(start,burst.duration,burst.attack??.001,burst.level,volume),start,burst.duration,lane,filter);
   }
   return Math.max(0,...recipe.tones.map(tone=>tone.duration),...recipe.noise.map(burst=>(burst.offset||0)+burst.duration));
  },
  cancelLane(lane:RhythmLane,after:number){
   for(const [source,event] of active)if(event.lane===lane&&event.time>=after){
    try{source.stop();}catch{/* Already ended. */}active.delete(source);
   }
  },
  stop(){for(const source of active.keys()){try{source.stop();}catch{/* Already ended. */}}active.clear();}
 };
}
