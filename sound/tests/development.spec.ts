import {test,expect} from '@playwright/test';
import {developmentPlan,developmentGain,accompanimentMotif,registerArc,registerNote} from '../src/lib/development';
const track=(instrument:string)=>({instrument,enabled:true,mute:false,volume:.5,points:Array(16).fill(true)});
test('lead rotates and longer rests exclude foundations and disabled tracks',()=>{
 const tracks=['kick','bass','piano','guitar','harp'].map(track);
 const first=developmentPlan(tracks,0,null,()=>0),next=developmentPlan(tracks,128,first,()=>0);
 expect(first.lead).toBe(2);expect(next.lead).not.toBe(first.lead);
 expect(first.rest).toBe(3);
 expect(developmentGain(first,3,64,false)).toBe(0);
 expect(developmentGain(first,3,100,false)).toBeGreaterThan(0);
 expect(developmentGain(first,3,64,true)).toBeGreaterThan(0);
 tracks[3].mute=true;tracks[4].enabled=false;
 expect(developmentPlan(tracks,256,next,()=>0).rest).toBe(-1);
});
test('lead handover is continuous and does not amplify',()=>{
 const plan={start:128,lead:3,previousLead:2,rest:-1,variation:4};
 expect(developmentGain(plan,2,128,false)).toBe(1);
 expect(developmentGain(plan,3,128,false)).toBe(.32);
 for(let s=128;s<160;s++){
  expect(Math.abs(developmentGain(plan,2,s,false)-developmentGain(plan,2,s+1,false))).toBeLessThan(.02);
 }
});
test('accompaniment varies without overwriting drawing or chorus motifs',()=>{
 const motif=[0,1,2,1,0,2,1,0],before=[...motif],plan={start:0,lead:2,previousLead:2,rest:3,variation:4};
 expect(accompanimentMotif(motif,plan,4,32,'verse')).not.toEqual(motif);
 expect(accompanimentMotif(motif,plan,4,32,'chorus')).toEqual(motif);
 expect(motif).toEqual(before);
});
test('register develops over minutes in small consonant steps',()=>{
 for(let bar=0;bar<144;bar++){
  expect(Math.abs(registerArc(bar+1)-registerArc(bar))).toBeLessThanOrEqual(1);
  const note=registerNote(7,registerArc(bar),0,[0,4,7]);
  expect([0,4,7]).toContain((note%12+12)%12);
 }
 expect(registerNote(7,3,0,[0,4,7])).toBe(19);
 expect(new Set(Array.from({length:36},(_,bar)=>registerArc(bar))).size).toBeGreaterThan(3);
});

test('long-run development keeps changing without modifying source phrases',()=>{
 const tracks=['kick','bass','piano','guitar','harp'].map(track),before=JSON.stringify(tracks);
 let plan:ReturnType<typeof developmentPlan>|null=null;
 const registers=new Set<number>(),leads:number[]=[];
 for(let bar=0;bar<144;bar++){
  if(bar%8===0){const next=developmentPlan(tracks,bar*16,plan,()=>0);if(plan)expect(next.lead).not.toBe(plan.lead);plan=next;leads.push(plan.lead);}
  registers.add(registerArc(bar));
  for(let i=0;i<tracks.length;i++){
   const gain=developmentGain(plan!,i,bar*16,bar%24>=16);
   expect(gain).toBeGreaterThanOrEqual(0);expect(gain).toBeLessThanOrEqual(1);
  }
 }
 expect(leads.length).toBe(18);expect(registers.size).toBe(5);
 expect(JSON.stringify(tracks)).toBe(before);
});
test('silent patterns cannot become leads and chorus release can be crossfaded',()=>{
 const tracks=['piano','guitar','harp'].map(track);tracks.forEach(tr=>tr.points.fill(false));
 const empty=developmentPlan(tracks,0,null,()=>0);
 expect(empty.lead).toBe(-1);expect(empty.rest).toBe(-1);expect(empty.variation).toBe(-1);
 const plan={start:0,lead:0,previousLead:0,rest:1,variation:2};
 expect(developmentGain(plan,1,64,0)).toBe(0);
 expect(developmentGain(plan,1,64,.5)).toBeCloseTo(.19);
 expect(developmentGain(plan,1,64,1)).toBeCloseTo(.38);
});
