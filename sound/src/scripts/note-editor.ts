import {cloneScore,deleteScorePoint,noteEditorCopy,scoreClamp,type NoteScore} from '../lib/note-score';
import type {Language} from '../lib/i18n';
import {padForKey,padNumbers} from '../lib/orbit-layout';
type EditorTrack={name:string;color:string;muted:boolean;score:NoteScore;hit:number};
type Host={language:Language;tracks:()=>EditorTrack[];steps:()=>number;hit:(index:number)=>number;select:(index:number|null)=>void;change:(index:number,score:NoteScore)=>void;finish:(index:number,accept:boolean)=>void};
/** DOM/SVG editor only; audio and accepted-vs-draft persistence belong to the transport. */
export function createNoteEditor(host:Host){
 const root=document.querySelector<HTMLElement>('#note-editor')!,grid=root.querySelector<SVGSVGElement>('#score-grid')!;
 const c=noteEditorCopy[host.language],workspace=root.querySelector<HTMLElement>('#score-workspace')!,cards=root.querySelector<HTMLElement>('#score-instruments')!,companions=root.querySelector<HTMLElement>('#score-companions')!;
 const volume=root.querySelector<HTMLInputElement>('#score-volume')!,volumeWrap=root.querySelector<HTMLElement>('#score-volume-wrap')!,snap=root.querySelector<HTMLInputElement>('#score-snap')!,remove=root.querySelector<HTMLButtonElement>('#score-delete')!,status=root.querySelector<HTMLElement>('#score-status')!;
 let selected:number|null=null,notes:NoteScore=[],point:{note:number;point:number}|null=null,dirty=false,low=0,high=24;
 let inset=48;
 let cursor={time:.25,pitch:12};
 let drag:{id:number;note:number;before:NoteScore;changed:boolean;lastPitch:number;startX:number;startY:number}|null=null;
 const x=(t:number)=>inset+t*(680-inset),y=(p:number)=>470-(p-low)/(high-low)*432;
 const quant=(t:number)=>scoreClamp(snap.checked?Math.round(t*host.steps())/host.steps():t,0,1-.002);
 const coords=(e:PointerEvent)=>{const b=grid.getBoundingClientRect();return {x:(e.clientX-b.left)/b.width*700,y:(e.clientY-b.top)/b.height*500};};
 const pitchAt=(v:number)=>Math.round(scoreClamp(low+(470-v)/432*(high-low),low,high));
 function changed(){if(selected===null)return;dirty=true;host.change(selected,cloneScore(notes));render();}
 function finish(accept:boolean){
  if(selected===null)return;drag=null;const index=selected;selected=null;point=null;dirty=false;
  host.finish(index,accept);host.select(null);render();
 }
 function select(index:number){
  if(selected===index)return;
  if(dirty){status.textContent=c.pending;return;}
  if(selected!==null)finish(false);
  selected=index;notes=cloneScore(host.tracks()[index].score);point=null;dirty=false;
  const pitches=notes.flatMap(n=>n.points.map(p=>p.pitch)),min=Math.min(0,...pitches),max=Math.max(24,...pitches);
  low=Math.max(-24,Math.floor(min/12)*12);high=Math.min(60,Math.max(low+24,Math.ceil(max/12)*12));
  host.select(index);render();grid.focus({preventScroll:true});
 }
 function card(index:number,track:EditorTrack){
  const button=document.createElement('button');button.type='button';button.dataset.scoreTrack=String(index);button.style.setProperty('--lane',track.color);button.dataset.muted=String(track.muted);
  const number=document.createElement('b');number.textContent=String(padNumbers[index]);const name=document.createElement('span');name.textContent=track.name;
  const preview=document.createElementNS('http://www.w3.org/2000/svg','svg');preview.setAttribute('viewBox','0 0 100 35');preview.setAttribute('aria-hidden','true');
  const pitches=track.score.flatMap(n=>n.points.map(p=>p.pitch)),min=Math.min(0,...pitches),max=Math.max(24,...pitches);
  for(const note of track.score)for(const p of note.points){const circle=document.createElementNS(preview.namespaceURI,'circle');circle.setAttribute('cx',String(3+(note.start+p.offset)*94));circle.setAttribute('cy',String(31-(p.pitch-min)/(max-min)*26));circle.setAttribute('r',String(1.3+p.velocity*1.4));preview.append(circle);}
  button.append(number,name,preview);button.addEventListener('click',()=>select(index));return button;
 }
 function render(){
  root.dataset.selected=selected===null?'':String(selected);root.dataset.dirty=String(dirty);root.dataset.score=JSON.stringify(notes);
  const tracks=host.tracks();cards.hidden=selected!==null;workspace.hidden=selected===null;status.textContent=selected===null?c.choose:'';
  cards.replaceChildren(...tracks.map((tr,i)=>card(i,tr)));
  if(selected===null)return;
  root.querySelector('#score-instrument-name')!.textContent=tracks[selected].name;
  companions.replaceChildren(...tracks.flatMap((tr,i)=>i===selected?[]:[card(i,tr)]));
  const bounds=grid.getBoundingClientRect(),sx=700/Math.max(200,bounds.width),sy=500/Math.max(120,bounds.height);
  inset=Math.max(48,30*sx);
  const textAt=(px:number,py:number)=>`translate(${px} ${py}) scale(${sx} ${sy})`;
  const color=tracks[selected].color;root.style.setProperty('--score-color',color);
  let markup='<defs>';
  notes.forEach((n,i)=>{markup+=`<linearGradient id="score-gradient-${i}" x1="0%" x2="100%">`+n.points.map(p=>`<stop offset="${p.offset/n.duration*100}%" stop-color="${color}" stop-opacity="${.3+p.velocity*.7}"/>`).join('')+'</linearGradient>';});
  markup+='</defs>';
  for(let p=low;p<=high;p++){
   const name=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][((p%12)+12)%12]+(4+Math.floor(p/12));
   markup+=`<line class="score-pitch-line ${p%12===0?'score-octave':''}" x1="${inset}" x2="680" y1="${y(p)}" y2="${y(p)}"/><text class="score-pitch-name" x="0" y="0" transform="${textAt(inset-8,y(p)+3*sy)}">${name}</text>`;
  }
  for(let s=0;s<=host.steps();s++){
   const px=x(s/host.steps()),bar=s===0||s===host.steps()/2||s===host.steps(),quarter=s%4===0;
   markup+=`<line class="score-time-line ${bar?'score-bar':quarter?'score-beat':''}" x1="${px}" x2="${px}" y1="28" y2="480"/>`;
   if(quarter&&s<host.steps())markup+=`<text class="score-beat-name" x="0" y="0" transform="${textAt(px+4,20)}">${s<host.steps()/2?'1':'2'}.${Math.floor((s%(host.steps()/2))/4)+1}</text>`;
  }
  markup+=`<line id="score-playhead" x1="${inset}" x2="${inset}" y1="28" y2="480"/>`;
  notes.forEach((n,i)=>{
   const points=n.points.map(p=>`${x(n.start+p.offset)},${y(p.pitch)}`).concat(`${x(n.start+n.duration)},${y(n.points.at(-1)!.pitch)}`);
   markup+=`<polyline class="score-connection" points="${points.join(' ')}" stroke="url(#score-gradient-${i})"/>`;
   n.points.forEach((p,j)=>{const active=point?.note===i&&point.point===j;
    markup+=`<g class="score-point ${active?'is-selected':''}" data-score-note="${i}" data-score-point="${j}" tabindex="0" role="button" aria-label="${c.note} ${i+1}.${j+1}, ${Math.round(p.velocity*100)}%"><ellipse cx="${x(n.start+p.offset)}" cy="${y(p.pitch)}" rx="${10*sx}" ry="${10*sy}" fill="transparent" pointer-events="all"/><ellipse class="score-note" vector-effect="non-scaling-stroke" cx="${x(n.start+p.offset)}" cy="${y(p.pitch)}" rx="${(4+p.velocity*3)*sx}" ry="${(4+p.velocity*3)*sy}" fill="${color}" fill-opacity="${.35+p.velocity*.65}"/></g>`;
   });
  });
  grid.innerHTML=markup;
  const p=point&&notes[point.note]?.points[point.point];volumeWrap.hidden=!p;remove.disabled=!p;
  if(p){volume.value=String(Math.round(p.velocity*100));root.querySelector('#score-volume-value')!.textContent=volume.value+'%';}
 }
 function deletePoint(){if(!point)return;notes=deleteScorePoint(notes,point.note,point.point);point=null;changed();grid.focus({preventScroll:true});}
 grid.addEventListener('pointerdown',e=>{
  if(e.button!==0||selected===null||drag)return;e.preventDefault();grid.focus({preventScroll:true});const pos=coords(e),before=cloneScore(notes);
  const target=(e.target as Element).closest<SVGElement>('[data-score-note]');
  let index:number;
  if(target){index=Number(target.dataset.scoreNote);point={note:index,point:Number(target.dataset.scorePoint)};}
  else{
   if(notes.length>=128||pos.x<inset||pos.x>680||pos.y<28||pos.y>480)return;
   const start=quant((pos.x-inset)/(680-inset));notes.push({start,duration:Math.min(1/host.steps(),1-start),points:[{offset:0,pitch:pitchAt(pos.y),velocity:.8}]});index=notes.length-1;point={note:index,point:0};
  }
  drag={id:e.pointerId,note:index,before,changed:!target,lastPitch:notes[index].points.at(-1)!.pitch,startX:pos.x,startY:pos.y};
  grid.setPointerCapture(e.pointerId);if(!target)changed();else render();
 });
 grid.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;const pos=coords(e),n=notes[drag.note];
  if(Math.hypot(pos.x-drag.startX,pos.y-drag.startY)<7)return;
  const end=quant((pos.x-inset)/(680-inset));if(end<=n.start+.002)return;
  const pitch=pitchAt(pos.y),last=n.points.at(-1)!;
  if(pitch!==drag.lastPitch&&end>n.start+last.offset+.002&&n.points.length<32){n.points.push({offset:end-n.start,pitch,velocity:last.velocity});drag.lastPitch=pitch;point={note:drag.note,point:n.points.length-1};}
  n.duration=Math.min(1-n.start,Math.max(n.points.at(-1)!.offset+.002,end-n.start+1/host.steps()));
  drag.changed=true;changed();
 });
 function release(e:PointerEvent,cancel=false){if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(cancel&&d.changed){notes=d.before;point=null;changed();}if(grid.hasPointerCapture(e.pointerId))grid.releasePointerCapture(e.pointerId);}
 grid.addEventListener('pointerup',e=>release(e));grid.addEventListener('pointercancel',e=>release(e,true));grid.addEventListener('lostpointercapture',e=>{if(drag)release(e,true);});
 grid.addEventListener('keydown',e=>{
  if(e.key===' '){
   e.preventDefault();const target=(e.target as Element).closest<SVGElement>('[data-score-note]');
   if(target){point={note:Number(target.dataset.scoreNote),point:Number(target.dataset.scorePoint)};render();volume.focus();return;}
   if(notes.length>=128)return;const start=quant(cursor.time);notes.push({start,duration:Math.min(1/host.steps(),1-start),points:[{offset:0,pitch:cursor.pitch,velocity:.8}]});point={note:notes.length-1,point:0};changed();return;
  }
  if(!e.key.startsWith('Arrow'))return;e.preventDefault();
  if(point){
   const n=notes[point.note],p=n.points[point.point];
   if(e.key==='ArrowUp'||e.key==='ArrowDown'){p.pitch=scoreClamp(p.pitch+(e.key==='ArrowUp'?1:-1),low,high);changed();grid.focus({preventScroll:true});}
  }else{
   cursor.time=scoreClamp(cursor.time+(e.key==='ArrowRight'?1/host.steps():e.key==='ArrowLeft'?-1/host.steps():0),0,1-.002);
   cursor.pitch=scoreClamp(cursor.pitch+(e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0),low,high);
  }
 });
 grid.addEventListener('contextmenu',e=>e.preventDefault());
 grid.addEventListener('click',e=>{if((e as MouseEvent).detail!==0)return;const target=(e.target as Element).closest<SVGElement>('[data-score-note]');if(target){point={note:Number(target.dataset.scoreNote),point:Number(target.dataset.scorePoint)};render();volume.focus();}});
 volume.addEventListener('input',()=>{if(!point)return;notes[point.note].points[point.point].velocity=Number(volume.value)/100;changed();});
 remove.addEventListener('click',deletePoint);root.querySelector('#score-done')!.addEventListener('click',()=>finish(true));root.querySelector('#score-cancel')!.addEventListener('click',()=>finish(false));
 window.addEventListener('keydown',e=>{
  if(root.hidden||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return;
  if((e.target as Element).closest('input,textarea,select,[contenteditable=true]')&&!(selected!==null&&root.contains(e.target as Node)&&['Enter','Escape'].includes(e.key)))return;
  if(selected!==null&&(e.key==='Enter'||e.key==='Escape')){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)finish(e.key==='Enter');return;}
  if(selected!==null&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();if(!e.repeat)deletePoint();return;}
  const lane=padForKey(e.code,e.key);if(lane!==null&&!e.repeat){e.preventDefault();select(lane);}
 },true);
 render();
 return {refresh:render,cancel:()=>finish(false),get selected(){return selected;},get dirty(){return dirty;},
  animate(time:number,position:number,playing:boolean){
   if(root.hidden)return;
   const head=grid.querySelector('#score-playhead');if(head){head.setAttribute('x1',String(x(position)));head.setAttribute('x2',String(x(position)));head.setAttribute('opacity',playing?'1':'0');}
   root.querySelectorAll<HTMLButtonElement>('[data-score-track]').forEach(b=>{const hit=host.hit(Number(b.dataset.scoreTrack)),age=time-hit;b.style.setProperty('--score-pulse',String(playing&&age>=0?Math.exp(-age*7):0));});
   grid.querySelectorAll<SVGCircleElement>('[data-score-note]').forEach(node=>{const n=notes[Number(node.dataset.scoreNote)],p=n.points[Number(node.dataset.scorePoint)],age=position-n.start-p.offset;node.classList.toggle('is-playing',playing&&age>=0&&age<.025);});
  }
 };
}
