/** Deliberately illustrative: fixed 06:00–18:00 daylight, not astronomical times. */
export function seasonalState(now: Date, zone: string, hemisphere: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(now).map(part => [part.type, part.value]));
  const year = Number(parts.year), month = Number(parts.month) - 1, day = Number(parts.day);
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cycle = ((month + (day - 1) / days) / 3 + (hemisphere === 'south' ? 2 : 0)) % 4;
  const season = Math.floor(cycle), blend = cycle - season;
  const hour = Number(parts.hour) + Number(parts.minute) / 60 + Number(parts.second) / 3600;
  const phase = hour >= 5 && hour < 8 ? 'morning' : hour >= 8 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'evening' : 'night';
  const solar = (hour - 6) / 12;
  const lunar = ((hour + 6) % 24) / 12;
  const point = (progress: number) => ({ x: 200 + 1200 * progress, y: 620 - Math.sin(Math.PI * progress) * 430 });
  return { cycle, season, blend, hour, phase, sun: point(solar), moon: point(lunar), sunVisible: hour >= 6 && hour < 18 };
}

export function mixColor(a: string, b: string, t: number) {
  const rgb = (value: string) => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
  return '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
