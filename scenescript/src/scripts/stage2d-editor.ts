import {defaultStage2D,parseStage2D} from '../lib/stage2d';
import type {Scene} from '../lib/model';
const labels={
 de:{title:'2D-Animationsbühne',enabled:'Lichtsammler-Bühne aktivieren',hint:'Erste 2D-Puppenvorlage mit Gelenken, Gestik und Bewegungskurven. Die Szenendauer bestimmt das Tempo. Weitere Elemente können darübergelegt werden.',bodyColor:'Figurenfarbe',accentColor:'Farbe des Funkens',endingTitle:'Schlusstext · Zeile 1',endingSubtitle:'Schlusstext · Zeile 2',walk:'Ankommen / Gangzyklus',wave:'Winken',jump:'Sprung und Funkenfang',night:'Nachtgarten / Irisblende',cameraMotion:'Kamerafahrt und Parallaxe',jumpHeight:'Sprunghöhe (0–110)'},
 en:{title:'2D animation stage',enabled:'Enable Light Collector stage',hint:'First 2D puppet preset with joints, gestures and motion curves. Scene duration controls the pace. Other elements can be layered on top.',bodyColor:'Character color',accentColor:'Spark color',endingTitle:'Closing text · line 1',endingSubtitle:'Closing text · line 2',walk:'Arrival / walk cycle',wave:'Wave',jump:'Jump and catch the spark',night:'Night garden / iris reveal',cameraMotion:'Camera move and parallax',jumpHeight:'Jump height (0–110)'},
 es:{title:'Escenario de animación 2D',enabled:'Activar el escenario del recolector de luz',hint:'Primera plantilla de marioneta 2D con articulaciones, gestos y curvas de movimiento. La duración de la escena controla el ritmo. Se pueden superponer otros elementos.',bodyColor:'Color del personaje',accentColor:'Color de la chispa',endingTitle:'Texto final · línea 1',endingSubtitle:'Texto final · línea 2',walk:'Llegada / ciclo de caminar',wave:'Saludar',jump:'Saltar y atrapar la chispa',night:'Jardín nocturno / transición circular',cameraMotion:'Movimiento de cámara y paralaje',jumpHeight:'Altura del salto (0–110)'},
 fr:{title:'Scène d’animation 2D',enabled:'Activer la scène du collecteur de lumière',hint:'Premier modèle de marionnette 2D avec articulations, gestes et courbes de mouvement. La durée de la scène règle le rythme. D’autres éléments peuvent être superposés.',bodyColor:'Couleur du personnage',accentColor:'Couleur de l’étincelle',endingTitle:'Texte final · ligne 1',endingSubtitle:'Texte final · ligne 2',walk:'Arrivée / cycle de marche',wave:'Saluer',jump:'Saut et capture de l’étincelle',night:'Jardin nocturne / transition circulaire',cameraMotion:'Mouvement de caméra et parallaxe',jumpHeight:'Hauteur du saut (0–110)'}
};
/** Scoped native controls save project data through the existing editor history. */
export function stage2DFields(host:HTMLElement,scene:Scene,language:string,changed:(rebuild?:boolean)=>void){
 const words=labels[language as keyof typeof labels]??labels.en;
 const group=document.createElement('fieldset');group.className='text-settings-group';group.dataset.stage2dEditor='true';const legend=document.createElement('legend');legend.textContent=words.title;group.append(legend);host.append(group);
 const control=(key:string,title:string,value:string|boolean|number,type:string,save:(v:string|boolean|number)=>void)=>{
  const label=document.createElement('label'),input=document.createElement('input');input.type=type;input.name='stage2d-'+key;input.dataset.stage2dField=key;
  if(type==='checkbox')input.checked=Boolean(value);else input.value=String(value);
  if(type==='text')input.maxLength=80;if(type==='number'){input.min='0';input.max='110';input.step='1';}
  input.addEventListener('change',()=>{if(!input.reportValidity())return;save(type==='checkbox'?input.checked:type==='number'?input.valueAsNumber:input.value);});
  label.append(document.createTextNode(title),input);group.append(label);
 };
 control('enabled',words.enabled,Boolean(scene.stage2d),'checkbox',value=>{if(Boolean(scene.stage2d)===Boolean(value))return;scene.stage2d=value?defaultStage2D():null;changed(true);});
 if(!scene.stage2d)return;
 const hint=document.createElement('p');hint.className='small-hint';hint.textContent=words.hint;group.append(hint);
 for(const key of ['bodyColor','accentColor','endingTitle','endingSubtitle','walk','wave','jump','night','cameraMotion','jumpHeight'] as const){
  const value=scene.stage2d[key],type=typeof value==='boolean'?'checkbox':typeof value==='number'?'number':key.endsWith('Color')?'color':'text';
  control(key,words[key],value,type,next=>{if(scene.stage2d?.[key]===next)return;const value=parseStage2D({...scene.stage2d,[key]:next});if(value){scene.stage2d=value;changed();}});
 }
}
/** Preset chapter tracks are seekable, not misleading freely draggable keyframes. */
export function stage2DTimeline(host:HTMLElement,scene:Scene,language:string,seek:(local:number)=>void){
 if(!scene.stage2d)return;const words=labels[language as keyof typeof labels]??labels.en;
 for(const [key,start,end] of [['walk',0,3.6],['wave',4.1,6.4],['jump',6.6,9.6],['cameraMotion',0,11.2],['night',10.6,16]] as const){
  if(!scene.stage2d[key])continue;
  const row=document.createElement('div');row.className='timeline-row stage2d-track';row.dataset.stage2dTrack=key;
  const label=document.createElement('div');label.className='timeline-track-label';const name=document.createElement('button');name.type='button';name.textContent='2D · '+words[key];name.title=words[key];name.addEventListener('click',()=>seek((start+end)/32*scene.duration));label.append(name);
  const lane=document.createElement('div');lane.className='timeline-lane';const bar=document.createElement('button');bar.type='button';bar.className='timeline-bar';bar.style.left=start/16*100+'%';bar.style.width=(end-start)/16*100+'%';bar.title=`${words[key]} · ${(start/16*scene.duration).toFixed(2)}–${(end/16*scene.duration).toFixed(2)} s`;bar.setAttribute('aria-label',bar.title);bar.addEventListener('click',()=>seek((start+end)/32*scene.duration));lane.append(bar);row.append(label,lane);host.append(row);
 }
}
