import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import source from '../public/library/house-canon.song.json' with {type:'json'};
import bank from '../public/library/house-canon.orbit.json' with {type:'json'};
import catalog from '../public/library/catalog.json' with {type:'json'};
import {decodeOrbitProject} from '../src/lib/orbit-project';
import {decodeSongScript,scriptScore} from '../src/lib/song-script';
import {orbitPair} from '../src/lib/orbit-sequence';
import {setTempo} from './animation-helpers';
const groups=[['voice1'],['voice2'],['voice3'],['ground','continuo'],['kick','rim','hat']];
async function exported(page:Page){
 await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const data=JSON.parse(await readFile((await(await pending).path())!,'utf8'));await page.locator('#files-close').click();return data;
}
async function load(page:Page){
 await page.goto('/de/');await page.locator('#music-settings-open').click();await page.locator('[data-library-open=house]').click();await page.locator('[data-library-song=house-canon]').click();
 await expect(page.locator('#song-library-dialog')).toBeHidden();
}

test('House Canon splits into five groups with every note and source curve intact and inverse mix-trim compensation',()=>{
 const p=decodeOrbitProject(JSON.stringify(bank))!;expect(p).not.toBeNull();
 expect(catalog.find(e=>e.id==='house-canon')!.projectPath).toBe('/library/house-canon.orbit.json');
 expect(p.sets.filter(s=>s.settings)).toHaveLength(5);expect(p.sets.slice(5).every(s=>s.settings===null)).toBe(true);
 expect(p.bpm).toBe(122);expect(p.clock).toMatchObject({quarters:4,steps:16,swing:0});
 const original=decodeSongScript(JSON.stringify(source))!;if(original.version!==3)throw Error('Expected native meter');
 let count=0;
 p.sets.slice(0,5).forEach((slot,set)=>{
  const saved=slot.settings!,song=saved.songScript!;if(song.version!==3)throw Error('Expected native meter');
  expect(slot.muted).toBe(false);expect(slot.barOffset).toBe(0);expect(song.seed).toBe(original.seed);
  expect(song.title).toBe(original.title);expect(song.rights).toEqual(original.rights);expect(song.meter).toEqual(original.meter);expect(song.tempoUnit).toEqual(original.tempoUnit);
  expect(saved.visualization).toBe('constellation');expect(saved.constellationVariant).toBe('stars');
  expect(song.scenes.map(s=>s.bars)).toEqual(original.scenes.map(s=>s.bars));
  song.tracks.forEach((t,lane)=>expect(t.volume/Math.sqrt(5)).toBeCloseTo(groups[set].includes(t.id)?original.tracks[lane].volume:0,10));
  song.scenes.forEach((scene,section)=>{
   expect(scene.parts).toEqual(original.scenes[section].parts.filter(part=>groups[set].includes(part.track)));
   count+=scene.parts.reduce((n,p)=>n+p.notes.length,0);
   const pair=orbitPair(saved,section*2,p.clock);
   song.tracks.forEach((tr,lane)=>{
    const part=groups[set].includes(tr.id)?original.scenes[section].parts.find(part=>part.track===tr.id):undefined;
    expect(pair[lane].score).toEqual(scriptScore(part,original.scenes[section].variation??0,original.seed+section*101+lane*17,original.meter));
   });
  });
 });
 expect(count).toBe(1792);expect(bank.sets[0].settings!.songScript.scenes.reduce((n,s)=>n+s.bars,0)).toBe(60);
});

test('House library loads the complete five-set production with 45 star groups; drums mute independently and export round-trips',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  (window as any).houseKicks=0;const values=new WeakMap<AudioParam,number>(),set=AudioParam.prototype.setValueAtTime;
  AudioParam.prototype.setValueAtTime=function(v,t){values.set(this,v);return set.call(this,v,t);};
  const start=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(at=0){if(values.get(this.frequency)===145)(window as any).houseKicks++;return start.call(this,at);};
 });
 await load(page);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-sets','5');await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-lanes','45');
 await expect(page.locator('#video-song-rights-text')).toContainText(source.rights.source);
 await setTempo(page,'220');await page.locator('#orbit-sets-open').click();
 for(let i=0;i<9;i++)await expect(page.locator(`[data-orbit-slot="${i}"]`)).toHaveAttribute('data-empty',i<5?'false':'true');
 await expect.poll(()=>page.evaluate(()=>(window as any).houseKicks)).toBeGreaterThan(2);
 await page.locator('[data-orbit-mute="4"]').click();await page.waitForTimeout(250);const muted=await page.evaluate(()=>(window as any).houseKicks);
 await page.waitForTimeout(700);expect(await page.evaluate(()=>(window as any).houseKicks)).toBe(muted);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-orbit-mute="4"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).houseKicks)).toBeGreaterThan(muted);
 for(const i of [4,3,2,1,0]){await page.locator(`[data-orbit-select="${i}"]`).click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-lanes','45');}
 await page.locator('#orbit').screenshot({path:'/tmp/house-canon-sky-'+info.project.name+'.png'});
 const p=await exported(page);expect(decodeOrbitProject(JSON.stringify(p))).not.toBeNull();expect(p.bpm).toBe(220);
 expect(p.sets.slice(0,5).map((s:any)=>s.settings.songScript)).toEqual(bank.sets.slice(0,5).map(s=>s.settings!.songScript));
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'house.orbit.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await page.locator('#files-close').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');expect((await exported(page)).sets.slice(0,5).map((s:any)=>s.name)).toEqual(bank.sets.slice(0,5).map(s=>s.name));
 expect(errors).toEqual([]);
});
