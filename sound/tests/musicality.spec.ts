import {test,expect,type Page} from '@playwright/test';
import {leadChord,responsePhrase,phraseBreath,phraseContour,conversationLevel,phraseNoteAllowed,instrumentGroup,windScoop,firstPhraseAttack,ornamentPitch} from '../src/lib/musicality';
import {makeNoteGroup,emptyNoteGroups,validNoteGroups,cloneNoteGroups} from '../src/lib/note-groups';
import {partsForStyle,styleIds} from '../src/lib/presets';
import {decodeSettings} from '../src/lib/sound-settings';

test('voice leading preserves chord tones, common voices and close inversions without drift',()=>{
 expect(leadChord([5,9,12],[0,4,7])).toEqual([0,5,9]);
 expect(leadChord([0,4,7],[0,4,7])).toEqual([0,4,7]);
 let previous=[0,4,7];
 for(let bar=0;bar<32;bar++){
  const raw=[[0,4,7],[5,9,12],[9,12,16],[7,11,14]][bar%4],next=leadChord(raw,previous);
  expect(next.map(n=>(n%12+12)%12).sort()).toEqual(raw.map(n=>n%12).sort());
  expect(next.every((n,i)=>i===0||n>next[i-1])).toBe(true);
  expect(Math.max(...next.map((n,i)=>Math.abs(n-previous[i])))).toBeLessThanOrEqual(5);
  previous=next;
 }
});
test('responses follow the whole current question without overwriting either motif',()=>{
 const own=[1,1,2,2,1,1,2,2],question=[0,2,4,2,0,1,3,1],copy=[...own];
 const answer=responsePhrase(own,question,2);
 expect(answer).not.toEqual(own);expect(own).toEqual(copy);expect(answer.every(n=>n>=0&&n<=4)).toBe(true);
 const changed=responsePhrase(own,question.map(n=>4-n),2);expect(changed).not.toEqual(answer);
});
test('breaths leave the answering instrument audible and never silence the entire dialogue',()=>{
 for(const style of styleIds)for(let bar=0;bar<4;bar+=.05){
  expect(phraseBreath(style,bar,-1)).toBe(false);
  expect(phraseBreath(style,bar,0)&&phraseBreath(style,bar,1)).toBe(false);
  for(const role of [0,1]){expect(conversationLevel(bar,role)).toBeGreaterThanOrEqual(.7);expect(conversationLevel(bar,role)).toBeLessThanOrEqual(1);}
 }
 expect(phraseBreath('classical',1.9,0)).toBe(true);expect(phraseBreath('classical',3.9,1)).toBe(true);
});
test('long arches change density, register and timbre smoothly without a master fade',()=>{
 for(const style of styleIds){
  let max=0,min=1;
  for(let bar=0;bar<32;bar+=.1){
   const a=phraseContour(style,bar),b=phraseContour(style,bar+.001);max=Math.max(max,a.energy);min=Math.min(min,a.energy);
   if(a.velocity<.97||a.velocity>1.03||Math.abs(a.cutoff-b.cutoff)>=.001||!phraseNoteAllowed(style,bar,2,4,1))throw new Error('Invalid arch '+style+'/'+bar);
  }
  expect(max).toBeGreaterThan(.99);expect(min).toBeLessThan(.01);
 }
});
test('instrument-specific grace notes, trills and scoops are valid, saved and style-safe',()=>{
 const plain=makeNoteGroup('run',4,()=>.5),rows=emptyNoteGroups();
 rows[0]=instrumentGroup(plain,'piano','classical',.5);expect(rows[0]!.ornament).toBe('grace');expect(validNoteGroups(rows,'piano')).toBe(true);
 rows[0]=instrumentGroup(plain,'flute','classical',.5);expect(rows[0]!.ornament).toBe('trill');expect(validNoteGroups(rows,'flute')).toBe(true);
 const held=instrumentGroup(makeNoteGroup('chord',3,()=>.5),'pad','ambient',.5);const heldRows=emptyNoteGroups();heldRows[0]=held;expect(validNoteGroups(heldRows,'pad')).toBe(true);expect(held.notes[0].gate).toBeGreaterThan(4);
 expect(cloneNoteGroups(rows)[0]!.ornament).toBe('trill');expect(validNoteGroups(rows,'piano')).toBe(false);
 expect(instrumentGroup(plain,'flute','house',1)).toBe(plain);
 expect(ornamentPitch(0,0,4,1)).toBe(2);expect(ornamentPitch(4,0,4,1)).toBe(5);
 expect(windScoop('jazz','saxophone',2,0)).toBeLessThan(0);expect(windScoop('house','saxophone',2,0)).toBe(0);expect(windScoop('jazz','saxophone',2,1)).toBe(0);
 const points=Array(16).fill(false);points[2]=true;points[6]=true;
 expect(firstPhraseAttack(points,2,16,1,0)).toBe(true);expect(firstPhraseAttack(points,6,16,1,0)).toBe(false);
});
function fixture(instrument='pluck'){
 const rows=emptyNoteGroups();rows[0]=makeNoteGroup('chord',3,()=>.5);
 return {version:2,style:'pop',bpm:220,volume:.3,center:'off',background:'off',orbit:'dot',tracks:partsForStyle('pop').map((p,i)=>({enabled:i===0,mute:false,instrument:i===0?instrument:p.instrument,groups:i===0?rows:emptyNoteGroups(),points:Array.from({length:16},(_,s)=>s===0),grid:16,slots:16,pitch:0,volume:.5,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};
}
async function load(page:Page,data:ReturnType<typeof fixture>){
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'musical.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();
}
async function spy(page:Page){
 await page.addInitScript(()=>{
  (window as any).attacks=[];(window as any).pitchRamps=[];const pitched=new WeakSet<AudioParam>(),ramp=AudioParam.prototype.exponentialRampToValueAtTime;
  AudioParam.prototype.exponentialRampToValueAtTime=function(value,time){if(pitched.has(this))(window as any).pitchRamps.push(value);return ramp.call(this,value,time);};
  const set=AudioParam.prototype.setValueAtTime,start=OscillatorNode.prototype.start,values=new WeakMap<AudioParam,number>();
  AudioParam.prototype.setValueAtTime=function(value,time){values.set(this,value);return set.call(this,value,time);};
  OscillatorNode.prototype.start=function(at=0){pitched.add(this.frequency);(window as any).attacks.push({at,hz:values.get(this.frequency)});return start.call(this,at);};
 });
}
test('real playback keeps a common tone and moves the other chord voices by steps at a harmony change',async({page})=>{
 await spy(page);await page.goto('/de/');await load(page,fixture());await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>new Set((window as any).attacks.map((n:any)=>n.at)).size)).toBeGreaterThanOrEqual(3);
 const voices=await page.evaluate(()=>{
  const events=(window as any).attacks,times=[...new Set(events.map((n:any)=>n.at))];
  return times.slice(0,3).map(at=>events.filter((n:any)=>n.at===at).filter((_:any,i:number)=>i%3===0).map((n:any)=>n.hz));
 });
 expect(voices[0]).toHaveLength(3);expect(voices[2][0]).toBeCloseTo(voices[0][0],3);
 expect(12*Math.log2(voices[2][1]/voices[0][1])).toBeCloseTo(1,3);expect(12*Math.log2(voices[2][2]/voices[0][2])).toBeCloseTo(2,3);
});
test('a flute trill really reuses one voice while four note onsets remain visible',async({page})=>{
 await spy(page);await page.goto('/de/');const data=fixture('flute');data.style='classical';data.bpm=100;
 const trill=instrumentGroup(makeNoteGroup('run',4,()=>.5),'flute','classical',1);data.tracks[0].groups[0]=trill;
 expect(decodeSettings(JSON.stringify(data))).not.toBeNull();await load(page,data);await page.locator('#play').click();await page.waitForTimeout(650);
 expect(await page.evaluate(()=>(window as any).attacks.length)).toBe(2);
 const interval=await page.evaluate(()=>12*Math.log2((window as any).pitchRamps[0]/(window as any).attacks[0].hz));expect(interval).toBeCloseTo(2,3);
});
test('standard presets and Random Play expose the new phrasing without audio errors or revived connectors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');
 await page.locator('[data-style-preset=classical]').click();await page.locator('#play').click();await page.waitForTimeout(1000);await page.locator('#play').click();
 await page.locator('[data-style-preset=jazz]').click();await page.locator('#evolve').click();await page.waitForTimeout(1400);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});

test('held pad chord voices continue through the next bar instead of re-attacking every chord',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await spy(page);await page.goto('/de/');const data=fixture('pad');
 data.tracks[0].groups[0]=instrumentGroup(makeNoteGroup('chord',3,()=>.5),'pad','pop',.5);
 await load(page,data);await page.locator('#play').click();await page.waitForTimeout(1350);
 expect(await page.evaluate(()=>(window as any).attacks.length)).toBe(9);expect(errors).toEqual([]);
});
