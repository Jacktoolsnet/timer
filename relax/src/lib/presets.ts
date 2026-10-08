import {normalize,type Settings} from './relax.ts';
export const presetNames=['summer','evening','focus','nature'] as const;
export type Preset=typeof presetNames[number];
const base={
 instrumentsEnabled:true,chimes:false,bowls:false,kalimba:false,handpan:false,bells:false,gong:false,harp:false,
 instrumentVolume:35,pitch:0,density:4,
 rain:false,wind:false,noise:false,rainVolume:35,windVolume:25,noiseVolume:20,
 rainDensity:4,windActivity:4,noiseType:'pink',
 instrumentAnimation:true,rainAnimation:false,windAnimation:false,
} satisfies Partial<Settings>;
export const presets:Record<Preset,Partial<Settings>>={
 summer:{...base,chimes:true,pitch:-7,rain:true,wind:true,rainAnimation:true,windAnimation:true},
 evening:{...base,handpan:true,instrumentVolume:30,density:2,pitch:-4,wind:true,windVolume:15,windActivity:2,noise:true,noiseType:'brown',noiseVolume:15,windAnimation:true},
 focus:{...base,kalimba:true,instrumentVolume:30,density:3,noise:true,noiseType:'brown',noiseVolume:10},
 nature:{...base,chimes:true,instrumentsEnabled:false,rain:true,wind:true,rainVolume:40,rainAnimation:true,windAnimation:true},
};
export function applyPreset(settings:Settings,preset:Preset):Settings {
 // Duration, safety acknowledgement, global motion, wake lock and consent stay untouched.
 return normalize({...settings,...presets[preset]});
}
export function matchingPreset(settings:Settings):Preset|'custom' {
 return presetNames.find(name=>Object.entries(presets[name]).every(([key,value])=>settings[key as keyof Settings]===value))||'custom';
}
