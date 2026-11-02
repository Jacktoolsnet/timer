import {test,expect,type Page} from '@playwright/test';
import {variedGrid,gridSizes,gridEvents,swingPosition,gridFractionAtTime,gridPhraseHold,remapPoints,canEvolveGrid,gridCopy} from '../src/lib/track-grid';
import {holdSteps} from '../src/lib/pad-gestures';
import {resolveGroove,grooveAccent} from '../src/lib/groove';
import {danceIds} from '../src/lib/dances';
import {decodeSettings} from '../src/lib/sound-settings';
import {copyPhrases} from '../src/lib/song';

for(const native of [8,12,16])for(const swing of [0,.2])test(`all grids keep exact bar alignment (${native}, swing ${swing})`,()=>{
 const beats=native/4;
 for(const slots of gridSizes){
  const onsets=Array.from({length:native},(_,clock)=>gridEvents(slots,native,clock,beats,swing).map(ev=>({index:ev.index,at:swingPosition(clock,native,beats,swing)+ev.offset}))).flat();
  expect(onsets.map(ev=>ev.index)).toEqual(Array.from({length:slots},(_,i)=>i));
  onsets.forEach((ev,i)=>{expect(ev.at).toBeCloseTo(swingPosition(i,slots,beats,swing)*native/slots,9);expect(gridFractionAtTime(ev.at/native,slots,beats,swing)).toBeCloseTo(i/slots,9);});
  expect(onsets[0].at).toBe(0);expect(onsets.at(-1)!.at).toBeLessThan(native);
 }
});
test('triplets stay real off-grid notes, and native swing remains unchanged',()=>{
 const triplets=Array.from({length:16},(_,s)=>gridEvents(12,16,s,4,.2).map(ev=>swingPosition(s,16,4,.2)+ev.offset)).flat();
 expect(triplets).toHaveLength(12);triplets.forEach((v,i)=>expect(v).toBeCloseTo(i*4/3,9));
 for(let s=0;s<16;s++)expect(gridEvents(16,16,s,4,.2)).toEqual([{index:s,offset:0}]);
 const quarter=Array.from({length:16},(_,s)=>gridEvents(4,16,s,4,0).map(ev=>s+ev.offset)).flat();expect(quarter).toEqual([0,4,8,12]);
});
test('remapping, phrase memories, holds and reverse gates respect per-track resolution',()=>{
 const p=Array(16).fill(false);for(const n of [0,4,8,12])p[n]=true;
 expect(remapPoints(p,16,4)).toEqual([true,true,true,true,...Array(12).fill(false)]);
 expect(remapPoints(remapPoints(p,16,12),12,16)).toEqual(p);
 const phrase=copyPhrases([{points:p,motif:Array(8).fill(0),pitch:0,slots:12}])[0];expect(phrase.slots).toBe(12);expect(phrase.points).not.toBe(p);
 expect(holdSteps(11,90000,120,12,4)).toEqual([11,2,5,8]);
 expect(holdSteps(3,90000,120,4,3)).toEqual([3,0,2]);
 const all=Array(16).fill(true);
 expect(gridPhraseHold(all,11,11,1,12,4,120,.2)).toBeCloseTo(1/6+.035);
 expect(gridPhraseHold(all,0,11,-1,12,4,120,.2)).toBeCloseTo(1/6+.035);
 expect(gridPhraseHold(all,0,0,1,8,4,120,.2)).toBeCloseTo(.3+.035);
 expect(gridPhraseHold(all,0,1,1,8,4,120,.2)).toBeCloseTo(.2+.035);
});
test('random grid eligibility protects foundations; dance accents stay finite off-grid',()=>{
 for(const id of ['kick','snare','clap','tom','rim','hat','shaker','bass','synthbass','doublebass'])expect(canEvolveGrid(id,false)).toBe(false);
 for(const id of ['piano','voice','strings','harp','saxophone']){expect(canEvolveGrid(id,false)).toBe(true);expect(canEvolveGrid(id,true)).toBe(false);}
 for(const id of danceIds){const g=resolveGroove('pop','auto',id);for(const slots of gridSizes)for(let s=0;s<slots;s++)expect(Number.isFinite(grooveAccent(g,'harp',s/slots*g.steps,6))).toBe(true);}
});
test('independent grid draws stay diverse even with identical random values',()=>{
 for(const native of [8,12,16] as const)for(const value of [0,.25,.5,.99]){
  const slots=[native,native,native,native,native,native,native,native] as number[];
  for(let i=4;i<8;i++)slots[i]=variedGrid(slots[i] as 8|12|16,slots.filter((_,j)=>j!==i),()=>value);
  expect(new Set(slots.slice(4)).size).toBe(3);expect(slots.slice(0,4)).toEqual([native,native,native,native]);
 }
});
const row=(page:Page,i:number)=>page.locator(`[data-track="${i}"]`);
async function grid(page:Page,i:number,value:string){await row(page,i).locator('.track-grid').selectOption(value,{force:true});}

test('manual grids queue at bar boundaries, stop applies pending edits, and styles reset them',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');
 await row(page,4).locator('summary').click();await grid(page,4,'12');
 await expect(row(page,4)).toHaveAttribute('data-slots','12');await expect(row(page,4).locator('[data-step]:visible')).toHaveCount(12);
 await page.locator('#tempo').fill('120');await page.locator('#tempo').dispatchEvent('input');await page.locator('#play').click();
 await grid(page,4,'4');await expect(row(page,4)).toHaveAttribute('data-slots','12');await expect(row(page,4).locator('.grid-status')).toHaveText(gridCopy.de.pending);
 await expect(row(page,4)).toHaveAttribute('data-slots','4',{timeout:3500});await expect(row(page,4).locator('.grid-status')).toBeEmpty();
 await grid(page,4,'8');await page.locator('#play').click();await expect(row(page,4)).toHaveAttribute('data-slots','8');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await row(page,4).screenshot({path:'test-results/grid-'+test.info().project.name+'.png'});
 await page.locator('[data-style-preset=slowwaltz]').click();await expect(row(page,4)).toHaveAttribute('data-slots','12');await expect(row(page,4)).toHaveAttribute('data-grid','auto');expect(errors).toEqual([]);
});
test('drawing, tapping, holding and keyboard wrap use the selected grid',async({page})=>{
 await page.goto('/de/');await page.locator('#clear').click();await grid(page,0,'4');await grid(page,4,'12');
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!;
 await page.mouse.click(r.x+r.width*.95,r.y+r.height*.03);await expect(row(page,0).locator('[data-step="3"]')).toHaveAttribute('aria-pressed','true');
 await page.mouse.move(r.x+r.width*.95,r.y+r.height*.55);await page.mouse.down();await expect(pad).toHaveAttribute('data-input','holding');await page.waitForTimeout(750);await page.mouse.up();
 await expect(row(page,4).locator('[data-step="11"]')).toHaveAttribute('aria-pressed','true');await expect(row(page,4).locator('[data-step="2"]')).toHaveAttribute('aria-pressed','true');
 await pad.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(row(page,4).locator('[data-step="0"]')).toHaveAttribute('aria-pressed','true');
 await page.mouse.move(r.x+r.width*.1,r.y+r.height*.03);await page.mouse.down();for(let n=2;n<9;n++)await page.mouse.move(r.x+r.width*n/10,r.y+r.height*.03,{steps:2});await page.mouse.up();
 expect(await row(page,0).locator('[data-step][aria-pressed=true]').count()).toBeLessThanOrEqual(4);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('dance foundation grids lock while routed taps use the melodic target grid',async({page})=>{
 await page.goto('/de/');await page.locator('[data-dance=samba]').click();await grid(page,4,'12');
 for(let i=0;i<4;i++){await expect(row(page,i).locator('.track-grid')).toBeDisabled();await expect(row(page,i)).toHaveAttribute('data-slots','8');}
 const before=await row(page,0).locator('.count').textContent();
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!;await page.mouse.click(r.x+r.width*.95,r.y+r.height*.03);
 await expect(row(page,4).locator('[data-step="11"]')).toHaveAttribute('aria-pressed','true');await expect(row(page,0).locator('.count')).toHaveText(before!);
 await row(page,0).locator('summary').click();await expect(page.locator('#trigger-grid-0')).toBeDisabled();
});
test('storage roundtrips grid choices without autoplay and accepts legacy settings',async({page})=>{
 await page.goto('/de/');await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.locator('#clear').click();await grid(page,4,'12');await row(page,4).locator('summary').click();await row(page,4).locator('[data-step="11"]').click();
 await page.waitForTimeout(350);const raw=await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'));const saved=decodeSettings(raw)!;expect(saved.tracks[4].grid).toBe(12);expect(saved.tracks[4].slots).toBe(12);
 await page.reload();await expect(row(page,4)).toHaveAttribute('data-slots','12');await expect(row(page,4).locator('[data-step="11"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 const old=JSON.parse(raw!);for(const tr of old.tracks){delete tr.grid;delete tr.slots;}expect(decodeSettings(JSON.stringify(old))).not.toBeNull();
 for(const invalid of [0,5,24,'12',null]){const bad=JSON.parse(raw!);bad.tracks[4].slots=invalid;expect(decodeSettings(JSON.stringify(bad))).toBeNull();}
 const bad=JSON.parse(raw!);bad.tracks[4].grid=8;expect(decodeSettings(JSON.stringify(bad))).toBeNull();
});
test('real production audio keeps four notes against twelve triplets synchronized without drift',async({page})=>{
 test.setTimeout(30000);
 await page.addInitScript(()=>{
  const starts:{at:number;duration:number}[]=[];(window as any).__gridStarts=starts;
  const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){starts.push({at:args[0]??0,duration:this.buffer?.duration??0});return original.apply(this,args);};
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await page.locator('#clear').click();
 // A sampled acoustic voice has exactly one source start for each note.
 await page.evaluate(()=>{for(const el of document.querySelectorAll<HTMLInputElement>('.track-enabled')){el.checked=false;el.dispatchEvent(new Event('change'));}});
 await row(page,4).locator('summary').click();await row(page,4).locator('.track-enabled').check();await row(page,4).locator('.instrument-select').selectOption('harp',{force:true});await grid(page,4,'12');
 for(let i=0;i<12;i++)await row(page,4).locator(`[data-step="${i}"]`).click();
 await row(page,5).locator('summary').click();await row(page,5).locator('.track-enabled').check();await row(page,5).locator('.instrument-select').selectOption('guitar',{force:true});await grid(page,5,'4');
 for(let i=0;i<4;i++)await row(page,5).locator(`[data-step="${i}"]`).click();
 await page.locator('#tempo').fill('120');await page.locator('#tempo').dispatchEvent('input');await page.locator('#play').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__gridStarts.filter((s:{duration:number})=>Math.abs(s.duration-2.4)<.001).length)).toBeGreaterThanOrEqual(26);await page.locator('#play').click();
 const starts=await page.evaluate(()=>(window as any).__gridStarts as {at:number;duration:number}[]),harp=starts.filter(s=>Math.abs(s.duration-2.4)<.001),guitar=starts.filter(s=>Math.abs(s.duration-1.4)<.001);
 expect(harp.length).toBeGreaterThanOrEqual(26);expect(guitar.length).toBeGreaterThanOrEqual(9);expect(harp[0].at).toBe(guitar[0].at);
 for(let i=1;i<26;i++)expect(harp[i].at-harp[0].at).toBeCloseTo(i/6,5);for(let i=1;i<9;i++)expect(guitar[i].at-guitar[0].at).toBeCloseTo(i/2,5);expect(errors).toEqual([]);
});
test('Random Play changes an automatic melodic grid, not fixed grids or bass and drums',async({page})=>{
 test.setTimeout(30000);await page.addInitScript(()=>{Math.random=()=>0;});await page.goto('/de/');
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await grid(page,6,'8');await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');await page.locator('#evolve').click();
 await expect(row(page,4)).toHaveAttribute('data-slots','4');await expect(row(page,5)).toHaveAttribute('data-slots','12');await expect(row(page,7)).toHaveAttribute('data-slots','4');
 await expect(row(page,5)).toHaveAttribute('data-slots','8',{timeout:15000});await expect(row(page,5)).toHaveAttribute('data-grid','auto');
 for(let i=0;i<4;i++)await expect(row(page,i)).toHaveAttribute('data-slots','16');await expect(row(page,6)).toHaveAttribute('data-slots','8');await expect(row(page,6)).toHaveAttribute('data-grid','8');await page.locator('#play').click();
 await page.waitForTimeout(350);await page.reload();await expect(row(page,5)).toHaveAttribute('data-slots','8');await expect(row(page,5)).toHaveAttribute('data-grid','auto');await expect(row(page,6)).toHaveAttribute('data-slots','8');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
for(const lang of ['en','es','fr'] as const)test('grid controls localized '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await row(page,4).locator('summary').click();await expect(page.locator('#caption-grid-4')).toHaveText(gridCopy[lang].label);await expect(page.locator('#trigger-grid-4')).toHaveText(gridCopy[lang].auto);
 await page.locator('#trigger-grid-4').click();await page.locator('#options-grid-4').getByRole('option',{name:'12',exact:true}).click();await expect(row(page,4)).toHaveAttribute('data-slots','12');
});

test('random pattern distributes grids immediately without starting audio',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>.5;});await page.goto('/de/');await page.locator('#random').click();
 const sizes=await page.locator('.instrument').evaluateAll(rows=>rows.map(row=>Number((row as HTMLElement).dataset.slots)));
 expect(new Set(sizes.slice(4)).size).toBeGreaterThan(1);expect(sizes.slice(0,4)).toEqual([16,16,16,16]);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('enabling random during normal playback waits for the next bar to diversify',async({page})=>{
 await page.goto('/de/');await page.locator('#tempo').fill('120');await page.locator('#tempo').dispatchEvent('input');await page.locator('#play').click();await page.waitForTimeout(200);await page.locator('#evolve').click();
 await expect(row(page,4)).toHaveAttribute('data-slots','16');await expect(row(page,4)).not.toHaveAttribute('data-slots','16',{timeout:3000});await page.locator('#play').click();
});
test('initial random grids preserve fixed, muted, disabled and dance foundation tracks',async({page})=>{
 await page.goto('/de/');await grid(page,4,'8');await page.evaluate(()=>{
  const mute=document.querySelector<HTMLInputElement>('[data-track="5"] .mute')!;mute.checked=true;mute.dispatchEvent(new Event('change'));
  const enabled=document.querySelector<HTMLInputElement>('[data-track="6"] .track-enabled')!;enabled.checked=false;enabled.dispatchEvent(new Event('change'));
 });
 await page.locator('#evolve').click();await expect(row(page,7)).not.toHaveAttribute('data-slots','16');await expect(row(page,4)).toHaveAttribute('data-slots','8');for(const i of [0,1,2,3,5,6])await expect(row(page,i)).toHaveAttribute('data-slots','16');await page.locator('#play').click();
 await page.locator('[data-dance=samba]').click();await page.locator('#evolve').click();for(let i=0;i<4;i++)await expect(row(page,i)).toHaveAttribute('data-slots','8');
 const sizes=await page.locator('.instrument').evaluateAll(rows=>rows.slice(4).map(row=>Number((row as HTMLElement).dataset.slots)));expect(new Set(sizes).size).toBeGreaterThan(1);await page.locator('#play').click();
});
