import type {Project} from '../lib/model';
import {MAX_STORYBOARD_BYTES,newStoryboard,parseStoryboard,importStoryboard,exportStoryboard,storyboardGuide,canApproveStoryboard,type Storyboard,type BoardComment} from '../lib/storyboard';
import type {storyboardWords} from '../lib/storyboard-i18n';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('storyboard-'+id) as T;
export function installStoryboardEditor(context:()=>{project:Project;revision:number},apply:(p:Project)=>void,stop:()=>void){
 const dialog=$<HTMLDialogElement>('dialog'),t=JSON.parse(dialog.dataset.words!) as ReturnType<typeof storyboardWords>;
 let board:Storyboard,origin:ReturnType<typeof context>,dirty=false,tab='story',session=0;
 const check=()=>{const now=context();if(!dialog.open||now.project!==origin.project||now.revision!==origin.revision)throw new Error(t.stale);};
 const error=(e:unknown)=>{$('error-box').hidden=false;$<HTMLTextAreaElement>('error').value=e instanceof Error?e.message:String(e);$('error-box').scrollIntoView({block:'nearest'});};
 const clear=()=>{$('error-box').hidden=true;$('status').textContent='';};
 const touch=()=>{board.revision++;board.approved=false;dirty=true;review();};
 function review(){$('state').textContent=`${board.approved?t.approved:t.draft} · ${board.shots.length} ${t.shots} · ${board.shots.reduce((sum,s)=>sum+s.duration,0).toFixed(1)} s / ${board.duration} s`;$('state').classList.toggle('board-approved',board.approved);$<HTMLButtonElement>('approve').disabled=board.approved||!canApproveStoryboard(board);}
 function node<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 function field(parent:HTMLElement,label:string,value:string){const area=node('section');area.className='board-field';area.append(node('h4',label),node('p',value||'—'));parent.append(area);}
 function picture(parent:HTMLElement,id:string|null,alt:string){if(id&&board.images[id]?.data){const img=node('img');img.src=board.images[id].data!;img.alt=alt;img.loading='lazy';img.className='board-sketch';const link=node('a',board.images[id].name);link.href=img.src;link.download=board.images[id].name;link.className='board-image-download';parent.append(img,link);}else{const p=node('p',t.noImage);p.className='board-no-image';parent.append(p);}}
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
   const card=node('article');card.className='board-card';card.append(node('h3',board.title));
   if(!board.story)card.append(node('p',t.empty));
   for(const [label,value]of [[t.story,board.story],[t.message,board.message],[t.audience,board.audience],[t.language,board.language],[t.style,board.style],[t.duration,board.duration+' s']])field(card,label,value);
   commentList(card,board.comments);root.append(card);
  }else if(tab==='characters'||tab==='settings'){
   for(const subject of board[tab]){const card=node('article');card.className='board-card';card.append(node('h3',subject.name));picture(card,subject.image,subject.name);field(card,tab==='characters'?t.characters:t.settings,subject.description);commentList(card,subject.comments);root.append(card);}
   if(!board[tab].length)root.append(node('p',t.empty));
  }else{
   for(const [i,shot]of board.shots.entries()){
    const card=node('article');card.className='board-card';card.dataset.shotId=shot.id;card.append(node('h3',`${i+1}. ${shot.title} · ${shot.duration} s`));picture(card,shot.image,shot.title);field(card,t.action,shot.action);field(card,t.camera,shot.camera);field(card,t.audio,shot.audio);
    for(const kind of ['characters','settings'] as const)if(shot[kind].length)field(card,t[kind],shot[kind].map(id=>board[kind].find(s=>s.id===id)?.name??id).join(', '));
    const label=node('label'),box=node('input');box.type='checkbox';box.checked=shot.status==='approved';box.addEventListener('change',()=>{shot.status=box.checked?'approved':'draft';touch();});label.append(box,document.createTextNode(t.approved));card.append(label);commentList(card,shot.comments);root.append(card);
   }
   if(!board.shots.length)root.append(node('p',t.empty));
  }
 }
 const close=()=>{if(dirty&&!window.confirm(t.unsaved))return;session++;dialog.close();};
 document.getElementById('open-storyboard')!.addEventListener('click',()=>{stop();origin=context();board=origin.project.storyboard?structuredClone(origin.project.storyboard):newStoryboard(origin.project.title);dirty=false;tab='story';session++;clear();$<HTMLTextAreaElement>('json').value='';render();dialog.showModal();});
 $('close').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-board-tab]'))b.addEventListener('click',()=>{tab=b.dataset.boardTab!;render();});
 $('approve').addEventListener('click',()=>{if(!canApproveStoryboard(board))return;touch();board.approved=true;review();});
 $('save').addEventListener('click',()=>{try{check();const validated=parseStoryboard(board);apply({...origin.project,storyboard:validated});dirty=false;session++;dialog.close();}catch(e){error(e);}});
 const copy=async(value:string)=>{const ticket=session;try{check();await navigator.clipboard.writeText(value);if(ticket===session&&dialog.open){clear();$('status').textContent=t.copied;}}catch(e){if(ticket===session&&dialog.open)error(e);}};
 $('guide').addEventListener('click',()=>void copy(storyboardGuide));$('feedback').addEventListener('click',()=>void copy(exportStoryboard(board)));
 $('download').addEventListener('click',()=>{try{check();const blob=new Blob([exportStoryboard(board,true)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='storyboard.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){error(e);}});
 const load=(value:string)=>{try{check();board=importStoryboard(value,!origin.project.storyboard&&!board.shots.length&&!board.characters.length&&!board.settings.length&&!board.comments.length?null:board);dirty=true;clear();render();$('status').textContent=t.imported;}catch(e){error(e);}};
 $('import').addEventListener('click',()=>load($<HTMLTextAreaElement>('json').value));
 $('file-open').addEventListener('click',()=>$<HTMLInputElement>('file').click());
 $('file').addEventListener('change',async()=>{const input=$<HTMLInputElement>('file'),file=input.files?.[0],ticket=session;input.value='';if(!file)return;try{if(file.size>MAX_STORYBOARD_BYTES)throw new Error('JSON: maximum 25 MiB');const value=await file.text();if(ticket!==session||!dialog.open)return;load(value);}catch(e){if(ticket===session&&dialog.open)error(e);}});
}
