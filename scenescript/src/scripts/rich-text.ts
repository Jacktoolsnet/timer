import type {Element,TextRun} from '../lib/model';
export type TextStyleKey='font'|'fontSize'|'color'|'bold'|'italic'|'underline'|'strikethrough';
export function styleText(node:HTMLElement,style:Partial<Element>,scale=1){
 if(style.font!==undefined)node.style.fontFamily=style.font;
 if(style.fontSize!==undefined)node.style.fontSize=`${style.fontSize*scale}px`;
 if(style.color!==undefined)node.style.color=style.color;
 if(style.bold!==undefined)node.style.fontWeight=style.bold?'700':'400';
 if(style.italic!==undefined)node.style.fontStyle=style.italic?'italic':'normal';
 node.style.textDecoration=[style.underline?'underline':'',style.strikethrough?'line-through':''].filter(Boolean).join(' ')||'none';
}
export function renderRuns(node:HTMLElement,e:Element,text=e.text,scale=1){
 node.replaceChildren();let remaining=Array.from(text).length;
 for(const run of e.runs.length?e.runs:[{text:e.text}]){
  const chars=Array.from(run.text).slice(0,remaining);remaining-=chars.length;
  if(!chars.length)continue;
  const span=document.createElement('span');span.textContent=chars.join('');span.dataset.style=JSON.stringify(run);styleText(span,{...e,...run},scale);node.append(span);
 }
}
export function richTextEditor(e:Element,save:()=>void,defaultStyle:(key:TextStyleKey,value:any)=>void,hints:{selection:string;block:string}){
 const editor=document.createElement('div');editor.className='rich-text-editor';editor.contentEditable='true';editor.setAttribute('name','text');editor.setAttribute('role','textbox');editor.setAttribute('aria-multiline','true');editor.setAttribute('aria-label','Text');
 styleText(editor,e,1/3);editor.style.textDecoration='none';renderRuns(editor,e,e.text,1/3);
 const hint=document.createElement('p');hint.className='rich-text-hint';hint.textContent=hints.block;hint.setAttribute('role','status');
 const listeners=new AbortController();
 let selection:{start:number;end:number}|undefined;
 const capture=()=>{
  const sel=window.getSelection();if(!sel?.rangeCount)return;const range=sel.getRangeAt(0);
  if(!editor.contains(range.startContainer)||!editor.contains(range.endContainer))return;
  const before=range.cloneRange();before.selectNodeContents(editor);before.setEnd(range.startContainer,range.startOffset);
  selection={start:before.toString().length,end:before.toString().length+range.toString().length};
  hint.textContent=selection.start===selection.end?hints.block:hints.selection;
  let offset=0;const run=e.runs.find(r=>{offset+=r.text.length;return offset>selection!.start;});
  const style=selection.start===selection.end?e:{...e,...run};
  const form=editor.closest('form');
  for(const key of ['font','fontSize','color','bold','italic','underline','strikethrough'] as const){const control=form?.querySelector<HTMLInputElement|HTMLSelectElement>(`[name="${key}"]`);if(!control)continue;if(control instanceof HTMLInputElement&&control.type==='checkbox')control.checked=Boolean(style[key]);else control.value=String(style[key]);if(control instanceof HTMLInputElement&&control.type==='number')control.dispatchEvent(new Event('input'));}

 };
 document.addEventListener('selectionchange',capture,{signal:listeners.signal});
 editor.addEventListener('keyup',capture);editor.addEventListener('mouseup',capture);editor.addEventListener('touchend',capture);editor.addEventListener('blur',capture);
 const read=()=>{
  const runs:TextRun[]=[];
  function walk(node:Node,style:Partial<TextRun>={}){
   if(node.nodeType===Node.TEXT_NODE){if(node.textContent)runs.push({...style,text:node.textContent});return;}
   if(!(node instanceof HTMLElement))return;
   if(node.dataset.placeholder)return;
   if(node.tagName==='BR'){runs.push({...style,text:'\n'});return;}
   if(node.dataset.style){const {text,...format}=JSON.parse(node.dataset.style);style={...style,...format};}
   if((node.tagName==='DIV'||node.tagName==='P')&&node!==editor&&runs.length&&!runs[runs.length-1].text.endsWith('\n'))runs.push({text:'\n'});
   node.childNodes.forEach(child=>walk(child,style));
  }
  walk(editor);return runs;
 };
 function restoreSelection(){if(!selection)return;
  const range=document.createRange(),walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let offset2=0,node:Node|null;let startSet=false;
  while((node=walker.nextNode())){const length=node.textContent?.length||0;if(!startSet&&selection.start<=offset2+length){range.setStart(node,Math.max(0,selection.start-offset2));startSet=true;}if(startSet&&selection.end<=offset2+length){range.setEnd(node,Math.max(0,selection.end-offset2));break;}offset2+=length;}
  if(startSet){const sel=window.getSelection();sel?.removeAllRanges();sel?.addRange(range);} }
 function wrapPlainText(){
  const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT),nodes:Text[]=[];let node:Node|null;
  while((node=walker.nextNode())){const styled=node.parentElement?.closest('[data-style]');if(!styled||!editor.contains(styled))nodes.push(node as Text);}
  for(const node of nodes){const span=document.createElement('span');span.dataset.style='{}';styleText(span,e,1/3);node.before(span);span.append(node);}
  if(nodes.length)restoreSelection();
 }
 const compact=(runs:TextRun[])=>{const result:TextRun[]=[];for(const run of runs){const {text,...style}=run;const previous=result.at(-1);if(previous){const {text:_,...old}=previous;if(JSON.stringify(old)===JSON.stringify(style)){previous.text+=text;continue;}}result.push(run);}return result;};
 editor.addEventListener('input',()=>{const runs=compact(read());const text=runs.map(r=>r.text).join('');if(text.length>10000||runs.length>2000){renderRuns(editor,e,e.text,1/3);return;}e.runs=runs;e.text=text;capture();wrapPlainText();save();});
 editor.addEventListener('drop',event=>event.preventDefault());
 const insertText=(text:string)=>{const sel=window.getSelection();if(!sel?.rangeCount)return;const range=sel.getRangeAt(0);if(!editor.contains(range.commonAncestorContainer))return;range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);if(text.endsWith('\n')){const placeholder=document.createElement('br');placeholder.dataset.placeholder='true';node.after(placeholder);}range.setStartAfter(node);range.collapse(true);sel.removeAllRanges();sel.addRange(range);editor.dispatchEvent(new Event('input'));};
 editor.addEventListener('paste',event=>{event.preventDefault();insertText(event.clipboardData?.getData('text/plain')||'');});
 editor.addEventListener('beforeinput',event=>{if(event.inputType==='insertParagraph'||event.inputType==='insertLineBreak'){event.preventDefault();insertText('\n');}});

 const api={editor,hint,dispose:()=>listeners.abort(),apply(key:TextStyleKey,value:any){
  if(!selection||selection.start===selection.end){defaultStyle(key,value);styleText(editor,e,1/3);editor.style.textDecoration='none';renderRuns(editor,e,e.text,1/3);return;}
  let offset=0;const runs:TextRun[]=[];
  for(const run of read()){
   const start=Math.max(0,selection.start-offset),end=Math.min(run.text.length,selection.end-offset);
   if(end>start){if(start)runs.push({...run,text:run.text.slice(0,start)});runs.push({...run,text:run.text.slice(start,end),[key]:value});if(end<run.text.length)runs.push({...run,text:run.text.slice(end)});}
   else runs.push(run);
   offset+=run.text.length;
  }
  if(runs.length>2000)return;
  e.runs=compact(runs);e.text=runs.map(r=>r.text).join('');renderRuns(editor,e,e.text,1/3);
  restoreSelection();save();
 }};
 editor.addEventListener('keydown',event=>{
  const key=({b:'bold',i:'italic',u:'underline'} as const)[event.key.toLowerCase() as 'b'|'i'|'u'];
  if((event.ctrlKey||event.metaKey)&&key){event.preventDefault();capture();const control=editor.closest('form')?.querySelector<HTMLInputElement>(`[name="${key}"]`);api.apply(key,!control?.checked);capture();}
 });
 return api;
}
