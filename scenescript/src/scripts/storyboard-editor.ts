import type {Project} from '../lib/model';
import {MAX_STORYBOARD_BYTES,newStoryboard,parseStoryboard,importStoryboard,exportStoryboard,storyboardGuide,canApproveStoryboard,type Storyboard,type BoardFormat,type BoardComment} from '../lib/storyboard';
import type {storyboardWords} from '../lib/storyboard-i18n';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('storyboard-'+id) as T;
export function installStoryboardEditor(context:()=>{project:Project;revision:number},apply:(p:Project)=>void,stop:()=>void){
 const dialog=$<HTMLDialogElement>('dialog'),t=JSON.parse(dialog.dataset.words!) as ReturnType<typeof storyboardWords>;
 const fieldDialog=$<HTMLDialogElement>('field-dialog');
 type FieldConfig={label:string;value:string|string[];kind?:'text'|'number'|'select'|'choices';max?:number;min?:number;limit?:number;required?:boolean;options?:[string,string][];shot?:string;apply:(draft:Storyboard,value:string|string[])=>void};
 let edit:{config:FieldConfig;board:Storyboard;revision:number;session:number;focusKey:string}|null=null;
 let board:Storyboard,origin:ReturnType<typeof context>,dirty=false,tab='story',session=0;
 const check=()=>{const now=context();if(!dialog.open||now.project!==origin.project||now.revision!==origin.revision)throw new Error(t.stale);};
 const error=(e:unknown)=>{$('error-box').hidden=false;$<HTMLTextAreaElement>('error').value=e instanceof Error?e.message:String(e);$('error-box').scrollIntoView({block:'nearest'});};
 const clear=()=>{$('error-box').hidden=true;$('status').textContent='';};
 const touch=()=>{board.revision++;board.approved=false;dirty=true;review();};
 function review(){$('state').textContent=`${board.approved?t.approved:t.draft} · ${board.shots.length} ${t.shots} · ${board.shots.reduce((sum,s)=>sum+s.duration,0).toFixed(1)} s / ${board.duration} s`;$('state').classList.toggle('board-approved',board.approved);$<HTMLButtonElement>('approve').disabled=board.approved||!canApproveStoryboard(board);}
 function node<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 function pencil(config:FieldConfig,key:string){
  const button=node('button');button.type='button';button.className='board-pencil';button.dataset.boardEdit=key;button.title=t.edit+': '+config.label;button.setAttribute('aria-label',button.title);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');path.setAttribute('d','m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z');svg.append(path);button.append(svg);
  button.addEventListener('click',()=>openField(config,key));return button;
 }
 function field(parent:HTMLElement,label:string,value:string,config:FieldConfig,key:string){const area=node('section'),heading=node('div');area.className='board-field';heading.className='board-field-heading';heading.append(node('h4',label),pencil(config,key));area.append(heading,node('p',value||'—'));parent.append(area);}
 function heading(parent:HTMLElement,title:string,config:FieldConfig,key:string){const row=node('div');row.className='board-field-heading';row.append(node('h3',title),pencil(config,key));parent.append(row);}
 const textConfig=(label:string,value:string,apply:FieldConfig['apply'],max=10000,shot?:string):FieldConfig=>({label,value,apply,max,shot});
 function picture(parent:HTMLElement,id:string|null,alt:string,apply:FieldConfig['apply'],key:string,shot?:string){
  const row=node('div');row.className='board-field-heading';row.append(node('h4',t.sketch),pencil({label:t.sketch,value:id??'',kind:'select',options:[['',t.none],...Object.entries(board.images).map(([id,img]):[string,string]=>[id,img.name])],apply,shot},key));parent.append(row);
  if(id&&board.images[id]?.data){const img=node('img');img.src=board.images[id].data!;img.alt=alt;img.loading='lazy';img.className='board-sketch';const link=node('a',board.images[id].name);link.href=img.src;link.download=board.images[id].name;link.className='board-image-download';parent.append(img,link);}else{const p=node('p',t.noImage);p.className='board-no-image';parent.append(p);}
 }
 function openField(config:FieldConfig,key:string){
  try{check();clear();edit={config,board,revision:board.revision,session,focusKey:key};$('field-heading').textContent=t.edit+': '+config.label;$('field-label').textContent=config.label;$('field-error').textContent='';
   const kind=config.kind??'text',text=$<HTMLTextAreaElement>('field-text'),number=$<HTMLInputElement>('field-number'),select=$<HTMLSelectElement>('field-select'),choices=$('field-choices');
   for(const [control,show]of [[text,kind==='text'],[number,kind==='number'],[select,kind==='select']] as const){control.hidden=!show;control.disabled=!show;}
   choices.hidden=kind!=='choices';choices.replaceChildren();text.value=typeof config.value==='string'?config.value:'';text.maxLength=config.max??10000;text.required=config.required??false;
   number.value=typeof config.value==='string'?config.value:'';number.min=String(config.min??.01);number.max=String(config.limit??86400);number.required=true;
   select.replaceChildren(...(config.options??[]).map(([value,name])=>{const option=node('option',name);option.value=value;return option;}));select.value=typeof config.value==='string'?config.value:'';
   if(kind==='choices')for(const [id,name]of config.options??[]){const label=node('label'),box=node('input');box.type='checkbox';box.value=id;box.checked=Array.isArray(config.value)&&config.value.includes(id);label.append(box,document.createTextNode(name));choices.append(label);}
   if(kind==='choices'&&!config.options?.length)choices.append(node('p',t.none));
   const active=kind==='text'?text:kind==='number'?number:kind==='select'?select:choices;$('field-label').setAttribute('for',active.id);fieldDialog.showModal();if(kind==='choices')choices.querySelector('input')?.focus();else (active as HTMLInputElement).focus();
  }catch(e){error(e);}
 }
 function closeField(){const key=edit?.focusKey;edit=null;fieldDialog.close();if(key)Array.from(document.querySelectorAll<HTMLButtonElement>('[data-board-edit]')).find(b=>b.dataset.boardEdit===key)?.focus();}
 $('field-close').addEventListener('click',closeField);$('field-cancel').addEventListener('click',closeField);fieldDialog.addEventListener('cancel',e=>{e.preventDefault();closeField();});
 $('field-form').addEventListener('submit',e=>{e.preventDefault();try{
  check();if(!edit||edit.session!==session||edit.board!==board||edit.revision!==board.revision)throw new Error(t.stale);
  const config=edit.config,kind=config.kind??'text',value=kind==='choices'?Array.from($('field-choices').querySelectorAll<HTMLInputElement>('input:checked')).map(i=>i.value):kind==='select'?$<HTMLSelectElement>('field-select').value:kind==='number'?$<HTMLInputElement>('field-number').value:$<HTMLTextAreaElement>('field-text').value;
  if(JSON.stringify(value)===JSON.stringify(config.value)){closeField();return;}
  const draft=structuredClone(board);config.apply(draft,value);draft.approved=false;draft.revision++;
  for(const shot of draft.shots)if(!config.shot||shot.id===config.shot)shot.status='draft';
  board=parseStoryboard(draft);dirty=true;render();closeField();
 }catch(e){$('field-error').textContent=e instanceof Error?e.message:String(e);}});
 dialog.addEventListener('close',()=>{if(fieldDialog.open)closeField();});
 function commentList(parent:HTMLElement,comments:BoardComment[]){
  const wrap=node('section');wrap.className='board-comments';wrap.append(node('h4',t.comments));
  for(const c of comments){const row=node('div');row.className='board-comment';const text=node('textarea');text.value=c.text;text.maxLength=5000;text.rows=2;text.setAttribute('aria-label',t.comments);text.addEventListener('input',()=>{c.text=text.value;c.resolved=false;box.checked=false;touch();});row.append(text);
   if(c.reply)row.append(node('strong',t.reply),node('p',c.reply));
   const label=node('label'),box=node('input');box.type='checkbox';box.checked=c.resolved;box.addEventListener('change',()=>{c.resolved=box.checked;touch();});label.append(box,document.createTextNode(t.resolved));row.append(label);wrap.append(row);
  }
  const input=node('textarea');input.rows=2;input.maxLength=5000;input.placeholder=t.comments;input.setAttribute('aria-label',t.add);
  const add=node('button',t.add);add.type='button';add.disabled=comments.length>=100;add.addEventListener('click',()=>{if(!input.value.trim())return;comments.push({id:crypto.randomUUID(),text:input.value.trim(),resolved:false,reply:''});touch();render();});wrap.append(input,add);parent.append(wrap);
 }
 function render(){
  review();for(const b of document.querySelectorAll<HTMLButtonElement>('[data-board-tab]'))b.setAttribute('aria-pressed',String(b.dataset.boardTab===tab));
  const root=$('content');root.dataset.tab=tab;root.replaceChildren();
  if(tab==='story'){
   const card=node('article');card.className='board-card';heading(card,board.title,textConfig(t.fieldTitle,board.title,(b,v)=>{b.title=String(v);},200),'title');
   if(!board.story)card.append(node('p',t.empty));
   for(const key of ['story','message','audience','language','style'] as const)field(card,t[key],board[key],textConfig(t[key],board[key],(b,v)=>{b[key]=String(v);},key==='story'?30000:key==='language'?200:10000),key);
   field(card,t.format,t[board.format],{label:t.format,value:board.format,kind:'select',options:(['landscape','portrait','square'] as const).map(f=>[f,t[f]]),apply:(b,v)=>{b.format=v as BoardFormat;}},'format');
   field(card,t.duration,board.duration+' s',{label:t.duration,value:String(board.duration),kind:'number',apply:(b,v)=>{b.duration=Number(v);}},'duration');
   commentList(card,board.comments);root.append(card);
  }else if(tab==='characters'||tab==='settings'){
   const kind=tab;
   for(const subject of board[kind]){const card=node('article');card.className='board-card';const get=(b:Storyboard)=>b[kind].find(s=>s.id===subject.id)!;
    heading(card,subject.name,textConfig(t.fieldTitle,subject.name,(b,v)=>{get(b).name=String(v);},200),kind+'-'+subject.id+'-name');
    picture(card,subject.image,subject.name,(b,v)=>{get(b).image=String(v)||null;},kind+'-'+subject.id+'-image');
    field(card,t.description,subject.description,textConfig(t.description,subject.description,(b,v)=>{get(b).description=String(v);}),kind+'-'+subject.id+'-description');commentList(card,subject.comments);root.append(card);
   }
   if(!board[kind].length)root.append(node('p',t.empty));
   const add=node('button',kind==='characters'?t.addCharacter:t.addSetting);add.type='button';add.className='board-add-item';add.dataset.boardEdit='add-'+kind;add.disabled=board[kind].length>=100;add.addEventListener('click',()=>openField({label:kind==='characters'?t.addCharacter:t.addSetting,value:'',max:200,required:true,apply:(b,v)=>{b[kind].push({id:crypto.randomUUID(),name:String(v),description:'',image:null,comments:[]});}},'add-'+kind));root.append(add);
  }else{
   for(const [i,shot]of board.shots.entries()){
    const card=node('article');card.className='board-card';card.dataset.shotId=shot.id;const get=(b:Storyboard)=>b.shots.find(s=>s.id===shot.id)!;
    heading(card,`${i+1}. ${shot.title} · ${shot.duration} s`,textConfig(t.fieldTitle,shot.title,(b,v)=>{get(b).title=String(v);},200,shot.id),shot.id+'-title');
    picture(card,shot.image,shot.title,(b,v)=>{get(b).image=String(v)||null;},shot.id+'-image',shot.id);
    field(card,t.shotDuration,shot.duration+' s',{label:t.shotDuration,value:String(shot.duration),kind:'number',limit:3600,shot:shot.id,apply:(b,v)=>{get(b).duration=Number(v);}},shot.id+'-duration');
    for(const key of ['action','camera','audio'] as const)field(card,t[key],shot[key],textConfig(t[key],shot[key],(b,v)=>{get(b)[key]=String(v);},10000,shot.id),shot.id+'-'+key);
    for(const kind of ['characters','settings'] as const)field(card,t[kind],shot[kind].map(id=>board[kind].find(s=>s.id===id)?.name??id).join(', '),{label:t[kind],value:shot[kind],kind:'choices',options:board[kind].map(s=>[s.id,s.name]),shot:shot.id,apply:(b,v)=>{get(b)[kind]=v as string[];}},shot.id+'-'+kind);
    const label=node('label'),box=node('input');box.type='checkbox';box.checked=shot.status==='approved';box.addEventListener('change',()=>{shot.status=box.checked?'approved':'draft';touch();});label.append(box,document.createTextNode(t.approved));card.append(label);commentList(card,shot.comments);root.append(card);
   }
   if(!board.shots.length)root.append(node('p',t.empty));
   const add=node('button',t.addShot);add.type='button';add.className='board-add-item';add.dataset.boardEdit='add-shots';add.disabled=board.shots.length>=100;add.addEventListener('click',()=>openField({label:t.addShot,value:'',max:200,required:true,apply:(b,v)=>{b.shots.push({id:crypto.randomUUID(),title:String(v),duration:3,action:'',camera:'',audio:'',image:null,characters:[],settings:[],status:'draft',comments:[]});}},'add-shots'));root.append(add);
  }
 }
 const close=()=>{if(dirty&&!window.confirm(t.unsaved))return;session++;dialog.close();};
 document.getElementById('open-storyboard')!.addEventListener('click',()=>{stop();origin=context();board=origin.project.storyboard?structuredClone(origin.project.storyboard):newStoryboard(origin.project.title,origin.project.format);dirty=false;tab='story';session++;clear();$<HTMLTextAreaElement>('json').value='';render();dialog.showModal();});
 $('close').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-board-tab]'))b.addEventListener('click',()=>{tab=b.dataset.boardTab!;render();});
 $('approve').addEventListener('click',()=>{if(!canApproveStoryboard(board))return;touch();board.approved=true;review();});
 $('save').addEventListener('click',()=>{try{check();const validated=parseStoryboard(board);apply({...origin.project,storyboard:validated});dirty=false;session++;dialog.close();}catch(e){error(e);}});
 const copy=async(value:string)=>{const ticket=session;try{check();await navigator.clipboard.writeText(value);if(ticket===session&&dialog.open){clear();$('status').textContent=t.copied;}}catch(e){if(ticket===session&&dialog.open)error(e);}};
 $('guide').addEventListener('click',()=>void copy(storyboardGuide));$('feedback').addEventListener('click',()=>void copy(exportStoryboard(board)));
 $('download').addEventListener('click',()=>{try{check();const blob=new Blob([exportStoryboard(board,true)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='storyboard.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){error(e);}});
 const load=(value:string)=>{try{check();board=importStoryboard(value,!origin.project.storyboard&&!dirty&&!board.shots.length&&!board.characters.length&&!board.settings.length&&!board.comments.length?null:board);dirty=true;clear();render();$('status').textContent=t.imported;}catch(e){error(e);}};
 $('import').addEventListener('click',()=>load($<HTMLTextAreaElement>('json').value));
 $('file-open').addEventListener('click',()=>$<HTMLInputElement>('file').click());
 $('file').addEventListener('change',async()=>{const input=$<HTMLInputElement>('file'),file=input.files?.[0],ticket=session;input.value='';if(!file)return;try{if(file.size>MAX_STORYBOARD_BYTES)throw new Error('JSON: maximum 25 MiB');const value=await file.text();if(ticket!==session||!dialog.open)return;load(value);}catch(e){if(ticket===session&&dialog.open)error(e);}});
}
