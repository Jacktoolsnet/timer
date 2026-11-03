/** A two-bar performance. Positions/durations are fractions of the complete loop. */
export type ScorePoint={offset:number;pitch:number;velocity:number};
export type ScoreNote={start:number;duration:number;points:ScorePoint[]};
export type NoteScore=ScoreNote[];
export const cloneScore=(score:NoteScore):NoteScore=>score.map(n=>({...n,points:n.points.map(p=>({...p}))}));
export const scoreClamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function validScore(value:unknown):value is NoteScore{
 if(!Array.isArray(value)||value.length>128)return false;
 return value.every(n=>n&&Number.isFinite(n.start)&&n.start>=0&&n.start<1&&Number.isFinite(n.duration)&&n.duration>=.002&&n.start+n.duration<=1.000001
  &&Array.isArray(n.points)&&n.points.length>0&&n.points.length<=32&&n.points.every((p:ScorePoint,i:number)=>p&&Number.isFinite(p.offset)&&p.offset>=0&&p.offset<n.duration
   &&(i===0?p.offset===0:p.offset>n.points[i-1].offset)&&Number.isInteger(p.pitch)&&p.pitch>=-24&&p.pitch<=60
   &&Number.isFinite(p.velocity)&&p.velocity>=.05&&p.velocity<=1));
}
export function scoreValue(note:ScoreNote,offset:number):ScorePoint{
 const next=note.points.findIndex(p=>p.offset>offset);
 if(next<0)return {...note.points.at(-1)!};
 if(next===0)return {...note.points[0]};
 const a=note.points[next-1],b=note.points[next],t=scoreClamp((offset-a.offset)/(b.offset-a.offset),0,1);
 return {offset,pitch:a.pitch+(b.pitch-a.pitch)*t,velocity:a.velocity+(b.velocity-a.velocity)*t};
}
export function deleteScorePoint(score:NoteScore,noteIndex:number,pointIndex:number){
 const result=cloneScore(score),note=result[noteIndex];if(!note)return result;
 note.points.splice(pointIndex,1);
 if(!note.points.length)result.splice(noteIndex,1);
 else if(pointIndex===0){const shift=note.points[0].offset;note.start+=shift;note.duration=Math.max(.002,note.duration-shift);note.start=Math.min(note.start,1-note.duration);note.points.forEach(p=>p.offset-=shift);}
 return result;
}
export const noteEditorCopy={
 de:{mode:'Noteneditor',choose:'Instrument zum Bearbeiten wählen',snap:'Am Taktraster einrasten',done:'Noten übernehmen',cancel:'Änderungen verwerfen',remove:'Ausgewählten Tonpunkt löschen',volume:'Lautstärke des Tonpunkts',back:'Zur Instrumentenauswahl',pending:'Bitte zuerst übernehmen oder verwerfen.',help:'Klicken setzt eine Note. Nach rechts ziehen verlängert sie; dabei nach oben oder unten ziehen verbindet Tonhöhen. Tonpunkt auswählen: Lautstärke rechts ändern oder mit Papierkorb / Entf löschen. Enter übernimmt, Esc verwirft. Zwei Takte; die Tonhöhenlinien sind Halbtonschritte.',empty:'Noch keine Noten',bars:'Zwei Takte',note:'Tonpunkt'},
 en:{mode:'Note editor',choose:'Choose an instrument to edit',snap:'Snap to beat grid',done:'Accept notes',cancel:'Discard changes',remove:'Delete selected note point',volume:'Note point volume',back:'Back to instruments',pending:'Accept or discard your changes first.',help:'Click to add a note. Drag right to extend it; move up or down while dragging to connect pitches. Select a point to adjust its volume on the right or delete it with the bin / Delete key. Enter accepts, Esc discards. Two bars; pitch lines are semitones.',empty:'No notes yet',bars:'Two bars',note:'Note point'},
 es:{mode:'Editor de notas',choose:'Elige un instrumento',snap:'Ajustar a la cuadrícula',done:'Aceptar notas',cancel:'Descartar cambios',remove:'Eliminar el punto seleccionado',volume:'Volumen del punto',back:'Volver a los instrumentos',pending:'Acepta o descarta los cambios primero.',help:'Pulsa para añadir una nota. Arrastra a la derecha para alargarla y arriba o abajo para conectar alturas. Selecciona un punto para ajustar su volumen o borrarlo con la papelera / Supr. Intro acepta, Esc descarta. Dos compases; las líneas son semitonos.',empty:'Sin notas',bars:'Dos compases',note:'Punto de nota'},
 fr:{mode:'Éditeur de notes',choose:'Choisir un instrument',snap:'Aligner sur la grille',done:'Valider les notes',cancel:'Annuler les modifications',remove:'Supprimer le point sélectionné',volume:'Volume du point',back:'Retour aux instruments',pending:'Validez ou annulez les modifications.',help:'Touchez pour ajouter une note. Glissez à droite pour la prolonger et vers le haut ou le bas pour relier les hauteurs. Sélectionnez un point pour régler son volume ou le supprimer avec la corbeille / Suppr. Entrée valide, Échap annule. Deux mesures ; les lignes sont des demi-tons.',empty:'Aucune note',bars:'Deux mesures',note:'Point de note'}
} as const;
