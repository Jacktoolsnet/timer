export const ORBIT_COUNT=9;
export const padNumbers=[7,8,9,4,5,6,1,2,3] as const;
export type OrbitPad=0|1|2|3|4|5|6|7|8;
export function padAt(x:number,y:number,width:number,height:number):OrbitPad{
 return (Math.max(0,Math.min(2,Math.floor(y/height*3)))*3+Math.max(0,Math.min(2,Math.floor(x/width*3)))) as OrbitPad;
}
export function padCenter(pad:OrbitPad,width:number,height:number){return {x:(pad%3+.5)*width/3,y:(Math.floor(pad/3)+.5)*height/3};}
/** Physical numpad codes also work with Num Lock off (End, ArrowDown, etc.). */
export function padForKey(code:string,key:string):OrbitPad|null{
 const digit=/^Numpad[1-9]$/.test(code)?Number(code.slice(-1)):/^[1-9]$/.test(key)?Number(key):0;
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
 de:{choose:'Instrument wählen',pending:'Änderungen zuerst übernehmen oder verwerfen.',keyboard:'Wähle ein Instrument mit einem Tipp oder einer Zifferntaste. Klopfe danach in der Mitte oder mit derselben Ziffer, Leertaste oder Enter. Übernehmen oder Verwerfen beendet die Bearbeitung.'},
 en:{choose:'Choose an instrument',pending:'Accept or discard your changes first.',keyboard:'Choose an instrument by tapping or pressing its number. Then tap the centre or use the same number, Space or Enter. Accept or Discard ends editing.'},
 es:{choose:'Elige un instrumento',pending:'Acepta o descarta los cambios primero.',keyboard:'Elige un instrumento tocando o pulsando su número. Después toca el centro o usa el mismo número, Espacio o Intro. Aceptar o Descartar termina la edición.'},
 fr:{choose:'Choisis un instrument',pending:'Accepte ou annule les modifications d’abord.',keyboard:'Choisis un instrument en touchant ou avec son chiffre. Puis touche le centre ou utilise le même chiffre, Espace ou Entrée. Valider ou Annuler termine la modification.'}
};
