import {skyPoint} from './sky-coordinates';
import { getPosition, getMoonPosition } from 'suncalc';
export interface SeasonalLocation { latitude: number; longitude: number }

/** Local astronomical positions; no requests or reverse geocoding. */
export function locationSky(now: Date, location: SeasonalLocation) {
  const { latitude, longitude } = location;
  const sun = getPosition(now, latitude, longitude);
  const next = getPosition(new Date(now.getTime() + 60000), latitude, longitude);
  const moon = getMoonPosition(now, latitude, longitude);
  const rising = next.altitude > sun.altitude;
  const phase = sun.altitude < -6 ? 'night' : sun.altitude < 6 ? rising ? 'morning' : 'evening' : 'day';
  const hour = sun.altitude <= -6 ? 0 : sun.altitude >= 6 ? 12 : rising ? 5 + (sun.altitude + 6) / 3 : 21 - (sun.altitude + 6) / 3;
  return { phase, hour, sun: skyPoint(sun.altitude,sun.azimuth,620,430), // Reserve sky above the decorative hills; this is not a terrain horizon model.
    moon: skyPoint(moon.altitude,moon.azimuth), sunVisible: sun.altitude > -.833,
    moonVisible: moon.altitude > 0 };
}
