/** Evolve a loop sparingly, preserving kick anchors and avoiding full/empty tracks. */
type Track={enabled:boolean;mute:boolean;instrument:string;points:boolean[]};
export function nextEvolutionStep(step:number,random= Math.random):number{
 return (Math.floor(step/16)+2+Math.floor(random()*7))*16;
}
export function evolvePattern(tracks:Track[],random=Math.random,grid:number[]=Array.from({length:16},(_,i)=>i),maximum=3):number{
 const candidates=tracks.flatMap((tr,i)=>{
  if(!tr.enabled||tr.mute)return [];
  const count=tr.points.filter(Boolean).length;
  return tr.points.flatMap((on,s)=>{
   if(!grid.includes(s))return [];
   if(tr.instrument==='kick'&&s%4===0)return [];
   if(on&&count<=1||!on&&count>=12)return [];
   return [{i,s}];
  });
 });
 const amount=Math.min(candidates.length,1+Math.floor(random()*maximum));
 let changed=0;
 for(let n=0;n<amount;n++){
  const index=Math.floor(random()*candidates.length);
  const [{i,s}]=candidates.splice(index,1),tr=tracks[i],count=tr.points.filter(Boolean).length;
  if(tr.points[s]?count<=1:count>=12)continue;
  tr.points[s]=!tr.points[s];changed++;
 }
 return changed;
}
