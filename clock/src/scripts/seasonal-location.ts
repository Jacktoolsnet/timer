import type { SeasonalLocation } from '../lib/seasonal-location';
import { storageAllowed } from '../lib/storage';

/** One location source and mode shared by the seasonal sky and sundial. */
export function createSeasonalLocation(root: HTMLElement, changed: () => void) {
 const toggle=root.querySelector<HTMLInputElement>('#seasonal-location')!;
 const hemisphere=root.querySelector<HTMLSelectElement>('select[name=hemisphere]')!;
 const manual=[...root.querySelectorAll<HTMLInputElement>('input[name=seasonalMode]:not(#seasonal-location)')];
 const status=root.querySelector<HTMLElement>('#seasonal-location-status')!;
 const text=JSON.parse(root.dataset.locationText!);
 const key='jacktools.clock.location-enabled.v1';
 let location:SeasonalLocation|undefined,request=0,pending=false,active=false,wanted=false;
 let permission:PermissionStatus|undefined;
 let watch:number|undefined;
 try{wanted=document.getElementById('clock-app')?.dataset.receiver!=='true'&&storageAllowed()&&(localStorage.getItem(key)==='yes'||localStorage.getItem('jacktools.clock.sundial-enabled.v1')==='yes');}catch{}
 function save(){
  try{
   localStorage.removeItem('jacktools.clock.sundial-enabled.v1');
   if(storageAllowed())localStorage.setItem(key,wanted?'yes':'no');else localStorage.removeItem(key);
  }catch{}
 }
 function stopWatching(){
  if(watch!==undefined){navigator.geolocation?.clearWatch(watch);watch=undefined;}
 }
 function reset(){
  stopWatching();
  request++;location=undefined;pending=false;status.textContent='';
  toggle.checked=wanted;
  manual.forEach(radio=>radio.checked=!wanted&&radio.value===hemisphere.value);
 }
 function clear(){wanted=false;save();reset();}
 function acquire(){
  if(document.getElementById('clock-app')?.dataset.receiver==='true'||!active||pending)return;
  wanted=true;save();reset();toggle.checked=true;
  const token=request;
  pending=true;status.textContent=text.pending;
  const failed=(message:string)=>{
   if(token!==request)return;
   pending=false;location=undefined;status.textContent=message;
   toggle.checked=false;manual.forEach(radio=>radio.checked=radio.value===hemisphere.value);
   changed();
  };
  if(!window.isSecureContext||!navigator.geolocation){failed(text.unavailable);return;}
  navigator.geolocation.getCurrentPosition(position=>{
   if(token!==request)return;
   const {latitude,longitude}=position.coords;
   if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180){failed(text.failed);return;}
   location={latitude,longitude};pending=false;status.textContent='';changed();
   if(token!==request||!active||!wanted)return;
   watch=navigator.geolocation.watchPosition(update=>{
    if(token!==request||!active||!wanted)return;
    const {latitude,longitude}=update.coords;
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return;
    if(location?.latitude===latitude&&location?.longitude===longitude)return;
    location={latitude,longitude};status.textContent='';changed();
   },error=>{
    // A transient watch timeout must not discard the last valid position.
    // Permission revocation is also handled by the Permissions API listener.
    if(token===request&&error.code===1&&permission?.state==='denied'){
     reset();toggle.checked=false;status.textContent=text.denied;changed();
    }
   },{enableHighAccuracy:false,timeout:15000,maximumAge:0});
  },error=>failed(error.code===1?text.denied:error.code===3?text.timeout:text.failed),
  {enableHighAccuracy:false,timeout:15000,maximumAge:0});
  changed();
 }
 manual.forEach(radio=>radio.addEventListener('change',()=>{
  if(!radio.checked)return;
  hemisphere.value=radio.value;clear();changed();
 }));
 toggle.addEventListener('change',()=>{if(toggle.checked)acquire();else{clear();changed();}});
 document.addEventListener('storage-enabled',save);
 if(navigator.permissions){
  void navigator.permissions.query({name:'geolocation'}).then(value=>{
   permission=value;
   permission.addEventListener('change',()=>{
    if(permission?.state==='denied'||(permission?.state==='prompt'&&location)){
     reset();toggle.checked=false;
     manual.forEach(radio=>radio.checked=radio.value===hemisphere.value);
     status.textContent=permission.state==='denied'?text.denied:'';
     changed();
    }else if(permission?.state==='granted'&&active&&wanted&&!location&&!pending)acquire();
   });
  }).catch(()=>{});
 }
 reset();
 return {
  get location(){return location;},get status(){return status.textContent||'';},get pending(){return pending;},
  clear,
  setActive(enabled:boolean){
   const entering=enabled&&!active;active=enabled;
   if(!enabled){reset();toggle.checked=false;return;}
   // Defer restoration until configure() has finished initialising all clock formatters.
   if(entering&&wanted&&!location&&!pending)queueMicrotask(()=>{if(active&&wanted&&!location&&!pending)acquire();});
  }
 };
}
