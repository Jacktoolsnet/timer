export type Mode = 'timer' | 'pomodoro';
export type Phase = 'focus' | 'short' | 'long';
export const colorSchemes = ['terracotta', 'blue', 'green', 'orange', 'red', 'violet', 'teal', 'rose'] as const;
export type ColorScheme = typeof colorSchemes[number];
export type Settings = { countdown: number; focus: number; short: number; long: number; rounds: number; sound: boolean; awake: boolean; dark: boolean; colorScheme: ColorScheme };
export const defaults: Settings = { countdown: 300, focus: 25, short: 5, long: 15, rounds: 4, sound: true, awake: true, dark: false, colorScheme: 'terracotta' };
export const STORAGE_KEY = 'jacktools.timer.settings.v1';
export function sanitizeSettings(input: unknown): Settings {
  const value = (input && typeof input === 'object' ? input : {}) as Partial<Settings>;
  const number = (key: keyof Settings, min: number, max: number): number => {
    const n = value[key];
    return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max ? n : defaults[key] as number;
  };
  return {
    countdown: number('countdown', 1, 359999), focus: number('focus', 1, 180),
    short: number('short', 1, 60), long: number('long', 1, 120), rounds: number('rounds', 1, 12),
    sound: typeof value.sound === 'boolean' ? value.sound : defaults.sound,
    awake: typeof value.awake === 'boolean' ? value.awake : defaults.awake,
    dark: value.dark === true,
    colorScheme: colorSchemes.includes(value.colorScheme as ColorScheme) ? value.colorScheme! : defaults.colorScheme,
  };
}
export function formatTime(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60;
  return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
export class Timer {
  phase: Phase = 'focus';
  round = 1;
  remaining = 0;
  total = 0;
  deadline: number | null = null;
  completed = false;
  mode: Mode;
  settings: Settings;
  constructor(mode: Mode, settings: Settings) { this.mode = mode; this.settings = settings; this.reset(); }
  reset() {
    this.deadline = null;
    this.completed = false;
    this.total = (this.mode === 'timer' ? this.settings.countdown : this.settings[this.phase] * 60) * 1000;
    this.remaining = this.total;
  }
  start(now: number) {
    if (this.deadline !== null) return;
    if (this.completed) this.reset();
    this.deadline = now + this.remaining;
  }
  tick(now: number): boolean {
    if (this.deadline === null) return false;
    this.remaining = Math.max(0, this.deadline - now);
    if (this.remaining === 0) {
      this.deadline = null;
      this.completed = true;
      return true;
    }
    return false;
  }
  pause(now: number) { const done = this.tick(now); this.deadline = null; return done; }
  next() {
    if (this.phase === 'focus') this.phase = this.round >= this.settings.rounds ? 'long' : 'short';
    else { this.round = this.phase === 'long' ? 1 : this.round + 1; this.phase = 'focus'; }
    this.reset();
  }
}
