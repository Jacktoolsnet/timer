const rad=Math.PI/180;
/** Stylized full-horizon panorama: east left, south middle, west right.
 * Not a rectilinear star chart; north wraps at the edges. */
export function skyPoint(altitude:number,azimuth:number,horizon=500,height=350) {
 const fromSouth=((azimuth+360)%360)-180;
 return {x:800+fromSouth/180*760,y:horizon-Math.sin(Math.max(0,altitude)*rad)*height};
}
/** Approximate mean sidereal time (USNO), adequate for a decorative sky.
 * UTC approximates UT1; J2000 catalog precession/proper motion are not modeled. */
export function siderealDegrees(now:Date,longitude=0) {
 const days=now.getTime()/86400000+2440587.5-2451545;
 return ((18.697375+24.065709824279*days)*15+longitude)%360;
}
/** Equatorial coordinates (RA in hours, declination in degrees) to local horizon. */
export function starPosition(ra:number,dec:number,latitude:number,sidereal:number) {
 const h=(sidereal-ra*15)*rad,d=dec*rad,p=latitude*rad;
 const east=-Math.cos(d)*Math.sin(h);
 const north=Math.sin(d)*Math.cos(p)-Math.cos(d)*Math.cos(h)*Math.sin(p);
 const up=Math.sin(d)*Math.sin(p)+Math.cos(d)*Math.cos(h)*Math.cos(p);
 return {altitude:Math.asin(Math.max(-1,Math.min(1,up)))/rad,azimuth:(Math.atan2(east,north)/rad+360)%360};
}
