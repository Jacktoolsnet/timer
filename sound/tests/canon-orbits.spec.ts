import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import source from '../public/library/classical-canon.song.json' with {type:'json'};
import bank from '../public/library/classical-canon.orbit.json' with {type:'json'};
import catalog from '../public/library/catalog.json' with {type:'json'};
import {decodeOrbitProject} from '../src/lib/orbit-project';
import {decodeSongScript,scriptScore} from '../src/lib/song-script';
import {orbitPair} from '../src/lib/orbit-sequence';

async function exported(page:Page){
 await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const data=JSON.parse(await readFile((await(await pending).path())!,'utf8'));await page.locator('#files-close').click();return data;
}
async function library(page:Page){
 await page.locator('#music-settings-open').click();await page.locator('[data-library-open=classical]').click();
}

test('Canon bank retains every source note, timing, entrance, seed and credits; no invented or doubled voices',()=>{
 const p=decodeOrbitProject(JSON.stringify(bank))!;expect(p).not.toBeNull();
 expect(catalog.find(s=>s.id==='classical-canon')!.projectPath).toBe('/library/classical-canon.orbit.json');
 expect(p.sets.filter(s=>s.settings)).toHaveLength(4);expect(p.sets.slice(4).every(s=>s.settings===null)).toBe(true);
 const original=decodeSongScript(JSON.stringify(source))!;
 if(original.version!==3)throw Error('Expected metered source');
 let notes=0;
 p.sets.slice(0,4).forEach((slot,lane)=>{
  const saved=slot.settings!,song=saved.songScript!;
  if(song.version!==3)throw Error('Expected metered part');
  expect(song.rights).toEqual(original.rights);expect(song.seed).toBe(original.seed);
  expect(song.title).toBe(original.title);expect(song.meter).toEqual(original.meter);expect(song.tempoUnit).toEqual(original.tempoUnit);
  expect(slot.barOffset).toBe(0);expect(slot.muted).toBe(false);
  expect(song.scenes.map(s=>s.bars)).toEqual(original.scenes.map(s=>s.bars));
  expect(song.tracks[lane].volume!/2).toBe(original.tracks[lane].volume);
  expect(song.tracks.filter(t=>t.volume!>0)).toHaveLength(1);
  song.scenes.forEach((scene,section)=>{
   expect(scene.parts).toEqual(original.scenes[section].parts.filter(p=>p.track===original.tracks[lane].id));
   notes+=scene.parts.reduce((n,p)=>n+p.notes.length,0);
   const pair=orbitPair(saved,section*2,p.clock);
   expect(pair.filter((_,i)=>i!==lane).every(p=>p.score.length===0&&p.track.volume===0)).toBe(true);
   const part=original.scenes[section].parts.find(p=>p.track===original.tracks[lane].id);
   expect(pair[lane].score).toEqual(scriptScore(part,original.scenes[section].variation??0,original.seed+section*101+lane*17,original.meter));
  });
 });
 expect(notes).toBe(original.scenes.reduce((n,s)=>n+s.parts.reduce((n,p)=>n+p.notes.length,0),0));
 expect(p.sets[0].settings!.songScript!.scenes.reduce((n,s)=>n+s.bars,0)).toBe(58);
});

test('library Canon loads four editable synchronized orbits, sounds, switches without restart and round-trips the bank',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  (window as any).canonAttacks=[];
  const start=OscillatorNode.prototype.start;
  OscillatorNode.prototype.start=function(when=0){if(when>0)(window as any).canonAttacks.push(when);return start.call(this,when);};
 });
 await page.goto('/de/');await library(page);
 const request=page.waitForResponse(r=>r.url().endsWith('/library/classical-canon.orbit.json'));
 await page.locator('[data-library-song=classical-canon]').click();expect((await request).ok()).toBe(true);
 await expect(page.locator('#song-library-dialog')).toBeHidden();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#video-song-rights-text')).toContainText(source.rights.source);
 // Accelerate only the shared clock, never the source parts, to reach all entrances.
 await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=controls]').click();
 await page.locator('#tempo').fill('220');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#orbit-sets-open').click();
 for(let i=0;i<9;i++)await expect(page.locator(`[data-orbit-slot="${i}"]`)).toHaveAttribute('data-empty',i<4?'false':'true');
 for(const [i,name] of ['Violine I','Violine II','Violine III','Basso'].entries())await expect(page.locator(`[data-orbit-slot="${i}"] [data-orbit-name]`)).toHaveText(name);
 await expect.poll(async()=>page.evaluate(()=>(window as any).canonAttacks.length),{timeout:12000}).toBeGreaterThan(12);
 await page.waitForTimeout(6500); // Violin III enters at quarter 24 on the shared accelerated clock.
 for(const i of [3,1,2,0]){
  await page.locator(`[data-orbit-select="${i}"]`).click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator(`[data-orbit-select="${i}"]`)).toHaveAttribute('aria-pressed','true');
 }
 await page.locator('#orbit-sets-panel').screenshot({path:'/tmp/canon-orbits-'+(test.info().project.name)+'.png'});
 const p=await exported(page);expect(decodeOrbitProject(JSON.stringify(p))).not.toBeNull();
 expect(p.bpm).toBe(220);expect(p.sets.slice(0,4).map((s:any)=>s.name)).toEqual(bank.sets.slice(0,4).map(s=>s.name));
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'canon.orbit.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await page.locator('#files-close').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 expect((await exported(page)).sets.slice(0,4).map((s:any)=>s.settings.songScript)).toEqual(bank.sets.slice(0,4).map(s=>s.settings!.songScript));
 expect(errors).toEqual([]);
});

test('invalid library orbit project cannot replace the current music',async({page})=>{
 await page.route('**/library/classical-canon.orbit.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({...bank,sets:[]})}));
 await page.goto('/de/');const before=await exported(page);await library(page);await page.locator('[data-library-song=classical-canon]').click();
 await expect(page.locator('#song-library-status')).toContainText('konnte nicht geladen');
 await expect(page.locator('#song-library-dialog')).toBeVisible();await page.keyboard.press('Escape');
 expect(await exported(page)).toEqual(before);
});


test('switching from the four-orbit Canon to another library work or Random removes all old voices',async({page})=>{
 await page.goto('/de/');await library(page);await page.locator('[data-library-song=classical-canon]').click();
 await page.locator('[data-library-open=classical]').click();await page.locator('[data-library-song=classical-turca]').click();
 await expect(page.locator('#song-library-dialog')).toBeHidden();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 const single=await exported(page);expect(single.format).toBeUndefined();expect(single.songScript.meter).toMatchObject({numerator:2,denominator:4});
 await page.locator('[data-library-open=classical]').click();await page.locator('[data-library-song=classical-canon]').click();
 await page.locator('[data-library-open=classical]').click();await page.locator('[data-library-random=classical]').click();
 const generated=await exported(page);expect(generated.format).toBeUndefined();expect(generated.songScript).toBeUndefined();
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','true');
});
