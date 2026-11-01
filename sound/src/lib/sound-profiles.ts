import type {StyleId} from './presets';
/** Timbre, not master loudness: roll off brittle harmonics and shape transients. */
export const soundProfiles:Record<StyleId,{cutoff:number;attack:number;decay:number;warm:boolean}>={
 electronic:{cutoff:8000,attack:1,decay:1,warm:false},
 house:{cutoff:7000,attack:1,decay:.85,warm:false},
 pop:{cutoff:4800,attack:1.3,decay:.9,warm:false},
 rock:{cutoff:5500,attack:1,decay:.8,warm:false},
 classical:{cutoff:3600,attack:1.7,decay:1.1,warm:true},
 ambient:{cutoff:2600,attack:2.2,decay:1.4,warm:true},
 focus:{cutoff:1900,attack:2.5,decay:1.2,warm:true},
 sport:{cutoff:6500,attack:1,decay:.8,warm:false},
 jazz:{cutoff:2300,attack:2,decay:.85,warm:true},
 coffeehouse:{cutoff:1750,attack:2.8,decay:.9,warm:true}
};
