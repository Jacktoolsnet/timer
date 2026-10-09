export const musicStyles=['calm','focus','uplifting'] as const;
export const instrumentPresets=['pad','kalimba','handpan','harp','bell','bass'] as const;
export const waveforms=['sine','triangle','sawtooth','square','noise'] as const;
export type Instrument={
 id:string;name:string;wave:typeof waveforms[number];partials:{ratio:number;gain:number}[];
 attack:number;decay:number;sustain:number;release:number;volume:number;
 filter:'none'|'lowpass'|'highpass'|'bandpass';cutoff:number;resonance:number;
 echo:{delay:number;feedback:number;mix:number};reverb:number;
};
export type Note={instrument:string;at:number;duration:number;pitch:number;velocity:number};
export type Music={enabled:boolean;mode:'generated'|'score';style:typeof musicStyles[number];tempo:number;key:number;seed:number;volume:number;fadeIn:number;fadeOut:number;instruments:Instrument[];notes:Note[]};
export function presetInstrument(preset:typeof instrumentPresets[number]='pad',id=preset as string):Instrument{
 const base:Instrument={id,name:preset,wave:'sine',partials:[{ratio:1,gain:1},{ratio:2,gain:.15}],attack:.01,decay:.3,sustain:.2,release:.8,volume:.6,filter:'lowpass',cutoff:5000,resonance:.7,echo:{delay:.25,feedback:.2,mix:0},reverb:.12};
 if(preset==='pad')return {...base,attack:.3,decay:.5,sustain:.7,release:1.2,volume:.35,cutoff:1800,reverb:.22};
 if(preset==='kalimba')return {...base,partials:[{ratio:1,gain:1},{ratio:2.92,gain:.17},{ratio:5.3,gain:.08}],attack:.004,decay:.28,sustain:.08,release:.7,cutoff:7000,echo:{delay:.28,feedback:.2,mix:.1}};
 if(preset==='handpan')return {...base,partials:[{ratio:1,gain:1},{ratio:2,gain:.28},{ratio:3,gain:.12},{ratio:4.95,gain:.05}],attack:.012,decay:.5,sustain:.12,release:1.4};
 if(preset==='harp')return {...base,partials:[{ratio:1,gain:1},{ratio:2,gain:.32},{ratio:3,gain:.12}],attack:.006,decay:.2,sustain:.1,release:.7};
 if(preset==='bell')return {...base,partials:[{ratio:1,gain:1},{ratio:2,gain:.24},{ratio:2.71,gain:.12}],attack:.004,decay:.5,sustain:.05,release:1.8,volume:.4,reverb:.2};
 return {...base,wave:'triangle',partials:[{ratio:1,gain:1}],attack:.01,decay:.15,sustain:.6,release:.2,cutoff:700,volume:.4,reverb:0};
}
export function defaultMusic(style:Music['style']='calm'):Music{return {enabled:true,mode:'generated',style,tempo:style==='calm'?72:style==='focus'?90:110,key:60,seed:1,volume:.35,fadeIn:1,fadeOut:2,instruments:[presetInstrument('pad'),presetInstrument(style==='calm'?'handpan':style==='focus'?'kalimba':'harp'),presetInstrument('bass')],notes:[]};}
const object=(v:unknown,p:string,allowed:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');const o=v as Record<string,unknown>;for(const k of Object.keys(o))if(!allowed.includes(k))throw new Error(p+'.'+k+': unknown field');return o;};
const number=(v:unknown,p:string,min:number,max:number,integer=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw new Error(p+': expected '+(integer?'integer ':'number ')+min+'–'+max);return v;};
const choice=<T extends string>(v:unknown,values:readonly T[],p:string):T=>{if(!values.includes(v as T))throw new Error(p+': '+values.join(', '));return v as T;};
const string=(v:unknown,p:string,max=100)=>{if(typeof v!=='string'||v.length>max)throw new Error(p+': expected text');return v;};
const identifier=(v:unknown,p:string)=>{const s=string(v,p);if(!/^[A-Za-z0-9_-]{1,100}$/.test(s))throw new Error(p+': invalid identifier');return s;};
export function instrumentTail(i:Instrument){return i.release+Math.max(i.echo.mix?i.echo.delay*6:0,i.reverb?2:0);}
export function parseMusic(value:unknown,total:number,path='music'):Music|null{
 if(value===undefined||value===null)return null;
 const d=defaultMusic(),m=object(value,path,Object.keys(d));
 const bool=m.enabled??true;if(typeof bool!=='boolean')throw new Error(path+'.enabled: expected boolean');
 const raw=m.instruments??d.instruments;if(!Array.isArray(raw)||raw.length<1||raw.length>8)throw new Error(path+'.instruments: expected 1–8 instruments');
 const ids=new Set<string>();
 const instruments=raw.map((value,index)=>{
  const p=path+'.instruments['+index+']',base=presetInstrument('pad'),i=object(value,p,Object.keys(base)),id=identifier(i.id,p+'.id');
  if(ids.has(id))throw new Error(p+'.id: duplicate ID');ids.add(id);
  const partials=i.partials??base.partials;if(!Array.isArray(partials)||!partials.length||partials.length>8)throw new Error(p+'.partials: expected 1–8 partials');
  const parsed=partials.map((value,j)=>{const q=p+'.partials['+j+']',o=object(value,q,['ratio','gain']);return {ratio:number(o.ratio,q+'.ratio',.25,16),gain:number(o.gain,q+'.gain',0,1)};});
  if(!parsed.some(p=>p.gain>0))throw new Error(p+'.partials: at least one nonzero gain');
  const echo=object(i.echo??base.echo,p+'.echo',['delay','feedback','mix']);
  return {id,name:string(i.name??id,p+'.name'),wave:choice(i.wave??base.wave,waveforms,p+'.wave'),partials:parsed,
   attack:number(i.attack??base.attack,p+'.attack',0,2),decay:number(i.decay??base.decay,p+'.decay',0,3),sustain:number(i.sustain??base.sustain,p+'.sustain',0,1),release:number(i.release??base.release,p+'.release',0,5),volume:number(i.volume??base.volume,p+'.volume',0,1),
   filter:choice(i.filter??base.filter,['none','lowpass','highpass','bandpass'] as const,p+'.filter'),cutoff:number(i.cutoff??base.cutoff,p+'.cutoff',40,20000),resonance:number(i.resonance??base.resonance,p+'.resonance',.1,10),
   echo:{delay:number(echo.delay??base.echo.delay,p+'.echo.delay',.05,1),feedback:number(echo.feedback??base.echo.feedback,p+'.echo.feedback',0,.6),mix:number(echo.mix??base.echo.mix,p+'.echo.mix',0,.5)},reverb:number(i.reverb??base.reverb,p+'.reverb',0,.5)} satisfies Instrument;
 });
 const rawNotes=m.notes??[];if(!Array.isArray(rawNotes)||rawNotes.length>10000)throw new Error(path+'.notes: maximum 10000 notes');
 const notes=rawNotes.map((value,index)=>{
  const p=path+'.notes['+index+']',n=object(value,p,['instrument','at','duration','pitch','velocity']),instrument=identifier(n.instrument,p+'.instrument');if(!ids.has(instrument))throw new Error(p+'.instrument: missing instrument '+instrument);
  return {instrument,at:number(n.at,p+'.at',0,total),duration:number(n.duration,p+'.duration',.05,16),pitch:number(n.pitch,p+'.pitch',21,108,true),velocity:number(n.velocity??.7,p+'.velocity',0,1)};
 }).sort((a,b)=>a.at-b.at);
 // Count audible voices including effect tails; zero-velocity notes are silent.
 const boundaries: [number,number][]=[];for(const n of notes)if(n.velocity){boundaries.push([n.at,1],[n.at+n.duration+instrumentTail(instruments.find(i=>i.id===n.instrument)!),-1]);}
 boundaries.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let voices=0;for(const [,delta] of boundaries){voices+=delta;if(voices>32)throw new Error(path+'.notes: maximum 32 overlapping notes including release/effects');}
 const result:Music={enabled:bool,mode:choice(m.mode??d.mode,['generated','score'] as const,path+'.mode'),style:choice(m.style??d.style,musicStyles,path+'.style'),
  tempo:number(m.tempo??d.tempo,path+'.tempo',40,180),key:number(m.key??d.key,path+'.key',48,72,true),seed:number(m.seed??d.seed,path+'.seed',0,4294967295,true),volume:number(m.volume??d.volume,path+'.volume',0,1),fadeIn:number(m.fadeIn??d.fadeIn,path+'.fadeIn',0,10),fadeOut:number(m.fadeOut??d.fadeOut,path+'.fadeOut',0,10),instruments,notes};
 if(result.mode==='generated'){
  const window=Math.min(total,32*240/result.tempo);
  const generated=musicEvents(result,total,0,window),points:[number,number][]=[];
  for(const n of generated)points.push([n.at,1],[n.at+n.duration+instrumentTail(instruments.find(i=>i.id===n.instrument)!),-1]);
  points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let count=0;for(const [,delta] of points){count+=delta;if(count>32)throw new Error(path+': maximum 32 overlapping notes; reduce tempo, release or effects');}
 }
 return result;
}
export function envelopeAt(i:Instrument,held:number,t:number):number{
 if(t<0)return 0;
 const pressed=(time:number)=>time<i.attack?(i.attack?time/i.attack:1):time<i.attack+i.decay?(i.decay?1-(1-i.sustain)*(time-i.attack)/i.decay:i.sustain):i.sustain;
 if(t<=held)return pressed(t);
 return i.release?pressed(held)*Math.max(0,1-(t-held)/i.release):0;
}
export function musicGainAt(m:Music,time:number,total:number){return m.volume*Math.min(1,m.fadeIn?Math.max(0,time)/m.fadeIn:1,m.fadeOut?Math.max(0,total-time)/m.fadeOut:1);}
export function pitchFrequency(pitch:number){return 440*2**((pitch-69)/12);}
function seeded(seed:number){let s=seed>>>0;return ()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
export {seeded as musicRandom};
export type MusicEvent=Note & {eventId:string};
/** Query any timeline window directly, without constructing an entire long score. */
export function musicEvents(m:Music,total:number,from:number,to:number):MusicEvent[]{
 const tail=Math.max(...m.instruments.map(instrumentTail));
 if(m.mode==='score')return m.notes.flatMap((n,index)=>n.at<Math.min(total,to)&&n.at+n.duration+instrumentTail(m.instruments.find(i=>i.id===n.instrument)!)>from?[{...n,eventId:'note-'+index}]:[]);
 const beat=60/m.tempo,bar=beat*4,scale=[0,2,4,5,7,9,11],degrees=m.style==='calm'?[0,5,3,4]:m.style==='focus'?[0,3,5,4]:[0,4,5,3],events:MusicEvent[]=[];
 const first=Math.max(0,Math.floor((from-tail-bar)/bar)),last=Math.ceil(Math.min(total,to)/bar);
 const add=(n:Note,id:string)=>{if(n.at<Math.min(total,to)&&n.at+n.duration+instrumentTail(m.instruments.find(i=>i.id===n.instrument)!)>from)events.push({...n,eventId:id});};
 for(let b=first;b<last;b++){
  const root=degrees[b%degrees.length],random=seeded(m.seed^Math.imul(b+1,2654435761)),at=b*bar;
  const chord=m.instruments[0],melody=m.instruments[1]??chord,bass=m.instruments[2];
  const degree=(d:number)=>m.key+scale[d%7]+12*Math.floor(d/7);
  for(const [j,d] of [root,root+2,root+4].entries())add({instrument:chord.id,at,duration:bar*.85,pitch:degree(d),velocity:.45},'bar-'+b+'-chord-'+j);
  if(bass)add({instrument:bass.id,at,duration:bar*.7,pitch:degree(root)-12,velocity:.5},'bar-'+b+'-bass');
  const rhythm=m.style==='calm'?[.5,2.5]:m.style==='focus'?[0,1.5,3]:[0,.75,1.5,2.5,3.25];
  rhythm.forEach((position,index)=>add({instrument:melody.id,at:at+position*beat,duration:beat*(m.style==='calm'?.55:.4),pitch:degree([root,root+2,root+4,root+7][Math.floor(random()*4)])+12,velocity:.45+random()*.15},'bar-'+b+'-melody-'+index));
 }
 return events.sort((a,b)=>a.at-b.at);
}
