import {test,expect} from '@playwright/test';
import {presets,partsForStyle,styleIds,styleCopy,evolutionPalette} from '../src/lib/presets';
import {resolveGroove,grooveAccent,groovePattern,grooveMutationGrid,randomGroovePattern,grooveAnchors} from '../src/lib/groove';
import {evolvePattern} from '../src/lib/evolution';
import {chordFor} from '../src/lib/harmony';

test('slow waltz has its own acoustic palette, native meter and stable dance foundation',()=>{
 const p=presets.slowwaltz,g=resolveGroove('slowwaltz','auto'),parts=partsForStyle('slowwaltz');
 expect(p.bpm).toBe(86);expect(g.beats).toBe(3);expect(g.steps).toBe(12);expect(g.swing).toBe(0);
 expect(parts).toHaveLength(9);expect(parts.map(p=>p.instrument)).toEqual(expect.arrayContaining(['doublebass','piano','strings','harp','choir']));
 expect(parts.every(p=>p.steps.every(s=>s<12))).toBe(true);
 expect(groovePattern(g,'doublebass')).toEqual([0]);expect(groovePattern(g,'piano')).toEqual([4,8]);
 expect(grooveAccent(g,'doublebass',0)).toBeGreaterThan(grooveAccent(g,'doublebass',4));
 expect(grooveAccent(g,'piano',4)).toBeGreaterThan(grooveAccent(g,'piano',0));
 for(const instrument of ['doublebass','piano']){
  const track={instrument,enabled:true,mute:false,points:randomGroovePattern(g,instrument,p.density,()=>.5)};
  const before=[...track.points];
  for(let i=0;i<100;i++)evolvePattern([track],Math.random,grooveMutationGrid(g,instrument),1,id=>grooveAnchors(g,id),12);
  expect(track.points).toEqual(before);
 }
 expect(chordFor('slowwaltz',0)).toEqual({root:0,third:4});expect(chordFor('slowwaltz',3)).toEqual(chordFor('slowwaltz',0));
 expect(evolutionPalette('slowwaltz')).not.toContain('kick');
 expect(resolveGroove('slowwaltz','discofox').steps).toBe(16);
 for(const lang of ['de','en','es','fr'] as const)expect(styleCopy[lang].names).toHaveLength(styleIds.length);
});

test('slow waltz plays, develops, accepts drawing and restores without autoplay',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('[data-style-preset=slowwaltz]').click();
 await expect(page.locator('#tempo')).toHaveValue('86');await expect(page.locator('#meter-value')).toHaveText('3/4');
 await expect(page.locator('#orbit')).toHaveAttribute('data-steps','12');
 const bass=page.locator('[data-track="0"]');await expect(bass.locator('.instrument-name')).toHaveText('Kontrabass');
 await page.locator('#play').click();await page.waitForTimeout(500);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.locator('#play').click();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.locator('#evolve').click();
 const drawing=page.locator('#drawing');await drawing.scrollIntoViewIfNeeded();const rect=(await drawing.boundingBox())!;
 await page.mouse.move(rect.x+rect.width*.96,rect.y+rect.height*.02);await page.mouse.down();await page.mouse.up();
 await expect(bass.locator('[data-step="11"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#song-structure')).toHaveAttribute('data-part','verse',{timeout:16000});
 await expect(page.locator('#meter-value')).toHaveText('3/4');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();await page.waitForTimeout(400);await page.reload();
 await expect(page.locator('[data-style-preset=slowwaltz]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#meter-value')).toHaveText('3/4');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await expect(bass.locator('[data-step="11"]')).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});

test('live style changes enter and leave the native three-quarter meter at bar boundaries',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/en/');
 await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');await page.locator('#play').click();
 await page.locator('[data-style-preset=slowwaltz]').click();await expect(page.locator('#meter-value')).toHaveText('3/4',{timeout:4000});
 await expect(page.locator('#tempo')).toHaveValue('86');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-style-preset=pop]').click();await expect(page.locator('#meter-value')).toHaveText('4/4',{timeout:4000});
 await expect(page.locator('#tempo')).toHaveValue('108');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();expect(errors).toEqual([]);
});
for(const [lang,label] of [['de','Langsamer Walzer'],['en','Slow Waltz'],['es','Vals lento'],['fr','Valse lente']])test('slow waltz tile is localized '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await expect(page.locator('[data-style-preset=slowwaltz]')).toHaveAccessibleName(new RegExp(label));
 await page.locator('[data-style-preset=slowwaltz]').click();await expect(page.locator('#meter-value')).toHaveText('3/4');
});
