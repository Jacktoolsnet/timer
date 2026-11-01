import {test,expect} from '@playwright/test';
import {phraseActive,phraseHold} from '../src/lib/phrasing';
test('vocal phrases breathe but drawing and normal play stay direct',()=>{
 const states=Array.from({length:4},(_,bar)=>phraseActive('voice',bar*16,0,false,true,false));
 expect(states).toEqual([true,true,false,false]);
 expect(phraseActive('voice',32,0,true,true,false)).toBe(true);
 expect(phraseActive('voice',48,0,false,true,true)).toBe(true);
 expect(phraseActive('voice',48,0,false,false,false)).toBe(true);
 expect(phraseActive('strings',112,0,false,true,false)).toBe(false);
 expect(phraseActive('piano',112,0,false,true,false)).toBe(true);
});
test('phrase gates bridge neighbours in either direction, not long gaps',()=>{
 const points=Array(16).fill(false);points[4]=true;
 expect(phraseHold(points,0,1,.125)).toBeCloseTo(.535);
 expect(phraseHold(points,8,-1,.125)).toBeCloseTo(.535);
 expect(phraseHold(points,0,-1,.125)).toBeCloseTo(.375);
 points.fill(false);expect(phraseHold(points,0,1,.125)).toBeCloseTo(.375);
});
test('phrase gates follow swing rather than cutting long eighths short',()=>{
 const points=Array(16).fill(false);points[2]=true;
 expect(phraseHold(points,0,1,.2,.2,0)).toBeCloseTo(.515);
 expect(phraseHold(points,0,1,.2,.2,2)).toBeCloseTo(.355);
});
test('live sustained voices render joined notes without a new attack or endless tail',async({page})=>{
 await page.goto('/de/');
 const metrics=await page.evaluate(async()=>{
  const url='/src/lib/sustained-voice.ts';
  const {createSustainedVoice}=await import(url);
  const results=[];
  for(const id of ['voice','strings']){
   const sr=22050,ctx=new OfflineAudioContext(1,sr*3,sr);let ended=0;
   const voice=createSustainedVoice(ctx,ctx.destination,id,220,.01,.2,.5,0,()=>ended++);
   voice.note(.4,246.94,.2,.5,.2);voice.note(.8,261.63,.2,.5,.4);
   const rendered=await ctx.startRendering(),data=rendered.getChannelData(0);
   const rms=(a:number,b:number)=>{let sum=0;for(let i=Math.floor(a*sr);i<Math.floor(b*sr);i++)sum+=data[i]**2;return Math.sqrt(sum/((b-a)*sr));};
   results.push({id,finite:data.every(Number.isFinite),joined:rms(.4,.45),held:rms(.3,.35),tail:rms(2.5,2.9),ended});
  }
  return results;
 });
 for(const result of metrics){
  expect(result.finite).toBe(true);expect(result.joined).toBeGreaterThan(result.held*.3);
  expect(result.held).toBeGreaterThan(.001);expect(result.tail).toBeLessThan(.00001);expect(result.ended).toBe(1);
 }
});
