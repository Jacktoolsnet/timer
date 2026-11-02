export const HOLD_DELAY=280;
export const MOVE_THRESHOLD=8; // CSS pixels, independent of canvas scaling / device density.
export const RING_FADE=1800;
export type GestureMode='pending'|'holding'|'drawing';
export function gestureMode(mode:GestureMode,distance:number,elapsed:number):GestureMode{
 if(mode==='drawing'||distance>=MOVE_THRESHOLD)return 'drawing';
 return elapsed>=HOLD_DELAY?'holding':mode;
}
/** A bounded quarter-note figure, not an ever-growing wall of enabled steps. */
export function holdSteps(origin:number,elapsed:number,bpm:number,stepsPerBar:number,beats=stepsPerBar/4):number[]{
 const count=Math.min(4,beats,stepsPerBar,1+Math.floor(Math.max(0,elapsed-HOLD_DELAY)/(60000/bpm)));
 return Array.from({length:count},(_,i)=>(origin+Math.round(i*stepsPerBar/beats))%stepsPerBar);
}
export function ringAppearance(elapsed:number,releasedAge:number|null,reduced:boolean){
 const growth=Math.min(1,Math.max(0,elapsed)/2200),fade=releasedAge===null?1:Math.max(0,1-releasedAge/RING_FADE);
 return {radius:reduced?24:12+growth*58+(releasedAge===null?0:Math.min(24,releasedAge*.018)),alpha:fade*fade};
}
export const gestureCopy={
 de:{hint:'Zeichnen · Tippen · Halten',help:'Tippen schaltet einen Punkt. Halten baut einen kurzen Rhythmus auf. Bewegen zeichnet – auch mit mehreren Fingern.',keyboard:'Tastatur: Pfeile wählen die Position. Leertaste tippen oder halten; Enter setzt einen Tipp.'},
 en:{hint:'Draw · Tap · Hold',help:'Tap to toggle a point. Hold to build a short rhythm. Move to draw — multiple fingers work independently.',keyboard:'Keyboard: arrows choose a position. Tap or hold Space; Enter makes a tap.'},
 es:{hint:'Dibujar · Tocar · Mantener',help:'Toca para activar o desactivar un punto. Mantén pulsado para crear un ritmo breve. Mueve para dibujar, también con varios dedos.',keyboard:'Teclado: las flechas eligen la posición. Pulsa o mantén Espacio; Intro hace un toque.'},
 fr:{hint:'Dessiner · Toucher · Maintenir',help:'Touchez pour activer ou désactiver un point. Maintenez pour créer un court rythme. Déplacez pour dessiner, même avec plusieurs doigts.',keyboard:'Clavier : les flèches choisissent la position. Appuyez ou maintenez Espace ; Entrée fait un toucher.'}
};
