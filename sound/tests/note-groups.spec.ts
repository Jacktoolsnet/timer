import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {emptyNoteGroups,makeNoteGroup,cloneNoteGroups,validNoteGroups,groupPitch,groupHarmony,noteGroupWindow,chordCapable,groupOffset,type NoteGroup} from '../src/lib/note-groups';
import {partsForStyle,styleIds} from '../src/lib/presets';
import {decodeSettings} from '../src/lib/sound-settings';
import {groupMemberPoint} from '../src/lib/note-group-view';
import {ORBIT_OUTER_RADIUS} from '../src/lib/orbit-layout';

test('groups encode independent onset, chord-relative pitch, velocity and length',()=>{
 const run=makeNoteGroup('run',4,()=>.5),chord=makeNoteGroup('chord',3,()=>.5),rows=emptyNoteGroups();rows[0]=run;rows[4]=chord;
 expect(run.notes.map(n=>n.offset)).toEqual([0,.25,.5,.75]);
 expect(new Set(run.notes.map(n=>n.tone)).size).toBeGreaterThan(1);expect(run.notes[0].velocity).not.toBe(run.notes[1].velocity);
 expect(groupOffset(.5,2,.2)).toBeCloseTo(.6);expect(groupOffset(1/3,3,.2)).toBe(1/3);
 expect(chord.notes.every(n=>n.offset===0)).toBe(true);expect(chord.notes.map(n=>n.tone)).toEqual([0,1,2]);
 expect(validNoteGroups(rows,'piano')).toBe(true);expect(validNoteGroups(rows,'saxophone')).toBe(false);
 const copy=cloneNoteGroups(rows);copy[0]!.notes[0].velocity=.2;expect(rows[0]!.notes[0].velocity).toBe(.9);
 for(const id of ['saxophone','voice','flute','kick','bass'])expect(chordCapable(id)).toBe(false);
});
test('all generated voicings remain in the current major/minor/jazz triad across registers',()=>{
 for(const style of styleIds)for(let bar=0;bar<24;bar++)for(const base of [-5,0,7,14,24]){
  const chord=groupHarmony(style,bar);
  const notes=[0,1,2].map(tone=>groupPitch(base,chord.root,chord.third,tone));
  for(const pitch of notes)if(![0,chord.third,7].includes(((pitch-chord.root)%12+12)%12))throw Error('Outside chord');
  expect(new Set(notes).size).toBe(3);
 }
});
test('available windows respect reverse, shifted patterns, swing and the end of the bar',()=>{
 for(const slots of [4,8,12,16])for(const beats of [2,3,4])for(const dir of [1,-1])for(const phase of [0,3]){
  const points=Array(16).fill(false);points[0]=true;points[Math.floor(slots/2)]=true;
  for(const beat of [0,Math.floor(slots/2)]){
   const span=noteGroupWindow(points,beat,slots,dir,phase,beats,120,.2);
   expect(span).toBeGreaterThan(0);expect(span).toBeLessThanOrEqual(.5);
  }
 }
 const points=Array(16).fill(false);points[15]=true;
 expect(noteGroupWindow(points,15,16,1,0,4,120,0)).toBeCloseTo(.125);
 const first=groupMemberPoint(100,-Math.PI/2,'chord',0,3),last=groupMemberPoint(100,-Math.PI/2,'chord',2,3);
 expect(last.radius-first.radius).toBe(13);expect(first.radius).toBeGreaterThan(80);
});
function fixture(group:NoteGroup,instrument='pluck',direction=1){
 const groups=emptyNoteGroups();groups[0]=group;
 return {version:2,style:'pop',bpm:100,volume:.3,background:'off',center:'off',orbit:'dot',
  tracks:partsForStyle('pop').map((p,i)=>({enabled:i===0,mute:false,instrument:i===0?instrument:p.instrument,groups:i===0?groups:emptyNoteGroups(),grid:16,slots:16,
   points:Array.from({length:16},(_,s)=>s===0||s===4),volume:.5,pitch:0,phase:0,direction,directionMode:direction===1?'forward':'reverse',randomDynamics:false,morph:null}))};
}
test('JSON validates every member and keeps older single-note projects compatible',()=>{
 const data=fixture(makeNoteGroup('run',4));expect(decodeSettings(JSON.stringify(data))!.tracks[0].groups).toEqual(data.tracks[0].groups);
 const old=JSON.parse(JSON.stringify(data));old.tracks.forEach((t:any)=>delete t.groups);expect(decodeSettings(JSON.stringify(old))).not.toBeNull();
 for(const change of [(g:any)=>g.notes[1].offset=-1,(g:any)=>g.notes[1].velocity=5,(g:any)=>g.notes[1].tone=1.5,(g:any)=>g.notes[1].gate=NaN,(g:any)=>g.notes.push(...g.notes)]){
  const bad=JSON.parse(JSON.stringify(data));change(bad.tracks[0].groups[0]);expect(decodeSettings(JSON.stringify(bad))).toBeNull();
 }
 const wrong=fixture(makeNoteGroup('chord',3),'saxophone');expect(decodeSettings(JSON.stringify(wrong))).toBeNull();
});
async function spy(page:Page){
 await page.addInitScript(()=>{
  Math.random=()=>.5;(window as any).attacks=[];(window as any).groupBeams=0;
  const start=OscillatorNode.prototype.start,set=AudioParam.prototype.setValueAtTime,arc=CanvasRenderingContext2D.prototype.arc;
  const values=new WeakMap<AudioParam,number>();
  AudioParam.prototype.setValueAtTime=function(value,at){values.set(this,value);return set.call(this,value,at);};
  OscillatorNode.prototype.start=function(at=0){(window as any).attacks.push({at,hz:values.get(this.frequency)});return start.call(this,at);};
  CanvasRenderingContext2D.prototype.arc=function(...args){if(this.canvas.id==='orbit'&&Math.abs(this.lineWidth-2.4)<.001)(window as any).groupBeams++;return arc.apply(this,args);};
 });
}
async function load(page:Page,data:ReturnType<typeof fixture>){
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'groups.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();await page.evaluate(()=>(window as any).attacks=[]);
}
test('four-note run produces four distinct pitched attacks without connecting lines, including JSON round-trip',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await spy(page);await page.goto('/de/');
 const data=fixture(makeNoteGroup('run',4,()=>.5));await load(page,data);await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>new Set((window as any).attacks.map((n:any)=>n.at)).size)).toBeGreaterThanOrEqual(4);
 const attacks=await page.evaluate(()=>(window as any).attacks as {at:number;hz:number}[]),times=[...new Set(attacks.map(n=>n.at))].slice(0,4);
 times.forEach((at,i)=>expect(at-times[0]).toBeCloseTo(i*.15,3));
 expect(new Set(times.map(at=>attacks.find(n=>n.at===at)!.hz)).size).toBeGreaterThan(1);
 expect(await page.evaluate(()=>(window as any).groupBeams)).toBe(0);
 await page.locator('#orbit').screenshot({path:info.outputPath('run.png')});
 await page.locator('#play').click();await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const saved=decodeSettings(await readFile((await(await pending).path())!,'utf8'))!;expect(saved.tracks[0].groups).toEqual(data.tracks[0].groups);expect(errors).toEqual([]);
});
test('a chord produces simultaneous distinct notes, not a fast arpeggio or one overwritten voice',async({page},info)=>{
 await spy(page);await page.goto('/de/');await load(page,fixture(makeNoteGroup('chord',3,()=>.5)));await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).attacks.length)).toBeGreaterThanOrEqual(9);
 const attacks=await page.evaluate(()=>(window as any).attacks as {at:number;hz:number}[]);
 const first=attacks[0].at,notes=attacks.filter(n=>n.at===first);expect(notes).toHaveLength(9);
 const fundamentals=[notes[0].hz,notes[3].hz,notes[6].hz];expect(new Set(fundamentals).size).toBe(3);
 expect(Math.round(12*Math.log2(fundamentals[1]/fundamentals[0]))).toBe(4);expect(Math.round(12*Math.log2(fundamentals[2]/fundamentals[0]))).toBe(7);
 await page.locator('#orbit').screenshot({path:info.outputPath('chord.png')});
});
test('stopping during a run cancels queued future members; restarting cannot revive them',async({page})=>{
 await spy(page);await page.goto('/de/');await load(page,fixture(makeNoteGroup('run',4,()=>.5)));await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).attacks.length)).toBeGreaterThan(0);await page.locator('#play').click();
 await page.waitForTimeout(100);const count=await page.evaluate(()=>(window as any).attacks.length);await page.waitForTimeout(450);expect(await page.evaluate(()=>(window as any).attacks.length)).toBe(count);
 await page.locator('#clear').click();await page.evaluate(()=>(window as any).attacks=[]);await page.locator('#play').click();await page.waitForTimeout(500);expect(await page.evaluate(()=>(window as any).attacks.length)).toBe(0);
});
test('normal presets seed sparse groups and random play can develop them without changing user tap patterns',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('#files-open').click();let pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const data=decodeSettings(await readFile((await(await pending).path())!,'utf8'))!;
 expect(data.tracks.flatMap(t=>t.groups??[]).filter(Boolean).length).toBeGreaterThan(0);expect(data.tracks.flatMap(t=>t.groups??[]).filter(Boolean).length).toBeLessThanOrEqual(3);
 expect(data.tracks.find(t=>t.instrument==='kick')!.groups!.every(g=>!g)).toBe(true);
 await page.locator('#files-close').click();await page.locator('#evolve').click();await page.waitForTimeout(2400);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});

test('acoustic chords start all three buffers at the same time and end without audio graph errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  (window as any).buffers=[];const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){(window as any).buffers.push(args[0]);return start.apply(this,args);};
 });
 await page.goto('/de/');await load(page,fixture(makeNoteGroup('chord',3,()=>.5),'piano'));await page.locator('#play').click();await page.waitForTimeout(750);
 const starts=await page.evaluate(()=>(window as any).buffers.filter((at:number)=>at>0) as number[]);
 expect(starts.length).toBeGreaterThanOrEqual(3);expect(starts[0]).toBe(starts[1]);expect(starts[1]).toBe(starts[2]);expect(errors).toEqual([]);
});

test('clicking a grouped subnote toggles its parent, not the coincident empty raster position',async({page})=>{
 await page.goto('/de/');await load(page,fixture(makeNoteGroup('run',4,()=>.5)));
 const orbit=page.locator('#orbit');await orbit.scrollIntoViewIfNeeded();const box=(await orbit.boundingBox())!;
 const angle=-Math.PI/2+2/16*Math.PI*2,x=(350+Math.cos(angle)*ORBIT_OUTER_RADIUS)/700*box.width,y=(350+Math.sin(angle)*ORBIT_OUTER_RADIUS)/700*box.height;
 if(test.info().project.name==='mobile')await page.touchscreen.tap(box.x+x,box.y+y);else await orbit.click({position:{x,y}});
 await expect(page.locator('[data-track="0"] [data-step="0"]')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-track="0"] [data-step="2"]')).toHaveAttribute('aria-pressed','false');
});
test('reverse runs still play in chronological order and groups keep a finite independent gate',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await spy(page);await page.goto('/de/');await load(page,fixture(makeNoteGroup('run',4,()=>.5),'pluck',-1));await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>new Set((window as any).attacks.map((n:any)=>n.at)).size)).toBeGreaterThanOrEqual(4);
 const starts=await page.evaluate(()=>[...new Set((window as any).attacks.map((n:any)=>n.at))] as number[]);
 expect(starts[1]).toBeGreaterThan(starts[0]);expect(starts[3]-starts[0]).toBeCloseTo(.45,3);expect(errors).toEqual([]);
});
