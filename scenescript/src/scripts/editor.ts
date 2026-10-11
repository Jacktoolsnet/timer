import {parseCamera,cameraTransform,type Camera} from '../lib/camera';
import {createPanels} from '../lib/panels';
import {createCropImage} from './crop-image';
import {parseCrop,panelRects,panelTemplates,type Crop,type PanelTemplate} from '../lib/crop';
import {editInterval} from '../lib/timeline';
import {History} from '../lib/history';
import {sceneElementState,sceneElementMatrix,newGroup,dissolveGroup,groupController,parentMatrix} from '../lib/groups';
import {createBubble,type BubbleView} from './bubble';
import {bubbleTarget,applyMatrix,inversePoint,detachAnchor,renameAnchor,type Bubble} from '../lib/comic';
import {defaultNarration,parseNarration,validateAudioData,narrationClips,duckGain,MAX_AUDIO_BYTES,type Narration,type AudioAsset} from '../lib/audio';
import {decodeAudio,audioBlob,NarrationPlayer} from './audio';
import {defaultMotionPath,defaultSegment,pathTemplate,pathTypes,type Point,type MotionPath} from '../lib/motion-path';
import {renderMotionPath} from './motion-path-editor';
import {defaultVideo,parseVideo,validateVideoData,MAX_VIDEO_BYTES,type VideoSettings} from '../lib/video';
import {createVideo,syncVideo,inspectVideo,videoURL,releaseVideoURL,clearVideoURLs} from './video';
import {defaultMusic,parseMusic,presetInstrument,instrumentPresets,musicStyles,waveforms,type Music,type Instrument} from '../lib/music';
import {MusicPlayer} from './music-audio';
import {switchSimulationType,simulationTypes,type Simulation} from '../lib/simulation';
import {createSimulation,type SimulationView} from './simulation';
import {defaultGradient,gradientCSS,type Gradient} from '../lib/gradient';
import {createSvgImage,seekSvg} from './svg-image';
import {validateSvg,svgDataURL} from '../lib/svg';
import {renderShape} from './shapes';
import {showToast} from './toast';
import {richTextEditor,renderRuns,type TextStyleKey} from './rich-text';
import {demoProject,newScene,newElement,parseProject,formats,fonts,animations,exitAnimations,shapeTypes,sceneTransitions,sceneTransitionState,locateTime,MAX_FILE_BYTES,MAX_IMAGE_BYTES,validateImage,type Project,type Scene,type Element,type Group} from '../lib/model';
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
let historyGesture='';
document.addEventListener('pointerdown',event=>{if((event.target as HTMLElement).closest('.motion-path-overlay,.comic-edit-overlay'))historyGesture='gesture:'+event.pointerId+':'+Date.now();},{capture:true});
for(const name of ['pointerup','pointercancel'])window.addEventListener(name,()=>setTimeout(()=>{historyGesture='';},0));
let selectedGroupId='',multiSelection=new Set<string>();
const collapsedGroups=new Set<string>();
let motionEditing=false,comicEditing:'tail'|'anchors'|null=null;
// Recording uses its own playhead; returning must not discard the editor context.
let recordingReturnState:{sceneIndex:number;selectedId:string;selectedGroupId:string;multiSelection:string[];time:number}|undefined;
let recordingRestartTimer:ReturnType<typeof setTimeout>|undefined;
let playbackAttempt=0;
let baseTime=0,started=0,frame=0,countdownTimer:ReturnType<typeof setTimeout>|undefined,draftTimer:ReturnType<typeof setTimeout>|undefined;
const status=(message:string)=>{$('editor-status').textContent=message;};
try{if(storageAllowed()){const saved=localStorage.getItem(STORAGE_KEY);if(saved){project=parseProject(saved);dirty=true;status(t('recovery'));}}}catch{status(t('storageError'));}
const history=new History(project);
document.querySelectorAll('#scene-form, #element-form').forEach(form=>form.addEventListener('submit',event=>event.preventDefault()));
const current=()=>project.scenes[sceneIndex];
const selected=()=>current().elements.find(e=>e.id===selectedId);
const total=()=>project.scenes.reduce((sum,s)=>sum+s.duration,0);
const offset=(index:number)=>project.scenes.slice(0,index).reduce((sum,s)=>sum+s.duration,0);
function persist(){if(!storageAllowed())return;if(Object.values(project.videos).reduce((n,v)=>n+v.data.length,0)>4*1024*1024){try{localStorage.removeItem(STORAGE_KEY);}catch{}status(t('storageError'));return;}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(project));}catch{status(t('storageError'));}}
function changed(){const active=document.activeElement as HTMLElement|null;history.record(project,historyGesture||(active?.matches('input,textarea,[contenteditable=true]')?(active.getAttribute('name')||active.id||'rich-text')+':'+selectedId+':'+selectedGroupId:''));historyButtons();renderTimeline();revision++;dirty=true;status(t('changed'));clearTimeout(draftTimer);draftTimer=setTimeout(persist,500);}
document.addEventListener('storage-enabled',persist);
document.addEventListener('preferences-cleared',()=>{clearTimeout(draftTimer);});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();}});
// Explicit language changes would otherwise lose an unsaved in-memory project.
document.querySelectorAll<HTMLAnchorElement>('.language-menu a').forEach(link=>link.addEventListener('click',event=>{if(dirty&&!confirm(t('unsaved')))event.preventDefault();}));
function button(text:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',action);return b;}
function selectScene(index:number){selectedGroupId='';multiSelection.clear();stop();sceneIndex=index;selectedId='';time=offset(index);refresh();}
function refresh(){
 ($('project-title') as HTMLInputElement).value=project.title;($('project-description') as HTMLTextAreaElement).value=project.description;($('project-hashtags') as HTMLInputElement).value=project.hashtags;($('project-format') as HTMLSelectElement).value=project.format;
 const list=$('scene-list'),scrollTop=list.scrollTop;list.replaceChildren();
 project.scenes.forEach((s,i)=>{const li=document.createElement('li'),b=button(`${i+1}. ${s.name} · ${s.duration}s`,()=>selectScene(i));b.title=b.textContent||'';b.setAttribute('aria-current',String(i===sceneIndex));li.append(b);list.append(li);});list.scrollTop=scrollTop;
 ($('delete-scene') as HTMLButtonElement).disabled=project.scenes.length===1;($('scene-up') as HTMLButtonElement).disabled=sceneIndex===0;($('scene-down') as HTMLButtonElement).disabled=sceneIndex===project.scenes.length-1;($('add-scene') as HTMLButtonElement).disabled=project.scenes.length>=100;
 renderForms();renderElements();renderAssets();renderThumbnail();renderAudios();historyButtons();renderTimeline();draw();
}
function renderElements(){
 ($('open-panels') as HTMLButtonElement).disabled=!Object.keys(project.assets).length;
 const index=current().elements.findIndex(e=>e.id===selectedId),count=current().elements.length,g=current().groups.find(g=>g.id===selectedGroupId);
 ($('duplicate-element') as HTMLButtonElement).disabled=g?count+g.members.length>100||current().groups.length>=50:index<0||count>=100;
 ($('delete-element') as HTMLButtonElement).disabled=index<0&&!g;
 ($('rename-element') as HTMLButtonElement).disabled=index<0&&!g;
 ($('element-up') as HTMLButtonElement).disabled=index<=0;
 ($('element-down') as HTMLButtonElement).disabled=index<0||index>=count-1;
 document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(b=>b.disabled=count>=100);
 const list=$('element-list'),scrollTop=list.scrollTop;list.replaceChildren();
 multiSelection=new Set([...multiSelection].filter(id=>current().elements.some(e=>e.id===id)));
 ($('group-elements') as HTMLButtonElement).disabled=multiSelection.size<2||new Set(current().elements.filter(e=>multiSelection.has(e.id)).map(e=>e.space)).size>1||[...multiSelection].some(id=>current().groups.some(g=>g.members.includes(id)));
 $('group-elements').title=t(new Set(current().elements.filter(e=>multiSelection.has(e.id)).map(e=>e.space)).size>1?'groupSpaceMismatch':'group');
 ($('ungroup-elements') as HTMLButtonElement).disabled=!current().groups.some(g=>g.id===selectedGroupId);
 for(const g of current().groups){const li=document.createElement('li');li.className='element-group-row';const b=button('▣ '+g.name,()=>selectGroup(g.id));b.title=t('groupSelect')+': '+g.name;b.setAttribute('aria-current',String(g.id===selectedGroupId));li.append(b);list.append(li);}
 current().elements.forEach((e,i)=>{const li=document.createElement('li'),g=current().groups.find(g=>g.members.includes(e.id));li.className='element-selection-row';li.dataset.space=e.space;
 const check=document.createElement('input');check.type='checkbox';check.checked=multiSelection.has(e.id);check.setAttribute('aria-label',t('memberSelection')+': '+(e.name||e.id));check.addEventListener('change',()=>{if(check.checked)multiSelection.add(e.id);else multiSelection.delete(e.id);renderElements();});
 const b=button(`${i+1}. ${g?'▣ '+g.name+' · ':''}${t(e.type)} · ${e.name||((e.type==='text'||e.type==='bubble')?e.text:e.type==='image'?(project.assets[e.asset]?.name||e.id):e.type==='simulation'?t(e.simulation!.type):e.id)}`,()=>{selectedGroupId='';selectedId=e.id;renderForms();renderElements();draw();});b.title=(b.textContent||'')+' · '+t('space-'+e.space);b.setAttribute('aria-current',String(e.id===selectedId));const badge=document.createElement('span');badge.className='space-badge';badge.textContent=e.space==='screen'?'▣':'◇';badge.title=t('space-'+e.space);badge.setAttribute('aria-label',badge.title);b.prepend(badge);li.append(check,b);list.append(li);});list.scrollTop=scrollTop;}
function historyButtons(){($('undo-project') as HTMLButtonElement).disabled=!history.canUndo;($('redo-project') as HTMLButtonElement).disabled=!history.canRedo;}
function restoreHistory(next:Project|undefined){if(!next)return;stop();project=next;revision++;sceneIndex=Math.min(sceneIndex,project.scenes.length-1);time=Math.min(time,total());selectedGroupId='';multiSelection.clear();if(!selected())selectedId='';dirty=true;persist();refresh();}
$('undo-project').addEventListener('click',()=>restoreHistory(history.undo()));
$('redo-project').addEventListener('click',()=>restoreHistory(history.redo()));
document.addEventListener('keydown',event=>{if(recording||document.querySelector('dialog[open]'))return;const target=event.target as HTMLElement;if(target.closest('input,textarea,[contenteditable=true]'))return;if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){event.preventDefault();restoreHistory(event.key.toLowerCase()==='y'||event.shiftKey?history.redo():history.undo());}});
function selectGroup(id:string){stop();selectedId='';selectedGroupId=id;renderForms();renderElements();renderTimeline();draw();}
$('group-elements').addEventListener('click',()=>{if(multiSelection.size<2||new Set(current().elements.filter(e=>multiSelection.has(e.id)).map(e=>e.space)).size>1||[...multiSelection].some(id=>current().groups.some(g=>g.members.includes(id))))return;const g=newGroup(current(),[...multiSelection],crypto.randomUUID());g.name=t('groupName');current().groups.push(g);selectedGroupId=g.id;selectedId='';multiSelection.clear();changed();refresh();});
$('ungroup-elements').addEventListener('click',()=>{const g=current().groups.find(g=>g.id===selectedGroupId);if(!g)return;try{dissolveGroup(current(),g,time-offset(sceneIndex),formats[project.format][0],formats[project.format][1]);selectedGroupId='';changed();refresh();}catch(error){showToast(t((error as Error).message),'warning');}});
function renderGroupForm(host:HTMLElement,g:Group){
 const hint=document.createElement('p');hint.className='small-hint';hint.textContent=t('groupHint');host.append(hint);field(host,'space',current().elements.find(e=>g.members.includes(e.id))!.space,'select',v=>{stop();for(const e of current().elements)if(g.members.includes(e.id))e.space=String(v) as Element['space'];changed();refresh();},['scene','screen']);
 const update=(key:keyof Group,value:unknown)=>{const old=g[key];Object.assign(g,{[key]:value});try{parseProject(JSON.stringify(project));stop();changed();draw(false);if(key==='name')renderElements();}catch(error){Object.assign(g,{[key]:old});showToast((error as Error).message,'error');renderForms();}};
 field(host,'name',g.name,'text',v=>update('name',v));
 for(const key of ['x','y','rotation','opacity','at','animationDuration','exitDuration'] as const)field(host,key,g[key],'number',v=>update(key,v),undefined,key==='rotation'?-360:key==='x'||key==='y'?-1000:key==='animationDuration'||key==='exitDuration'?.01:0,key==='rotation'?360:key==='opacity'?1:key==='at'?current().duration:key==='x'||key==='y'?1000:3600);
 field(host,'animation',g.animation,'select',v=>update('animation',v),animations.filter(a=>a!=='typewriter'));field(host,'exitAnimation',g.exitAnimation,'select',v=>update('exitAnimation',v),exitAnimations);
 field(host,'elementEndEnabled',g.until!==null,'checkbox',v=>{if(v&&g.at>=current().duration)return;update('until',v?current().duration:null);renderForms();});if(g.until!==null)field(host,'until',g.until,'number',v=>update('until',v),undefined,g.at+.001,current().duration);
 comicPoint(host,t('groupPivot'),g.pivot,p=>update('pivot',p),-1000,1000);
 motionPathFields(host,groupController(g),next=>update('motionPath',next));
}
function renderTimeline(){
 const host=$('edit-timeline');if(!host)return;const scrollTop=host.scrollTop;host.replaceChildren();const s=current();
 const ruler=document.createElement('div');ruler.className='timeline-ruler';
 const empty=document.createElement('span');empty.textContent='s';ruler.append(empty);
 const scale=document.createElement('div');scale.className='timeline-scale';for(let i=0;i<=5;i++){const tick=document.createElement('span');tick.textContent=(s.duration*i/5).toFixed(1);scale.append(tick);}ruler.append(scale);host.append(ruler);
 scale.tabIndex=0;scale.setAttribute('role','slider');scale.setAttribute('aria-label',t('editTimeline'));scale.setAttribute('aria-valuemin','0');scale.setAttribute('aria-valuemax',String(s.duration));scale.setAttribute('aria-valuenow',String(Math.max(0,time-offset(sceneIndex))));
 const seek=(local:number)=>{stop();time=offset(sceneIndex)+Math.max(0,Math.min(s.duration-.000001,local));draw(false);scale.setAttribute('aria-valuenow',String(time-offset(sceneIndex)));};
 scale.addEventListener('pointerdown',event=>{const rect=scale.getBoundingClientRect();seek((event.clientX-rect.left)/rect.width*s.duration);});scale.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();seek(event.key==='Home'?0:event.key==='End'?s.duration:time-offset(sceneIndex)+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?1:.1));});
 const row=(item:Element|Group,group:boolean,indent=false)=>{
  const line=document.createElement('div');line.className='timeline-row'+(group?' group-track':'')+(indent?' child-track':'');line.dataset.trackId=item.id;
  const label=document.createElement('div');label.className='timeline-track-label';
  if(group){const collapse=button(collapsedGroups.has(item.id)?'▸':'▾',()=>{if(collapsedGroups.has(item.id))collapsedGroups.delete(item.id);else collapsedGroups.add(item.id);renderTimeline();});collapse.title=t('collapseTracks');collapse.setAttribute('aria-label',t('collapseTracks')+': '+item.name);collapse.setAttribute('aria-expanded',String(!collapsedGroups.has(item.id)));label.append(collapse);}
  const name=item.name||('text'in item?item.text||t(item.type):t('groupSettings'));const select=button(name,()=>{if(group)selectGroup(item.id);else{selectedGroupId='';selectedId=item.id;renderForms();renderElements();draw();}});select.title=name;label.append(select);
  const lane=document.createElement('div');lane.className='timeline-lane';const bar=document.createElement('div');bar.className='timeline-bar';bar.tabIndex=0;bar.setAttribute('role','slider');bar.setAttribute('aria-label',t('intervalMove')+': '+name);bar.dataset.intervalMode='move';
  const entry=document.createElement('span'),exit=document.createElement('span');entry.className='timeline-entry';exit.className='timeline-exit';bar.append(entry,exit);
  const start=button('',()=>{}),end=button('',()=>{});start.className='timeline-handle start';end.className='timeline-handle end';start.title=t('intervalStart');end.title=t('intervalEnd');start.setAttribute('aria-label',t('intervalStart')+': '+name);end.setAttribute('aria-label',t('intervalEnd')+': '+name);start.dataset.intervalMode='start';end.dataset.intervalMode='end';bar.append(start,end);lane.append(bar);line.append(label,lane);host.append(line);
  const sync=()=>{const finish=item.until??s.duration,span=finish-item.at;bar.style.left=item.at/s.duration*100+'%';bar.style.width=span/s.duration*100+'%';bar.title=name+': '+item.at.toFixed(2)+'–'+finish.toFixed(2)+' s';bar.setAttribute('aria-valuenow',String(item.at));bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(s.duration));bar.setAttribute('aria-valuetext',bar.title);entry.style.width=(item.animation==='none'?0:Math.min(100,item.animationDuration/Math.max(.001,span)*100))+'%';exit.style.width=(item.exitAnimation==='none'?0:Math.min(100,item.exitDuration/Math.max(.001,span)*100))+'%';};sync();
  bar.addEventListener('pointerdown',event=>{
   if(event.button!==0||playing||recording)return;event.preventDefault();stop();if(group){selectedId='';selectedGroupId=item.id;}else{selectedGroupId='';selectedId=item.id;}renderElements();const mode=((event.target as HTMLElement).closest('[data-interval-mode]') as HTMLElement)?.dataset.intervalMode as 'move'|'start'|'end'||'move';const a=item.at,b=item.until,x=event.clientX,rect=lane.getBoundingClientRect();if(!rect.width)return;bar.setPointerCapture(event.pointerId);
   const move=(ev:PointerEvent)=>{Object.assign(item,editInterval(a,b,s.duration,(ev.clientX-x)/rect.width*s.duration,mode,($('timeline-snap') as HTMLInputElement).checked));sync();draw(false);};
   const finish=(ev:PointerEvent)=>{bar.removeEventListener('pointermove',move);bar.removeEventListener('pointerup',finish);bar.removeEventListener('pointercancel',cancel);bar.removeEventListener('lostpointercapture',cancel);if(bar.hasPointerCapture(ev.pointerId))bar.releasePointerCapture(ev.pointerId);if(item.at!==a||item.until!==b){changed();renderForms();}else renderTimeline();};
   const cancel=()=>{Object.assign(item,{at:a,until:b});draw(false);bar.removeEventListener('pointermove',move);bar.removeEventListener('pointerup',finish);bar.removeEventListener('pointercancel',cancel);bar.removeEventListener('lostpointercapture',cancel);renderTimeline();};
   bar.addEventListener('pointermove',move);bar.addEventListener('pointerup',finish);bar.addEventListener('pointercancel',cancel);bar.addEventListener('lostpointercapture',cancel);
  });
  bar.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key)||playing||recording)return;event.preventDefault();if(group){selectedId='';selectedGroupId=item.id;}else{selectedGroupId='';selectedId=item.id;}renderElements();const mode=((event.target as HTMLElement).dataset.intervalMode||'move') as 'move'|'start'|'end';const next=editInterval(item.at,item.until,s.duration,(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?1:.1),mode,($('timeline-snap') as HTMLInputElement).checked);Object.assign(item,next);changed();renderForms();host.querySelector<HTMLElement>('[data-track-id="'+item.id+'"] [data-interval-mode="'+mode+'"]')?.focus();draw(false);});
 };
 for(const g of s.groups){row(g,true);if(!collapsedGroups.has(g.id))for(const id of g.members){const e=s.elements.find(e=>e.id===id);if(e)row(e,false,true);}}
 for(const e of s.elements)if(!s.groups.some(g=>g.members.includes(e.id)))row(e,false);
 host.style.setProperty('--playhead',Math.max(0,Math.min(100,(time-offset(sceneIndex))/s.duration*100))+'%');host.scrollTop=scrollTop;
}
let cameraOverview=false;
const cropDialog=$('crop-dialog') as HTMLDialogElement;
let cropTarget:Element|undefined,cropProject:Project|undefined,cropDraft:Crop={x:0,y:0,width:100,height:100},cropSession=0;
async function openCrop(e:Element){
 stop();const session=++cropSession;cropTarget=e;cropProject=project;cropDraft=structuredClone(e.crop??{x:0,y:0,width:100,height:100});const image=$('crop-source') as HTMLImageElement;image.src=project.assets[e.asset].data;
 try{await image.decode();if(session!==cropSession||project!==cropProject)return;const ratio=image.naturalWidth/image.naturalHeight;$('crop-workspace').style.aspectRatio=String(ratio);$('crop-workspace').style.width=`min(100%, ${Math.min(640,window.innerHeight*.45*ratio)}px)`;renderCropForm();syncCropRectangle();cropDialog.showModal();}catch(error){showToast((error as Error).message,'error');}
}
function syncCropRectangle(){Object.assign($('crop-rectangle').style,{left:cropDraft.x+'%',top:cropDraft.y+'%',width:cropDraft.width+'%',height:cropDraft.height+'%'});}
function renderCropForm(){const form=$('crop-form');form.replaceChildren();for(const key of ['x','y','width','height'] as const)field(form,key,cropDraft[key],'number',value=>{try{cropDraft=parseCrop({...cropDraft,[key]:value})!;syncCropRectangle();}catch(error){showToast((error as Error).message,'warning');renderCropForm();}},undefined,key==='width'||key==='height'?.01:0,100);}
$('crop-form').addEventListener('submit',e=>e.preventDefault());
$('crop-reset').addEventListener('click',()=>{cropDraft={x:0,y:0,width:100,height:100};renderCropForm();syncCropRectangle();});
$('close-crop').addEventListener('click',()=>cropDialog.close());cropDialog.addEventListener('close',()=>{cropSession++;cropTarget=undefined;cropProject=undefined;});
$('apply-crop').addEventListener('click',()=>{if(!cropTarget||cropProject!==project)return;try{const crop=parseCrop(cropDraft),target=cropTarget;target.crop=crop?.x===0&&crop.y===0&&crop.width===100&&crop.height===100?null:crop;changed();cropDialog.close();refresh();}catch(error){showToast((error as Error).message,'error');}});
$('crop-rectangle').addEventListener('pointerdown',event=>{
 if(event.button!==0)return;event.preventDefault();const rectangle=$('crop-rectangle'),box=$('crop-workspace').getBoundingClientRect(),original={...cropDraft},x=event.clientX,y=event.clientY,id=event.pointerId,corner=(event.target as HTMLElement).dataset.cropCorner;rectangle.setPointerCapture(id);
 const move=(ev:PointerEvent)=>{if(ev.pointerId!==id)return;const dx=(ev.clientX-x)/box.width*100,dy=(ev.clientY-y)/box.height*100;let left=original.x,top=original.y,right=left+original.width,bottom=top+original.height;
  if(!corner){left=Math.max(0,Math.min(100-original.width,left+dx));top=Math.max(0,Math.min(100-original.height,top+dy));right=left+original.width;bottom=top+original.height;}
  else{if(corner.includes('w'))left=Math.max(0,Math.min(right-.01,left+dx));else right=Math.min(100,Math.max(left+.01,right+dx));if(corner.includes('n'))top=Math.max(0,Math.min(bottom-.01,top+dy));else bottom=Math.min(100,Math.max(top+.01,bottom+dy));}
  cropDraft={x:left,y:top,width:right-left,height:bottom-top};syncCropRectangle();
 };
 const done=()=>{rectangle.removeEventListener('pointermove',move);rectangle.removeEventListener('pointerup',done);rectangle.removeEventListener('pointercancel',cancel);rectangle.removeEventListener('lostpointercapture',cancel);renderCropForm();};
 const cancel=()=>{cropDraft=original;syncCropRectangle();done();};rectangle.addEventListener('pointermove',move);rectangle.addEventListener('pointerup',done);rectangle.addEventListener('pointercancel',cancel);rectangle.addEventListener('lostpointercapture',cancel);
});
const panelsDialog=$('panels-dialog') as HTMLDialogElement;let panelTemplate:PanelTemplate='two',panelAsset='',panelScene:Scene|undefined,panelProject:Project|undefined;
function renderPanelPreview(){const host=$('panels-preview');host.replaceChildren();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');for(const rect of panelRects(panelTemplate)){const node=document.createElementNS(svg.namespaceURI,'rect');for(const [key,value]of Object.entries(rect))node.setAttribute(key,String(value));svg.append(node);}host.append(svg);}
$('open-panels').addEventListener('click',()=>{if(!Object.keys(project.assets).length)return;stop();panelScene=current();panelProject=project;panelAsset=selected()?.asset||Object.keys(project.assets)[0];const form=$('panels-form');form.replaceChildren();field(form,'asset',panelAsset,'select',value=>panelAsset=String(value),Object.keys(project.assets));field(form,'panelTemplate','panel-'+panelTemplate,'select',value=>{panelTemplate=String(value).slice(6) as PanelTemplate;renderPanelPreview();},panelTemplates.map(v=>'panel-'+v));renderPanelPreview();panelsDialog.showModal();});
$('panels-form').addEventListener('submit',e=>e.preventDefault());$('close-panels').addEventListener('click',()=>panelsDialog.close());
$('apply-panels').addEventListener('click',()=>{if(panelProject!==project||panelScene!==current()||!project.assets[panelAsset])return;const added=createPanels(panelAsset,panelTemplate);if(current().elements.length+added.length>100){showToast('elements: maximum 100','error');return;}current().elements.push(...added);try{parseProject(JSON.stringify(project));}catch(error){current().elements.splice(-added.length);showToast((error as Error).message,'error');return;}selectedGroupId='';selectedId=added[1].id;changed();panelsDialog.close();refresh();});
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
$('rename-element').addEventListener('click',()=>{const group=current().groups.find(g=>g.id===selectedGroupId);if(group){askRename(group.name,name=>{group.name=name;changed();refresh();});return;}const element=selected();if(!element)return;askRename(element.name||t(element.type),name=>{element.name=name;changed();refresh();$('rename-element').focus();});});
const deleteDialog=$('delete-dialog') as HTMLDialogElement;
let pendingDelete:(()=>void)|undefined;
function askDelete(name:string,kind:'scene'|'image'|'video'|'thumbnail'|'audio'|'group',action:()=>void){
 stop();draw();pendingDelete=action;
 $('delete-name').textContent=name;$('delete-description').textContent=t(kind==='group'?'deleteGroupHint':kind==='scene'?'deleteSceneHint':kind==='video'?'deleteVideoHint':kind==='audio'?'deleteAudioHint':kind==='thumbnail'?'deleteThumbnailHint':'deleteImageHint');
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
function replaceMediaButton(id:string,kind:'image'|'video'){
 const b=button('',()=>{const input=$('replace-'+kind+'-file') as HTMLInputElement;input.dataset.replaceAsset=id;input.click();});
 b.title=t('replaceMedia');b.setAttribute('aria-label',b.title);b.dataset.replaceMedia=id;
 b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/></svg>';return b;
}
let thumbnailImportAttempt=0;
function renderThumbnail(){
 const host=$('thumbnail-content');host.replaceChildren();const asset=project.thumbnail;
 if(!asset){const hint=document.createElement('p');hint.className='small-hint';hint.textContent=t('thumbnailEmpty');host.append(hint);return;}
 const preview=button('',()=>previewAsset(asset));preview.className='thumbnail-preview';preview.title=t('imagePreview')+': '+asset.name;preview.setAttribute('aria-label',preview.title);const image=document.createElement('img');image.src=asset.data;image.alt='';preview.append(image);
 const name=document.createElement('span');name.className='thumbnail-name';name.textContent=asset.name;name.title=asset.name;
 const actions=document.createElement('div');actions.className='thumbnail-actions';
 const save=button('',()=>downloadAsset(asset));save.id='save-thumbnail';save.title=t('saveThumbnail');save.setAttribute('aria-label',save.title);save.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/></svg>';
 const remove=button('',()=>{const target=project;askDelete(asset.name,'thumbnail',()=>{if(project!==target||project.thumbnail!==asset)return;thumbnailImportAttempt++;project.thumbnail=null;changed();renderThumbnail();$('import-thumbnail').focus();});});remove.id='delete-thumbnail';remove.title=t('remove')+': '+t('thumbnail');remove.setAttribute('aria-label',remove.title);remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
 actions.append(save,remove);host.append(preview,name,actions);
}
const audioURLs=new Map<string,string>();
function stopAudioPreviews(){document.querySelectorAll('audio').forEach(a=>a.pause());}
function audioURL(a:AudioAsset){let url=audioURLs.get(a.data);if(!url){url=URL.createObjectURL(audioBlob(a));audioURLs.set(a.data,url);}return url;}
function clearAudioURLs(){stopAudioPreviews();for(const url of audioURLs.values())URL.revokeObjectURL(url);audioURLs.clear();}
function audioIcon(b:HTMLButtonElement,path:string,title:string){b.title=title;b.setAttribute('aria-label',title);b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;}
function renderAudios(){const list=$('audio-list');list.querySelectorAll('audio').forEach(a=>a.pause());list.replaceChildren();for(const [id,asset] of Object.entries(project.audios)){
 const row=document.createElement('div');row.className='audio-row';const preview=document.createElement('audio');preview.controls=true;preview.preload='metadata';preview.src=audioURL(asset);preview.setAttribute('aria-label',asset.name);preview.addEventListener('play',()=>{if(playing){stop();void preview.play().catch(()=>{});}document.querySelectorAll('audio').forEach(a=>{if(a!==preview)a.pause();});});const name=document.createElement('span');name.textContent=asset.name;name.title=asset.name;const actions=document.createElement('div');actions.className='thumbnail-actions';
 const rename=button('',()=>askRename(asset.name,name=>{asset.name=name;changed();refresh();}));audioIcon(rename,'m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z',t('rename'));
 const replace=button('',()=>{const input=$('audio-file') as HTMLInputElement;input.dataset.replaceAsset=id;input.click();});replace.dataset.replaceAudio=id;audioIcon(replace,'M4 8h12m-4-4 4 4-4 4M20 16H8m4-4-4 4 4 4',t('replaceMedia'));
 const save=button('',()=>{const url=audioURL(asset),link=document.createElement('a'),mime=asset.data.slice(5,asset.data.indexOf(';')),extension=({'audio/mpeg':'mp3','audio/mp3':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/wave':'wav','audio/ogg':'ogg','audio/mp4':'m4a','audio/aac':'aac','audio/flac':'flac','audio/webm':'webm'} as Record<string,string>)[mime]??'audio';link.href=url;const name=asset.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').trim().replace(/[. ]+$/g,'').slice(0,160)||'audio';link.download=/\.(mp3|wav|ogg|m4a|aac|flac|webm|opus|aiff?|au|3gp)$/i.test(name)?name:name+'.'+extension;link.click();});save.dataset.saveAudio=id;audioIcon(save,'M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6',t('save'));
 const remove=button('',()=>{const target=project;askDelete(asset.name,'audio',()=>{if(project!==target)return;stop();delete project.audios[id];if(project.narration?.asset===id)project.narration=null;project.scenes.forEach(s=>{if(s.narration?.asset===id)s.narration=null;});clearAudioURLs();changed();refresh();});});remove.dataset.deleteAudio=id;audioIcon(remove,'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',t('remove'));actions.append(rename,replace,save,remove);row.append(preview,name,actions);list.append(row);
}}
let audioImportAttempt=0;
$('gallery-import-audio').onclick=()=>{delete ($('audio-file') as HTMLInputElement).dataset.replaceAsset;($('audio-file') as HTMLInputElement).click();};
($('audio-file') as HTMLInputElement).addEventListener('cancel',()=>delete ($('audio-file') as HTMLInputElement).dataset.replaceAsset);
($('audio-file') as HTMLInputElement).onchange=async()=>{const input=$('audio-file') as HTMLInputElement,file=input.files?.[0],id=input.dataset.replaceAsset;input.value='';delete input.dataset.replaceAsset;if(!file)return;const target=project,attempt=++audioImportAttempt;try{if(file.size>MAX_AUDIO_BYTES)throw new Error('Audio: maximum 32 MiB');if(!id&&Object.keys(project.audios).length>=30)throw new Error('audios: maximum 30');if(id&&!project.audios[id])return;
 const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Audio read failed'));const fallback=({'mp3':'audio/mpeg','wav':'audio/wav','ogg':'audio/ogg','m4a':'audio/mp4','aac':'audio/aac','flac':'audio/flac','webm':'audio/webm'} as Record<string,string>)[file.name.split('.').pop()!.toLowerCase()];reader.readAsDataURL(!file.type.startsWith('audio/')&&fallback?new Blob([file],{type:fallback}):file);});validateAudioData(data);const asset={name:file.name.slice(0,200),data,duration:0};asset.duration=(await decodeAudio(asset)).duration;if(project!==target||attempt!==audioImportAttempt)return;const key=id??crypto.randomUUID(),next=structuredClone(project);next.audios[key]={...asset,name:id?project.audios[id].name:asset.name};
 if(id){const clamp=(n:Narration|null)=>{if(n?.asset!==id)return n;const start=Math.min(n.start,Math.max(0,asset.duration-.001)),end=n.end===null?null:Math.min(n.end,asset.duration);return {...n,start,end:end!==null&&end<=start?null:end};};next.narration=clamp(next.narration);next.scenes.forEach(s=>s.narration=clamp(s.narration));}
 parseProject(JSON.stringify(next));stop();project.audios=next.audios;project.narration=next.narration;project.scenes.forEach((s,i)=>s.narration=next.scenes[i].narration);clearAudioURLs();changed();refresh();
 }catch(error){if(project===target&&attempt===audioImportAttempt)status(t('error')+' '+(error as Error).message);}};
const narrationDialog=$('narration-dialog') as HTMLDialogElement;let narrationTarget:Scene|'project'='project',narrationDraft=defaultNarration(),duckDraft=false,narrationProject:Project;
function openNarration(target:Scene|'project'){stop();narrationProject=project;narrationTarget=target;narrationDraft=structuredClone((target==='project'?project.narration:target.narration)??defaultNarration());duckDraft=project.audioDucking;$('narration-title').textContent=t(target==='project'?'projectNarration':'sceneNarration');renderNarration();narrationDialog.showModal();}
function renderNarration(){const form=$('narration-form');form.querySelectorAll('audio').forEach(a=>a.pause());form.replaceChildren();const fields=document.createElement('div');fields.className='text-settings-fields';form.append(fields);const d=narrationDraft,scope=narrationTarget==='project'?total():narrationTarget.duration;field(fields,'audioAsset',d.asset,'select',value=>{narrationDraft={...narrationDraft,asset:String(value),start:0,end:null};renderNarration();},['',...Object.keys(project.audios)]);
 if(d.asset){const duration=project.audios[d.asset].duration;for(const [key,label,max] of [['at','audioAt',scope],['start','audioStart',duration],['end','audioEnd',duration],['volume','audioVolume',1],['fadeIn','audioFadeIn',3600],['fadeOut','audioFadeOut',3600]] as const)field(fields,label,d[key]??duration,'number',value=>{(narrationDraft as unknown as Record<string,unknown>)[key]=key==='end'&&value===duration?null:value;const a=form.querySelector('audio');if(a){a.pause();a.currentTime=narrationDraft.start;a.volume=narrationDraft.volume;}},undefined,0,max);
 field(fields,'audioMuted',d.muted,'checkbox',value=>narrationDraft.muted=Boolean(value));field(fields,'narrationText',d.text,'textarea',value=>narrationDraft.text=String(value));const audio=document.createElement('audio');audio.id='narration-preview';audio.controls=true;audio.src=audioURL(project.audios[d.asset]);audio.volume=d.volume;audio.onloadedmetadata=()=>audio.currentTime=narrationDraft.start;audio.onplay=()=>{if(audio.currentTime<narrationDraft.start||audio.currentTime>=(narrationDraft.end??duration))audio.currentTime=narrationDraft.start;};audio.ontimeupdate=()=>{if(audio.currentTime>=(narrationDraft.end??duration))audio.pause();};form.append(audio);}
 if(narrationTarget==='project')field(fields,'audioDucking',duckDraft,'checkbox',value=>duckDraft=Boolean(value));
}
$('project-narration').onclick=()=>openNarration('project');$('close-narration').onclick=()=>narrationDialog.close();narrationDialog.addEventListener('close',()=>stopAudioPreviews());
$('narration-form').addEventListener('submit',event=>{event.preventDefault();try{if(project!==narrationProject)throw new Error('Project changed');const scope=narrationTarget==='project'?total():narrationTarget.duration,narration=narrationDraft.asset?parseNarration(narrationDraft,project.audios,scope):null;const candidate=structuredClone(project);if(narrationTarget==='project'){candidate.narration=narration;candidate.audioDucking=duckDraft;}else{const index=project.scenes.indexOf(narrationTarget);if(index<0)throw new Error('Scene removed');candidate.scenes[index].narration=narration;}parseProject(JSON.stringify(candidate));stop();if(narrationTarget==='project'){project.narration=narration;project.audioDucking=duckDraft;}else narrationTarget.narration=narration;changed();narrationDialog.close();draw();}catch(error){showToast((error as Error).message,'error');}});

function renderAssets(){renderVideos();const list=$('asset-list');list.replaceChildren();for(const [id,asset] of Object.entries(project.assets)){const row=document.createElement('div');row.className='asset-row';const img=document.createElement('img');img.src=asset.data;img.alt='';const preview=button('',()=>previewAsset(asset));preview.className='asset-thumbnail';preview.dataset.previewAsset=id;preview.title=`${t('imagePreview')}: ${asset.name}`;preview.setAttribute('aria-label',preview.title);preview.append(img);const name=document.createElement('span');name.textContent=asset.name;name.title=asset.name;const remove=button('',()=>{const target=project;askDelete(asset.name,'image',()=>{if(project!==target)return;delete project.assets[id];project.scenes.forEach(s=>{if(s.backgroundAsset===id)s.backgroundAsset='';s.elements.forEach(e=>{if(e.asset===id)e.asset='';});});changed();refresh();$('gallery-import-image').focus();});});remove.dataset.deleteAsset=id;remove.setAttribute('aria-label',`${t('remove')}: ${asset.name}`);remove.title=`${t('remove')}: ${asset.name}`;
const trash=document.createElementNS('http://www.w3.org/2000/svg','svg');trash.setAttribute('viewBox','0 0 24 24');trash.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7');trash.append(path);remove.append(trash);
const rename=button('',()=>askRename(asset.name,newName=>{asset.name=newName;changed();refresh();$('gallery-import-image').focus();}));rename.title=`${t('rename')}: ${asset.name}`;rename.setAttribute('aria-label',rename.title);rename.dataset.renameAsset=id;
const pencil=document.createElementNS('http://www.w3.org/2000/svg','svg');pencil.setAttribute('viewBox','0 0 24 24');pencil.setAttribute('aria-hidden','true');const pencilPath=document.createElementNS('http://www.w3.org/2000/svg','path');pencilPath.setAttribute('d','m15 4 5 5M4 20l5-1L21 7l-5-5L4 14ZM3 22h18');pencil.append(pencilPath);rename.append(pencil);
const save=button('',()=>downloadAsset(asset));save.title=`${t('saveImage')}: ${asset.name}`;save.setAttribute('aria-label',save.title);save.dataset.saveAsset=id;
const downloadIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');downloadIcon.setAttribute('viewBox','0 0 24 24');downloadIcon.setAttribute('aria-hidden','true');const downloadPath=document.createElementNS('http://www.w3.org/2000/svg','path');downloadPath.setAttribute('d','M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6');downloadIcon.append(downloadPath);save.append(downloadIcon);
const actions=document.createElement('div');actions.className='asset-actions';for(const [b,path] of [[rename,'m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z'],[save,'M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6'],[remove,'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7']] as const)b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;actions.append(rename,replaceMediaButton(id,'image'),save,remove);row.append(preview,name,actions);list.append(row);}}
function field(form:HTMLElement,key:string,value:string|number|boolean,kind:string,action:(value:string|number|boolean)=>void,options?:readonly string[],min?:number,max?:number){
 const label=document.createElement('label');label.append(document.createTextNode(t(key)));
 let input:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
 if(kind==='select'){input=document.createElement('select');options?.forEach(option=>{const o=document.createElement('option');o.value=option;o.textContent=key==='space'?t('space-'+option):key==='exitAnimation'?t('exit-'+option):key==='bubbleSpeaker'?(option?(current().elements.find(e=>e.id===option)?.name||option):t('none')):key==='bubbleAnchor'?option:key==='audioAsset'?(option?project.audios[option].name:t('none')):key==='asset'||key==='backgroundAsset'?(option?project.assets[option].name:t('none')):t(key==='pathTemplate'&&option==='wave'?'path-wave':key==='pathType'&&option==='ellipse'?'path-ellipse':key==='pathEasing'&&option==='linear'?'path-linear':key==='pathAfter'&&option==='reset'?'path-reset':key==='style'&&option==='focus'?'musicFocus':key==='gradientType'&&option==='solid'?'gradientSolid':key==='transition'&&option!=='none'&&option!=='fade'?'transition-'+option:option);input.append(o);});input.value=String(value);}
 else if(kind==='textarea'){input=document.createElement('textarea');input.value=String(value);input.maxLength=10000;}
 else{input=document.createElement('input');input.type=kind;if(kind==='checkbox')input.checked=Boolean(value);else input.value=String(value);if(kind==='number'){input.step='any';if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);}if(kind==='text')input.maxLength=200;if(['simulationCount','simulationSeed'].includes(key))input.step='1';}
 input.name=key;
 const eagerNumber=kind==='number'&&['x','y','width','height','rotation'].includes(key);
 input.addEventListener(kind==='textarea'||kind==='text'||kind==='color'||eagerNumber?'input':'change',event=>{
  if(!input.isConnected)return;
  if(input instanceof HTMLInputElement&&(!input.checkValidity()||kind==='number'&&!Number.isFinite(input.valueAsNumber))){if(event.type==='change')input.reportValidity();return;}
  const value=kind==='checkbox'?(input as HTMLInputElement).checked:kind==='number'?(input as HTMLInputElement).valueAsNumber:input.value;
  action(value);
 });
 if(kind==='number'){
  const number=input as HTMLInputElement;
  // Keep scrolling from accidentally changing a focused numeric field.
  number.addEventListener('wheel',()=>number.blur(),{passive:true});
  if(eagerNumber)number.addEventListener('change',()=>{if(number.isConnected&&number.checkValidity()&&Number.isFinite(number.valueAsNumber))action(number.valueAsNumber);});
  const wrapper=document.createElement('span');wrapper.className='number-stepper';
  const step=['audioVolume','opacity','stopOpacity','backgroundOpacity','simulationOpacity','volume','sustain','reverb','velocity','gain','echoMix','echoFeedback'].includes(key)?0.05:['cameraAt','cameraHold','audioAt','audioStart','audioEnd','audioFadeIn','audioFadeOut','pathPause','pathStart','pathDuration','duration','transitionDuration','animationDuration','exitDuration','until','bubbleLineHeight','bubbleCurve','at','simulationSpeed','attack','decay','release','fadeIn','fadeOut','echoDelay','ratio'].includes(key)?0.1:1;
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
 }else if(kind==='checkbox'&&['cameraEnabled','cameraOverview','cameraFrameOverview','bold','italic','underline','strikethrough','backgroundEnabled','musicEnabled','loop','muted','audioMuted','audioDucking','pathOrient','pathClockwise','elementEndEnabled','bubbleBaseAuto'].includes(key)){
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
  update(switchSimulationType(config,v as Simulation['type']));
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
let simulationDraft:Simulation|null|undefined;
function renderProjectSimulation(){
 const form=$('project-simulation-form');form.replaceChildren();
 simulationFields(form,simulationDraft??null,value=>{
  const previous=simulationDraft;
  try{
   parseProject(JSON.stringify({...project,backgroundSimulation:value}));
   simulationDraft=value;if(previous?.type!==value?.type)renderProjectSimulation();return true;
  }catch(error){showToast(t('error')+' '+(error as Error).message,'error');renderProjectSimulation();return false;}
 },true);
}
$('project-simulation').addEventListener('click',()=>{
 simulationDraft=structuredClone(project.backgroundSimulation);renderProjectSimulation();simulationDialog.showModal();
});
$('project-simulation-form').addEventListener('submit',event=>{
 event.preventDefault();if(simulationDraft===undefined||!($('project-simulation-form') as HTMLFormElement).reportValidity())return;
 try{
  parseProject(JSON.stringify({...project,backgroundSimulation:simulationDraft}));
  if(JSON.stringify(project.backgroundSimulation)!==JSON.stringify(simulationDraft)){project.backgroundSimulation=structuredClone(simulationDraft);stop();changed();draw();}
  simulationDialog.close();
 }catch(error){showToast(t('error')+' '+(error as Error).message,'error');}
});
$('close-simulation').addEventListener('click',()=>simulationDialog.close());
simulationDialog.addEventListener('close',()=>{simulationDraft=undefined;});
const musicDialog=$('music-dialog') as HTMLDialogElement;
let musicDraft:Music|undefined,instrumentIndex=0,notePage=0;
const narrationPlayer=new NarrationPlayer();
const musicPlayer=new MusicPlayer(),previewMusic=new MusicPlayer();
let previewListening=false,previewTimer:ReturnType<typeof setTimeout>|undefined;
function stopMusicPreview(){previewMusic.stop();previewListening=false;clearTimeout(previewTimer);const b=$('listen-music');b.title=t('listen');b.setAttribute('aria-label',b.title);b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8Z"/></svg>';}

function musicGroup(title:string){const section=document.createElement('section');section.className='music-group';const heading=document.createElement('h3');heading.textContent=t(title);section.append(heading);$('music-form').append(section);return section;}
function musicIcon(parent:HTMLElement,icon:'add'|'remove',action:()=>void){const b=button('',action);b.title=t(icon==='add'?'musicAdd':'remove');b.setAttribute('aria-label',b.title);b.innerHTML=icon==='add'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';parent.append(b);return b;}
function renderMusic(){
 if(!musicDraft)return;const m=musicDraft;stopMusicPreview();$('music-form').replaceChildren();
 const general=musicGroup('projectMusic');
 field(general,'musicEnabled',m.enabled,'checkbox',v=>m.enabled=Boolean(v));
 field(general,'mode',m.mode,'select',v=>{m.mode=v as Music['mode'];renderMusic();},['generated','score']);
 field(general,'style',m.style,'select',v=>m.style=v as Music['style'],musicStyles);
 for(const [key,min,max] of [['tempo',40,180],['key',48,72],['seed',0,4294967295],['volume',0,1],['fadeIn',0,10],['fadeOut',0,10]] as const)field(general,key,m[key],'number',v=>m[key]=Number(v),undefined,min,max);
 const instruments=musicGroup('instruments');const hint=document.createElement('p');hint.className='small-hint';hint.textContent=t('musicRoles');instruments.append(hint);
 field(instruments,'instruments',m.instruments[instrumentIndex].id,'select',v=>{instrumentIndex=m.instruments.findIndex(i=>i.id===v);renderMusic();},m.instruments.map(i=>i.id));
 let preset:typeof instrumentPresets[number]='pad';field(instruments,'musicAdd',preset,'select',v=>preset=v as typeof preset,instrumentPresets);
 musicIcon(instruments,'add',()=>{if(m.instruments.length>=8)return;let n=1;while(m.instruments.some(i=>i.id==='instrument-'+n))n++;m.instruments.push(presetInstrument(preset,'instrument-'+n));instrumentIndex=m.instruments.length-1;renderMusic();}).disabled=m.instruments.length>=8;
 const i=m.instruments[instrumentIndex];
 field(instruments,'id',i.id,'text',v=>{const old=i.id;i.id=String(v);m.notes.forEach(n=>{if(n.instrument===old)n.instrument=i.id;});});field(instruments,'name',i.name,'text',v=>i.name=String(v));
 musicIcon(instruments,'remove',()=>{if(m.notes.some(n=>n.instrument===i.id)){showToast(t('error')+': '+t('notes'),'warning');return;}m.instruments.splice(instrumentIndex,1);instrumentIndex=0;renderMusic();}).disabled=m.instruments.length===1;
 field(instruments,'wave',i.wave,'select',v=>i.wave=v as Instrument['wave'],waveforms);
 field(instruments,'filter',i.filter,'select',v=>i.filter=v as Instrument['filter'],['none','lowpass','highpass','bandpass']);
 for(const [key,min,max] of [['volume',0,1],['attack',0,2],['decay',0,3],['sustain',0,1],['release',0,5],['cutoff',40,20000],['resonance',.1,10],['reverb',0,.5]] as const)field(instruments,key,i[key],'number',v=>i[key]=Number(v),undefined,min,max);
 for(const [key,min,max] of [['delay',.05,1],['feedback',0,.6],['mix',0,.5]] as const)field(instruments,{'delay':'echoDelay','feedback':'echoFeedback','mix':'echoMix'}[key],i.echo[key],'number',v=>i.echo[key]=Number(v),undefined,min,max);
 const partials=musicGroup('partials');i.partials.forEach((p,index)=>{field(partials,'ratio',p.ratio,'number',v=>p.ratio=Number(v),undefined,.25,16);field(partials,'gain',p.gain,'number',v=>p.gain=Number(v),undefined,0,1);musicIcon(partials,'remove',()=>{i.partials.splice(index,1);renderMusic();}).disabled=i.partials.length===1;});musicIcon(partials,'add',()=>{i.partials.push({ratio:2,gain:.1});renderMusic();}).disabled=i.partials.length>=8;
 if(m.mode==='score'){
  const notes=musicGroup('notes'),list=document.createElement('div');list.className='music-wide';notes.append(list);notePage=Math.min(notePage,Math.max(0,Math.ceil(m.notes.length/40)-1));
  m.notes.slice(notePage*40,notePage*40+40).forEach(n=>{const row=document.createElement('div');row.className='music-note';list.append(row);field(row,'instruments',n.instrument,'select',v=>n.instrument=String(v),m.instruments.map(i=>i.id));for(const [key,min,max] of [['at',0,total()],['duration',.05,16],['pitch',21,108],['velocity',0,1]] as const)field(row,key,n[key],'number',v=>n[key]=Number(v),undefined,min,max);musicIcon(row,'remove',()=>{m.notes.splice(m.notes.indexOf(n),1);renderMusic();});});
  musicIcon(notes,'add',()=>{m.notes.push({instrument:i.id,at:0,duration:1,pitch:60,velocity:.7});notePage=Math.floor((m.notes.length-1)/40);renderMusic();}).disabled=m.notes.length>=10000;
  for(const direction of [-1,1]){const b=button(direction<0?'‹':'›',()=>{notePage+=direction;renderMusic();});b.title=t(direction<0?'musicPrevious':'musicNext');b.disabled=direction<0?notePage===0:(notePage+1)*40>=m.notes.length;notes.append(b);}
 }
}
$('project-music').addEventListener('click',()=>{stop();draw();musicDraft=structuredClone(project.music??{...defaultMusic(),enabled:false});instrumentIndex=0;notePage=0;renderMusic();musicDialog.showModal();});
$('music-form').addEventListener('submit',event=>{event.preventDefault();try{const music=parseMusic(musicDraft,total());parseProject(JSON.stringify({...project,music}));if(JSON.stringify(project.music)!==JSON.stringify(music)){project.music=music;stop();changed();draw();}musicDialog.close();}catch(error){showToast((error as Error).message,'error');}});
$('close-music').addEventListener('click',()=>musicDialog.close());
musicDialog.addEventListener('close',()=>{stopMusicPreview();musicDraft=undefined;});
$('listen-music').addEventListener('click',()=>{
 if(previewListening){stopMusicPreview();return;}
 try{const m=parseMusic(musicDraft,total())!;previewListening=true;const b=$('listen-music');b.title=t('pause');b.setAttribute('aria-label',b.title);b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7ZM14 5h3v14h-3Z"/></svg>';
 void previewMusic.start({...m,enabled:true},0,Math.min(8,total())).then(()=>{if(previewListening)previewTimer=setTimeout(stopMusicPreview,Math.min(8,total())*1000+100);}).catch(()=>{stopMusicPreview();showToast(t('audioError'),'warning');});
 }catch(error){stopMusicPreview();showToast((error as Error).message,'error');}
});

function updateScene(key:keyof Scene,value:unknown){const previous=current()[key];(current() as unknown as Record<string,unknown>)[key]=value;try{parseProject(JSON.stringify(project));stop();time=offset(sceneIndex);changed();draw();if((key==='background'||key==='backgroundGradient'||key==='backgroundEnabled')&&richEditor)richEditor.editor.style.background=current().backgroundEnabled?gradientCSS(current().backgroundGradient,current().background):'#000000';if(key==='name'||key==='duration')renderSceneLabels();}catch(error){(current() as unknown as Record<string,unknown>)[key]=previous;status(t('error')+' '+(error as Error).message);renderForms();}}
function renderSceneLabels(){const buttons=$('scene-list').querySelectorAll('button');project.scenes.forEach((s,i)=>{buttons[i].textContent=`${i+1}. ${s.name} · ${s.duration}s`;buttons[i].title=buttons[i].textContent||'';});}
let richEditor:ReturnType<typeof richTextEditor>|undefined;
function updateElement(key:keyof Element,value:unknown){
 if(richEditor&&['font','fontSize','color','bold','italic','underline','strikethrough'].includes(key)){richEditor.apply(key as TextStyleKey,value);return;}
 updateElementValue(key,value);
}
function updateElementValue(key:keyof Element,value:unknown){const e=selected();if(!e)return;const old=e[key];(e as unknown as Record<string,unknown>)[key]=value;try{parseProject(JSON.stringify(project));stop();time=offset(sceneIndex)+e.at+e.animationDuration;const end=e.until??current().duration;time=Math.min(time,offset(sceneIndex)+end-(e.until===null?.001:Math.min(.001,(end-e.at)/2)));changed();draw(false);if(e.type==='bubble'&&key==='fillColor'&&richEditor)richEditor.editor.style.background=e.fillColor==='none'?current().background:e.fillColor;const interval=$('element-interval');if(interval){const bar=interval.firstElementChild as HTMLElement;bar.style.left=e.at/current().duration*100+'%';bar.style.width=((e.until??current().duration)-e.at)/current().duration*100+'%';interval.title=t('elementInterval')+': '+e.at+'–'+(e.until??current().duration)+' s';}if(key==='text')renderElements();if(key==='shapeType')renderForms();}catch(error){(e as unknown as Record<string,unknown>)[key]=old;status(t('error')+' '+(error as Error).message);renderForms();}}
function videoFields(host:HTMLElement,c:VideoSettings,update:(v:VideoSettings)=>boolean){
 const group=document.createElement('fieldset');group.className='text-settings-group video-settings';const legend=document.createElement('legend');legend.textContent=t('video');group.append(legend);host.append(group);
 const assets=project.videos;
 const select=document.createElement('select');select.name='videoAsset';select.setAttribute('aria-label',t('video'));for(const id of ['',...Object.keys(assets)]){const o=document.createElement('option');o.value=id;o.textContent=id?assets[id].name:t('none');select.append(o);}select.value=c.asset;group.append(select);
 select.onchange=()=>{if(update({...c,asset:select.value,start:0,end:null})){renderForms();if(host.id==='project-video-form')renderProjectVideo();}};
 const a=assets[c.asset];if(!a)return;
 const preview=createVideo(a);preview.controls=true;preview.muted=c.muted;preview.volume=c.volume;preview.className='video-trim-preview';preview.onloadeddata=()=>{preview.currentTime=c.start;};group.append(preview);
 const controls=document.createElement('div');controls.className='video-controls';group.append(controls);
 for(const key of ['start','end'] as const){const label=document.createElement('label');label.textContent=t(key==='start'?'videoStart':'videoEnd');const row=document.createElement('div');row.className='video-time-picker';label.append(row);controls.append(label);
  const input=document.createElement('input');input.type='number';input.step='any';input.min='0';input.max=String(a.duration);input.value=String(c[key]??a.duration);input.name='video'+key;
  const commit=(n:number)=>{const next={...c,[key]:n};if(update(next)){Object.assign(c,next);preview.pause();preview.currentTime=Math.min(n,a.duration-.001);input.value=String(n);}else input.value=String(c[key]??a.duration);};
  for(const delta of [-60,-1,-.1,0,.1,1,60]){if(delta===0){row.append(input);continue;}const b=button(delta<0?'−':'+',()=>commit(Math.min(a.duration,Number(Math.max(0,Number(input.value)+delta).toFixed(3)))));b.title=`${delta>0?'+':''}${delta} ${t('seconds')}`;b.setAttribute('aria-label',b.title);const sub=document.createElement('small');sub.textContent=Math.abs(delta)===60?'1m':Math.abs(delta)===1?'1s':'0.1s';b.append(sub);row.append(b);}
  input.onchange=()=>commit(input.valueAsNumber);const use=button(t('videoUsePosition'),()=>commit(Number(preview.currentTime.toFixed(3))));label.append(use);
 }
 for(const key of ['loop','muted'] as const)field(controls,key,c[key],'checkbox',v=>{if(update({...c,[key]:Boolean(v)})){c[key]=Boolean(v);preview.muted=c.muted;}});
 field(controls,'volume',c.volume,'number',v=>{if(update({...c,volume:Number(v)})){c.volume=Number(v);preview.volume=c.volume;}},undefined,0,1);
 field(controls,'fit',c.fit,'select',v=>{if(update({...c,fit:v as VideoSettings['fit']}))c.fit=v as VideoSettings['fit'];},['contain','cover']);
 preview.ontimeupdate=()=>{const end=c.end??a.duration;if(!preview.paused&&preview.currentTime>=end-.01){if(c.loop)preview.currentTime=c.start;else{preview.pause();preview.currentTime=Math.max(c.start,end-.001);}}if(!preview.paused&&preview.currentTime<c.start)preview.currentTime=c.start;};
 preview.onplay=()=>{if(preview.currentTime>= (c.end??a.duration)-.02||preview.currentTime<c.start)preview.currentTime=c.start;};
}
const projectVideoDialog=$('project-video-dialog') as HTMLDialogElement;let videoDraft:VideoSettings|null=null;
function renderProjectVideo(){const form=$('project-video-form');form.querySelectorAll('video').forEach(v=>v.pause());form.replaceChildren();videoFields(form,videoDraft??defaultVideo(),next=>{try{videoDraft=parseVideo(next,project.videos);return true;}catch(e){showToast((e as Error).message,'error');return false;}});}
$('project-video').onclick=()=>{stop();videoDraft=structuredClone(project.backgroundVideo);renderProjectVideo();projectVideoDialog.showModal();};
$('project-video-form').onsubmit=event=>{event.preventDefault();project.backgroundVideo=videoDraft?.asset?structuredClone(videoDraft):null;changed();draw();projectVideoDialog.close();};
$('close-project-video').onclick=()=>projectVideoDialog.close();projectVideoDialog.onclose=()=>{projectVideoDialog.querySelectorAll('video').forEach(v=>v.pause());};
const videoDialog=$('video-preview-dialog') as HTMLDialogElement;
$('close-video-preview').onclick=()=>videoDialog.close();videoDialog.onclose=()=>{videoDialog.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});};
function renderVideos(){const list=$('video-list');list.replaceChildren();
 for(const [id,a] of Object.entries(project.videos)){const row=document.createElement('div');row.className='asset-row';const thumbnail=createVideo(a);thumbnail.preload='metadata';thumbnail.onloadedmetadata=()=>{thumbnail.currentTime=.01;};
 const preview=button('',()=>{stop();$('video-preview-title').textContent=a.name;const v=createVideo(a);v.controls=true;$('video-preview-host').replaceChildren(v);videoDialog.showModal();});preview.className='asset-thumbnail';preview.title=a.name;preview.setAttribute('aria-label',a.name);preview.append(thumbnail);
 const name=document.createElement('span');name.textContent=a.name;name.title=a.name;const actions=document.createElement('div');actions.className='asset-actions';
 const rename=button('✎',()=>askRename(a.name,name=>{a.name=name;changed();refresh();}));rename.title=t('rename');rename.setAttribute('aria-label',rename.title);
 const save=button('↓',()=>{const link=document.createElement('a');link.href=videoURL(a);const mime=a.data.slice(5,a.data.indexOf(';')),ext=({'video/mp4':'mp4','video/webm':'webm','video/ogg':'ogv'} as Record<string,string>)[mime]||'video';const name=a.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'-')||'video';link.download=name.replace(/\.(mp4|webm|ogv|ogg|mov|mkv|avi|video)$/i,'')+'.'+ext;link.click();});save.title=t('save');save.setAttribute('aria-label',save.title);
 const remove=button('🗑',()=>askDelete(a.name,'video',()=>{stop();releaseVideoURL(a);delete project.videos[id];if(project.backgroundVideo?.asset===id)project.backgroundVideo=null;project.scenes.forEach(s=>s.elements.forEach(e=>{if(e.video?.asset===id)e.video=defaultVideo();}));changed();refresh();}));remove.title=t('remove');remove.setAttribute('aria-label',remove.title);for(const [b,path] of [[rename,'m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z'],[save,'M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6'],[remove,'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7']] as const)b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;actions.append(rename,replaceMediaButton(id,'video'),save,remove);row.append(preview,name,actions);list.append(row);
 }$('video-size').textContent=`${t('videoJsonSize')}: ${(new Blob([JSON.stringify(project)]).size/1024/1024).toFixed(1)} MiB / 160 MiB`;
}
$('gallery-import-video').onclick=()=>($('video-file') as HTMLInputElement).click();
$('import-video').onclick=()=>($('video-file') as HTMLInputElement).click();
async function importVideoFile(input:HTMLInputElement){const file=input.files?.[0],replaceId=input.dataset.replaceAsset;delete input.dataset.replaceAsset;input.value='';if(!file)return;const target=project,previous=replaceId?project.videos[replaceId]:undefined;if(replaceId&&!previous)return;try{
 if(!replaceId&&Object.keys(project.videos).length>=30||file.size>MAX_VIDEO_BYTES)throw new Error('Video: maximum 30 videos / 32 MiB each');
 const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Video read failed'));r.readAsDataURL(file);});
 const normalized=data.replace(/^data:[^;]*;/,'data:'+(file.type.startsWith('video/')?file.type:/\.mp4$/i.test(file.name)?'video/mp4':'video/webm')+';');validateVideoData(normalized);const duration=await inspectVideo(normalized);if(project!==target)return;
 if(replaceId&&project.videos[replaceId]!==previous)return;
 const id=replaceId??crypto.randomUUID(),next={name:previous?.name??file.name.slice(0,200),data:normalized,duration};
 try{parseProject(JSON.stringify({...project,videos:{...project.videos,[id]:next}}));}catch(error){if(replaceId)throw new Error(t('replaceRangeError')+' '+(error as Error).message);throw error;}
 stop();if(previous&&!Object.entries(project.videos).some(([other,a])=>other!==id&&a.data===previous.data))releaseVideoURL(previous);
 project.videos[id]=next;if(project.backgroundVideo?.asset===id){backgroundVideoNode?.pause();backgroundVideoNode=undefined;backgroundVideoAsset='';}
 const e=selected();if(!replaceId&&e?.type==='video')e.video={...defaultVideo(),asset:id};changed();refresh();
 }catch(e){showToast((e as Error).message,'error');}}
for(const id of ['video-file','replace-video-file']){const input=$(id) as HTMLInputElement;input.onchange=()=>void importVideoFile(input);input.addEventListener('cancel',()=>delete input.dataset.replaceAsset);}

function renderForms(){
 richEditor?.dispose();richEditor=undefined;
 const form=$('scene-form');form.replaceChildren();const s=current();
 field(form,'name',s.name,'text',v=>updateScene('name',v));field(form,'duration',s.duration,'number',v=>updateScene('duration',v),undefined,0.1,3600);
 field(form,'backgroundEnabled',s.backgroundEnabled,'checkbox',v=>updateScene('backgroundEnabled',v));
 field(form,'backgroundOpacity',s.backgroundOpacity,'number',v=>updateScene('backgroundOpacity',v),undefined,0,1);
 field(form,'background',s.background,'color',v=>updateScene('background',v));gradientFields(form,'backgroundGradient',s.backgroundGradient,s.background,v=>updateScene('backgroundGradient',v));field(form,'backgroundAsset',s.backgroundAsset,'select',v=>updateScene('backgroundAsset',v),['',...Object.keys(project.assets)]);
 field(form,'transition',s.transition,'select',v=>updateScene('transition',v),sceneTransitions);field(form,'transitionDuration',s.transitionDuration,'number',v=>updateScene('transitionDuration',v),undefined,0.01,3600);
 if(s.camera)field(form,'cameraOverview',cameraOverview,'checkbox',v=>{cameraOverview=Boolean(v);draw(false);});
 const cameraButton=button(t('sceneCamera'),()=>openCamera());cameraButton.id='scene-camera';cameraButton.className='path-edit-button';form.append(cameraButton);
 const narrationButton=button(t('sceneNarration'),()=>openNarration(current()));narrationButton.id='scene-narration';narrationButton.className='path-edit-button';form.append(narrationButton);
 const ef=$('element-form');ef.querySelectorAll('video').forEach(v=>v.pause());ef.replaceChildren();ef.classList.remove('text-settings');const e=selected();const selectedGroup=s.groups.find(g=>g.id===selectedGroupId);$('element-heading').textContent=t(selectedGroup?'groupSettings':'elementSettings');if(selectedGroup){renderGroupForm(ef,selectedGroup);return;}if(!e){const p=document.createElement('p');p.className='small-hint';p.textContent=t('empty');ef.append(p);return;}
 field(ef,'space',e.space,'select',v=>{updateElement('space',v);renderElements();},['scene','screen']);
 if((e.type==='text'||e.type==='bubble')){
 richEditor=richTextEditor(e,()=>{changed();stop();draw(false);renderElements();},(key,value)=>updateElementValue(key,value),{selection:t('richSelectionHint'),block:t('richBlockHint')});
 richEditor.editor.setAttribute('aria-label',t('text'));
 richEditor.editor.style.background=e.type==='bubble'?(e.fillColor==='none'?s.background:e.fillColor):s.backgroundEnabled?gradientCSS(s.backgroundGradient,s.background):'#000000';
 const contentLabel=document.createElement('label');contentLabel.append(document.createTextNode(t('text')),richEditor.editor,richEditor.hint);contentLabel.dataset.richText='true';ef.append(contentLabel);field(ef,'font',e.font,'select',v=>updateElement('font',v),fonts);field(ef,'fontSize',e.fontSize,'number',v=>updateElement('fontSize',v),undefined,1,500);field(ef,'align',e.align,'select',v=>updateElement('align',v),['left','center','right']);for(const key of ['bold','italic','underline','strikethrough'] as const)field(ef,key,e[key],'checkbox',v=>updateElement(key,v));}
 if(e.type==='image'){const actions=document.createElement('div');actions.className='compact-actions';const crop=button(t('editCrop'),()=>openCrop(e));crop.disabled=!e.asset;const reset=button(t('resetCrop'),()=>{updateElement('crop',null);renderForms();});reset.disabled=!e.crop;actions.append(crop,reset);ef.append(actions);field(ef,'asset',e.asset,'select',v=>updateElement('asset',v),['',...Object.keys(project.assets)]);field(ef,'fit',e.fit,'select',v=>updateElement('fit',v),['contain','cover']);}
 if((e.type==='text'||e.type==='bubble'))field(ef,'color',e.color,'color',v=>updateElement('color',v));
 if(e.type==='shape'){field(ef,'shapeType',e.shapeType,'select',v=>updateElement('shapeType',v),shapeTypes);shapeColorField(ef,'fillColor',e.fillColor);shapeColorField(ef,'borderColor',e.borderColor);field(ef,'borderStyle',e.borderStyle,'select',v=>updateElement('borderStyle',v),['solid','dashed','dotted','double']);field(ef,'borderWidth',e.borderWidth,'number',v=>updateElement('borderWidth',v),undefined,0,500);}
 if(e.type==='simulation')simulationFields(ef,e.simulation,value=>{
  if(!value)return false;const previous=e.simulation;updateElement('simulation',value);if(previous?.type!==value.type){renderForms();renderElements();}return e.simulation===value;
 });
 if(e.type==='shape')gradientFields(ef,'fillGradient',e.fillGradient,e.fillColor,v=>updateElement('fillGradient',v));
 for(const [key,min,max] of [['x',-100,100],['y',-100,100],['width',0.1,200],['height',0.1,200],['opacity',0,1],['rotation',-360,360],['radius',0,1000]] as const)field(ef,key,e[key],'number',v=>updateElement(key,v),undefined,min,max);
 field(ef,'animation',e.animation,'select',v=>updateElement('animation',v),animations);field(ef,'at',e.at,'number',v=>updateElement('at',v),undefined,0,s.duration);field(ef,'animationDuration',e.animationDuration,'number',v=>updateElement('animationDuration',v),undefined,0.01,3600);
 field(ef,'elementEndEnabled',e.until!==null,'checkbox',v=>{updateElement('until',v?s.duration:null);renderForms();});
 field(ef,'until',e.until??s.duration,'number',v=>updateElement('until',v),undefined,0,s.duration);
 const endInput=ef.querySelector<HTMLInputElement>('[name=until]')!;endInput.disabled=e.until===null;endInput.closest('label')?.querySelectorAll('button').forEach(b=>b.disabled=e.until===null);
 field(ef,'exitAnimation',e.exitAnimation,'select',v=>updateElement('exitAnimation',v),exitAnimations);
 field(ef,'exitDuration',e.exitDuration,'number',v=>updateElement('exitDuration',v),undefined,.01,3600);
 if(e.type==='bubble'||e.type==='shape'&&e.shapeType!=='rectangle'){const radius=ef.querySelector<HTMLInputElement>('[name=radius]')!;radius.disabled=true;radius.closest('label')?.querySelectorAll('button').forEach(b=>b.disabled=true);}
 ef.classList.add('text-settings');
 const groups:readonly (readonly [string,readonly string[]])[]=(e.type==='text'||e.type==='bubble')?[
   ['textContentGroup',['text']],
   ['textStyleGroup',['font','fontSize','align','bold','italic','underline','strikethrough','color','opacity','radius']],
   ['elementLayoutGroup',['space','x','y','width','height','rotation']],
   ['elementMotionGroup',['animation','at','animationDuration','elementEndEnabled','until','exitAnimation','exitDuration']]
  ]:[
   [e.type==='simulation'?'simulationStyleGroup':e.type==='image'?'imageStyleGroup':e.type==='video'?'videoStyleGroup':'shapeStyleGroup',e.type==='simulation'?['simulation','opacity','radius']:e.type==='image'?['asset','fit','opacity','radius']:['shapeType','fillColor','borderColor','fillGradient','opacity','borderWidth','borderStyle','radius']],
   ['elementLayoutGroup',['space','x','y','width','height','rotation']],
   ['elementMotionGroup',['animation','at','animationDuration','elementEndEnabled','until','exitAnimation','exitDuration']]
  ];
  for(const [title,keys] of groups){
   const group=document.createElement('fieldset');group.className='text-settings-group '+title;
   const legend=document.createElement('legend');legend.textContent=t(title);group.append(legend);
   const fields=document.createElement('div');fields.className='text-settings-fields';group.append(fields);
   for(const key of keys){const label=key==='simulation'?ef.querySelector('[data-simulation-settings]'):key==='fillGradient'?ef.querySelector('[data-gradient=fillGradient]'):key==='text'?ef.querySelector('label[data-rich-text]'):ef.querySelector(`[name="${key}"]`)?.closest('label');if(label)fields.append(label);}
   ef.append(group);
  }
 const interval=document.createElement('div');interval.className='element-interval';interval.id='element-interval';interval.setAttribute('aria-label',t('elementInterval'));
 const bar=document.createElement('span');bar.style.left=(e.at/s.duration*100)+'%';bar.style.width=((e.until??s.duration)-e.at)/s.duration*100+'%';interval.append(bar);interval.title=t('elementInterval')+': '+e.at+'–'+(e.until??s.duration)+' s';ef.querySelector('.elementMotionGroup')?.append(interval);
 if(e.type==='bubble')bubbleFields(ef,e);
 anchorFields(ef,e);
 if(e.placement){const reset=button(t('placementReset'),()=>{e.placement=null;changed();refresh();});reset.className='path-edit-button';ef.append(reset);}
 motionPathFields(ef,e);
 if(e.type==='video')videoFields(ef,e.video??defaultVideo(),next=>{try{parseVideo(next,project.videos);updateElementValue('video',next);return e.video===next;}catch(error){showToast((error as Error).message,'error');return false;}});
}
function comicGroup(host:HTMLElement,title:string){
 const group=document.createElement('fieldset');group.className='text-settings-group comic-settings';
 const legend=document.createElement('legend');legend.textContent=t(title);group.append(legend);
 const fields=document.createElement('div');fields.className='text-settings-fields';group.append(fields);host.append(group);return {group,fields};
}
function comicAction(host:HTMLElement,label:string,path:string,action:()=>void){
 const b=button('',action);b.title=t(label);b.setAttribute('aria-label',b.title);b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;host.append(b);return b;
}
function comicPoint(host:HTMLElement,title:string,p:{x:number;y:number},update:(p:{x:number;y:number})=>void,min:number,max:number){
 const tile=document.createElement('div');tile.className='path-point-tile';const heading=document.createElement('strong');heading.textContent=title;tile.append(heading);host.append(tile);
 const fields=document.createElement('div');fields.className='path-point-coordinates';tile.append(fields);
 for(const axis of ['x','y'] as const)field(fields,'path-'+axis,p[axis],'number',()=>update({x:Number((fields.querySelector('[name=path-x]') as HTMLInputElement).value),y:Number((fields.querySelector('[name=path-y]') as HTMLInputElement).value)}),undefined,min,max);
 return tile;
}
function bubbleFields(host:HTMLElement,e:Element){
 const {group,fields}=comicGroup(host,'bubbleStyle');
 const commit=(key:keyof Bubble,value:unknown)=>updateElementValue('bubble',{...e.bubble,[key]:value});
 const tail=(key:keyof Bubble['tail'],value:unknown)=>commit('tail',{...e.bubble!.tail,[key]:value});
 field(fields,'bubbleKind',e.bubble!.kind,'select',v=>{commit('kind',v);renderForms();},['speech','thought']);
 shapeColorField(fields,'fillColor',e.fillColor);shapeColorField(fields,'borderColor',e.borderColor);
 for(const [key,label,min,max] of [['padding','bubblePadding',0,500],['lineHeight','bubbleLineHeight',.5,4]] as const)field(fields,label,e.bubble![key],'number',v=>commit(key,v),undefined,min,max);
 field(fields,'borderWidth',e.borderWidth,'number',v=>updateElementValue('borderWidth',v),undefined,0,500);
 field(fields,'bubbleTailMode',e.bubble!.tail.mode,'select',v=>{
  if(v==='anchor'){
   const speaker=current().elements.find(v=>Object.keys(v.anchors).length);
   if(!speaker){showToast(t('anchorHint'),'warning');renderForms();return;}
   commit('tail',{...e.bubble!.tail,mode:'anchor',element:speaker.id,anchor:Object.keys(speaker.anchors)[0]});
  }else{
   if(e.bubble!.tail.mode==='anchor'){const target=bubbleTarget(e,current(),time-offset(sceneIndex),formats[project.format][0],formats[project.format][1]);const [w,h]=formats[project.format];commit('tail',{...e.bubble!.tail,mode:v,element:'',anchor:'',target:{x:Math.max(-1000,Math.min(1000,target.x/(e.width*w/10000))),y:Math.max(-1000,Math.min(1000,target.y/(e.height*h/10000)))}});}
   else tail('mode',v);
  }renderForms();
 },['none','manual','anchor']);
 const b=e.bubble!;
 if(b.tail.mode==='anchor'){
  const speakers=current().elements.filter(v=>Object.keys(v.anchors).length);
  field(fields,'bubbleSpeaker',b.tail.element,'select',v=>{const speaker=current().elements.find(e=>e.id===v)!;commit('tail',{...e.bubble!.tail,element:speaker.id,anchor:Object.keys(speaker.anchors)[0]});renderForms();},speakers.map(e=>e.id));
  field(fields,'bubbleAnchor',b.tail.anchor,'select',v=>tail('anchor',v),Object.keys(current().elements.find(v=>v.id===b.tail.element)!.anchors));
 }else if(b.tail.mode==='manual')comicPoint(fields,t('bubbleTarget'),b.tail.target,p=>tail('target',p),-1000,1000);
 if(b.tail.mode!=='none'){
  field(fields,'bubbleTailWidth',b.tail.width,'number',v=>tail('width',v),undefined,1,500);
  if(b.kind==='speech'){
   field(fields,'bubbleBaseAuto',b.tail.base===null,'checkbox',v=>{tail('base',v?null:90);renderForms();});
   if(b.tail.base!==null)field(fields,'bubbleBase',b.tail.base,'number',v=>tail('base',v),undefined,-360,360);
   field(fields,'bubbleCurve',b.tail.curve,'number',v=>tail('curve',v),undefined,-1,1);
  }
  const edit=button(t('bubbleEdit'),()=>{stop();comicEditing='tail';motionEditing=false;if(current().camera){cameraOverview=true;renderForms();}$('open-preview').click();draw(false);});edit.className='path-edit-button';group.append(edit);
 }
 const hint=document.createElement('p');hint.className='small-hint';hint.textContent=t('bubbleHint');group.append(hint);
 const warning=document.createElement('p');warning.id='bubble-overflow';warning.className='bubble-overflow';warning.setAttribute('role','status');warning.textContent=t('bubbleOverflow');warning.hidden=true;group.append(warning);
}
function anchorFields(host:HTMLElement,e:Element){
 const {group,fields}=comicGroup(host,'anchors');
 for(const [name,p] of Object.entries(e.anchors)){
  const tile=comicPoint(fields,name,p,p=>updateElementValue('anchors',{...e.anchors,[name]:p}),0,100);
  const actions=document.createElement('div');actions.className='comic-actions';tile.append(actions);
  comicAction(actions,'rename','m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z',()=>askRename(name,next=>{
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(next)||next!==name&&Object.hasOwn(e.anchors,next)){showToast(t('anchorInvalid'),'warning');return;}
   if(next!==name){renameAnchor(current(),e.id,name,next);changed();refresh();}
  }));
  comicAction(actions,'remove','M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',()=>{
   detachAnchor(current(),e.id,name,time-offset(sceneIndex),formats[project.format][0],formats[project.format][1]);
   delete e.anchors[name];changed();refresh();
  });
 }
 const actions=document.createElement('div');actions.className='comic-actions';group.append(actions);
 comicAction(actions,'anchorAdd','M12 5v14M5 12h14',()=>{
  let name='mouth',n=2;while(Object.hasOwn(e.anchors,name))name='anchor-'+n++;
  updateElementValue('anchors',{...e.anchors,[name]:{x:50,y:50}});renderForms();
 }).disabled=Object.keys(e.anchors).length>=16;
 if(Object.keys(e.anchors).length){const edit=button(t('anchorEdit'),()=>{stop();comicEditing='anchors';motionEditing=false;if(current().camera){cameraOverview=true;renderForms();}$('open-preview').click();draw(false);});edit.className='path-edit-button';actions.append(edit);}
 const hint=document.createElement('p');hint.className='small-hint';hint.textContent=t('anchorHint');group.append(hint);
}
function renderComicHandles(e:Element,local:number){
 const [w,h]=formats[project.format],matrix=sceneElementMatrix(e,current(),local,w,h);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('comic-edit-overlay');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('aria-hidden','true');
 const points=comicEditing==='tail'&&e.bubble?[['tail',bubbleTarget(e,cameraOverview?{...current(),camera:null}:current(),local,w,h)] as const]:Object.entries(e.anchors).map(([name,p])=>[name,{x:p.x*e.width*w/10000,y:p.y*e.height*h/10000}] as const);
 for(const [name,localPoint] of points){
  const world=applyMatrix(matrix,localPoint),circle=document.createElementNS(ns,'circle');circle.dataset.comicHandle=name;circle.setAttribute('cx',String(world.x));circle.setAttribute('cy',String(world.y));circle.setAttribute('r',String(12*w/Math.max(1,stage.getBoundingClientRect().width)));svg.append(circle);
  circle.onpointerdown=event=>{
   if(event.button!==0)return;event.preventDefault();event.stopPropagation();
   const rect=stage.getBoundingClientRect(),id=event.pointerId,tailMode=comicEditing==='tail';
   const move=(ev:PointerEvent)=>{
    if(ev.pointerId!==id||selected()!==e||!comicEditing)return;ev.preventDefault();
    const p=inversePoint(matrix,{x:(ev.clientX-rect.left)/rect.width*w,y:(ev.clientY-rect.top)/rect.height*h}),max=tailMode?1000:100,min=tailMode?-1000:0;
    const point={x:Math.max(min,Math.min(max,p.x/(e.width*w/10000))),y:Math.max(min,Math.min(max,p.y/(e.height*h/10000)))};
    if(tailMode)e.bubble!.tail={...e.bubble!.tail,mode:'manual',element:'',anchor:'',target:point};
    else e.anchors[name]=point;
    changed();draw(false);
   };
   const end=(ev:PointerEvent)=>{if(ev.pointerId!==id)return;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);if(selected()===e)renderForms();};
   window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  };
 }
 stage.append(svg);
}

let copiedMotionPath:MotionPath|null=null;
function motionPathFields(host:HTMLElement,e:Element,apply:(value:MotionPath|null)=>void=value=>updateElement('motionPath',value)){
 const originalApply=apply;apply=value=>{originalApply(value);e.motionPath=selectedGroupId?current().groups.find(g=>g.id===selectedGroupId)?.motionPath??null:selected()?.motionPath??null;};
 const group=document.createElement('fieldset');group.className='text-settings-group path-settings';const legend=document.createElement('legend');legend.textContent=t('motionPath');group.append(legend);const fields=document.createElement('div');fields.className='text-settings-fields';group.append(fields);host.append(group);
 field(fields,'pathType',e.motionPath?.type||'none','select',value=>{apply(value==='none'?null:defaultMotionPath(value as MotionPath['type']));renderForms();},['none',...pathTypes]);
 const m=e.motionPath;if(!m){const paste=button(t('path-paste'),()=>{if(copiedMotionPath){apply(structuredClone(copiedMotionPath));renderForms();}});paste.disabled=!copiedMotionPath;paste.className='path-edit-button';group.append(paste);return;}
 const update=(key:keyof MotionPath,value:unknown)=>apply({...e.motionPath!,[key]:value});
 for(const [key,min,max] of (m.type==='segments'?[['start',0,current().duration]]:[['start',0,current().duration],['duration',.01,3600]]) as [string,number,number][])field(fields,key==='start'?'pathStart':'pathDuration',m[key as 'start'|'duration'],'number',value=>update(key as 'start'|'duration',value),undefined,min,max);
 if(m.type!=='segments')field(fields,'pathEasing',m.easing,'select',value=>update('easing',value),['linear','ease-in-out']);field(fields,'pathRepeat',m.repeat,'select',value=>update('repeat',value),['once','loop','ping-pong']);
 field(fields,'pathAfter',m.after,'select',value=>update('after',value),['hold','reset']);field(fields,'pathOrient',m.orient,'checkbox',value=>update('orient',value));
 const pointTile=(container:HTMLElement,title:string,p:Point,change:(p:Point)=>void)=>{const tile=document.createElement('div');tile.className='path-point-tile';tile.setAttribute('role','group');tile.setAttribute('aria-label',title);const heading=document.createElement('strong');heading.textContent=title;tile.append(heading);const coords=document.createElement('div');coords.className='path-point-coordinates';tile.append(coords);container.append(tile);for(const axis of ['x','y'] as const)field(coords,'path-'+axis,p[axis],'number',()=>change({x:Number((coords.querySelector('[name=path-x]') as HTMLInputElement).value),y:Number((coords.querySelector('[name=path-y]') as HTMLInputElement).value)}),undefined,-200,200);return tile;};
 const points=m.type==='ellipse'?['center'] as const:m.type==='bezier'?['from','control1','control2','to'] as const:m.type==='segments'?['from'] as const:['from','to'] as const;
 for(const point of points)pointTile(fields,t('path-point-'+point),m[point],p=>update(point,p));
 if(m.type==='segments'){
  const list=document.createElement('div');list.className='path-segment-list';group.append(list);
  const changeSegment=(index:number,key:string,value:unknown)=>{const next=structuredClone(e.motionPath!);(next.segments[index] as unknown as Record<string,unknown>)[key]=value;apply(next);};
  m.segments.forEach((segment,index)=>{const tile=document.createElement('div');tile.className='path-segment-tile';tile.dataset.pathSegment=String(index);const heading=document.createElement('strong');heading.textContent=t('path-segment')+' '+(index+1);tile.append(heading);const settings=document.createElement('div');settings.className='path-point-coordinates';tile.append(settings);list.append(tile);
   field(settings,'pathSegmentType',segment.type,'select',value=>{changeSegment(index,'type',value);renderForms();},['line','bezier']);
   field(settings,'pathDuration',segment.duration,'number',value=>changeSegment(index,'duration',value),undefined,.01,3600);field(settings,'pathPause',segment.pause,'number',value=>changeSegment(index,'pause',value),undefined,0,3600);field(settings,'pathEasing',segment.easing,'select',value=>changeSegment(index,'easing',value),['linear','ease-in-out']);
   pointTile(tile,t('path-point-to'),segment.to,p=>changeSegment(index,'to',p));if(segment.type==='bezier')for(const key of ['control1','control2'] as const)pointTile(tile,t('path-point-'+key),segment[key],p=>changeSegment(index,key,p));
   const actions=document.createElement('div');actions.className='path-actions';tile.append(actions);
   for(const [delta,symbol,title] of [[-1,'↑','path-up'],[1,'↓','path-down'],[0,'×','path-remove']] as const){const b=button(symbol,()=>{const next=structuredClone(e.motionPath!);if(delta){[next.segments[index],next.segments[index+delta]]=[next.segments[index+delta],next.segments[index]];}else next.segments.splice(index,1);apply(next);renderForms();});b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${delta===0?'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7':delta<0?'M12 20V4m-6 6 6-6 6 6':'M12 4v16m-6-6 6 6 6-6'}"/></svg>`;b.title=t(title);b.setAttribute('aria-label',t(title));b.disabled=delta===0?m.segments.length===1:index+delta<0||index+delta>=m.segments.length;actions.append(b);}
  });
  const add=button('+',()=>{const next=structuredClone(e.motionPath!);next.segments.push(defaultSegment(next.segments.at(-1)!.to));apply(next);renderForms();});add.title=t('path-add');add.setAttribute('aria-label',add.title);add.disabled=m.segments.length>=32;add.className='path-edit-button';group.append(add);
 }
 const actions=document.createElement('div');actions.className='path-actions';group.append(actions);
 const copy=button(t('path-copy'),()=>{copiedMotionPath=structuredClone(e.motionPath!);renderForms();});const paste=button(t('path-paste'),()=>{if(copiedMotionPath){apply(structuredClone(copiedMotionPath));renderForms();}});paste.disabled=!copiedMotionPath;actions.append(copy,paste);
 if(m.type!=='segments'&&m.type!=='ellipse'){const convert=button(t('path-convert'),()=>{apply({...e.motionPath!,type:'segments',segments:[{...defaultSegment(),type:m.type as 'line'|'bezier',to:m.to,control1:m.control1,control2:m.control2,duration:m.duration,easing:m.easing}]});renderForms();});actions.append(convert);}
 field(actions,'pathTemplate','none','select',value=>{if(value!=='none'){const next=pathTemplate(value as 'wave'|'zigzag'|'spiral'|'flight');const duration=Math.max(.01,(current().duration-m.start)/next.segments.length);next.segments.forEach(segment=>segment.duration=duration);apply({...next,start:m.start,repeat:m.repeat,after:m.after,orient:m.orient});renderForms();}},['none','wave','zigzag','spiral','flight']);
 if(m.type==='ellipse'){for(const key of ['radiusX','radiusY','startAngle'] as const)field(fields,'path-'+key,m[key as 'start'|'duration'],'number',value=>update(key as 'start'|'duration',value),undefined,key==='startAngle'?-360:.1,key==='startAngle'?360:200);field(fields,'pathClockwise',m.clockwise,'checkbox',value=>update('clockwise',value));}
 if(m.type==='ellipse'){const circle=button(t('path-circle'),()=>{const [w,h]=formats[project.format];const rx=Math.max(.1,.1*h/w,Math.min(e.motionPath!.radiusX,200*h/w));apply({...e.motionPath!,radiusX:rx,radiusY:rx*w/h});renderForms();});circle.className='path-edit-button';group.append(circle);}
 const hint=document.createElement('p');hint.className='small-hint';hint.textContent=t('pathHint');group.append(hint);
 const edit=button(t('editPath'),()=>{stop();comicEditing=null;motionEditing=true;if(current().camera){cameraOverview=true;renderForms();}$('open-preview').click();draw(false);});edit.className='path-edit-button';group.append(edit);
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
 motionEditing=false;comicEditing=null;draw(false);resize();
}
$('open-preview').addEventListener('click',()=>{
 $('preview-overlay-host').append(previewContent);previewContent.classList.add('preview-expanded');
 previewDialog.showModal();fitPreview();resize();
});
$('close-preview').addEventListener('click',closePreview);
previewDialog.addEventListener('close',()=>{if(previewContent.parentElement!==$('preview-slot'))closePreview();});
previewDialog.addEventListener('click',event=>{if(event.target===previewDialog){const rect=previewDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closePreview();}});
// Render complete scene layers so transitions include backgrounds and rich text.
type SceneView={element:Element;node:HTMLDivElement;text?:HTMLSpanElement;svg?:SVGSVGElement;simulation?:SimulationView;video?:HTMLVideoElement;bubble?:BubbleView;scene:Scene};
let projectSimulation:SimulationView|undefined,projectSimulationKey='';
function syncProjectSimulation(){
 const key=JSON.stringify([project.backgroundSimulation,project.format]);
 if(key!==projectSimulationKey){projectSimulationKey=key;const [width,height]=formats[project.format];projectSimulation=project.backgroundSimulation?createSimulation(project.backgroundSimulation,width,height):undefined;projectSimulation?.canvas.classList.add('project-simulation-canvas');}
 projectSimulation?.draw(time);
}
let transitionBlack:HTMLDivElement|undefined;
let stageKey='',views:SceneView[]=[],incomingLayer:HTMLDivElement|undefined,incomingWorld:HTMLDivElement|undefined,incomingSvgBackground:SVGSVGElement|undefined,outgoingLayer:HTMLDivElement|undefined;
function createSceneLayer(scene:Scene,index:number,interactive:boolean,forceWorld=false){
 const backgroundOpacity=scene.backgroundEnabled?scene.backgroundOpacity:0;
 const viewport=document.createElement('div');viewport.className='scene-layer';viewport.dataset.sceneIndex=String(index);const layer=document.createElement('div');layer.className='scene-camera-world';viewport.append(layer);layer.style.background=backgroundOpacity===1?gradientCSS(scene.backgroundGradient,scene.background):'transparent';if(!scene.camera&&!forceWorld){viewport.style.background=layer.style.background;layer.style.background='transparent';}
 let backgroundHost:HTMLElement=layer;
 if(backgroundOpacity<1){const backdrop=document.createElement('div');backdrop.className='scene-backdrop';backdrop.style.background=gradientCSS(scene.backgroundGradient,scene.background);backdrop.style.opacity=String(backgroundOpacity);layer.append(backdrop);backgroundHost=backdrop;}
 if(!interactive)layer.style.pointerEvents='none';
 const [w,h]=formats[project.format];const sceneViews:SceneView[]=[];
 const simulationPixelBudget=8000000/Math.max(1,scene.elements.filter(e=>e.type==='simulation').length);
 let svgBackground:SVGSVGElement|undefined;
 if(scene.backgroundAsset&&project.assets[scene.backgroundAsset].data.startsWith('data:image/svg+xml;')){svgBackground=createSvgImage(project.assets[scene.backgroundAsset].data,'cover',true);const background=document.createElement('div');background.className='scene-background';background.append(svgBackground);backgroundHost.append(background);}
 else if(scene.backgroundAsset){const image=document.createElement('img');image.className='scene-background';image.src=project.assets[scene.backgroundAsset].data;image.alt='';backgroundHost.append(image);}
 scene.elements.forEach(e=>{
   const node=document.createElement('div');node.dataset.elementId=e.id;node.dataset.space=e.space;node.className='scene-element'+(interactive&&!playing&&(e.id===selectedId||scene.groups.some(g=>g.id===selectedGroupId&&g.members.includes(e.id)))?' selected':'');
   Object.assign(node.style,{left:`${e.x*w/100}px`,top:`${e.y*h/100}px`,width:`${e.width*w/100}px`,height:`${e.height*h/100}px`,color:e.color,fontFamily:e.font,fontSize:`${e.fontSize}px`,fontWeight:e.bold?'700':'400',fontStyle:e.italic?'italic':'normal',textDecoration:[e.underline?'underline':'',e.strikethrough?'line-through':''].filter(Boolean).join(' ')||'none',textAlign:e.align,justifyContent:e.align==='left'?'flex-start':e.align==='right'?'flex-end':'center',borderRadius:`${e.radius}px`});
   let bubble:BubbleView|undefined,video:HTMLVideoElement|undefined,text:HTMLSpanElement|undefined,svg:SVGSVGElement|undefined,simulation:SimulationView|undefined;
   if(e.type==='bubble'){node.classList.add('scene-bubble');bubble=createBubble(node,e,e.width*w/100,e.height*h/100,w,h);}
   else if(e.type==='video'&&e.video?.asset){video=createVideo(project.videos[e.video.asset]);video.dataset.outgoing=String(!interactive);video.addEventListener('loadeddata',()=>draw(false),{once:true});node.append(video);}
   else if(e.type==='text'){node.style.textDecoration='none';text=document.createElement('span');text.style.width='100%';node.append(text);}
   else if(e.type==='simulation'){simulation=createSimulation(e.simulation!,e.width*w/100,e.height*h/100,simulationPixelBudget);node.append(simulation.canvas);}
   else if(e.type==='shape')renderShape(node,e,e.width*w/100,e.height*h/100);
   else if(e.type==='image'&&e.asset&&e.crop){const view=createCropImage(project.assets[e.asset].data,e.fit,e.crop);svg=view.svg;node.append(svg);void view.ready.then(()=>{if(node.isConnected)draw(false);}).catch(error=>status((error as Error).message));}
   else if(e.asset&&project.assets[e.asset].data.startsWith('data:image/svg+xml;')){svg=createSvgImage(project.assets[e.asset].data,e.fit);node.append(svg);}
   else if(e.asset){const img=document.createElement('img');img.src=project.assets[e.asset].data;img.alt=project.assets[e.asset].name;img.style.objectFit=e.fit;node.append(img);}
   else{node.textContent=t('image');node.style.background='#ffffff22';}
   node.addEventListener('click',()=>{if(!interactive||playing||recording)return;selectedGroupId='';selectedId=e.id;renderForms();renderElements();draw();});
   layer.append(node);sceneViews.push({element:e,node,text,svg,simulation,video,bubble,scene});
 });
 return {layer:viewport,world:layer,views:sceneViews,svgBackground};
}
function updateSceneViews(sceneViews:SceneView[],local:number,opacity=1,cameraEnabled=true,cameraOverride:Camera|null|undefined=undefined){
 sceneViews.forEach(({element,node,text,svg,simulation,video,bubble,scene})=>{
  const effectiveScene={...scene,camera:cameraEnabled?(cameraOverride===undefined?scene.camera:cameraOverride):null};
  const state=sceneElementState(element,effectiveScene,local,formats[project.format][0],formats[project.format][1],true);
  if(video&&element.video)syncVideo(video,element.video,project.videos[element.video.asset].duration,local-element.at,playing&&!countdownTimer&&state.visible&&video.dataset.outgoing!=='true',state.visible&&opacity>0&&video.dataset.outgoing!=='true');
  simulation?.draw(local-element.at);seekSvg(svg,local-element.at);
  node.style.opacity=String(state.opacity*opacity);node.style.visibility=state.visible?'visible':'hidden';node.style.transform=state.transform;node.style.transformOrigin='0 0';
  if(text&&text.dataset.visibleText!==state.text){renderRuns(text,element,state.text);text.dataset.visibleText=state.text;}
  bubble?.update(effectiveScene,local,state.text,!playing&&!recording&&(element.id===selectedId||scene.groups.some(g=>g.id===selectedGroupId&&g.members.includes(element.id))));
 });
 const warning=document.getElementById('bubble-overflow');
 if(warning){const view=sceneViews.find(v=>v.element.id===selectedId)?.bubble;warning.hidden=!view?.overflow();}

}
let backgroundVideoNode:HTMLVideoElement|undefined,backgroundVideoAsset='';
function draw(follow=true){
 syncProjectSimulation();
 const bg=project.backgroundVideo;
 if((bg?.asset??'')!==backgroundVideoAsset||backgroundVideoNode&&backgroundVideoNode.dataset.projectRevision!==String(revision)&&!project.videos[backgroundVideoAsset]){backgroundVideoNode?.pause();backgroundVideoAsset=bg?.asset??'';backgroundVideoNode=bg?.asset?createVideo(project.videos[bg.asset]):undefined;if(backgroundVideoNode){backgroundVideoNode.className='project-video-canvas';backgroundVideoNode.addEventListener('loadeddata',()=>draw(false),{once:true});}}
 if(backgroundVideoNode&&bg)syncVideo(backgroundVideoNode,bg,project.videos[bg.asset].duration,time,playing&&!countdownTimer);

 const at=locateTime(project,time);
 if(follow&&at.index!==sceneIndex){sceneIndex=at.index;selectedId='';selectedGroupId='';multiSelection.clear();renderForms();renderElements();renderTimeline();$('scene-list').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===sceneIndex)));}
 const s=project.scenes[at.index],transition=sceneTransitionState(s,at.local);
 const layered=s.transition!=='none'&&s.transition!=='fade';
 const showPrevious=layered&&at.index>0&&transition.progress<1;
 const key=`${revision}:${at.index}:${project.format}:${playing}:${recording}:${selectedId}:${selectedGroupId}:${showPrevious}:${cameraOverview}`;
 if(stageKey!==key){
  stageKey=key;stage.querySelectorAll<HTMLVideoElement>('video:not(.project-video-canvas)').forEach(v=>v.pause());for(const child of Array.from(stage.children))if(child!==projectSimulation?.canvas&&child!==backgroundVideoNode)child.remove();if(projectSimulation&&projectSimulation.canvas.parentElement!==stage)stage.prepend(projectSimulation.canvas);if(backgroundVideoNode&&backgroundVideoNode.parentElement!==stage){if(projectSimulation)projectSimulation.canvas.after(backgroundVideoNode);else stage.prepend(backgroundVideoNode);}outgoingLayer=undefined;transitionBlack=undefined;
  if((projectSimulation||backgroundVideoNode)&&s.transition==='through-black'){transitionBlack=document.createElement('div');transitionBlack.className='project-transition-black';stage.append(transitionBlack);}stage.style.background=projectSimulation||backgroundVideoNode||layered||s.backgroundGradient||!s.backgroundEnabled||s.backgroundOpacity<1?'#000000':s.background;resize();
  if(showPrevious){const previous=project.scenes[at.index-1],view=createSceneLayer(previous,at.index-1,false);outgoingLayer=view.layer;view.world.style.transform=cameraTransform(cameraOverview&&!playing&&!recording?null:previous.camera,previous.duration,formats[project.format][0],formats[project.format][1]);stage.append(view.layer);updateSceneViews(view.views,previous.duration,1,!(cameraOverview&&!playing&&!recording));seekSvg(view.svgBackground,previous.duration);}
  const view=createSceneLayer(s,at.index,true);incomingLayer=view.layer;incomingWorld=view.world;incomingSvgBackground=view.svgBackground;views=view.views;stage.append(view.layer);
 }
 if(incomingWorld)incomingWorld.style.transform=cameraTransform(cameraOverview&&!playing&&!recording?null:s.camera,at.local,formats[project.format][0],formats[project.format][1]);
 if(transitionBlack)transitionBlack.style.opacity=String(1-Math.abs(transition.progress*2-1));
 if(incomingLayer){incomingLayer.style.transform=transition.incoming;incomingLayer.style.clipPath=transition.clip;incomingLayer.style.opacity=String(transition.opacity);}
 if(outgoingLayer){outgoingLayer.style.transform=transition.outgoing;outgoingLayer.style.opacity=String(transition.outgoingOpacity);}
 // Preserve the existing fade-in semantics over the incoming background color.
 const sceneOpacity=s.transition==='fade'&&playing?Math.min(1,at.local/s.transitionDuration):1;
 const backgroundImage=incomingLayer?.querySelector<HTMLElement|SVGElement>('.scene-background');if(backgroundImage)backgroundImage.style.opacity=String(sceneOpacity);
 seekSvg(incomingSvgBackground,at.local);
 updateSceneViews(views,at.local,sceneOpacity,!(cameraOverview&&!playing&&!recording));
 stage.querySelector('.motion-path-overlay')?.remove();stage.querySelector('.comic-edit-overlay')?.remove();
 const edit=selected();if((!s.camera||cameraOverview)&&motionEditing&&!playing&&!recording&&edit?.motionPath)renderMotionPath(stage,edit,formats[project.format][0],formats[project.format][1],next=>{if(!motionEditing||selected()!==edit)return;edit.motionPath=next;changed();draw(false);},()=>{if(selected()===edit)renderForms();},parentMatrix(edit,s,at.local,formats[project.format][0],formats[project.format][1]));
 const activeGroup=s.groups.find(g=>g.id===selectedGroupId);if((!s.camera||cameraOverview)&&motionEditing&&!playing&&!recording&&activeGroup?.motionPath){const controller=groupController(activeGroup);controller.x+=activeGroup.x;controller.y+=activeGroup.y;renderMotionPath(stage,controller,formats[project.format][0],formats[project.format][1],next=>{activeGroup.motionPath=next;changed();draw(false);},renderForms);}
 if((!s.camera||cameraOverview)&&comicEditing&&!playing&&!recording&&edit)renderComicHandles(edit,at.local);
 ($('timeline') as HTMLInputElement).max=String(total());($('timeline') as HTMLInputElement).value=String(time);$('time-label').textContent=`${time.toFixed(1)} / ${total().toFixed(1)} s`;
 const timelineHost=$('edit-timeline');if(timelineHost)timelineHost.style.setProperty('--playhead',Math.max(0,Math.min(100,(time-offset(sceneIndex))/current().duration*100))+'%');
 const playButton=$('play') as HTMLButtonElement;
 playButton.title=t(playing?'pause':'play');playButton.setAttribute('aria-label',playButton.title);
 playButton.querySelector('[aria-hidden]')!.textContent=playing?'Ⅱ':'▶';playButton.querySelector('.control-label')!.textContent=playButton.title;
 ($('previous-scene') as HTMLButtonElement).disabled=sceneIndex===0;
 ($('next-scene') as HTMLButtonElement).disabled=sceneIndex===project.scenes.length-1;
}
function stop(){document.querySelectorAll('video').forEach(v=>v.pause());clearTimeout(recordingRestartTimer);recordingRestartTimer=undefined;playbackAttempt++;musicPlayer.stop();narrationPlayer.stop();document.querySelectorAll('audio').forEach(a=>a.pause());playing=false;cancelAnimationFrame(frame);keepScreenAwake(false);}
function tick(now:number){time=Math.min(total(),musicPlayer.playhead()??narrationPlayer.playhead()??(baseTime+(now-started)/1000));draw();if(time>=total()){
 stop();draw();if(recording)recordingRestartTimer=setTimeout(()=>{
  recordingRestartTimer=undefined;if(!recording||playing)return;
  document.body.classList.add('recording-ready');setRecordingStart(true);$('recording-start').hidden=false;
 },3000);return;
}frame=requestAnimationFrame(tick);}
function play(){
 if(countdownTimer||playing)return;stopAudioPreviews();if(project.music?.enabled)void musicPlayer.unlock().catch(()=>{});document.querySelectorAll('video').forEach(v=>v.pause());clearTimeout(recordingRestartTimer);recordingRestartTimer=undefined;if(recording){document.body.classList.remove('recording-ready');$('recording-start').hidden=true;}if(time>=total())time=0;playing=true;keepScreenAwake(true);const attempt=++playbackAttempt;
 const begin=()=>{if(!playing||attempt!==playbackAttempt)return;baseTime=time;started=performance.now();frame=requestAnimationFrame(tick);};
 const clips=narrationClips(project);const prepare=clips.length?narrationPlayer.prepare(project).catch(error=>{showToast(t('audioError')+' '+(error as Error).message,'warning');return null;}):Promise.resolve(null);
 void prepare.then(async buffers=>{if(!playing||attempt!==playbackAttempt)return;if(project.music?.enabled){try{await musicPlayer.start(project.music,time,total(),t=>buffers?duckGain(project,t,clips):1);}catch{showToast(t('audioError'),'warning');}}if(!playing||attempt!==playbackAttempt)return;if(buffers)narrationPlayer.start(project,musicPlayer.playhead()??time,buffers);begin();}).catch(error=>{if(!playing||attempt!==playbackAttempt)return;narrationPlayer.stop();showToast(t('audioError')+' '+(error as Error).message,'warning');begin();});
}
$('play').addEventListener('click',()=>{if(playing){stop();draw();}else play();});
function skipScene(delta:number){const next=sceneIndex+delta;if(next<0||next>=project.scenes.length)return;const resume=playing;selectScene(next);if(resume)play();}
$('previous-scene').addEventListener('click',()=>skipScene(-1));
$('next-scene').addEventListener('click',()=>skipScene(1));
$('timeline').addEventListener('input',()=>{stop();time=Number(($('timeline') as HTMLInputElement).value);draw();});
$('safe-toggle').addEventListener('change',()=>{$('safe-overlay').hidden=!($('safe-toggle') as HTMLInputElement).checked;});
function replace(next:Project){stop();backgroundVideoNode=undefined;backgroundVideoAsset='';clearVideoURLs();clearAudioURLs();revision++;project=next;sceneIndex=0;selectedId='';time=0;dirty=false;selectedGroupId='';multiSelection.clear();history.reset(project);persist();refresh();status(t('ready'));}
const canReplace=()=>!dirty||confirm(t('unsaved'));
$('new-project').addEventListener('click',()=>{if(canReplace()){replace({version:'1.0',title:'SceneScript',description:'',hashtags:'',thumbnail:null,audios:{},narration:null,audioDucking:false,format:'landscape',backgroundSimulation:null,backgroundVideo:null,videos:{},music:null,assets:{},scenes:[newScene()]});changed();}});
$('toggle-project').addEventListener('click',()=>{
 const button=$('toggle-project'),collapsed=button.getAttribute('aria-expanded')==='true';
 $('project-panel').classList.toggle('project-collapsed',collapsed);
 $('project-toolbar').hidden=collapsed;$('project-content').hidden=collapsed;
 button.setAttribute('aria-expanded',String(!collapsed));
 const label=t(collapsed?'expandProject':'collapseProject');button.title=label;button.setAttribute('aria-label',label);
 if(collapsed)stopAudioPreviews();
});
$('project-title').addEventListener('input',()=>{project.title=($('project-title') as HTMLInputElement).value;changed();});
$('project-format').addEventListener('change',()=>{project.format=($('project-format') as HTMLSelectElement).value as Project['format'];changed();draw();});
$('add-scene').addEventListener('click',()=>{if(project.scenes.length>=100)return;project.scenes.push(newScene());changed();selectScene(project.scenes.length-1);});
$('duplicate-scene').addEventListener('click',()=>{if(project.scenes.length>=100)return;const copy=structuredClone(current());copy.id=crypto.randomUUID();const ids=new Map(copy.elements.map(e=>[e.id,crypto.randomUUID()]));copy.elements.forEach(e=>{e.id=ids.get(e.id)!;if(e.bubble?.tail.mode==='anchor')e.bubble.tail.element=ids.get(e.bubble.tail.element)!;});copy.groups.forEach(g=>{g.id=crypto.randomUUID();g.members=g.members.map(id=>ids.get(id)!);});project.scenes.splice(sceneIndex+1,0,copy);changed();selectScene(sceneIndex+1);});
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
document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(b=>b.addEventListener('click',()=>{if(current().elements.length>=100)return;($('element-add-menu') as HTMLDetailsElement).open=false;const e=newElement(b.dataset.add as Element['type']);if(e.type==='image')e.asset=Object.keys(project.assets)[0]||'';if(e.type==='video')e.video={...defaultVideo(),asset:Object.keys(project.videos)[0]||''};current().elements.push(e);try{parseProject(JSON.stringify(project));}catch(error){current().elements.pop();status(t('error')+' '+(error as Error).message);return;}selectedGroupId='';selectedId=e.id;stop();time=offset(sceneIndex)+Math.min(current().duration-0.001,e.animationDuration);changed();refresh();}));
function download(){try{parseProject(JSON.stringify(project));const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});if(blob.size>MAX_FILE_BYTES)throw new Error('JSON: maximum 160 MiB');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(project.title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,80)||'project')+'.scenescript.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);dirty=false;status(t('saved'));}catch(error){status(t('error')+' '+(error as Error).message);}}
$('save-project').addEventListener('click',download);
$('load-project').addEventListener('click',()=>($('project-file') as HTMLInputElement).click());
$('project-file').addEventListener('change',async()=>{const input=$('project-file') as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;try{if(file.size>MAX_FILE_BYTES)throw new Error('JSON: maximum 160 MiB');const next=parseProject(await file.text());await preload(next);if(canReplace())replace(next);}catch(error){status(t('error')+' '+(error as Error).message);}});
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
  if(new TextEncoder().encode(text).length>MAX_FILE_BYTES){jsonStatus(t('error')+' JSON: maximum 160 MiB',true);return;}
  ($('json-input') as HTMLTextAreaElement).value=text;jsonStatus('');$('json-input').focus();
 }catch{
  if(dialog.open&&session===jsonSession){jsonStatus(t('clipboardDenied'));$('json-input').focus();}
 }finally{button.disabled=false;}
});
$('import-json').addEventListener('click',async()=>{try{const next=parseProject(($('json-input') as HTMLTextAreaElement).value);await preload(next);if(canReplace()){replace(next);dialog.close();}}catch(error){jsonStatus(t('error')+' '+(error as Error).message,true);}});

$('import-thumbnail').onclick=()=>($('thumbnail-file') as HTMLInputElement).click();
($('thumbnail-file') as HTMLInputElement).onchange=async()=>{
 const input=$('thumbnail-file') as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;const target=project,attempt=++thumbnailImportAttempt;
 try{if(file.size>MAX_IMAGE_BYTES)throw new Error('Image: maximum 8 MiB');if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG / JPEG / WebP');
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Image read failed'));reader.readAsDataURL(file);});
  const thumbnail={name:file.name.slice(0,200),data};await decodeImage(data);if(project!==target||attempt!==thumbnailImportAttempt)return;parseProject(JSON.stringify({...target,thumbnail}));project.thumbnail=thumbnail;changed();renderThumbnail();
 }catch(error){if(project===target&&attempt===thumbnailImportAttempt)status(t('error')+' '+(error as Error).message);}
};
$('gallery-import-image').onclick=()=>($('image-file') as HTMLInputElement).click();
async function decodeImage(data:string){const image=new Image();image.src=data;await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw new Error('Image: invalid dimensions');if(image.naturalWidth*image.naturalHeight>40_000_000)throw new Error('Image: maximum 40 megapixels');}
async function preload(p:Project){await Promise.all([...Object.values(p.assets).map(a=>decodeImage(a.data)),...(p.thumbnail?[decodeImage(p.thumbnail.data)]:[]),...Object.values(p.videos).map(async a=>{const actual=await inspectVideo(a.data);if(Math.abs(actual-a.duration)>.2)throw new Error('Video: duration does not match file');})]);for(const a of Object.values(p.audios)){const actual=(await decodeAudio(a)).duration;if(Math.abs(actual-a.duration)>.2)throw new Error('Audio: duration does not match file');}}
async function importImageFile(input:HTMLInputElement){const file=input.files?.[0],replaceId=input.dataset.replaceAsset;delete input.dataset.replaceAsset;input.value='';if(!file)return;const target=project,previous=replaceId?project.assets[replaceId]:undefined;if(replaceId&&!previous)return;try{if(!replaceId&&Object.keys(project.assets).length>=100)throw new Error('assets: maximum 100');if(file.size>MAX_IMAGE_BYTES)throw new Error('Image: maximum 8 MiB');const isSvg=file.type==='image/svg+xml'||/\.svg$/i.test(file.name);if(!isSvg&&!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG / JPEG / WebP / SVG');const data=isSvg?svgDataURL(validateSvg(await file.text())):await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Image read failed'));reader.readAsDataURL(file);});validateImage(data);await decodeImage(data);if(project!==target)return;if(replaceId&&project.assets[replaceId]!==previous)return;const id=replaceId??crypto.randomUUID(),next={name:previous?.name??file.name.slice(0,200),data};parseProject(JSON.stringify({...project,assets:{...project.assets,[id]:next}}));stop();project.assets[id]=next;const e=selected();if(!replaceId&&e?.type==='image')e.asset=id;changed();refresh();}catch(error){status(t('error')+' '+(error as Error).message);}}
for(const id of ['image-file','replace-image-file']){const input=$(id) as HTMLInputElement;input.onchange=()=>void importImageFile(input);input.addEventListener('cancel',()=>delete input.dataset.replaceAsset);}
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
function setRecordingStart(restart=false){
 const b=$('start-recording');const label=t(restart?'restartRecording':'startRecording');b.setAttribute('aria-label',label);b.querySelector('span')!.textContent=label;
 b.querySelector('path')!.setAttribute('d',restart?'M49 19V6l-6 6A23 23 0 1 0 55 32h-7a16 16 0 1 1-10-15l-6 6h17Z':'M23 14 49 32 23 50Z');
}
$('focus').addEventListener('click',async()=>{
 if(($('focus') as HTMLButtonElement).disabled||recording)return;
 // Commit focused controls before clearing the recording selection (touch browsers
 // do not necessarily blur inputs when toolbar buttons are tapped).
 if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
 closePreview();
 const attempt=++focusAttempt;($('focus') as HTMLButtonElement).disabled=true;stop();
 try{await preload(project);await document.fonts.ready;}
 catch(error){status(t('error')+' '+(error as Error).message);return;}
 finally{($('focus') as HTMLButtonElement).disabled=false;}
 if(attempt!==focusAttempt)return;
 recordingReturnState={sceneIndex,selectedId,selectedGroupId,multiSelection:[...multiSelection],time};recording=true;
 document.body.classList.add('recording','recording-ready');setRecordingStart();
 $('recording-start').hidden=false;($('start-recording') as HTMLButtonElement).disabled=true;
 $('exit-focus').hidden=false;selectedId='';time=0;draw();
 try{await document.documentElement.requestFullscreen();}catch{/* CSS fallback. */}
 if(!recording||attempt!==focusAttempt)return;
 ($('start-recording') as HTMLButtonElement).disabled=false;$('start-recording').focus();
});
function startCountdown(){
 if(!recording||!document.body.classList.contains('recording-ready')||($('start-recording') as HTMLButtonElement).disabled)return;
 if(narrationClips(project).length)void narrationPlayer.unlock().catch(()=>showToast(t('audioError'),'warning'));
 if(project.music?.enabled)void musicPlayer.unlock().catch(()=>showToast(t('audioError'),'warning'));
 clearTimeout(recordingRestartTimer);recordingRestartTimer=undefined;time=0;draw();
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
  ({sceneIndex,selectedId,selectedGroupId,time}=recordingReturnState);multiSelection=new Set(recordingReturnState.multiSelection);
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

$('duplicate-element').addEventListener('click',()=>{const g=current().groups.find(g=>g.id===selectedGroupId);if(g){if(current().elements.length+g.members.length>100||current().groups.length>=50)return;const copy=structuredClone(g),ids=new Map(g.members.map(id=>[id,crypto.randomUUID()]));const members=current().elements.filter(e=>g.members.includes(e.id)).map(e=>{const copy=structuredClone(e);copy.id=ids.get(e.id)!;if(copy.bubble?.tail.mode==='anchor')copy.bubble.tail.element=ids.get(copy.bubble.tail.element)??copy.bubble.tail.element;return copy;});copy.id=crypto.randomUUID();copy.members=copy.members.map(id=>ids.get(id)!);current().elements.push(...members);current().groups.push(copy);try{parseProject(JSON.stringify(project));}catch(error){current().groups.pop();current().elements.splice(-members.length);showToast((error as Error).message,'error');return;}selectedGroupId=copy.id;changed();refresh();return;}const e=selected();if(!e||current().elements.length>=100)return;const copy={...structuredClone(e),id:crypto.randomUUID()};if(copy.bubble?.tail.mode==='anchor'&&copy.bubble.tail.element===e.id)copy.bubble.tail.element=copy.id;const parent=current().groups.find(g=>g.members.includes(e.id));current().elements.push(copy);parent?.members.push(copy.id);try{parseProject(JSON.stringify(project));}catch(error){current().elements.pop();if(parent)parent.members=parent.members.filter(id=>id!==copy.id);status(t('error')+' '+(error as Error).message);return;}selectedGroupId='';selectedId=copy.id;changed();refresh();});
$('element-up').addEventListener('click',()=>moveElement(-1));
$('element-down').addEventListener('click',()=>moveElement(1));
$('delete-element').addEventListener('click',()=>{const g=current().groups.find(g=>g.id===selectedGroupId);if(g){askDelete(g.name,'group',()=>{for(const id of g.members)detachAnchor(current(),id,undefined,time-offset(sceneIndex),formats[project.format][0],formats[project.format][1]);current().elements=current().elements.filter(e=>!g.members.includes(e.id));current().groups=current().groups.filter(v=>v.id!==g.id);selectedGroupId='';changed();refresh();});return;}if(!selected())return;detachAnchor(current(),selectedId,undefined,time-offset(sceneIndex),formats[project.format][0],formats[project.format][1]);current().elements=current().elements.filter(e=>e.id!==selectedId);current().groups.forEach(g=>g.members=g.members.filter(id=>id!==selectedId));current().groups=current().groups.filter(g=>g.members.length);selectedId='';changed();refresh();});
document.addEventListener('click',event=>{const menu=$('element-add-menu') as HTMLDetailsElement;if(!menu.contains(event.target as Node))menu.open=false;});
$('element-add-menu').addEventListener('keydown',event=>{if(event.key==='Escape'&&($('element-add-menu') as HTMLDetailsElement).open){event.preventDefault();event.stopPropagation();($('element-add-menu') as HTMLDetailsElement).open=false;$('element-add-menu').querySelector('summary')?.focus();}});

// Export owns a snapshot and a separate renderer; editing state is never replaced.
let exportController:AbortController|undefined;
const exportDialog=$<HTMLDialogElement>('export-dialog');
$('open-export').addEventListener('click',()=>{document.activeElement instanceof HTMLElement&&document.activeElement.blur();stop();$('export-status').textContent='';$('export-progress').hidden=true;$('export-preview').hidden=true;exportDialog.showModal();});
const cancelExport=()=>{if(exportController)exportController.abort();else exportDialog.close();};
$('cancel-export').addEventListener('click',cancelExport);
exportDialog.addEventListener('cancel',event=>{event.preventDefault();cancelExport();});
$('start-export').addEventListener('click',async()=>{
 if(exportController)return;const controller=new AbortController();exportController=controller;
 const controls=Array.from(exportDialog.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLButtonElement>('#export-options input,#export-options select,#start-export'));controls.forEach(n=>n.disabled=true);
 const preview=$<HTMLCanvasElement>('export-preview-canvas');$('export-preview').hidden=true;
 const progress=$<HTMLProgressElement>('export-progress');progress.hidden=false;progress.value=0;$('export-status').textContent=t('exportBusy');keepScreenAwake(true);
 try{
  const {exportVideo,exportSupported}=await import('./video-export');
  const options={format:$<HTMLSelectElement>('export-format').value as 'mp4'|'webm',resolution:Number($<HTMLSelectElement>('export-resolution').value),fps:Number($<HTMLSelectElement>('export-fps').value),audio:$<HTMLInputElement>('export-audio').checked};
  const snapshot=structuredClone(project);
  if(!await exportSupported(snapshot,options))throw new Error(t('exportUnsupported'));
  const blob=await exportVideo(snapshot,options,controller.signal,value=>{progress.value=value;},frame=>{
   const scale=Math.min(320/frame.width,180/frame.height),width=Math.max(1,Math.round(frame.width*scale)),height=Math.max(1,Math.round(frame.height*scale));
   if(preview.width!==width||preview.height!==height){preview.width=width;preview.height=height;}
   preview.getContext('2d')!.drawImage(frame,0,0,width,height);$('export-preview').hidden=false;
  });
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=(snapshot.title.replace(/[\/:*?"<>|]/g,'_')||'SceneScript')+'.'+options.format;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  $('export-status').textContent=t('exportDone');exportDialog.close();showToast(t('exportDone'),'success');
 }catch(error){$('export-status').textContent=controller.signal.aborted?t('exportCancelled'):t('error')+' '+(error as Error).message;}
 finally{exportController=undefined;controls.forEach(n=>n.disabled=false);keepScreenAwake(false);}
});

for(const key of ['title','description','hashtags'] as const){
 const input=$(key==='description'?'project-description':'project-'+key) as HTMLInputElement|HTMLTextAreaElement;
 if(key!=='title')input.addEventListener('input',()=>{project[key]=input.value;changed();});
 $('copy-project-'+key).addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(input.value);showToast(t('copied'),'success');}
  catch{input.focus();input.select();showToast(t('projectCopyDenied'),'warning');}
 });
}

$('copy-project-json').addEventListener('click',async()=>{
 const button=$('copy-project-json') as HTMLButtonElement;button.disabled=true;
 try{
  document.activeElement instanceof HTMLElement&&document.activeElement.blur();
  const json=JSON.stringify(project,null,2);parseProject(json);
  try{await navigator.clipboard.writeText(json);showToast(t('projectJsonCopied'),'success');}
  catch{
   jsonSession++;($('json-input') as HTMLTextAreaElement).value=json;jsonStatus('');dialog.showModal();
   const input=$('json-input') as HTMLTextAreaElement;input.focus();input.select();
   $('json-copy-status').textContent=t('projectJsonCopyDenied');showToast(t('projectJsonCopyDenied'),'warning');
  }
 }catch(error){showToast(t('error')+' '+(error as Error).message,'error');}
 finally{button.disabled=false;}
});

// Camera drafts never mutate the project until Apply; playback uses the same pure transform.
const cameraDialog=$('camera-dialog') as HTMLDialogElement;
let cameraDraft:Camera|null=null,cameraTarget:Scene|undefined,cameraProject:Project|undefined,cameraPreviewFrame=0,cameraFrameOverview=false,cameraActiveStation=0;
let cameraPreviewView:ReturnType<typeof createSceneLayer>|undefined,cameraPreviewSimulation:SimulationView|undefined,cameraPreviewVideo:HTMLVideoElement|undefined;
function openCamera(){stop();cameraTarget=current();cameraProject=project;cameraDraft=structuredClone(current().camera);cameraFrameOverview=false;cameraActiveStation=0;($('camera-time') as HTMLInputElement).max=String(current().duration);($('camera-time') as HTMLInputElement).value='0';renderCameraForm();cameraDialog.showModal();renderCameraPreview();}
function renderCameraForm(){
 if(cameraDraft)cameraActiveStation=Math.min(cameraActiveStation,cameraDraft.stations.length-1);
 const options=$('camera-options');options.replaceChildren();field(options,'cameraEnabled',!!cameraDraft,'checkbox',v=>{cameraDraft=v?{stations:[{at:0,x:0,y:0,width:100,hold:0,easing:'linear'}]}:null;renderCameraForm();renderCameraPreview();});
 field(options,'cameraFrameOverview',cameraFrameOverview,'checkbox',v=>{cameraFrameOverview=Boolean(v);renderCameraPreview();});
 const form=$('camera-form');form.replaceChildren();
 cameraDraft?.stations.forEach((station,i)=>{const tile=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=t('cameraStation')+' '+(i+1);const select=button('',()=>{cameraActiveStation=i;cameraFrameOverview=true;($('camera-time') as HTMLInputElement).value=String(station.at);cancelAnimationFrame(cameraPreviewFrame);cameraPreviewFrame=0;cameraPlayLabel(false);renderCameraForm();renderCameraPreview();$('camera-preview').scrollIntoView({block:'nearest'});});select.className='camera-station-select';select.dataset.cameraStation=String(i);select.title=t('cameraSelectStation');select.setAttribute('aria-label',select.title+' '+(i+1));select.setAttribute('aria-pressed',String(i===cameraActiveStation));select.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8V3h5m8 0h5v5m0 8v5h-5M8 21H3v-5M8 8h8v8H8Z"/></svg>';legend.append(select);tile.append(legend);
 for(const [key,label,min,max] of [['at','cameraAt',0,cameraTarget!.duration],['hold','cameraHold',0,cameraTarget!.duration],['x','x',0,100],['y','y',0,100],['width','width',1,100]] as const){field(tile,label,station[key],'number',v=>{station[key]=Number(v);renderCameraPreview();},undefined,min,key==='at'&&i===0?0:max);if(key==='at'&&i===0)tile.querySelector<HTMLInputElement>('[name=cameraAt]')!.disabled=true;}
 field(tile,'cameraEasing',station.easing,'select',v=>{station.easing=String(v) as 'linear'|'ease-in-out';renderCameraPreview();},['linear','ease-in-out']);
 const remove=button('',()=>{cameraDraft!.stations.splice(i,1);cameraDraft!.stations[0].at=0;cameraActiveStation=Math.min(cameraActiveStation,cameraDraft!.stations.length-1);renderCameraForm();renderCameraPreview();});remove.disabled=cameraDraft!.stations.length===1;remove.title=t('remove');remove.setAttribute('aria-label',t('remove'));remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';tile.append(remove);form.append(tile);});
 const last=cameraDraft?.stations.at(-1);($('camera-add') as HTMLButtonElement).disabled=!last||cameraDraft!.stations.length>=32||last.at+last.hold>=cameraTarget!.duration;
}
function renderCameraPreview(){
 if(!cameraTarget||cameraProject!==project)return;let camera:Camera|null;try{camera=parseCamera(cameraDraft,cameraTarget.duration);$('camera-error').textContent='';($('apply-camera') as HTMLButtonElement).disabled=false;}catch(error){$('camera-error').textContent=(error as Error).message;($('apply-camera') as HTMLButtonElement).disabled=true;return;}
 const local=Number(($('camera-time') as HTMLInputElement).value),host=$('camera-preview'),[w,h]=formats[project.format],previewWidth=Math.min(500,window.innerWidth*.6,240*w/h);
 if(!cameraPreviewView){host.replaceChildren();const root=document.createElement('div');Object.assign(root.style,{position:'relative',width:w+'px',height:h+'px',transformOrigin:'0 0',transform:`scale(${previewWidth/w})`,background:'#000'});host.style.width=previewWidth+'px';host.style.height=(previewWidth*h/w)+'px';host.append(root);
 if(project.backgroundSimulation){cameraPreviewSimulation=createSimulation(project.backgroundSimulation,w,h);Object.assign(cameraPreviewSimulation.canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%'});root.append(cameraPreviewSimulation.canvas);}
 if(project.backgroundVideo?.asset){cameraPreviewVideo=createVideo(project.videos[project.backgroundVideo.asset]);Object.assign(cameraPreviewVideo.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:project.backgroundVideo.fit});cameraPreviewVideo.muted=true;root.append(cameraPreviewVideo);cameraPreviewVideo.addEventListener('loadeddata',renderCameraPreview,{once:true});}
 cameraPreviewView=createSceneLayer(cameraTarget,sceneIndex,false,true);root.append(cameraPreviewView.layer);cameraPreviewView.views.forEach(v=>v.video?.addEventListener('loadeddata',renderCameraPreview,{once:true}));}
 cameraPreviewSimulation?.draw(offset(sceneIndex)+local);
 if(cameraPreviewVideo&&project.backgroundVideo?.asset)syncVideo(cameraPreviewVideo,{...project.backgroundVideo,muted:true},project.videos[project.backgroundVideo.asset].duration,offset(sceneIndex)+local,false,false);
 const view=cameraPreviewView;view.world.style.transform=cameraTransform(cameraFrameOverview?null:camera,local,w,h);updateSceneViews(view.views,local,cameraTarget.transition==='fade'?Math.min(1,local/cameraTarget.transitionDuration):1,!cameraFrameOverview,camera);seekSvg(view.svgBackground,local);$('camera-time-label').textContent=local.toFixed(2)+' s';renderCameraFrame();
 const last=cameraDraft?.stations.at(-1);($('camera-add') as HTMLButtonElement).disabled=!last||cameraDraft!.stations.length>=32||last.at+last.hold>=cameraTarget.duration;
}
$('camera-form').addEventListener('submit',e=>e.preventDefault());$('camera-time').addEventListener('input',()=>{cancelAnimationFrame(cameraPreviewFrame);cameraPreviewFrame=0;cameraPlayLabel(false);renderCameraPreview();});
$('camera-add').addEventListener('click',()=>{const last=cameraDraft?.stations.at(-1);if(!last||!cameraTarget||last.at+last.hold>=cameraTarget.duration||cameraDraft!.stations.length>=32)return;cameraDraft!.stations.push({...last,at:Math.min(cameraTarget.duration,last.at+last.hold+Math.max(.1,(cameraTarget.duration-last.at-last.hold)/2)),hold:0});renderCameraForm();renderCameraPreview();});
$('camera-reset').addEventListener('click',()=>{cameraDraft=null;renderCameraForm();renderCameraPreview();});
$('close-camera').addEventListener('click',()=>cameraDialog.close());
cameraDialog.addEventListener('close',()=>{cancelAnimationFrame(cameraPreviewFrame);cameraPreviewFrame=0;cameraPlayLabel(false);$('camera-preview').querySelectorAll('video').forEach(v=>v.pause());$('camera-preview').replaceChildren();cameraPreviewView=undefined;cameraPreviewSimulation=undefined;cameraPreviewVideo=undefined;cameraTarget=undefined;cameraProject=undefined;});
$('apply-camera').addEventListener('click',()=>{if(!cameraTarget||cameraProject!==project)return;try{cameraTarget.camera=parseCamera(cameraDraft,cameraTarget.duration);changed();cameraDialog.close();refresh();}catch(error){showToast((error as Error).message,'error');}});
function cameraPlayLabel(active:boolean){const b=$('camera-play');b.title=t(active?'pause':'play');b.setAttribute('aria-label',b.title);b.innerHTML=active?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16M16 4v16"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8Z"/></svg>';}
$('camera-play').addEventListener('click',()=>{if(cameraPreviewFrame){cancelAnimationFrame(cameraPreviewFrame);cameraPreviewFrame=0;cameraPlayLabel(false);renderCameraFrame();return;}if(!cameraTarget)return;const input=$('camera-time') as HTMLInputElement;if(Number(input.value)>=cameraTarget.duration)input.value='0';cameraPlayLabel(true);const started=performance.now(),base=Number(input.value),duration=cameraTarget.duration;const tick=(now:number)=>{input.value=String(Math.min(duration,base+(now-started)/1000));renderCameraPreview();cameraPreviewFrame=Number(input.value)<duration&&cameraDialog.open?requestAnimationFrame(tick):0;if(!cameraPreviewFrame){cameraPlayLabel(false);renderCameraFrame();}};cameraPreviewFrame=requestAnimationFrame(tick);});

function renderCameraFrame(){
 const host=$('camera-preview');host.querySelector('.camera-frame-overlay')?.remove();$('camera-frame-hint').hidden=!cameraFrameOverview||!cameraDraft;
 if(!cameraFrameOverview||!cameraDraft||!cameraTarget||cameraPreviewFrame)return;
 const station=cameraDraft.stations[cameraActiveStation];if(!station)return;
 const overlay=document.createElement('div');overlay.className='camera-frame-overlay';const rect=document.createElement('div');rect.className='camera-edit-frame';rect.tabIndex=0;rect.setAttribute('role','group');rect.setAttribute('aria-describedby','camera-frame-hint');rect.setAttribute('aria-label',t('cameraStation')+' '+(cameraActiveStation+1));overlay.append(rect);host.append(overlay);
 const sync=()=>Object.assign(rect.style,{left:station.x+'%',top:station.y+'%',width:station.width+'%',height:station.width+'%'});sync();
 for(const corner of ['nw','ne','sw','se']){const handle=button('',()=>{});handle.dataset.cameraCorner=corner;handle.className='camera-frame-corner '+corner;handle.title=t('crop'+corner.toUpperCase());handle.setAttribute('aria-label',handle.title);rect.append(handle);}
 const resize=(original:typeof station,corner:string,dx:number,dy:number)=>{const right=original.x+original.width,bottom=original.y+original.width,left=original.x,top=original.y,sx=corner.includes('e')?1:-1,sy=corner.includes('s')?1:-1,delta=(sx*dx+sy*dy)/2;
  const max=Math.min(sx===1?100-left:right,sy===1?100-top:bottom),width=Math.max(1,Math.min(max,original.width+delta));return {x:sx===1?left:right-width,y:sy===1?top:bottom-width,width};};
 rect.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();cancelAnimationFrame(cameraPreviewFrame);cameraPreviewFrame=0;cameraPlayLabel(false);const original={...station},box=host.getBoundingClientRect(),startX=event.clientX,startY=event.clientY,corner=(event.target as HTMLElement).dataset.cameraCorner,id=event.pointerId;rect.setPointerCapture(id);
 const move=(ev:PointerEvent)=>{if(ev.pointerId!==id)return;const dx=(ev.clientX-startX)/box.width*100,dy=(ev.clientY-startY)/box.height*100;Object.assign(station,corner?resize(original,corner,dx,dy):{x:Math.max(0,Math.min(100-original.width,original.x+dx)),y:Math.max(0,Math.min(100-original.width,original.y+dy))});sync();};
 const done=()=>{rect.removeEventListener('pointermove',move);rect.removeEventListener('pointerup',done);rect.removeEventListener('pointercancel',cancel);rect.removeEventListener('lostpointercapture',cancel);renderCameraForm();renderCameraPreview();};
 const cancel=()=>{Object.assign(station,original);done();};rect.addEventListener('pointermove',move);rect.addEventListener('pointerup',done);rect.addEventListener('pointercancel',cancel);rect.addEventListener('lostpointercapture',cancel);
 });
 rect.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();const corner=(event.target as HTMLElement).dataset.cameraCorner,step=event.shiftKey?1:.1,dx=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,dy=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;
 Object.assign(station,corner?resize(station,corner,dx*2,dy*2):{x:Math.max(0,Math.min(100-station.width,station.x+dx)),y:Math.max(0,Math.min(100-station.width,station.y+dy))});sync();
 // Keep keyboard focus on the same handle while updating numeric values.
 renderCameraForm();
 });
}
