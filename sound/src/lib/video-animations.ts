export const videoAnimationKeys=['center','orbit','background','visualization'] as const;
export type VideoAnimationKey=typeof videoAnimationKeys[number];
export type VideoAnimationSettings=Record<VideoAnimationKey,boolean>;
export const defaultVideoAnimations:VideoAnimationSettings={center:false,orbit:false,background:false,visualization:false};
/** One evenly staggered pass through the enabled layers takes exactly one third of the take.
 * Three passes span the whole take; omit the invisible change at the very end.
 * Even the shortest take leaves at least 5s between changes, beyond the 1.1s crossfade. */
export function videoAnimationPlan(seconds:number,flags?:Partial<VideoAnimationSettings>):Record<VideoAnimationKey,number[]>{
 const duration=Math.max(60,Math.min(600,Number.isFinite(seconds)?seconds:600))*1000;
 const plan:Record<VideoAnimationKey,number[]>={center:[],orbit:[],background:[],visualization:[]};
 const active=(['visualization','background','center','orbit'] as const).filter(key=>flags===undefined||flags[key]);
 if(!active.length)return plan;
 const cycle=duration/3,gap=cycle/active.length;
 for(let index=0;index<active.length*3-1;index++)plan[active[index%active.length]].push((index+1)*gap);
 return plan;
}
export const videoAnimationCopy={
 de:{visualization:'Visualisierung zufällig wechseln',title:'Animationen während der Aufnahme wechseln',hint:'Ruhige, gleichmäßig verteilte Wechsel mit sanften Überblendungen: Ein Durchlauf durch die aktivierten Bereiche dauert exakt ein Drittel der Aufnahmezeit. Ausgeschaltete Animationen bleiben aus.',center:'Zentrum zufällig wechseln',orbit:'Orbit zufällig wechseln',background:'Hintergrund zufällig wechseln'},
 en:{visualization:'Random visualization changes',title:'Change animations during recording',hint:'Calm, evenly spaced changes with soft crossfades: one pass through the enabled layers takes exactly one third of the recording time. Disabled animations stay off.',center:'Random centre changes',orbit:'Random orbit changes',background:'Random background changes'},
 es:{visualization:'Cambios aleatorios de visualización',title:'Cambiar animaciones durante la grabación',hint:'Cambios tranquilos y uniformes con transiciones suaves: un ciclo por las capas activadas dura exactamente un tercio de la grabación. Las animaciones desactivadas siguen apagadas.',center:'Cambios aleatorios del centro',orbit:'Cambios aleatorios de órbita',background:'Cambios aleatorios del fondo'},
 fr:{visualization:'Variations aléatoires de visualisation',title:'Changer les animations pendant l’enregistrement',hint:'Des changements calmes et réguliers avec des fondus doux : un cycle des éléments activés dure exactement un tiers de l’enregistrement. Les animations désactivées restent éteintes.',center:'Variations aléatoires du centre',orbit:'Variations aléatoires de l’orbite',background:'Variations aléatoires du fond'}
};
