import {createClockDate} from './clock-date';
import {createFlipClock} from './flip-clock';
import {enhanceClockSelects} from './clock-selects';
import {storageAllowed} from '../lib/storage';
import {screenWakeLock} from '../lib/wake-lock';
const $=(id:string)=>document.getElementById(id)!;
const t=JSON.parse($('clock-app').dataset.text!);
const form=$('clock-settings') as HTMLFormElement;
const field=(key:string)=>form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement;
const defaults={view:'combined',date:'long',dateView:'textDate',format:'medium',hourCycle:'auto',zone:'local',seconds:true,numbers:true,smooth:false,awake:false};
let settings={...defaults};
try {if(storageAllowed()) {const saved=JSON.parse(localStorage.getItem('jacktools.clock.settings.v1')||'null');for(const key of Object.keys(defaults) as (keyof typeof defaults)[]){const value=saved?.[key];if(typeof defaults[key]==='boolean'){if(typeof value==='boolean')Object.assign(settings,{[key]:value});}else if([...((field(key) as HTMLSelectElement).options)].some(o=>o.value===value))Object.assign(settings,{[key]:value});}}}catch{}
for(const [key,value] of Object.entries(settings)){if(typeof value==='boolean')(field(key) as HTMLInputElement).checked=value;else field(key).value=value;}
const wake=screenWakeLock($('wake-status'),'',t.unavailable);
const styledDate = createClockDate($('styled-date'));
const updateFlip = createFlipClock($('flip-clock'));
let lastFlipTick = 0;
let digits:Intl.DateTimeFormat,dateFormat:Intl.DateTimeFormat,parts:Intl.DateTimeFormat;
function configure(){
 const zone=settings.zone==='local'?Intl.DateTimeFormat().resolvedOptions().timeZone:settings.zone;
 const locale=document.documentElement.lang;
 digits=new Intl.DateTimeFormat(locale,{timeZone:zone,hour:'2-digit',minute:'2-digit',...(settings.seconds&&settings.format!=='short'?{second:'2-digit' as const}:{}),...(settings.format==='long'?{timeZoneName:'short' as const}:{}),...(settings.hourCycle==='auto'?{}:{hour12:settings.hourCycle==='12'})});
 dateFormat=new Intl.DateTimeFormat(locale,{timeZone:zone,...(settings.date==='short'?{dateStyle:'short' as const}:settings.date==='medium'?{dateStyle:'medium' as const}:{dateStyle:'full' as const})});
 parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});
 document.querySelector<HTMLElement>('.clock-display')!.dataset.view=settings.view;
 $('clock-zone').textContent=zone.replaceAll('_',' ');
 $('clock-date').hidden=settings.date==='off'||settings.dateView!=='textDate';
 $('styled-date').hidden=settings.date==='off'||settings.dateView==='textDate';
 styledDate.configure(locale,zone,settings.dateView);
 $('dial-numbers').style.display=settings.numbers?'':'none';$('second-hand').style.display=settings.seconds?'':'none';
 lastFlipTick = 0; wake(settings.awake);render();
}
function render(){const now=new Date();const p=Object.fromEntries(parts.formatToParts(now).map(v=>[v.type,v.value]));const second=Number(p.second)+(settings.smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?now.getMilliseconds()/1000:0);const minute=Number(p.minute)+second/60,hour=Number(p.hour)%12+minute/60;
 for(const [id,angle] of [['hour-hand',hour*30],['minute-hand',minute*6],['second-hand',second*6]] as const)$(id).setAttribute('transform',`rotate(${angle} 160 160)`);
 if(settings.view==='flip'||settings.view==='analogFlip'){const formatted=digits.formatToParts(now);updateFlip(formatted,lastFlipTick>0 && now.getTime()-lastFlipTick<1500);lastFlipTick=now.getTime();$('flip-context').textContent=formatted.filter(p=>p.type==='dayPeriod'||p.type==='timeZoneName').map(p=>p.value).join(' · ');}
 const text=digits.format(now);$('digital-clock').textContent=text;$('digital-clock').setAttribute('datetime',now.toISOString());$('analog-clock').setAttribute('aria-label',text);$('clock-date').textContent=dateFormat.format(now);styledDate.render(now);
}
function save(){if(!storageAllowed())return;try{localStorage.setItem('jacktools.clock.settings.v1',JSON.stringify(settings));}catch{$('clock-settings-status').textContent=t.storageError;}}
form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('change',()=>{for(const key of Object.keys(defaults)){const input=field(key);Object.assign(settings,{[key]:input.type==='checkbox'?(input as HTMLInputElement).checked:input.value});}configure();save();});
document.addEventListener('storage-enabled',save);
let ownsFullscreen=false;
function focus(on:boolean){document.body.classList.toggle('focus-view',on);const b=$('clock-focus');b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?t.exitFocus:t.focusMode);b.querySelector('span')!.textContent=on?t.exitFocus:t.focusMode;}
async function leave(){focus(false);if(ownsFullscreen&&document.fullscreenElement){ownsFullscreen=false;await document.exitFullscreen().catch(()=>{});}}
$('clock-focus').addEventListener('click',async()=>{if(document.body.classList.contains('focus-view'))return leave();focus(true);if(!document.fullscreenElement)try{await document.documentElement.requestFullscreen();ownsFullscreen=true;if(!document.body.classList.contains('focus-view'))await leave();}catch{}});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){ownsFullscreen=false;focus(false);}});document.addEventListener('keydown',e=>{if(e.key==='Escape')void leave();});
configure();setInterval(()=>{if(!document.hidden)render();},50);document.addEventListener('visibilitychange',()=>{if(!document.hidden){configure();}});

enhanceClockSelects(form);
