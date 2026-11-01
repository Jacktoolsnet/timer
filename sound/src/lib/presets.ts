import type {InstrumentId} from './instruments';
export const styleIds=['electronic','house','pop','rock','classical','jazz','coffeehouse','ambient','focus','sport'] as const;
export type StyleId=typeof styleIds[number];
type Part={instrument:InstrumentId;steps:number[];pitch?:number;volume?:number};
type Preset={swing?:number;bpm:number;scale:number[];melody:number[];parts:Part[];grid:number[];density:number};
const part=(instrument:InstrumentId,steps:number[],pitch=0,volume=.55):Part=>({instrument,steps,pitch,volume});
const quarters=[0,4,8,12],eighths=[0,2,4,6,8,10,12,14];
export const presets:Record<StyleId,Preset>={
 electronic:{bpm:100,scale:[0,3,5,7,10],melody:[0],grid:Array.from({length:16},(_,i)=>i),density:.23,parts:[part('kick',quarters),part('snare',[4,12]),part('hat',eighths),part('bass',[0,8]),part('marimba',[0,5,10,15])]},
 house:{bpm:124,scale:[0,3,5,7,10],melody:[0,0,2,0,3,2,1,2],grid:eighths,density:.3,parts:[part('kick',quarters),part('clap',[4,12]),part('hat',[2,6,10,14]),part('synthbass',[0,3,6,8,11,14]),part('pluck',[2,6,10,14],2),part('pad',[0,8],0,.35)]},
 pop:{bpm:108,scale:[0,2,4,7,9],melody:[0,1,2,1,3,2,1,0],grid:eighths,density:.25,parts:[part('kick',[0,6,8]),part('snare',[4,12]),part('shaker',eighths),part('bass',quarters),part('piano',[0,4,6,8,12,14]),part('guitar',[2,6,10,14],2,.4)]},
 rock:{bpm:118,scale:[0,3,5,7,10],melody:[0,0,3,2,0,0,2,3],grid:eighths,density:.32,parts:[part('kick',[0,6,8,10]),part('snare',[4,12]),part('hat',eighths),part('bass',[0,2,6,8,10,14]),part('guitar',[0,6,8,14],0,.45),part('tom',[15],0,.4)]},
 classical:{bpm:76,scale:[0,2,4,5,7,9,11],melody:[0,2,4,2,1,3,5,3],grid:[0,2,4,6,8,10,12,14],density:.2,parts:[part('piano',eighths),part('strings',[0,8],2,.35),part('bass',[0,8],0,.4),part('bells',[4,12],4,.25),part('piano',[0,4,8,12],4,.35)]},
 ambient:{bpm:56,scale:[0,2,4,7,9],melody:[0,2,1,3,2,4,1,0],grid:quarters,density:.14,parts:[part('pad',[0,8],0,.4),part('bells',[6],2,.3),part('kalimba',[2,10],1,.4),part('strings',[0],3,.3),part('piano',[4,12],0,.35)]},
 focus:{bpm:80,scale:[0,2,4,7,9],melody:[0,0,1,0,2,1,0,0],grid:quarters,density:.14,parts:[part('pad',[0,8],0,.3),part('bass',[0,8],0,.3),part('pluck',[2,10],1,.3),part('shaker',[4,12],0,.18),part('kalimba',[6,14],0,.25)]},
 sport:{bpm:136,scale:[0,3,5,7,10],melody:[0,0,2,0,3,2,0,2],grid:eighths,density:.32,parts:[part('kick',quarters,0,.65),part('snare',[4,12],0,.5),part('hat',eighths,0,.4),part('synthbass',[0,3,6,8,11,14],0,.5),part('pluck',[2,6,10,14],2,.4),part('clap',[12],0,.3)]},
 jazz:{bpm:92,swing:.2,scale:[0,3,5,6,7,10],melody:[0,2,4,3,2,1,4,2],grid:eighths,density:.23,parts:[part('piano',[0,6,10,14],1,.45),part('bass',quarters,0,.45),part('hat',[0,6,8,14],0,.24),part('snare',[4,12],0,.23),part('organ',[0,8],2,.22)]},
 coffeehouse:{bpm:78,swing:.12,scale:[0,2,3,4,7,9],melody:[0,1,3,1,4,3,1,0],grid:eighths,density:.18,parts:[part('piano',[0,4,10,14],0,.35),part('guitar',[2,6,10,14],1,.3),part('bass',[0,8],0,.35),part('shaker',[2,6,10,14],0,.16),part('organ',[0],2,.18)]}
};
export const styleCopy={
 de:{label:'Musikstil',names:['Electronic','House','Pop','Rock','Klassik','Jazz & Blues','Coffeehouse','Ambient','Fokus','Sport'],pending:'Stilwechsel zum nächsten Takt',hint:'Lädt Instrumente, Tempo und ein neues Startmuster. Alle Klänge sind synthetisch erzeugt.'},
 en:{label:'Music style',names:['Electronic','House','Pop','Rock','Classical','Jazz & Blues','Coffeehouse','Ambient','Focus','Sport'],pending:'Style changes at the next bar',hint:'Loads instruments, tempo and a new starting pattern. All sounds are synthesized.'},
 es:{label:'Estilo musical',names:['Electrónica','House','Pop','Rock','Clásica','Jazz y blues','Café','Ambient','Concentración','Deporte'],pending:'El estilo cambia en el próximo compás',hint:'Carga instrumentos, tempo y un patrón nuevo. Todos los sonidos son sintetizados.'},
 fr:{label:'Style musical',names:['Électronique','House','Pop','Rock','Classique','Jazz & blues','Café','Ambient','Concentration','Sport'],pending:'Le style change à la prochaine mesure',hint:'Charge les instruments, le tempo et un nouveau motif. Tous les sons sont synthétisés.'}
};
