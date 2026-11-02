import type {InstrumentId} from './instruments';
export const instrumentGroups={
 drums:['kick','snare','hat','clap','tom','rim','shaker'],
 bass:['bass','synthbass','doublebass'],
 keys:['piano','epiano','organ','marimba','kalimba','bells'],
 strings:['strings','guitar','harp'],
 winds:['saxophone'],
 voices:['voice','choir','vocalpad'],
 synths:['pluck','pad']
} satisfies Record<string,InstrumentId[]>;
export type InstrumentGroup=keyof typeof instrumentGroups;
export const pickerCopy={
 de:{choose:'Instrument wählen',mute:'Spur stummschalten',unmute:'Spur einschalten',close:'Auswahl schließen',groups:'Instrumentengruppen',drums:'Schlagzeug',bass:'Bässe',keys:'Tasten & Klangstäbe',strings:'Saiten & Streicher',winds:'Bläser',voices:'Stimmen',synths:'Synthesizer'},
 en:{choose:'Choose instrument',mute:'Mute track',unmute:'Unmute track',close:'Close picker',groups:'Instrument groups',drums:'Drums',bass:'Basses',keys:'Keys & mallets',strings:'Strings',winds:'Winds',voices:'Voices',synths:'Synthesizers'},
 es:{choose:'Elegir instrumento',mute:'Silenciar pista',unmute:'Activar sonido',close:'Cerrar selección',groups:'Grupos de instrumentos',drums:'Percusión',bass:'Bajos',keys:'Teclas y láminas',strings:'Cuerdas',winds:'Viento',voices:'Voces',synths:'Sintetizadores'},
 fr:{choose:'Choisir un instrument',mute:'Couper la piste',unmute:'Réactiver la piste',close:'Fermer la sélection',groups:'Familles d’instruments',drums:'Percussions',bass:'Basses',keys:'Claviers et lames',strings:'Cordes',winds:'Vents',voices:'Voix',synths:'Synthétiseurs'}
};
