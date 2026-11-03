import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {RadarHistory,radarStrength,radarLifetime,radarPoint,radarSweep,paintOrbitRadar,type RadarNote} from '../src/lib/orbit-radar';
import {gridFractionAtTime} from '../src/lib/track-grid';
import {partsForStyle} from '../src/lib/presets';
import {decodeSettings} from '../src/lib/sound-settings';
import {orbitCopy} from '../src/lib/sound-i18n';
import {chooseAnimation} from './animation-helpers';

test('radar echoes follow real onsets, decay completely and keep bounded independent chord heads',()=>{
 expect(radarStrength(-.01,1)).toBe(0);expect(radarStrength(.1,0)).toBe(0);expect(radarStrength(.1,1,0)).toBe(0);
 expect(radarStrength(.1,1)).toBeGreaterThan(radarStrength(1,1));expect(radarStrength(radarLifetime,1)).toBe(0);
 expect(radarStrength(.1,1)).toBeGreaterThan(radarStrength(.1,.1));
 const h=new RadarHistory(),note:RadarNote={at:1,beat:0,angle:0,level:.8,direction:1};
 h.record(0,note);note.angle=2;expect(h.notes(0)[0].angle).toBe(0);
 for(let n=0;n<150;n++)h.record(0,{...note,at:1+n*.001});
 expect(h.notes(0)).toHaveLength(96);h.record(0,{...note,at:10});expect(h.notes(0)).toHaveLength(1);
 expect(radarPoint(200,{...note,kind:'chord',member:0,count:3}).radius).toBeLessThan(radarPoint(200,{...note,kind:'chord',member:2,count:3}).radius);
 h.clear(0);expect(h.notes(0)).toEqual([]);
});
test('radar light moves on after the hit with a growing trailing echo in either direction',()=>{
 const note:RadarNote={at:1,beat:0,angle:-Math.PI/2,level:1,direction:1,
  motion:{turnSeconds:4,clock:0,slots:16,beats:4,swing:0}};
 expect(radarSweep(note,1)).toEqual({angle:note.angle,length:0});
 for(const direction of [1,-1]){
  const moving={...note,direction},early=radarSweep(moving,1.1),later=radarSweep(moving,1.5);
  expect((early.angle-note.angle)*direction).toBeCloseTo(Math.PI*.05);
  expect((later.angle-early.angle)*direction).toBeGreaterThan(0);
  expect(early.angle-direction*early.length).toBeCloseTo(note.angle);
  expect(later.length).toBe(.72);
 }
 const fast={...note,motion:{...note.motion!,turnSeconds:2}};
 expect(radarSweep(fast,1.1).angle-note.angle).toBeCloseTo(2*(radarSweep(note,1.1).angle-note.angle));
 const swung={...note,motion:{...note.motion!,clock:.1,swing:.3}};
 expect(radarSweep(swung,1.5).angle-note.angle).toBeCloseTo((gridFractionAtTime(.225,16,4,.3)-gridFractionAtTime(.1,16,4,.3))*Math.PI*2);
 const history=new RadarHistory();history.record(0,note);note.motion!.turnSeconds=99;
 expect(history.notes(0)[0].motion!.turnSeconds).toBe(4);
});
test('radar mist reaches neighbouring lanes softly while keeping heads sharp and reduced motion static',()=>{
 const notes:RadarNote[]=[{at:1,beat:0,angle:0,level:.8,direction:1}];
 function draw(time:number,{gain=1,muted=false,reduced=false,effect=1,direction=1,spacing=27,dark=true}={}){
  const circles:number[]=[],halos:{x:number;y:number;radius:number;stops:[number,string][]}[]=[];
  let strokes=0;
  const ctx={save(){},restore(){},beginPath(){},fill(){},stroke(){strokes++;},
   createRadialGradient(x:number,y:number,_r:number,_x:number,_y:number,radius:number){
    const stops:[number,string][]=[];halos.push({x,y,radius,stops});return {addColorStop(at:number,color:string){stops.push([at,color]);}};
   },
   arc(_x:number,_y:number,r:number){circles.push(r);}} as unknown as CanvasRenderingContext2D;
  paintOrbitRadar(ctx,notes.map(n=>({...n,direction})),200,'#55ccff',time,gain,muted,dark,reduced,effect,spacing);
  return {circles,halos,strokes};
 }
 expect(draw(.9).circles).toEqual([]);expect(draw(1+radarLifetime).circles).toEqual([]);
 for(const direction of [1,-1])for(const dark of [true,false]){
  const result=draw(1.1,{direction,dark}),mist=result.halos.slice(0,-1);
  expect(mist).toHaveLength(12);expect(result.strokes).toBe(0);
  for(const puff of mist){
   expect(puff.radius).toBeGreaterThan(27);expect(puff.radius).toBeLessThan(54);
   expect(puff.stops.at(-1)).toEqual([1,'#55ccff00']);
   expect((puff.y-350)*direction).toBeGreaterThan(0);
   expect(Math.hypot(puff.x-350,puff.y-350)).toBeCloseTo(200);
  }
  expect((mist.at(-1)!.y-mist[0].y)*direction).toBeGreaterThan(0);
  expect(result.circles.slice(-3).every(r=>r<10)).toBe(true);
 }
 expect(draw(1.1,{spacing:40}).halos[0].radius).toBe(60);
 expect(draw(1.1,{spacing:216}).halos[0].radius).toBe(72);
 const reduced=draw(1.1,{reduced:true});expect(reduced.halos).toEqual([]);expect(reduced.circles).toHaveLength(2);
 for(const options of [{gain:0},{muted:true},{effect:0}])expect(draw(1.1,options)).toEqual({circles:[],halos:[],strokes:0});
});
function fixture(){return {version:2,style:'electronic',bpm:40,volume:.3,center:'off',background:'off',orbit:'radar',tracks:partsForStyle('electronic').map((_p,i)=>({enabled:i===0,mute:false,instrument:'kick',groups:Array(16).fill(null),points:Array.from({length:16},(_,s)=>s===0),slots:16,grid:16,pitch:12,volume:.6,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};}
async function load(page:Page,data:unknown){await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'radar.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();}
const pixels=(page:Page)=>page.locator('#orbit').evaluate((c:HTMLCanvasElement)=>{const data=c.getContext('2d')!.getImageData(0,0,700,700).data;let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)count++;return count;});
test('only a sounded note appears, then the radar canvas becomes completely empty again',async({page})=>{
 await page.goto('/de/');await load(page,fixture());await page.waitForTimeout(1300);
 expect(await pixels(page)).toBe(0);await page.locator('#play').click();await page.waitForTimeout(250);
 expect(await pixels(page)).toBeGreaterThan(30);
 await expect.poll(()=>pixels(page),{timeout:4000}).toBe(0);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
});
test('Radar persists in JSON and browser preferences without changing the music or autoplay',async({page})=>{
 await page.goto('/de/');const f=fixture();expect(decodeSettings(JSON.stringify(f))?.orbit).toBe('radar');await load(page,f);
 await page.locator('#files-open').click();const download=page.waitForEvent('download');await page.locator('#json-export').click();
 const saved=JSON.parse(await readFile((await(await download).path())!,'utf8'));await page.locator('#files-close').click();expect(saved.orbit).toBe('radar');expect(saved.bpm).toBe(40);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();await page.waitForTimeout(350);await page.reload();
 await expect(page.locator('#orbit')).toHaveAttribute('data-mode','radar');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
for(const lang of ['de','en','es','fr'] as const)test('Radar tile is localized and available in light focus view with reduced motion: '+lang,async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/'+lang+'/');
 await page.locator('#palette-dropdown summary').click();await page.locator('#theme-light').click();await page.locator('#preferences-close').click();
 await chooseAnimation(page,'button[data-orbit-mode=radar]');await expect(page.locator('button[data-orbit-mode=radar]')).toContainText(orbitCopy[lang].radar);
 await page.locator('#focus').click();await page.locator('#hide-focus-controls').click();await expect(page.locator('#orbit')).toBeVisible();await expect(page.locator('#orbit')).toHaveAttribute('data-mode','radar');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});
test('Radar is included in random animation choices',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>.999;});await page.goto('/de/');await chooseAnimation(page,'button[data-orbit-mode=random]');
 await expect(page.locator('#orbit')).toHaveAttribute('data-mode','radar');
});
test('MP4 records the live radar and retains its audio',async({page})=>{
 await page.goto('/de/');await load(page,fixture());await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#recording-restart').check();await page.locator('#video-record').click();await page.waitForTimeout(900);
 await expect(page.locator('#orbit')).toHaveAttribute('data-mode','radar');expect(await pixels(page)).toBeGreaterThan(0);
 const download=page.waitForEvent('download');await page.locator('#video-stop').click();const bytes=await readFile((await(await download).path())!);
 expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.includes(Buffer.from('vide'))).toBe(true);expect(bytes.includes(Buffer.from('soun'))).toBe(true);
});
