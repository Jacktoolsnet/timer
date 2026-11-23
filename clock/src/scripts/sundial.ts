import { storageAllowed } from '../lib/storage';
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
 const preferenceKey='jacktools.clock.sundial-enabled.v1';
 let wanted=false;
 try {wanted=storageAllowed()&&localStorage.getItem(preferenceKey)==='yes';}catch{}
 let location:SeasonalLocation|undefined,request=0,last='',active=false,requesting=false;
 let permission:PermissionStatus|undefined;
 function saveMode(){
  try{if(storageAllowed())localStorage.setItem(preferenceKey,wanted?'yes':'no');else localStorage.removeItem(preferenceKey);}catch{}
 }
 function coordinates(){
  if(!location)return '';
  const format=new Intl.NumberFormat(document.documentElement.lang,{minimumFractionDigits:4,maximumFractionDigits:4});
  return `${format.format(Math.abs(location.latitude))}° ${location.latitude<0?'S':'N'} · ${format.format(Math.abs(location.longitude))}° ${location.longitude<0?'W':'E'}`;
 }
 function sync(){
  button.setAttribute('aria-pressed',String(wanted));
  root.dataset.locationState=requesting?'pending':location?'ready':'missing';
 }

 function render(now:Date){
  sync();
  if(!active)return;
  if(!location){shadow.setAttribute('visibility','hidden');time.textContent='';status.textContent=requesting?text.pending:controlStatus.textContent||text.missing;return;}
  const tick=String(Math.floor(now.getTime()/1000));
  if(tick===last)return;last=tick;
  const state=sundialState(now,location);
  shadow.setAttribute('visibility',state.visible?'visible':'hidden');
  shadow.setAttribute('x2',String(180+state.x));shadow.setAttribute('y2',String(180+state.y));
  root.dataset.daylight=String(state.visible);
  status.textContent=coordinates()+(state.visible?'':` · ${text.night}`);
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
  sync();render(new Date());
 }
 function acquire(){
  if(requesting||!active)return;
  wanted=true;saveMode();
  const token=++request;requesting=true;button.disabled=true;clearButton.hidden=false;controlStatus.textContent=text.pending;render(new Date());
  const failed=(error?:GeolocationPositionError)=>{
   if(token!==request)return;
   requesting=false;button.disabled=false;
   controlStatus.textContent=error?.code===1?text.denied:error?.code===3?text.timeout:text.failed;
   render(new Date());
  };
  if(!window.isSecureContext||!navigator.geolocation){failed();return;}
  navigator.geolocation.getCurrentPosition(position=>{
   if(token!==request)return;
   const {latitude,longitude}=position.coords;
   if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180){failed();return;}
   location={latitude,longitude};requesting=false;last='';button.disabled=false;clearButton.hidden=false;controlStatus.textContent=coordinates();render(new Date());
  },failed,{enableHighAccuracy:false,timeout:15000,maximumAge:60000});
 }
 button.addEventListener('click',acquire);
 function forget(){wanted=false;saveMode();clear();}
 clearButton.addEventListener('click',forget);
 document.addEventListener('preferences-cleared',forget);
 document.addEventListener('storage-enabled',saveMode);
 // Permission changes may arrive before or after the position callback.
 // Never cancel a pending request just because a browser permission prompt loses focus.
 if(navigator.permissions){
  void navigator.permissions.query({name:'geolocation'}).then(value=>{
   permission=value;
   permission.addEventListener('change',()=>{
    if(permission?.state==='prompt'&&location){
     clear();controlStatus.textContent=text.missing;render(new Date());
    }else if(permission?.state==='denied'){
     clear();controlStatus.textContent=text.denied;render(new Date());
    }else if(permission?.state==='granted'&&active&&wanted&&!location&&!requesting)acquire();
   });
  }).catch(()=>{});
 }
 return {render,configure(enabled:boolean){
  const entering=enabled&&!active;
  active=enabled;root.hidden=!enabled;controls.hidden=!enabled;
  if(!enabled){clear();return;}
  last='';render(new Date());
  if(entering&&wanted&&!location&&!requesting)acquire();
 }};
}
