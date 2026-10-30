import {resourcePreview2D} from '../lib/stage2d-resource-preview';
import {stage3DWords} from '../lib/stage3d-i18n';
import {createStage2DView,type Stage2DView} from './stage2d-preview';
import {actorFrame2D,cameraFrame2D} from '../lib/motion2d';
import {actions2D,defaultAction2D,defaultActor2D,defaultObject2D,defaultStage2D,defaultStage2DResource,lightCollector2D,parseStage2D,type Actor2D} from '../lib/stage2d';
import {validateProject,type Project,type Scene} from '../lib/model';
const translations={
 de:{title:'2D-Bühne und Instanzen',resources:'2D-Ressourcen',enabled:'2D-Szene aktivieren',stage:'Bühne',objects:'Objekte',stages:'Bühnen',name:'Name',kind:'Objekttyp',preset:'Bühnentyp',color:'Grundfarbe',accentColor:'Akzentfarbe',skyColor:'Himmelsfarbe',groundColor:'Bodenfarbe',shape:'Form',actor:'Instanz',object:'Objektressource',add:'Hinzufügen',duplicate:'Duplizieren',remove:'Entfernen',use:'In dieser Szene verwenden',close:'Schließen',override:'Eigene Instanzfarbe',scale:'Größe',rotation:'Drehung',opacity:'Deckkraft',action:'Aktion',at:'Start (s)',duration:'Dauer (s)',toX:'Ziel X',toY:'Ziel Y',height:'Höhe',target:'Zielinstanz (rechte Hand)',camera:'Kamera / Parallaxe',zoom:'Zoom',transition:'Irisübergang',ending:'Schlusstext',titleLine:'Zeile 1',subtitle:'Zeile 2',referenced:'Die Ressource oder Instanz wird noch verwendet.',hint:'Ressourcen definieren das Aussehen. Jede Szene besitzt unabhängige Instanzen, Aktionen und Kamera-Keys. Änderungen werden sofort gespeichert und können rückgängig gemacht werden.',empty:'Noch keine Ressource. Über „2D-Ressourcen“ anlegen.',robot:'Roboter',spark:'Lichtfunke',forest:'Waldweg','night-garden':'Nachtgarten',rectangle:'Rechteck',ellipse:'Ellipse',star:'Stern',move:'Bewegen',walk:'Gehen',wave:'Winken',jump:'Springen',float:'Schweben',attach:'An Hand anheften',fade:'Ausblenden'},
 en:{title:'2D stage and instances',resources:'2D resources',enabled:'Enable 2D scene',stage:'Stage',objects:'Objects',stages:'Stages',name:'Name',kind:'Object type',preset:'Stage type',color:'Base color',accentColor:'Accent color',skyColor:'Sky color',groundColor:'Ground color',shape:'Shape',actor:'Instance',object:'Object resource',add:'Add',duplicate:'Duplicate',remove:'Remove',use:'Use in this scene',close:'Close',override:'Instance color override',scale:'Scale',rotation:'Rotation',opacity:'Opacity',action:'Action',at:'Start (s)',duration:'Duration (s)',toX:'Target X',toY:'Target Y',height:'Height',target:'Target instance (right hand)',camera:'Camera / parallax',zoom:'Zoom',transition:'Iris transition',ending:'Closing text',titleLine:'Line 1',subtitle:'Line 2',referenced:'This resource or instance is still referenced.',hint:'Resources define appearance. Each scene owns independent instances, actions and camera keys. Changes apply immediately and support undo.',empty:'No resources yet. Create them in “2D resources”.',robot:'Robot',spark:'Spark',forest:'Forest','night-garden':'Night garden',rectangle:'Rectangle',ellipse:'Ellipse',star:'Star',move:'Move',walk:'Walk',wave:'Wave',jump:'Jump',float:'Float',attach:'Attach to hand',fade:'Fade out'},
};
type Words=typeof translations.en;
const openActors=new Set<string>(),openActions=new Set<string>(),initializedScenes=new Set<string>();
// Labels fall back to English for unsupported UI languages; resource content stays user-authored.
const otherWords:Record<string,Partial<Words>>={
 es:{title:'Escenario 2D e instancias',resources:'Recursos 2D',enabled:'Activar escena 2D',stage:'Escenario',objects:'Objetos',stages:'Escenarios',name:'Nombre',kind:'Tipo de objeto',preset:'Tipo de escenario',color:'Color base',accentColor:'Color de acento',skyColor:'Color del cielo',groundColor:'Color del suelo',shape:'Forma',actor:'Instancia',object:'Recurso de objeto',add:'Añadir',duplicate:'Duplicar',remove:'Eliminar',use:'Usar en esta escena',close:'Cerrar',override:'Color propio de la instancia',scale:'Escala',rotation:'Rotación',opacity:'Opacidad',action:'Acción',at:'Inicio (s)',duration:'Duración (s)',toX:'Destino X',toY:'Destino Y',height:'Altura',target:'Instancia de destino (mano derecha)',camera:'Cámara / paralaje',zoom:'Zoom',transition:'Transición circular',ending:'Texto final',titleLine:'Línea 1',subtitle:'Línea 2',referenced:'El recurso o la instancia sigue en uso.',hint:'Los recursos definen la apariencia. Cada escena tiene instancias, acciones y cámara independientes. Los cambios se aplican inmediatamente y se pueden deshacer.',empty:'No hay recursos. Créalos en «Recursos 2D».',robot:'Robot',spark:'Chispa',forest:'Bosque','night-garden':'Jardín nocturno',rectangle:'Rectángulo',ellipse:'Elipse',star:'Estrella',move:'Mover',walk:'Caminar',wave:'Saludar',jump:'Saltar',float:'Flotar',attach:'Unir a la mano',fade:'Desvanecer'},
 fr:{title:'Scène 2D et instances',resources:'Ressources 2D',enabled:'Activer la scène 2D',stage:'Décor',objects:'Objets',stages:'Décors',name:'Nom',kind:'Type d’objet',preset:'Type de décor',color:'Couleur principale',accentColor:'Couleur d’accent',skyColor:'Couleur du ciel',groundColor:'Couleur du sol',shape:'Forme',actor:'Instance',object:'Ressource objet',add:'Ajouter',duplicate:'Dupliquer',remove:'Supprimer',use:'Utiliser dans cette scène',close:'Fermer',override:'Couleur propre à l’instance',scale:'Échelle',rotation:'Rotation',opacity:'Opacité',action:'Action',at:'Début (s)',duration:'Durée (s)',toX:'Cible X',toY:'Cible Y',height:'Hauteur',target:'Instance cible (main droite)',camera:'Caméra / parallaxe',zoom:'Zoom',transition:'Transition circulaire',ending:'Texte final',titleLine:'Ligne 1',subtitle:'Ligne 2',referenced:'Cette ressource ou instance est encore utilisée.',hint:'Les ressources définissent l’apparence. Chaque scène possède ses instances, actions et caméra indépendantes. Les changements sont immédiats et peuvent être annulés.',empty:'Aucune ressource. Créez-en dans «Ressources 2D».',robot:'Robot',spark:'Étincelle',forest:'Forêt','night-garden':'Jardin nocturne',rectangle:'Rectangle',ellipse:'Ellipse',star:'Étoile',move:'Déplacer',walk:'Marcher',wave:'Saluer',jump:'Sauter',float:'Flotter',attach:'Attacher à la main',fade:'Estomper'}
};
function words(language:string):Words{return translations[language as keyof typeof translations]??{...translations.en,...otherWords[language]};}
function button(text:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',action);return b;}
function group(parent:HTMLElement,title:string){const f=document.createElement('fieldset'),l=document.createElement('legend');l.textContent=title;f.append(l);parent.append(f);return f;}
function field(parent:HTMLElement,key:string,title:string,value:string|number|boolean,save:(value:any)=>void|boolean,choices?:[string,string][],bounds?:[number,number]){
 let currentValue=value;const l=document.createElement('label');l.append(document.createTextNode(title));let input:HTMLInputElement|HTMLSelectElement;
 if(choices){input=document.createElement('select');for(const [value,title]of choices){const option=document.createElement('option');option.value=value;option.textContent=title;input.append(option);}input.value=String(value);}
 else{input=document.createElement('input');input.type=typeof value==='boolean'?'checkbox':typeof value==='number'?'number':key.toLowerCase().includes('color')?'color':'text';if(input.type==='checkbox')input.checked=Boolean(value);else input.value=String(value);if(input.type==='number'){input.step='any';if(bounds){input.min=String(bounds[0]);input.max=String(bounds[1]);}}if(input.type==='text')input.maxLength=key==='ending-title'||key==='ending-subtitle'?80:200;}
 input.name='stage2d-'+key;input.dataset.stage2dField=key;
 input.addEventListener('change',()=>{if(input instanceof HTMLInputElement&&!input.reportValidity())return;const focused=document.activeElement===input;const nextValue=(input instanceof HTMLInputElement&&input.type==='checkbox'?input.checked:input instanceof HTMLInputElement&&input.type==='number'?input.valueAsNumber:input.value);const saved=save(nextValue);if(saved===false){if(input instanceof HTMLInputElement&&input.type==='checkbox')input.checked=Boolean(currentValue);else input.value=String(currentValue);}else currentValue=nextValue;if(focused&&!input.isConnected)document.querySelector<HTMLElement>('[name="'+CSS.escape(input.name)+'"]')?.focus({preventScroll:true});});l.append(input);parent.append(l);return input;
}
const entries=(library:Record<string,{name:string}>):[string,string][]=>Object.entries(library).map(([id,v])=>[id,v.name]);
function seed(project:Project){const d=lightCollector2D();if(!Object.keys(project.stages2d).length)project.stages2d=d.stages2d;if(!Object.keys(project.objects2d).length)project.objects2d=d.objects2d;}
export function stage2DFields(host:HTMLElement,scene:Scene,project:Project,language:string,changed:(rebuild?:boolean)=>void){
 const w=words(language),f=group(host,w.title);f.dataset.stage2dEditor='true';const error=document.createElement('p');error.className='small-hint';error.setAttribute('role','alert');f.append(error);
 const update=(fn:()=>void,rebuild=false)=>{const before=structuredClone(scene.stage2d);try{fn();scene.stage2d=parseStage2D(scene.stage2d,'stage2d',project,scene.duration);error.textContent='';if(JSON.stringify(before)!==JSON.stringify(scene.stage2d))changed(rebuild);return true;}catch(e){scene.stage2d=before;error.textContent=(e as Error).message;return false;}};
 field(f,'enabled',w.enabled,!!scene.stage2d,value=>{if(!!scene.stage2d===value)return;if(value)seed(project);update(()=>{scene.stage2d=value?defaultStage2D(Object.keys(project.stages2d)[0]):null;},true);});
 f.append(button(w.resources,()=>document.getElementById('open-stage2d')?.click()));if(!scene.stage2d)return;
 const shot=()=>scene.stage2d!;
 field(f,'stage',w.stage,shot().stage,value=>update(()=>{shot().stage=value;}),entries(project.stages2d));
 if(shot().actors.length&&!initializedScenes.has(scene.id)){initializedScenes.add(scene.id);openActors.add(shot().actors[0].id);}
 for(const actor of shot().actors){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=w.actor+' · '+actor.name;details.open=openActors.has(actor.id);details.addEventListener('toggle',()=>{if(details.open)openActors.add(actor.id);else openActors.delete(actor.id);});f.append(details);details.append(summary);const a=group(details,w.actor+' · '+actor.name);a.dataset.actorId=actor.id;
  const set=(key:keyof Actor2D,value:unknown,rebuild=false)=>update(()=>Object.assign(shot().actors.find(v=>v.id===actor.id)!,{[key]:value}),rebuild);
  field(a,actor.id+'-name',w.name,actor.name,v=>set('name',v));field(a,actor.id+'-object',w.object,actor.object,v=>set('object',v,true),entries(project.objects2d));
  for(const [key,title,min,max]of [['x','X',-2000,3000],['y','Y',-2000,3000],['scale',w.scale,.1,4],['rotation',w.rotation,-360,360],['opacity',w.opacity,0,1]] as const)field(a,actor.id+'-'+key,title,actor[key],v=>set(key,v),undefined,[min,max]);
  field(a,actor.id+'-override',w.override,actor.color!==null,v=>set('color',v?project.objects2d[actor.object].color:null,true));if(actor.color!==null)field(a,actor.id+'-color',w.color,actor.color,v=>set('color',v));
  a.append(button(w.duplicate,()=>update(()=>{const next=structuredClone(actor);next.id=crypto.randomUUID();next.name+=' II';next.x+=100;for(const c of next.actions)if(['walk','move','jump'].includes(c.type))c.toX+=100;openActors.add(next.id);shot().actors.push(next);},true)),button(w.remove,()=>{if(shot().actors.some(a=>a.actions.some(c=>c.type==='attach'&&c.target===actor.id))){error.textContent=w.referenced;return;}update(()=>{shot().actors=shot().actors.filter(a=>a.id!==actor.id);},true);}));
  for(const [index,action]of actor.actions.entries()){const details=document.createElement('details'),summary=document.createElement('summary'),openKey=actor.id+':'+index;summary.textContent=w.action+' '+(index+1)+' · '+w[action.type];details.open=openActions.has(openKey);details.addEventListener('toggle',()=>{if(details.open)openActions.add(openKey);else openActions.delete(openKey);});a.append(details);details.append(summary);const c=group(details,w.action+' '+(index+1)+' · '+w[action.type]);c.dataset.actionIndex=String(index);
   const actionSet=(key:string,value:unknown,rebuild=false)=>update(()=>{const action=shot().actors.find(v=>v.id===actor.id)!.actions[index];Object.assign(action,{[key]:value});if(key==='type'&&value==='attach'&&!shot().actors.some(a=>a.id===action.target&&a.id!==actor.id&&project.objects2d[a.object].kind==='robot'))action.target=shot().actors.find(a=>a.id!==actor.id&&project.objects2d[a.object].kind==='robot')?.id??'';},rebuild);
   field(c,actor.id+'-'+index+'-type',w.action,action.type,v=>actionSet('type',v,true),actions2D.filter(type=>project.objects2d[actor.object].kind==='robot'?type!=='attach':!['walk','wave','jump'].includes(type)).map(type=>[type,w[type]]));
   field(c,actor.id+'-'+index+'-at',w.at,action.at,v=>actionSet('at',v),undefined,[0,scene.duration]);field(c,actor.id+'-'+index+'-duration',w.duration,action.duration,v=>actionSet('duration',v),undefined,[.01,scene.duration]);
   if(['walk','move','jump'].includes(action.type)){field(c,actor.id+'-'+index+'-toX',w.toX,action.toX,v=>actionSet('toX',v));field(c,actor.id+'-'+index+'-toY',w.toY,action.toY,v=>actionSet('toY',v));}
   if(action.type==='jump'||action.type==='float')field(c,actor.id+'-'+index+'-height',w.height,action.height,v=>actionSet('height',v),undefined,[0,110]);
   if(action.type==='attach')field(c,actor.id+'-'+index+'-target',w.target,action.target,v=>actionSet('target',v),shot().actors.filter(a=>a.id!==actor.id&&project.objects2d[a.object].kind==='robot').map(a=>[a.id,a.name]));
   c.append(button(w.remove,()=>update(()=>{shot().actors.find(v=>v.id===actor.id)!.actions.splice(index,1);},true)));
  }
  let nextType:typeof actions2D[number]=project.objects2d[actor.object].kind==='robot'?'wave':'move';
  field(a,actor.id+'-new-action',w.action,nextType,v=>{nextType=v;},actions2D.filter(type=>project.objects2d[actor.object].kind==='robot'?type!=='attach':!['walk','wave','jump'].includes(type)).map(type=>[type,w[type]]));
  a.append(button(w.action+' +',()=>update(()=>{const current=shot().actors.find(v=>v.id===actor.id)!,list=current.actions,type=nextType,position=['walk','move','jump'].includes(type),start=Math.max(0,...list.filter(a=>a.type===type||position&&['walk','move','jump'].includes(a.type)).map(a=>a.at+a.duration)),frame=actorFrame2D(current,start);openActions.add(actor.id+':'+list.length);list.push({...defaultAction2D(type),at:start,duration:Math.min(type==='jump'?3:type==='wave'?2.3:1,scene.duration-start),toX:frame.x,toY:frame.groundY,target:type==='attach'?shot().actors.find(a=>a.id!==actor.id&&project.objects2d[a.object].kind==='robot')?.id??'':''});},true)));
 }
 f.append(button(w.actor+' +',()=>update(()=>{const object=Object.keys(project.objects2d)[0];if(!object)throw Error(w.empty);const actor=defaultActor2D(object);actor.name=project.objects2d[object].name;openActors.add(actor.id);shot().actors.push(actor);},true)));
 field(f,'camera',w.camera,!!shot().camera.length,v=>update(()=>{shot().camera=v?[{at:0,x:0,y:0,zoom:1},{at:scene.duration,x:-65,y:0,zoom:1.12}]:[];},true));
 for(const [i,key]of shot().camera.entries()){const c=group(f,w.camera+' '+(i+1));for(const [property,title]of [['at',w.at],['x','X'],['y','Y'],['zoom',w.zoom]] as const)field(c,'camera-'+i+'-'+property,title,key[property],v=>update(()=>{shot().camera[i][property]=v;}));c.append(button(w.remove,()=>update(()=>{shot().camera.splice(i,1);},true)));}
 if(shot().camera.length)f.append(button(w.camera+' +',()=>update(()=>{const bounds=[...new Set([0,...shot().camera.map(k=>k.at),scene.duration])].sort((a,b)=>a-b),gap=bounds.slice(1).map((end,i)=>({start:bounds[i],end})).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0],at=(gap.start+gap.end)/2;shot().camera.push({...cameraFrame2D(shot().camera,at),at});shot().camera.sort((a,b)=>a.at-b.at);},true)));
 field(f,'transition',w.transition,!!shot().transition,v=>update(()=>{shot().transition=v?{stage:Object.keys(project.stages2d).find(id=>id!==shot().stage)??shot().stage,at:scene.duration*.66,duration:scene.duration*.12,x:550,y:290}:null;},true));
 if(shot().transition){const c=group(f,w.transition),value=shot().transition!;field(c,'transition-stage',w.stage,value.stage,v=>update(()=>{shot().transition!.stage=v;}),entries(project.stages2d));for(const key of ['at','duration','x','y'] as const)field(c,'transition-'+key,key==='at'?w.at:key==='duration'?w.duration:key.toUpperCase(),value[key],v=>update(()=>{shot().transition![key]=v;}));}
 field(f,'ending',w.ending,!!shot().ending,v=>update(()=>{shot().ending=v?{title:'Manchmal genügt',subtitle:'ein kleiner Funke.',at:scene.duration*.75,duration:scene.duration*.08}:null;},true));
 if(shot().ending){const c=group(f,w.ending),value=shot().ending!;for(const [key,title]of [['title',w.titleLine],['subtitle',w.subtitle],['at',w.at],['duration',w.duration]] as const)field(c,'ending-'+key,title,value[key],v=>update(()=>{Object.assign(shot().ending!,{[key]:v});}));}
}
export function stage2DTimeline(host:HTMLElement,scene:Scene,language:string,seek:(time:number)=>void){
 if(!scene.stage2d)return;const w=words(language),shot=scene.stage2d;
 const row=(name:string,at:number,duration:number,id:string)=>{const r=document.createElement('div');r.className='timeline-row stage2d-track';r.dataset.stage2dTrack=id;const label=document.createElement('div');label.className='timeline-track-label';label.append(button(name,()=>seek(at+duration/2)));const lane=document.createElement('div');lane.className='timeline-lane';const bar=button('',()=>seek(at+duration/2));bar.className='timeline-bar';bar.style.left=at/scene.duration*100+'%';bar.style.width=duration/scene.duration*100+'%';bar.title=name+': '+at.toFixed(2)+'–'+(at+duration).toFixed(2)+' s';bar.setAttribute('aria-label',bar.title);lane.append(bar);r.append(label,lane);host.append(r);};
 for(const a of shot.actors)for(const [i,c]of a.actions.entries())row(a.name+' · '+w[c.type],c.at,c.duration,a.id+'-'+i);
 if(shot.camera.length)row(w.camera,0,scene.duration,'camera');if(shot.transition)row(w.transition,shot.transition.at,shot.transition.duration,'transition');if(shot.ending)row(w.ending,shot.ending.at,scene.duration-shot.ending.at,'ending');
}
export function installStage2DEditor(get:()=>{project:Project;index:number},commit:(p:Project)=>void,stop:()=>void){
 const w=words(document.documentElement.lang),launch=button(w.resources,()=>{stop();render();dialog.showModal();});launch.id='open-stage2d';launch.setAttribute('aria-haspopup','dialog');launch.setAttribute('aria-controls','stage2d-dialog');const icon=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');path.setAttribute('d','M3 5h18v14H3ZM7 14l3-4 4 5 3-3 3 5M7 8h.01');icon.append(path);launch.prepend(icon);document.getElementById('open-stage3d')!.before(launch);
 const shared=stage3DWords[document.documentElement.lang as keyof typeof stage3DWords]??stage3DWords.en;
 const dialog=document.createElement('dialog');dialog.id='stage2d-dialog';dialog.setAttribute('aria-labelledby','stage2d-title');
 const header=document.createElement('header');header.className='json-header';
 const heading=document.createElement('h2');heading.id='stage2d-title';heading.textContent=w.resources;
 const hint=document.createElement('p');hint.textContent=({
  de:'Wiederverwendbare 2D-Objekte und Bühnen für unabhängige Szenenauftritte.',
  en:'Reusable 2D objects and stages for independent scene instances.',
  es:'Objetos y escenarios 2D reutilizables para instancias independientes.',
  fr:'Objets et décors 2D réutilisables pour des instances indépendantes.'
 }[document.documentElement.lang]??'Reusable 2D objects and stages for independent scene instances.');
 const headerContent=document.createElement('div');headerContent.append(heading,hint);header.append(headerContent);
 const inner=document.createElement('div');inner.className='dialog-inner';
 const body=document.createElement('div');body.className='stage3d-grid';
 const message=document.createElement('p');message.id='stage2d-status';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 inner.append(message,body);
 const paths={
  add:'M12 5v14M5 12h14',
  duplicate:'M8 8h12v12H8ZM4 16H3V3h13v1',
  remove:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  use:'M4 4h16v16H4M8 12h8M12 8l4 4-4 4',
  close:'M6 6l12 12M6 18 18 6'
 };
 function action(label:string,path:string,run:()=>void){
  const b=button(label,run);b.textContent='';b.title=label;b.setAttribute('aria-label',label);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),line=document.createElementNS('http://www.w3.org/2000/svg','path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');line.setAttribute('d',path);svg.append(line);b.append(svg);return b;
 }
 const footer=document.createElement('footer');footer.className='json-footer stage3d-actions';footer.append(action(w.close,paths.close,()=>dialog.close()));
 dialog.append(header,inner,footer);document.body.append(dialog);
 let preview:Stage2DView|undefined;
 dialog.addEventListener('close',()=>{preview?.dispose();preview=undefined;});
 function resourceField(parent:HTMLElement,key:string,title:string,value:string,save:(value:any)=>void|boolean,choices?:[string,string][]){
  const input=field(parent,key,title,value,save,choices),label=input.parentElement!;
  if(input instanceof HTMLInputElement&&input.type==='color'){
   const swatch=document.createElement('span');swatch.className='stage3d-color-swatch';const output=document.createElement('output');output.textContent=value.toUpperCase();
   label.append(swatch);swatch.append(input,output);input.addEventListener('input',()=>{output.textContent=input.value.toUpperCase();});
  }else label.classList.add('stage3d-name-field');
 }
 function fieldGroup(parent:HTMLElement,title:string){const f=group(parent,title),grid=document.createElement('div');grid.className='stage3d-field-grid';f.append(grid);return grid;}
 let kind:'objects2d'|'stages2d'='objects2d',selected='';
 const apply=(fn:(p:Project)=>void)=>{try{const next=structuredClone(get().project);fn(next);const parsed=validateProject(next);commit(parsed);message.textContent='';render();return true;}catch(e){message.textContent=(e as Error).message;return false;}};
 function render(){preview?.dispose();preview=undefined;body.replaceChildren();const p=get().project,sidebar=document.createElement('section'),detail=document.createElement('section');sidebar.className='stage3d-library';detail.className='stage3d-details';body.append(sidebar,detail);field(sidebar,'resource-kind',shared.kind,kind,v=>{kind=v;selected='';render();},[['objects2d',w.objects],['stages2d',w.stages]]);
  const library=p[kind];if(!Object.hasOwn(library,selected))selected=Object.keys(library)[0]??'';
  field(sidebar,'resource',kind==='objects2d'?w.objects:w.stages,selected,v=>{selected=v;render();},entries(library));
  const actions=document.createElement('div');actions.className='stage3d-actions';sidebar.append(actions);
  actions.append(action(w.add,paths.add,()=>apply(next=>{selected=crypto.randomUUID();if(kind==='objects2d')next.objects2d[selected]=defaultObject2D();else next.stages2d[selected]=defaultStage2DResource();})));if(!selected){detail.textContent=w.empty;return;}
  const resource=library[selected];
  actions.append(action(w.duplicate,paths.duplicate,()=>apply(next=>{const id=crypto.randomUUID();Object.assign(next[kind],{[id]:{...next[kind][selected],name:resource.name+' II'}});selected=id;})),action(w.remove,paths.remove,()=>apply(next=>{if(next.scenes.some(s=>kind==='objects2d'?s.stage2d?.actors.some(a=>a.object===selected):s.stage2d?.stage===selected||s.stage2d?.transition?.stage===selected))throw Error(w.referenced);delete next[kind][selected];selected='';})),action(w.use,paths.use,()=>apply(next=>{const scene=next.scenes[get().index];if(kind==='stages2d'){scene.stage2d??=defaultStage2D(selected);scene.stage2d.stage=selected;}else{if(!Object.keys(next.stages2d).length)throw Error(w.empty);scene.stage2d??=defaultStage2D(Object.keys(next.stages2d)[0]);const a=defaultActor2D(selected);a.name=resource.name;scene.stage2d.actors.push(a);}})));
  const set=(key:string,value:unknown)=>{if((get().project[kind][selected] as unknown as Record<string,unknown>)[key]===value)return;return apply(next=>Object.assign(next[kind][selected],{[key]:value}));};
  const detailHeading=document.createElement('header');detailHeading.className='stage3d-detail-heading';const title=document.createElement('h3'),id=document.createElement('span');title.textContent=(kind==='objects2d'?w.object:w.stage)+' · '+resource.name;id.id='stage2d-detail-id';id.textContent=selected;detailHeading.append(title,id);detail.append(detailHeading);
  const editor=document.createElement('div');editor.className='stage3d-resource-editor';detail.append(editor);
  const fields=document.createElement('div');fields.id='stage2d-fields';editor.append(fields);
  const general=fieldGroup(fields,shared.general),appearance=fieldGroup(fields,shared.appearance);
  resourceField(general,'resource-name',w.name,resource.name,v=>set('name',v));
  if(kind==='objects2d'){const r=p.objects2d[selected];resourceField(appearance,'resource-type',w.kind,r.kind,v=>set('kind',v),[['robot',w.robot],['spark',w.spark],['shape',w.shape]]);resourceField(appearance,'resource-color',w.color,r.color,v=>set('color',v));resourceField(appearance,'resource-accentColor',w.accentColor,r.accentColor,v=>set('accentColor',v));if(r.kind==='shape')resourceField(appearance,'resource-shape',w.shape,r.shape,v=>set('shape',v),[['rectangle',w.rectangle],['ellipse',w.ellipse],['star',w.star]]);}
  else{const r=p.stages2d[selected];resourceField(appearance,'resource-preset',w.preset,r.preset,v=>apply(next=>Object.assign(next.stages2d[selected],defaultStage2DResource(v),{name:resource.name})),[['forest',w.forest],['night-garden',w['night-garden']]]);resourceField(appearance,'resource-skyColor',w.skyColor,r.skyColor,v=>set('skyColor',v));resourceField(appearance,'resource-groundColor',w.groundColor,r.groundColor,v=>set('groundColor',v));}
  const note=document.createElement('p');note.className='small-hint';note.textContent=w.hint;detail.append(note);
  const card=document.createElement('figure');card.className='stage3d-resource-preview-card';
  const caption=document.createElement('figcaption');caption.textContent=shared.resourcePreview;
  const host=document.createElement('div');host.id='stage2d-resource-preview';
  const status=document.createElement('p');status.id='stage2d-resource-preview-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');card.append(caption,host,status);editor.append(card);
  const sample=resourcePreview2D(p,kind,selected)!;
  preview=createStage2DView(sample.resources,sample.shot,sample.duration,640,480,error=>{status.textContent=error.message;});preview.canvas.setAttribute('aria-label',shared.resourcePreview+' · '+resource.name);host.append(preview.canvas);preview.draw(0);

 }
}
