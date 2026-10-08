import {demoProject,newScene,newElement,parseProject,formats,fonts,animations,animationState,locateTime,MAX_FILE_BYTES,MAX_IMAGE_BYTES,validateImage,type Project,type Scene,type Element} from '../lib/model';
import {storageAllowed} from '../lib/storage';
import {screenWakeLock} from '../lib/wake-lock';
import {STORAGE_KEY} from '../lib/engine';
import type {EditorKey} from '../lib/editor-i18n';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const words=JSON.parse($('editor').dataset.words!) as Record<EditorKey,string>;
const t=(key:string)=>words[key as EditorKey]||key;
const keepScreenAwake=screenWakeLock($('wake-status'),t('wakeActive'),t('wakeUnavailable'));
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
 const list=$('scene-list');list.replaceChildren();
 project.scenes.forEach((s,i)=>{const li=document.createElement('li'),b=button(`${i+1}. ${s.name} · ${s.duration}s`,()=>selectScene(i));b.setAttribute('aria-current',String(i===sceneIndex));li.append(b);list.append(li);});
 ($('delete-scene') as HTMLButtonElement).disabled=project.scenes.length===1;($('scene-up') as HTMLButtonElement).disabled=sceneIndex===0;($('scene-down') as HTMLButtonElement).disabled=sceneIndex===project.scenes.length-1;($('add-scene') as HTMLButtonElement).disabled=project.scenes.length>=100;
 renderForms();renderElements();renderAssets();draw();
}
function renderElements(){const list=$('element-list');list.replaceChildren();current().elements.forEach((e,i)=>{const li=document.createElement('li'),b=button(`${i+1}. ${t(e.type)} · ${e.type==='text'?e.text.slice(0,32):e.id.slice(0,8)}`,()=>{selectedId=e.id;renderForms();renderElements();draw();});b.setAttribute('aria-current',String(e.id===selectedId));li.append(b);list.append(li);});}
function renderAssets(){const list=$('asset-list');list.replaceChildren();for(const [id,asset] of Object.entries(project.assets)){const row=document.createElement('div');row.className='asset-row';const img=document.createElement('img');img.src=asset.data;img.alt='';const name=document.createElement('span');name.textContent=asset.name;const remove=button('×',()=>{if(!confirm(t('remove')+' '+asset.name+'?'))return;delete project.assets[id];project.scenes.forEach(s=>{if(s.backgroundAsset===id)s.backgroundAsset='';s.elements.forEach(e=>{if(e.asset===id)e.asset='';});});changed();refresh();});remove.setAttribute('aria-label',`${t('remove')}: ${asset.name}`);row.append(img,name,remove);list.append(row);}}
function field(form:HTMLElement,key:string,value:string|number|boolean,kind:string,action:(value:string|number|boolean)=>void,options?:readonly string[],min?:number,max?:number){
 const label=document.createElement('label');label.append(document.createTextNode(t(key)));
 let input:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
 if(kind==='select'){input=document.createElement('select');options?.forEach(option=>{const o=document.createElement('option');o.value=option;o.textContent=key==='asset'||key==='backgroundAsset'?(option?project.assets[option].name:t('none')):t(option);input.append(o);});input.value=String(value);}
 else if(kind==='textarea'){input=document.createElement('textarea');input.value=String(value);input.maxLength=10000;}
 else{input=document.createElement('input');input.type=kind;if(kind==='checkbox')input.checked=Boolean(value);else input.value=String(value);if(kind==='number'){input.step='any';if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);}if(kind==='text')input.maxLength=200;}
 input.name=key;
 input.addEventListener(kind==='textarea'||kind==='text'||kind==='color'?'input':'change',()=>{
  if(input instanceof HTMLInputElement&&!input.checkValidity()){input.reportValidity();return;}
  const value=kind==='checkbox'?(input as HTMLInputElement).checked:kind==='number'?(input as HTMLInputElement).valueAsNumber:input.value;
  action(value);
 });label.append(input);form.append(label);
}
function updateScene(key:keyof Scene,value:unknown){const previous=current()[key];(current() as unknown as Record<string,unknown>)[key]=value;try{parseProject(JSON.stringify(project));stop();time=offset(sceneIndex);changed();draw();if(key==='name'||key==='duration')renderSceneLabels();}catch(error){(current() as unknown as Record<string,unknown>)[key]=previous;status(t('error')+' '+(error as Error).message);renderForms();}}
function renderSceneLabels(){const buttons=$('scene-list').querySelectorAll('button');project.scenes.forEach((s,i)=>{buttons[i].textContent=`${i+1}. ${s.name} · ${s.duration}s`;});}
function updateElement(key:keyof Element,value:unknown){const e=selected();if(!e)return;const old=e[key];(e as unknown as Record<string,unknown>)[key]=value;try{parseProject(JSON.stringify(project));stop();time=offset(sceneIndex)+e.at+e.animationDuration;time=Math.min(time,offset(sceneIndex)+current().duration-0.001);changed();draw(false);if(key==='text')renderElements();}catch(error){(e as unknown as Record<string,unknown>)[key]=old;status(t('error')+' '+(error as Error).message);renderForms();}}
function renderForms(){
 const form=$('scene-form');form.replaceChildren();const s=current();
 field(form,'name',s.name,'text',v=>updateScene('name',v));field(form,'duration',s.duration,'number',v=>updateScene('duration',v),undefined,0.1,3600);
 field(form,'background',s.background,'color',v=>updateScene('background',v));field(form,'backgroundAsset',s.backgroundAsset,'select',v=>updateScene('backgroundAsset',v),['',...Object.keys(project.assets)]);
 field(form,'transition',s.transition,'select',v=>updateScene('transition',v),['none','fade']);field(form,'transitionDuration',s.transitionDuration,'number',v=>updateScene('transitionDuration',v),undefined,0.01,3600);
 const ef=$('element-form');ef.replaceChildren();const e=selected();if(!e){const p=document.createElement('p');p.className='small-hint';p.textContent=t('empty');ef.append(p);return;}
 if(e.type==='text'){field(ef,'text',e.text,'textarea',v=>updateElement('text',v));field(ef,'font',e.font,'select',v=>updateElement('font',v),fonts);field(ef,'fontSize',e.fontSize,'number',v=>updateElement('fontSize',v),undefined,1,500);field(ef,'align',e.align,'select',v=>updateElement('align',v),['left','center','right']);field(ef,'bold',e.bold,'checkbox',v=>updateElement('bold',v));}
 if(e.type==='image'){field(ef,'asset',e.asset,'select',v=>updateElement('asset',v),['',...Object.keys(project.assets)]);field(ef,'fit',e.fit,'select',v=>updateElement('fit',v),['contain','cover']);}
 if(e.type!=='image')field(ef,'color',e.color,'color',v=>updateElement('color',v));
 for(const [key,min,max] of [['x',-100,100],['y',-100,100],['width',0.1,200],['height',0.1,200],['opacity',0,1],['rotation',-360,360],['radius',0,1000]] as const)field(ef,key,e[key],'number',v=>updateElement(key,v),undefined,min,max);
 field(ef,'animation',e.animation,'select',v=>updateElement('animation',v),animations);field(ef,'at',e.at,'number',v=>updateElement('at',v),undefined,0,s.duration);field(ef,'animationDuration',e.animationDuration,'number',v=>updateElement('animationDuration',v),undefined,0.01,3600);
 const actions=document.createElement('div');actions.className='compact-actions';
 actions.append(button(t('duplicate'),()=>{if(s.elements.length>=100)return;const copy={...e,id:crypto.randomUUID()};s.elements.push(copy);selectedId=copy.id;changed();refresh();}),button(t('up'),()=>moveElement(-1)),button(t('down'),()=>moveElement(1)),button(t('remove'),()=>{s.elements=s.elements.filter(item=>item.id!==e.id);selectedId='';changed();refresh();}));ef.append(actions);
}
function moveElement(delta:number){const s=current(),index=s.elements.findIndex(e=>e.id===selectedId),next=index+delta;if(next<0||next>=s.elements.length)return;[s.elements[index],s.elements[next]]=[s.elements[next],s.elements[index]];changed();refresh();}
const stage=$('stage'),stageFrame=$('stage-frame');
function resize(){const [w,h]=formats[project.format];stage.style.width=`${w}px`;stage.style.height=`${h}px`;stage.style.transform=`scale(${stageFrame.clientWidth/w})`;stageFrame.style.aspectRatio=`${w}/${h}`;document.documentElement.style.setProperty('--project-ratio',String(w/h));}
new ResizeObserver(resize).observe(stageFrame);
// Retain image/text nodes during playback: only their animation state changes per frame.
let stageKey='', views:{element:Element;node:HTMLDivElement;text?:HTMLSpanElement}[]=[],backgroundImage:HTMLImageElement|undefined;
function draw(follow=true){
 const at=locateTime(project,time);
 if(follow&&at.index!==sceneIndex){sceneIndex=at.index;selectedId='';renderForms();renderElements();$('scene-list').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===sceneIndex)));}
 const s=project.scenes[at.index];
 const key=`${revision}:${at.index}:${project.format}:${playing}:${recording}:${selectedId}`;
 if(stageKey!==key){
  stageKey=key;stage.replaceChildren();views=[];backgroundImage=undefined;stage.style.background=s.background;resize();
  const [w,h]=formats[project.format];
  if(s.backgroundAsset){backgroundImage=document.createElement('img');backgroundImage.className='scene-background';backgroundImage.src=project.assets[s.backgroundAsset].data;backgroundImage.alt='';stage.append(backgroundImage);}
  s.elements.forEach(e=>{
   const node=document.createElement('div');node.className='scene-element'+(!playing&&e.id===selectedId?' selected':'');
   Object.assign(node.style,{left:`${e.x*w/100}px`,top:`${e.y*h/100}px`,width:`${e.width*w/100}px`,height:`${e.height*h/100}px`,color:e.color,fontFamily:e.font,fontSize:`${e.fontSize}px`,fontWeight:e.bold?'700':'400',textAlign:e.align,justifyContent:e.align==='left'?'flex-start':e.align==='right'?'flex-end':'center',borderRadius:`${e.radius}px`});
   let text:HTMLSpanElement|undefined;
   if(e.type==='text'){text=document.createElement('span');text.style.width='100%';node.append(text);}
   else if(e.type==='shape')node.style.background=e.color;
   else if(e.asset){const img=document.createElement('img');img.src=project.assets[e.asset].data;img.alt=project.assets[e.asset].name;img.style.objectFit=e.fit;node.append(img);}
   else{node.textContent=t('image');node.style.background='#ffffff22';}
   node.addEventListener('click',()=>{if(playing||recording)return;selectedId=e.id;renderForms();renderElements();draw();});
   stage.append(node);views.push({element:e,node,text});
  });
 }
 const sceneOpacity=s.transition==='fade'&&playing?Math.min(1,at.local/s.transitionDuration):1;
 if(backgroundImage)backgroundImage.style.opacity=String(sceneOpacity);
 views.forEach(({element,node,text})=>{const state=animationState(element,at.local);node.style.opacity=String(state.opacity*sceneOpacity);node.style.visibility=state.visible?'visible':'hidden';node.style.transform=state.transform;if(text&&text.textContent!==state.text)text.textContent=state.text;});
 ($('timeline') as HTMLInputElement).max=String(total());($('timeline') as HTMLInputElement).value=String(time);$('time-label').textContent=`${time.toFixed(1)} / ${total().toFixed(1)} s`;
 ($('play') as HTMLButtonElement).disabled=playing;($('pause') as HTMLButtonElement).disabled=!playing;
}
function stop(){playing=false;cancelAnimationFrame(frame);keepScreenAwake(false);}
function tick(now:number){time=Math.min(total(),baseTime+(now-started)/1000);draw();if(time>=total()){stop();draw();return;}frame=requestAnimationFrame(tick);}
function play(){if(countdownTimer)return;if(time>=total())time=0;baseTime=time;started=performance.now();playing=true;keepScreenAwake(true);frame=requestAnimationFrame(tick);}
$('play').addEventListener('click',play);$('pause').addEventListener('click',()=>{stop();draw();});$('reset').addEventListener('click',()=>{stop();time=offset(sceneIndex);draw();});
$('timeline').addEventListener('input',()=>{stop();time=Number(($('timeline') as HTMLInputElement).value);draw();});
$('safe-toggle').addEventListener('change',()=>{$('safe-overlay').hidden=!($('safe-toggle') as HTMLInputElement).checked;});
function replace(next:Project){stop();revision++;project=next;sceneIndex=0;selectedId='';time=0;dirty=false;persist();refresh();status(t('ready'));}
const canReplace=()=>!dirty||confirm(t('unsaved'));
$('new-project').addEventListener('click',()=>{if(canReplace()){replace({version:'1.0',title:'SceneScript',format:'landscape',assets:{},scenes:[newScene()]});changed();}});
$('project-title').addEventListener('input',()=>{project.title=($('project-title') as HTMLInputElement).value;changed();});
$('project-format').addEventListener('change',()=>{project.format=($('project-format') as HTMLSelectElement).value as Project['format'];changed();draw();});
$('add-scene').addEventListener('click',()=>{if(project.scenes.length>=100)return;project.scenes.push(newScene());changed();selectScene(project.scenes.length-1);});
$('duplicate-scene').addEventListener('click',()=>{if(project.scenes.length>=100)return;const copy=structuredClone(current());copy.id=crypto.randomUUID();copy.elements.forEach(e=>e.id=crypto.randomUUID());project.scenes.splice(sceneIndex+1,0,copy);changed();selectScene(sceneIndex+1);});
$('delete-scene').addEventListener('click',()=>{if(project.scenes.length===1)return;if(!confirm(t('remove')+' '+current().name+'?'))return;project.scenes.splice(sceneIndex,1);changed();selectScene(Math.min(sceneIndex,project.scenes.length-1));});
for(const [id,delta] of [['scene-up',-1],['scene-down',1]] as const)$ (id).addEventListener('click',()=>{const next=sceneIndex+delta;if(next<0||next>=project.scenes.length)return;[project.scenes[sceneIndex],project.scenes[next]]=[project.scenes[next],project.scenes[sceneIndex]];changed();selectScene(next);});
document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(b=>b.addEventListener('click',()=>{if(current().elements.length>=100)return;const e=newElement(b.dataset.add as Element['type']);if(e.type==='image')e.asset=Object.keys(project.assets)[0]||'';current().elements.push(e);selectedId=e.id;stop();time=offset(sceneIndex)+Math.min(current().duration-0.001,e.animationDuration);changed();refresh();}));
function download(){try{parseProject(JSON.stringify(project));const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});if(blob.size>MAX_FILE_BYTES)throw new Error('JSON: maximum 30 MiB');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(project.title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,80)||'project')+'.scenescript.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);dirty=false;status(t('saved'));}catch(error){status(t('error')+' '+(error as Error).message);}}
$('save-project').addEventListener('click',download);
$('load-project').addEventListener('click',()=>($('project-file') as HTMLInputElement).click());
$('project-file').addEventListener('change',async()=>{const input=$('project-file') as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;try{if(file.size>MAX_FILE_BYTES)throw new Error('JSON: maximum 30 MiB');const next=parseProject(await file.text());await preload(next);if(canReplace())replace(next);}catch(error){status(t('error')+' '+(error as Error).message);}});
const dialog=$('json-dialog') as HTMLDialogElement;
$('open-json').addEventListener('click',()=>{($('json-input') as HTMLTextAreaElement).value=JSON.stringify(project,null,2);$('json-status').textContent='';dialog.showModal();});
$('close-json').addEventListener('click',()=>dialog.close());
$('import-json').addEventListener('click',async()=>{try{const next=parseProject(($('json-input') as HTMLTextAreaElement).value);await preload(next);if(canReplace()){replace(next);dialog.close();}}catch(error){$('json-status').textContent=t('error')+' '+(error as Error).message;}});
$('copy-json').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(($('json-input') as HTMLTextAreaElement).value);$('json-status').textContent=t('copied');}catch{($('json-input') as HTMLTextAreaElement).select();$('json-status').textContent='Ctrl+C / Cmd+C';}});
$('import-image').addEventListener('click',()=>($('image-file') as HTMLInputElement).click());
async function decodeImage(data:string){const image=new Image();image.src=data;await image.decode();if(image.naturalWidth*image.naturalHeight>40_000_000)throw new Error('Image: maximum 40 megapixels');}
async function preload(p:Project){await Promise.all(Object.values(p.assets).map(a=>decodeImage(a.data)));}
$('image-file').addEventListener('change',async()=>{const input=$('image-file') as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;const target=project;try{if(Object.keys(project.assets).length>=100)throw new Error('assets: maximum 100');if(file.size>MAX_IMAGE_BYTES)throw new Error('Image: maximum 8 MiB');if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG / JPEG / WebP');const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Image read failed'));reader.readAsDataURL(file);});validateImage(data);await decodeImage(data);if(project!==target)return;const id=crypto.randomUUID();project.assets[id]={name:file.name.slice(0,200),data};try{parseProject(JSON.stringify(project));}catch(error){delete project.assets[id];throw error;}const e=selected();if(e?.type==='image')e.asset=id;changed();refresh();}catch(error){status(t('error')+' '+(error as Error).message);}});
$('focus').addEventListener('click',async()=>{
 if(($('focus') as HTMLButtonElement).disabled||recording)return;
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
 if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
 refresh();$('focus').focus();
}
$('exit-focus').addEventListener('click',exit);
let controlsTimer:ReturnType<typeof setTimeout>|undefined;
function revealControls(){if(!recording)return;document.body.classList.add('controls-visible');clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>document.body.classList.remove('controls-visible'),1500);}
document.addEventListener('pointermove',revealControls);
document.addEventListener('pointerdown',revealControls);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&recording)exit();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&recording){exit();return;}if(event.code==='Space'&&recording){event.preventDefault();if(document.body.classList.contains('recording-ready')){startCountdown();return;}if(playing){stop();draw();}else play();}});
refresh();
