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
  const point = (body: { altitude: number; azimuth: number }) => ({
    x: 800 - Math.sin(body.azimuth * Math.PI / 180) * 600,
    y: 620 - Math.sin(Math.max(0, body.altitude) * Math.PI / 180) * 430,
  });
  return { phase, hour, sun: point(sun), moon: point(moon), sunVisible: sun.altitude > -.833,
    moonVisible: sun.altitude < 0 && moon.altitude > 0 };
}
