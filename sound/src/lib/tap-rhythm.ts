export const rhythmInstruments=['hat','snare','kick'] as const;
export type RhythmLane=0|1|2;
export type TapRhythm={beats:2|3|4;start:number|null;state:'armed'|'recording'|'loop';hits:boolean[][];lastTap:(number|null)[];laneStart:(number|null)[];liveStep:(number|null)[]};
export function emptyRhythm(beats:2|3|4):TapRhythm{
 return {beats,start:null,state:'armed',hits:rhythmInstruments.map(()=>Array<boolean>(beats*8).fill(false)),lastTap:[null,null,null],laneStart:[null,null,null],liveStep:[null,null,null]};
}
export function hasRhythm(rhythm:TapRhythm){return rhythm.hits.some(lane=>lane.some(Boolean));}
export function rhythmLane(y:number,height:number):RhythmLane{return Math.max(0,Math.min(2,Math.floor(y/height*3))) as RhythmLane;}
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
 de:{group:'Flächenmodus',draw:'Zeichnen',rhythm:'Rhythmus',record:'Neu aufnehmen',clear:'Rhythmus löschen',hint:'Klopfe Deinen Rhythmus',help:'Oben Hi-Hat · Mitte Snare · unten Bassdrum. Mehrere Finger gleichzeitig sind möglich. Spiele die Instrumente nacheinander ein: Dein Zweitakt-Muster wird laufend ergänzt. Nach mehr als zwei Takten Klopfpause ersetzt der nächste Schlag nur die betroffene Spur. Beim Einspielen ist die Orbit-Musik leiser. Fertig übernehmen bringt sie sanft zurück. Dein Rhythmus bleibt auch bei Zufalls-Play erhalten.',keyboard:'Tastatur: 1 = Hi-Hat, 2 = Snare, 3 = Bassdrum. Pfeile wählen einen Bereich; Leertaste oder Enter schlägt an.',armed:'Bereit · erster Schlag startet die Zweitakt-Aufnahme',recording:'Aufnahme · zwei Takte',loop:'Dein Rhythmus läuft · tippen zum Weiterbearbeiten',done:'Fertig übernehmen',editing:'Spuren nacheinander einklopfen · Fertig übernimmt den Rhythmus',paused:'Rhythmus gespeichert · mit Play fortsetzen',progress:'Zweitakt-Aufnahme',lanes:['Hi-Hat','Snare','Bassdrum']},
 en:{group:'Pad mode',draw:'Draw',rhythm:'Rhythm',record:'Record again',clear:'Clear rhythm',hint:'Tap your rhythm',help:'Top: hi-hat · middle: snare · bottom: kick. Use several fingers at once. Build the two-bar loop one instrument at a time. New hits add to it; after more than two bars without tapping that instrument, its next hit replaces only that lane. Orbit music is quieter while editing. Finish restores it smoothly. Random Play keeps your rhythm.',keyboard:'Keyboard: 1 = hi-hat, 2 = snare, 3 = kick. Arrows choose an area; Space or Enter plays a hit.',armed:'Ready · first hit starts a two-bar recording',recording:'Recording · two bars',loop:'Your rhythm is looping · tap to edit again',done:'Finish',editing:'Add one instrument at a time · Finish accepts your rhythm',paused:'Rhythm retained · press Play to continue',progress:'Two-bar recording',lanes:['Hi-hat','Snare','Kick']},
 es:{group:'Modo del área',draw:'Dibujar',rhythm:'Ritmo',record:'Grabar de nuevo',clear:'Borrar ritmo',hint:'Toca tu ritmo',help:'Arriba: hi-hat · centro: caja · abajo: bombo. Puedes usar varios dedos a la vez. Construye el bucle de dos compases instrumento por instrumento. Los golpes se añaden; tras más de dos compases sin tocar ese instrumento, el siguiente golpe sustituye solo esa pista. La música del órbit está más baja al editar. Finalizar recupera su volumen suavemente. El modo aleatorio conserva tu ritmo.',keyboard:'Teclado: 1 = hi-hat, 2 = caja, 3 = bombo. Las flechas eligen una zona; Espacio o Intro toca un golpe.',armed:'Listo · el primer golpe inicia dos compases',recording:'Grabando · dos compases',loop:'Tu ritmo se repite · toca para editar',done:'Finalizar',editing:'Añade un instrumento a la vez · Finalizar acepta tu ritmo',paused:'Ritmo conservado · pulsa Play para continuar',progress:'Grabación de dos compases',lanes:['Hi-hat','Caja','Bombo']},
 fr:{group:'Mode de la surface',draw:'Dessiner',rhythm:'Rythme',record:'Réenregistrer',clear:'Effacer le rythme',hint:'Jouez votre rythme',help:'En haut : charleston · au milieu : caisse claire · en bas : grosse caisse. Plusieurs doigts peuvent jouer ensemble. Construisez la boucle de deux mesures instrument par instrument. Les coups s’ajoutent ; après plus de deux mesures sans jouer un instrument, le coup suivant remplace seulement sa piste. La musique des orbites baisse pendant la saisie. Terminer rétablit doucement son volume. La lecture aléatoire conserve votre rythme.',keyboard:'Clavier : 1 = charleston, 2 = caisse claire, 3 = grosse caisse. Les flèches choisissent une zone ; Espace ou Entrée joue un coup.',armed:'Prêt · le premier coup lance deux mesures',recording:'Enregistrement · deux mesures',loop:'Votre rythme tourne · touchez pour modifier',done:'Terminer',editing:'Ajoutez les instruments un par un · Terminer valide le rythme',paused:'Rythme conservé · appuyez sur Play pour continuer',progress:'Enregistrement de deux mesures',lanes:['Charleston','Caisse claire','Grosse caisse']}
};
