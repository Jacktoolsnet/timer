import {decodeSettings,type SoundSettings} from './sound-settings';
import {validMeter,validTempoUnit,type SongMeter,type TempoUnit} from './song-meter';
export const ORBIT_SET_COUNT=9;
export type OrbitSet={name:string;muted:boolean;settings:SoundSettings|null;barOffset:number};
export type OrbitClock={meter:SongMeter;tempoUnit:TempoUnit;quarters:number;steps:number;swing:number};
export type OrbitProject={format:'jacktools-orbit-project';version:1;active:number;bpm:number;volume:number;clock:OrbitClock;sets:OrbitSet[]};
export function emptyOrbitSet():OrbitSet{return {name:'',muted:false,settings:null,barOffset:0};}
/** No nested projects or executable data; validate every legacy settings payload atomically. */
export function decodeOrbitProject(raw:string|null):OrbitProject|null{
 if(!raw||new TextEncoder().encode(raw).length>12*1024*1024)return null;
 try{
  const p=JSON.parse(raw),c=p?.clock;
  if(p?.format!=='jacktools-orbit-project'||p.version!==1||!Number.isInteger(p.active)||p.active<0||p.active>=9
   ||!Number.isFinite(p.bpm)||p.bpm<40||p.bpm>220||!Number.isFinite(p.volume)||p.volume<0||p.volume>.7
   ||!c||!validMeter(c.meter)||!validTempoUnit(c.tempoUnit)||c.quarters!==c.meter.numerator*4/c.meter.denominator||c.steps!==c.quarters*4
   ||!Number.isFinite(c.swing)||c.swing<0||c.swing>.6||!Array.isArray(p.sets)||p.sets.length!==9)return null;
  for(const slot of p.sets){
   if(!slot||typeof slot.name!=='string'||slot.name.length>80||typeof slot.muted!=='boolean'||!Number.isSafeInteger(slot.barOffset)||Math.abs(slot.barOffset)>1e9)return null;
   if(slot.settings!==null){
    const settings=decodeSettings(JSON.stringify(slot.settings));if(!settings)return null;slot.settings=settings;
    const s=settings.songScript,m=s?.version===3?s.meter:{numerator:s?4:c.meter.numerator,denominator:s?4:c.meter.denominator};
    if(s&&(m.numerator!==c.meter.numerator||m.denominator!==c.meter.denominator))return null;
   }
  }
  if(!p.sets[p.active].settings)return null;
  return p as OrbitProject;
 }catch{return null;}
}
export const orbitSetCopy={
 de:{title:'Orbit-Sets',hint:'Bis zu neun vollständige Sets spielen gemeinsam. Du bearbeitest immer das ausgewählte Set. Tempo, Takt und Gesamtlautstärke gelten gemeinsam.',choose:'Set auswählen',empty:'Leer · neues Set',mute:'Set stummschalten',unmute:'Set einschalten',duplicate:'Ausgewähltes Set duplizieren',clear:'Ausgewähltes Set leeren',name:'Name des Sets',close:'Schließen',full:'Alle neun Plätze sind belegt.',incompatible:'Dieses Lied hat eine andere Taktart. Bitte in einem neuen Projekt öffnen.',pending:'Bitte zuerst die aktuelle Bearbeitung übernehmen oder verwerfen.',confirm:'Dieses Set wirklich leeren? Die anderen Sets bleiben erhalten.'},
 en:{title:'Orbit sets',hint:'Up to nine complete sets play together. You edit the selected set. Tempo, meter and master volume are shared.',choose:'Select set',empty:'Empty · new set',mute:'Mute set',unmute:'Unmute set',duplicate:'Duplicate selected set',clear:'Clear selected set',name:'Set name',close:'Close',full:'All nine slots are occupied.',incompatible:'This song uses a different meter. Open it in a new project.',pending:'Accept or discard the current edit first.',confirm:'Really clear this set? Other sets will be kept.'},
 es:{title:'Conjuntos orbitales',hint:'Hasta nueve conjuntos completos suenan juntos. Editas el seleccionado. Tempo, compás y volumen general son comunes.',choose:'Seleccionar conjunto',empty:'Vacío · nuevo conjunto',mute:'Silenciar conjunto',unmute:'Activar conjunto',duplicate:'Duplicar conjunto seleccionado',clear:'Vaciar conjunto seleccionado',name:'Nombre del conjunto',close:'Cerrar',full:'Las nueve posiciones están ocupadas.',incompatible:'Esta canción usa otro compás. Ábrela en un proyecto nuevo.',pending:'Acepta o descarta primero los cambios.',confirm:'¿Vaciar este conjunto? Se conservarán los demás.'},
 fr:{title:'Ensembles orbitaux',hint:'Jusqu’à neuf ensembles complets jouent ensemble. Vous modifiez celui sélectionné. Tempo, mesure et volume général sont communs.',choose:'Sélectionner un ensemble',empty:'Vide · nouvel ensemble',mute:'Couper cet ensemble',unmute:'Activer cet ensemble',duplicate:'Dupliquer la sélection',clear:'Vider la sélection',name:'Nom de l’ensemble',close:'Fermer',full:'Les neuf emplacements sont occupés.',incompatible:'Ce morceau utilise une autre mesure. Ouvrez-le dans un nouveau projet.',pending:'Validez ou annulez d’abord les modifications.',confirm:'Vider cet ensemble ? Les autres seront conservés.'}
} as const;
