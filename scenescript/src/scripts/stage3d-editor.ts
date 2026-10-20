import {validateProject,type Project} from '../lib/model';
import {unique3DResourceID,defaultCharacter3D,defaultStage3D,defaultStageCamera3D,defaultActor3D,parse3DResource,MAX_3D_RESOURCE_BYTES,type Resource3D,type Character3D,type Stage3D,type Shot3D} from '../lib/stage3d';
import {createStage3DView} from './stage3d-preview';
import {showToast} from './toast';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('stage3d-'+id) as T;
export function installStage3DEditor(context:()=>{project:Project;index:number;revision:number},apply:(p:Project)=>void,replace:(p:Project)=>void,stop:()=>void){
 const dialog=$<HTMLDialogElement>('dialog'),words=JSON.parse(dialog.dataset.words!) as Record<string,string>;
 let draft:Project,index=0,origin:ReturnType<typeof context>,session=0;
 const kind=()=>$<HTMLSelectElement>('kind').value as Resource3D['kind'];
 const library=()=>kind()==='character'?draft.characters:draft.stages;
 const chosen=()=>$<HTMLSelectElement>('resource').value;
 const report=(e:unknown)=>{$('status').textContent=e instanceof Error?e.message:String(e);};
 const validContext=()=>{const now=context();if(!dialog.open||now.project!==origin.project||now.revision!==origin.revision)throw new Error(words.stale);};
 const setShot=(shot:Shot3D|null)=>{$<HTMLTextAreaElement>('shot').value=JSON.stringify(shot,null,2);$<HTMLSelectElement>('stage').value=shot?.stage??'';};
 const readShot=()=>{draft.scenes[index].stage3d=JSON.parse($<HTMLTextAreaElement>('shot').value);return validateProject(draft);};
 const options=(select:HTMLSelectElement,values:[string,string][],selected='')=>{select.replaceChildren(...values.map(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=name;return o;}));if(values.some(([id])=>id===selected))select.value=selected;};
 function fields(){
  const value=library()[chosen()],host=$('fields');host.replaceChildren();$<HTMLButtonElement>('export').disabled=!value;$<HTMLButtonElement>('remove').disabled=!value;
  if(!value){host.textContent=words.empty;return;}
  for(const [key,v] of Object.entries(value)){
   const label=document.createElement('label');label.textContent=words[key]??key;const input=document.createElement('input');input.dataset.resourceField=key;input.type=key.endsWith('Color')?'color':typeof v==='number'?'number':'text';input.value=String(v);
   if(key==='height'){input.min='1';input.max='6';input.step='.1';}if(key==='name')input.maxLength=200;
   input.addEventListener('input',()=>{(value as unknown as Record<string,unknown>)[key]=input.type==='number'?input.valueAsNumber:input.value;});label.append(input);host.append(label);
  }
 }
 function resources(selected=''){
  options($<HTMLSelectElement>('resource'),Object.entries(library()).map(([id,r])=>[id,id+' · '+r.name]),selected);fields();
  const current=$<HTMLSelectElement>('stage').value;options($<HTMLSelectElement>('stage'),[['',words.none],...Object.entries(draft.stages).map(([id,s]):[string,string]=>[id,id+' · '+s.name])],current);
 }
 function preview(){try{const p=readShot(),shot=p.scenes[index].stage3d;const host=$('preview');host.replaceChildren();if(!shot)return;const time=$<HTMLInputElement>('time').valueAsNumber;if(!Number.isFinite(time)||time<0||time>p.scenes[index].duration)throw new Error(words.time+': 0–'+p.scenes[index].duration);const view=createStage3DView(p,shot,640,360,report);host.append(view.canvas);view.draw(time);report('');}catch(e){report(e);}}
 document.getElementById('open-stage3d')!.addEventListener('click',()=>{
  stop();origin=context();session++;draft=structuredClone(origin.project);index=origin.index;$('scene').textContent=words.scene+': '+draft.scenes[index].name;
  resources();setShot(draft.scenes[index].stage3d);$<HTMLInputElement>('time').max=String(draft.scenes[index].duration);$<HTMLInputElement>('time').value=String(Math.min(1,draft.scenes[index].duration));report('');dialog.showModal();preview();
 });
 $('kind').addEventListener('change',()=>resources());$('resource').addEventListener('change',fields);
 $('add').addEventListener('click',()=>{if(Object.keys(library()).length>=30){report('Maximum 30');return;}let id=kind();for(let n=2;Object.hasOwn(library(),id);n++)id=kind()+'_'+n;Object.defineProperty(library(),id,{value:kind()==='character'?defaultCharacter3D():defaultStage3D(),enumerable:true,writable:true,configurable:true});resources(id);});
 $('remove').addEventListener('click',()=>{try{readShot();const id=chosen();if(kind()==='character'?draft.scenes.some(s=>s.stage3d?.actors.some(a=>a.character===id)):draft.scenes.some(s=>s.stage3d?.stage===id))throw new Error(id+': resource is used by a scene');delete library()[id];resources();report('');}catch(e){report(e);}});
 $('stage').addEventListener('change',()=>{try{const stage=$<HTMLSelectElement>('stage').value,shot=JSON.parse($<HTMLTextAreaElement>('shot').value) as Shot3D|null;setShot(stage?{stage,camera:shot?.camera??defaultStageCamera3D(),actors:shot?.actors??[]}:null);preview();}catch(e){report(e);}});
 $('insert').addEventListener('click',()=>{try{const p=readShot(),shot=p.scenes[index].stage3d;if(!shot)throw new Error(words.stage);const id=kind()==='character'?chosen():Object.keys(p.characters)[0];if(!id)throw new Error(words.empty);if(shot.actors.length>=12)throw new Error('Maximum 12 actors');let actorId='actor';for(let n=2;shot.actors.some(a=>a.id===actorId);n++)actorId='actor_'+n;const a=defaultActor3D(id,actorId);a.duration=Math.min(4,p.scenes[index].duration);a.x=shot.actors.length*2-2;a.toX=a.x;shot.actors.push(a);setShot(shot);preview();}catch(e){report(e);}});
 $('preview-button').addEventListener('click',preview);
 $('apply').addEventListener('click',()=>{try{validContext();const next=readShot();apply(next);dialog.close();showToast(words.saved,'success');}catch(e){report(e);}});
 $('close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{session++;$('preview').replaceChildren();document.getElementById('open-stage3d')!.focus();});
 const download=(name:string,data:string)=>{const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('export').addEventListener('click',()=>{try{const r=parse3DResource(JSON.stringify({format:'scenescript-3d-resource',version:'1.0',kind:kind(),id:chosen(),definition:library()[chosen()]}));download(r.id+(r.kind==='character'?'.scenecharacter.json':'.scenestage.json'),JSON.stringify(r,null,2));}catch(e){report(e);}});
 $('import').addEventListener('click',()=>$<HTMLInputElement>('file').click());
 $('file').addEventListener('change',async()=>{const input=$<HTMLInputElement>('file'),file=input.files?.[0],ticket=session;input.value='';if(!file)return;try{if(file.size>MAX_3D_RESOURCE_BYTES)throw new Error('3D resource: maximum 32 KiB');const r=parse3DResource(await file.text());if(ticket!==session)return;validContext();$<HTMLSelectElement>('kind').value=r.kind;let id=r.id;const values=r.kind==='character'?draft.characters:draft.stages;if($<HTMLSelectElement>('import-mode').value==='copy')id=unique3DResourceID(r.id,values);if(!Object.hasOwn(values,id)&&Object.keys(values).length>=30)throw new Error('Maximum 30');Object.defineProperty(values,id,{value:r.definition as Character3D&Stage3D,enumerable:true,writable:true,configurable:true});resources(id);report(words.imported);}catch(e){if(ticket===session)report(e);}});
 $('demo').addEventListener('click',async()=>{
  if(!confirm(words.confirm))return;const ticket=session,b=$<HTMLButtonElement>('demo');b.disabled=true;report(words.busy);
  try{validContext();const {stage3DExample}=await import('../lib/stage3d-example'),{exportStill}=await import('./still-export');const p=validateProject(stage3DExample),blob=await exportStill(p,1,new AbortController().signal);const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});if(ticket!==session)return;validContext();p.thumbnail={name:'Mika-und-Bo-Cover.png',data};replace(validateProject(p));dialog.close();}catch(e){if(ticket===session)report(e);}finally{b.disabled=false;}
 });
}
