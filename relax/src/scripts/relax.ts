import {wavePositionPicker} from '../lib/wave-position';
import {applyPreset,matchingPreset,presetNames,type Preset} from '../lib/presets';
import {waveDirections,defaults,normalize,timeLabel,selectedInstrument,fadeWindow,type Settings} from '../lib/relax';
import {Soundscape,type NoteEvent} from '../lib/audio';
import {dictionaries} from '../lib/relax-i18n';
import {storageAllowed} from '../lib/storage';
import {screenWakeLock} from '../lib/wake-lock';
const t=dictionaries[document.documentElement.lang as keyof typeof dictionaries]||dictionaries.en;
const el=(id:string)=>document.getElementById(id)!;
const input=(id:string)=>el(id) as HTMLInputElement;
const form=el('relax-form') as HTMLFormElement,start=el('start') as HTMLButtonElement,end=el('end-session') as HTMLButtonElement;
const sleepScreen=el('sleep-screen') as HTMLDialogElement;
const first=el('first-start-dialog') as HTMLDialogElement,safety=el('safety-dialog') as HTMLDialogElement;
const KEY='jacktools.relax.settings.v1';
let settings:Settings=normalize(defaults);
try{if(storageAllowed())settings=normalize(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(reduced.matches)settings.motion=false;
let state:'ready'|'running'|'paused'|'ended'='ready',elapsed=0,anchor=0,total=0,pending=false,generation=0;
const wake=screenWakeLock(el('wake-status'),'',t.awakeError);
const stage=el('sound-shapes');
function shape(note:NoteEvent){
 if(!settings.instrumentsEnabled||!settings.motion||!settings.instrumentAnimation||document.hidden||state!=='running')return;
 const node=document.createElement('div');node.className='sound-shape shape-'+note.index%4+' instrument-'+note.instrument;
 node.style.setProperty('--tone-colour','var(--relax-tone-'+note.index+')');
 node.style.setProperty('--life',Math.max(2.8,note.duration)+'s');
 node.style.left=(12+Math.random()*58)+'%';node.style.top=(10+Math.random()*58)+'%';
 node.style.width=(note.instrument==='kalimba'?8+Math.random()*7:note.instrument==='harp'?5+Math.random()*4:note.instrument==='gong'?38+Math.random()*12:24+Math.random()*20)+'%';
 node.dataset.note=String(note.index);stage.append(node);
 node.addEventListener('animationend',()=>node.remove(),{once:true});
 while(stage.querySelectorAll('.sound-shape').length>8)stage.querySelector('.sound-shape')?.remove();
}
const audio=new Soundscape(settings,shape);
const glow=document.querySelector<HTMLElement>('.ambient-glow')!;
const ocean=el('ocean-wave'),surface=el('ocean-surface');
const nextWavePosition=wavePositionPicker();
const waveProfiles=new Map<string,{peak:number;width:number;height:number}>();
function rainFrame(){
 const enabled=settings.stream&&settings.streamAnimation&&settings.motion&&!reduced.matches&&settings.streamVolume>0;
 if(!enabled||state==='ready'||state==='ended')ocean.setAttribute('data-hidden','true');
 else if(state==='running'&&!document.hidden){
  const waves=audio.oceanState()||[];
  if(!waves.length)ocean.setAttribute('data-hidden','true');
  else{
   ocean.removeAttribute('data-hidden');
   const group=el('ocean-direction');
   const keys=new Set(waves.map(w=>w.key));
   for(const key of waveProfiles.keys())if(!keys.has(key))waveProfiles.delete(key);
   group.querySelectorAll('[data-wave]').forEach(node=>{if(!keys.has((node as SVGElement).dataset.wave!))node.remove();});
   for(const wave of waves){
    if(!waveProfiles.has(wave.key))waveProfiles.set(wave.key,{peak:nextWavePosition(),width:160+Math.random()*110,height:260+Math.random()*460});
    const profile=waveProfiles.get(wave.key)!;
    let node=Array.from(group.querySelectorAll<SVGPathElement>('[data-wave]')).find(n=>n.dataset.wave===wave.key);
    if(!node){node=document.createElementNS('http://www.w3.org/2000/svg','path');node.dataset.wave=wave.key;node.setAttribute('fill','url(#ocean-gradient)');group.append(node);}
    // A single smooth crest; its lateral position stays fixed during this wave.
    const baseline=1040-wave.level*180;
    const height=(x:number)=>baseline-wave.level*profile.height*Math.exp(-(((x-profile.peak)/profile.width)**2));
    let path='M -100 '+height(-100);
    for(let x=-80;x<=1100;x+=20)path+=' L '+x+' '+height(x);
    node.setAttribute('d',path+' L 1100 1200 L -100 1200 Z');
   }
   // Retain the inspection path without drawing a duplicate layer.
   surface.setAttribute('d',group.querySelector('[data-wave]')?.getAttribute('d')||'');
   surface.setAttribute('fill','none');
  }
 }
 el('ocean-direction').setAttribute('transform','rotate('+({bottom:0,top:180,left:90,right:-90}[settings.waveDirection])+' 500 500)');

 const windAnimated=settings.windAnimation&&settings.wind&&settings.motion&&!reduced.matches&&(state==='running'||state==='paused');
 glow.dataset.windAnimated=String(windAnimated);
 if(!windAnimated)glow.style.setProperty('--wind-level','0');
 else if(state==='running'&&!document.hidden)glow.style.setProperty('--wind-level',String(audio.windStrength()));
 for(const layer of ['fire'] as const){
  const events=audio.takeNatureEvents(layer);
  if(state==='running'&&!document.hidden&&settings.motion&&!reduced.matches){
   for(const event of events){
    const node=document.createElement('span');node.className='nature-glimmer '+layer+'-glimmer';
    node.style.left=(12+Math.random()*76)+'%';node.style.top='100%';
    const smokeSize=85+Math.random()*65+event.strength*70;
    // Carry the entire expanded plume past the top, not just its leading edge.
    node.style.setProperty('--smoke-rise',(-stage.clientHeight-smokeSize*2.2*1.8)+'px');
    node.style.setProperty('--smoke-drift',(Math.random()*100-50)+'px');
    node.style.setProperty('--smoke-sway',(12+Math.random()*18)+'px');
    node.style.setProperty('--smoke-life',(8+Math.random()*4)+'s');
    node.style.setProperty('--nature-size',smokeSize+'px');
    node.style.setProperty('--nature-colour','var(--relax-tone-'+(layer==='fire'?0:4)+')');
    stage.append(node);node.addEventListener('animationend',()=>node.remove(),{once:true});
   }
  }
  while(stage.querySelectorAll('.'+layer+'-glimmer').length>64)stage.querySelector('.'+layer+'-glimmer')?.remove();
 }
 const drops=audio.takeRainDrops();
 if(state==='running'&&!document.hidden&&settings.motion&&settings.rainAnimation){
  for(const drop of drops){
   const node=document.createElement('span');node.className='rain-drop';
   node.style.left=(8+Math.random()*84)+'%';node.style.top=(12+Math.random()*76)+'%';
   node.style.setProperty('--drop-size',(5+drop.strength*16)+'px');
   node.style.setProperty('--drop-colour','var(--relax-tone-'+(drop.variant*2)+')');
   stage.append(node);node.addEventListener('animationend',()=>node.remove(),{once:true});
  }
  while(stage.querySelectorAll('.rain-drop').length>20)stage.querySelector('.rain-drop')?.remove();
 }
 requestAnimationFrame(rainFrame);
}
requestAnimationFrame(rainFrame);
function save(){if(!storageAllowed())return;try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{el('audio-status').textContent=document.querySelector<HTMLElement>('#clear-storage')!.dataset.error!;}}
function sync(){
 document.querySelectorAll<HTMLInputElement>('[name=waveDirection]').forEach(r=>r.checked=r.value===settings.waveDirection);
 el('wave-direction-value').textContent=t.waveDirectionNames[waveDirections.indexOf(settings.waveDirection)]!;
 const preset=matchingPreset(settings);
 el('preset-value').textContent=preset==='custom'?t.customMix:t.presetTitles[presetNames.indexOf(preset)]!;
 document.querySelectorAll<HTMLInputElement>('[name=preset]').forEach(r=>r.checked=r.value===preset);
 document.querySelectorAll<HTMLInputElement>('[name=instrument]').forEach(r=>r.checked=r.value===selectedInstrument(settings));
 el('instrument-value').textContent=t[selectedInstrument(settings)];
 for(const key of ['fire','stream','fireAnimation','streamAnimation','sleepMode','instrumentsEnabled','windAnimation','instrumentAnimation','rainAnimation','rain','wind','noise','motion','awake','background'] as const)input(key).checked=settings[key];
 for(const key of ['fireVolume','streamVolume','fireDensity','streamFlow','windActivity','rainDensity','pitch','minutes','density','instrumentVolume','rainVolume','windVolume','noiseVolume'] as const){
  input(key).value=String(settings[key]);const output=document.getElementById(key+'-value');if(output)output.textContent=(key==='rainDensity'||key==='windActivity'||key==='fireDensity'||key==='streamFlow')?settings[key]+' / 10':key==='pitch'?(settings.pitch===0?t.pitchOriginal:(settings.pitch>0?'+':'')+settings.pitch+' '+t.semitones):settings[key]+' %';
 }
 document.querySelectorAll<HTMLInputElement>('[name=noiseType]').forEach(r=>r.checked=r.value===settings.noiseType);
 document.documentElement.dataset.relaxMotion=settings.motion?'on':'off';
}
function current(){return state==='running'?elapsed+(audio.time-anchor):elapsed;}
function render(){
 document.documentElement.dataset.relaxState=state;
 const time=current(),remaining=Math.max(0,total-time),progress=el('session-progress') as HTMLProgressElement;
 el('session').textContent=total?t.remaining+' '+timeLabel(remaining):'∞';
 el('sleep-remaining').textContent=total?timeLabel(remaining):'∞';
 el('dim-screen').hidden=!settings.sleepMode||state!=='running';
 if(sleepScreen.open&&(!settings.sleepMode||state!=='running'))sleepScreen.close();
 progress.hidden=!total;progress.max=total||1;progress.value=Math.min(time,total);
 el('state').textContent=state==='running'?(total&&remaining<=fadeWindow(total,settings.sleepMode)?t.fade:t.running):state==='paused'?t.paused:state==='ended'?t.done:t.ready;
 const label=state==='running'?t.pause:state==='paused'?t.resume:t.start;
 start.setAttribute('aria-label',label);start.title=label;start.disabled=pending;
 el('start-icon').setAttribute('d',state==='running'?'M7 5h4v14H7Zm6 0h4v14h-4Z':'m8 5 11 7-11 7Z');
 end.disabled=state!=='running'&&state!=='paused'&&!pending;
 if(state==='running'&&total&&time>=total){finish();return;}
}
async function begin(){
 if(pending||!form.reportValidity()||document.hidden)return;
 const fresh=state!=='paused';if(fresh){elapsed=0;total=settings.minutes*60;}
 pending=true;const token=++generation;render();
 try{
  await audio.start(settings,total?Math.max(.01,total-elapsed):0,total);
  if(token!==generation){audio.stop();return;}
  anchor=audio.time;state='running';el('audio-status').textContent='';wake(settings.awake&&!settings.sleepMode);stage.querySelectorAll<HTMLElement>('.sound-shape,.rain-drop,.nature-glimmer').forEach(n=>n.style.animationPlayState='running');
 }catch{audio.stop();el('audio-status').textContent=t.audioError;}
 finally{pending=false;render();}
}
function pause(){
 if(state!=='running')return;
 elapsed=current();state='paused';generation++;audio.stop();wake(false);
 stage.querySelectorAll<HTMLElement>('.sound-shape,.rain-drop,.nature-glimmer').forEach(n=>n.style.animationPlayState='paused');render();
}
function finish(){
 if(state==='running')elapsed=current();
 generation++;pending=false;state='ended';audio.stop();wake(false);stage.replaceChildren();render();
}
el('dim-screen').addEventListener('click',()=>{if(state==='running'&&settings.sleepMode)sleepScreen.showModal();});
sleepScreen.addEventListener('close',()=>{if(!el('dim-screen').hidden)el('dim-screen').focus();});
start.addEventListener('click',()=>{
 if(state==='running'){pause();return;}
 if(!form.reportValidity())return;
 if(!settings.safetySeen){first.showModal();return;}
 void begin();
});
el('safety-continue').addEventListener('click',()=>{settings.safetySeen=true;save();first.close();void begin();});
first.addEventListener('close',()=>start.focus());
end.addEventListener('click',()=>{finish();start.focus();});
el('safety-open').addEventListener('click',()=>{pause();safety.showModal();});
safety.addEventListener('close',()=>el('safety-open').focus());
form.addEventListener('submit',e=>e.preventDefault());
function read(){
 const selected=document.querySelector<HTMLInputElement>('[name=instrument]:checked')!.value;
 for(const key of ['chimes','bowls','kalimba','handpan','bells','gong','harp'] as const)settings[key]=key===selected;
 for(const key of ['fire','stream','fireAnimation','streamAnimation','sleepMode','instrumentsEnabled','windAnimation','instrumentAnimation','rainAnimation','rain','wind','noise','motion','awake','background'] as const)settings[key]=input(key).checked;
 for(const key of ['fireVolume','streamVolume','fireDensity','streamFlow','windActivity','rainDensity','pitch','minutes','density','instrumentVolume','rainVolume','windVolume','noiseVolume'] as const)settings[key]=Number(input(key).value);
 settings.waveDirection=document.querySelector<HTMLInputElement>('[name=waveDirection]:checked')!.value as Settings['waveDirection'];
 settings.noiseType=document.querySelector<HTMLInputElement>('[name=noiseType]:checked')!.value as Settings['noiseType'];
 applySettings();
}
function applySettings(){
 settings=normalize(settings);sync();save();audio.update(settings);wake(state==='running'&&settings.awake&&!settings.sleepMode);
 if(!settings.motion)stage.replaceChildren();
 if(!settings.instrumentsEnabled||!settings.instrumentAnimation)stage.querySelectorAll('.sound-shape').forEach(n=>n.remove());
 for(const layer of ['fire','stream'] as const){
  if(!settings[layer]||!settings[layer+'Animation' as 'fireAnimation'|'streamAnimation']||settings[layer+'Volume' as 'fireVolume'|'streamVolume']===0)stage.querySelectorAll('.'+layer+'-glimmer').forEach(n=>n.remove());
 }
 if(!settings.rainAnimation||!settings.rain||settings.rainVolume===0)stage.querySelectorAll('.rain-drop').forEach(n=>n.remove());
 if(state==='ready'||state==='ended')total=settings.minutes*60;
 if(document.hidden&&!settings.background)pause();render();
}
form.addEventListener('input',event=>{
 if((event.target as HTMLInputElement).name==='preset')return;
 if(form.checkValidity())read();
});
const presetDropdown=el('preset-dropdown') as HTMLDetailsElement;
presetDropdown.addEventListener('change',event=>{
 const selected=(event.target as HTMLInputElement).value;
 if(!presetNames.includes(selected as Preset))return;
 settings=applyPreset(settings,selected as Preset);applySettings();
 presetDropdown.open=false;presetDropdown.querySelector('summary')!.focus();
});
document.addEventListener('click',event=>{
 if(!presetDropdown.contains(event.target as Node))presetDropdown.open=false;
});
presetDropdown.addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.stopPropagation();presetDropdown.open=false;presetDropdown.querySelector('summary')!.focus();}
});
const instrumentDropdown=el('instrument-dropdown') as HTMLDetailsElement;
instrumentDropdown.addEventListener('change',()=>{
 instrumentDropdown.open=false;instrumentDropdown.querySelector('summary')!.focus();
});
document.addEventListener('click',event=>{
 if(!instrumentDropdown.contains(event.target as Node))instrumentDropdown.open=false;
});
instrumentDropdown.addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.stopPropagation();instrumentDropdown.open=false;instrumentDropdown.querySelector('summary')!.focus();}
});
document.querySelectorAll<HTMLButtonElement>('[data-step-target]').forEach(button=>button.addEventListener('click',()=>{
 const field=input(button.dataset.stepTarget!);if(!field.value)field.value=field.min||'0';
 if(button.dataset.stepDirection==='1')field.stepUp();else field.stepDown();
 field.dispatchEvent(new Event('input',{bubbles:true}));
}));
const focus=el('focus') as HTMLButtonElement;let owns=false,requesting=false;
let cursorTimer:number|undefined;
function cursorActivity(){
 if(cursorTimer!==undefined){window.clearTimeout(cursorTimer);cursorTimer=undefined;}
 document.body.classList.remove('focus-cursor-hidden');
 if(!document.body.classList.contains('focus-view'))return;
 cursorTimer=window.setTimeout(()=>{
  cursorTimer=undefined;
  if(document.body.classList.contains('focus-view')&&!document.querySelector('dialog[open]')){
   document.body.classList.add('focus-cursor-hidden');
  }
 },3000);
}
document.addEventListener('pointermove',cursorActivity,{passive:true});
document.addEventListener('pointerdown',cursorActivity,{passive:true});
document.addEventListener('keydown',cursorActivity);
document.querySelectorAll('dialog').forEach(dialog=>{
 dialog.addEventListener('close',cursorActivity);
 new MutationObserver(cursorActivity).observe(dialog,{attributes:true,attributeFilter:['open']});
});
function setFocus(enabled:boolean){document.body.classList.toggle('focus-view',enabled);cursorActivity();focus.setAttribute('aria-pressed',String(enabled));focus.setAttribute('aria-label',enabled?t.leave:t.focus);focus.title=enabled?t.leave:t.focus;focus.querySelector('span')!.textContent=enabled?t.leave:t.focus;}
async function leave(){setFocus(false);if(owns&&document.fullscreenElement)try{await document.exitFullscreen();}catch{}focus.focus();}
focus.addEventListener('click',async()=>{
 if(document.body.classList.contains('focus-view')){await leave();return;}
 setFocus(true);if(document.fullscreenElement||requesting||!document.documentElement.requestFullscreen)return;
 requesting=true;try{await document.documentElement.requestFullscreen();owns=document.fullscreenElement===document.documentElement;if(!document.body.classList.contains('focus-view')&&owns)await leave();}catch{}finally{requesting=false;}
});
document.addEventListener('fullscreenchange',()=>{if(requesting&&document.fullscreenElement===document.documentElement)owns=true;if(!document.fullscreenElement&&owns){owns=false;setFocus(false);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!first.open&&!safety.open&&!sleepScreen.open)void leave();});
document.addEventListener('visibilitychange',()=>{
 stage.querySelectorAll<HTMLElement>('.sound-shape,.rain-drop,.nature-glimmer').forEach(n=>n.style.animationPlayState=document.hidden||state!=='running'?'paused':'running');
 if(document.hidden&&!settings.background)pause();else render();
});
window.addEventListener('pagehide',()=>{generation++;audio.stop();state='paused';wake(false);});
document.addEventListener('storage-enabled',save);
document.addEventListener('preferences-cleared',()=>{try{localStorage.removeItem(KEY);}catch{}});
reduced.addEventListener('change',e=>{if(e.matches){settings.motion=false;stage.replaceChildren();sync();}});
setInterval(()=>{if(state==='running'){if(!audio.running){pause();return;}render();}},250);
sync();total=settings.minutes*60;render();

const waveDropdown=el('wave-direction-dropdown') as HTMLDetailsElement;
waveDropdown.addEventListener('change',()=>{waveDropdown.open=false;waveDropdown.querySelector('summary')!.focus();});
document.addEventListener('click',e=>{if(!waveDropdown.contains(e.target as Node))waveDropdown.open=false;});
waveDropdown.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();waveDropdown.open=false;waveDropdown.querySelector('summary')!.focus();}});
