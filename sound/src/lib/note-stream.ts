import type {NoteScore} from './note-score';
import type {LandscapeHistory,LandscapeNote,LandscapeTrack} from './landscape';
export type StreamPreview={index:number;at:number;notes:NoteScore;glide?:boolean};
export type StreamTrack=LandscapeTrack&{name?:string};
export const streamPlot={left:76,strike:174,right:658,top:88,bottom:614};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
/** The play line is time zero. One bar of provisional notes approaches from the right. */
export function streamX(at:number,time:number,barSeconds:number){return streamPlot.strike+(at-time)/Math.max(.1,barSeconds)*(streamPlot.right-streamPlot.strike);}
export function streamPitchY(pitch:number,base:number,spacing:number,pitched=true){return base-(pitched?clamp((pitch-12)/18,-1,1)*spacing*.34:0);}
/** Project existing patterns only; these previews never schedule or synthesize sound. */
export function streamPreviewNotes(preview:StreamPreview,barSeconds:number,time:number){
 const cycle=barSeconds*2,notes:LandscapeNote[]=[];
 for(let repeat=0;repeat<=1;repeat++)for(const note of preview.notes){
  const at=preview.at+repeat*cycle+note.start*cycle;
  if(at<time-1e-7||at>time+barSeconds+.04)continue;
  notes.push({at,pitch:note.points[0].pitch,level:note.points[0].velocity,length:note.duration*cycle,
   curve:note.points.length>1?note.points.map(p=>({offset:p.offset*cycle,pitch:p.pitch,level:p.velocity})):undefined,glide:preview.glide!==false});
 }
 return notes;
}
export function paintNoteStream(ctx:CanvasRenderingContext2D,history:LandscapeHistory,tracks:StreamTrack[],previews:StreamPreview[],time:number,barStart:number,bpm:number,beats:number,dark:boolean,playing:boolean,reduced:boolean,master:number,effect=1){
 const {left,strike,right,top,bottom}=streamPlot,barSeconds=60/bpm*beats,spacing=(bottom-top)/Math.max(1,tracks.length);
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.lineCap='round';ctx.lineJoin='round';
 // Lanes and subdivisions give even quiet music a readable rhythmic framework.
 for(const [rank,tr] of tracks.entries()){
  const y=top+rank*spacing;ctx.fillStyle=tr.color;ctx.globalAlpha=dark?.035:.055;ctx.fillRect(left,y+2,right-left,spacing-4);
  ctx.globalAlpha=dark?.14:.2;ctx.strokeStyle=tr.color;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(left,y+spacing/2);ctx.lineTo(right,y+spacing/2);ctx.stroke();
  ctx.globalAlpha=tr.mute?.3:.8;ctx.fillStyle=tr.color;ctx.font='13px system-ui';ctx.textAlign='left';ctx.fillText(tr.label??String(tr.index+1),24,y+spacing/2-3);
  if(tr.name){ctx.globalAlpha=tr.mute?.25:.6;ctx.font='10px system-ui';ctx.fillText(tr.name,24,y+spacing/2+10,46);}
 }
 for(let quarter=-beats;quarter<=beats*3;quarter++){
  const at=barStart+quarter*60/bpm,x=streamX(at,time,barSeconds);if(x<left||x>right)continue;
  const strong=quarter%beats===0;ctx.strokeStyle=dark?'#b6d2e8':'#36566f';ctx.globalAlpha=strong?.24:.1;ctx.lineWidth=strong?1.5:.8;
  ctx.beginPath();ctx.moveTo(x,top-8);ctx.lineTo(x,bottom+5);ctx.stroke();
  if(x>strike+12){ctx.globalAlpha=.6;ctx.fillStyle=dark?'#b6d2e8':'#36566f';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(String(((quarter%beats)+beats)%beats+1),x,top-18);}
 }
 ctx.save();ctx.beginPath();ctx.rect(left,top-3,right-left,bottom-top+6);ctx.clip();
 for(const [rank,tr] of tracks.entries()){
  const base=top+(rank+.5)*spacing;
  const draw=(note:LandscapeNote,forecast:boolean)=>{
   if(note.pulseOnly)return;
   const start=streamX(note.at,time,barSeconds),end=streamX(note.at+note.length,time,barSeconds);
   if(end<left-8||start>right+8)return;
   const raw=note.curve?.filter(p=>p.offset<=note.length)??[{offset:0,pitch:note.pitch,level:note.level}];
   if(!raw.length)return;
   const points=raw.map(p=>({x:streamX(note.at+p.offset,time,barSeconds),y:streamPitchY(p.pitch,base,spacing,tr.pitched),level:clamp(p.level*tr.volume*master,0,1),at:note.at+p.offset}));
   const last=points.at(-1)!,path=[points[0]];
   for(let i=1;i<points.length;i++){
    if(note.glide===false)path.push({...points[i],y:points[i-1].y});
    path.push(points[i]);
   }
   path.push({...last,x:Math.max(start+5,end)});
   const audible=playing&&!tr.mute&&!forecast,muted=tr.mute||master<=0;
   const peak=Math.max(...points.map(p=>p.level)),age=time-note.at;
   const attack=audible&&age>=0?Math.exp(-age/.22)*effect*clamp(note.level*tr.volume*master,0,1):0;
   ctx.fillStyle=tr.color;ctx.strokeStyle=tr.color;ctx.globalAlpha=muted?.12:forecast?.12:.32+peak*.4;
   ctx.shadowColor=tr.color;ctx.shadowBlur=reduced||forecast?0:attack*16;
   ctx.beginPath();path.forEach((p,i)=>{const w=2+p.level*4;i?ctx.lineTo(p.x,p.y-w):ctx.moveTo(p.x,p.y-w);});
   [...path].reverse().forEach(p=>ctx.lineTo(p.x,p.y+2+p.level*4));ctx.closePath();ctx.fill();
   ctx.shadowBlur=0;ctx.globalAlpha=muted?.2:forecast?.4:.8;ctx.lineWidth=forecast?1:1.4;ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
   for(const p of points){
    if(p.x<left-8||p.x>right+8)continue;
    const elapsed=time-p.at,hit=audible&&elapsed>=0?Math.exp(-elapsed/.2)*p.level*effect:0;
    ctx.globalAlpha=muted?.18:forecast?.5:.65+p.level*.35;ctx.fillStyle=tr.color;ctx.shadowColor=tr.color;ctx.shadowBlur=reduced?0:hit*28;
    ctx.beginPath();ctx.arc(p.x,p.y,2.8+Math.sqrt(p.level)*3+(reduced?0:hit*3),0,Math.PI*2);ctx.fill();
    if(hit>.02){
     // The impact stays on the play line; the played note continues to its left.
     ctx.globalAlpha=Math.min(1,hit*1.6);ctx.fillStyle=dark?'#f5ffff':'#fff';ctx.beginPath();ctx.arc(strike,p.y,2+hit*5,0,Math.PI*2);ctx.fill();
     if(!reduced){ctx.strokeStyle=tr.color;ctx.lineWidth=1.3;ctx.globalAlpha=hit*.65;ctx.beginPath();ctx.arc(strike,p.y,7+(1-Math.min(1,hit))*12,0,Math.PI*2);ctx.stroke();}
    }
   }
  };
  const preview=previews.find(p=>p.index===tr.index);
  if(preview)for(const note of streamPreviewNotes(preview,barSeconds,time))draw(note,true);
  for(const note of history.notes(tr.index))draw(note,false);
 }
 ctx.restore();
 // A single bright, shared strike line, without a sweeping pointer.
 ctx.globalAlpha=dark?.8:.65;ctx.strokeStyle=dark?'#e3f6ff':'#254e67';ctx.lineWidth=1.7;ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(strike,top-10);ctx.lineTo(strike,bottom+10);ctx.stroke();
 ctx.restore();
}
