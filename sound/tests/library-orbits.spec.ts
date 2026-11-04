import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import catalog from '../public/library/catalog.json' with {type:'json'};
import previews from '../public/library/preview-catalog.json' with {type:'json'};
import {decodeOrbitProject} from '../src/lib/orbit-project';
import {decodeSongScript} from '../src/lib/song-script';
const entries=[...catalog,...previews];
const sorted=(parts:any[])=>[...parts].sort((a,b)=>a.track.localeCompare(b.track));
const read=async(path:string)=>readFile(new URL('../public'+path,import.meta.url),'utf8');

test('14 library banks retain all source notes, meters, repeats, attribution and balanced group levels; piano Rondo stays solo',async()=>{
 expect(entries.filter(e=>'projectPath' in e)).toHaveLength(14);
 const solo=entries.find(e=>e.id==='classical-turca')!;expect('projectPath' in solo).toBe(false);
 for(const entry of entries){
  if(!('projectPath' in entry)||typeof entry.projectPath!=='string')continue;
  const text=await read(entry.projectPath),p=decodeOrbitProject(text)!;expect(p,entry.id).not.toBeNull();expect(Buffer.byteLength(text)).toBeLessThan(12*1024*1024);
  const original=decodeSongScript(await read(entry.path))!;if(original.version!==3)throw Error('Missing original meter');
  const count=p.sets.filter(s=>s.settings).length,night=entry.id==='classical-nachtmusik';
  expect(p.bpm).toBe(original.bpm);expect(p.clock.meter).toEqual(original.meter);expect(p.clock.tempoUnit).toEqual(original.tempoUnit);
  expect(p.clock.quarters).toBe(original.meter.numerator*4/original.meter.denominator);
  const ids=new Set<string>();
  p.sets.filter(s=>s.settings).forEach(slot=>{
   expect(slot.muted).toBe(false);expect(slot.barOffset).toBe(0);
   const script=slot.settings!.songScript!;if(script.version!==3)throw Error('Missing bank meter');
   expect(script.scenes.map(s=>s.bars)).toEqual(original.scenes.map(s=>s.bars));expect(script.seed).toBe(original.seed);expect(script.title).toBe(original.title);
   for(const key of ['composition','source','license','recording'] as const)expect(script.rights[key]).toBe(original.rights![key]);
   if(!night)expect(script.rights).toEqual(original.rights);
   script.tracks.filter(t=>t.volume>0).forEach(track=>{
    expect(ids.has(track.id)).toBe(false);ids.add(track.id);
    const tr=original.tracks.find(t=>t.id===track.id);
    expect(track.volume/Math.sqrt(count)).toBeCloseTo(tr?.volume??.16,10);
   });
  });
  expect([...ids].sort()).toEqual([...original.tracks.map(t=>t.id),...(night?['contrabass']:[])].sort());
  original.scenes.forEach((scene,i)=>{
   const parts=p.sets.flatMap(s=>s.settings?.songScript?.scenes[i].parts??[]);
   const bass=scene.parts.find(p=>p.track==='voice4');
   const expected=[...scene.parts,...(night&&bass?[{...bass,track:'contrabass'}]:[])];
   expect(sorted(parts),entry.id+' scene '+i).toEqual(sorted(expected));
  });
 }
});

test('Nachtmusik realizes the source Cello & Double Bass staff with new bowed voices, without an invented line',async()=>{
 const p=decodeOrbitProject(await read('/library/classical-nachtmusik.orbit.json'))!;
 expect(p.sets.slice(0,5).map(s=>s.settings!.songScript!.tracks.find(t=>t.volume>0)!.instrument)).toEqual(['violin','violin','viola','cello','bowedbass']);
 expect(p.sets[4].settings!.songScript!.rights!.arrangement).toContain('staff realized in octaves');
 const staff=await readFile(new URL('../scripts/scores/nacht-eine-kleine-nachtmusik-mvt1.ly',import.meta.url),'utf8');expect(staff).toContain('Double Bass');
 const cello=p.sets[3].settings!.songScript!,bass=p.sets[4].settings!.songScript!;
 cello.scenes.forEach((s,i)=>expect(bass.scenes[i].parts.map(p=>p.notes)).toEqual(s.parts.map(p=>p.notes)));
});

async function exported(page:Page){
 await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();const stream=await(await pending).createReadStream(),chunks:Buffer[]=[];
 for await(const part of stream!)chunks.push(part);await page.locator('#files-close').click();return JSON.parse(Buffer.concat(chunks).toString());
}

test('every selectable multi-orbit library work loads, plays, exports the whole bank and shows all its rings',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await page.locator('#music-settings-open').click();
 for(const entry of entries){
  if(!('projectPath' in entry)||typeof entry.projectPath!=='string')continue;
  const file=decodeOrbitProject(await read(entry.projectPath))!;
  await page.locator(`[data-library-open=${entry.style}]`).click();await page.locator(`[data-library-song=${entry.id}]`).click();
  await expect(page.locator('#song-library-dialog')).toBeHidden();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  const count=file.sets.filter(s=>s.settings).length;
  await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-sets',String(count));await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-lanes',String(count*9));
  const p=await exported(page);expect(decodeOrbitProject(JSON.stringify(p))).not.toBeNull();
  expect(p.sets.map((s:any)=>s.settings?.songScript??null)).toEqual(file.sets.map(s=>s.settings?.songScript??null));
 }
 expect(errors).toEqual([]);
});
