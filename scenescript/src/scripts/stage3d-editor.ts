import {parseGroup3D,defaultGroup3D,defaultGroupPlacement3D} from '../lib/group3d';
import {parsePaths3D} from '../lib/path3d';
import {presetCharacterModel3D} from '../lib/stage3d-presets';
import {parseModel3D} from '../lib/model3d';
import {resource3DPreview} from '../lib/stage3d-resource-preview';
import {validateProject,type Project} from '../lib/model';
import {expressions3D,defaultCharacter3D,defaultStage3D,parseCharacter3D,parseStage3D,defaultStageCamera3D,defaultActor3D,parse3DResource,export3DResource,import3DResource,MAX_3D_RESOURCE_BYTES,type Resource3D,type Character3D,type Stage3D,type Shot3D} from '../lib/stage3d';
import {createStage3DView,type Stage3DView} from './stage3d-preview';
import {showToast} from './toast';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('stage3d-'+id) as T;
export function installStage3DEditor(context:()=>{project:Project;index:number;revision:number},apply:(p:Project)=>void,replace:(p:Project)=>void,stop:()=>void){
 const dialog=$<HTMLDialogElement>('dialog'),words=JSON.parse(dialog.dataset.words!) as Record<string,string>;
 let draft:Project,index=0,origin:ReturnType<typeof context>,session=0,resourceFrame=0,resourceTicket=0;
 const modelTexts=new Map<string,string>(),modelErrors=new Map<string,string>();
 let resourceView:Stage3DView|undefined,sceneView:Stage3DView|undefined;
 const kind=()=>$<HTMLSelectElement>('kind').value as Resource3D['kind'];
 const library=()=>kind()==='character'?draft.characters:kind()==='stage'?draft.stages:draft.groups3d;
 const chosen=()=>$<HTMLSelectElement>('resource').value;
 const report=(e:unknown)=>{$('status').textContent=e instanceof Error?e.message:String(e);};
 const validContext=()=>{const now=context();if(!dialog.open||now.project!==origin.project||now.revision!==origin.revision)throw new Error(words.stale);};
 const setShot=(shot:Shot3D|null)=>{$<HTMLTextAreaElement>('shot').value=JSON.stringify(shot,null,2);$<HTMLSelectElement>('stage').value=shot?.stage??'';refreshSpeech(shot);};
 const readShot=()=>{if(modelErrors.size)throw new Error(modelErrors.values().next().value);draft.scenes[index].stage3d=JSON.parse($<HTMLTextAreaElement>('shot').value);return validateProject(draft);};
 const options=(select:HTMLSelectElement,values:[string,string][],selected='')=>{select.replaceChildren(...values.map(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=name;return o;}));if(values.some(([id])=>id===selected))select.value=selected;};
 function refreshSpeech(shot:Shot3D|null){
  const actors=Array.isArray(shot?.actors)?shot.actors:[],select=$<HTMLSelectElement>('speech-actor'),selected=select.value;
  options(select,actors.map(a=>[a.id,a.id+' · '+(draft.characters[a.character]?.name??a.character)]),selected);
  const actor=actors.find(a=>a.id===select.value),source=$<HTMLSelectElement>('speech-source'),strength=$<HTMLInputElement>('speech-strength');
  select.disabled=!actor;source.disabled=!actor;source.value=actor?.speech?.source??'';strength.disabled=!actor?.speech;strength.value=String(actor?.speech?.strength??1);
  const n=source.value==='project'?draft.narration:source.value==='scene'?draft.scenes[index].narration:null;
  $('speech-file').textContent=n?.asset?draft.audios[n.asset]?.name??words.speechMissing:source.value?words.speechMissing:'';
 }
 function changeSpeech(){
  try{
   const p=readShot(),shot=p.scenes[index].stage3d,actor=shot?.actors.find(a=>a.id===$<HTMLSelectElement>('speech-actor').value);if(!actor)return;
   const source=$<HTMLSelectElement>('speech-source').value,strength=$<HTMLInputElement>('speech-strength').valueAsNumber;
   if(!Number.isFinite(strength)||strength<0||strength>3)throw new Error(words.speechStrength+': 0–3');
   actor.speech=source?{source:source as 'scene'|'project',strength}:null;setShot(shot);preview();
  }catch(error){report(error);}
 }
 $('speech-actor').addEventListener('change',()=>{try{refreshSpeech(readShot().scenes[index].stage3d);}catch(error){report(error);}});
 $('speech-source').addEventListener('change',changeSpeech);$('speech-strength').addEventListener('change',changeSpeech);
 function updateResourceTitle(){
  const value=library()[chosen()],label=words[kind()==='character'?'objects':kind()==='group'?'groupResource':'stageResource'];
  $('resource-label').textContent=label;$('detail-title').textContent=value?label+' · '+(value.name||words.settings):words.settings;$('detail-id').textContent=value?chosen():'';
 }
 function queueResourcePreview(){
  cancelAnimationFrame(resourceFrame);resourceFrame=requestAnimationFrame(()=>{resourceFrame=0;if(!dialog.open)return;
   const ticket=++resourceTicket,value=library()[chosen()],host=$('resource-preview'),message=$('resource-preview-status');resourceView?.dispose();resourceView=undefined;host.replaceChildren();message.textContent='';host.closest('figure')!.hidden=!value;if(!value)return;
   try{const animation=$<HTMLSelectElement>('model-animation')?.value??'',time=$<HTMLInputElement>('model-time')?.valueAsNumber??0;const sample=resource3DPreview(kind(),chosen(),value,animation,draft.characters,draft.assets);const view=createStage3DView(sample.project,sample.shot,640,480,error=>{if(dialog.open&&ticket===resourceTicket)message.textContent=error.message;},{studio:sample.studio,label:sample.label});
    resourceView=view;view.canvas.dataset.resource3dKind=kind();view.canvas.dataset.resource3dId=chosen();host.append(view.canvas);view.draw(Number.isFinite(time)?Math.min(time,sample.project.scenes[0].duration-1e-6):0);
   }catch(error){message.textContent=(error as Error).message;}
  });
 }
 function fields(){
  const value=library()[chosen()] as Character3D|Stage3D,host=$('fields');host.replaceChildren();$<HTMLButtonElement>('export').disabled=!value;$<HTMLButtonElement>('remove').disabled=!value;updateResourceTitle();queueResourcePreview();
  if(!value){host.textContent=words.empty;return;}
  if(kind()==='group'){
   const resourceKey='group:'+chosen(),section=document.createElement('details'),title=document.createElement('summary'),input=document.createElement('textarea'),message=document.createElement('p'),help=document.createElement('p'),time=document.createElement('input'),label=document.createElement('label');
   title.textContent=words.groupEditor;section.open=true;section.className='model3d-editor';input.id='stage3d-group';input.rows=15;input.maxLength=128*1024;input.spellcheck=false;input.setAttribute('aria-label',words.groupEditor);input.value=modelTexts.get(resourceKey)??JSON.stringify(value,null,2);message.className='model3d-error';message.setAttribute('role','status');message.textContent=modelErrors.get(resourceKey)??'';if(modelErrors.has(resourceKey))input.setAttribute('aria-invalid','true');help.className='small-hint';help.textContent=words.groupHint;
   time.id='stage3d-model-time';time.type='range';time.min='0';time.max='12';time.step='.01';time.value='0';label.textContent=words.modelTime;time.setAttribute('aria-label',words.modelTime);label.append(time);time.addEventListener('input',queueResourcePreview);
   input.addEventListener('input',()=>{modelTexts.set(resourceKey,input.value);try{const definition=parseGroup3D(JSON.parse(input.value),draft.characters,resourceKey);draft.groups3d[chosen()]=definition;modelErrors.delete(resourceKey);message.textContent='';input.removeAttribute('aria-invalid');updateResourceTitle();const option=$<HTMLSelectElement>('resource').selectedOptions[0];if(option)option.textContent=chosen()+' · '+definition.name;queueResourcePreview();}catch(e){message.textContent=(e as Error).message;modelErrors.set(resourceKey,message.textContent);input.setAttribute('aria-invalid','true');}});
   section.append(title,help,input,label,message);host.append(section);return;
  }
  const group=(name:string)=>{const fieldset=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=words[name];fieldset.append(legend);const grid=document.createElement('div');grid.className='stage3d-field-grid';fieldset.append(grid);host.append(fieldset);return grid;};
  const general=group('general'),appearance=group('appearance');
  for(const [key,v] of Object.entries({...((kind()==='stage')?{transparentBackground:false}:{}),...value})){
   if(key==='model'||key==='paths')continue;
   if(key==='style'||key==='expression'){
    const label=document.createElement('label'),caption=document.createElement('span'),select=document.createElement('select');label.className='stage3d-name-field';caption.textContent=words[key];select.dataset.resourceField=key;
    options(select,(key==='style'?['classic','robot','pixel','brick']:expressions3D).map(id=>[id,words[key+'_'+id]]),String(v));
    select.addEventListener('change',()=>{
     const resourceKey=kind()+':'+chosen(),regenerate=key==='style'&&!modelTexts.has(resourceKey)&&JSON.stringify(value.model)===JSON.stringify(presetCharacterModel3D((value as Character3D).style));
     (value as unknown as Record<string,unknown>)[key]=select.value;
     if(regenerate){value.model=presetCharacterModel3D(select.value);fields();}else queueResourcePreview();
    });
    label.append(caption,select);appearance.append(label);continue;
   }
   const label=document.createElement('label'),caption=document.createElement('span');caption.textContent=words[key]??key;label.append(caption);const input=document.createElement('input');input.dataset.resourceField=key;input.type=key.endsWith('Color')?'color':typeof v==='number'?'number':typeof v==='boolean'?'checkbox':'text';input.value=String(v);if(typeof v==='boolean')input.checked=v;
   if(key==='height'){input.min='1';input.max='6';input.step='.1';}if(key==='name'){input.maxLength=200;label.className='stage3d-name-field';}
   const output=document.createElement('output');if(input.type==='color'){const swatch=document.createElement('span');swatch.className='stage3d-color-swatch';output.textContent=String(v).toUpperCase();swatch.append(input,output);label.append(swatch);}else label.append(input);
   input.addEventListener('input',()=>{(value as unknown as Record<string,unknown>)[key]=input.type==='number'?input.valueAsNumber:input.type==='checkbox'?input.checked:input.value;
    if(key==='name'){updateResourceTitle();const resource=$<HTMLSelectElement>('resource').selectedOptions[0];if(resource)resource.textContent=chosen()+' · '+value.name;if(kind()==='stage')for(const option of $<HTMLSelectElement>('stage').options)if(option.value===chosen())option.textContent=chosen()+' · '+value.name;}
    if(input.type==='color')output.textContent=input.value.toUpperCase();queueResourcePreview();
   });(key.endsWith('Color')?appearance:general).append(label);
  }
  if(kind()==='stage'){
   const pathsKey='stage:'+chosen()+':paths',section=document.createElement('details'),title=document.createElement('summary'),input=document.createElement('textarea'),message=document.createElement('p');
   title.textContent=words.paths;input.id='stage3d-paths';input.rows=8;input.spellcheck=false;input.maxLength=128*1024;input.setAttribute('aria-label',words.paths);input.value=modelTexts.get(pathsKey)??JSON.stringify((value as Stage3D).paths??{},null,2);message.textContent=modelErrors.get(pathsKey)??'';message.className='model3d-error';message.setAttribute('role','status');
   if(modelErrors.has(pathsKey))input.setAttribute('aria-invalid','true');section.className='model3d-editor';
   input.addEventListener('input',()=>{modelTexts.set(pathsKey,input.value);try{(value as Stage3D).paths=parsePaths3D(JSON.parse(input.value),'stage.paths');modelErrors.delete(pathsKey);message.textContent='';input.removeAttribute('aria-invalid');}catch(e){message.textContent=(e as Error).message;modelErrors.set(pathsKey,message.textContent);input.setAttribute('aria-invalid','true');}});
   const help=document.createElement('p');help.className='small-hint';help.textContent=words.pathHint;section.append(title,help,input,message);host.append(section);
  }
  const details=document.createElement('details'),summary=document.createElement('summary'),textarea=document.createElement('textarea'),hint=document.createElement('p'),error=document.createElement('p');
  const resourceKey=kind()+':'+chosen();details.className='model3d-editor';summary.textContent=words.modelEditor;details.open=Boolean(value.model);
  textarea.id='stage3d-model';textarea.setAttribute('aria-label',words.modelEditor);textarea.spellcheck=false;textarea.rows=14;textarea.maxLength=512*1024;textarea.value=modelTexts.get(resourceKey)??JSON.stringify(value.model,null,2);
  hint.className='small-hint';hint.textContent=words.modelHint;error.className='model3d-error';error.setAttribute('role','status');error.textContent=modelErrors.get(resourceKey)??'';if(modelErrors.has(resourceKey))textarea.setAttribute('aria-invalid','true');
  const controls=document.createElement('div');controls.className='stage3d-field-grid';
  const animation=document.createElement('select');animation.id='stage3d-model-animation';animation.setAttribute('aria-label',words.modelAnimation);
  const time=document.createElement('input');time.id='stage3d-model-time';time.type='range';time.min='0';time.max='4';time.step='.01';time.value='0';time.setAttribute('aria-label',words.modelTime);
  const animations=()=>{options(animation,[['',words.modelRest],...Object.keys(value.model?.animations??{}).map(id=>[id,id] as [string,string])]);animation.disabled=!value.model;time.disabled=!value.model;};
  animations();animation.addEventListener('change',()=>{time.max=String(value.model?.animations[animation.value]?.duration??4);time.value='0';queueResourcePreview();});time.addEventListener('input',queueResourcePreview);
  textarea.addEventListener('input',()=>{
   modelTexts.set(resourceKey,textarea.value);
   try{value.model=parseModel3D(JSON.parse(textarea.value),resourceKey+'.model');modelErrors.delete(resourceKey);error.textContent='';textarea.removeAttribute('aria-invalid');animations();time.value='0';output.textContent='0.00 s';queueResourcePreview();}
   catch(e){const message=(e as Error).message;modelErrors.set(resourceKey,message);error.textContent=message;textarea.setAttribute('aria-invalid','true');}
  });
  const animationLabel=document.createElement('label'),timeLabel=document.createElement('label'),output=document.createElement('output');animationLabel.textContent=words.modelAnimation;timeLabel.textContent=words.modelTime;output.textContent='0.00 s';
  animationLabel.append(animation);timeLabel.append(time,output);time.addEventListener('input',()=>output.textContent=Number(time.value).toFixed(2)+' s');animation.addEventListener('change',()=>output.textContent='0.00 s');
  controls.append(animationLabel,timeLabel);details.append(summary,hint,textarea,controls,error);host.append(details);

 }

 function resources(selected=''){
  options($<HTMLSelectElement>('resource'),Object.entries(library()).map(([id,r])=>[id,id+' · '+r.name]),selected);fields();
  const current=$<HTMLSelectElement>('stage').value;options($<HTMLSelectElement>('stage'),[['',words.none],...Object.entries(draft.stages).map(([id,s]):[string,string]=>[id,id+' · '+s.name])],current);
 }
 function preview(){try{const p=readShot(),shot=p.scenes[index].stage3d;refreshSpeech(shot);const host=$('preview');sceneView?.dispose();sceneView=undefined;host.replaceChildren();if(!shot)return;const time=$<HTMLInputElement>('time').valueAsNumber;if(!Number.isFinite(time)||time<0||time>p.scenes[index].duration)throw new Error(words.time+': 0–'+p.scenes[index].duration);const view=createStage3DView(p,shot,640,360,report);sceneView=view;host.append(view.canvas);view.draw(time);report('');}catch(e){report(e);}}
 document.getElementById('open-stage3d')!.addEventListener('click',()=>{
  stop();modelTexts.clear();modelErrors.clear();origin=context();session++;draft=structuredClone(origin.project);index=origin.index;$('scene').textContent=words.scene+': '+draft.scenes[index].name;
  resources();setShot(draft.scenes[index].stage3d);$<HTMLInputElement>('time').max=String(draft.scenes[index].duration);$<HTMLInputElement>('time').value=String(Math.min(1,draft.scenes[index].duration));report('');$<HTMLDetailsElement>('scene-settings').open=false;dialog.showModal();queueResourcePreview();
 });
 $('kind').addEventListener('change',()=>resources());$('resource').addEventListener('change',fields);
 $('add').addEventListener('click',()=>{if(kind()==='group'&&!Object.keys(draft.characters).length){report(words.empty);return;}if(Object.keys(library()).length>=30){report('Maximum 30');return;}let id=kind();for(let n=2;Object.hasOwn(library(),id);n++)id=kind()+'_'+n;Object.defineProperty(library(),id,{value:kind()==='character'?parseCharacter3D(defaultCharacter3D()):kind()==='stage'?parseStage3D(defaultStage3D()):parseGroup3D({...defaultGroup3D(),characters:Object.keys(draft.characters).slice(0,1)},draft.characters),enumerable:true,writable:true,configurable:true});resources(id);});
 $('remove').addEventListener('click',()=>{try{readShot();const id=chosen();if(kind()==='character'?(draft.scenes.some(s=>s.stage3d?.actors.some(a=>a.character===id))||Object.values(draft.groups3d).some(g=>g.characters.includes(id))):kind()==='group'?draft.scenes.some(s=>s.stage3d?.groups?.some(g=>g.group===id)):draft.scenes.some(s=>s.stage3d?.stage===id))throw new Error(id+': resource is used by a scene');delete library()[id];modelTexts.delete(kind()+':'+id);modelErrors.delete(kind()+':'+id);modelTexts.delete(kind()+':'+id+':paths');modelErrors.delete(kind()+':'+id+':paths');resources();report('');}catch(e){report(e);}});
 $('stage').addEventListener('change',()=>{try{const stage=$<HTMLSelectElement>('stage').value,shot=JSON.parse($<HTMLTextAreaElement>('shot').value) as Shot3D|null;setShot(stage?{...shot,stage,camera:shot?.camera??defaultStageCamera3D(),actors:shot?.actors??[]}:null);preview();}catch(e){report(e);}});
 $('insert').addEventListener('click',()=>{try{const p=readShot(),shot=p.scenes[index].stage3d;if(!shot)throw new Error(words.stage);if(kind()==='group'){const group=chosen();if(!group)throw new Error(words.empty);const values=shot.groups??=[];if(values.length>=16)throw new Error('Maximum 16 groups');let id='group';for(let n=2;values.some(v=>v.id===id);n++)id='group_'+n;values.push(defaultGroupPlacement3D(group,id));validateProject(p);setShot(shot);preview();return;}const id=kind()==='character'?chosen():Object.keys(p.characters)[0];if(!id)throw new Error(words.empty);if(shot.actors.length>=12)throw new Error('Maximum 12 actors');let actorId='actor';for(let n=2;shot.actors.some(a=>a.id===actorId);n++)actorId='actor_'+n;const a=defaultActor3D(id,actorId);a.duration=Math.min(4,p.scenes[index].duration);a.x=shot.actors.length*2-2;a.toX=a.x;shot.actors.push(a);setShot(shot);preview();}catch(e){report(e);}});
 $('preview-button').addEventListener('click',preview);
 $('scene-settings').addEventListener('toggle',()=>{if($<HTMLDetailsElement>('scene-settings').open&&dialog.open)preview();else{sceneView?.dispose();sceneView=undefined;$('preview').replaceChildren();}});
 $('apply').addEventListener('click',()=>{try{validContext();const next=readShot();apply(next);dialog.close();showToast(words.saved,'success');}catch(e){report(e);}});
 $('close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{session++;resourceTicket++;cancelAnimationFrame(resourceFrame);resourceFrame=0;resourceView?.dispose();resourceView=undefined;sceneView?.dispose();sceneView=undefined;$('resource-preview').replaceChildren();$('resource-preview-status').textContent='';$('preview').replaceChildren();document.getElementById('open-stage3d')!.focus();});
 const download=(name:string,data:string)=>{const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('export').addEventListener('click',()=>{try{const error=modelErrors.get(kind()+':'+chosen())??modelErrors.get(kind()+':'+chosen()+':paths');if(error)throw new Error(error);const r=export3DResource(kind(),chosen(),draft);const data=JSON.stringify(r,null,2);if(new TextEncoder().encode(data).length>MAX_3D_RESOURCE_BYTES)throw new Error('3D resource: maximum 32 MiB');download(r.id+(r.kind==='character'?'.scenecharacter.json':r.kind==='group'?'.scenegroup.json':'.scenestage.json'),data);}catch(e){report(e);}});
 $('import').addEventListener('click',()=>$<HTMLInputElement>('file').click());
 $('file').addEventListener('change',async()=>{const input=$<HTMLInputElement>('file'),file=input.files?.[0],ticket=session;input.value='';if(!file)return;try{if(file.size>MAX_3D_RESOURCE_BYTES)throw new Error('3D resource: maximum 32 MiB');const r=parse3DResource(await file.text());if(ticket!==session)return;validContext();const imported=import3DResource(r,draft,$<HTMLSelectElement>('import-mode').value as 'copy'|'update'),id=imported.id;draft.characters=imported.characters;draft.stages=imported.stages;draft.groups3d=imported.groups3d;draft.assets=imported.assets;$<HTMLSelectElement>('kind').value=r.kind;modelTexts.delete(r.kind+':'+id);modelErrors.delete(r.kind+':'+id);modelTexts.delete(r.kind+':'+id+':paths');modelErrors.delete(r.kind+':'+id+':paths');resources(id);report(words.imported);}catch(e){if(ticket===session)report(e);}});
 $('demo').addEventListener('click',async()=>{
  if(!confirm(words.confirm))return;const ticket=session,b=$<HTMLButtonElement>('demo');b.disabled=true;report(words.busy);
  try{validContext();const type=$<HTMLSelectElement>('demo-type').value,custom=type==='construction',paths=type==='paths';const example=paths?(await import('../lib/path3d-example')).path3DExample:custom?(await import('../lib/model3d-example')).construction3DExample:(await import('../lib/stage3d-example')).stage3DExample,{exportStill}=await import('./still-export');const p=validateProject(example),blob=await exportStill(p,paths?26:custom?2.6:6.9,new AbortController().signal);const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});if(ticket!==session)return;validContext();p.thumbnail={name:paths?'Fahrpfade-Cover.png':custom?'Baukasten-Cover.png':'Mika-Bo-Lina-Cover.png',data};replace(validateProject(p));dialog.close();}catch(e){if(ticket===session)report(e);}finally{b.disabled=false;}
 });
}
