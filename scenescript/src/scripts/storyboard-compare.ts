import {lookWords} from '../lib/storyboard-look-i18n';
import {previewLibrary2D} from '../lib/storyboard-model2d';
import {resourcePreview2D} from '../lib/stage2d-resource-preview';
import {stageFrame2D} from '../lib/stage2d-frame';
import {prepareStage2DPreview,createStage2DView} from './stage2d-preview';
import type {Project} from '../lib/model';
import type {BoardReviewTarget,BoardSubject} from '../lib/storyboard';
export function storyboardCompareButton(project:Project,target:BoardReviewTarget,valid:()=>boolean,feedback:(notes:string)=>void,refine:(notes:string,comparison:{reference:string;rendered:string;time:number})=>void){
 const t=lookWords(document.documentElement.lang),button=document.createElement('button'),board=project.storyboard!,item=board[target.kind].find(s=>s.id===target.id)!,reference=item.image?board.images[item.image]?.data:undefined;
 button.type='button';button.textContent=t.compare;button.dataset.boardCompare=target.id;button.disabled=!reference;button.setAttribute('aria-haspopup','dialog');
 button.onclick=()=>{
  if(!valid()||document.getElementById('storyboard-compare-dialog'))return;
  const dialog=document.createElement('dialog'),title=document.createElement('h2'),grid=document.createElement('div'),tools=document.createElement('div'),notes=document.createElement('textarea'),status=document.createElement('p'),time=document.createElement('input');dialog.id='storyboard-compare-dialog';title.id='storyboard-compare-title';title.textContent=t.compare+' · '+('title'in item?item.title:item.name);dialog.setAttribute('aria-labelledby',title.id);grid.className='board-compare-grid';
  const panel=(label:string)=>{const box=document.createElement('figure'),caption=document.createElement('figcaption'),img=new Image();caption.textContent=label;img.alt=label;box.append(caption,img);grid.append(box);return img;};const original=panel(t.reference),rendered=panel(t.render);original.src=reference!;
  time.type='range';time.min='0';time.step='.05';time.value='0';time.setAttribute('aria-label',t.time);const timeLabel=document.createElement('label');timeLabel.textContent=t.time;timeLabel.append(time);
  const noteLabel=document.createElement('label');noteLabel.textContent=t.notes;notes.maxLength=5000;notes.rows=4;notes.setAttribute('aria-label',t.notes);noteLabel.append(notes);const hint=document.createElement('p');hint.textContent=t.hint+(target.kind==='shots'?' '+t.shotHint:'');
  const action=(label:string)=>{const b=document.createElement('button');b.type='button';b.textContent=label;tools.append(b);return b;},save=action(t.save),ai=action(t.refine),close=action(t.close);ai.dataset.compareRefine='';save.dataset.compareSave='';close.onclick=()=>dialog.close();
  const signal=new AbortController();let disposed=false,pending=false,queued=false,view:ReturnType<typeof createStage2DView>|undefined,dispose=()=>{};
  const scene=target.kind==='shots'?project.scenes.find(s=>s.id===target.id):undefined;
  const update=()=>{save.disabled=!notes.value.trim()||!valid();ai.disabled=!notes.value.trim()||!rendered.src||pending||!valid()||(target.kind==='shots'&&!board.approved);};
  notes.oninput=update;save.onclick=()=>{if(!valid()){status.textContent=t.stale;return;}const text=notes.value.trim();if(text){dialog.close();feedback(text);}};ai.onclick=()=>{if(!valid()){status.textContent=t.stale;return;}const text=notes.value.trim();if(text&&rendered.src){const comparison={reference:reference!,rendered:rendered.src,time:time.valueAsNumber};dialog.close();refine(text,comparison);}};
  dialog.append(title,grid,timeLabel,noteLabel,hint,status,tools);document.body.append(dialog);dialog.addEventListener('close',()=>{disposed=true;signal.abort();view?.dispose();dispose();dialog.remove();if(button.isConnected)button.focus();},{once:true});dialog.showModal();close.focus();
  void(async()=>{try{
   let draw:(time:number)=>Promise<string>;
   if(target.kind==='shots'){
    if(!scene)throw Error(t.missing);time.max=String(scene.duration);const offset=project.scenes.slice(0,project.scenes.indexOf(scene)).reduce((n,s)=>n+s.duration,0),{ExportMedia}=await import('./export-media'),{ExportRenderer}=await import('./export-renderer'),media=new ExportMedia(project,signal.signal),renderer=new ExportRenderer(project,media);dispose=()=>{renderer.dispose();media.dispose();};if(disposed){dispose();return;}draw=async t=>{const frame=await renderer.frame(offset+Math.min(t,Math.max(0,scene.duration-.000001)),project.format==='portrait'?432:project.format==='square'?640:768,project.format==='portrait'?768:project.format==='square'?640:432);try{return frame.toDataURL('image/webp',.92);}finally{frame.width=0;frame.height=0;}};
   }else{
    const library=previewLibrary2D(project,item as BoardSubject,target.kind==='settings'),kind=target.kind==='settings'?'stages2d':'objects2d',id=(item as BoardSubject).resource2d??item.id,clips=Object.keys(library[kind][id]?.model?.animations??{}),clip=clips.includes('idle')?'idle':clips[0]??'',sample=resourcePreview2D(library,kind,id,clip);if(!sample)throw Error('2D resource missing');await prepareStage2DPreview();if(disposed)return;const frame=stageFrame2D(sample.resources.stages2d.preview),scale=Math.min(768/frame.width,768/frame.height);view=createStage2DView(sample.resources,sample.shot,sample.duration,Math.round(frame.width*scale),Math.round(frame.height*scale),e=>{status.textContent=e.message;},sample.isolated);time.max=String(sample.duration);draw=async t=>{await view!.draw(t);if(view!.canvas.dataset.stage2dError)throw Error(status.textContent??'2D');return view!.canvas.toDataURL('image/webp',.92);};
   }
   const refresh=async()=>{if(pending){queued=true;return;}pending=true;update();try{const data=await draw(time.valueAsNumber);if(!disposed)rendered.src=data;}catch(e){if(!disposed){rendered.removeAttribute('src');status.textContent=(e as Error).message;}}finally{pending=false;if(!disposed){update();if(queued){queued=false;void refresh();}}}};
   time.oninput=()=>void refresh();await refresh();
  }catch(e){if(!disposed){status.textContent=(e as Error).message;update();}}})();update();
 };return button;
}
