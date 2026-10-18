import {analogDesigns, dialMarkup, type AnalogDesign} from '../../../shared/analog-designs';
import {enhanceClockSelects} from '../../../shared/preview-selects';
import {storageAllowed} from '../lib/storage';
import {APPEARANCE_KEY} from '../lib/timer-appearance';

export function createTimerAppearance() {
 const form=document.getElementById('timer-appearance') as HTMLFormElement;
 const view=form.elements.namedItem('timerView') as HTMLSelectElement;
 const design=form.elements.namedItem('analogDesign') as HTMLSelectElement;
 const smooth=form.elements.namedItem('smooth') as HTMLInputElement;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let lastRemaining=0,lastShowSeconds=true;
 let hourOffset=0,minuteScale=false;
 const face=document.getElementById('analog-timer')!;
 const clock=face.closest<HTMLElement>('.clock')!;
 try {
  const saved=storageAllowed()?JSON.parse(localStorage.getItem(APPEARANCE_KEY)||'null'):null;
  if(saved?.view==='analog'||saved?.view==='combined')view.value=saved.view;
  smooth.checked=saved?.smooth===true;
  if(analogDesigns.includes(saved?.design))design.value=saved.design;
 }catch{}
 function save(){if(storageAllowed())try{localStorage.setItem(APPEARANCE_KEY,JSON.stringify({view:view.value,design:design.value,smooth:smooth.checked}));}catch{}}
 function apply(){
  const analog=view.value==='analog'||view.value==='combined';
  clock.dataset.timerView=view.value;
  face.dataset.hidden=String(!analog);
  document.getElementById('analog-timer-hint')!.hidden=!analog;
  if(face.dataset.design!==design.value||face.dataset.hourOffset!==String(hourOffset)||face.dataset.scale!==(minuteScale?'minutes':'hours')){document.getElementById('timer-dial')!.innerHTML=dialMarkup(design.value as AnalogDesign,hourOffset,minuteScale);face.dataset.design=design.value;face.dataset.hourOffset=String(hourOffset);face.dataset.scale=minuteScale?'minutes':'hours';}
 }
 form.addEventListener('submit',e=>e.preventDefault());
 form.addEventListener('change',()=>{apply();save();update(lastRemaining,lastShowSeconds);});
 reducedMotion.addEventListener('change',()=>update(lastRemaining,lastShowSeconds));
 document.addEventListener('storage-enabled',save);
 document.addEventListener('preferences-cleared',()=>{try{localStorage.removeItem(APPEARANCE_KEY);}catch{}});
 apply();enhanceClockSelects(form);
 function update(remaining: number, showSeconds = true){
  lastRemaining=remaining;lastShowSeconds=showSeconds;
  (face.querySelector('.timer-second-hand') as SVGElement).style.display=showSeconds?'':'none';
  const preciseSeconds=Math.max(0,remaining)/1000;
  const seconds=smooth.checked&&!reducedMotion.matches?preciseSeconds:Math.ceil(preciseSeconds);
  const nextOffset=Math.max(0,Math.ceil(seconds/(12*3600))-1)*12;
  const nextMinuteScale=preciseSeconds<3600;
  if(nextOffset!==hourOffset||nextMinuteScale!==minuteScale){hourOffset=nextOffset;minuteScale=nextMinuteScale;apply();}
  (face.querySelector('.timer-hour-hand') as SVGElement).style.display=minuteScale?'none':'';
  for(const [selector,angle] of [['.timer-hour-hand',(seconds/3600%12)*30],['.timer-minute-hand',(seconds/60%60)*6],['.timer-second-hand',(seconds%60)*6]] as const)
   face.querySelector(selector)!.setAttribute('transform',`rotate(${angle} 160 160)`);
 }
 return update;
}
