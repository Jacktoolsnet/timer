import {ORBIT_COUNT,padAt,type OrbitPad} from './orbit-layout';
/** Companion parts fade to this level while the selected pad stays at its normal level. */
export const RHYTHM_EDIT_MUSIC_LEVEL=.1;
/** Legacy drum order only; matrix pads take their live instrument from the matching orbit. */
export const rhythmInstruments=['hat','snare','kick'] as const;
export type RhythmLane=OrbitPad;
export type TapRhythm={beats:2|3|4;start:number|null;state:'armed'|'recording'|'loop';hits:boolean[][];lastTap:(number|null)[];laneStart:(number|null)[];liveStep:(number|null)[]};
export function emptyRhythm(beats:2|3|4):TapRhythm{
 return {beats,start:null,state:'armed',hits:Array.from({length:ORBIT_COUNT},()=>Array<boolean>(beats*8).fill(false)),lastTap:Array(ORBIT_COUNT).fill(null),laneStart:Array(ORBIT_COUNT).fill(null),liveStep:Array(ORBIT_COUNT).fill(null)};
}
/** Snapshot editing state without sharing mutable rows or transient activity arrays. */
export function cloneRhythm(rhythm:TapRhythm):TapRhythm{
 return {...rhythm,hits:rhythm.hits.map(row=>[...row]),lastTap:[...rhythm.lastTap],laneStart:[...rhythm.laneStart],liveStep:[...rhythm.liveStep]};
}
export function hasRhythm(rhythm:TapRhythm){return rhythm.hits.some(lane=>lane.some(Boolean));}
export const rhythmLane=padAt;
export function replacingRhythmLane(rhythm:TapRhythm,position:number,lane:RhythmLane){
 const last=rhythm.lastTap[lane];
 return rhythm.hits[lane].some(Boolean)&&(last===null||position-last>rhythm.beats*8+.5);
}
/** Overdub on a fixed two-bar clock. A pause longer than two bars starts a fresh take
 * on that instrument only; other lanes and the loop's phase are never reset.
 */
export function recordRhythmHit(rhythm:TapRhythm,position:number,lane:RhythmLane){
 if(!Number.isFinite(position))return false;
 const at=Math.max(0,Math.round(position)),length=rhythm.beats*8;
 if(rhythm.start===null){rhythm.start=at;rhythm.state='recording';}
 const fresh=replacingRhythmLane(rhythm,position,lane)||!rhythm.hits[lane].some(Boolean);
 if(fresh){rhythm.hits[lane].fill(false);rhythm.laneStart[lane]=at;}
 rhythm.lastTap[lane]=position;rhythm.liveStep[lane]=at;
 rhythm.hits[lane][((at-rhythm.start)%length+length)%length]=true;return true;
}
export function rhythmHitsAt(rhythm:TapRhythm,step:number):RhythmLane[]{
 if(rhythm.start===null||step<rhythm.start)return [];
 const elapsed=step-rhythm.start,length=rhythm.beats*8;
 return rhythm.hits.flatMap((lane,i)=>lane[elapsed%length]
  &&(rhythm.laneStart[i]===null||step>=rhythm.laneStart[i]!+length)
  &&rhythm.liveStep[i]!==step?[i as RhythmLane]:[]);
}
export function rhythmBarPoints(rhythm:TapRhythm,lane:RhythmLane,barStart:number,slots:number){
 const points=Array<boolean>(16).fill(false),steps=rhythm.beats*4,length=steps*2;
 if(rhythm.start===null)return points;
 for(let s=0;s<steps;s++){
  const at=((barStart+s-rhythm.start)%length+length)%length;
  if(rhythm.hits[lane][at])points[Math.floor(s/steps*slots)]=true;
 }
 return points;
}
/** Clock and editing activity are transient, never part of saved patterns. */
export function resetRhythmSession(rhythm:TapRhythm){
 rhythm.lastTap.fill(null);rhythm.laneStart.fill(null);rhythm.liveStep.fill(null);
}
export function finishRhythm(rhythm:TapRhythm){rhythm.state=hasRhythm(rhythm)?'loop':'armed';if(rhythm.state==='armed')rhythm.start=null;}
/** Keep each bar's relative beat positions when the user changes between 3/4 and 4/4. */
export function remeterRhythm(rhythm:TapRhythm,beats:2|3|4,start:number){
 if(beats===rhythm.beats)return;
 const old=rhythm.beats*4,result=emptyRhythm(beats);
 rhythm.hits.forEach((lane,i)=>lane.forEach((on,s)=>{if(on)result.hits[i][Math.floor(s/old)*beats*4+Math.min(beats*4-1,Math.round(s%old/old*beats*4))]=true;}));
 rhythm.beats=beats;rhythm.hits=result.hits;resetRhythmSession(rhythm);finishRhythm(rhythm);rhythm.start=hasRhythm(rhythm)?start:null;
}
export const rhythmCopy={
 de:{group:'Flächenmodus',draw:'Zeichnen',rhythm:'Rhythmus',record:'Neu aufnehmen',clear:'Rhythmus löschen',hint:'Klopfe Deinen Rhythmus',keyboard:'Ziffernblock oder Zahlen 1–9: oben 7–8–9, Mitte 4–5–6, unten 1–2–3. Pfeile wählen ein Pad; Leertaste oder Enter spielt es. Gleichzeitige Tasten sind möglich.',armed:'Bereit · erster Schlag startet die Zweitakt-Aufnahme',recording:'Aufnahme · zwei Takte',loop:'Dein Rhythmus läuft · tippen zum Weiterbearbeiten',cancel:'Aufnahme abbrechen',done:'Fertig übernehmen',editing:'Spuren nacheinander einklopfen · Fertig übernimmt den Rhythmus',paused:'Rhythmus gespeichert · mit Play fortsetzen',progress:'Zweitakt-Aufnahme'},
 en:{group:'Pad mode',draw:'Draw',rhythm:'Rhythm',record:'Record again',clear:'Clear rhythm',hint:'Tap your rhythm',keyboard:'Numpad or numbers 1–9: top 7–8–9, middle 4–5–6, bottom 1–2–3. Arrows select a pad; Space or Enter plays it. Simultaneous keys work.',armed:'Ready · first hit starts a two-bar recording',recording:'Recording · two bars',loop:'Your rhythm is looping · tap to edit again',cancel:'Cancel recording',done:'Finish',editing:'Add one instrument at a time · Finish accepts your rhythm',paused:'Rhythm retained · press Play to continue',progress:'Two-bar recording'},
 es:{group:'Modo del área',draw:'Dibujar',rhythm:'Ritmo',record:'Grabar de nuevo',clear:'Borrar ritmo',hint:'Toca tu ritmo',keyboard:'Teclado numérico o números 1–9: arriba 7–8–9, centro 4–5–6, abajo 1–2–3. Las flechas eligen un pad; Espacio o Intro lo toca. Puedes pulsar varias teclas.',armed:'Listo · el primer golpe inicia dos compases',recording:'Grabando · dos compases',loop:'Tu ritmo se repite · toca para editar',cancel:'Cancelar grabación',done:'Finalizar',editing:'Añade un instrumento a la vez · Finalizar acepta tu ritmo',paused:'Ritmo conservado · pulsa Play para continuar',progress:'Grabación de dos compases'},
 fr:{group:'Mode de la surface',draw:'Dessiner',rhythm:'Rythme',record:'Réenregistrer',clear:'Effacer le rythme',hint:'Jouez votre rythme',keyboard:'Pavé numérique ou chiffres 1–9 : en haut 7–8–9, au milieu 4–5–6, en bas 1–2–3. Les flèches choisissent un pad ; Espace ou Entrée le joue. Les touches simultanées fonctionnent.',armed:'Prêt · le premier coup lance deux mesures',recording:'Enregistrement · deux mesures',loop:'Votre rythme tourne · touchez pour modifier',cancel:'Annuler la saisie',done:'Terminer',editing:'Ajoutez les instruments un par un · Terminer valide le rythme',paused:'Rythme conservé · appuyez sur Play pour continuer',progress:'Enregistrement de deux mesures'}
};
