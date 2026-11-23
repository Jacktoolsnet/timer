import { getPosition, getTimes } from 'suncalc';
import type { SeasonalLocation } from './seasonal-location';
const rad=Math.PI/180;
/** Horizontal dial with a vertical pin, north at the top. */
export function sundialState(date:Date,location:SeasonalLocation) {
 const sun=getPosition(date,location.latitude,location.longitude);
 const a=sun.azimuth*rad,h=sun.altitude*rad,p=location.latitude*rad;
 const hourAngle=Math.atan2(-Math.sin(a)*Math.cos(h),Math.sin(h)*Math.cos(p)-Math.cos(h)*Math.sin(p)*Math.cos(a));
 const solarHour=(12+hourAngle/rad/15+24)%24;
 const length=48/Math.tan(h);
 const visible=sun.altitude>0;
 return {sun,solarHour,visible,length:visible?Math.max(0,length):0,
  x:visible?-Math.sin(a)*Math.min(132,Math.max(0,length)):0,
  y:visible?Math.cos(a)*Math.min(132,Math.max(0,length)):0};
}
/** Date-specific hour dots for the vertical pin (not a polar-style gnomon). */
export function sundialHours(date:Date,location:SeasonalLocation) {
 const noon=getTimes(date,location.latitude,location.longitude).solarNoon;
 return Array.from({length:24},(_,hour)=>{
  let time=noon.getTime()+(hour-12)*3600000;
  for(let i=0;i<3;i++){
   const state=sundialState(new Date(time),location);
   const difference=((hour-state.solarHour+36)%24)-12;
   time+=difference*3600000;
  }
  const state=sundialState(new Date(time),location);
  return {hour,...state};
 }).filter(s=>s.visible);
}
