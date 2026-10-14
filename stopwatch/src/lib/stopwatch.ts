export class Stopwatch {
  private accumulated = 0;
  private started: number | null = null;
  laps: {elapsed: number; duration: number}[] = [];
  get running() { return this.started !== null; }
  elapsed(now: number) { return this.accumulated + (this.started === null ? 0 : Math.max(0, now - this.started)); }
  start(now: number) { if (!this.running) this.started = now; }
  pause(now: number) { this.accumulated = this.elapsed(now); this.started = null; }
  lap(now: number) { if (!this.running) return; const elapsed = this.elapsed(now); const previous = this.laps.at(-1)?.elapsed ?? 0; const lap = {elapsed, duration: elapsed - previous}; this.laps.push(lap); return lap; }
  reset() { this.started = null; this.accumulated = 0; this.laps = []; }
}
export function formatElapsed(ms: number) {
 const ticks = Math.floor(Math.max(0, ms) / 10);
 return [Math.floor(ticks / 360000), Math.floor(ticks / 6000) % 60, Math.floor(ticks / 100) % 60].map(n => String(n).padStart(2, '0')).join(':') + '.' + String(ticks % 100).padStart(2, '0');
}

/** Export captured laps oldest first, without changing or persisting measurements. */
export function lapRows(laps: readonly {duration: number; elapsed: number}[], headings: readonly string[]): string[][] {
 return [[...headings], ...laps.map((lap, index) => [String(index + 1), formatElapsed(lap.duration), formatElapsed(lap.elapsed)])];
}
export function lapsCsv(rows: readonly (readonly string[])[]): string {
 return '\uFEFF' + rows.map(row => row.map(cell => '"' + cell.replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
}

/** Completed laps only; ties consistently select the first recorded lap. */
export function analyzeLaps(laps: readonly {duration: number}[]) {
 if (!laps.length) return null;
 let fastest = 0, slowest = 0, total = 0;
 laps.forEach((lap,index) => {
  total += lap.duration;
  if (lap.duration < laps[fastest]!.duration) fastest = index;
  if (lap.duration > laps[slowest]!.duration) slowest = index;
 });
 return {fastest,slowest,average:total / laps.length,
  difference:laps.length > 1 ? laps.at(-1)!.duration - laps.at(-2)!.duration : null};
}

/** Compare lap durations by stopwatch column; missing laps remain empty. */
export function combinedLapRows(clocks: readonly {name:string; laps:readonly {duration:number}[]}[], lapHeading:string):string[][] {
 const count=clocks.reduce((maximum,clock)=>Math.max(maximum,clock.laps.length),0);
 return [[lapHeading,...clocks.map(clock=>clock.name)],...Array.from({length:count},(_,index)=>[
  String(index+1),...clocks.map(clock=>clock.laps[index] ? formatElapsed(clock.laps[index]!.duration) : '')
 ])];
}
