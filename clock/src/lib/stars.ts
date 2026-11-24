import catalog from './stars-catalog.json' with {type:'json'};
import {siderealDegrees,starPosition,skyPoint} from './sky-coordinates';
import type {SeasonalLocation} from './seasonal-location';

/** Real catalog stars above the geometric horizon. No planets, weather or terrain model. */
export function visibleStars(now:Date,location:SeasonalLocation) {
 const sidereal=siderealDegrees(now,location.longitude);
 return catalog.map(star=>{
  const position=starPosition(star.ra,star.dec,location.latitude,sidereal);
  return {...star,...position,...skyPoint(position.altitude,position.azimuth),
   radius:Math.max(1,2.7-star.mag*.38),brightness:Math.min(1,Math.max(.28,1-star.mag*.15))};
 }).filter(star=>star.altitude>0);
}
/** A representative 22:00 sky, not a claim about the viewer's actual location. */
export function illustrativeStars(now:Date,zone:string,hemisphere:string) {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now).map(p=>[p.type,p.value]));
 const evening=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),22));
 return visibleStars(evening,{latitude:hemisphere==='south'?-45:45,longitude:0});
}
