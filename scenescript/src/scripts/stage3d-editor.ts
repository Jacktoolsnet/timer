import {resource3DPreview} from '../lib/stage3d-resource-preview';
import {validateProject,type Project} from '../lib/model';
import {expressions3D,unique3DResourceID,defaultCharacter3D,defaultStage3D,defaultStageCamera3D,defaultActor3D,parse3DResource,MAX_3D_RESOURCE_BYTES,type Resource3D,type Character3D,type Stage3D,type Shot3D} from '../lib/stage3d';
import {createStage3DView,type Stage3DView} from './stage3d-preview';
import {showToast} from './toast';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('stage3d-'+id) as T;
export function installStage3DEditor(context:()=>{project:Project;index:number;revision:number},apply:(p:Project)=>void,replace:(p:Project)=>void,stop:()=>void){
 const dialog=$<HTMLDialogElement>('dialog'),words=JSON.parse(dialog.dataset.words!) as Record<string,string>;
 let draft:Project,index=0,origin:ReturnType<typeof context>,session=0,resourceFrame=0,resourceTicket=0;
 let resourceView:Stage3DView|undefined,sceneView:Stage3DView|undefined;
 const kind=()=>$<HTMLSelectElement>('kind').value as Resource3D['kind'];
 const library=()=>kind()==='character'?draft.characters:draft.stages;
 const chosen=()=>$<HTMLSelectElement>('resource').value;
 const report=(e:unknown)=>{$('status').textContent=e instanceof Error?e.message:String(e);};
 const validContext=()=>{const now=context();if(!dialog.open||now.project!==origin.project||now.revision!==origin.revision)throw new Error(words.stale);};
 const setShot=(shot:Shot3D|null)=>{$<HTMLTextAreaElement>('shot').value=JSON.stringify(shot,null,2);$<HTMLSelectElement>('stage').value=shot?.stage??'';refreshSpeech(shot);};
 const readShot=()=>{draft.scenes[index].stage3d=JSON.parse($<HTMLTextAreaElement>('shot').value);return validateProject(draft);};
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
  const value=library()[chosen()],label=words[kind()==='character'?'character':'stageResource'];
  $('resource-label').textContent=label;$('detail-title').textContent=value?label+' · '+(value.name||words.settings):words.settings;$('detail-id').textContent=value?chosen():'';
 }
 function queueResourcePreview(){
  cancelAnimationFrame(resourceFrame);resourceFrame=requestAnimationFrame(()=>{resourceFrame=0;if(!dialog.open)return;
   const ticket=++resourceTicket,value=library()[chosen()],host=$('resource-preview'),message=$('resource-preview-status');resourceView?.dispose();resourceView=undefined;host.replaceChildren();message.textContent='';host.closest('figure')!.hidden=!value;if(!value)return;
   try{const sample=resource3DPreview(kind(),chosen(),value);const view=createStage3DView(sample.project,sample.shot,640,480,error=>{if(dialog.open&&ticket===resourceTicket)message.textContent=error.message;},{studio:sample.studio,label:sample.label});
    resourceView=view;view.canvas.dataset.resource3dKind=kind();view.canvas.dataset.resource3dId=chosen();host.append(view.canvas);view.draw(0);
   }catch(error){message.textContent=(error as Error).message;}
  });
 }
 function fields(){
  const value=library()[chosen()],host=$('fields');host.replaceChildren();$<HTMLButtonElement>('export').disabled=!value;$<HTMLButtonElement>('remove').disabled=!value;updateResourceTitle();queueResourcePreview();
  if(!value){host.textContent=words.empty;return;}
  const group=(name:string)=>{const fieldset=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=words[name];fieldset.append(legend);const grid=document.createElement('div');grid.className='stage3d-field-grid';fieldset.append(grid);host.append(fieldset);return grid;};
  const general=group('general'),appearance=group('appearance');
  for(const [key,v] of Object.entries(value)){
   if(key==='style'||key==='expression'){
    const label=document.createElement('label'),caption=document.createElement('span'),select=document.createElement('select');label.className='stage3d-name-field';caption.textContent=words[key];select.dataset.resourceField=key;
    options(select,(key==='style'?['classic','robot','pixel','brick']:expressions3D).map(id=>[id,words[key+'_'+id]]),String(v));
    select.addEventListener('change',()=>{(value as unknown as Record<string,unknown>)[key]=select.value;queueResourcePreview();});
    label.append(caption,select);appearance.append(label);continue;
   }
   const label=document.createElement('label'),caption=document.createElement('span');caption.textContent=words[key]??key;label.append(caption);const input=document.createElement('input');input.dataset.resourceField=key;input.type=key.endsWith('Color')?'color':typeof v==='number'?'number':'text';input.value=String(v);
   if(key==='height'){input.min='1';input.max='6';input.step='.1';}if(key==='name'){input.maxLength=200;label.className='stage3d-name-field';}
   const output=document.createElement('output');if(input.type==='color'){const swatch=document.createElement('span');swatch.className='stage3d-color-swatch';output.textContent=String(v).toUpperCase();swatch.append(input,output);label.append(swatch);}else label.append(input);
   input.addEventListener('input',()=>{(value as unknown as Record<string,unknown>)[key]=input.type==='number'?input.valueAsNumber:input.value;
    if(key==='name'){updateResourceTitle();const resource=$<HTMLSelectElement>('resource').selectedOptions[0];if(resource)resource.textContent=chosen()+' · '+value.name;if(kind()==='stage')for(const option of $<HTMLSelectElement>('stage').options)if(option.value===chosen())option.textContent=chosen()+' · '+value.name;}
    if(input.type==='color')output.textContent=input.value.toUpperCase();queueResourcePreview();
   });(key.endsWith('Color')?appearance:general).append(label);
  }
 }

 function resources(selected=''){
  options($<HTMLSelectElement>('resource'),Object.entries(library()).map(([id,r])=>[id,id+' · '+r.name]),selected);fields();
  const current=$<HTMLSelectElement>('stage').value;options($<HTMLSelectElement>('stage'),[['',words.none],...Object.entries(draft.stages).map(([id,s]):[string,string]=>[id,id+' · '+s.name])],current);
 }
 function preview(){try{const p=readShot(),shot=p.scenes[index].stage3d;refreshSpeech(shot);const host=$('preview');sceneView?.dispose();sceneView=undefined;host.replaceChildren();if(!shot)return;const time=$<HTMLInputElement>('time').valueAsNumber;if(!Number.isFinite(time)||time<0||time>p.scenes[index].duration)throw new Error(words.time+': 0–'+p.scenes[index].duration);const view=createStage3DView(p,shot,640,360,report);sceneView=view;host.append(view.canvas);view.draw(time);report('');}catch(e){report(e);}}
 document.getElementById('open-stage3d')!.addEventListener('click',()=>{
  stop();origin=context();session++;draft=structuredClone(origin.project);index=origin.index;$('scene').textContent=words.scene+': '+draft.scenes[index].name;
  resources();setShot(draft.scenes[index].stage3d);$<HTMLInputElement>('time').max=String(draft.scenes[index].duration);$<HTMLInputElement>('time').value=String(Math.min(1,draft.scenes[index].duration));report('');$<HTMLDetailsElement>('scene-settings').open=false;dialog.showModal();queueResourcePreview();
 });
 $('kind').addEventListener('change',()=>resources());$('resource').addEventListener('change',fields);
 $('add').addEventListener('click',()=>{if(Object.keys(library()).length>=30){report('Maximum 30');return;}let id=kind();for(let n=2;Object.hasOwn(library(),id);n++)id=kind()+'_'+n;Object.defineProperty(library(),id,{value:kind()==='character'?defaultCharacter3D():defaultStage3D(),enumerable:true,writable:true,configurable:true});resources(id);});
 $('remove').addEventListener('click',()=>{try{readShot();const id=chosen();if(kind()==='character'?draft.scenes.some(s=>s.stage3d?.actors.some(a=>a.character===id)):draft.scenes.some(s=>s.stage3d?.stage===id))throw new Error(id+': resource is used by a scene');delete library()[id];resources();report('');}catch(e){report(e);}});
 $('stage').addEventListener('change',()=>{try{const stage=$<HTMLSelectElement>('stage').value,shot=JSON.parse($<HTMLTextAreaElement>('shot').value) as Shot3D|null;setShot(stage?{stage,camera:shot?.camera??defaultStageCamera3D(),actors:shot?.actors??[]}:null);preview();}catch(e){report(e);}});
 $('insert').addEventListener('click',()=>{try{const p=readShot(),shot=p.scenes[index].stage3d;if(!shot)throw new Error(words.stage);const id=kind()==='character'?chosen():Object.keys(p.characters)[0];if(!id)throw new Error(words.empty);if(shot.actors.length>=12)throw new Error('Maximum 12 actors');let actorId='actor';for(let n=2;shot.actors.some(a=>a.id===actorId);n++)actorId='actor_'+n;const a=defaultActor3D(id,actorId);a.duration=Math.min(4,p.scenes[index].duration);a.x=shot.actors.length*2-2;a.toX=a.x;shot.actors.push(a);setShot(shot);preview();}catch(e){report(e);}});
 $('preview-button').addEventListener('click',preview);
 $('scene-settings').addEventListener('toggle',()=>{if($<HTMLDetailsElement>('scene-settings').open&&dialog.open)preview();else{sceneView?.dispose();sceneView=undefined;$('preview').replaceChildren();}});
 $('apply').addEventListener('click',()=>{try{validContext();const next=readShot();apply(next);dialog.close();showToast(words.saved,'success');}catch(e){report(e);}});
 $('close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{session++;resourceTicket++;cancelAnimationFrame(resourceFrame);resourceFrame=0;resourceView?.dispose();resourceView=undefined;sceneView?.dispose();sceneView=undefined;$('resource-preview').replaceChildren();$('resource-preview-status').textContent='';$('preview').replaceChildren();document.getElementById('open-stage3d')!.focus();});
 const download=(name:string,data:string)=>{const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('export').addEventListener('click',()=>{try{const r=parse3DResource(JSON.stringify({format:'scenescript-3d-resource',version:'1.0',kind:kind(),id:chosen(),definition:library()[chosen()]}));download(r.id+(r.kind==='character'?'.scenecharacter.json':'.scenestage.json'),JSON.stringify(r,null,2));}catch(e){report(e);}});
 $('import').addEventListener('click',()=>$<HTMLInputElement>('file').click());
 $('file').addEventListener('change',async()=>{const input=$<HTMLInputElement>('file'),file=input.files?.[0],ticket=session;input.value='';if(!file)return;try{if(file.size>MAX_3D_RESOURCE_BYTES)throw new Error('3D resource: maximum 32 KiB');const r=parse3DResource(await file.text());if(ticket!==session)return;validContext();$<HTMLSelectElement>('kind').value=r.kind;let id=r.id;const values=r.kind==='character'?draft.characters:draft.stages;if($<HTMLSelectElement>('import-mode').value==='copy')id=unique3DResourceID(r.id,values);if(!Object.hasOwn(values,id)&&Object.keys(values).length>=30)throw new Error('Maximum 30');Object.defineProperty(values,id,{value:r.definition as Character3D&Stage3D,enumerable:true,writable:true,configurable:true});resources(id);report(words.imported);}catch(e){if(ticket===session)report(e);}});
 $('demo').addEventListener('click',async()=>{
  if(!confirm(words.confirm))return;const ticket=session,b=$<HTMLButtonElement>('demo');b.disabled=true;report(words.busy);
  try{validContext();const {stage3DExample}=await import('../lib/stage3d-example'),{exportStill}=await import('./still-export');const p=validateProject(stage3DExample),blob=await exportStill(p,6.9,new AbortController().signal);const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});if(ticket!==session)return;validContext();p.thumbnail={name:'Mika-Bo-Lina-Cover.png',data};replace(validateProject(p));dialog.close();}catch(e){if(ticket===session)report(e);}finally{b.disabled=false;}
 });
}
