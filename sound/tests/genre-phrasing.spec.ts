import {test,expect} from '@playwright/test';
import {phraseProfiles,phraseContour,instrumentGroup,genreGroupCount,groupAnchorWeight,windScoop} from '../src/lib/musicality';
import {makeNoteGroup,emptyNoteGroups,validNoteGroups,groupKindFor} from '../src/lib/note-groups';
import {styleIds} from '../src/lib/presets';
import {instrumentIds} from '../src/lib/instruments';

test('every genre has its own bounded phrasing and all generated instrument groups survive JSON validation',()=>{
 expect(Object.keys(phraseProfiles).sort()).toEqual([...styleIds].sort());
 for(const style of styleIds)for(const instrument of instrumentIds)for(const energy of [0,.5,1])for(const kind of ['run','chord'] as const){
  const count=genreGroupCount(style,kind,4),plain=makeNoteGroup(kind,count,()=>.5);
  const rows=emptyNoteGroups();rows[0]=instrumentGroup(plain,instrument,style,energy,style==='slowwaltz'?3:4);
  // Chords are only generated for instruments capable of playing them.
  if(kind==='chord'&&!['piano','epiano','guitar','harp','vibraphone','organ','pad','shimmer','strings','choir','pluck'].includes(instrument))continue;
  if(!validNoteGroups(rows,instrument))throw new Error(`${style}/${instrument}/${energy}/${kind}`);
  expect(plain.notes[0].velocity).toBe(.9);
 }
});

test('offbeat styles use short chord chops, not classical ornaments or long arpeggios',()=>{
 const run=makeNoteGroup('run',4,()=>.5),chord=makeNoteGroup('chord',3,()=>.5);
 for(const style of ['house','funk','reggae','tango','hiphop'] as const){
  expect(instrumentGroup(run,'piano',style,1).ornament).toBeUndefined();
  expect(instrumentGroup(chord,'piano',style,1).notes[0].gate).toBeLessThan(.85);
  expect(genreGroupCount(style,'run',4)).toBe(2);
 }
 for(const style of ['house','funk','reggae'] as const){
  expect(groupAnchorWeight(style,2,16,4)).toBeGreaterThan(groupAnchorWeight(style,0,16,4));
  expect(groupKindFor(style,'guitar',()=>.6)).toBe('chord');
 }
 expect(instrumentGroup(run,'piano','classical',1).ornament).toBe('grace');
 expect(instrumentGroup(run,'flute','jazz',1).ornament).toBe('trill');
 expect(instrumentGroup(run,'piano','coffeehouse',0).ornament).toBeUndefined();
 expect(instrumentGroup(run,'piano','coffeehouse',1).ornament).toBe('grace');
});

test('calm genres develop more patiently and scoops stay restrained outside jazz',()=>{
 expect(phraseProfiles.ambient.bars).toBeGreaterThan(phraseProfiles.house.bars);
 expect(phraseProfiles.focus.colour).toBeLessThan(phraseProfiles.house.colour);
 expect(phraseProfiles.funk.bars).toBeLessThan(phraseProfiles.classical.bars);
 expect(phraseContour('ambient',8).energy).toBeCloseTo(.5);
 expect(Math.abs(windScoop('pop','saxophone',2,0))).toBeLessThan(Math.abs(windScoop('jazz','saxophone',2,0)));
 expect(windScoop('electronic','saxophone',2,0)).toBe(0);
});

test('all eighteen standard pieces and Random Play start without audio errors',async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/de/');
 for(const style of styleIds){
  await page.locator(`[data-style-preset="${style}"]`).click();
  await page.locator('#play').click();await page.waitForTimeout(150);
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  await page.locator('#play').click();
  await page.locator('#evolve').click();await page.waitForTimeout(150);
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  await page.locator('#play').click();
 }
 expect(errors).toEqual([]);
});
