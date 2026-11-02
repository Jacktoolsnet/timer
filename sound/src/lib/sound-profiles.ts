import type {StyleId} from './presets';
/** Timbre, not master loudness: roll off brittle harmonics and shape transients. */
export const soundProfiles:Record<StyleId,{cutoff:number;attack:number;decay:number;warm:boolean}>={
 hiphop:{cutoff:3200,attack:1.3,decay:.8,warm:true},
 lofi:{cutoff:1400,attack:2.5,decay:.85,warm:true},
 funk:{cutoff:5200,attack:1,decay:.55,warm:true},
 reggae:{cutoff:3000,attack:1.4,decay:.6,warm:true},
 drumandbass:{cutoff:6500,attack:1,decay:.65,warm:false},
 latin:{cutoff:3200,attack:1.8,decay:.75,warm:true},
 electronic:{cutoff:8000,attack:1,decay:1,warm:false},
 house:{cutoff:7000,attack:1,decay:.85,warm:false},
 pop:{cutoff:4800,attack:1.3,decay:.9,warm:false},
 rock:{cutoff:5500,attack:1,decay:.8,warm:false},
 slowwaltz:{cutoff:3000,attack:2.1,decay:1.2,warm:true},
 classical:{cutoff:3600,attack:1.7,decay:1.1,warm:true},
 ambient:{cutoff:2600,attack:2.2,decay:1.4,warm:true},
 focus:{cutoff:1900,attack:2.5,decay:1.2,warm:true},
 sport:{cutoff:6500,attack:1,decay:.8,warm:false},
 tango:{cutoff:3600,attack:1.3,decay:.65,warm:true},
 jazz:{cutoff:2300,attack:2,decay:.85,warm:true},
 coffeehouse:{cutoff:1750,attack:2.8,decay:.9,warm:true}
};
