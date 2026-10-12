export interface AlarmNote {
  frequency: number;
  delay: number;
  duration: number;
  wave: OscillatorType;
  level: number;
  endFrequency?: number;
}
export const alarmToneIds = ['classic', 'chimes', 'gentle', 'melody', 'pulse'] as const;
export type AlarmToneId = typeof alarmToneIds[number];
/** All phrases fit within the 1.5-second repeat period and have gentle attack/release envelopes. */
export const alarmTones: Record<AlarmToneId, AlarmNote[]> = {
 classic: [660,880,660].map((frequency,i)=>({frequency,delay:i*.3,duration:.25,wave:'sine',level:.65})),
 chimes: [523.25,659.25,783.99].flatMap((frequency,i)=>[
  {frequency,delay:i*.28,duration:.62,wave:'sine' as const,level:.35},
  {frequency:frequency*2,delay:i*.28,duration:.3,wave:'sine' as const,level:.08},
 ]),
 gentle: [{frequency:392,delay:0,duration:.7,wave:'sine',level:.45},{frequency:523.25,delay:.5,duration:.7,wave:'sine',level:.4}],
 melody: [523.25,659.25,783.99,1046.5].map((frequency,i)=>({frequency,delay:i*.25,duration:.3,wave:'triangle',level:.4})),
 pulse: [0,.22,.44].map(delay=>({frequency:480,endFrequency:880,delay,duration:.18,wave:'triangle',level:.5})),
};
export function alarmTone(value: string): AlarmToneId { return alarmToneIds.find(id=>id===value)||'classic'; }
