import {natureSound,type NatureLayer,type NatureEvent} from './nature';
import {instrumentTone,type Instrument} from './instruments';
import {naturalWind,windStrengthAt,type WindGust} from './wind';
import {summerRain,type RainDrop} from './rain';
import {randomGap,randomNote,randomGust,selectedInstrument,fadeWindow,type Settings,type Layer,type NoiseType} from './relax';
export type NoteEvent={index:number;instrument:Instrument;duration:number};
export class Soundscape {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private instruments:GainNode|null=null;
 private sources=new Set<AudioScheduledSourceNode>();
 private voices=new Map<OscillatorNode,{gain:GainNode;instrument:Instrument}>();
 private output:DynamicsCompressorNode|null=null;
 private layers=new Map<Layer,{source:AudioBufferSourceNode;gain:GainNode;filter:BiquadFilterNode;lfo?:OscillatorNode;mod?:GainNode}>();
 private settings:Settings;
 private buffers=new Map<string,AudioBuffer>();
 private natureActivity=new Map<NatureLayer,number>();
 private natureEvents=new Map<NatureLayer,NatureEvent[]>();
 private natureStarted=new Map<NatureLayer,number>();
 private natureCursor=new Map<NatureLayer,number>();
 private rainBufferDensity=0;
 private rainDrops:RainDrop[]=[];
 private rainStarted=0;
 private rainCursor=0;
 private windBufferActivity=0;
 private windGusts:WindGust[]=[];
 private windStarted=0;
 private nextNote=0;
 private windCoupled=false;
 private instrumentsWereEnabled=true;
 private gust:{index:number;time:number;strength:number}[]=[];
 private deadline=Infinity;
 private sessionDuration=0;
 private sleepModeScheduled:boolean|null=null;
 private active=false;
 private limit: number|null=null;
 constructor(settings:Settings,private onNote:(note:NoteEvent)=>void) {this.settings=settings;}
 get running(){return this.active && this.context?.state==='running';}
 get time(){return this.context?.currentTime || 0;}
 async start(settings:Settings,remaining:number,sessionDuration=remaining) {
  this.settings=settings;this.sessionDuration=sessionDuration;this.sleepModeScheduled=null;
  this.context??=new AudioContext();
  await this.context.resume();
  if(this.context.state!=='running') throw new Error('Audio unavailable');
  const ctx=this.context;
  const master=ctx.createGain();master.gain.setValueAtTime(0,ctx.currentTime);
  const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.ratio.value=4;
  master.connect(compressor);compressor.connect(ctx.destination);
  const instruments=ctx.createGain();instruments.connect(master);
  this.master=master;this.instruments=instruments;this.output=compressor;
  this.deadline=remaining>0?ctx.currentTime+remaining:Infinity;
  if(Number.isFinite(this.deadline)) {
   // The audio graph itself stops at the deadline, even if JS timers are throttled.
   const sentinel=ctx.createBufferSource();sentinel.buffer=ctx.createBuffer(1,1,ctx.sampleRate);sentinel.loop=true;sentinel.connect(master);
   sentinel.onended=()=>{master.disconnect();compressor.disconnect();};
   sentinel.start();sentinel.stop(this.deadline);this.sources.add(sentinel);
  }
  this.active=true;this.nextNote=ctx.currentTime+.25;this.update(settings);
  this.limit=window.setInterval(()=>this.tick(),150);this.tick();
 }
 private noiseBuffer(type:NoiseType|'rain'|'wind'|NatureLayer) {
  if(type==='wind' && this.windBufferActivity!==this.settings.windActivity)this.buffers.delete('wind');
  if(type==='rain' && this.rainBufferDensity!==this.settings.rainDensity)this.buffers.delete('rain');
  if(type==='fire'||type==='stream'){
   const activity=type==='fire'?this.settings.fireDensity:this.settings.streamFlow;
   if(this.natureActivity.get(type)!==activity)this.buffers.delete(type);
  }
  const cached=this.buffers.get(type);if(cached)return cached;
  const ctx=this.context!;
  if(type==='fire'||type==='stream'){
   const activity=type==='fire'?this.settings.fireDensity:this.settings.streamFlow;
   const events:NatureEvent[]=[],buffer=ctx.createBuffer(2,ctx.sampleRate*30,ctx.sampleRate);
   for(let channel=0;channel<2;channel++){
    buffer.getChannelData(channel).set(natureSound(type,ctx.sampleRate,30,Math.random,activity,event=>events.push(event)));
   }
   events.sort((a,b)=>a.time-b.time);this.natureEvents.set(type,events);
   this.natureActivity.set(type,activity);this.buffers.set(type,buffer);return buffer;
  }
  if(type==='wind'){
   const buffer=ctx.createBuffer(1,ctx.sampleRate*60,ctx.sampleRate);
   this.windGusts=[];
   buffer.getChannelData(0).set(naturalWind(ctx.sampleRate,60,Math.random,this.settings.windActivity,gust=>this.windGusts.push(gust)));
   this.windBufferActivity=this.settings.windActivity;this.buffers.set(type,buffer);return buffer;
  }
  if(type==='rain'){
   const buffer=ctx.createBuffer(2,ctx.sampleRate*30,ctx.sampleRate);
   this.rainDrops=[];
   for(let channel=0;channel<2;channel++)buffer.getChannelData(channel).set(summerRain(ctx.sampleRate,30,Math.random,this.settings.rainDensity,drop=>this.rainDrops.push(drop)));
   this.rainDrops.sort((a,b)=>a.time-b.time);
   this.rainBufferDensity=this.settings.rainDensity;
   this.buffers.set(type,buffer);return buffer;
  }
  const buffer=ctx.createBuffer(1,ctx.sampleRate*12,ctx.sampleRate),data=buffer.getChannelData(0);
  let brown=0,b0=0,b1=0,b2=0;
  for(let i=0;i<data.length;i++){
   const white=Math.random()*2-1;
   if(type==='brown'){brown=(brown+.02*white)/1.02;data[i]=brown*3.5;}
   else if(type==='pink'){b0=.99765*b0+white*.099046;b1=.963*b1+white*.2965164;b2=.57*b2+white*1.0526913;data[i]=(b0+b1+b2+white*.1848)*.18;}
   else data[i]=white;
  }
  this.buffers.set(type,buffer);return buffer;
 }
 update(settings:Settings) {
  const coupled=settings.instrumentsEnabled&&settings.wind&&settings.chimes;
  if(coupled!==this.windCoupled){
   this.gust=[];this.nextNote=this.time+.25;this.windCoupled=coupled;
  }
  if(settings.instrumentsEnabled!==this.instrumentsWereEnabled){
   this.gust=[];this.nextNote=this.time+.25;this.instrumentsWereEnabled=settings.instrumentsEnabled;
  }
  this.settings=settings;
  if(!settings.chimes||!settings.instrumentsEnabled)this.gust=[];
  if(!this.active || !this.context || !this.master || !this.instruments)return;
  const ctx=this.context,now=ctx.currentTime;
  if(this.sleepModeScheduled!==settings.sleepMode){
   this.scheduleFade(settings.sleepMode);this.sleepModeScheduled=settings.sleepMode;
  }
  for(const [source,voice] of this.voices) {
   source.detune.setTargetAtTime(settings.pitch*100,now,.12);
   if(!settings.instrumentsEnabled||!settings[voice.instrument]) {voice.gain.gain.cancelAndHoldAtTime(now);voice.gain.gain.linearRampToValueAtTime(0,now+.08);try{source.stop(now+.1);}catch{}}
  }
  this.instruments.gain.setTargetAtTime(settings.instrumentVolume/100*.65,now,.08);
  for(const layer of ['rain','wind','noise','fire','stream'] as const) {
   const old=this.layers.get(layer);
   if(!settings[layer]) {
    if(old){old.gain.gain.setTargetAtTime(0,now,.06);old.source.stop(now+.3);old.lfo?.stop(now+.3);this.layers.delete(layer);}
    continue;
   }
   const type=layer==='noise'?settings.noiseType:layer;
   if(old && old.source.buffer!==this.noiseBuffer(type)){
    old.gain.gain.setTargetAtTime(0,now,.06);old.source.stop(now+.3);this.layers.delete(layer);
    if(layer==='wind'&&this.windCoupled){this.gust=[];this.nextNote=now+.25;}
   }
   let entry=this.layers.get(layer);
   if(!entry){
    const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    source.buffer=this.noiseBuffer(type);source.loop=true;
    filter.type='lowpass';filter.Q.value=.5;filter.frequency.value=layer==='rain'?2400:layer==='wind'?600:layer==='fire'?3400:layer==='stream'?3800:settings.noiseType==='white'?6500:3000;
    source.connect(filter);filter.connect(gain);gain.connect(this.master);gain.gain.value=0;
    entry={source,gain,filter};
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();entry?.mod?.disconnect();this.sources.delete(source);};
    source.start();if(layer==='fire'||layer==='stream'){this.natureStarted.set(layer,ctx.currentTime);this.natureCursor.set(layer,0);}if(layer==='wind')this.windStarted=ctx.currentTime;if(layer==='rain'){this.rainStarted=ctx.currentTime;this.rainCursor=0;}if(Number.isFinite(this.deadline))source.stop(this.deadline);
    this.sources.add(source);this.layers.set(layer,entry);
   }
   // Keep white, pink and brown noise behind the instruments and nature sounds.
   const level=layer==='noise'?.055:.22;
   entry.gain.gain.setTargetAtTime(settings[layer+'Volume' as 'rainVolume'|'windVolume'|'noiseVolume'|'fireVolume'|'streamVolume']/100*level,now,.12);
  }
 }
 private scheduleFade(sleepMode:boolean){
  const now=this.time,gain=this.master!.gain,remaining=this.deadline-now;
  gain.cancelAndHoldAtTime(now);
  if(!Number.isFinite(this.deadline)){gain.linearRampToValueAtTime(1,now+.3);return;}
  if(remaining<=0){gain.setValueAtTime(0,now);return;}
  const fade=fadeWindow(this.sessionDuration,sleepMode);
  const rampEnd=Math.min(now+.3,this.deadline);
  const level=fade>0?Math.min(1,Math.max(0,(this.deadline-rampEnd)/fade)):1;
  gain.linearRampToValueAtTime(level,rampEnd);
  if(this.deadline-fade>rampEnd)gain.setValueAtTime(1,this.deadline-fade);
  gain.linearRampToValueAtTime(0,this.deadline);
 }
 takeNatureEvents(layer:NatureLayer):NatureEvent[]{
  const entry=this.layers.get(layer);
  if(!this.running||!entry)return [];
  const elapsed=this.time-(this.natureStarted.get(layer)||0),previous=this.natureCursor.get(layer)||0;
  this.natureCursor.set(layer,elapsed);
  const animation=layer==='fire'?this.settings.fireAnimation:this.settings.streamAnimation;
  const volume=layer==='fire'?this.settings.fireVolume:this.settings.streamVolume;
  if(!animation||!this.settings.motion||volume===0)return [];
  const from=Math.max(previous,elapsed-.1),duration=entry.source.buffer!.duration,events:NatureEvent[]=[];
  for(let loop=Math.floor(from/duration);loop<=Math.floor(elapsed/duration);loop++){
   for(const event of this.natureEvents.get(layer)||[]){
    const at=loop*duration+event.time;
    if(at>from&&at<=elapsed)events.push(event);
   }
  }
  return events;
 }
 windStrength(){
  const entry=this.layers.get('wind');
  if(!this.running||!entry||this.settings.windVolume===0)return 0;
  return windStrengthAt(this.time-this.windStarted,this.windGusts,entry.source.buffer!.duration);
 }
 /** Events from the actual looping rain buffer, driven by the audio clock. */
 takeRainDrops():RainDrop[]{
  const entry=this.layers.get('rain');
  if(!this.running || !entry)return [];
  const elapsed=this.time-this.rainStarted,previous=this.rainCursor;
  this.rainCursor=elapsed;
  if(!this.settings.rainAnimation||!this.settings.motion||this.settings.rainVolume===0)return [];
  // Never replay a backlog when a hidden tab becomes visible again.
  const from=Math.max(previous,elapsed-.1),duration=entry.source.buffer!.duration;
  const drops:RainDrop[]=[];
  for(let loop=Math.floor(from/duration);loop<=Math.floor(elapsed/duration);loop++){
   for(const drop of this.rainDrops){
    const at=loop*duration+drop.time;
    if(at>from&&at<=elapsed)drops.push(drop);
   }
  }
  return drops;
 }
 tick(){
  if(!this.active || !this.context || this.context.state!=='running')return;
  const now=this.time;
  if(now>=this.deadline||!this.settings.instrumentsEnabled)return;
  if(now>=this.nextNote){
   if(this.settings.chimes){
    const wind=this.windCoupled?this.coupledWindStrength(now):1;
    if(wind>.06){
     const strikes=randomGust();
     this.gust.push(...strikes.map(strike=>({...strike,time:now+strike.offset})));
     this.nextNote=this.windCoupled
      ?now+strikes[strikes.length-1]!.offset+(1.2-wind)*(1+randomGap(this.settings.density)*.4)
      :now+strikes[strikes.length-1]!.offset+3+randomGap(this.settings.density);
    }else{
     // Wait for the actual audio envelope to rise, not an independent timer.
     this.nextNote=now+.15;
    }
   }else{
    const instrument=selectedInstrument(this.settings);
    this.nextNote=now+(instrument==='gong'?12+randomGap(this.settings.density):randomGap(this.settings.density));
    this.strike(randomNote().index,instrument,now,.85+Math.random()*.15);
   }
  }
  while(this.gust.length && this.gust[0]!.time<=now+.04){
   const strike=this.gust.shift()!,at=Math.max(now,strike.time);
   const wind=this.windCoupled?this.coupledWindStrength(at):1;
   if(this.settings.chimes&&wind>.06){
    this.strike(strike.index,'chimes',at,strike.strength*(this.windCoupled?.3+.7*wind:1));
   }
  }
 }
 private coupledWindStrength(time:number){
  const entry=this.layers.get('wind');
  return entry?windStrengthAt(time-this.windStarted,this.windGusts,entry.source.buffer!.duration):0;
 }

 private strike(noteIndex:number,instrument:Instrument,now:number,strength:number){
  const tone=instrumentTone(instrument,noteIndex);
  const duration=Math.min(tone.duration,this.deadline-now);
  if(duration<.3)return;
  const {frequency,partials}=tone;
  partials.forEach((partial,index)=>{
   const oscillator=this.context!.createOscillator(),gain=this.context!.createGain();
   oscillator.type='sine';oscillator.frequency.value=frequency*partial;
   oscillator.detune.value=this.settings.pitch*100;
   const tail=duration/(1+index*tone.decay);
   const attack=tone.attack;
   const peak=tone.peak*strength/(1+index*2);
   gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(peak,now+attack);
   gain.gain.exponentialRampToValueAtTime(.0001,now+tail);
   oscillator.connect(gain);gain.connect(this.instruments!);this.sources.add(oscillator);
   this.voices.set(oscillator,{gain,instrument});
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();this.sources.delete(oscillator);this.voices.delete(oscillator);};
   oscillator.start(now);oscillator.stop(now+tail+.02);
  });
  this.onNote({index:noteIndex,instrument,duration});
 }

 stop(){
  this.active=false;this.gust=[];
  if(this.limit!==null){clearInterval(this.limit);this.limit=null;}
  const ctx=this.context,master=this.master;
  if(ctx && master) {
   const now=ctx.currentTime;
   master.gain.cancelAndHoldAtTime(now);master.gain.linearRampToValueAtTime(0,now+.08);
   for(const source of this.sources){try{source.stop(now+.1);}catch{}}
   const old=master,output=this.output;window.setTimeout(()=>{old.disconnect();output?.disconnect();},150);
  }
  this.sources.clear();this.voices.clear();this.layers.clear();this.master=null;this.instruments=null;this.output=null;
 }
 async close(){this.stop();await this.context?.close();}
}
