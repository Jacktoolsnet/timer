import {test,expect} from '@playwright/test';
import {presets,partsForStyle,evolutionPalette} from '../src/lib/presets';
import {resolveGroove,grooveAnchors,grooveMutationGrid,randomGroovePattern} from '../src/lib/groove';
import {evolvePattern} from '../src/lib/evolution';
import {makeMotif,melodicSemitones} from '../src/lib/harmony';
import {soundProfiles} from '../src/lib/sound-profiles';

test('focus leads with a connected piano melody over a quiet steady pulse',()=>{
 const p=presets.focus,parts=partsForStyle('focus'),g=resolveGroove('focus','auto');
 expect(parts).toHaveLength(9);expect(p.bpm).toBe(76);expect(g.beats).toBe(4);expect(g.swing).toBe(0);
 const lead=parts[0];expect(lead.instrument).toBe('piano');expect(lead.steps).toEqual([0,2,4,6,8,10,12,14]);
 expect(parts.map(p=>p.instrument)).toEqual(expect.arrayContaining(['strings','epiano','harp','kick','shaker','bass']));
 for(const backing of parts.slice(1))expect(backing.volume!).toBeLessThan(lead.volume!*.5);
 const motif=makeMotif(p.melody);
 expect(new Set(motif).size).toBeGreaterThan(2);
 for(let bar=0;bar<16;bar++){
  const notes=lead.steps.map(step=>melodicSemitones('focus',bar,step,'piano',0,motif));
  for(let i=1;i<notes.length;i++)expect(Math.abs(notes[i]-notes[i-1])).toBeLessThanOrEqual(4);
 }
 for(const id of ['kick','shaker','bass']){
  const pattern=randomGroovePattern(g,id,p.density,()=>0);
  const track={enabled:true,mute:false,instrument:id,points:[...pattern]};
  expect(pattern.flatMap((on,i)=>on?[i]:[])).toEqual(grooveAnchors(g,id));
  for(let i=0;i<100;i++)evolvePattern([track],Math.random,grooveMutationGrid(g,id),1,id=>grooveAnchors(g,id));
  expect(track.points).toEqual(pattern);
 }
 expect(evolutionPalette('focus')).not.toContain('snare');
 expect(evolutionPalette('focus')).not.toContain('bells');
 expect(soundProfiles.focus.warm).toBe(true);
});

test('focus random play keeps piano rhythm and light beat steady while drawing shapes the melody',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('[data-style-preset=focus]').click();
 await expect(page.locator('#tempo')).toHaveValue('76');
 const row=(i:number)=>page.locator('[data-track="'+i+'"]');
 await expect(row(0).locator('.instrument-name')).toHaveText('Klavier');
 await expect(row(0).locator('.count')).toHaveText('8 / 16');
 await page.locator('#evolve').click();
 await expect(page.locator('#song-structure')).toHaveAttribute('data-part','verse',{timeout:16000});
 await expect(row(0).locator('.count')).toHaveText('8 / 16');
 await expect(row(1).locator('.count')).toHaveText('4 / 16');
 await expect(row(2).locator('.count')).toHaveText('4 / 16');
 await expect(row(3).locator('.count')).toHaveText('2 / 16');
 const before=await row(0).getAttribute('data-motif');
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const box=(await pad.boundingBox())!;
 await page.mouse.move(box.x+box.width*.04,box.y+box.height*.02);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.3,box.y+box.height*.08,{steps:8});await page.mouse.up();
 await expect(row(0)).not.toHaveAttribute('data-motif',before!);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();expect(errors).toEqual([]);
});
