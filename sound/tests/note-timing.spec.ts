import {ORBIT_OUTER_RADIUS} from '../src/lib/orbit-layout';
import {test,expect,type Page} from '@playwright/test';
import {noteTimingOffset,noteTimingAngle,validNoteJoin} from '../src/lib/note-timing';
import {gridFractionAtTime,swingPosition} from '../src/lib/track-grid';
import {partsForStyle,styleIds} from '../src/lib/presets';
import {instrumentIds} from '../src/lib/instruments';

test('feel is deterministic, bounded across every style/instrument/grid and never shifts foundations or locked parts',()=>{
 let checked=0;
 for(const style of styleIds)for(const id of instrumentIds)for(const bpm of [40,120,220])for(const slots of [4,8,12,16])for(const beats of [2,3,4]){
  const value=noteTimingOffset(style,id,3,17,bpm,slots,beats,false,1);
  const limit=Math.min(.024,60/bpm*.22,60/bpm*beats/slots*.12)+1e-10;
  if(!Number.isFinite(value)||Math.abs(value)>limit||value!==noteTimingOffset(style,id,3,17,bpm,slots,beats,false,1))throw new Error(`Invalid timing: ${style}/${id}/${bpm}/${slots}/${beats}`);
  checked++;
 }
 expect(checked).toBeGreaterThan(20000);
 for(const style of styleIds)for(const id of instrumentIds){
  expect(noteTimingOffset(style,id,0,0,120,16,4)).toBe(0);
  expect(noteTimingOffset(style,id,0,8,120,16,4,true)).toBe(0);
 }
 for(const id of ['kick','bass','doublebass','acidbass','synthbass'])expect(noteTimingOffset('jazz',id,2,8,120,16,4)).toBe(0);
 for(const id of ['snare','clap'])expect(noteTimingOffset('house',id,2,8,120,16,4)).toBe(0);
});
test('warm styles breathe more than machine grooves, including both early and late notes',()=>{
 const jazz=Array.from({length:64},(_,i)=>noteTimingOffset('jazz','saxophone',2,i+1,100,16,4));
 const house=Array.from({length:64},(_,i)=>noteTimingOffset('house','saxophone',2,i+1,100,16,4));
 expect(Math.min(...jazz)).toBeLessThan(0);expect(Math.max(...jazz)).toBeGreaterThan(.01);
 expect(Math.max(...jazz.map(Math.abs))).toBeGreaterThan(Math.max(...house.map(Math.abs))*3);
});
test('shifted heads match the orbit clock exactly with swing, reverse, phase and cross grids',()=>{
 for(const slots of [4,8,12,16])for(const beats of [2,3,4])for(const direction of [1,-1])for(const phase of [0,3])for(const swing of [0,.2])for(const offset of [-.018,0,.018])for(let beat=0;beat<slots;beat++){
  const clock=((beat-phase)*direction+slots*2)%slots,barSeconds=2;
  const fraction=swingPosition(clock,slots,beats,swing)/slots+offset/barSeconds;
  const expected=(direction*gridFractionAtTime(fraction,slots,beats,swing)+phase/slots)*Math.PI*2-Math.PI/2;
  const actual=noteTimingAngle(beat,slots,phase,direction,offset,barSeconds,beats,swing);
  expect(Math.sin(actual)).toBeCloseTo(Math.sin(expected),10);expect(Math.cos(actual)).toBeCloseTo(Math.cos(expected),10);
 }
});
test('slurs reject stale, simultaneous, missing and excessively distant events',()=>{
 expect(validNoteJoin({time:1},{beat:0,time:1},1.6,2)).toBe(true);
 expect(validNoteJoin({time:1},{beat:0,time:1},1,2)).toBe(false);
 expect(validNoteJoin({time:3},{beat:0,time:1},3.6,2)).toBe(false);
 expect(validNoteJoin({time:1},{beat:0,time:1},4,2)).toBe(false);
 expect(validNoteJoin(undefined,{beat:0,time:1},1.6,2)).toBe(false);
});

async function spy(page:Page){
 await page.addInitScript(()=>{
  Math.random=()=>.5;(window as any).starts=[];(window as any).shapes=[];
  const start=OscillatorNode.prototype.start,arc=CanvasRenderingContext2D.prototype.arc;
  OscillatorNode.prototype.start=function(at=0){(window as any).starts.push(at);return start.call(this,at);};
  CanvasRenderingContext2D.prototype.arc=function(x,y,r,a,b,reverse){
   if(this.canvas.id==='orbit'&&x===350&&y===350&&(Math.abs(this.lineWidth-1.8)<.001||this.lineWidth===5.5)){
    const shapes=(window as any).shapes;shapes.push({width:Math.round(this.lineWidth*10)/10,r,a,b,reverse:!!reverse});if(shapes.length>500)shapes.shift();
   }
   return arc.call(this,x,y,r,a,b,reverse);
  };
 });
}
async function load(page:Page,style:'jazz'|'electronic',instrument:string,direction=1,tapped=false){
 const data={version:2,style,bpm:100,volume:.3,background:'off',center:'off',orbit:'dot',
  ...(tapped?{pad:{mode:'rhythm',beats:4,hits:Array.from({length:9},(_,i)=>Array.from({length:32},(_,s)=>i===0&&s%4===0)),notes:Array.from({length:9},(_,i)=>Array.from({length:32},(_,s)=>i===0&&s%4===0?3:null))}}:{}),
  tracks:partsForStyle(style).map((p,i)=>({enabled:i===0,mute:false,instrument:i===0?instrument:p.instrument,grid:16,slots:16,
   points:Array.from({length:16},(_,s)=>s%4===0),volume:.5,pitch:0,phase:0,direction,directionMode:direction===1?'forward':'reverse',randomDynamics:false,morph:null}))};
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'feel.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();
 await page.evaluate(()=>{(window as any).starts=[];(window as any).shapes=[];});
}
for(const action of ['play','evolve'])test(`production ${action} onsets and displaced heads use the same microtiming`,async({page})=>{
 await spy(page);await page.goto('/de/');await load(page,'jazz','pluck');await page.locator('#'+action).click();
 await expect.poll(()=>page.evaluate(()=>new Set((window as any).starts).size)).toBeGreaterThanOrEqual(3);
 const times=await page.evaluate(()=>[...new Set((window as any).starts)] as number[]);
 for(let n=1;n<3;n++){
  const offset=noteTimingOffset('jazz','pluck',0,n*4,100,16,4,false,Math.PI);
  expect(times[n]-times[0]).toBeCloseTo(n*.6+offset,4);
 }
 const angle=noteTimingAngle(4,16,0,1,noteTimingOffset('jazz','pluck',0,4,100,16,4,false,Math.PI),2.4,4,.2);
 await expect.poll(()=>page.evaluate((a:number)=>(window as any).shapes.some((s:any)=>s.width===5.5&&Math.abs(s.a-a)<1e-5),angle)).toBe(true);
});
for(const direction of [1,-1])test(`only genuinely legato voices receive visible connections, direction ${direction}`,async({page},testInfo)=>{
 await spy(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await load(page,'jazz','saxophone',direction);await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).shapes.filter((s:any)=>s.width===1.8).length)).toBeGreaterThan(0);
 const joins=await page.evaluate(()=>(window as any).shapes.filter((s:any)=>s.width===1.8));
 expect(joins.every((j:any)=>j.reverse===(direction===-1))).toBe(true);
 await page.locator('#orbit').screenshot({path:testInfo.outputPath('legato-orbit.png')});
 await page.locator('#play').click();await load(page,'electronic','saxophone',direction);await page.locator('#play').click();await page.waitForTimeout(1100);
 expect(await page.evaluate(()=>(window as any).shapes.some((s:any)=>s.width===1.8))).toBe(false);
 await page.locator('#play').click();await load(page,'jazz','pluck',direction);await page.locator('#play').click();await page.waitForTimeout(1000);
 expect(await page.evaluate(()=>(window as any).shapes.some((s:any)=>s.width===1.8))).toBe(false);expect(errors).toEqual([]);
});

test('recorded pad patterns keep their original timing, without automatic humanization',async({page})=>{
 await spy(page);await page.goto('/de/');await load(page,'jazz','pluck',1,true);await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>new Set((window as any).starts).size)).toBeGreaterThanOrEqual(3);
 const times=await page.evaluate(()=>[...new Set((window as any).starts)] as number[]);
 expect(times[1]-times[0]).toBeCloseTo(.6,4);expect(times[2]-times[0]).toBeCloseTo(1.2,4);
});
test('both shifted heads and their original grid position remain clickable',async({page})=>{
 await spy(page);await page.goto('/de/');await load(page,'jazz','pluck');await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>new Set((window as any).starts).size)).toBeGreaterThanOrEqual(2);
 await page.locator('#play').click();
 const offset=noteTimingOffset('jazz','pluck',0,4,100,16,4,false,Math.PI);
 const angle=noteTimingAngle(4,16,0,1,offset,2.4,4,.2);
 const canvas=page.locator('#orbit');await canvas.scrollIntoViewIfNeeded();
 const box=(await canvas.boundingBox())!;
 const click=async(a:number)=>{
  const x=(350+Math.cos(a)*ORBIT_OUTER_RADIUS)/700*box.width,y=(350+Math.sin(a)*ORBIT_OUTER_RADIUS)/700*box.height;
  if(test.info().project.name==='mobile')await page.touchscreen.tap(box.x+x,box.y+y);
  else await canvas.click({position:{x,y}});
 };
 await click(angle);await expect(page.locator('[data-track="0"] [data-step="4"]')).toHaveAttribute('aria-pressed','false');
 await click(0);await expect(page.locator('[data-track="0"] [data-step="4"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-orbit-mode=dot]')).toHaveAttribute('aria-pressed','true');
});
