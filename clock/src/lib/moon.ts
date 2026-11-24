import {getMoonIllumination,getMoonPosition} from 'suncalc';
import type {SeasonalLocation} from './seasonal-location';

/** Actual illuminated disk and local bright-limb orientation, all angles in degrees. */
export function moonLight(now:Date,location?:SeasonalLocation) {
 const light=getMoonIllumination(now);
 const parallactic=location?getMoonPosition(now,location.latitude,location.longitude).parallacticAngle:0;
 // The unrotated path is illuminated toward screen-right. SVG rotates clockwise;
 // SunCalc's zenith angle is anticlockwise from screen-up.
 return {...light,rotation:-(light.angle-parallactic)-90};
}

/** Project a lit hemisphere onto the lunar disk, not a translated circular cutout. */
export function moonPhasePath(fraction:number,radius=50) {
 const f=Math.min(1,Math.max(0,fraction)),k=1-2*f;
 return `M0 ${-radius}A${radius} ${radius} 0 0 1 0 ${radius}A${Math.abs(k)*radius} ${radius} 0 0 ${k>=0?0:1} 0 ${-radius}Z`;
}
