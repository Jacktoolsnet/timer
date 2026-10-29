import {enhanceClockSelects} from '../../../shared/preview-selects';
import {defaults,normalize,pulseAt,tappedTempo,type Settings,type Accent} from '../lib/metronome';
import {copy} from '../lib/metronome-i18n';
import type {Language} from '../lib/i18n';
import {storageAllowed} from '../lib/storage';
import {STORAGE_KEY} from '../lib/engine';
const t=copy[document.documentElement.lang as Language]||copy.en;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let settings:Settings=normalize(defaults);
try { if(storageAllowed()) settings=normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')); }catch{}
let running=false,starting=false,generation=0,context:AudioContext|undefined;
let interval:number|undefined,animation=0,nextTime=0,nextIndex=0,epoch=0;
let displayedIndex=-1,events:{time:number;index:number}[]=[],taps:number[]=[];
const sources=new Set<AudioScheduledSourceNode>();
const stage=document.querySelector<HTMLElement>('.instrument-stage')!;
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const now=()=>context?.state==='running'?context.currentTime:performance.now()/1000;
function save(){if(storageAllowed())try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{ $('audio-error').textContent=t.saved; }}
function drawBeats(){
 const buttons=$('beat-buttons');buttons.replaceChildren();const marks=$('orbit-marks');marks.replaceChildren();
 settings.accents.forEach((accent,i)=>{
  const button=document.createElement('button');button.type='button';button.dataset.accent=String(accent);button.setAttribute('aria-label',`${t.beat} ${i+1}: ${t.states[accent]}`);
  const number=document.createElement('b');number.textContent=String(i+1);const symbol=document.createElement('span');symbol.textContent=['—','•','••'][accent];symbol.setAttribute('aria-hidden','true');button.append(number,symbol);
  button.addEventListener('click',()=>{settings.accents[i]=((accent+2)%3) as Accent;changed();});buttons.append(button);
  const a=i/settings.beats*Math.PI*2;const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx',String(180+145*Math.sin(a)));circle.setAttribute('cy',String(180-145*Math.cos(a)));circle.setAttribute('r',accent===2?'6':'4');circle.setAttribute('class','orbit-mark');circle.dataset.accent=String(accent);marks.append(circle);
 });
}
function sync(){
 ($<HTMLInputElement>('bpm')).value=String(settings.bpm);($<HTMLInputElement>('tempo-range')).value=String(settings.bpm);
 for(const [id,key] of [['beats','beats'],['subdivision','subdivision'],['sound','sound'],['audible-bars','audibleBars'],['silent-bars','silentBars']] as const) ($<HTMLInputElement>(id)).value=String(settings[key]);
 ($<HTMLInputElement>('volume')).value=String(Math.round(settings.volume*100));
 for(const [id,key] of [['gap','gap'],['hide-gap','hideGap'],['reduced','reduced']] as const) ($<HTMLInputElement>(id)).checked=settings[key];
 document.querySelector<HTMLElement>('.gap-options')!.hidden=!settings.gap;
 stage.dataset.view=settings.view;stage.classList.toggle('reduced',settings.reduced||motion.matches);
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===settings.view)));
 document.querySelectorAll('#metronome-settings select').forEach(select=>select.dispatchEvent(new Event('options-sync')));
 ($<HTMLButtonElement>('beats-minus')).disabled=settings.beats<=1;
 ($<HTMLButtonElement>('beats-plus')).disabled=settings.beats>=12;
 drawBeats();
}
function silence(){for(const source of sources){try{source.stop();}catch{}}sources.clear();}
function stop(message=t.ready){
 generation++;starting=false;running=false;window.clearInterval(interval);cancelAnimationFrame(animation);silence();events=[];displayedIndex=-1;
 $('start').textContent=`▶ ${t.start}`;$('start').setAttribute('aria-pressed','false');$('play-status').textContent=message;
 stage.classList.remove('gap-hidden');$('current-beat').textContent='1';$('current-bar').textContent='1';
 $('orbit-arm').style.transform='rotate(0deg)';$('pendulum-arm').style.transform='rotate(0deg)';
 document.querySelectorAll('#beat-buttons button').forEach(b=>b.classList.remove('active'));
}
function sound(time:number,index:number){
 if(!context||context.state!=='running'||settings.sound==='silent'||settings.volume===0)return;
 const pulse=pulseAt(index,settings);if(!pulse.accent)return;
 const osc=context.createOscillator(),gain=context.createGain();
 const accent=pulse.accent===2,sub=pulse.sub>0;
 osc.type=settings.sound==='wood'?'triangle':settings.sound==='digital'?'square':'sine';
 const pitch=settings.sound==='wood'?accent?1250:850:settings.sound==='digital'?accent?1500:1000:accent?880:600;
 osc.frequency.setValueAtTime(sub?pitch*.7:pitch,time);osc.frequency.exponentialRampToValueAtTime(pitch*.5,time+.045);
 const level=settings.volume*(settings.sound==='digital'?.12:.35)*(sub?.4:1);
 gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),time+.002);gain.gain.exponentialRampToValueAtTime(.0001,time+.065);
 osc.connect(gain);gain.connect(context.destination);sources.add(osc);osc.onended=()=>{sources.delete(osc);osc.disconnect();gain.disconnect();};osc.start(time);osc.stop(time+.075);
}
function schedule(){
 if(!running)return;const clock=now();
 // Never produce a burst of old clicks after a stalled event loop.
 if(clock-nextTime>.15){stop(t.paused);return;}
 while(nextTime<clock+.1){sound(nextTime,nextIndex);events.push({time:nextTime,index:nextIndex});nextIndex++;nextTime=epoch+nextIndex*60/settings.bpm/settings.subdivision;}
}
function render(){
 if(!running)return;const clock=now();let latest:typeof events[number]|undefined;
 while(events.length&&events[0].time<=clock) latest=events.shift();
 if(latest){
  displayedIndex=latest.index;const p=pulseAt(displayedIndex,settings);
  const hide=p.silent&&settings.hideGap;stage.classList.toggle('gap-hidden',hide);
  $('current-beat').textContent=String(p.beat+1);$('current-bar').textContent=String(p.bar+1);
  // Status changes only per bar: no incessant live-region beat announcements.
  const label=p.silent?t.quiet:t.playing;if($('play-status').textContent!==label)$('play-status').textContent=label;
  document.querySelectorAll('#beat-buttons button').forEach((b,i)=>b.classList.toggle('active',!hide&&i===p.beat));
 }
 if(displayedIndex>=0){
  const beatPosition=Math.max(0,(clock-epoch)*settings.bpm/60);
  if(!(settings.reduced||motion.matches)){
   $('orbit-arm').style.transform=`rotate(${beatPosition/settings.beats*360}deg)`;
   document.querySelector('.orb-halo')!.setAttribute('r',String(13+9*Math.exp(-(beatPosition%1)*8)));
   $('pendulum-arm').style.transform=`rotate(${-28*Math.cos(beatPosition*Math.PI)}deg)`;
  }
 }
 animation=requestAnimationFrame(render);
}
async function start(){
 if(starting||running)return;starting=true;const token=++generation;$('audio-error').textContent='';
 try{
  if(!context){context=new AudioContext({latencyHint:'interactive'});context.addEventListener('statechange',()=>{if(running&&context?.state!=='running')stop(t.paused);});}
  if(context.state!=='running')await context.resume();
  if(context.state!=='running')throw new Error('Audio unavailable');
 }catch{
  if(token!==generation)return;
  settings.sound='silent';context?.close().catch(()=>{});context=undefined;sync();$('audio-error').textContent=t.audioError;
 }
 if(token!==generation||document.hidden){starting=false;return;}
 starting=false;running=true;epoch=now()+.05;nextTime=epoch;nextIndex=0;displayedIndex=-1;events=[];
 $('start').textContent=`■ ${t.stop}`;$('start').setAttribute('aria-pressed','true');$('play-status').textContent=t.playing;
 schedule();interval=window.setInterval(schedule,25);animation=requestAnimationFrame(render);
}
function changed(restart=true){settings=normalize(settings);save();sync();if((running||starting)&&restart){stop();void start();}}
function tempo(value:number){if(!Number.isFinite(value)){sync();return;}settings.bpm=value;changed();}
$('start').addEventListener('click',()=>{if(running||starting)stop();else void start();});
$('bpm').addEventListener('change',()=>tempo(Number(($<HTMLInputElement>('bpm')).value)||settings.bpm));
$('tempo-range').addEventListener('input',()=>tempo(Number(($<HTMLInputElement>('tempo-range')).value)));
$('slower').addEventListener('click',()=>tempo(settings.bpm-1));$('faster').addEventListener('click',()=>tempo(settings.bpm+1));
function tap(){const time=performance.now();if(taps.length&&time-taps.at(-1)!>3000)taps=[];taps.push(time);taps=taps.slice(-9);const bpm=tappedTempo(taps);if(bpm!==null)tempo(bpm);$('tap-count').textContent=`· ${taps.length}`;}
$('tap').addEventListener('click',tap);
for(const [id,key] of [['beats','beats'],['subdivision','subdivision'],['audible-bars','audibleBars'],['silent-bars','silentBars']] as const) $(id).addEventListener('change',()=>{const v=Number(($<HTMLInputElement>(id)).value);if(!Number.isFinite(v)){sync();return;}settings[key]=v;changed();});
$('sound').addEventListener('change',()=>{settings.sound=($<HTMLSelectElement>('sound')).value as Settings['sound'];changed();});
$('volume').addEventListener('input',()=>{settings.volume=Number(($<HTMLInputElement>('volume')).value)/100;save();});
for(const [id,key] of [['gap','gap'],['hide-gap','hideGap'],['reduced','reduced']] as const) $(id).addEventListener('change',()=>{settings[key]=($<HTMLInputElement>(id)).checked;changed(key!=='reduced');});
for(const button of document.querySelectorAll<HTMLButtonElement>('button[data-view]'))button.addEventListener('click',()=>{settings.view=button.dataset.view as Settings['view'];changed(false);});
function focus(value:boolean){document.body.classList.toggle('focus-view',value);$('focus').setAttribute('aria-pressed',String(value));$('focus').textContent=`${value?t.exit:t.focus} ⛶`;}
$('focus').addEventListener('click',()=>focus(!document.body.classList.contains('focus-view')));
window.addEventListener('keydown',event=>{
 if(event.key==='Escape'){focus(false);return;}
 if(event.altKey||event.ctrlKey||event.metaKey||event.repeat||document.querySelector('dialog[open]')|| (event.target instanceof Element&&event.target.closest('input,select,textarea,button,a,summary,[contenteditable=true]')))return;
 if(event.code==='Space'){event.preventDefault();if(running||starting)stop();else void start();}
 if(event.key.toLowerCase()==='t'){event.preventDefault();tap();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(running||starting))stop(t.paused);});
window.addEventListener('pagehide',()=>stop());
motion.addEventListener('change',()=>stage.classList.toggle('reduced',settings.reduced||motion.matches));
document.addEventListener('storage-enabled',save);
// Clearing storage does not interrupt the current rhythm; it only removes persistence.
sync();

document.querySelector('#metronome-settings')?.addEventListener('submit',event=>event.preventDefault());

enhanceClockSelects(document.querySelector<HTMLFormElement>('#metronome-settings')!);

for(const [id,step] of [['beats-minus',-1],['beats-plus',1]] as const) $(id).addEventListener('click',()=>{settings.beats+=step;changed();});
