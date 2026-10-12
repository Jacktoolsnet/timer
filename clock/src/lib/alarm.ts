/** Find the next real minute in an IANA zone; DST gaps are skipped, repeats use the first future occurrence. */
export function nextAlarm(now: number, time: string, zone: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid alarm time');
  const format = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
  const start = Math.floor(now / 60000) * 60000 + 60000;
  for (let i = 0; i < 48 * 60; i++) {
    const instant = start + i * 60000;
    if (format.format(instant) === time) return instant;
  }
  throw new Error('No alarm occurrence');
}

export class Alarm {
  due: number | null = null;
  ringing = false;
  snoozed = false;
  arm(now: number, time: string, zone: string) { this.stop(); this.due = nextAlarm(now, time, zone); }
  stop() { this.due = null; this.ringing = false; this.snoozed = false; }
  snooze(now: number) { this.stop(); this.due = now + 5 * 60000; this.snoozed = true; }
  check(now: number): 'ring' | 'missed' | null {
    if (this.due === null || now < this.due) return null;
    const missed = now - this.due > 5 * 60000;
    this.due = null; this.snoozed = false; this.ringing = !missed;
    return missed ? 'missed' : 'ring';
  }
}
