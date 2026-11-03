import {test,expect,type Page} from '@playwright/test';
import {noteHeadRadius,noteLengthSweep,noteIsSounding} from '../src/lib/note-shape';
import {partsForStyle} from '../src/lib/presets';

test('performed level controls head size with finite, bounded geometry',()=>{
 expect(noteHeadRadius(.8)).toBeGreaterThan(noteHeadRadius(.2));
 expect(noteHeadRadius(0)).toBe(3.5);expect(noteHeadRadius(1)).toBe(7.5);
 for(const level of [-5,0,.5,1,5,Infinity,NaN]){
  expect(noteHeadRadius(level)).toBeGreaterThanOrEqual(3.5);expect(noteHeadRadius(level)).toBeLessThanOrEqual(7.5);
 }
});
test('length arcs represent actual seconds against the bar and bound long tails',()=>{
 expect(noteLengthSweep(.5,2)).toBeCloseTo(Math.PI/2);
 expect(noteLengthSweep(1,2)).toBeCloseTo(Math.PI);
 expect(noteLengthSweep(.5,1)).toBeCloseTo(Math.PI);
 expect(noteLengthSweep(20,2)).toBeLessThan(2*Math.PI);
 for(const [duration,bar] of [[0,2],[-1,2],[1,0],[Infinity,2],[NaN,2]])expect(noteLengthSweep(duration,bar)).toBe(0);
});
test('sounding state follows audio onset and hold, not a fixed flash timer',()=>{
 expect(noteIsSounding(9.9,10,2)).toBe(false);
 expect(noteIsSounding(10,10,2)).toBe(true);expect(noteIsSounding(11.9,10,2)).toBe(true);
 expect(noteIsSounding(12,10,2)).toBe(false);expect(noteIsSounding(10,-Infinity,2)).toBe(false);
});
async function captureLengths(page:Page){
 await page.addInitScript(()=>{
  const arc=CanvasRenderingContext2D.prototype.arc;
  (window as any).lengthArcs=[];
  CanvasRenderingContext2D.prototype.arc=function(x,y,r,start,end,reverse){
   if(this.canvas.id==='orbit'&&x===350&&y===350&&this.lineWidth===5.5){
    const entries=(window as any).lengthArcs;
    entries.push({sweep:Math.abs(end-start),reverse:!!reverse,alpha:this.globalAlpha});
    if(entries.length>300)entries.shift();
   }
   return arc.call(this,x,y,r,start,end,reverse);
  };
 });
}
function session(style:'jazz'|'electronic',direction=1){
 return {version:2,style,bpm:100,volume:.3,background:'off',center:'off',orbit:'dot',
  tracks:partsForStyle(style).map((p,i)=>({enabled:i===0,mute:false,instrument:i===0?'saxophone':p.instrument,points:Array.from({length:16},(_,s)=>s%4===0),volume:.5,pitch:0,phase:0,direction,directionMode:direction===1?'forward':'reverse',randomDynamics:false,morph:null}))};
}
async function load(page:Page,style:'jazz'|'electronic',direction=1){
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(session(style,direction)))});
 await page.locator('#files-close').click();await page.evaluate(()=>(window as any).lengthArcs=[]);await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).lengthArcs.length)).toBeGreaterThan(0);
}

test('orbit lengths follow real style-specific articulation and reverse with the track',async({page})=>{
 await captureLengths(page);await page.goto('/de/');await load(page,'jazz');
 const legato=await page.evaluate(()=>(window as any).lengthArcs[0].sweep as number);
 expect(legato).toBeGreaterThan(1.5);
 await page.locator('#play').click();await page.evaluate(()=>(window as any).lengthArcs=[]);
 await load(page,'electronic',-1);
 const detached=await page.evaluate(()=>(window as any).lengthArcs[0]);
 expect(detached.sweep).toBeLessThan(legato*.75);expect(detached.reverse).toBe(true);
 // Turning the orbit off removes length shapes together with all other orbit elements.
 await page.locator('[data-orbit-mode=off]').click();await page.waitForTimeout(100);
 await page.evaluate(()=>(window as any).lengthArcs=[]);await page.waitForTimeout(150);
 expect(await page.evaluate(()=>(window as any).lengthArcs.length)).toBe(0);
});

test('length beds remain visible after release, but only sounding notes are brightly lit',async({page})=>{
 await captureLengths(page);await page.goto('/de/');await load(page,'jazz');
 await expect.poll(()=>page.evaluate(()=>(window as any).lengthArcs.some((a:any)=>a.alpha>.8))).toBe(true);
 await page.locator('#play').click();await page.waitForTimeout(100);await page.evaluate(()=>(window as any).lengthArcs=[]);
 await page.waitForTimeout(150);
 const arcs=await page.evaluate(()=>(window as any).lengthArcs as {alpha:number}[]);
 expect(arcs.length).toBeGreaterThan(0);expect(arcs.every(a=>a.alpha<.5)).toBe(true);
});

test('default nine-track playback keeps note glow and gains length arcs without script errors',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await captureLengths(page);await page.goto('/de/');await page.locator('#evolve').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).lengthArcs.length)).toBeGreaterThan(5);
 await page.waitForTimeout(2400);
 await page.locator('#orbit').screenshot({path:testInfo.outputPath('note-lengths.png')});
 expect(errors).toEqual([]);
});
