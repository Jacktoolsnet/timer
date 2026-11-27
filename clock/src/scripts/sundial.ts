import { getTimes } from 'suncalc';
import { squareRadius, romanNumeral, type AnalogDesign } from '../lib/analog-designs';
import { sundialState, sundialHours } from '../lib/sundial';
import type { SeasonalLocation } from '../lib/seasonal-location';

export function createSundial(){
 const root=document.getElementById('sundial-view')!;
 const status=document.getElementById('sundial-status')!;
 const isReceiver=document.getElementById('clock-app')?.dataset.receiver==='true';
 const notice=document.getElementById('sundial-notice')!;
 const shadow=document.getElementById('sundial-shadow')!;
 const sun=document.getElementById('sundial-sun')!;
 const time=document.getElementById('sundial-time')!;
 const enableLocation=document.getElementById('sundial-enable-location') as HTMLButtonElement;
 enableLocation.addEventListener('click',()=>{
  if(!pending&&!location)(document.getElementById('seasonal-location') as HTMLInputElement).click();
 });
 const noticeArea=document.getElementById('sundial-notice-area')!;
 const infoArea=document.getElementById('sundial-info-area')!;
 const coordinateArea=document.getElementById('sundial-coordinates-area')!;
 const coordinateContainer=document.getElementById('sundial-coordinates')!;
 const nightHint=document.getElementById('sundial-night-hint')!;
 const text=JSON.parse(root.dataset.text!);
 const face=document.getElementById('sundial-face')!;
 let design:AnalogDesign='standard',numbers=true,zone='UTC',daylightKey='';
 let location:SeasonalLocation|undefined,last='',active=false,message='',pending=false,facing=1;
 function coordinates(){
  if(!location)return '';
  const format=new Intl.NumberFormat(document.documentElement.lang,{minimumFractionDigits:4,maximumFractionDigits:4});
  return `${format.format(Math.abs(location.latitude))}° ${location.latitude<0?'S':'N'} · ${format.format(Math.abs(location.longitude))}° ${location.longitude<0?'W':'E'}`;
 }
 function rimRadius(angle:number){
  return design.startsWith('square-')?squareRadius(angle,137,27):137;
 }
 function daylight(now:Date){
  const group=document.getElementById('sundial-daylight')!;
  group.setAttribute('visibility',location?'visible':'hidden');
  group.style.display=location?'':'none';
  if(!location){daylightKey='';facing=1;face.dataset.orientation='north';face.querySelector('.sundial-north')!.textContent='N';return;}
  const key=[Math.floor(now.getTime()/60000),location.latitude,location.longitude,design,zone].join(':');
  if(key===daylightKey)return;daylightKey=key;
  const times=getTimes(now,location.latitude,location.longitude);
  // Keep the solar-noon shadow in the upper half, including the tropics'
  // seasonal north/south change. All astronomical elements share this orientation.
  facing=Math.cos(sundialState(times.solarNoon,location).sun.azimuth*Math.PI/180)>0?-1:1;
  face.dataset.orientation=facing===1?'north':'south';
  face.querySelector('.sundial-north')!.textContent=facing===1?'N':'S';
  // Use the same north-up solar azimuth as the sun marker and shadow, not
  // evenly spaced civil hours. Values outside 0..1 lie above the lower half.
  const fraction=(date:Date)=>(sundialState(date,location!).sun.azimuth-90)/180;
  const point=(t:number,extra=0,surface=false)=>{
   const angle=Math.PI*(1-t);
   const radius=(surface?(design.startsWith('square-')?squareRadius(angle-Math.PI/2,150,29):150):rimRadius(angle-Math.PI/2))+extra;
   return {x:180-facing*Math.cos(angle)*radius,y:180+facing*Math.sin(angle)*radius};
  };
  const fill=document.getElementById('sundial-daylight-fill')!;
  const rise=times.sunrise instanceof Date?fraction(times.sunrise):0;
  const set=times.sunset instanceof Date?fraction(times.sunset):1;
  const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
  const noon=fraction(times.solarNoon);
  const dayThroughSouth=noon>=rise&&noon<=set;
  const daylightAt=(t:number)=>{
   const between=Math.min(smooth((t-rise+.04)/.08),smooth((set-t+.04)/.08));
   return dayThroughSouth?between:1-between;
  };
  const sectors=document.createDocumentFragment();
  for(let i=0;i<360;i++){
   const t=(i+.5)/180-.5;
   const opposite=t<.5?t+1:t-1;
   // Both the Sun and the opposite shadow/hour scale share the warm daylight sector.
   const warmth=times.alwaysUp?1:times.alwaysDown?0:Math.max(daylightAt(t),daylightAt(opposite));
   const a=point(Math.max(-.5,(i-.03)/180-.5),0,true),b=point(Math.min(1.5,(i+1.03)/180-.5),0,true);
   const sector=document.createElementNS('http://www.w3.org/2000/svg','path');
   sector.setAttribute('d',`M180,180 L${a.x},${a.y} L${b.x},${b.y} Z`);
   sector.setAttribute('fill',`color-mix(in srgb,var(--sundial-day) ${(warmth*100).toFixed(3)}%,var(--sundial-night))`);sectors.append(sector);
  }
  fill.replaceChildren(sectors);
  const format=new Intl.DateTimeFormat(document.documentElement.lang,{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  for(const [event,date] of [['sunrise',times.sunrise],['sunset',times.sunset]] as const){
   const dot=document.getElementById('sundial-'+event+'-dot')!;
   const label=document.getElementById('sundial-'+event+'-label')!;
   const leader=document.getElementById('sundial-'+event+'-leader')!;
   const valid=date instanceof Date&&Number.isFinite(date.getTime());
   dot.setAttribute('visibility',valid?'visible':'hidden');label.setAttribute('visibility',valid?'visible':'hidden');leader.setAttribute('visibility',valid?'visible':'hidden');
   if(!valid)continue;
   const t=fraction(date);
   // The outer frame has half-size/radius 151 and corner radius 30.
   const az=fraction(date)*Math.PI+Math.PI/2;
   const radius=design.startsWith('square-')?squareRadius(az,151,30):151;
   const p={x:180+facing*Math.sin(az)*radius,y:180-facing*Math.cos(az)*radius};
   const l={x:180+facing*Math.sin(az)*(radius+10),y:180-facing*Math.cos(az)*(radius+10)};
   const right=p.x>=180;
   // Keep north's label clear, and separate the two event labels near polar limits.
   if(Math.abs(l.x-180)<30){
    l.x=right?204:156;
    if(l.y<35)l.y=5;
   }
   label.style.textAnchor=right?'start':'end';
   leader.setAttribute('x1',String(p.x));leader.setAttribute('y1',String(p.y));
   leader.setAttribute('x2',String(l.x));leader.setAttribute('y2',String(l.y));
   dot.setAttribute('cx',String(p.x));dot.setAttribute('cy',String(p.y));
   label.setAttribute('x',String(l.x));label.setAttribute('y',String(l.y));
   label.textContent=format.format(date);
   label.setAttribute('aria-label',`${text[event]}: ${format.format(date)}`);
   const offset=(1-Math.cos(Math.PI*Math.max(0,Math.min(1,t))))/2;
   document.getElementById(event==='sunrise'?'sundial-dawn-orange':'sundial-dusk-orange')!.setAttribute('offset',String(offset));
   document.getElementById(event==='sunrise'?'sundial-dawn-blue':'sundial-dusk-blue')!.setAttribute('offset',String(Math.max(0,Math.min(1,offset+(event==='sunrise'?-.06:.06)))));
  }
  group.setAttribute('aria-label',times.alwaysUp?text.polarDay:times.alwaysDown?text.polarNight:`${text.sunrise} – ${text.sunset}`);
 }
 function render(now:Date){
  root.dataset.locationState=pending?'pending':location?'ready':'missing';
  if(!active)return;
  daylight(now);
  if(!location)noticeArea.setAttribute('visibility','visible');
  infoArea.setAttribute('visibility',location?'visible':'hidden');
  coordinateArea.setAttribute('visibility',location?'visible':'hidden');
  if(location){if(status.parentElement!==coordinateContainer)coordinateContainer.append(status);}
  else{
   // The receiver cannot request the sender's location. Keep its explanation
   // outside the intentionally hidden location button.
   const target=isReceiver?notice:enableLocation;
   if(status.parentElement!==target)target.prepend(status);
  }
  enableLocation.hidden=!!location||isReceiver;
  enableLocation.disabled=pending;
  enableLocation.setAttribute('aria-busy',String(pending));
  if(!location){nightHint.hidden=true;sun.style.display='none';sun.setAttribute('visibility','hidden');shadow.setAttribute('visibility','hidden');time.textContent='';status.textContent=pending?text.pending:message||text.missing;return;}
  const tick=String(Math.floor(now.getTime()/1000));
  if(tick===last)return;last=tick;
  const state=sundialState(now,location);
  shadow.setAttribute('visibility',state.visible?'visible':'hidden');
  sun.style.display=state.visible?'':'none';sun.setAttribute('visibility',state.visible?'visible':'hidden');
  const azimuth=state.sun.azimuth*Math.PI/180;
  const sunRadius=rimRadius(azimuth);
  sun.setAttribute('transform',`translate(${180+facing*Math.sin(azimuth)*sunRadius} ${180-facing*Math.cos(azimuth)*sunRadius})`);
  // Keep the rendered tip inside the numeral ring; physical length remains in the model.
  const distance=Math.hypot(state.x,state.y);
  // Tiny real shadows otherwise disappear underneath the pin and its halo.
  const scale=distance>.001?Math.max(14,Math.min(110,distance))/distance:1;
  const tipX=String(180+facing*state.x*scale),tipY=String(180+facing*state.y*scale);
  shadow.setAttribute('x2',tipX);shadow.setAttribute('y2',tipY);
  const fade=document.getElementById('sundial-shadow-fade')!;
  fade.setAttribute('x2',tipX);fade.setAttribute('y2',tipY);
  root.dataset.daylight=String(state.visible);
  status.textContent=coordinates();
  nightHint.textContent=state.visible?'':text.night;nightHint.hidden=state.visible;
  noticeArea.setAttribute('visibility',state.visible?'hidden':'visible');
  const minutes=Math.floor(state.solarHour*60)%1440;
  const solar=document.createElement('span'),altitude=document.createElement('span');
  solar.textContent=`${text.solar}: ${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  altitude.textContent=`${text.altitude}: ${state.sun.altitude.toFixed(1)}°`;
  time.replaceChildren(solar,altitude);
  // Rebuild date-specific markers once per minute, including a local date change.
  const key=String(Math.floor(now.getTime()/60000))+design+numbers;
  const hours=document.getElementById('sundial-hours')!;
  if(hours.dataset.tick!==key){
   hours.dataset.tick=key;hours.replaceChildren();
   const minimal=design.endsWith('minimal');
   const numerals=document.createElementNS('http://www.w3.org/2000/svg','g');
   numerals.setAttribute('class','dial-numerals');numerals.style.display=numbers?'':'none';
   const candidates:{label:SVGTextElement;x:number;y:number;width:number;height:number;priority:number}[]=[];
   const ticks:{x:number;y:number}[]=[];
   for(const point of sundialHours(now,location,minimal?1:.25)){
    const distance=Math.hypot(point.x,point.y);
    if(distance<.01)continue;
    const x=facing*point.x/distance,y=facing*point.y/distance;
    const angle=Math.atan2(x,-y);
    const radius=(half:number)=>design.startsWith('square-')?squareRadius(angle,half,half*30/151):half;
    const major=Number.isInteger(point.hour);
    const guide=document.createElementNS('http://www.w3.org/2000/svg','line');
    const outer=radius(148),inner=outer-(major?10:5);
    guide.setAttribute('x1',String(180+x*inner));guide.setAttribute('y1',String(180+y*inner));
    guide.setAttribute('x2',String(180+x*outer));guide.setAttribute('y2',String(180+y*outer));
    guide.setAttribute('class',major?'hour-mark':'minute-mark');
    const tick={x:180+x*outer,y:180+y*outer};
    if(major||!ticks.some(p=>Math.hypot(p.x-tick.x,p.y-tick.y)<4)){
     hours.append(guide);ticks.push(tick);
    }
    if(!major||(minimal&&point.hour%3!==0))continue;
    const label=document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('x',String(180+x*radius(126)));label.setAttribute('y',String(180+y*radius(126)));
    // Match the other dials' twelve-hour numerals; solar-time readout stays 24-hour.
    const value=point.hour%12||12;
    label.textContent=design.endsWith('roman')?romanNumeral(value):String(value);
    const px=180+x*radius(126),py=180+y*radius(126);
    // The lower half is reserved for the inset readouts. Prefer noon and
    // quarter-day labels when true azimuths bunch up around the zenith.
    if(py<180)candidates.push({label,x:px,y:py,width:label.textContent!.length*(design.endsWith('roman')?12:10)+6,height:24,priority:value===12?0:value%3===0?1:2});

   }
   const accepted:typeof candidates=[];
   for(const candidate of candidates.sort((a,b)=>a.priority-b.priority)){
    if(accepted.some(other=>Math.abs(other.x-candidate.x)<(other.width+candidate.width)/2&&Math.abs(other.y-candidate.y)<(other.height+candidate.height)/2))continue;
    accepted.push(candidate);numerals.append(candidate.label);
   }
   hours.append(numerals);
  }
 }
 return {render,configure(enabled:boolean,position:SeasonalLocation|undefined,statusMessage='',isPending=false,selectedDesign:AnalogDesign='standard',showNumbers=true,timeZone='UTC'){
  active=enabled;root.hidden=!enabled;
  design=selectedDesign;numbers=showNumbers;zone=timeZone;
  if(face.dataset.design!==design){
   const square=design.startsWith('square-');
   const shape=(className:string,inset:number)=>square
    ?`<rect class="${className}" x="${29+inset}" y="${29+inset}" width="${302-inset*2}" height="${302-inset*2}" rx="${30-inset}"/>`
    :`<circle class="${className}" cx="180" cy="180" r="${151-inset}"/>`;
   document.getElementById('sundial-frame')!.innerHTML=shape('dial sundial-surface',0)
    +shape('sundial-light',1).replace('/>',' fill="url(#sundial-light)" aria-hidden="true"/>')
    +shape('sundial-inner-rim',5);
   face.dataset.design=design;
  }
  const changed=position?.latitude!==location?.latitude||position?.longitude!==location?.longitude;
  location=position;message=statusMessage;pending=isPending;last='';
  if(changed||!position){
   const hours=document.getElementById('sundial-hours')!;
   hours.replaceChildren();delete hours.dataset.tick;delete root.dataset.daylight;
  }
  render(new Date());
 }};
}
