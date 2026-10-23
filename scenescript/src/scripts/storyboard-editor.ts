import type {Project} from '../lib/model';
import {MAX_STORYBOARD_BYTES,newStoryboard,parseStoryboard,importStoryboard,exportStoryboard,storyboardGuide,canApproveStoryboard,invalidateStoryboardApprovals,type BoardReviewTarget,type BoardCharacter,type Storyboard,type BoardFormat,type BoardComment} from '../lib/storyboard';
import type {storyboardWords} from '../lib/storyboard-i18n';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('storyboard-'+id) as T;
export function installStoryboardEditor(context:()=>{project:Project;revision:number},apply:(p:Project)=>void,stop:()=>void){
 const dialog=$<HTMLDialogElement>('dialog'),t=JSON.parse(dialog.dataset.words!) as ReturnType<typeof storyboardWords>;
 const fieldDialog=$<HTMLDialogElement>('field-dialog'),exchange=$<HTMLDialogElement>('exchange');
 type FieldConfig={label:string;value:string|string[];kind?:'text'|'number'|'select'|'choices';max?:number;min?:number;limit?:number;required?:boolean;options?:[string,string][];shot?:string;target?:BoardReviewTarget;subjectKind?:boolean;newComment?:boolean;editComment?:boolean;newItem?:boolean;apply:(draft:Storyboard,value:string|string[])=>void};
 let edit:{config:FieldConfig;board:Storyboard;revision:number;session:number;focusKey:string}|null=null;
 let selectedItems:Record<string,string>={};
 let board:Storyboard,origin:ReturnType<typeof context>,dirty=false,tab='story',session=0;
 const check=()=>{const now=context();if(!dialog.open||now.project!==origin.project||now.revision!==origin.revision)throw new Error(t.stale);};
 const error=(e:unknown)=>{const prefix=exchange.open?'exchange-':'';$(prefix+'error-box').hidden=false;$<HTMLTextAreaElement>(prefix+'error').value=e instanceof Error?e.message:String(e);$(prefix+'error-box').scrollIntoView({block:'nearest'});};
 const clear=()=>{$('error-box').hidden=true;$('exchange-error-box').hidden=true;$('status').textContent='';};
 const touch=()=>{board.revision++;board.approved=false;dirty=true;review();};
 function review(){const button=$<HTMLButtonElement>('approve'),ready=canApproveStoryboard(board);button.disabled=board.approved||!ready;button.setAttribute('aria-pressed',String(board.approved));button.title=board.approved?t.approved:ready?t.approve:t.approve+' — '+t.approveHint;updateListState();}
 function node<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 function pencil(config:FieldConfig,key:string){
  const button=node('button');button.type='button';button.className='board-pencil';button.dataset.boardEdit=key;button.title=t.edit+': '+config.label;button.setAttribute('aria-label',button.title);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');path.setAttribute('d','m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z');svg.append(path);button.append(svg);
  button.addEventListener('click',()=>openField(config,key));return button;
 }
 function field(parent:HTMLElement,label:string,value:string,config:FieldConfig,key:string){const area=node('section'),heading=node('div');area.className='board-field';heading.className='board-field-heading';heading.append(node('h4',label),pencil(config,key));area.append(heading,node('p',value||'—'));parent.append(area);}
 function heading(parent:HTMLElement,title:string,config:FieldConfig,key:string){const tile=node('section'),row=node('div');tile.className='board-detail-title';row.className='board-field-heading';row.append(node('h3',title),pencil(config,key));tile.append(row);parent.append(tile);}
 const textConfig=(label:string,value:string,apply:FieldConfig['apply'],max=10000,shot?:string):FieldConfig=>({label,value,apply,max,shot});
 function picture(parent:HTMLElement,id:string|null,alt:string,apply:FieldConfig['apply'],key:string,shot?:string,target?:BoardReviewTarget){
  const area=node('section');area.className='board-image-field';parent.append(area);
  const row=node('div');row.className='board-field-heading';row.append(node('h4',t.sketch),pencil({label:t.sketch,value:id??'',kind:'select',options:[['',t.none],...Object.entries(board.images).map(([id,img]):[string,string]=>[id,img.name])],apply,shot,target},key));area.append(row);
  if(id&&board.images[id]?.data){const img=node('img');img.src=board.images[id].data!;img.alt=alt;img.loading='lazy';img.className='board-sketch';const link=node('a',board.images[id].name);link.href=img.src;link.download=board.images[id].name;link.className='board-image-download';area.append(img,link);}else{const p=node('p',t.noImage);p.className='board-no-image';area.append(p);}
 }
 function openField(config:FieldConfig,key:string){
  try{check();clear();edit={config,board,revision:board.revision,session,focusKey:key};$('field-heading').textContent=config.newComment?t.add:t.edit+': '+config.label;$('field-label').textContent=config.label;$('field-error').textContent='';
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
  if((config.newComment||config.editComment)&&!String(value).trim())throw new Error(t.commentEmpty);
  const draft=structuredClone(board);config.apply(draft,config.newComment?String(value).trim():value);draft.revision++;
  if(config.newComment||config.editComment)draft.approved=false;else invalidateStoryboardApprovals(draft,config.target??(config.shot?{kind:'shots',id:config.shot}:undefined));
  board=parseStoryboard(draft);dirty=true;if(config.subjectKind){tab=value==='object'?'objects':'characters';if(config.target)selectedItems[tab]=config.target.id;}if(config.newItem)selectedItems[tab]=sectionItems().at(-1)?.id??'';render();closeField();
 }catch(e){$('field-error').textContent=e instanceof Error?e.message:String(e);}});
 dialog.addEventListener('close',()=>{if(fieldDialog.open)closeField();if(exchange.open)exchange.close();});
 function approvalSwitch(parent:HTMLElement,item:{status:'draft'|'approved'},name:string){
  const label=node('label'),input=node('input'),track=node('span');label.className='board-approval-switch';input.type='checkbox';input.setAttribute('role','switch');input.setAttribute('aria-description',name);input.checked=item.status==='approved';track.className='board-switch-track';track.setAttribute('aria-hidden','true');
  input.addEventListener('change',()=>{item.status=input.checked?'approved':'draft';touch();});label.append(input,track,node('span',t.approved));parent.append(label);
 }
 function commentButton(label:string,pathData:string){
  const button=node('button');button.type='button';button.className='board-comment-action';button.title=label;button.setAttribute('aria-label',label);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');path.setAttribute('d',pathData);svg.append(path);button.append(svg);return button;
 }
 function commentList(parent:HTMLElement,comments:BoardComment[],scope?:BoardReviewTarget){
  const wrap=node('section'),heading=node('div'),key='comment-add-'+(scope?scope.kind+'-'+scope.id:'project');wrap.className='board-comments';heading.className='board-comment-heading';heading.append(node('h4',t.comments));
  const add=commentButton(t.add,'M4 3h16v13H9l-5 4ZM8 9h8m-4-4v8');add.disabled=comments.length>=100;add.dataset.boardEdit=key;add.setAttribute('aria-haspopup','dialog');add.setAttribute('aria-controls','storyboard-field-dialog');
  const list=(b:Storyboard)=>scope?b[scope.kind].find(item=>item.id===scope.id)!.comments:b.comments;
  add.addEventListener('click',()=>openField({label:t.add,value:'',max:5000,required:true,newComment:true,apply:(b,v)=>{const target=list(b);if(target.length>=100)throw new Error('comments: maximum 100');target.push({id:crypto.randomUUID(),text:String(v),resolved:false,reply:''});}},key));heading.append(add);wrap.append(heading);
  for(const c of comments){
   const row=node('div');row.className='board-comment';row.dataset.commentId=c.id;
   const actions=node('div'),remove=commentButton(t.deleteComment,'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7');actions.className='board-comment-actions';remove.classList.add('board-comment-delete');
   remove.addEventListener('click',()=>{try{check();if(!window.confirm(t.deleteCommentConfirm))return;const target=list(board),index=target.findIndex(comment=>comment.id===c.id);if(index<0)return;target.splice(index,1);touch();render();Array.from(document.querySelectorAll<HTMLButtonElement>('[data-board-edit]')).find(b=>b.dataset.boardEdit===key)?.focus();}catch(e){error(e);}});const editKey=key+'-edit-'+c.id,editButton=pencil({label:t.editComment,value:c.text,max:5000,required:true,editComment:true,apply:(b,v)=>{const comment=list(b).find(item=>item.id===c.id)!;comment.text=String(v);comment.resolved=false;}},editKey);editButton.className='board-comment-action';editButton.title=t.editComment;editButton.setAttribute('aria-label',t.editComment);editButton.setAttribute('aria-haspopup','dialog');editButton.setAttribute('aria-controls','storyboard-field-dialog');actions.append(editButton,remove);row.append(actions);
   const text=node('p',c.text);text.className='board-comment-text';row.append(text);
   if(c.reply)row.append(node('strong',t.reply),node('p',c.reply));
   const label=node('label'),box=node('input'),track=node('span');label.className='board-approval-switch';box.type='checkbox';box.setAttribute('role','switch');box.checked=c.resolved;track.className='board-switch-track';track.setAttribute('aria-hidden','true');box.addEventListener('change',()=>{c.resolved=box.checked;touch();});label.append(box,track,node('span',t.resolved));row.append(label);wrap.append(row);
  }
  parent.append(wrap);
 }

 const sectionItems=()=>tab==='shots'?board.shots:tab==='settings'?board.settings:board.characters.filter(c=>c.kind===(tab==='objects'?'object':'character'));
 function updateListState(){
  if(!board||tab==='story')return;const items=sectionItems();
  for(const button of $('content').querySelectorAll<HTMLButtonElement>('[data-board-item]')){const item=items.find(item=>item.id===button.dataset.boardItem);if(!item)continue;button.dataset.approved=String(item.status==='approved');button.querySelector('.board-library-status')!.textContent=item.status==='approved'?t.approved:t.draft;button.querySelector('.board-library-mark')!.textContent=item.status==='approved'?'✓':'○';}
 }
 function library(root:HTMLElement,items:ReturnType<typeof sectionItems>){
  if(!items.some(item=>item.id===selectedItems[tab]))selectedItems[tab]=items[0]?.id??'';
  const layout=node('div'),sidebar=node('aside'),list=node('ul'),detail=node('div');layout.className='board-browser';sidebar.className='board-library';list.className='board-library-list';detail.className='board-detail';detail.id='storyboard-item-detail';
  sidebar.setAttribute('aria-label',t[tab as 'characters'|'objects'|'settings'|'shots']);sidebar.append(node('h3',t[tab as 'characters'|'objects'|'settings'|'shots']));list.setAttribute('aria-label',t[tab as 'characters'|'objects'|'settings'|'shots']);
  for(const [index,item]of items.entries()){
   const row=node('li'),button=node('button'),name=node('span','title' in item?`${index+1}. ${item.title}`:item.name),status=node('small'),mark=node('span');button.type='button';button.dataset.boardItem=item.id;button.setAttribute('aria-controls',detail.id);if(item.id===selectedItems[tab])button.setAttribute('aria-current','true');name.className='board-library-name';status.className='board-library-status';status.textContent=item.status==='approved'?t.approved:t.draft;mark.className='board-library-mark';mark.textContent=item.status==='approved'?'✓':'○';mark.setAttribute('aria-hidden','true');button.dataset.approved=String(item.status==='approved');button.append(mark,name,status);
   const choose=(id:string)=>{const scroll=$('content').querySelector('.board-library-list')?.scrollTop??0;selectedItems[tab]=id;render();const nextList=$('content').querySelector('.board-library-list');if(nextList)nextList.scrollTop=scroll;const button=Array.from($('content').querySelectorAll<HTMLButtonElement>('[data-board-item]')).find(b=>b.dataset.boardItem===id);button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest',inline:'nearest'});const body=$('content').closest('.dialog-inner');if(body)body.scrollTop=0;};
   button.addEventListener('click',()=>choose(item.id));button.addEventListener('keydown',event=>{const next=event.key==='ArrowDown'?(index+1)%items.length:event.key==='ArrowUp'?(index+items.length-1)%items.length:event.key==='Home'?0:event.key==='End'?items.length-1:-1;if(next<0||event.altKey||event.ctrlKey||event.metaKey)return;event.preventDefault();choose(items[next].id);});row.append(button);list.append(row);
  }
  sidebar.append(list);layout.append(sidebar,detail);root.append(layout);return {sidebar,detail};
 }
 function tileDetail(card:HTMLElement){
  card.classList.add('board-detail-grid');for(const child of Array.from(card.children)){child.classList.add('board-detail-tile');const key=child.querySelector<HTMLElement>('[data-board-edit]')?.dataset.boardEdit;if(key)child.setAttribute('data-detail-field',key);}
 }

 function render(){
  review();for(const b of document.querySelectorAll<HTMLButtonElement>('[data-board-tab]')){const selected=b.dataset.boardTab===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}
  const root=$('content');root.dataset.tab=tab;root.setAttribute('aria-labelledby','storyboard-tab-'+tab);root.replaceChildren();
  if(tab==='story'){
   const card=node('div');card.className='board-project-grid';field(card,t.fieldTitle,board.title,textConfig(t.fieldTitle,board.title,(b,v)=>{b.title=String(v);},200),'title');
   for(const key of ['story','message','audience','language','style'] as const)field(card,t[key],board[key],textConfig(t[key],board[key],(b,v)=>{b[key]=String(v);},key==='story'?30000:key==='language'?200:10000),key);
   field(card,t.format,t[board.format],{label:t.format,value:board.format,kind:'select',options:(['landscape','portrait','square'] as const).map(f=>[f,t[f]]),apply:(b,v)=>{b.format=v as BoardFormat;}},'format');
   field(card,t.duration,board.duration+' s',{label:t.duration,value:String(board.duration),kind:'number',apply:(b,v)=>{b.duration=Number(v);}},'duration');
   commentList(card,board.comments);
   for(const section of Array.from(card.children)){section.classList.add('board-project-tile');const key=section.querySelector<HTMLElement>('[data-board-edit]')?.dataset.boardEdit;if(key)section.setAttribute('data-project-field',key);}
   if(!board.story){const story=card.querySelector('[data-project-field=story]');story?.append(node('p',t.empty));}
   root.append(card);
  }else if(tab==='characters'||tab==='objects'||tab==='settings'){
   const kind=tab==='settings'?'settings':'characters',category=tab==='objects'?'object':'character',subjects=kind==='settings'?board.settings:board.characters.filter(c=>c.kind===category);
   const {sidebar,detail}=library(root,subjects);
   for(const subject of subjects.filter(s=>s.id===selectedItems[tab])){const card=node('article');card.className='board-card';const get=(b:Storyboard)=>b[kind].find(s=>s.id===subject.id)!,target:BoardReviewTarget={kind,id:subject.id};card.dataset.subjectId=subject.id;
    heading(card,subject.name,{...textConfig(t.fieldTitle,subject.name,(b,v)=>{get(b).name=String(v);},200),target},kind+'-'+subject.id+'-name');
    if(kind==='characters'){const character=subject as BoardCharacter;field(card,t.category,character.kind==='object'?t.objectCategory:t.characterCategory,{label:t.category,value:character.kind,kind:'select',options:[['character',t.characterCategory],['object',t.objectCategory]],target,subjectKind:true,apply:(b,v)=>{b.characters.find(c=>c.id===subject.id)!.kind=v as BoardCharacter['kind'];}},kind+'-'+subject.id+'-kind');}
    picture(card,subject.image,subject.name,(b,v)=>{get(b).image=String(v)||null;},kind+'-'+subject.id+'-image',undefined,target);
    field(card,t.description,subject.description,{...textConfig(t.description,subject.description,(b,v)=>{get(b).description=String(v);}),target},kind+'-'+subject.id+'-description');approvalSwitch(card,subject,subject.name);commentList(card,subject.comments,target);tileDetail(card);detail.append(card);
   }
   if(!subjects.length)detail.append(node('p',t.empty));
   const addLabel=tab==='settings'?t.addSetting:tab==='objects'?t.addObject:t.addCharacter,add=node('button',addLabel);add.type='button';add.className='board-add-item';add.dataset.boardEdit='add-'+tab;add.disabled=board[kind].length>=100;add.addEventListener('click',()=>openField({label:addLabel,value:'',max:200,required:true,newItem:true,apply:(b,v)=>{const subject={status:'draft' as const,id:crypto.randomUUID(),name:String(v),description:'',image:null,comments:[]};if(kind==='settings')b.settings.push(subject);else b.characters.push({...subject,kind:category});}},'add-'+tab));sidebar.append(add);
  }else{
   const {sidebar,detail}=library(root,board.shots);
   for(const [i,shot]of board.shots.entries()){if(shot.id!==selectedItems[tab])continue;
    const card=node('article');card.className='board-card';card.dataset.shotId=shot.id;const get=(b:Storyboard)=>b.shots.find(s=>s.id===shot.id)!;
    heading(card,`${i+1}. ${shot.title} · ${shot.duration} s`,textConfig(t.fieldTitle,shot.title,(b,v)=>{get(b).title=String(v);},200,shot.id),shot.id+'-title');
    picture(card,shot.image,shot.title,(b,v)=>{get(b).image=String(v)||null;},shot.id+'-image',shot.id);
    field(card,t.shotDuration,shot.duration+' s',{label:t.shotDuration,value:String(shot.duration),kind:'number',limit:3600,shot:shot.id,apply:(b,v)=>{get(b).duration=Number(v);}},shot.id+'-duration');
    for(const key of ['action','camera','audio'] as const)field(card,t[key],shot[key],textConfig(t[key],shot[key],(b,v)=>{get(b)[key]=String(v);},10000,shot.id),shot.id+'-'+key);
    for(const category of ['characters','objects','settings'] as const){
     const kind=category==='settings'?'settings':'characters',subjects=kind==='settings'?board.settings:board.characters.filter(c=>c.kind===(category==='objects'?'object':'character')),ids=new Set(subjects.map(s=>s.id)),selected=shot[kind].filter(id=>ids.has(id));
     field(card,t[category],selected.map(id=>subjects.find(s=>s.id===id)?.name??id).join(', '),{label:t[category],value:selected,kind:'choices',options:subjects.map(s=>[s.id,s.name]),shot:shot.id,apply:(b,v)=>{get(b)[kind]=[...get(b)[kind].filter(id=>!ids.has(id)),...v as string[]];}},shot.id+'-'+category);
    }
    approvalSwitch(card,shot,shot.title);commentList(card,shot.comments,{kind:'shots',id:shot.id});tileDetail(card);detail.append(card);
   }
   if(!board.shots.length)detail.append(node('p',t.empty));
   const add=node('button',t.addShot);add.type='button';add.className='board-add-item';add.dataset.boardEdit='add-shots';add.disabled=board.shots.length>=100;add.addEventListener('click',()=>openField({label:t.addShot,value:'',max:200,required:true,newItem:true,apply:(b,v)=>{b.shots.push({id:crypto.randomUUID(),title:String(v),duration:3,action:'',camera:'',audio:'',image:null,characters:[],settings:[],status:'draft',comments:[]});}},'add-shots'));sidebar.append(add);
  }
 }
 const close=()=>{if(dirty&&!window.confirm(t.unsaved))return;session++;dialog.close();};
 document.getElementById('open-storyboard')!.addEventListener('click',()=>{stop();origin=context();board=origin.project.storyboard?structuredClone(origin.project.storyboard):newStoryboard(origin.project.title,origin.project.format);dirty=false;tab='story';selectedItems={};session++;clear();$<HTMLTextAreaElement>('json').value='';render();dialog.showModal();});
 $('close').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 const tabs=Array.from($('tabs').querySelectorAll<HTMLButtonElement>('[role=tab]'));
 const activateTab=(button:HTMLButtonElement,focus=false)=>{tab=button.dataset.boardTab!;render();if(focus){button.focus();button.scrollIntoView({block:'nearest',inline:'nearest'});}};
 for(const [index,button]of tabs.entries()){
  button.addEventListener('click',()=>activateTab(button));
  button.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;if(next<0)return;event.preventDefault();activateTab(tabs[next],true);});
 }
 $('approve').addEventListener('click',()=>{if(!canApproveStoryboard(board))return;touch();board.approved=true;review();});
 $('save').addEventListener('click',()=>{try{check();const validated=parseStoryboard(board);apply({...origin.project,storyboard:validated});dirty=false;session++;dialog.close();}catch(e){error(e);}});
 const copy=async(value:string)=>{const ticket=session;try{check();await navigator.clipboard.writeText(value);if(ticket===session&&dialog.open){clear();$('status').textContent=t.copied;}}catch(e){if(ticket===session&&dialog.open)error(e);}};
 $('guide').addEventListener('click',()=>void copy(storyboardGuide));$('feedback').addEventListener('click',()=>void copy(exportStoryboard(board)));
 $('download').addEventListener('click',()=>{try{check();const blob=new Blob([exportStoryboard(board,true)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='storyboard.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){error(e);}});
 const load=(value:string)=>{try{check();board=importStoryboard(value,!origin.project.storyboard&&!dirty&&!board.shots.length&&!board.characters.length&&!board.settings.length&&!board.comments.length?null:board);dirty=true;clear();render();if(exchange.open)exchange.close();$('status').textContent=t.imported;}catch(e){error(e);}};
 $('import').addEventListener('click',()=>load($<HTMLTextAreaElement>('json').value));
 $('json-open').addEventListener('click',()=>{try{check();$('exchange-error-box').hidden=true;exchange.showModal();$('json').focus();}catch(e){error(e);}});
 $('exchange-close').addEventListener('click',()=>exchange.close());
 exchange.addEventListener('close',()=>{if(dialog.open)$('json-open').focus();});
 $('file-open').addEventListener('click',()=>$<HTMLInputElement>('file').click());
 $('file').addEventListener('change',async()=>{const input=$<HTMLInputElement>('file'),file=input.files?.[0],ticket=session;input.value='';if(!file)return;try{if(file.size>MAX_STORYBOARD_BYTES)throw new Error('JSON: maximum 25 MiB');const value=await file.text();if(ticket!==session||!dialog.open)return;load(value);}catch(e){if(ticket===session&&dialog.open)error(e);}});
}
