import type {InstrumentId} from './instruments';
/** Exhaustive articulation audit: a held reed must not use the envelope of a struck bar. */
export const instrumentFamily:Record<InstrumentId,'percussion'|'plucked'|'struck'|'bowed'|'wind'|'keys'|'pad'|'vocal'>={
 kick:'percussion',snare:'percussion',hat:'percussion',clap:'percussion',tom:'percussion',rim:'percussion',shaker:'percussion',
 bass:'plucked',doublebass:'plucked',guitar:'plucked',harp:'plucked',kalimba:'plucked',
 piano:'struck',epiano:'struck',marimba:'struck',bells:'struck',pluck:'plucked',synthbass:'plucked',
 conga:'percussion',vibraphone:'struck',acidbass:'plucked',analoglead:'keys',shimmer:'pad',cello:'bowed',flute:'wind',clarinet:'wind',trumpet:'wind',horn:'wind',
 violin:'bowed',viola:'bowed',bowedbass:'bowed',strings:'bowed',saxophone:'wind',organ:'keys',pad:'pad',voice:'vocal',choir:'vocal',vocalpad:'pad'
};
