import {defaults,normalize,timeLabel,type Settings} from '../lib/relax';
import {Soundscape,type NoteEvent} from '../lib/audio';
import {dictionaries} from '../lib/relax-i18n';
import {storageAllowed} from '../lib/storage';
import {screenWakeLock} from '../lib/wake-lock';
const t=dictionaries[document.documentElement.lang as keyof typeof dictionaries]||dictionaries.en;
const el=(id:string)=>document.getElementById(id)!;
const input=(id:string)=>el(id) as HTMLInputElement;
const form=el('relax-form') as HTMLFormElement,start=el('start') as HTMLButtonElement,end=el('end-session') as HTMLButtonElement;
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
 if(!settings.motion||!settings.instrumentAnimation||document.hidden||state!=='running')return;
 const node=document.createElement('div');node.className='sound-shape shape-'+note.index%4;
 node.style.setProperty('--tone-colour','var(--relax-tone-'+note.index+')');
 node.style.setProperty('--life',Math.max(5,note.duration)+'s');
 node.style.left=(12+Math.random()*58)+'%';node.style.top=(10+Math.random()*58)+'%';
 node.style.width=(24+Math.random()*20)+'%';
 node.dataset.note=String(note.index);stage.append(node);
 node.addEventListener('animationend',()=>node.remove(),{once:true});
 while(stage.querySelectorAll('.sound-shape').length>8)stage.querySelector('.sound-shape')?.remove();
}
const audio=new Soundscape(settings,shape);
const glow=document.querySelector<HTMLElement>('.ambient-glow')!;
function rainFrame(){
 const windAnimated=settings.windAnimation&&settings.wind&&settings.motion&&!reduced.matches&&(state==='running'||state==='paused');
 glow.dataset.windAnimated=String(windAnimated);
 if(!windAnimated)glow.style.setProperty('--wind-level','0');
 else if(state==='running'&&!document.hidden)glow.style.setProperty('--wind-level',String(audio.windStrength()));
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
 document.querySelectorAll<HTMLInputElement>('[name=instrument]').forEach(r=>r.checked=r.value===(settings.bowls?'bowls':'chimes'));
 el('instrument-value').textContent=settings.bowls?t.bowls:t.chimes;
 for(const key of ['windAnimation','instrumentAnimation','rainAnimation','rain','wind','noise','motion','awake','background'] as const)input(key).checked=settings[key];
 for(const key of ['windActivity','rainDensity','pitch','minutes','density','instrumentVolume','rainVolume','windVolume','noiseVolume'] as const){
  input(key).value=String(settings[key]);const output=document.getElementById(key+'-value');if(output)output.textContent=(key==='rainDensity'||key==='windActivity')?settings[key]+' / 10':key==='pitch'?(settings.pitch===0?t.pitchOriginal:(settings.pitch>0?'+':'')+settings.pitch+' '+t.semitones):settings[key]+' %';
 }
 document.querySelectorAll<HTMLInputElement>('[name=noiseType]').forEach(r=>r.checked=r.value===settings.noiseType);
 document.documentElement.dataset.relaxMotion=settings.motion?'on':'off';
}
function current(){return state==='running'?elapsed+(audio.time-anchor):elapsed;}
function render(){
 document.documentElement.dataset.relaxState=state;
 const time=current(),remaining=Math.max(0,total-time),progress=el('session-progress') as HTMLProgressElement;
 el('session').textContent=total?t.remaining+' '+timeLabel(remaining):'∞';
 progress.hidden=!total;progress.max=total||1;progress.value=Math.min(time,total);
 el('state').textContent=state==='running'?(total&&remaining<=4?t.fade:t.running):state==='paused'?t.paused:state==='ended'?t.done:t.ready;
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
  await audio.start(settings,total?Math.max(.01,total-elapsed):0);
  if(token!==generation){audio.stop();return;}
  anchor=audio.time;state='running';el('audio-status').textContent='';wake(settings.awake);stage.querySelectorAll<HTMLElement>('.sound-shape,.rain-drop').forEach(n=>n.style.animationPlayState='running');
 }catch{audio.stop();el('audio-status').textContent=t.audioError;}
 finally{pending=false;render();}
}
function pause(){
 if(state!=='running')return;
 elapsed=current();state='paused';generation++;audio.stop();wake(false);
 stage.querySelectorAll<HTMLElement>('.sound-shape,.rain-drop').forEach(n=>n.style.animationPlayState='paused');render();
}
function finish(){
 if(state==='running')elapsed=current();
 generation++;pending=false;state='ended';audio.stop();wake(false);stage.replaceChildren();render();
}
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
 settings.bowls=document.querySelector<HTMLInputElement>('[name=instrument]:checked')!.value==='bowls';settings.chimes=!settings.bowls;
 for(const key of ['windAnimation','instrumentAnimation','rainAnimation','rain','wind','noise','motion','awake','background'] as const)settings[key]=input(key).checked;
 for(const key of ['windActivity','rainDensity','pitch','minutes','density','instrumentVolume','rainVolume','windVolume','noiseVolume'] as const)settings[key]=Number(input(key).value);
 settings.noiseType=document.querySelector<HTMLInputElement>('[name=noiseType]:checked')!.value as Settings['noiseType'];
 settings=normalize(settings);sync();save();audio.update(settings);wake(state==='running'&&settings.awake);
 if(!settings.motion)stage.replaceChildren();
 if(!settings.instrumentAnimation)stage.querySelectorAll('.sound-shape').forEach(n=>n.remove());
 if(!settings.rainAnimation||!settings.rain||settings.rainVolume===0)stage.querySelectorAll('.rain-drop').forEach(n=>n.remove());
 if(state==='ready'||state==='ended')total=settings.minutes*60;
 if(document.hidden&&!settings.background)pause();render();
}
form.addEventListener('input',()=>{if(form.checkValidity())read();});
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
function setFocus(enabled:boolean){document.body.classList.toggle('focus-view',enabled);focus.setAttribute('aria-pressed',String(enabled));focus.setAttribute('aria-label',enabled?t.leave:t.focus);focus.title=enabled?t.leave:t.focus;focus.querySelector('span')!.textContent=enabled?t.leave:t.focus;}
async function leave(){setFocus(false);if(owns&&document.fullscreenElement)try{await document.exitFullscreen();}catch{}focus.focus();}
focus.addEventListener('click',async()=>{
 if(document.body.classList.contains('focus-view')){await leave();return;}
 setFocus(true);if(document.fullscreenElement||requesting||!document.documentElement.requestFullscreen)return;
 requesting=true;try{await document.documentElement.requestFullscreen();owns=document.fullscreenElement===document.documentElement;if(!document.body.classList.contains('focus-view')&&owns)await leave();}catch{}finally{requesting=false;}
});
document.addEventListener('fullscreenchange',()=>{if(requesting&&document.fullscreenElement===document.documentElement)owns=true;if(!document.fullscreenElement&&owns){owns=false;setFocus(false);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!first.open&&!safety.open)void leave();});
document.addEventListener('visibilitychange',()=>{
 stage.querySelectorAll<HTMLElement>('.sound-shape,.rain-drop').forEach(n=>n.style.animationPlayState=document.hidden||state!=='running'?'paused':'running');
 if(document.hidden&&!settings.background)pause();else render();
});
window.addEventListener('pagehide',()=>{generation++;audio.stop();state='paused';wake(false);});
document.addEventListener('storage-enabled',save);
document.addEventListener('preferences-cleared',()=>{try{localStorage.removeItem(KEY);}catch{}});
reduced.addEventListener('change',e=>{if(e.matches){settings.motion=false;stage.replaceChildren();sync();}});
setInterval(()=>{if(state==='running'){if(!audio.running){pause();return;}render();}},250);
sync();total=settings.minutes*60;render();
