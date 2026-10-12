import { seasonalState, mixColor } from '../lib/seasonal-background';
import { locationSky, type SeasonalLocation } from '../lib/seasonal-location';

export function createSeasonalBackground(root: SVGSVGElement) {
  let zone = 'UTC', hemisphere = 'north', last = -1;
  let location: SeasonalLocation | undefined;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = [
    ['#aebcc9', '#eef0e4', '#748e97', '#435c68'],
    ['#97c4c1', '#dce8c2', '#8aad79', '#476f58'],
    ['#80b3c9', '#e4dfb8', '#7d9a62', '#3e6850'],
    ['#b3b9bd', '#edccaa', '#c19863', '#795c48'],
  ];
  const stops = [
    { h: 0, top: '#152635', bottom: '#3d5362', light: 0 },
    { h: 5, top: '#152635', bottom: '#3d5362', light: 0 },
    { h: 7, top: '#9293ac', bottom: '#efc39d', light: .65 },
    { h: 9, top: '', bottom: '', light: 1 },
    { h: 17, top: '', bottom: '', light: 1 },
    { h: 19, top: '#6d708e', bottom: '#d49a86', light: .4 },
    { h: 21, top: '#152635', bottom: '#3d5362', light: 0 },
    { h: 24, top: '#152635', bottom: '#3d5362', light: 0 },
  ];
  const find = (id: string) => root.querySelector<SVGElement>(`[data-seasonal="${id}"]`)!;
  function render(now: Date) {
    // At most one update per second; no independent animation loop.
    const tick = Math.floor(now.getTime() / (motion.matches ? 3600000 : 1000));
    if (tick === last) return;
    last = tick;
    const date = motion.matches ? new Date(Math.floor(now.getTime() / 3600000) * 3600000) : now;
    const s = seasonalState(date, zone, location ? location.latitude < 0 ? 'south' : 'north' : hemisphere);
    const sky = location ? locationSky(date, location) : s;
    const palette = colors[s.season].map((c, i) => mixColor(c, colors[(s.season + 1) % 4][i], s.blend));
    const end = stops.findIndex(stop => stop.h > sky.hour);
    const a = stops[end - 1], b = stops[end];
    const t = (sky.hour - a.h) / (b.h - a.h), light = a.light + (b.light - a.light) * t;
    find('sky-top').setAttribute('stop-color', mixColor(a.top || palette[0], b.top || palette[0], t));
    find('sky-bottom').setAttribute('stop-color', mixColor(a.bottom || palette[1], b.bottom || palette[1], t));
    find('far').setAttribute('fill', mixColor('#304552', palette[2], light));
    find('near').setAttribute('fill', mixColor('#1b303b', palette[3], light));
    const winter = s.season === 0 ? 1 - s.blend : s.season === 3 ? s.blend : 0;
    find('snow').style.opacity = String(winter * (.3 + .7 * light));
    find('leaves').style.opacity = String(1 - winter);
    const foliage = ['#698076', '#79966a', '#3e6850', '#a67a4d'];
    find('leaves').setAttribute('fill', mixColor('#263b39', mixColor(foliage[s.season], foliage[(s.season + 1) % 4], s.blend), light));
    find('flowers').style.opacity = String((s.season === 0 ? s.blend : s.season === 1 ? 1 - s.blend : 0) * light);
    find('stars').style.opacity = String(1 - light);
    for (const body of ['sun', 'moon'] as const) {
      const p = sky[body]; find(body).setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      find(body).style.opacity = String(body === 'sun' ? Number(sky.sunVisible) : Number('moonVisible' in sky ? sky.moonVisible : !sky.sunVisible));
    }
    root.dataset.phase = sky.phase;
    root.dataset.locationBased = String(!!location);
    root.dataset.season = ['winter', 'spring', 'summer', 'autumn'][Math.floor((s.cycle + .5) % 4)];
  }
  return { configure(nextZone: string, nextHemisphere: string, nextLocation?: SeasonalLocation) { zone = nextZone; hemisphere = nextHemisphere; location = nextLocation; last = -1; }, render };
}
