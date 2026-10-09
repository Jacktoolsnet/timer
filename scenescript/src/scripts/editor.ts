import {defaultSimulation,simulationTypes,type Simulation} from '../lib/simulation';
import {createSimulation,type SimulationView} from './simulation';
import {defaultGradient,gradientCSS,type Gradient} from '../lib/gradient';
import {createSvgImage,seekSvg} from './svg-image';
import {validateSvg,svgDataURL} from '../lib/svg';
import {renderShape} from './shapes';
import {showToast} from './toast';
import {richTextEditor,renderRuns,type TextStyleKey} from './rich-text';
import {demoProject,newScene,newElement,parseProject,formats,fonts,animations,shapeTypes,sceneTransitions,sceneTransitionState,animationState,locateTime,MAX_FILE_BYTES,MAX_IMAGE_BYTES,validateImage,type Project,type Scene,type Element} from '../lib/model';
import {storageAllowed} from '../lib/storage';
import {screenWakeLock} from '../lib/wake-lock';
import {STORAGE_KEY} from '../lib/engine';
import type {EditorKey} from '../lib/editor-i18n';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const words=JSON.parse($('editor').dataset.words!) as Record<EditorKey,string>;
const t=(key:string)=>words[key as EditorKey]||key;
const keepScreenAwake=screenWakeLock($('wake-status'),'',t('wakeUnavailable'));
let project:Project=demoProject(), sceneIndex=0, selectedId='',dirty=false,time=0,playing=false,recording=false;
let revision=0, focusAttempt=0;
// Recording uses its own playhead; returning must not discard the editor context.
let recordingReturnState:{sceneIndex:number;selectedId:string;time:number}|undefined;
let baseTime=0,started=0,frame=0,countdownTimer:ReturnType<typeof setTimeout>|undefined,draftTimer:ReturnType<typeof setTimeout>|undefined;
const status=(message:string)=>{$('editor-status').textContent=message;};
try{if(storageAllowed()){const saved=localStorage.getItem(STORAGE_KEY);if(saved){project=parseProject(saved);dirty=true;status(t('recovery'));}}}catch{status(t('storageError'));}
document.querySelectorAll('#scene-form, #element-form').forEach(form=>form.addEventListener('submit',event=>event.preventDefault()));
const current=()=>project.scenes[sceneIndex];
const selected=()=>current().elements.find(e=>e.id===selectedId);
const total=()=>project.scenes.reduce((sum,s)=>sum+s.duration,0);
const offset=(index:number)=>project.scenes.slice(0,index).reduce((sum,s)=>sum+s.duration,0);
function persist(){if(!storageAllowed())return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(project));}catch{status(t('storageError'));}}
function changed(){revision++;dirty=true;status(t('changed'));clearTimeout(draftTimer);draftTimer=setTimeout(persist,500);}
document.addEventListener('storage-enabled',persist);
document.addEventListener('preferences-cleared',()=>{clearTimeout(draftTimer);});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();}});
// Explicit language changes would otherwise lose an unsaved in-memory project.
document.querySelectorAll<HTMLAnchorElement>('.language-menu a').forEach(link=>link.addEventListener('click',event=>{if(dirty&&!confirm(t('unsaved')))event.preventDefault();}));
function button(text:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',action);return b;}
function selectScene(index:number){stop();sceneIndex=index;selectedId='';time=offset(index);refresh();}
function refresh(){
 ($('project-title') as HTMLInputElement).value=project.title;($('project-format') as HTMLSelectElement).value=project.format;
 const list=$('scene-list'),scrollTop=list.scrollTop;list.replaceChildren();
 project.scenes.forEach((s,i)=>{const li=document.createElement('li'),b=button(`${i+1}. ${s.name} · ${s.duration}s`,()=>selectScene(i));b.title=b.textContent||'';b.setAttribute('aria-current',String(i===sceneIndex));li.append(b);list.append(li);});list.scrollTop=scrollTop;
 ($('delete-scene') as HTMLButtonElement).disabled=project.scenes.length===1;($('scene-up') as HTMLButtonElement).disabled=sceneIndex===0;($('scene-down') as HTMLButtonElement).disabled=sceneIndex===project.scenes.length-1;($('add-scene') as HTMLButtonElement).disabled=project.scenes.length>=100;
 renderForms();renderElements();renderAssets();draw();
}
function renderElements(){
 const index=current().elements.findIndex(e=>e.id===selectedId),count=current().elements.length;
 ($('duplicate-element') as HTMLButtonElement).disabled=index<0||count>=100;
 ($('delete-element') as HTMLButtonElement).disabled=index<0;
 ($('rename-element') as HTMLButtonElement).disabled=index<0;
 ($('element-up') as HTMLButtonElement).disabled=index<=0;
 ($('element-down') as HTMLButtonElement).disabled=index<0||index>=count-1;
 document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(b=>b.disabled=count>=100);
 const list=$('element-list'),scrollTop=list.scrollTop;list.replaceChildren();current().elements.forEach((e,i)=>{const li=document.createElement('li'),b=button(`${i+1}. ${t(e.type)} · ${e.name||(e.type==='text'?e.text:e.type==='image'?(project.assets[e.asset]?.name||e.id):e.type==='simulation'?t(e.simulation!.type):e.id)}`,()=>{selectedId=e.id;renderForms();renderElements();draw();});b.title=b.textContent||'';b.setAttribute('aria-current',String(e.id===selectedId));li.append(b);list.append(li);});list.scrollTop=scrollTop;}
const renameDialog=$('rename-dialog') as HTMLDialogElement;
let pendingRename:((name:string)=>void)|undefined;
function askRename(name:string,action:(name:string)=>void){
 stop();draw();pendingRename=action;const input=$('rename-input') as HTMLInputElement;input.value=name;renameDialog.showModal();input.focus();input.select();
}
$('cancel-rename').addEventListener('click',()=>renameDialog.close());
renameDialog.addEventListener('close',()=>{pendingRename=undefined;});
$('rename-form').addEventListener('submit',event=>{
 event.preventDefault();const input=$('rename-input') as HTMLInputElement;const name=input.value.trim();if(!name){input.value='';input.reportValidity();return;}
 const action=pendingRename;renameDialog.close();action?.(name);
});
$('rename-scene').addEventListener('click',()=>{const scene=current();askRename(scene.name,name=>{scene.name=name;changed();refresh();$('rename-scene').focus();});});
$('rename-element').addEventListener('click',()=>{const element=selected();if(!element)return;askRename(element.name||t(element.type),name=>{element.name=name;changed();refresh();$('rename-element').focus();});});
const deleteDialog=$('delete-dialog') as HTMLDialogElement;
let pendingDelete:(()=>void)|undefined;
function askDelete(name:string,kind:'scene'|'image',action:()=>void){
 stop();draw();pendingDelete=action;
 $('delete-name').textContent=name;$('delete-description').textContent=t(kind==='scene'?'deleteSceneHint':'deleteImageHint');
 deleteDialog.showModal();$('cancel-delete').focus();
}
$('cancel-delete').addEventListener('click',()=>deleteDialog.close());
$('confirm-delete').addEventListener('click',()=>{const action=pendingDelete;pendingDelete=undefined;deleteDialog.close();action?.();});
deleteDialog.addEventListener('close',()=>{pendingDelete=undefined;});
function downloadAsset(asset:{name:string;data:string}){
 try{
  const [header,encoded]=asset.data.split(','),mime=header.slice(5,header.indexOf(';'));
  const extension=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/svg+xml':'svg'} as Record<string,string>)[mime];
  if(!extension)throw new Error('Unsupported image format');
  const bytes=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:mime})),link=document.createElement('a');
  const name=asset.name.replace(/\.(png|jpe?g|webp|svg)$/i,'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').trim().replace(/[. ]+$/g,'').slice(0,160)||'image';
  link.href=url;link.download=name+'.'+extension;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){status(t('error')+' '+(error as Error).message);}
}
const assetPreviewDialog=$('asset-preview-dialog') as HTMLDialogElement;
function previewAsset(asset:{name:string;data:string}){
 const image=$('asset-preview-image') as HTMLImageElement;
 image.src=asset.data;image.alt=asset.name;$('asset-preview-title').textContent=asset.name;$('asset-preview-title').title=asset.name;
 assetPreviewDialog.showModal();$('close-asset-preview').focus();
}
$('close-asset-preview').addEventListener('click',()=>assetPreviewDialog.close());
assetPreviewDialog.addEventListener('close',()=>{($('asset-preview-image') as HTMLImageElement).removeAttribute('src');});
function renderAssets(){const list=$('asset-list');list.replaceChildren();for(const [id,asset] of Object.entries(project.assets)){const row=document.createElement('div');row.className='asset-row';const img=document.createElement('img');img.src=asset.data;img.alt='';const preview=button('',()=>previewAsset(asset));preview.className='asset-thumbnail';preview.dataset.previewAsset=id;preview.title=`${t('imagePreview')}: ${asset.name}`;preview.setAttribute('aria-label',preview.title);preview.append(img);const name=document.createElement('span');name.textContent=asset.name;name.title=asset.name;const remove=button('',()=>{const target=project;askDelete(asset.name,'image',()=>{if(project!==target)return;delete project.assets[id];project.scenes.forEach(s=>{if(s.backgroundAsset===id)s.backgroundAsset='';s.elements.forEach(e=>{if(e.asset===id)e.asset='';});});changed();refresh();$('import-image').focus();});});remove.dataset.deleteAsset=id;remove.setAttribute('aria-label',`${t('remove')}: ${asset.name}`);remove.title=`${t('remove')}: ${asset.name}`;
const trash=document.createElementNS('http://www.w3.org/2000/svg','svg');trash.setAttribute('viewBox','0 0 24 24');trash.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7');trash.append(path);remove.append(trash);
const rename=button('',()=>askRename(asset.name,newName=>{asset.name=newName;changed();refresh();$('import-image').focus();}));rename.title=`${t('rename')}: ${asset.name}`;rename.setAttribute('aria-label',rename.title);rename.dataset.renameAsset=id;
const pencil=document.createElementNS('http://www.w3.org/2000/svg','svg');pencil.setAttribute('viewBox','0 0 24 24');pencil.setAttribute('aria-hidden','true');const pencilPath=document.createElementNS('http://www.w3.org/2000/svg','path');pencilPath.setAttribute('d','m15 4 5 5M4 20l5-1L21 7l-5-5L4 14ZM3 22h18');pencil.append(pencilPath);rename.append(pencil);
const save=button('',()=>downloadAsset(asset));save.title=`${t('saveImage')}: ${asset.name}`;save.setAttribute('aria-label',save.title);save.dataset.saveAsset=id;
const downloadIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');downloadIcon.setAttribute('viewBox','0 0 24 24');downloadIcon.setAttribute('aria-hidden','true');const downloadPath=document.createElementNS('http://www.w3.org/2000/svg','path');downloadPath.setAttribute('d','M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6');downloadIcon.append(downloadPath);save.append(downloadIcon);
const actions=document.createElement('div');actions.className='asset-actions';actions.append(rename,save,remove);row.append(preview,name,actions);list.append(row);}}
function field(form:HTMLElement,key:string,value:string|number|boolean,kind:string,action:(value:string|number|boolean)=>void,options?:readonly string[],min?:number,max?:number){
 const label=document.createElement('label');label.append(document.createTextNode(t(key)));
 let input:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
 if(kind==='select'){input=document.createElement('select');options?.forEach(option=>{const o=document.createElement('option');o.value=option;o.textContent=key==='asset'||key==='backgroundAsset'?(option?project.assets[option].name:t('none')):t(key==='gradientType'&&option==='solid'?'gradientSolid':key==='transition'&&option!=='none'&&option!=='fade'?'transition-'+option:option);input.append(o);});input.value=String(value);}
 else if(kind==='textarea'){input=document.createElement('textarea');input.value=String(value);input.maxLength=10000;}
 else{input=document.createElement('input');input.type=kind;if(kind==='checkbox')input.checked=Boolean(value);else input.value=String(value);if(kind==='number'){input.step='any';if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);}if(kind==='text')input.maxLength=200;if(['simulationCount','simulationSeed'].includes(key))input.step='1';}
 input.name=key;
 input.addEventListener(kind==='textarea'||kind==='text'||kind==='color'?'input':'change',()=>{
  if(!input.isConnected)return;
  if(input instanceof HTMLInputElement&&!input.checkValidity()){input.reportValidity();return;}
  const value=kind==='checkbox'?(input as HTMLInputElement).checked:kind==='number'?(input as HTMLInputElement).valueAsNumber:input.value;
  action(value);
 });
 if(kind==='number'){
  const number=input as HTMLInputElement;
  const wrapper=document.createElement('span');wrapper.className='number-stepper';
  const step=['opacity','stopOpacity','backgroundOpacity','simulationOpacity'].includes(key)?0.05:['duration','transitionDuration','animationDuration','at','simulationSpeed'].includes(key)?0.1:1;
  const controls=[-1,1].map(direction=>{
   const control=button(direction<0?'−':'+',()=>{
    if(!Number.isFinite(number.valueAsNumber))return;
    const next=Math.max(min??-Infinity,Math.min(max??Infinity,Number((number.valueAsNumber+direction*step).toFixed(6))));
    number.value=String(next);number.dispatchEvent(new Event('change',{bubbles:true}));sync();
   });
   control.title=`${t(direction<0?'decrease':'increase')}: ${t(key)}`;control.setAttribute('aria-label',control.title);
   return control;
  });
  function sync(){controls[0].disabled=min!==undefined&&number.valueAsNumber<=min;controls[1].disabled=max!==undefined&&number.valueAsNumber>=max;}
  number.addEventListener('input',sync);number.addEventListener('change',sync);sync();
  wrapper.append(controls[0],number,controls[1]);label.append(wrapper);
 }else if(kind==='checkbox'&&['bold','italic','underline','strikethrough'].includes(key)){
  label.classList.add('text-style-toggle');
  const wrapper=document.createElement('span');wrapper.className='safe-switch';
  input.setAttribute('role','switch');input.setAttribute('aria-label',t(key));
  const track=document.createElement('span');track.className='safe-switch-track';track.setAttribute('aria-hidden','true');
  wrapper.append(input,track);label.append(wrapper);
 }else label.append(input);
 form.append(label);
}
function shapeColorField(form:HTMLElement,key:'fillColor'|'borderColor',value:string){
 const label=document.createElement('label');label.append(document.createTextNode(t(key)));
 const row=document.createElement('span');row.className='shape-color-control';
 const color=document.createElement('input');color.type='color';color.name=key;let lastColor=value==='none'?'#ffffff':value;color.value=lastColor;color.disabled=value==='none';color.setAttribute('aria-label',t(key));
 const none=document.createElement('span');none.className='shape-color-none';none.append(document.createTextNode(t('none')));
 const wrapper=document.createElement('span');wrapper.className='safe-switch';
 const toggle=document.createElement('input');toggle.type='checkbox';toggle.name=key+'None';toggle.checked=value==='none';toggle.setAttribute('role','switch');toggle.setAttribute('aria-label',t(key==='fillColor'?'noFill':'noBorder'));toggle.title=t(key==='fillColor'?'noFill':'noBorder');
 const track=document.createElement('span');track.className='safe-switch-track';track.setAttribute('aria-hidden','true');wrapper.append(toggle,track);none.append(wrapper);
 color.addEventListener('input',()=>{lastColor=color.value;updateElement(key,lastColor);});
 toggle.addEventListener('change',()=>{color.disabled=toggle.checked;updateElement(key,toggle.checked?'none':lastColor);if(key==='fillColor'&&toggle.checked){updateElement('fillGradient',null);renderForms();}});
 row.append(color,none);label.append(row);form.append(label);
}
function gradientFields(form:HTMLElement,key:'backgroundGradient'|'fillGradient',value:Gradient|null,color:string,update:(value:Gradient|null)=>void){
 const label=document.createElement('div');label.className='gradient-control';label.dataset.gradient=key;
 const panel=document.createElement('div');panel.className='gradient-panel';label.append(panel);form.append(label);
 field(panel,'gradientType',value?.type||'solid','select',v=>{if(key==='fillGradient'&&v!=='solid'&&color==='none')updateElement('fillColor','#b86445');update(v==='solid'?null:{...(value||defaultGradient(color==='none'?'#b86445':color)),type:v as Gradient['type']});renderForms();},['solid','linear','radial','conic']);
 if(!value)return;
 const sample=document.createElement('div');sample.className='gradient-sample';panel.append(sample);
 const commit=(next:Gradient)=>{if(JSON.stringify(next)===JSON.stringify(value))return;update(next);Object.assign(value!,next);sample.style.background=gradientCSS(next,color);};
 sample.style.background=gradientCSS(value,color);
 if(value.type!=='radial')field(panel,'gradientAngle',value.angle,'number',v=>commit({...value,angle:Number(v)}),undefined,-360,360);
 if(value.type!=='linear'){field(panel,'gradientX',value.x,'number',v=>commit({...value,x:Number(v)}),undefined,0,100);field(panel,'gradientY',value.y,'number',v=>commit({...value,y:Number(v)}),undefined,0,100);}
 const stops=document.createElement('div');stops.className='gradient-stops';panel.append(stops);
 const setStop=(index:number,key:'color'|'position'|'opacity',v:string|number|boolean)=>{
  const next={...value,stops:value.stops.map((stop,i)=>i===index?{...stop,[key]:v}:stop)};
  next.stops.sort((a,b)=>a.position-b.position);commit(next);
  // Preserve the active control for color edits; order changes need rebuilding.
  value.stops=next.stops;if(key==='position')renderForms();
 };
 value.stops.forEach((stop,i)=>{
  const row=document.createElement('div');row.className='gradient-stop';stops.append(row);
  field(row,'stopColor',stop.color,'color',v=>setStop(i,'color',v));
  field(row,'stopPosition',stop.position,'number',v=>setStop(i,'position',v),undefined,0,100);
  field(row,'stopOpacity',stop.opacity,'number',v=>setStop(i,'opacity',v),undefined,0,1);
  const remove=button('−',()=>{commit({...value,stops:value.stops.filter((_,index)=>index!==i)});renderForms();});remove.title=t('removeStop');remove.setAttribute('aria-label',remove.title);remove.disabled=value.stops.length<=2;row.append(remove);
 });
 const add=button('+',()=>{const stops=[...value.stops,{color:'#ffffff',position:50,opacity:1}].sort((a,b)=>a.position-b.position);commit({...value,stops});renderForms();});add.title=t('addStop');add.setAttribute('aria-label',add.title);add.disabled=value.stops.length>=16;panel.append(add);
}
function simulationFields(form:HTMLElement,config:Simulation|null,update:(value:Simulation|null)=>boolean,projectLevel=false){
 const container=document.createElement('div');container.dataset.simulationSettings='true';container.className='simulation-settings';form.append(container);
 field(container,'simulationType',config?.type||'none','select',v=>{
  if(v==='none'){update(null);return;}
  update({...config||defaultSimulation(v as Simulation['type']),type:v as Simulation['type']});
 },projectLevel?['none',...simulationTypes]:simulationTypes);
 if(!config)return;
 const settings:readonly [keyof Simulation,string,string,number?,number?][]=[
  ['color','simulationColor','color'],['count','simulationCount','number',1,200],
  ['speed','simulationSpeed','number',.1,5],['size','simulationSize','number',1,100],
  ['opacity','simulationOpacity','number',0,1],['seed','simulationSeed','number',0,4294967295]
 ];
 for(const [key,label,kind,min,max] of settings)field(container,label,config[key],kind,v=>{
  const next={...config,[key]:v};if(update(next))Object.assign(config!,next);
 },undefined,min,max);
}
const simulationDialog=$('simulation-dialog') as HTMLDialogElement;
$('project-simulation-form').addEventListener('submit',event=>event.preventDefault());
function renderProjectSimulation(){
 const form=$('project-simulation-form');form.replaceChildren();
 simulationFields(form,project.backgroundSimulation,value=>{
  const previous=project.backgroundSimulation;project.backgroundSimulation=value;
  try{parseProject(JSON.stringify(project));stop();changed();draw();if(previous?.type!==value?.type)renderProjectSimulation();return true;}
  catch(error){project.backgroundSimulation=previous;status(t('error')+' '+(error as Error).message);showToast(t('error')+' '+(error as Error).message,'error');renderProjectSimulation();return false;}
 },true);
}
$('project-simulation').addEventListener('click',()=>{renderProjectSimulation();simulationDialog.showModal();});
$('close-simulation').addEventListener('click',()=>simulationDialog.close());
function updateScene(key:keyof Scene,value:unknown){const previous=current()[key];(current() as unknown as Record<string,unknown>)[key]=value;try{parseProject(JSON.stringify(project));stop();time=offset(sceneIndex);changed();draw();if((key==='background'||key==='backgroundGradient')&&richEditor)richEditor.editor.style.background=gradientCSS(current().backgroundGradient,current().background);if(key==='name'||key==='duration')renderSceneLabels();}catch(error){(current() as unknown as Record<string,unknown>)[key]=previous;status(t('error')+' '+(error as Error).message);renderForms();}}
function renderSceneLabels(){const buttons=$('scene-list').querySelectorAll('button');project.scenes.forEach((s,i)=>{buttons[i].textContent=`${i+1}. ${s.name} · ${s.duration}s`;buttons[i].title=buttons[i].textContent||'';});}
let richEditor:ReturnType<typeof richTextEditor>|undefined;
function updateElement(key:keyof Element,value:unknown){
 if(richEditor&&['font','fontSize','color','bold','italic','underline','strikethrough'].includes(key)){richEditor.apply(key as TextStyleKey,value);return;}
 updateElementValue(key,value);
}
function updateElementValue(key:keyof Element,value:unknown){const e=selected();if(!e)return;const old=e[key];(e as unknown as Record<string,unknown>)[key]=value;try{parseProject(JSON.stringify(project));stop();time=offset(sceneIndex)+e.at+e.animationDuration;time=Math.min(time,offset(sceneIndex)+current().duration-0.001);changed();draw(false);if(key==='text')renderElements();if(key==='shapeType')renderForms();}catch(error){(e as unknown as Record<string,unknown>)[key]=old;status(t('error')+' '+(error as Error).message);renderForms();}}
function renderForms(){
 richEditor?.dispose();richEditor=undefined;
 const form=$('scene-form');form.replaceChildren();const s=current();
 field(form,'name',s.name,'text',v=>updateScene('name',v));field(form,'duration',s.duration,'number',v=>updateScene('duration',v),undefined,0.1,3600);
 field(form,'backgroundOpacity',s.backgroundOpacity,'number',v=>updateScene('backgroundOpacity',v),undefined,0,1);
 field(form,'background',s.background,'color',v=>updateScene('background',v));gradientFields(form,'backgroundGradient',s.backgroundGradient,s.background,v=>updateScene('backgroundGradient',v));field(form,'backgroundAsset',s.backgroundAsset,'select',v=>updateScene('backgroundAsset',v),['',...Object.keys(project.assets)]);
 field(form,'transition',s.transition,'select',v=>updateScene('transition',v),sceneTransitions);field(form,'transitionDuration',s.transitionDuration,'number',v=>updateScene('transitionDuration',v),undefined,0.01,3600);
 const ef=$('element-form');ef.replaceChildren();ef.classList.remove('text-settings');const e=selected();if(!e){const p=document.createElement('p');p.className='small-hint';p.textContent=t('empty');ef.append(p);return;}
 if(e.type==='text'){
 richEditor=richTextEditor(e,()=>{changed();stop();draw(false);renderElements();},(key,value)=>updateElementValue(key,value),{selection:t('richSelectionHint'),block:t('richBlockHint')});
 richEditor.editor.setAttribute('aria-label',t('text'));
 richEditor.editor.style.background=gradientCSS(s.backgroundGradient,s.background);
 const contentLabel=document.createElement('label');contentLabel.append(document.createTextNode(t('text')),richEditor.editor,richEditor.hint);contentLabel.dataset.richText='true';ef.append(contentLabel);field(ef,'font',e.font,'select',v=>updateElement('font',v),fonts);field(ef,'fontSize',e.fontSize,'number',v=>updateElement('fontSize',v),undefined,1,500);field(ef,'align',e.align,'select',v=>updateElement('align',v),['left','center','right']);for(const key of ['bold','italic','underline','strikethrough'] as const)field(ef,key,e[key],'checkbox',v=>updateElement(key,v));}
 if(e.type==='image'){field(ef,'asset',e.asset,'select',v=>updateElement('asset',v),['',...Object.keys(project.assets)]);field(ef,'fit',e.fit,'select',v=>updateElement('fit',v),['contain','cover']);}
 if(e.type==='text')field(ef,'color',e.color,'color',v=>updateElement('color',v));
 if(e.type==='shape'){field(ef,'shapeType',e.shapeType,'select',v=>updateElement('shapeType',v),shapeTypes);shapeColorField(ef,'fillColor',e.fillColor);shapeColorField(ef,'borderColor',e.borderColor);field(ef,'borderStyle',e.borderStyle,'select',v=>updateElement('borderStyle',v),['solid','dashed','dotted','double']);field(ef,'borderWidth',e.borderWidth,'number',v=>updateElement('borderWidth',v),undefined,0,500);}
 if(e.type==='simulation')simulationFields(ef,e.simulation,value=>{
  if(!value)return false;const previous=e.simulation;updateElement('simulation',value);if(previous?.type!==value.type){renderForms();renderElements();}return e.simulation===value;
 });
 if(e.type==='shape')gradientFields(ef,'fillGradient',e.fillGradient,e.fillColor,v=>updateElement('fillGradient',v));
 for(const [key,min,max] of [['x',-100,100],['y',-100,100],['width',0.1,200],['height',0.1,200],['opacity',0,1],['rotation',-360,360],['radius',0,1000]] as const)field(ef,key,e[key],'number',v=>updateElement(key,v),undefined,min,max);
 field(ef,'animation',e.animation,'select',v=>updateElement('animation',v),animations);field(ef,'at',e.at,'number',v=>updateElement('at',v),undefined,0,s.duration);field(ef,'animationDuration',e.animationDuration,'number',v=>updateElement('animationDuration',v),undefined,0.01,3600);
 if(e.type==='shape'&&e.shapeType!=='rectangle'){const radius=ef.querySelector<HTMLInputElement>('[name=radius]')!;radius.disabled=true;radius.closest('label')?.querySelectorAll('button').forEach(b=>b.disabled=true);}
 ef.classList.add('text-settings');
 const groups:readonly (readonly [string,readonly string[]])[]=e.type==='text'?[
   ['textContentGroup',['text']],
   ['textStyleGroup',['font','fontSize','align','bold','italic','underline','strikethrough','color','opacity','radius']],
   ['elementLayoutGroup',['x','y','width','height','rotation']],
   ['elementMotionGroup',['animation','at','animationDuration']]
  ]:[
   [e.type==='simulation'?'simulationStyleGroup':e.type==='image'?'imageStyleGroup':'shapeStyleGroup',e.type==='simulation'?['simulation','opacity','radius']:e.type==='image'?['asset','fit','opacity','radius']:['shapeType','fillColor','borderColor','fillGradient','opacity','borderWidth','borderStyle','radius']],
   ['elementLayoutGroup',['x','y','width','height','rotation']],
   ['elementMotionGroup',['animation','at','animationDuration']]
  ];
  for(const [title,keys] of groups){
   const group=document.createElement('fieldset');group.className='text-settings-group '+title;
   const legend=document.createElement('legend');legend.textContent=t(title);group.append(legend);
   const fields=document.createElement('div');fields.className='text-settings-fields';group.append(fields);
   for(const key of keys){const label=key==='simulation'?ef.querySelector('[data-simulation-settings]'):key==='fillGradient'?ef.querySelector('[data-gradient=fillGradient]'):key==='text'?ef.querySelector('label[data-rich-text]'):ef.querySelector(`[name="${key}"]`)?.closest('label');if(label)fields.append(label);}
   ef.append(group);
  }
}
function moveElement(delta:number){const s=current(),index=s.elements.findIndex(e=>e.id===selectedId),next=index+delta;if(index<0||next<0||next>=s.elements.length)return;[s.elements[index],s.elements[next]]=[s.elements[next],s.elements[index]];changed();refresh();}
const stage=$('stage'),stageFrame=$('stage-frame');
function resize(){const [w,h]=formats[project.format];stage.style.width=`${w}px`;stage.style.height=`${h}px`;stage.style.transform=`scale(${stageFrame.clientWidth/w})`;stageFrame.style.aspectRatio=`${w}/${h}`;document.documentElement.style.setProperty('--project-ratio',String(w/h));}
new ResizeObserver(resize).observe(stageFrame);
function fitPreview(){
 if(!previewContent.classList.contains('preview-expanded'))return;
 const host=$('preview-overlay-host');
 const style=getComputedStyle(host);
 let available=host.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
 for(const child of Array.from(previewContent.children)){
  if(child===stageFrame)continue;
  const css=getComputedStyle(child);
  if(css.display==='none')continue;
  available-=child.getBoundingClientRect().height+parseFloat(css.marginTop)+parseFloat(css.marginBottom);
 }
 previewContent.style.setProperty('--preview-stage-height',`${Math.max(0,available)}px`);
}

const previewDialog=$('preview-dialog') as HTMLDialogElement;
const previewContent=$('preview-content');
const previewSizeObserver=new ResizeObserver(fitPreview);
previewSizeObserver.observe($('preview-overlay-host'));
for(const child of Array.from(previewContent.children)){if(child!==stageFrame)previewSizeObserver.observe(child);}
function closePreview(){
 $('preview-slot').append(previewContent);previewContent.classList.remove('preview-expanded');
 if(previewDialog.open)previewDialog.close();
 resize();
}
$('open-preview').addEventListener('click',()=>{
 $('preview-overlay-host').append(previewContent);previewContent.classList.add('preview-expanded');
 previewDialog.showModal();fitPreview();resize();
});
$('close-preview').addEventListener('click',closePreview);
previewDialog.addEventListener('close',()=>{if(previewContent.parentElement!==$('preview-slot'))closePreview();});
previewDialog.addEventListener('click',event=>{if(event.target===previewDialog){const rect=previewDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closePreview();}});
// Render complete scene layers so transitions include backgrounds and rich text.
type SceneView={element:Element;node:HTMLDivElement;text?:HTMLSpanElement;svg?:SVGSVGElement;simulation?:SimulationView};
let projectSimulation:SimulationView|undefined,projectSimulationKey='';
function syncProjectSimulation(){
 const key=JSON.stringify([project.backgroundSimulation,project.format]);
 if(key!==projectSimulationKey){projectSimulationKey=key;const [width,height]=formats[project.format];projectSimulation=project.backgroundSimulation?createSimulation(project.backgroundSimulation,width,height):undefined;projectSimulation?.canvas.classList.add('project-simulation-canvas');}
 projectSimulation?.draw(time);
}
let transitionBlack:HTMLDivElement|undefined;
let stageKey='',views:SceneView[]=[],incomingLayer:HTMLDivElement|undefined,incomingSvgBackground:SVGSVGElement|undefined,outgoingLayer:HTMLDivElement|undefined;
function createSceneLayer(scene:Scene,index:number,interactive:boolean){
 const layer=document.createElement('div');layer.className='scene-layer';layer.dataset.sceneIndex=String(index);layer.style.background=scene.backgroundOpacity===1?gradientCSS(scene.backgroundGradient,scene.background):'transparent';
 let backgroundHost:HTMLElement=layer;
 if(scene.backgroundOpacity<1){const backdrop=document.createElement('div');backdrop.className='scene-backdrop';backdrop.style.background=gradientCSS(scene.backgroundGradient,scene.background);backdrop.style.opacity=String(scene.backgroundOpacity);layer.append(backdrop);backgroundHost=backdrop;}
 if(!interactive)layer.style.pointerEvents='none';
 const [w,h]=formats[project.format];const sceneViews:SceneView[]=[];
 const simulationPixelBudget=8000000/Math.max(1,scene.elements.filter(e=>e.type==='simulation').length);
 let svgBackground:SVGSVGElement|undefined;
 if(scene.backgroundAsset&&project.assets[scene.backgroundAsset].data.startsWith('data:image/svg+xml;')){svgBackground=createSvgImage(project.assets[scene.backgroundAsset].data,'cover',true);const background=document.createElement('div');background.className='scene-background';background.append(svgBackground);backgroundHost.append(background);}
 else if(scene.backgroundAsset){const image=document.createElement('img');image.className='scene-background';image.src=project.assets[scene.backgroundAsset].data;image.alt='';backgroundHost.append(image);}
 scene.elements.forEach(e=>{
   const node=document.createElement('div');node.className='scene-element'+(interactive&&!playing&&e.id===selectedId?' selected':'');
   Object.assign(node.style,{left:`${e.x*w/100}px`,top:`${e.y*h/100}px`,width:`${e.width*w/100}px`,height:`${e.height*h/100}px`,color:e.color,fontFamily:e.font,fontSize:`${e.fontSize}px`,fontWeight:e.bold?'700':'400',fontStyle:e.italic?'italic':'normal',textDecoration:[e.underline?'underline':'',e.strikethrough?'line-through':''].filter(Boolean).join(' ')||'none',textAlign:e.align,justifyContent:e.align==='left'?'flex-start':e.align==='right'?'flex-end':'center',borderRadius:`${e.radius}px`});
   let text:HTMLSpanElement|undefined,svg:SVGSVGElement|undefined,simulation:SimulationView|undefined;
   if(e.type==='text'){node.style.textDecoration='none';text=document.createElement('span');text.style.width='100%';node.append(text);}
   else if(e.type==='simulation'){simulation=createSimulation(e.simulation!,e.width*w/100,e.height*h/100,simulationPixelBudget);node.append(simulation.canvas);}
   else if(e.type==='shape')renderShape(node,e,e.width*w/100,e.height*h/100);
   else if(e.asset&&project.assets[e.asset].data.startsWith('data:image/svg+xml;')){svg=createSvgImage(project.assets[e.asset].data,e.fit);node.append(svg);}
   else if(e.asset){const img=document.createElement('img');img.src=project.assets[e.asset].data;img.alt=project.assets[e.asset].name;img.style.objectFit=e.fit;node.append(img);}
   else{node.textContent=t('image');node.style.background='#ffffff22';}
   node.addEventListener('click',()=>{if(!interactive||playing||recording)return;selectedId=e.id;renderForms();renderElements();draw();});
   layer.append(node);sceneViews.push({element:e,node,text,svg,simulation});
 });
 return {layer,views:sceneViews,svgBackground};
}
function updateSceneViews(sceneViews:SceneView[],local:number,opacity=1){
 sceneViews.forEach(({element,node,text,svg,simulation})=>{simulation?.draw(local-element.at);seekSvg(svg,local-element.at);const state=animationState(element,local);node.style.opacity=String(state.opacity*opacity);node.style.visibility=state.visible?'visible':'hidden';node.style.transform=state.transform;if(text&&text.dataset.visibleText!==state.text){renderRuns(text,element,state.text);text.dataset.visibleText=state.text;}});
}
function draw(follow=true){
 syncProjectSimulation();
 const at=locateTime(project,time);
 if(follow&&at.index!==sceneIndex){sceneIndex=at.index;selectedId='';renderForms();renderElements();$('scene-list').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===sceneIndex)));}
 const s=project.scenes[at.index],transition=sceneTransitionState(s,at.local);
 const layered=s.transition!=='none'&&s.transition!=='fade';
 const showPrevious=layered&&at.index>0&&transition.progress<1;
 const key=`${revision}:${at.index}:${project.format}:${playing}:${recording}:${selectedId}:${showPrevious}`;
 if(stageKey!==key){
  stageKey=key;stage.replaceChildren(...(projectSimulation?[projectSimulation.canvas]:[]));outgoingLayer=undefined;transitionBlack=undefined;
  if(projectSimulation&&s.transition==='through-black'){transitionBlack=document.createElement('div');transitionBlack.className='project-transition-black';stage.append(transitionBlack);}stage.style.background=projectSimulation||layered||s.backgroundGradient||s.backgroundOpacity<1?'#000000':s.background;resize();
  if(showPrevious){const previous=project.scenes[at.index-1],view=createSceneLayer(previous,at.index-1,false);outgoingLayer=view.layer;stage.append(view.layer);updateSceneViews(view.views,previous.duration);seekSvg(view.svgBackground,previous.duration);}
  const view=createSceneLayer(s,at.index,true);incomingLayer=view.layer;incomingSvgBackground=view.svgBackground;views=view.views;stage.append(view.layer);
 }
 if(transitionBlack)transitionBlack.style.opacity=String(1-Math.abs(transition.progress*2-1));
 if(incomingLayer){incomingLayer.style.transform=transition.incoming;incomingLayer.style.clipPath=transition.clip;incomingLayer.style.opacity=String(transition.opacity);}
 if(outgoingLayer){outgoingLayer.style.transform=transition.outgoing;outgoingLayer.style.opacity=String(transition.outgoingOpacity);}
 // Preserve the existing fade-in semantics over the incoming background color.
 const sceneOpacity=s.transition==='fade'&&playing?Math.min(1,at.local/s.transitionDuration):1;
 const backgroundImage=incomingLayer?.querySelector<HTMLElement|SVGElement>('.scene-background');if(backgroundImage)backgroundImage.style.opacity=String(sceneOpacity);
 seekSvg(incomingSvgBackground,at.local);
 updateSceneViews(views,at.local,sceneOpacity);
 ($('timeline') as HTMLInputElement).max=String(total());($('timeline') as HTMLInputElement).value=String(time);$('time-label').textContent=`${time.toFixed(1)} / ${total().toFixed(1)} s`;
 const playButton=$('play') as HTMLButtonElement;
 playButton.title=t(playing?'pause':'play');playButton.setAttribute('aria-label',playButton.title);
 playButton.querySelector('[aria-hidden]')!.textContent=playing?'Ⅱ':'▶';playButton.querySelector('.control-label')!.textContent=playButton.title;
 ($('previous-scene') as HTMLButtonElement).disabled=sceneIndex===0;
 ($('next-scene') as HTMLButtonElement).disabled=sceneIndex===project.scenes.length-1;
}
function stop(){playing=false;cancelAnimationFrame(frame);keepScreenAwake(false);}
function tick(now:number){time=Math.min(total(),baseTime+(now-started)/1000);draw();if(time>=total()){stop();draw();return;}frame=requestAnimationFrame(tick);}
function play(){if(countdownTimer)return;if(time>=total())time=0;baseTime=time;started=performance.now();playing=true;keepScreenAwake(true);frame=requestAnimationFrame(tick);}
$('play').addEventListener('click',()=>{if(playing){stop();draw();}else play();});
function skipScene(delta:number){const next=sceneIndex+delta;if(next<0||next>=project.scenes.length)return;const resume=playing;selectScene(next);if(resume)play();}
$('previous-scene').addEventListener('click',()=>skipScene(-1));
$('next-scene').addEventListener('click',()=>skipScene(1));
$('timeline').addEventListener('input',()=>{stop();time=Number(($('timeline') as HTMLInputElement).value);draw();});
$('safe-toggle').addEventListener('change',()=>{$('safe-overlay').hidden=!($('safe-toggle') as HTMLInputElement).checked;});
function replace(next:Project){stop();revision++;project=next;sceneIndex=0;selectedId='';time=0;dirty=false;persist();refresh();status(t('ready'));}
const canReplace=()=>!dirty||confirm(t('unsaved'));
$('new-project').addEventListener('click',()=>{if(canReplace()){replace({version:'1.0',title:'SceneScript',format:'landscape',backgroundSimulation:null,assets:{},scenes:[newScene()]});changed();}});
$('project-title').addEventListener('input',()=>{project.title=($('project-title') as HTMLInputElement).value;changed();});
$('project-format').addEventListener('change',()=>{project.format=($('project-format') as HTMLSelectElement).value as Project['format'];changed();draw();});
$('add-scene').addEventListener('click',()=>{if(project.scenes.length>=100)return;project.scenes.push(newScene());changed();selectScene(project.scenes.length-1);});
$('duplicate-scene').addEventListener('click',()=>{if(project.scenes.length>=100)return;const copy=structuredClone(current());copy.id=crypto.randomUUID();copy.elements.forEach(e=>e.id=crypto.randomUUID());project.scenes.splice(sceneIndex+1,0,copy);changed();selectScene(sceneIndex+1);});
$('delete-scene').addEventListener('click',()=>{
 if(project.scenes.length===1)return;
 const target=project,scene=current();
 askDelete(scene.name,'scene',()=>{
  if(project!==target||project.scenes.length===1)return;
  const index=project.scenes.findIndex(s=>s.id===scene.id);if(index<0)return;
  project.scenes.splice(index,1);changed();selectScene(Math.min(index,project.scenes.length-1));$('delete-scene').focus();
 });
});
for(const [id,delta] of [['scene-up',-1],['scene-down',1]] as const)$ (id).addEventListener('click',()=>{const next=sceneIndex+delta;if(next<0||next>=project.scenes.length)return;[project.scenes[sceneIndex],project.scenes[next]]=[project.scenes[next],project.scenes[sceneIndex]];changed();selectScene(next);});
document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(b=>b.addEventListener('click',()=>{if(current().elements.length>=100)return;($('element-add-menu') as HTMLDetailsElement).open=false;const e=newElement(b.dataset.add as Element['type']);if(e.type==='image')e.asset=Object.keys(project.assets)[0]||'';current().elements.push(e);try{parseProject(JSON.stringify(project));}catch(error){current().elements.pop();status(t('error')+' '+(error as Error).message);return;}selectedId=e.id;stop();time=offset(sceneIndex)+Math.min(current().duration-0.001,e.animationDuration);changed();refresh();}));
function download(){try{parseProject(JSON.stringify(project));const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});if(blob.size>MAX_FILE_BYTES)throw new Error('JSON: maximum 30 MiB');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(project.title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,80)||'project')+'.scenescript.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);dirty=false;status(t('saved'));}catch(error){status(t('error')+' '+(error as Error).message);}}
$('save-project').addEventListener('click',download);
$('load-project').addEventListener('click',()=>($('project-file') as HTMLInputElement).click());
$('project-file').addEventListener('change',async()=>{const input=$('project-file') as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;try{if(file.size>MAX_FILE_BYTES)throw new Error('JSON: maximum 30 MiB');const next=parseProject(await file.text());await preload(next);if(canReplace())replace(next);}catch(error){status(t('error')+' '+(error as Error).message);}});
const dialog=$('json-dialog') as HTMLDialogElement;
let jsonSession=0;
function jsonStatus(message:string,error=false){
 $('json-status').textContent=message;$('copy-json-error').hidden=!error;$('json-copy-status').textContent='';
}
$('json-input').addEventListener('input',()=>jsonStatus(''));
$('copy-json-error').addEventListener('click',async()=>{
 const session=jsonSession,message=$('json-status').textContent||'',button=$('copy-json-error') as HTMLButtonElement;if(!message)return;button.disabled=true;
 try{await navigator.clipboard.writeText(message);if(dialog.open&&session===jsonSession&&$('json-status').textContent===message)showToast(t('errorCopied'),'success');}
 catch{if(dialog.open&&session===jsonSession&&$('json-status').textContent===message){const range=document.createRange();range.selectNodeContents($('json-status'));const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);$('json-copy-status').textContent=t('errorCopyDenied');}}
 finally{button.disabled=false;}
});
dialog.addEventListener('close',()=>{jsonSession++;});
$('open-json').addEventListener('click',()=>{jsonSession++;($('json-input') as HTMLTextAreaElement).value='';jsonStatus('');dialog.showModal();$('json-input').focus();});
$('close-json').addEventListener('click',()=>dialog.close());
$('paste-json').addEventListener('click',async()=>{
 const session=jsonSession,button=$('paste-json') as HTMLButtonElement;button.disabled=true;
 try{
  const text=await navigator.clipboard.readText();
  if(!dialog.open||session!==jsonSession)return;
  if(new TextEncoder().encode(text).length>MAX_FILE_BYTES){jsonStatus(t('error')+' JSON: maximum 30 MiB',true);return;}
  ($('json-input') as HTMLTextAreaElement).value=text;jsonStatus('');$('json-input').focus();
 }catch{
  if(dialog.open&&session===jsonSession){jsonStatus(t('clipboardDenied'));$('json-input').focus();}
 }finally{button.disabled=false;}
});
$('import-json').addEventListener('click',async()=>{try{const next=parseProject(($('json-input') as HTMLTextAreaElement).value);await preload(next);if(canReplace()){replace(next);dialog.close();}}catch(error){jsonStatus(t('error')+' '+(error as Error).message,true);}});

$('import-image').addEventListener('click',()=>($('image-file') as HTMLInputElement).click());
async function decodeImage(data:string){const image=new Image();image.src=data;await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw new Error('Image: invalid dimensions');if(image.naturalWidth*image.naturalHeight>40_000_000)throw new Error('Image: maximum 40 megapixels');}
async function preload(p:Project){await Promise.all(Object.values(p.assets).map(a=>decodeImage(a.data)));}
$('image-file').addEventListener('change',async()=>{const input=$('image-file') as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;const target=project;try{if(Object.keys(project.assets).length>=100)throw new Error('assets: maximum 100');if(file.size>MAX_IMAGE_BYTES)throw new Error('Image: maximum 8 MiB');const isSvg=file.type==='image/svg+xml'||/\.svg$/i.test(file.name);if(!isSvg&&!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG / JPEG / WebP / SVG');const data=isSvg?svgDataURL(validateSvg(await file.text())):await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Image read failed'));reader.readAsDataURL(file);});validateImage(data);await decodeImage(data);if(project!==target)return;const id=crypto.randomUUID();project.assets[id]={name:file.name.slice(0,200),data};try{parseProject(JSON.stringify(project));}catch(error){delete project.assets[id];throw error;}const e=selected();if(e?.type==='image')e.asset=id;changed();refresh();}catch(error){status(t('error')+' '+(error as Error).message);}});
let editorFullscreen=false;
function setEditorFullscreen(enabled:boolean){
 editorFullscreen=enabled;document.body.classList.toggle('editor-fullscreen',enabled);
 const button=$('editor-fullscreen');button.setAttribute('aria-pressed',String(enabled));
 button.title=t(enabled?'exitAppFullscreen':'appFullscreen');button.setAttribute('aria-label',button.title);
}
$('editor-fullscreen').addEventListener('click',async()=>{
 if(editorFullscreen){setEditorFullscreen(false);if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});}
 else{setEditorFullscreen(true);try{await document.documentElement.requestFullscreen();}catch{/* App-only CSS fallback. */}}
});
$('focus').addEventListener('click',async()=>{
 if(($('focus') as HTMLButtonElement).disabled||recording)return;
 closePreview();
 const attempt=++focusAttempt;($('focus') as HTMLButtonElement).disabled=true;stop();
 try{await preload(project);await document.fonts.ready;}
 catch(error){status(t('error')+' '+(error as Error).message);return;}
 finally{($('focus') as HTMLButtonElement).disabled=false;}
 if(attempt!==focusAttempt)return;
 recordingReturnState={sceneIndex,selectedId,time};recording=true;
 document.body.classList.add('recording','recording-ready');
 $('recording-start').hidden=false;($('start-recording') as HTMLButtonElement).disabled=true;
 $('exit-focus').hidden=false;selectedId='';time=0;draw();
 try{await document.documentElement.requestFullscreen();}catch{/* CSS fallback. */}
 if(!recording||attempt!==focusAttempt)return;
 ($('start-recording') as HTMLButtonElement).disabled=false;$('start-recording').focus();
});
function startCountdown(){
 if(!recording||!document.body.classList.contains('recording-ready')||($('start-recording') as HTMLButtonElement).disabled)return;
 document.body.classList.remove('recording-ready','controls-visible');clearTimeout(controlsTimer);
 $('recording-start').hidden=true;$('start-recording').blur();keepScreenAwake(true);
 let count=3;$('countdown').hidden=false;$('countdown').textContent=String(count);
 const step=()=>{
  count--;
  if(count>0){$('countdown').textContent=String(count);countdownTimer=setTimeout(step,1000);}
  else{$('countdown').hidden=true;countdownTimer=undefined;play();}
 };
 countdownTimer=setTimeout(step,1000);
}
$('start-recording').addEventListener('click',startCountdown);
function exit(){
 if(!recording)return;
 focusAttempt++;
 clearTimeout(countdownTimer);countdownTimer=undefined;$('countdown').hidden=true;
 stop();recording=false;document.body.classList.remove('recording','recording-ready','controls-visible');$('recording-start').hidden=true;$('exit-focus').hidden=true;
 if(recordingReturnState){
  ({sceneIndex,selectedId,time}=recordingReturnState);
  recordingReturnState=undefined;
 }
 if(document.fullscreenElement&&!editorFullscreen)void document.exitFullscreen().catch(()=>{});
 refresh();$('focus').focus();
}
$('exit-focus').addEventListener('click',exit);
let controlsTimer:ReturnType<typeof setTimeout>|undefined;
function revealControls(){if(!recording)return;document.body.classList.add('controls-visible');clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>document.body.classList.remove('controls-visible'),1500);}
document.addEventListener('pointermove',revealControls);
document.addEventListener('pointerdown',revealControls);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){if(recording)exit();setEditorFullscreen(false);}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&recording){exit();return;}if(event.key==='Escape'&&editorFullscreen&&!document.querySelector('dialog[open]')){setEditorFullscreen(false);if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});return;}if(event.code==='Space'&&recording){event.preventDefault();if(document.body.classList.contains('recording-ready')){startCountdown();return;}if(playing){stop();draw();}else play();}});
refresh();

$('duplicate-element').addEventListener('click',()=>{const e=selected();if(!e||current().elements.length>=100)return;const copy={...structuredClone(e),id:crypto.randomUUID()};current().elements.push(copy);try{parseProject(JSON.stringify(project));}catch(error){current().elements.pop();status(t('error')+' '+(error as Error).message);return;}selectedId=copy.id;changed();refresh();});
$('element-up').addEventListener('click',()=>moveElement(-1));
$('element-down').addEventListener('click',()=>moveElement(1));
$('delete-element').addEventListener('click',()=>{if(!selected())return;current().elements=current().elements.filter(e=>e.id!==selectedId);selectedId='';changed();refresh();});
document.addEventListener('click',event=>{const menu=$('element-add-menu') as HTMLDetailsElement;if(!menu.contains(event.target as Node))menu.open=false;});
$('element-add-menu').addEventListener('keydown',event=>{if(event.key==='Escape'&&($('element-add-menu') as HTMLDetailsElement).open){event.preventDefault();event.stopPropagation();($('element-add-menu') as HTMLDetailsElement).open=false;$('element-add-menu').querySelector('summary')?.focus();}});
