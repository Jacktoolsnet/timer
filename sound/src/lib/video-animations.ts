export const videoAnimationKeys=['center','orbit','background','visualization'] as const;
export type VideoAnimationKey=typeof videoAnimationKeys[number];
export type VideoAnimationSettings=Record<VideoAnimationKey,boolean>;
export const defaultVideoAnimations:VideoAnimationSettings={center:false,orbit:false,background:false,visualization:false};
/** Short, staggered scene holds for social clips, also throughout long takes.
 * Only enabled layers share the cadence. At least 1.25s separates changes,
 * leaving the 1.1s crossfade time to finish without abrupt overlapping cuts. */
export function videoAnimationPlan(seconds:number,random=Math.random,flags?:Partial<VideoAnimationSettings>):Record<VideoAnimationKey,number[]>{
 const duration=Math.max(60,Math.min(600,Number.isFinite(seconds)?seconds:600))*1000;
 const plan:Record<VideoAnimationKey,number[]>={center:[],orbit:[],background:[],visualization:[]};
 const active=(['visualization','background','center','orbit'] as const).filter(key=>flags===undefined||flags[key]);
 if(!active.length)return plan;
 const unit=()=>Math.max(0,Math.min(1,random()));
 let time=1800+unit()*600,index=0;
 while(time<duration-1800){
  plan[active[index++%active.length]].push(time);
  time+=active.length===1?3000+unit()*2500:active.length===2?1800+unit()*800:active.length===3?1350+unit()*450:1250+unit()*250;
 }
 return plan;
}
export const videoAnimationCopy={
 de:{visualization:'Visualisierung zufällig wechseln',title:'Animationen während der Aufnahme wechseln',hint:'Häufige, sanft überblendete Wechsel sorgen für Abwechslung – auch in längeren Videos. Ausgeschaltete Animationen bleiben aus.',center:'Zentrum zufällig wechseln',orbit:'Orbit zufällig wechseln',background:'Hintergrund zufällig wechseln'},
 en:{visualization:'Random visualization changes',title:'Change animations during recording',hint:'Frequent, softly blended changes add variety, even in longer videos. Disabled animations stay off.',center:'Random centre changes',orbit:'Random orbit changes',background:'Random background changes'},
 es:{visualization:'Cambios aleatorios de visualización',title:'Cambiar animaciones durante la grabación',hint:'Cambios frecuentes y suaves aportan variedad, también en vídeos largos. Las animaciones desactivadas siguen apagadas.',center:'Cambios aleatorios del centro',orbit:'Cambios aleatorios de órbita',background:'Cambios aleatorios del fondo'},
 fr:{visualization:'Variations aléatoires de visualisation',title:'Changer les animations pendant l’enregistrement',hint:'Des changements fréquents et fondus apportent de la variété, même aux longues vidéos. Les animations désactivées restent éteintes.',center:'Variations aléatoires du centre',orbit:'Variations aléatoires de l’orbite',background:'Variations aléatoires du fond'}
};
