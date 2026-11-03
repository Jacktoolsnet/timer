export const ORBIT_COUNT=9;
export const ORBIT_OUTER_RADIUS=316;
export const ORBIT_INNER_RADIUS=100;
export const ORBIT_HIT_RADIUS=ORBIT_OUTER_RADIUS+18;
/** Use more of the canvas: nine rings now have 27 px spacing instead of 23. */
export function orbitRadius(rank:number,count:number){return ORBIT_OUTER_RADIUS-rank*(ORBIT_OUTER_RADIUS-ORBIT_INNER_RADIUS)/Math.max(1,count-1);}
export function orbitHitTolerance(count:number){return Math.min(14,(ORBIT_OUTER_RADIUS-ORBIT_INNER_RADIUS)/Math.max(1,count-1)/2);}

export const padNumbers=[7,8,9,4,5,6,1,2,3] as const;
export type OrbitPad=0|1|2|3|4|5|6|7|8;
export function padAt(x:number,y:number,width:number,height:number):OrbitPad{
 return (Math.max(0,Math.min(2,Math.floor(y/height*3)))*3+Math.max(0,Math.min(2,Math.floor(x/width*3)))) as OrbitPad;
}
export function padCenter(pad:OrbitPad,width:number,height:number){return {x:(pad%3+.5)*width/3,y:(Math.floor(pad/3)+.5)*height/3};}
/** Physical numpad codes also work with Num Lock off (End, ArrowDown, etc.). */
export function padForKey(code:string,key:string):OrbitPad|null{
 const digit=/^(?:Numpad|Digit)[1-9]$/.test(code)?Number(code.slice(-1)):/^[1-9]$/.test(key)?Number(key):0;
 const index=(padNumbers as readonly number[]).indexOf(digit);
 return index<0?null:index as OrbitPad;
}

/** One large editable pad, with its eight companions clockwise around it. */
export function padBounds(pad:OrbitPad,width:number,height:number,selected:OrbitPad|null=null){
 if(selected===null)return {x:pad%3*width/3,y:Math.floor(pad/3)*height/3,width:width/3,height:height/3};
 if(pad===selected)return {x:width*.2,y:height*.2,width:width*.6,height:height*.6};
 const others=Array.from({length:9},(_,i)=>i).filter(i=>i!==selected),rank=others.indexOf(pad);
 const slots=[[.2,0,.3,.18],[.5,0,.3,.18],[.82,.2,.18,.3],[.82,.5,.18,.3],[.5,.82,.3,.18],[.2,.82,.3,.18],[0,.5,.18,.3],[0,.2,.18,.3]];
 const [x,y,w,h]=slots[rank];return {x:x*width,y:y*height,width:w*width,height:h*height};
}
export function focusedPadCenter(pad:OrbitPad,width:number,height:number,selected:OrbitPad|null){
 const b=padBounds(pad,width,height,selected);return {x:b.x+b.width/2,y:b.y+b.height/2};
}
export function focusedPadAt(x:number,y:number,width:number,height:number,selected:OrbitPad|null):OrbitPad|null{
 for(let i=0;i<9;i++){const b=padBounds(i as OrbitPad,width,height,selected);if(x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+b.height)return i as OrbitPad;}
 return null;
}
export const padFocusCopy={
 de:{choose:'Instrument wählen',pending:'Änderungen zuerst übernehmen oder verwerfen.',keyboard:"Ohne Auswahl wählen Zifferntasten ein Instrument. Bei gewähltem Pad spielt die obere Zahlenreihe 1–8 acht Tonstufen, tief nach hoch. Der Zahlenblock bleibt für die Instrumentauswahl zuständig. Im mittleren Melodie-Pad wählt die Höhe die Tonstufe: unten tief, oben hoch. Leertaste auf der Fläche wiederholt den letzten Ton. Enter übernimmt die Aufnahme; Esc verwirft sie. Übernehmen oder Verwerfen beendet die Bearbeitung."},
 en:{choose:'Choose an instrument',pending:'Accept or discard your changes first.',keyboard:"Without selection, number keys choose an instrument. With a pad selected, the top number row 1–8 plays eight degrees from low to high. The numpad still selects instruments. Height in the central melodic pad selects pitch: low at the bottom, high at the top. Space on the canvas repeats the last note. Enter accepts the recording; Esc discards it. Accept or Discard ends editing."},
 es:{choose:'Elige un instrumento',pending:'Acepta o descarta los cambios primero.',keyboard:"Sin selección, los números eligen un instrumento. Con un pad seleccionado, la fila superior 1–8 toca ocho grados de grave a agudo. El teclado numérico sigue eligiendo instrumentos. En el pad melódico central, abajo es grave y arriba agudo. Espacio con foco en la superficie repite la última nota. Intro acepta la grabación; Esc la descarta. Aceptar o Descartar termina la edición."},
 fr:{choose:'Choisis un instrument',pending:'Accepte ou annule les modifications d’abord.',keyboard:"Sans sélection, les chiffres choisissent un instrument. Avec un pad choisi, la rangée supérieure 1–8 joue huit degrés du grave à l’aigu. Le pavé numérique choisit toujours les instruments. Dans le pad mélodique central, le bas est grave et le haut aigu. Espace sur la surface répète la dernière note. Entrée valide la saisie ; Échap l’annule. Valider ou Annuler termine la modification."}
};
