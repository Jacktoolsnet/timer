export const videoAnimationKeys=['center','orbit','background','visualization'] as const;
export type VideoAnimationKey=typeof videoAnimationKeys[number];
export type VideoAnimationSettings=Record<VideoAnimationKey,boolean>;
export const defaultVideoAnimations:VideoAnimationSettings={center:false,orbit:false,background:false,visualization:false};
/** Six to nine staggered changes per layer, distributed over the selected duration.
 * Percent-based timing gives short clips energy without making long sessions frantic. */
export function videoAnimationPlan(seconds:number,random=Math.random):Record<VideoAnimationKey,number[]>{
 const duration=Math.max(60,Math.min(600,Number.isFinite(seconds)?seconds:600))*1000;
 return Object.fromEntries(videoAnimationKeys.map((key,layer)=>{
  const count=6+Math.min(3,Math.floor(random()*4));
  return [key,Array.from({length:count},(_,i)=>duration*(.07+.86*(i+.15+layer*.22+random()*.15)/count))];
 })) as Record<VideoAnimationKey,number[]>;
}
export const videoAnimationCopy={
 de:{visualization:'Visualisierung zufällig wechseln',title:'Animationen während der Aufnahme wechseln',hint:'Wechselabstände passen sich der Aufnahmezeit an. Ausgeschaltete Animationen bleiben aus.',center:'Zentrum zufällig wechseln',orbit:'Orbit zufällig wechseln',background:'Hintergrund zufällig wechseln'},
 en:{visualization:'Random visualization changes',title:'Change animations during recording',hint:'Change intervals follow the recording length. Disabled animations stay off.',center:'Random centre changes',orbit:'Random orbit changes',background:'Random background changes'},
 es:{visualization:'Cambios aleatorios de visualización',title:'Cambiar animaciones durante la grabación',hint:'Los intervalos se adaptan a la duración. Las animaciones desactivadas siguen apagadas.',center:'Cambios aleatorios del centro',orbit:'Cambios aleatorios de órbita',background:'Cambios aleatorios del fondo'},
 fr:{visualization:'Variations aléatoires de visualisation',title:'Changer les animations pendant l’enregistrement',hint:'Les intervalles suivent la durée choisie. Les animations désactivées restent éteintes.',center:'Variations aléatoires du centre',orbit:'Variations aléatoires de l’orbite',background:'Variations aléatoires du fond'}
};
