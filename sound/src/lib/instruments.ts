export const instrumentIds=['kick','snare','hat','bass','marimba','clap','tom','rim','shaker','bells','kalimba','pluck','synthbass','piano','strings','guitar','organ','pad','saxophone','harp','doublebass','epiano','voice','choir','vocalpad'] as const;
export type InstrumentId=typeof instrumentIds[number];
export const defaultInstruments:InstrumentId[]=['kick','snare','hat','bass','marimba','bells','kalimba','pad'];
export const instrumentNames={
 de:['Kick','Snare','Hi-Hat','Bass','Marimba','Clap','Tom','Rimshot','Shaker','Glockenspiel','Kalimba','Pluck-Synth','Synth-Bass','Klavier','Streicher','Gitarre','Orgel','Flächenklang','Saxofon','Harfe','Kontrabass','E-Piano','Solo-Stimme','Chor','Vocal-Pad'],
 en:['Kick','Snare','Hi-hat','Bass','Marimba','Clap','Tom','Rimshot','Shaker','Glockenspiel','Kalimba','Pluck synth','Synth bass','Piano','Strings','Guitar','Organ','Soft pad','Saxophone','Harp','Double bass','Electric piano','Solo voice','Choir','Vocal pad'],
 es:['Bombo','Caja','Charles','Bajo','Marimba','Palmas','Tom','Golpe de aro','Shaker','Glockenspiel','Kalimba','Sintetizador pulsado','Bajo sintético','Piano','Cuerdas','Guitarra','Órgano','Pad suave','Saxofón','Arpa','Contrabajo','Piano eléctrico','Voz solista','Coro','Pad vocal'],
 fr:['Grosse caisse','Caisse claire','Charleston','Basse','Marimba','Clap','Tom','Rimshot','Shaker','Glockenspiel','Kalimba','Synthé pincé','Basse synthé','Piano','Cordes','Guitare','Orgue','Nappe douce','Saxophone','Harpe','Contrebasse','Piano électrique','Voix solo','Chœur','Nappe vocale']
};
export const instrumentLabel={de:'Instrument',en:'Instrument',es:'Instrumento',fr:'Instrument'};

export const trackLabels={de:{enable:'Bahn aktivieren',hint:'Fünf Bahnen zum Start. Schalte bis zu drei weitere hinzu.'},en:{enable:'Enable orbit',hint:'Start with five orbits. Enable up to three more.'},es:{enable:'Activar órbita',hint:'Empieza con cinco órbitas. Activa hasta tres más.'},fr:{enable:'Activer l’orbite',hint:'Commence avec cinq orbites. Active jusqu’à trois de plus.'}};
