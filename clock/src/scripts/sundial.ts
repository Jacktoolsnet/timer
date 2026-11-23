import { sundialState, sundialHours } from '../lib/sundial';
import type { SeasonalLocation } from '../lib/seasonal-location';

export function createSundial(){
 const root=document.getElementById('sundial-view')!;
 const controls=document.getElementById('sundial-settings')!;
 const button=document.getElementById('sundial-location') as HTMLButtonElement;
 const clearButton=document.getElementById('sundial-clear') as HTMLButtonElement;
 const status=document.getElementById('sundial-status')!;
 const controlStatus=document.getElementById('sundial-location-status')!;
 const shadow=document.getElementById('sundial-shadow')!;
 const time=document.getElementById('sundial-time')!;
 const text=JSON.parse(root.dataset.text!);
 let location:SeasonalLocation|undefined,request=0,last='',active=false,requesting=false;
 function render(now:Date){
  if(!active)return;
  if(!location){shadow.setAttribute('visibility','hidden');time.textContent='';status.textContent=requesting?text.pending:controlStatus.textContent||text.missing;return;}
  const tick=String(Math.floor(now.getTime()/1000));
  if(tick===last)return;last=tick;
  const state=sundialState(now,location);
  shadow.setAttribute('visibility',state.visible?'visible':'hidden');
  shadow.setAttribute('x2',String(180+state.x));shadow.setAttribute('y2',String(180+state.y));
  root.dataset.daylight=String(state.visible);
  status.textContent=state.visible?'':text.night;
  const minutes=Math.floor(state.solarHour*60)%1440;
  time.textContent=`${text.solar}: ${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')} · ${text.altitude}: ${state.sun.altitude.toFixed(1)}°`;
  // Rebuild date-specific markers once per minute, including a local date change.
  const key=String(Math.floor(now.getTime()/60000));
  const hours=document.getElementById('sundial-hours')!;
  if(hours.dataset.tick!==key){
   hours.dataset.tick=key;hours.replaceChildren();
   for(const point of sundialHours(now,location)){
    const label=document.createElementNS('http://www.w3.org/2000/svg','text');
    const distance=Math.hypot(point.x,point.y);
    if(distance<.01)continue;
    const x=point.x/distance,y=point.y/distance;
    const guide=document.createElementNS('http://www.w3.org/2000/svg','line');
    guide.setAttribute('x1',String(180+x*12));guide.setAttribute('y1',String(180+y*12));
    guide.setAttribute('x2',String(180+x*125));guide.setAttribute('y2',String(180+y*125));
    guide.setAttribute('class','sundial-hour-line');
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx',String(180+point.x));dot.setAttribute('cy',String(180+point.y));
    dot.setAttribute('r','2');dot.setAttribute('class','sundial-hour-dot');
    label.setAttribute('x',String(180+x*139));label.setAttribute('y',String(180+y*139));
    label.textContent=String(point.hour);hours.append(guide,dot,label);
   }
  }
 }
 function clear(){
  request++;location=undefined;requesting=false;last='';button.disabled=false;clearButton.hidden=true;
  controlStatus.textContent='';document.getElementById('sundial-hours')!.replaceChildren();
  delete document.getElementById('sundial-hours')!.dataset.tick;delete root.dataset.daylight;
  render(new Date());
 }
 button.addEventListener('click',()=>{
  const token=++request;requesting=true;button.disabled=true;controlStatus.textContent=text.pending;render(new Date());
  const failed=()=>{if(token!==request)return;requesting=false;button.disabled=false;controlStatus.textContent=text.failed;render(new Date());};
  if(!window.isSecureContext||!navigator.geolocation){failed();return;}
  navigator.geolocation.getCurrentPosition(position=>{
   if(token!==request)return;
   const {latitude,longitude}=position.coords;
   if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180){failed();return;}
   location={latitude,longitude};requesting=false;last='';button.disabled=false;clearButton.hidden=false;controlStatus.textContent='';render(new Date());
  },failed,{enableHighAccuracy:false,timeout:15000,maximumAge:60000});
 });
 clearButton.addEventListener('click',clear);
 document.addEventListener('preferences-cleared',clear);
 return {render,configure(enabled:boolean){active=enabled;root.hidden=!enabled;controls.hidden=!enabled;if(!enabled)clear();else{last='';render(new Date());}}};
}
