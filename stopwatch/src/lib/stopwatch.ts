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
