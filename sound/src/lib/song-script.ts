import {instrumentIds,type InstrumentId} from './instruments';
import {styleIds,type StyleId} from './presets';
import {visualizationModes,type VisualizationMode} from './visualization';
import type {NoteScore} from './note-score';
export type ScriptNote={at:number;duration:number;pitch:number|number[];velocity:number;toPitch?:number;toVelocity?:number};
export type ScriptPart={track:string;volume?:number;notes:ScriptNote[]};
export type ScriptScene={name:string;bars:number;parts:ScriptPart[];variation?:number;visualization?:VisualizationMode};
export type SongScript={format:'jacktools-song';version:1;title:string;bpm:number;style:StyleId;loop:boolean;seed:number;tracks:{id:string;instrument:InstrumentId;volume:number}[];scenes:ScriptScene[]};
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const num=(v:unknown,a:number,b:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const pitch=(v:unknown)=>num(v,-24,60)&&Number.isInteger(v);
const keys=(v:Record<string,any>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
/** Strict, bounded data only: no code, URLs, expressions or arbitrary engine parameters. */
export function validSongScript(s:unknown):s is SongScript{
 if(!object(s)||!keys(s,['format','version','title','bpm','style','loop','seed','tracks','scenes'])||s.format!=='jacktools-song'||s.version!==1
  ||typeof s.title!=='string'||!s.title.trim()||s.title.length>80||!num(s.bpm,40,220)||!(styleIds as readonly unknown[]).includes(s.style)
  ||['slowwaltz','tango'].includes(s.style)||typeof s.loop!=='boolean'||!num(s.seed,0,2147483647)||!Number.isInteger(s.seed)
  ||!Array.isArray(s.tracks)||s.tracks.length<1||s.tracks.length>9||!Array.isArray(s.scenes)||s.scenes.length<1||s.scenes.length>64)return false;
 const ids=new Set<string>();
 for(const tr of s.tracks){
  if(!object(tr)||!keys(tr,['id','instrument','volume'])||typeof tr.id!=='string'||!/^[a-z][a-z0-9_-]{0,31}$/.test(tr.id)||ids.has(tr.id)
   ||!(instrumentIds as readonly unknown[]).includes(tr.instrument)||!num(tr.volume,0,1))return false;
  ids.add(tr.id);
 }
 let bars=0,total=0;
 for(const scene of s.scenes){
  if(!object(scene)||!keys(scene,['name','bars','parts','variation','visualization'])||typeof scene.name!=='string'||!scene.name.trim()||scene.name.length>80
   ||!num(scene.bars,2,64)||!Number.isInteger(scene.bars)||scene.bars%2!==0||!Array.isArray(scene.parts)||scene.parts.length>9
   ||scene.variation!==undefined&&!num(scene.variation,0,.15)||scene.visualization!==undefined&&!(visualizationModes as readonly unknown[]).includes(scene.visualization))return false;
  bars+=scene.bars;if(bars>512)return false;
  const used=new Set<string>();
  for(const part of scene.parts){
   if(!object(part)||!keys(part,['track','volume','notes'])||!ids.has(part.track)||used.has(part.track)||part.volume!==undefined&&!num(part.volume,0,1)
    ||!Array.isArray(part.notes)||part.notes.length>128)return false;
   used.add(part.track);let voices=0;
   for(const note of part.notes){
    if(!object(note)||!keys(note,['at','duration','pitch','velocity','toPitch','toVelocity'])||!num(note.at,0,7.984)||!num(note.duration,.016,8)
     ||note.at+note.duration>8.000001||!num(note.velocity,0,1)||note.toPitch!==undefined&&!pitch(note.toPitch)||note.toVelocity!==undefined&&!num(note.toVelocity,0,1))return false;
    const pitches=Array.isArray(note.pitch)?note.pitch:[note.pitch];
    if(!pitches.length||pitches.length>8||!pitches.every(pitch)||new Set(pitches).size!==pitches.length||pitches.length>1&&note.toPitch!==undefined)return false;
    voices+=pitches.length;
   }
   if(voices>128)return false;total+=voices;if(total>8192)return false;
  }
 }
 return true;
}
export function decodeSongScript(raw:string):SongScript|null{
 if(raw.length>1024*1024||new TextEncoder().encode(raw).byteLength>1024*1024)return null;
 try{const s:unknown=JSON.parse(raw);return validSongScript(s)?s:null;}catch{return null;}
}
/** Scene boundaries align with the engine's existing two-bar score clock. */
export function scriptPosition(s:SongScript,bar:number){
 const total=s.scenes.reduce((n,scene)=>n+scene.bars,0);
 if(!s.loop&&bar>=total)return null;
 const turn=Math.floor(Math.max(0,bar)/total);let local=Math.max(0,bar)%total;
 for(let index=0;index<s.scenes.length;index++){
  if(local<s.scenes[index].bars)return {index,bar:local,turn};local-=s.scenes[index].bars;
 }
 return null;
}
/** Seeded velocity variation never changes pitch, rhythm or the source JSON. */
export function scriptScore(part:ScriptPart|undefined,variation=0,seed=0):NoteScore{
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 return (part?.notes??[]).flatMap(note=>(Array.isArray(note.pitch)?note.pitch:[note.pitch]).map(p=>{
  const factor=1+(random()*2-1)*variation,velocity=Math.max(0,Math.min(1,note.velocity*factor));
  return {start:note.at/8,duration:note.duration/8,points:[{offset:0,pitch:p,velocity},
   ...(note.toPitch!==undefined||note.toVelocity!==undefined?[{offset:note.duration/8*.95,pitch:note.toPitch??p,velocity:Math.max(0,Math.min(1,(note.toVelocity??note.velocity)*factor))}]:[])]};
 })).sort((a,b)=>a.start-b.start);
}
export const scriptCopy={
 de:{title:'Song-Script',hint:'Ein komponiertes Lied aus Szenen und Zweitakt-Mustern. JSON einfügen oder als Datei laden; danach normales Play drücken. Alles bleibt im Browser.',text:'Song-Script als JSON',load:'Script laden',file:'Datei wählen',example:'Beispiel laden',guide:'KI-Anleitung herunterladen',export:'Script herunterladen',leave:'Script-Modus verlassen',invalid:'Ungültiges Song-Script. Bitte Format und Grenzwerte in der KI-Anleitung prüfen.',ready:'Geladen – normales Play startet das Lied von vorne.',inactive:'Kein Song-Script geladen.',editing:'Zeichnen und Klopfen ändern die aktuelle Szene vorübergehend. Die nächste Szene folgt wieder dem Script. Zufalls-Play oder ein Stilwechsel verlassen den Script-Modus.'},
 en:{title:'Song script',hint:'A composed song built from scenes and two-bar patterns. Paste JSON or load a file, then press normal Play. Everything stays in your browser.',text:'Song script JSON',load:'Load script',file:'Choose file',example:'Load example',guide:'Download AI guide',export:'Download script',leave:'Leave script mode',invalid:'Invalid song script. Check the format and limits in the AI guide.',ready:'Loaded – normal Play starts the song from the beginning.',inactive:'No song script loaded.',editing:'Drawing and tapping temporarily change the current scene. The next scene follows the script again. Random Play or a style change leaves script mode.'},
 es:{title:'Guion musical',hint:'Una canción compuesta por escenas y patrones de dos compases. Pega JSON o carga un archivo y pulsa Play normal. Todo permanece en tu navegador.',text:'Guion musical JSON',load:'Cargar guion',file:'Elegir archivo',example:'Cargar ejemplo',guide:'Descargar guía para IA',export:'Descargar guion',leave:'Salir del modo guion',invalid:'Guion no válido. Consulta el formato y los límites en la guía para IA.',ready:'Cargado: Play normal inicia la canción desde el principio.',inactive:'No hay ningún guion cargado.',editing:'Dibujar y tocar cambian temporalmente la escena actual. La siguiente vuelve al guion. Play aleatorio o cambiar de estilo sale del modo guion.'},
 fr:{title:'Script musical',hint:'Un morceau composé de scènes et de motifs de deux mesures. Collez le JSON ou chargez un fichier, puis lancez Play normal. Tout reste dans le navigateur.',text:'Script musical JSON',load:'Charger le script',file:'Choisir un fichier',example:'Charger l’exemple',guide:'Télécharger le guide IA',export:'Télécharger le script',leave:'Quitter le mode script',invalid:'Script invalide. Consultez le format et les limites du guide IA.',ready:'Chargé : Play normal démarre le morceau au début.',inactive:'Aucun script chargé.',editing:'Dessiner et taper modifient temporairement la scène actuelle. La suivante reprend le script. Play aléatoire ou un changement de style quitte le mode script.'}
} as const;
