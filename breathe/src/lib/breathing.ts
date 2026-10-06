export type Durations = [number, number, number, number];
export const presets = {
  box: [4, 4, 4, 4],
  balanced: [5, 0, 5, 0],
  gentle: [4, 0, 6, 0],
  fourSevenEight: [4, 7, 8, 0],
  custom: [4, 4, 4, 4],
} satisfies Record<string, Durations>;
export type Preset = keyof typeof presets;
export interface Settings { preset: Preset; durations: Durations; minutes: number; countSeconds: number; sound: boolean; chime: boolean; safetySeen: boolean; awake: boolean; motion: boolean }
export const defaults: Settings = { preset: 'box', durations: [4,4,4,4], minutes: 3, countSeconds: 1, sound: true, chime: true, safetySeen: false, awake: true, motion: true };
export function normalize(value: unknown): Settings {
  const v = value && typeof value === 'object' ? value as Partial<Settings> : {};
  const valid = (n: unknown, min: number, max: number, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  return {
    preset: v.preset && Object.hasOwn(presets, v.preset) ? v.preset : 'box',
    durations: defaults.durations.map((n,i) => valid(v.durations?.[i], i % 2 === 0 ? 1 : 0, 20, n)) as Durations,
    minutes: valid(v.minutes, 0, 30, 3),
    countSeconds: typeof v.countSeconds === 'number' && Number.isFinite(v.countSeconds) ? Math.max(.5,Math.min(3,Math.round(v.countSeconds*10)/10)) : 1,
    sound: typeof v.sound === 'boolean' ? v.sound : defaults.sound,
    safetySeen: v.safetySeen === true,
    chime: typeof v.chime === 'boolean' ? v.chime : typeof v.sound === 'boolean' ? v.sound : defaults.chime,
    awake: typeof v.awake === 'boolean' ? v.awake : true,
    motion: typeof v.motion === 'boolean' ? v.motion : true,
  };
}
export function breathAt(elapsed: number, durations: Durations, countSeconds = 1) {
  if (!Number.isFinite(countSeconds) || countSeconds <= 0) throw new Error('Invalid counting unit');
  const cycle = durations.reduce((sum,n) => sum+n,0);
  if (!Number.isFinite(cycle) || cycle <= 0 || durations.some(n => n < 0)) throw new Error('Invalid breathing cycle');
  const time = Math.max(0, elapsed) / countSeconds;
  let position = time % cycle;
  for (let phase = 0; phase < 4; phase++) {
    const duration = durations[phase]!;
    if (duration > 0 && position < duration) {
      const progress = position / duration;
      return { phase, remaining: duration-position, round: Math.floor(time/cycle)+1,
        scale: phase === 0 ? .48+.52*progress : phase === 2 ? 1-.52*progress : phase === 1 ? 1 : .48 };
    }
    position -= duration;
  }
  throw new Error('Invalid phase');
}
