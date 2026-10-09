import {musicEvents,musicGainAt,pitchFrequency,musicRandom,envelopeAt,instrumentTail,type Music,type Instrument,type Note} from '../lib/music';
let rendering=0;
const renderQueue:(()=>void)[]=[];
async function renderSlot(){if(rendering>=4)await new Promise<void>(resolve=>renderQueue.push(resolve));else rendering++;}
function releaseSlot(){const next=renderQueue.shift();if(next)next();else rendering--;}
/** Baked individual notes preserve oscillator phase and effect tails when seeking. */
export async function renderNote(i:Instrument,n:Note,seed:number):Promise<AudioBuffer>{
 await renderSlot();try{
 const rate=22050,length=Math.ceil((n.duration+instrumentTail(i)+.02)*rate);
 const c=new OfflineAudioContext(2,length,rate),envelope=c.createGain(),filter=c.createBiquadFilter();
 filter.type=i.filter==='none'?'allpass':i.filter;filter.frequency.value=Math.min(i.cutoff,rate*.45);filter.Q.value=i.resonance;
 envelope.connect(filter);const dry=c.createGain();dry.gain.value=i.volume*.18;filter.connect(dry);dry.connect(c.destination);
 const gain=envelope.gain;gain.setValueAtTime(envelopeAt(i,n.duration,0),0);
 for(const at of [...new Set([i.attack,i.attack+i.decay,n.duration])].filter(t=>t>0&&t<=n.duration).sort((a,b)=>a-b))gain.linearRampToValueAtTime(envelopeAt(i,n.duration,at),at);
 gain.setValueAtTime(envelopeAt(i,n.duration,n.duration),n.duration);gain.linearRampToValueAtTime(0,n.duration+Math.max(.005,i.release));
 const random=musicRandom(seed);
 if(i.wave==='noise'){
  const b=c.createBuffer(1,rate*2,rate),d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=random()*2-1;
  const source=c.createBufferSource();source.buffer=b;source.loop=true;source.connect(envelope);source.start();source.stop(n.duration+i.release+.01);
 }else{
  const sum=i.partials.reduce((s,p)=>s+p.gain,0);
  for(const p of i.partials){if(p.gain===0||pitchFrequency(n.pitch)*p.ratio>=rate*.45)continue;const o=c.createOscillator(),g=c.createGain();o.type=i.wave;o.frequency.value=pitchFrequency(n.pitch)*p.ratio;g.gain.value=p.gain/sum;o.connect(g).connect(envelope);o.start();o.stop(n.duration+i.release+.01);}
 }
 if(i.echo.mix){for(let k=1;k<=6;k++){const delay=c.createDelay(6),g=c.createGain();delay.delayTime.value=i.echo.delay*k;g.gain.value=i.echo.mix*i.echo.feedback**(k-1);dry.connect(delay).connect(g).connect(c.destination);}}
 if(i.reverb){const b=c.createBuffer(2,rate*2,rate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let j=0;j<d.length;j++)d[j]=(random()*2-1)*(1-j/d.length)**3;}const conv=c.createConvolver(),g=c.createGain();conv.buffer=b;g.gain.value=i.reverb;dry.connect(conv).connect(g).connect(c.destination);}
 return await c.startRendering();
 }finally{releaseSlot();}
}
export class MusicPlayer{
 private limiter?:DynamicsCompressorNode;private cacheBytes=new Map<string,number>();
 private context?:AudioContext;private bus?:GainNode;private sources:AudioBufferSourceNode[]=[];private timer?:ReturnType<typeof setInterval>;private generation=0;private anchor=0;private base=0;private active=false;
 private cache=new Map<string,Promise<AudioBuffer>>();
 async unlock(){this.context??=new AudioContext();await this.context.resume();if(this.context.state!=='running')throw new Error('Audio unavailable');}
 playhead(){return this.active&&this.context?this.base+Math.max(0,this.context.currentTime-this.anchor):null;}
 stop(){this.generation++;this.active=false;clearInterval(this.timer);for(const s of this.sources){try{s.stop();}catch{}s.disconnect();}this.sources=[];this.limiter?.disconnect();this.limiter=undefined;this.bus?.disconnect();this.bus=undefined;}
 async start(m:Music,time:number,total:number){
  this.stop();const generation=this.generation;await this.unlock();const c=this.context!;
  const buffer=(n:Note)=>{const i=m.instruments.find(i=>i.id===n.instrument)!;const key=JSON.stringify([i,n.pitch,n.duration,m.seed]);let p=this.cache.get(key);if(!p){if(this.cache.size>=32){const oldest=this.cache.keys().next().value!;this.cache.delete(oldest);this.cacheBytes.delete(oldest);}p=renderNote(i,n,m.seed);this.cache.set(key,p);p.then(b=>{if(!this.cache.has(key))return;this.cacheBytes.set(key,b.length*b.numberOfChannels*4);while([...this.cacheBytes.values()].reduce((s,v)=>s+v,0)>32*1024*1024&&this.cache.size>1){const oldest=this.cache.keys().next().value!;this.cache.delete(oldest);this.cacheBytes.delete(oldest);}}).catch(()=>this.cache.delete(key));}return p;};
  const initial=musicEvents(m,total,time,time+.1);await Promise.all(initial.map(buffer));if(generation!==this.generation)return;
  this.base=time;this.anchor=c.currentTime+.03;this.active=true;const bus=c.createGain(),limiter=c.createDynamicsCompressor();this.bus=bus;this.limiter=limiter;bus.connect(limiter).connect(c.destination);
  const scheduled=new Map<string,number>();
  const schedule=()=>{if(generation!==this.generation)return;const now=this.playhead()!;bus.gain.setValueAtTime(musicGainAt(m,now,total),c.currentTime);
   for(const [id,end] of scheduled)if(end<now)scheduled.delete(id);
   for(const n of musicEvents(m,total,now,now+2)){if(scheduled.has(n.eventId))continue;scheduled.set(n.eventId,n.at+n.duration+instrumentTail(m.instruments.find(i=>i.id===n.instrument)!));void buffer(n).then(b=>{if(generation!==this.generation)return;const when=this.anchor+n.at-time,startWhen=Math.max(this.anchor,c.currentTime,when),offset=Math.max(0,startWhen-when);if(offset>=b.duration)return;const s=c.createBufferSource(),g=c.createGain();s.buffer=b;g.gain.value=n.velocity;s.connect(g).connect(bus);this.sources.push(s);s.onended=()=>{this.sources=this.sources.filter(v=>v!==s);s.disconnect();g.disconnect();};s.start(startWhen,offset);}).catch(()=>this.stop());}
   if(now>=total)this.stop();
  };schedule();this.timer=setInterval(schedule,100);
 }
}
