import {storageAllowed} from '../lib/storage';
import {STORAGE_KEY} from '../lib/engine';
import {decodeSettings,type SoundSettings} from '../lib/sound-settings';
import {soundProfiles} from '../lib/sound-profiles';
import {approach,journeyLength,morphWeights} from '../lib/journey';
import {presets,styleCopy,type StyleId} from '../lib/presets';
import {screenWakeLock} from '../lib/wake-lock';
import {evolvePattern,nextEvolutionStep} from '../lib/evolution';
import {enhanceClockSelects} from '../../../shared/preview-selects';
import {defaultInstruments,instrumentIds,instrumentNames,type InstrumentId} from '../lib/instruments';
import {copy} from '../lib/sound-i18n';
const t=copy[document.documentElement.lang as keyof typeof copy]||copy.en;
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const orbit=$<HTMLCanvasElement>('#orbit'), drawing=$<HTMLCanvasElement>('#drawing');
const oc=orbit.getContext('2d')!,dc=drawing.getContext('2d')!;
const atmosphere=$<HTMLCanvasElement>('#sound-atmosphere'),ac=atmosphere.getContext('2d')!;
const colors=['#21bed1','#a482ed','#f0788c','#d8a847','#48bca0','#e68a44','#779cf5','#dc7bcb'];
const lightColors=['#00869b','#7845c7','#cf3659','#a66a08','#078565','#bd5715','#3d66c5','#b0399c'];
const tracks=colors.map((color,i)=>({color,phase:0,direction:1,directionMode:'forward',pendingDirection:null as number|null,randomDynamics:false,lastVelocity:1,scheduledVelocity:1,morph:null as {to:InstrumentId;progress:number;from:number;at:number;duration:number}|null,hitVelocities:Array<number>(16).fill(1),enabled:i<5,instrument:defaultInstruments[i],points:Array.from({length:16},(_,s)=>i===0?s%4===0:i===1?s%8===4:i===2?s%2===0:i===3?s%8===0:i===4?s%5===0:false),mute:false,volume:.65,pitch:0,flash:Array(16).fill(-100),hits:Array<number>(16).fill(-Infinity)}));
let audio:AudioContext|undefined, master:GainNode|undefined, playing=false,timer:ReturnType<typeof setInterval>|undefined,nextTime=0,step=0,bpm=100;
let visualStep=0,visualTime=0,visualDuration=.15;
function playbackAngle(time:number){return (visualStep+Math.max(0,Math.min(1,(time-visualTime)/visualDuration)))/16*Math.PI*2;}
const language=document.documentElement.lang as keyof typeof styleCopy;
let currentStyle:StyleId='electronic',pendingStyle:StyleId|null=null;
let evolving=false,evolutionStep=Infinity;
let journey:{track:number;cycle:number;length:number;pitch:number;tempo:number}|null=null;
function nextMusicStep(current:number){
 if(currentStyle==='focus'||currentStyle==='coffeehouse')return (Math.floor(current/16)+4+Math.floor(Math.random()*5))*16;
 if(currentStyle==='sport')return (Math.floor(current/16)+2+Math.floor(Math.random()*5))*16;
 return nextEvolutionStep(current);
}
function setEvolution(on:boolean){
 if(evolving&&!on)tracks.forEach(tr=>{if(tr.directionMode!=='random')tr.pendingDirection=tr.directionMode==='reverse'?-1:1;});
 evolving=on;evolutionStep=on?nextMusicStep(step):Infinity;
 $('#evolve').setAttribute('aria-pressed',String(on));labelAction('#evolve',on?t.evolveStop:t.evolve);
 $('#evolution-status').textContent='';
 sync();
}
let persistenceReady=false,saveTimer:ReturnType<typeof setTimeout>|undefined;
function saveSettings(){
 if(!persistenceReady||!storageAllowed())return;
 try{
  const snapshot:SoundSettings={
   version:1,style:currentStyle,bpm,volume:Number($<HTMLInputElement>('#volume').value),
   background:backgroundChoice,center:centerChoice,orbit:orbitChoice,
   tracks:tracks.map(tr=>({
    enabled:tr.enabled,mute:tr.mute,instrument:tr.instrument,points:[...tr.points],volume:tr.volume,pitch:tr.pitch,
    phase:tr.phase,direction:tr.direction,directionMode:tr.directionMode,randomDynamics:tr.randomDynamics,
    morph:tr.morph?{to:tr.morph.to,progress:currentMorph(tr,audio?.currentTime||0)}:null
   }))
  };
  localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot));
 }catch{
  const status=document.querySelector('#storage-status');
  if(status)status.textContent=document.querySelector<HTMLElement>('#clear-storage')?.dataset.error||'';
 }
}
function persistSettings(){
 if(!persistenceReady||!storageAllowed())return;
 if(saveTimer)clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{saveTimer=undefined;saveSettings();},250);
}
document.addEventListener('storage-enabled',saveSettings);
document.addEventListener('preferences-cleared',()=>{
 if(saveTimer)clearTimeout(saveTimer);saveTimer=undefined;
 try{localStorage.removeItem(STORAGE_KEY);}catch{}
});
window.addEventListener('pagehide',()=>{if(saveTimer)clearTimeout(saveTimer);saveTimer=undefined;saveSettings();});
const events:{time:number;step:number;duration:number;notes:{track:number;beat:number;velocity:number}[]}[]=[];
function labelAction(selector:string,label:string){const button=$(selector);button.setAttribute('aria-label',label);button.setAttribute('title',label);}
const wake=screenWakeLock($('#wake-status'),'',t.wakeUnavailable);
window.addEventListener('pageshow',()=>wake(document.body.classList.contains('focus-view')));
let backgroundMode:'clouds'|'aurora'|'stars'|'waves'|'off'='clouds';
let orbitMode:'comet'|'dot'|'pulse'|'off'='comet';
let orbitAnimation=true;
let centerMode:'ring'|'filled'|'sine'|'bars'|'sun'|'off'='ring';
let centerChoice:typeof centerMode|'random'=centerMode;
let backgroundChoice:typeof backgroundMode|'random'=backgroundMode;
let orbitChoice:typeof orbitMode|'random'=orbitMode;
let animationStep=Infinity;
function pickVariant<T extends string>(modes:readonly T[],current:T):T{
 const choices=modes.filter(mode=>mode!==current);
 return choices[Math.floor(Math.random()*choices.length)];
}
function selectCenterMode(choice:typeof centerChoice){
 centerChoice=choice;
 centerMode=choice==='random'?pickVariant(currentStyle==='focus'?['ring','filled','sine']:currentStyle==='sport'?['ring','bars','sun']:['ring','filled','sine','bars','sun'],centerMode):choice;
 orbit.dataset.centerVariant=centerMode;persistSettings();
 document.querySelectorAll<HTMLButtonElement>('[data-center-mode]').forEach(tile=>tile.setAttribute('aria-pressed',String(tile.dataset.centerMode===choice)));
}
function selectBackgroundMode(choice:typeof backgroundChoice){
 backgroundChoice=choice;persistSettings();
 backgroundMode=choice==='random'?pickVariant(['clouds','aurora','stars','waves'] as const,backgroundMode):choice;
 document.querySelectorAll<HTMLButtonElement>('[data-background-mode]').forEach(tile=>tile.setAttribute('aria-pressed',String(tile.dataset.backgroundMode===choice)));
 atmosphere.hidden=backgroundMode==='off';atmosphere.dataset.mode=backgroundMode;
 if(backgroundMode==='off')ac.clearRect(0,0,atmosphere.width,atmosphere.height);
}
function selectOrbitMode(choice:typeof orbitChoice){
 orbitChoice=choice;persistSettings();
 orbitMode=choice==='random'?pickVariant(['comet','dot','pulse'] as const,orbitMode):choice;
 orbitAnimation=orbitMode!=='off';orbit.dataset.animated=String(orbitAnimation);orbit.dataset.mode=orbitMode;
 document.querySelectorAll<HTMLButtonElement>('[data-orbit-mode]').forEach(tile=>tile.setAttribute('aria-pressed',String(tile.dataset.orbitMode===choice)));
}
document.querySelectorAll<HTMLButtonElement>('[data-center-mode]').forEach(button=>button.addEventListener('click',()=>selectCenterMode(button.dataset.centerMode as typeof centerChoice)));
document.querySelectorAll<HTMLButtonElement>('[data-background-mode]').forEach(button=>button.addEventListener('click',()=>selectBackgroundMode(button.dataset.backgroundMode as typeof backgroundChoice)));
document.querySelectorAll<HTMLButtonElement>('[data-orbit-mode]').forEach(button=>button.addEventListener('click',()=>selectOrbitMode(button.dataset.orbitMode as typeof orbitChoice)));
function evolveAnimations(includeBackground=true){
 if(centerChoice==='random')selectCenterMode('random');
 if(includeBackground&&backgroundChoice==='random')selectBackgroundMode('random');
 if(orbitChoice==='random')selectOrbitMode('random');
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function activeTracks(){return tracks.map((tr,index)=>({tr,index})).filter(({tr})=>tr.enabled);}
function radius(rank:number,count:number){return 300-rank*(184/Math.max(1,count-1));}
function sync(){
 tracks.forEach((tr,i)=>{
  const row=$<HTMLElement>('[data-track="'+i+'"]');
  row.dataset.morph=tr.morph?String(tr.morph.progress):'';
  row.dataset.morphTarget=tr.morph?.to||'';
  row.dataset.enabled=String(tr.enabled);row.dataset.phase=String(tr.phase);row.dataset.direction=String(tr.direction);
  const direction=row.querySelector<HTMLSelectElement>('.track-direction')!;
  direction.value=evolving?'random':tr.directionMode;direction.disabled=evolving||tr.instrument==='kick';
  direction.dispatchEvent(new Event('options-sync'));
  const trigger=row.querySelector<HTMLButtonElement>('[id="trigger-direction-'+i+'"]');
  if(trigger)trigger.disabled=direction.disabled;
  const dynamics=row.querySelector<HTMLInputElement>('.random-dynamics')!;
  dynamics.checked=evolving||tr.randomDynamics;dynamics.disabled=evolving;
  row.querySelector<HTMLInputElement>('.track-enabled')!.checked=tr.enabled;
  row.querySelector<HTMLInputElement>('.mute')!.checked=tr.mute;
  row.querySelector<HTMLInputElement>('.track-volume')!.value=String(tr.volume);
  row.querySelector('.track-volume-value')!.textContent=Math.round(tr.volume*100)+' %';
  const select=row.querySelector<HTMLSelectElement>('.instrument-select')!;
  select.value=tr.instrument;select.dispatchEvent(new Event('options-sync'));
  const name=instrumentNames[language][instrumentIds.indexOf(tr.instrument)];
  row.querySelector('.instrument-name')!.textContent=name;
  row.querySelector('.steps')!.setAttribute('aria-label',name);
  row.querySelectorAll('[data-step]').forEach((b,s)=>b.setAttribute('aria-label',name+' · '+(s+1)));
  row.querySelector('.count')!.textContent=tr.points.filter(Boolean).length+' / 16';
  row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b,s)=>b.setAttribute('aria-pressed',String(tr.points[s])));
 });
 persistSettings();
}
tracks.forEach((tr,i)=>{
 const row=$<HTMLElement>('[data-track="'+i+'"]');
 row.querySelector<HTMLInputElement>('.track-enabled')!.addEventListener('change',e=>{
  tr.enabled=(e.target as HTMLInputElement).checked;tr.flash.fill(-100);tr.hits.fill(-Infinity);sync();
 });
 row.querySelector<HTMLSelectElement>('.instrument-select')!.addEventListener('change',e=>{
  tr.instrument=(e.target as HTMLSelectElement).value as InstrumentId;
  tr.morph=null;if(journey?.track===i)journey=null;
  if(tr.instrument==='kick'){tr.directionMode='forward';tr.direction=1;tr.pendingDirection=null;}
  const lang=document.documentElement.lang as keyof typeof instrumentNames;
  const name=instrumentNames[lang][instrumentIds.indexOf(tr.instrument)];
  row.querySelector('.instrument-name')!.textContent=name;
  row.querySelector('.steps')!.setAttribute('aria-label',name);
  row.querySelectorAll('[data-step]').forEach((b,s)=>b.setAttribute('aria-label',name+' · '+(s+1)));
  sync();
 });
 row.querySelector<HTMLSelectElement>('.track-direction')!.addEventListener('change',e=>{
  tr.directionMode=tr.instrument==='kick'?'forward':(e.target as HTMLSelectElement).value;
  tr.pendingDirection=tr.directionMode==='random'?null:tr.directionMode==='reverse'?-1:1;
  if(!playing){if(tr.pendingDirection!==null)tr.direction=tr.pendingDirection;tr.pendingDirection=null;}
  sync();
 });
 row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b,s)=>b.addEventListener('click',()=>{tr.points[s]=!tr.points[s];sync();}));
 row.querySelector<HTMLInputElement>('.mute')!.addEventListener('change',e=>{tr.mute=(e.target as HTMLInputElement).checked;persistSettings();});
 row.querySelector<HTMLInputElement>('.track-volume')!.addEventListener('input',e=>{
  tr.volume=Number((e.target as HTMLInputElement).value);
  row.querySelector('.track-volume-value')!.textContent=Math.round(tr.volume*100)+' %';persistSettings();
 });
 row.querySelector<HTMLInputElement>('.random-dynamics')!.addEventListener('change',e=>{
  tr.randomDynamics=(e.target as HTMLInputElement).checked;
  if(!tr.randomDynamics){tr.lastVelocity=1;tr.hitVelocities.fill(1);}persistSettings();
 });
});
function currentMorph(tr:typeof tracks[number],time:number){
 const m=tr.morph;if(!m)return 0;
 const fraction=m.duration?Math.max(0,Math.min(1,(time-m.at)/m.duration)):1;
 return m.from+(m.progress-m.from)*fraction;
}
function voice(i:number,time:number,beat:number,velocity:number){
 const tr=tracks[i];
 const weights=tr.morph?morphWeights(currentMorph(tr,time)):[1,0];
 if(weights[0]>.0001)voiceInstrument(i,time,beat,velocity*weights[0],tr.instrument);
 if(tr.morph&&weights[1]>.0001)voiceInstrument(i,time,beat,velocity*weights[1],tr.morph.to);
}
function voiceInstrument(i:number,time:number,beat:number,velocity:number,id:InstrumentId){
 const tr=tracks[i];if(!audio||!master||!tr.enabled||tr.mute||tr.volume===0)return;
 const ctx=audio,profile=soundProfiles[currentStyle];
 // One shared low-pass per voice keeps harmonic layers coherent and softens metallic edges.
 const bus=ctx.createBiquadFilter();bus.type='lowpass';bus.Q.value=.55;
 bus.frequency.value=profile.cutoff;bus.connect(master);
 let sources=0;
 const ended=()=>{if(--sources===0)bus.disconnect();};
 const preset=presets[currentStyle],offset=preset.melody[Math.floor(beat/2)%preset.melody.length];
 const scaleIndex=tr.pitch+offset;
 const note=261.626*2**((preset.scale[scaleIndex%preset.scale.length]+12*Math.floor(scaleIndex/preset.scale.length))/12);
 function tone(freq:number,duration:number,level:number,type:OscillatorType='sine',end?:number,attack=.004){
  const osc=ctx.createOscillator(),gain=ctx.createGain();sources++;
  // Retain an instrument's deliberately slow attack while warming sharp plucks.
  if(attack===.004)attack*=profile.attack;
  osc.type=type;osc.frequency.setValueAtTime(freq,time);
  if(end)osc.frequency.exponentialRampToValueAtTime(end,time+Math.min(duration,.18));
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level*tr.volume*velocity),time+attack);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+duration+.02);
  osc.onended=()=>{osc.disconnect();gain.disconnect();ended();};
 }
 function noise(duration:number,level:number,frequency:number,type:BiquadFilterType='highpass',offset=0){
  sources++;
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let n=0;n<data.length;n++)data[n]=Math.random()*2-1;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),at=time+offset;
  source.buffer=buffer;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.7;
  gain.gain.setValueAtTime(Math.max(.0002,level*tr.volume*velocity),at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(at);source.stop(at+duration+.02);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();ended();};
 }
 switch(id){
  case 'kick':tone(145,.28,.3,'sine',43);break;
  case 'snare':noise(.16,.3,1400);tone(180,.09,.1,'triangle');break;
  case 'hat':noise(.055,.12,7000);break;
  case 'clap':for(let n=0;n<3;n++)noise(n===2?.14:.025,.18,1400,'bandpass',n*.018);break;
  case 'tom':tone(210,.36,.32,'sine',85);break;
  case 'rim':tone(820,.035,.17,'triangle');tone(1730,.025,.09);break;
  case 'shaker':noise(.09,.18,5000,'bandpass');break;
  case 'bass':tone(note/4,.4,.3,'triangle');break;
  case 'synthbass':tone(note/4,.34,.18,'sawtooth');tone(note/8,.4,.13);break;
  case 'marimba':tone(note,.45*profile.decay,.27);tone(note*4,.075,profile.warm?.018:.045);break;
  case 'bells':tone(note*2,profile.warm?.75:1.5,.17);tone(note*5.52,profile.warm?.25:.8,profile.warm?.02:.05);break;
  case 'kalimba':tone(note,.48*profile.decay,.23,'triangle');tone(note*2.76,.065,profile.warm?.035:.065);break;
  case 'pluck':tone(note,.25*profile.decay,.18,'triangle');tone(note*2,.09,profile.warm?.025:.07);break;
  case 'piano':
   // Strong fundamental/body, rapidly fading upper harmonics: less bell, more felt/wood.
   tone(note,.85*profile.decay,.2,'triangle',undefined,profile.warm?.012:.006);
   tone(note*1.001,1.05*profile.decay,.055,'sine',undefined,.01);
   tone(note*2,.3*profile.decay,.04);tone(note*3,.14,.012);break;
  case 'strings':
   for(const detune of [.997,1.003]){tone(note*detune,1.65,.065,'triangle',undefined,.2);tone(note*2*detune,1.5,.025,'sine',undefined,.25);}break;
  case 'guitar':
   // Warm plucked body, with a short pick transient instead of lingering glassy partials.
   tone(note/2,.6*profile.decay,.2,'triangle',undefined,.008);
   tone(note,.24,.045);tone(note*1.5,.12,profile.warm?.018:.04);
   if(!profile.warm)tone(note/2,.18,.025,'sawtooth');break;
  case 'organ':
   tone(note,.65,.13,'sine',undefined,.025);tone(note*2,.65,.06,'sine',undefined,.025);tone(note*3,.65,.035,'sine',undefined,.025);break;
  case 'pad':tone(note,1.8,.09,'sine',undefined,.28);tone(note*1.002,1.8,.07,'triangle',undefined,.28);break;
 }
}
function applyDirections(randomize=false){
 tracks.forEach(tr=>{
  if(tr.instrument==='kick'&&(!evolving||currentStyle==='sport')){tr.direction=1;tr.directionMode='forward';tr.pendingDirection=null;return;}
  if(tr.pendingDirection!==null){tr.direction=tr.pendingDirection;tr.pendingDirection=null;}
  if(randomize&&!evolving&&tr.enabled&&!tr.mute&&(evolving||tr.directionMode==='random')&&Math.random()<.4){tr.direction*=-1;tr.hits.fill(-Infinity);}
 });
 sync();
}
function evolveJourney(time:number){
 const eligible=tracks.map((tr,index)=>({tr,index})).filter(({tr})=>tr.enabled&&!tr.mute&&tr.volume>0);
 if(!eligible.length)return;
 if(journey&&!eligible.some(({index})=>index===journey!.track))journey=null;
 if(!journey){
  // Resume a partially mixed colour after a pause instead of dropping it.
  const tonal=eligible.filter(({tr})=>currentStyle!=='sport'||tr.instrument!=='kick');
  if(!tonal.length)return;
  const chosen=tonal.find(({tr})=>tr.morph)||tonal[Math.floor(Math.random()*tonal.length)];
  const palette=[...new Set(presets[currentStyle].parts.map(part=>part.instrument))];
  const percussion=['kick','snare','hat','clap','tom','rim','shaker'];
  const alternatives=palette.filter(id=>id!==chosen.tr.instrument&&(currentStyle!=='sport'||percussion.includes(id)===percussion.includes(chosen.tr.instrument)));
  if(!chosen.tr.morph&&alternatives.length)chosen.tr.morph={to:alternatives[Math.floor(Math.random()*alternatives.length)],progress:0,from:0,at:time,duration:0};
  const length=journeyLength()+((currentStyle==='focus'||currentStyle==='coffeehouse')?2:0);
  journey={track:chosen.index,cycle:chosen.tr.morph?Math.round(chosen.tr.morph.progress*length):0,length,
   pitch:Math.max(0,Math.min(presets[currentStyle].scale.length-1,chosen.tr.pitch+(Math.random()<.5?-1:1)*((currentStyle==='focus'||currentStyle==='coffeehouse')?1:2))),
   tempo:Math.max(40,Math.min(180,Math.round(bpm*(.94+Math.random()*.12))))};
 }
 const plan=journey,tr=tracks[plan.track];
 plan.cycle++;
 if(tr.morph){
  tr.morph.from=currentMorph(tr,time);tr.morph.at=time;tr.morph.duration=60/bpm*4;
  tr.morph.progress=Math.min(1,plan.cycle/plan.length);
 }
 tr.pitch=approach(tr.pitch,plan.pitch,1);
 bpm=approach(bpm,plan.tempo,2);
 $<HTMLInputElement>('#tempo').value=String(bpm);$('#tempo-value').textContent=bpm+' BPM';
 // Only one point changes, on another orbit. Never rebuild the whole groove at once.
 const rhythm=eligible.filter(({index})=>index!==plan.track);
 let changedTrack=-1;
 if(rhythm.length){
  const selected=rhythm[Math.floor(Math.random()*rhythm.length)];
  evolvePattern([selected.tr],Math.random,presets[currentStyle].grid,1);changedTrack=selected.index;
 }
 // Phase OR direction: at most one more track, never the timbre/rhythm track.
 const motion=eligible.filter(({index})=>index!==plan.track&&index!==changedTrack&&(currentStyle!=='sport'||tracks[index].instrument!=='kick'));
 if(motion.length&&Math.random()<(currentStyle==='focus'?.15:currentStyle==='sport'?.2:.4)){
  const selected=motion[Math.floor(Math.random()*motion.length)].tr;
  if(Math.random()<.5)selected.direction*=-1;
  else selected.phase=(selected.phase+(Math.random()<.5?-1:1)+16)%16;
  selected.hits.fill(-Infinity);
 }
 if(plan.cycle>=plan.length){
  journey=null;
 }
 sync();
}
function schedule(){
 if(!audio||!playing)return;
 if(nextTime<audio.currentTime-.1){stop();return;}
 while(nextTime<audio.currentTime+.1){
  let finishedMorph=false;
  tracks.forEach(tr=>{if(tr.morph&&tr.morph.progress===1&&currentMorph(tr,nextTime)>=1){
   tr.instrument=tr.morph.to;tr.morph=null;finishedMorph=true;
  }});
  if(finishedMorph)sync();
  if(step%16===0)applyDirections();
  if(step%16===0&&step>=animationStep){
   evolveAnimations();animationStep=nextEvolutionStep(step);
  }
  if(pendingStyle&&step%16===0)applyStyle(pendingStyle);
  if(evolving&&step%16===0&&step>=evolutionStep){
   evolveJourney(nextTime);evolutionStep=nextMusicStep(step);
  }
  const s=step%16,notes:{track:number;beat:number;velocity:number}[]=[];
  tracks.forEach((tr,i)=>{
   const beat=((tr.direction*s+tr.phase)%16+16)%16;
   if(tr.enabled&&!tr.mute&&tr.volume>0&&tr.points[beat]){
    const velocity=evolving
     ?approach(tr.scheduledVelocity,.65+Math.random()*.35,.06)
     :tr.randomDynamics?.45+Math.random()*.55:1;
    tr.scheduledVelocity=velocity;
    voice(i,nextTime,beat,velocity);notes.push({track:i,beat,velocity});
   }
  });
  const swing=presets[currentStyle].swing||0;
  const duration=60/bpm/4*(s%4<2?1+swing:1-swing);
  events.push({time:nextTime,step:s,duration,notes});nextTime+=duration;step++;
 }
}
function stop(){
 setEvolution(false);playing=false;if(timer)clearInterval(timer);timer=undefined;events.length=0;tracks.forEach(tr=>tr.hits.fill(-Infinity));
 if(master&&audio){master.gain.cancelScheduledValues(audio.currentTime);master.gain.setTargetAtTime(0,audio.currentTime,.01);}
 applyDirections();if(pendingStyle)applyStyle(pendingStyle);
 labelAction('#play',t.play);$('#play').setAttribute('aria-pressed','false');
}
let starting=false;
async function start(){
 if(starting)return;starting=true;
 try{
  audio??=new AudioContext();
  if(!master){master=audio.createGain();const compressor=audio.createDynamicsCompressor();master.connect(compressor);compressor.connect(audio.destination);}
  await audio.resume();if(document.hidden)return;
  master.gain.setValueAtTime(Number($<HTMLInputElement>('#volume').value),audio.currentTime);
  playing=true;step=0;evolveAnimations();animationStep=nextEvolutionStep(0);nextTime=audio.currentTime+.05;visualStep=0;visualTime=nextTime;visualDuration=60/bpm/4;
  labelAction('#play',t.pause);$('#play').setAttribute('aria-pressed','true');$('#audio-status').textContent='';
  schedule();timer=setInterval(schedule,25);
 }catch{$('#audio-status').textContent=t.error;stop();}
 finally{starting=false;}
}
$('#evolve').addEventListener('click',async()=>{
 if(starting)return;
 if(evolving){setEvolution(false);return;}
 if(!playing)await start();
 if(playing)setEvolution(true);
});
$('#play').addEventListener('click',()=>playing?stop():void start());
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
$<HTMLInputElement>('#tempo').addEventListener('input',e=>{bpm=Number((e.target as HTMLInputElement).value);$('#tempo-value').textContent=bpm+' BPM';persistSettings();});
$<HTMLInputElement>('#volume').addEventListener('input',e=>{if(master&&audio&&playing)master.gain.setTargetAtTime(Number((e.target as HTMLInputElement).value),audio.currentTime,.02);persistSettings();});
$('#clear').addEventListener('click',()=>{tracks.forEach(tr=>tr.points.fill(false));sync();});
function applyStyle(id:StyleId){
 currentStyle=id;pendingStyle=null;journey=null;const preset=presets[id];
 tracks.forEach((tr,i)=>{
  const part=preset.parts[i];tr.enabled=!!part;tr.morph=null;tr.scheduledVelocity=1;tr.phase=0;tr.direction=1;tr.directionMode='forward';tr.pendingDirection=null;tr.instrument=part?.instrument||defaultInstruments[i];
  tr.points=Array.from({length:16},(_,s)=>!!part?.steps.includes(s));tr.pitch=part?.pitch||0;tr.volume=part?.volume??.55;tr.mute=false;tr.lastVelocity=1;tr.hitVelocities.fill(1);tr.flash.fill(-100);tr.hits.fill(-Infinity);
 });
 bpm=preset.bpm;$<HTMLInputElement>('#tempo').value=String(bpm);$('#tempo-value').textContent=bpm+' BPM';
 syncStyleTiles();
 if(evolving)evolutionStep=nextMusicStep(step);
 evolveAnimations(false);
 $('#style-status').textContent='';sync();
}
function syncStyleTiles(){
 document.querySelectorAll<HTMLButtonElement>('[data-style-preset]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.stylePreset===currentStyle));
  button.classList.toggle('is-pending',button.dataset.stylePreset===pendingStyle);
 });
}
document.querySelectorAll<HTMLButtonElement>('[data-style-preset]').forEach(button=>button.addEventListener('click',()=>{
 const id=button.dataset.stylePreset as StyleId;
 if(id===currentStyle){pendingStyle=null;$('#style-status').textContent='';syncStyleTiles();return;}
 if(playing){pendingStyle=id;$('#style-status').textContent=styleCopy[language].pending;syncStyleTiles();}
 else applyStyle(id);
}));
$('#reset').addEventListener('click',()=>{const id=pendingStyle||currentStyle;if(playing){pendingStyle=id;$('#style-status').textContent=styleCopy[language].pending;}else applyStyle(id);});
$('#random').addEventListener('click',()=>{
 const preset=presets[currentStyle];journey=null;
 tracks.forEach(tr=>{if(!tr.enabled)return;tr.morph=null;tr.points=tr.points.map((_,s)=>tr.instrument==='kick'&&s%4===0?true:preset.grid.includes(s)&&Math.random()<preset.density);tr.pitch=Math.floor(Math.random()*preset.scale.length);tr.phase=tr.instrument==='kick'?0:Math.floor(Math.random()*8);tr.hits.fill(-Infinity);});sync();
});
let ownsFullscreen=false;
function focus(on:boolean,requestFullscreen=true){
 wake(on);document.body.classList.toggle('focus-view',on);
 if(!on)document.body.classList.remove('focus-idle','focus-cursor-hidden');
 $('#focus').setAttribute('aria-pressed',String(on));labelAction('#focus',on?t.exit:t.focus);
 if(on&&requestFullscreen&&!document.fullscreenElement&&document.documentElement.requestFullscreen){
  // Request directly inside the user gesture; denial falls back to the page's focus view.
  void document.documentElement.requestFullscreen().then(()=>{
   ownsFullscreen=true;
   if(!document.body.classList.contains('focus-view')&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
  }).catch(()=>{});
 }else if(!on&&ownsFullscreen&&document.fullscreenElement){
  ownsFullscreen=false;void document.exitFullscreen().catch(()=>{});
 }
}
document.addEventListener('fullscreenchange',()=>{
 if(!document.fullscreenElement&&ownsFullscreen){ownsFullscreen=false;focus(false,false);}
});
$('#focus').addEventListener('click',()=>focus(!document.body.classList.contains('focus-view')));
document.addEventListener('keydown',e=>{if(e.key==='Escape')focus(false);});
function position(e:PointerEvent,c:HTMLCanvasElement){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*c.width,y:(e.clientY-r.top)/r.height*c.height};}
orbit.addEventListener('pointerdown',e=>{
 if(!orbitAnimation)return;
 const p=position(e,orbit),x=p.x-350,y=p.y-350,r=Math.hypot(x,y);
 const active=activeTracks();if(!active.length)return;
 const nearest=active.map((entry,rank)=>({...entry,distance:Math.abs(r-radius(rank,active.length))})).sort((a,b)=>a.distance-b.distance)[0];
 if(nearest.distance>Math.min(19,92/Math.max(1,active.length-1)))return;
 const i=nearest.index;
 const s=Math.round(((Math.atan2(y,x)+Math.PI/2+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*16)%16;
 tracks[i].points[s]=!tracks[i].points[s];sync();
});
type Trail={x:number;y:number;time:number;start:boolean;color:string};
const paintedSteps=new Set<string>();
function togglePaintedStep(track:number,step:number,now:number){
 const key=track+':'+step;if(paintedSteps.has(key))return;paintedSteps.add(key);
 const tr=tracks[track];tr.points[step]=!tr.points[step];tr.flash[step]=tr.points[step]?now:-100;tr.hits[step]=-Infinity;
}
let trail:Trail[]=[],active:number|null=null,last:Trail|undefined,lastStamp=0,lastDirection:number|undefined;
function paint(e:PointerEvent,first=false){
 const active=activeTracks();if(!active.length)return;
 const p=position(e,drawing),now=performance.now(),i=active[Math.min(active.length-1,Math.max(0,Math.floor(p.y/drawing.height*active.length)))].index,s=Math.min(15,Math.max(0,Math.floor(p.x/drawing.width*16)));
 const speed=last?Math.hypot(p.x-last.x,p.y-last.y)/Math.max(1,now-last.time):0;
 const point={...p,time:now,start:first,color:colors[i]};
 const direction=last?Math.atan2(p.y-last.y,p.x-last.x):undefined;
 if(direction!==undefined&&lastDirection!==undefined&&Math.abs(Math.atan2(Math.sin(direction-lastDirection),Math.cos(direction-lastDirection)))>.4)tracks[i].pitch=(tracks[i].pitch+1)%presets[currentStyle].scale.length;
 lastDirection=direction;trail.push(point);if(trail.length>1500)trail.shift();
 if(first||now-lastStamp>35){togglePaintedStep(i,s,now);if(speed>1.6)togglePaintedStep(i,(s+1)%16,now);lastStamp=now;sync();}
 last=point;$('#draw-hint').style.display='none';
}
drawing.addEventListener('pointerdown',e=>{if(active!==null)return;active=e.pointerId;paintedSteps.clear();drawing.setPointerCapture(active);last=undefined;lastDirection=undefined;paint(e,true);});
drawing.addEventListener('pointermove',e=>{if(e.pointerId===active)paint(e);});
function end(e:PointerEvent){if(e.pointerId===active){active=null;last=undefined;}}
drawing.addEventListener('pointerup',end);drawing.addEventListener('pointercancel',end);drawing.addEventListener('lostpointercapture',end);
/** Low-resolution atmospheric lighting, driven by scheduled audible note hits. */
function renderAtmosphere(time:number,dark:boolean){
 const w=atmosphere.width,h=atmosphere.height;
 ac.clearRect(0,0,w,h);
 atmosphere.dataset.mode=backgroundMode;
 const active=activeTracks().filter(({tr})=>!tr.mute&&tr.volume>0);
 const masterLevel=Number($<HTMLInputElement>('#volume').value);
 const beats=time*bpm/60,still=reduced.matches||!playing;
 const centeredBands=backgroundMode==='aurora'||backgroundMode==='waves';
 let orbitX=w/2,orbitY=h/2,orbitHeight=h*.7;
 if(centeredBands){
  // Follow the actual on-screen orbit, including responsive layout and focus transitions.
  const target=orbit.getBoundingClientRect(),backdrop=atmosphere.getBoundingClientRect();
  if(backdrop.width&&backdrop.height){
   orbitX=(target.left+target.width/2-backdrop.left)/backdrop.width*w;
   orbitY=(target.top+target.height/2-backdrop.top)/backdrop.height*h;
   orbitHeight=target.height/backdrop.height*h;
  }
 }
 const profile={speed:.018,size:330,power:.55};
 for(const [rank,{tr,index}] of active.entries()){
  const phase=still?tr.pitch*.3:beats*profile.speed+tr.pitch*.3;
  const x=w*(.18+.64*(.5+.5*Math.sin(index*2.4+phase)));
  const y=centeredBands?orbitY+Math.cos(index*1.7+phase*.73)*28:h*(.2+.6*(.5+.5*Math.cos(index*1.7+phase*.73)));
  const age=time-Math.max(...tr.hits);
  const decay=1.5;
  const hit=playing&&age>=0&&age<2?Math.exp(-age*decay):0;
  const energy=tr.volume*tr.lastVelocity*Math.min(1,masterLevel/.3);
  const pulse=reduced.matches?0:hit*energy;
  const size=profile.size+pulse*95+(still?0:Math.sin(beats*profile.speed*3+index)*20);
  ac.globalAlpha=((dark?.13:.065)+pulse*(dark?.24:.12)*profile.power)*(centeredBands?.4:1);
  const glow=ac.createRadialGradient(x,y,0,x,y,size);
  glow.addColorStop(0,tr.color);glow.addColorStop(.4,tr.color+'99');glow.addColorStop(1,tr.color+'00');
  ac.fillStyle=glow;ac.fillRect(x-size,y-size,size*2,size*2);
  if(still)continue;
  ac.strokeStyle=tr.color;ac.fillStyle=tr.color;ac.lineWidth=2;
  if(backgroundMode==='aurora'){
   // Translucent curtains sway gently and lift with note energy.
   ac.globalAlpha=(dark?.028:.02)+pulse*.06;
   for(let ribbon=0;ribbon<3;ribbon++){
    ac.lineWidth=5+ribbon*3;ac.beginPath();
    for(let n=0;n<=40;n++){
     const px=n/40*w;
     const py=orbitY+(rank-(active.length-1)/2)*orbitHeight*.045+(ribbon-1)*orbitHeight*.02+Math.sin((px-orbitX)/w*6+phase+ribbon*.25)*orbitHeight*(.09+pulse*.12);
     if(n===0)ac.moveTo(px,py);else ac.lineTo(px,py);
    }
    ac.stroke();
   }
  }else if(backgroundMode==='stars'){
   // Stable seeds avoid random per-frame flicker; movement and twinkle follow tempo.
   for(let star=0;star<10;star++){
    const seed=index*17+star*7;
    const sx=((Math.sin(seed*12.3)*.5+.5)*w+(still?0:beats*(1+index*.2)))%w;
    const sy=(Math.cos(seed*5.7)*.5+.5)*h;
    const twinkle=.5+.5*Math.sin(seed+beats*.45);
    ac.globalAlpha=(dark?.16:.12)+twinkle*.12+pulse*.35;
    const radius=1.2+twinkle*.6+pulse*2;
    ac.beginPath();ac.arc(sx,sy,radius,0,Math.PI*2);ac.fill();
   }
  }else if(backgroundMode==='waves'){
   ac.globalAlpha=(dark?.035:.025)+pulse*.075;ac.lineWidth=1+pulse*1.5;
   for(let wave=0;wave<3;wave++){
    ac.beginPath();
    for(let n=0;n<=64;n++){
     const px=n/64*w;
     const py=orbitY+(rank-(active.length-1)/2)*orbitHeight*.035+(wave-1)*orbitHeight*.025+Math.sin((px-orbitX)/w*9-phase*3+index)*orbitHeight*(.065+pulse*.14);
     if(n===0)ac.moveTo(px,py);else ac.lineTo(px,py);
    }
    ac.stroke();
   }
  }else{
   // Light clouds have their own look, independent of the music preset.
   ac.globalAlpha=(dark?.035:.025)+pulse*.07;
   ac.lineWidth=10;ac.beginPath();
   ac.ellipse(x,y,size*.85,size*.5,phase*.1,0,Math.PI*2);ac.stroke();
  }
 }
 ac.globalAlpha=1;ac.lineWidth=1;
}
/** Coloured segments breathe together, with stronger local accents on note hits. */
function renderPulseRing(time:number,dark:boolean){
 const active=activeTracks().filter(({tr})=>!tr.mute&&tr.volume>0);
 if(!active.length)return;
 const motion=playing&&!reduced.matches,masterLevel=Math.min(1,Number($<HTMLInputElement>('#volume').value)/.3);
 const energies=active.map(({tr})=>{
  const age=time-Math.max(...tr.hits);
  return motion&&age>=0&&age<.8?Math.exp(-age*5)*tr.volume*tr.lastVelocity*masterLevel:0;
 });
 const power=Math.min(1,energies.reduce((a,b)=>a+b,0));
 const radius=23+power*18;
 active.forEach(({tr},index)=>{
  const energy=energies[index],angle=index/active.length*Math.PI*2-Math.PI/2;
  const span=Math.PI*2/active.length,gap=active.length===1?0:.06;
  oc.beginPath();oc.arc(350,350,radius+energy*9,angle+gap,angle+span-gap);
  oc.lineCap='round';oc.lineWidth=3+energy*6;oc.strokeStyle=tr.color;
  oc.globalAlpha=.3+energy*.7;oc.shadowColor=tr.color;
  oc.shadowBlur=reduced.matches?0:(dark?7:2)+energy*22;oc.stroke();
 });
 oc.shadowBlur=0;oc.globalAlpha=1;oc.lineWidth=1;oc.lineCap='butt';
}
/** Alternate centre views share the audible note envelope, never the raw wall clock. */
function renderCenterVariant(time:number,dark:boolean,mode:'filled'|'sine'|'bars'){
 const active=activeTracks().filter(({tr})=>!tr.mute&&tr.volume>0);
 if(!active.length)return;
 const motion=playing&&!reduced.matches;
 const masterLevel=Math.min(1,Number($<HTMLInputElement>('#volume').value)/.3);
 const values=active.map(({tr})=>{
  const age=time-Math.max(...tr.hits);
  const energy=motion&&age>=0&&age<.8?Math.exp(-age*5)*tr.volume*tr.lastVelocity*masterLevel:0;
  return {tr,energy};
 });
 const power=Math.min(1,values.reduce((sum,v)=>sum+v.energy,0));
 values.forEach(({tr,energy},i)=>{
  oc.strokeStyle=tr.color;oc.fillStyle=tr.color;
  oc.shadowColor=tr.color;oc.shadowBlur=reduced.matches?0:(dark?6:2)+energy*18;
  oc.globalAlpha=.35+energy*.65;
  if(mode==='filled'){
   const span=Math.PI*2/values.length,start=i*span-Math.PI/2,gap=values.length===1?0:.025;
   const outer=31+power*23+energy*9,inner=outer*.42;
   oc.beginPath();oc.arc(350,350,outer,start+gap,start+span-gap);
   oc.arc(350,350,inner,start+span-gap,start+gap,true);oc.closePath();oc.fill();
  }else if(mode==='sine'){
   const amplitude=3+energy*32;
   const phase=motion?time*bpm/60*Math.PI:0;
   oc.lineWidth=1.5+energy*2;oc.beginPath();
   for(let n=0;n<=96;n++){
    const x=-76+n*152/96;
    const envelope=Math.sin(n/96*Math.PI);
    const y=Math.sin(n/96*Math.PI*(3+tr.pitch*.35)-phase+i*.7)*amplitude*envelope;
    if(n===0)oc.moveTo(350+x,350+y);else oc.lineTo(350+x,350+y);
   }
   oc.stroke();
  }else{
   const width=Math.min(12,120/values.length-5),spacing=width+5;
   const x=350+(i-(values.length-1)/2)*spacing;
   const height=7+energy*85;
   oc.lineCap='round';oc.lineWidth=width;
   oc.beginPath();oc.moveTo(x,350-height/2);oc.lineTo(x,350+height/2);oc.stroke();
  }
 });
 oc.shadowBlur=0;oc.globalAlpha=1;oc.lineWidth=1;oc.lineCap='butt';
}
/** A small organic light surface follows the orbit heads and audible note energy. */
function renderCenter(time:number,dark:boolean){
 const active=activeTracks().filter(({tr})=>!tr.mute&&tr.volume>0);
 if(!active.length)return;
 const motion=playing&&!reduced.matches;
 const turn=motion?playbackAngle(time):0;
 const masterLevel=Math.min(1,Number($<HTMLInputElement>('#volume').value)/.3);
 const sources=active.map(({tr},index)=>{
  const age=time-Math.max(...tr.hits);
  const hit=motion&&age>=0&&age<.85?Math.exp(-age*5.5):0;
  const energy=tr.volume*tr.lastVelocity*masterLevel;
  const pitch=tr.pitch/Math.max(1,presets[currentStyle].scale.length-1);
  return {color:tr.color,angle:tr.direction*turn+tr.phase/16*Math.PI*2-Math.PI/2,
   strength:hit*energy,height:hit*energy*(65+pitch*40),index};
 });
 const dominant=[...sources].sort((a,b)=>b.strength-a.strength);
 const first=dominant[0],second=dominant[1]||first;
 const power=Math.min(1,sources.reduce((sum,source)=>sum+source.strength,0));
 // A soft corona supplies light rather than another hard ring around the centre.
 const haloRadius=48+power*65;
 const corona=oc.createRadialGradient(350,350,8,350,350,haloRadius);
 corona.addColorStop(0,first.color+'bb');corona.addColorStop(.28,first.color+'66');
 corona.addColorStop(.62,second.color+'22');corona.addColorStop(1,first.color+'00');
 oc.globalAlpha=dark?.85:.58;oc.fillStyle=corona;
 oc.fillRect(350-haloRadius,350-haloRadius,haloRadius*2,haloRadius*2);oc.globalAlpha=1;
 const glow=oc.createRadialGradient(350,350,2,350,350,86);
 glow.addColorStop(0,dark?'#fff9eaff':'#fff9ddff');
 glow.addColorStop(.15,first.color+'ff');glow.addColorStop(.5,second.color+'dd');glow.addColorStop(1,first.color+'77');
 oc.beginPath();
 for(let n=0;n<=96;n++){
  const theta=n/96*Math.PI*2;
  let height=0;
  for(const source of sources){
   const difference=Math.atan2(Math.sin(theta-source.angle),Math.cos(theta-source.angle));
   height+=(1.5+source.height)*Math.exp(-difference*difference/ .28);
  }
  const breath=motion?Math.sin(time*1.2+theta*3)*.8:0;
  const radius=Math.min(86,15+height+breath);
  const x=350+Math.cos(theta)*radius,y=350+Math.sin(theta)*radius;
  if(n===0)oc.moveTo(x,y);else oc.lineTo(x,y);
 }
 oc.closePath();oc.fillStyle=glow;oc.shadowColor=first.color;
 oc.shadowBlur=reduced.matches?0:(dark?24:10)+power*30;oc.fill();
 oc.shadowBlur=0;oc.lineWidth=1.3;oc.strokeStyle=first.color+'cc';oc.stroke();
 // Small radiant core: it remains compact while the coloured surface erupts on notes.
 const coreRadius=8+power*7;
 const core=oc.createRadialGradient(350,350,0,350,350,coreRadius);
 core.addColorStop(0,'#fffdf3');core.addColorStop(.3,dark?'#fff5dc':'#fff7df');
 core.addColorStop(.7,first.color+'dd');core.addColorStop(1,first.color+'00');
 oc.fillStyle=core;oc.shadowColor=first.color;oc.shadowBlur=reduced.matches?0:12+power*18;
 oc.beginPath();oc.arc(350,350,coreRadius,0,Math.PI*2);oc.fill();oc.shadowBlur=0;
 // Restore drawing state before the drawing-pad pass.
 oc.globalAlpha=1;oc.lineWidth=1;
}
function frame(now:number){
 const time=audio?.currentTime||0;
 while(events.length&&events[0].time<=time){const ev=events.shift()!;visualStep=ev.step;visualTime=ev.time;visualDuration=ev.duration;ev.notes.forEach(({track,beat,velocity})=>{const tr=tracks[track];if(tr.enabled&&!tr.mute&&tr.volume>0){tr.flash[beat]=now;tr.hits[beat]=ev.time;tr.hitVelocities[beat]=velocity;tr.lastVelocity=velocity;}});}
 const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
 tracks.forEach((tr,i)=>{tr.color=(dark?colors:lightColors)[i];});
 if(backgroundMode!=='off')renderAtmosphere(time,dark);
 oc.clearRect(0,0,700,700);
 const angle=playing&&orbitAnimation?playbackAngle(time):0;
 const visualMaster=Math.min(1,Number($<HTMLInputElement>('#volume').value)/.3);
 const active=activeTracks();
 if(orbitAnimation)active.forEach(({tr},rank)=>{
  const r=radius(rank,active.length);oc.beginPath();oc.arc(350,350,r,0,Math.PI*2);oc.strokeStyle=tr.color+(dark?'55':'99');oc.lineWidth=dark?1:1.4;oc.stroke();
  // Each orbit carries a continuous comet; audible notes briefly boost its glow.
  if(playing&&orbitAnimation&&!reduced.matches){
   const age=time-Math.max(...tr.hits);
   const level=tr.volume*tr.lastVelocity*visualMaster;
   const pulse=!tr.mute&&tr.volume>0&&age>=0&&age<.65?Math.pow(1-age/.65,.8)*level:0;
   const head=tr.direction*angle+tr.phase/16*Math.PI*2-Math.PI/2,length=.85,segments=32;
   const muted=tr.mute||tr.volume===0;
   const brightness=(muted?.1:(dark?.18:.23)+(dark?.25:.3)*level)+pulse*.65;
   oc.lineCap='round';
   if(orbitMode==='comet')for(let n=segments;n>0;n--){
    const strength=Math.pow(1-n/(segments+1),1.5)*brightness;
    oc.beginPath();oc.arc(350,350,r,head-tr.direction*n*length/segments,head-tr.direction*(n-1)*length/segments,tr.direction<0);
    oc.strokeStyle=tr.color;oc.lineWidth=4+pulse*3;oc.globalAlpha=strength;
    oc.shadowColor=tr.color;oc.shadowBlur=(dark?9:3)+pulse*(dark?16:6);oc.stroke();
   }
   oc.shadowBlur=dark?8+pulse*12:3;oc.globalAlpha=Math.min(1,brightness+.15);
   oc.beginPath();oc.arc(350+Math.cos(head)*r,350+Math.sin(head)*r,3.2+pulse*2,0,Math.PI*2);
   oc.fillStyle=tr.color;oc.fill();
   if(orbitMode==='pulse'){
    oc.shadowBlur=0;oc.lineWidth=1.5+pulse;oc.globalAlpha=.25+pulse*.55;
    oc.beginPath();oc.arc(350+Math.cos(head)*r,350+Math.sin(head)*r,8+pulse*15,0,Math.PI*2);
    oc.strokeStyle=tr.color;oc.stroke();
   }
   oc.globalAlpha=1;oc.shadowBlur=0;oc.lineCap='butt';oc.lineWidth=1;
  }
  for(let s=0;s<16;s++){
   const a=s/16*Math.PI*2-Math.PI/2,x=350+Math.cos(a)*r,y=350+Math.sin(a)*r;
   const pulse=reduced.matches||!orbitAnimation?0:Math.max(0,1-(now-tr.flash[s])/550)*tr.volume*tr.hitVelocities[s]*visualMaster,on=tr.points[s];
   oc.globalAlpha=tr.mute?.28:1;oc.shadowColor=tr.color;oc.shadowBlur=on?(dark?15:6)+pulse*22:0;
   oc.beginPath();oc.arc(x,y,on?5+pulse*3:3,0,Math.PI*2);oc.fillStyle=on?tr.color:(dark?'#101c28':'#fcfdf8');oc.fill();oc.strokeStyle=tr.color;oc.stroke();oc.shadowBlur=0;
   if(pulse>0){oc.beginPath();oc.arc(x,y,10+(1-pulse)*18,0,Math.PI*2);oc.strokeStyle=tr.color;oc.globalAlpha=pulse*.6;oc.stroke();}
   oc.globalAlpha=1;
  }
 });

 if(centerMode==='sun')renderCenter(time,dark);
 else if(centerMode==='ring')renderPulseRing(time,dark);
 else if(centerMode!=='off')renderCenterVariant(time,dark,centerMode);
 dc.clearRect(0,0,700,440);trail=trail.filter(p=>now-p.time<2200);
 for(let n=1;n<trail.length;n++){const a=trail[n-1],b=trail[n];if(b.start)continue;dc.globalAlpha=Math.max(0,1-(now-b.time)/2200);const color=dark?b.color:lightColors[colors.indexOf(b.color)];dc.strokeStyle=color;dc.shadowColor=color;dc.shadowBlur=reduced.matches?0:dark?16:7;dc.lineWidth=3;dc.lineCap='round';dc.beginPath();dc.moveTo(a.x,a.y);dc.lineTo(b.x,b.y);dc.stroke();}
 dc.globalAlpha=1;dc.shadowBlur=0;
 if(!trail.length&&active===null)$('#draw-hint').style.display='';
 requestAnimationFrame(frame);
}
enhanceClockSelects($('.instruments-tile') as HTMLFormElement);
function restoreSettings(){
 if(!storageAllowed())return;
 try{
  const saved=decodeSettings(localStorage.getItem(STORAGE_KEY));if(!saved)return;
  applyStyle(saved.style);bpm=saved.bpm;
  $<HTMLInputElement>('#tempo').value=String(bpm);$('#tempo-value').textContent=bpm+' BPM';
  $<HTMLInputElement>('#volume').value=String(saved.volume);
  saved.tracks.forEach((source,i)=>{
   const tr=tracks[i];
   tr.enabled=source.enabled;tr.mute=source.mute;tr.instrument=source.instrument;tr.points=[...source.points];
   tr.volume=source.volume;tr.pitch=source.pitch;tr.phase=source.phase;tr.direction=source.direction;
   tr.directionMode=source.directionMode;tr.randomDynamics=source.randomDynamics;
   tr.morph=source.morph?{...source.morph,from:source.morph.progress,at:0,duration:0}:null;
  });
  selectCenterMode(saved.center);selectBackgroundMode(saved.background);selectOrbitMode(saved.orbit);
 }catch{}
}
restoreSettings();sync();persistenceReady=true;requestAnimationFrame(frame);
