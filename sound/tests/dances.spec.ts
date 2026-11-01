import {test,expect} from '@playwright/test';
import {dances,danceIds,danceCopy,dancePoints} from '../src/lib/dances';
import {resolveGroove,grooveAccent} from '../src/lib/groove';
import {songForm} from '../src/lib/song';
import {decodeSettings} from '../src/lib/sound-settings';

test('eleven dances have distinct rhythm fingerprints, native meters and localized names',()=>{
 expect(danceIds).toHaveLength(11);expect(danceIds.filter(id=>dances[id].group==='standard')).toHaveLength(5);expect(danceIds.filter(id=>dances[id].group==='latin')).toHaveLength(5);
 for(const id of danceIds){
  const d=dances[id],g=resolveGroove(d.style,'auto',id);
  expect(g.steps).toBe(d.beats*4);expect(g.beats).toBe(d.beats);expect(d.preset.parts).toHaveLength(8);
  expect(d.preset.parts.every(p=>p.steps.every(s=>s>=0&&s<g.steps))).toBe(true);
  expect(grooveAccent(g,d.preset.parts[0].instrument,0)).toBeGreaterThan(0);
  expect(dancePoints(id,0)).toHaveLength(16);
 }
 expect(resolveGroove('latin','auto','samba').steps).toBe(8);
 expect(resolveGroove('classical','auto','viennese').steps).toBe(12);
 expect(dances.quickstep.preset.bpm).toBe(200);
 expect(new Set(danceIds.map(id=>JSON.stringify(dances[id].preset.parts.slice(0,4)))).size).toBe(11);
 for(const language of ['de','en','es','fr'] as const){expect(danceCopy[language].names).toHaveLength(11);expect(danceCopy[language].origins).toHaveLength(11);}
 for(let i=0;i<40;i++)expect(songForm(Math.random,true).every(part=>part.bars%4===0)).toBe(true);
});

test('dance settings accept Quickstep tempo and reject unknown dance ids',()=>{
 const track={enabled:true,mute:false,instrument:'piano',points:Array(16).fill(false),volume:.5,pitch:0,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null};
 const settings={version:1,style:'jazz',dance:'quickstep',groove:'auto',bpm:200,volume:.3,background:'clouds',center:'ring',orbit:'comet',tracks:Array(8).fill(track)};
 expect(decodeSettings(JSON.stringify(settings))?.dance).toBe('quickstep');
 expect(decodeSettings(JSON.stringify({...settings,dance:'invalid'}))).toBeNull();
 expect(decodeSettings(JSON.stringify({...settings,dance:null}))).not.toBeNull();
});

test('all dance presets play and reset without leaving their native meter',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');
 await expect(page.locator('.dances-tile [data-dance]:not([data-dance=""])')).toHaveCount(11);
 for(const id of danceIds){
  const d=dances[id];await page.locator('[data-dance="'+id+'"]').click();
  await expect(page.locator('#sound-app')).toHaveAttribute('data-active-dance',id);
  await expect(page.locator('#meter-value')).toHaveText(d.beats+'/4');await expect(page.locator('#tempo')).toHaveValue(String(d.preset.bpm));
  await expect(page.locator('[data-groove=discofox]')).toBeDisabled();
  await page.locator('#play').click();await page.waitForTimeout(180);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.locator('#play').click();
 }
 await page.locator('.dances-tile').screenshot({path:'test-results/dances-'+test.info().project.name+'.png'});
 await page.locator('#reset').click();await expect(page.locator('[data-dance=discofox]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-style-preset=pop]').click();await expect(page.locator('#sound-app')).toHaveAttribute('data-active-dance','');await expect(page.locator('[data-groove=discofox]')).toBeEnabled();
 expect(errors).toEqual([]);
});

test('random dance keeps pulse and tempo while drawing edits melodic accompaniment',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');
 await page.locator('[data-dance=jive]').click();
 const patterns=await page.locator('.instrument').evaluateAll(rows=>rows.slice(0,4).map(row=>Array.from(row.querySelectorAll('[data-step]')).map(b=>b.getAttribute('aria-pressed'))));
 const melody=page.locator('[data-track="4"]'),before=await melody.getAttribute('data-motif');
 await page.locator('#evolve').click();
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!;
 await page.mouse.move(r.x+r.width*.9,r.y+r.height*.02);await page.mouse.down();await page.mouse.up();
 await expect(melody).not.toHaveAttribute('data-motif',before!);
 await expect(page.locator('#song-structure')).toHaveAttribute('data-part','verse',{timeout:12000});
 await expect(page.locator('#tempo')).toHaveValue('168');
 for(let i=0;i<4;i++){
  const row=page.locator('[data-track="'+i+'"]');await expect(row).toHaveAttribute('data-phase','0');await expect(row).toHaveAttribute('data-direction','1');await expect(row).toHaveAttribute('data-morph','');
 }
 expect(await page.locator('.instrument').evaluateAll(rows=>rows.slice(0,4).map(row=>Array.from(row.querySelectorAll('[data-step]')).map(b=>b.getAttribute('aria-pressed'))))).toEqual(patterns);
 await page.locator('#play').click();expect(errors).toEqual([]);
});

test('dance changes queue on a bar, can be replaced, and leave dance mode cleanly',async({page})=>{
 await page.goto('/en/');await page.locator('#tempo').fill('180');await page.locator('#tempo').dispatchEvent('input');await page.locator('#play').click();
 await page.locator('[data-dance=rumba]').click();await page.locator('[data-dance=samba]').click();
 await expect(page.locator('#sound-app')).toHaveAttribute('data-active-dance','samba',{timeout:4000});await expect(page.locator('#meter-value')).toHaveText('2/4');
 await page.locator('[data-dance=""]').click();await expect(page.locator('#sound-app')).toHaveAttribute('data-active-dance','',{timeout:4000});await expect(page.locator('#meter-value')).toHaveText('4/4');
 await page.locator('#play').click();
});

test('optional persistence restores dance, tempo and drawings but never playback',async({page})=>{
 await page.goto('/de/');await page.locator('[data-dance=quickstep]').click();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.waitForTimeout(400);await page.reload();
 await expect(page.locator('[data-dance=quickstep]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#tempo')).toHaveValue('200');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('[data-dance=samba]').click();const row=page.locator('[data-track="0"]');await row.locator('summary').click();await expect(row.locator('[data-step]:visible')).toHaveCount(8);
 await page.locator('#focus').click();await expect(page.locator('.dances-tile')).toBeHidden();await page.locator('#focus').click();await expect(page.locator('.dances-tile')).toBeVisible();
});
for(const [lang,label] of [['de','Tänze'],['en','Dances'],['es','Bailes'],['fr','Danses']])test('dance groups localize without horizontal overflow '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await expect(page.locator('#dances-title')).toHaveText(label);await expect(page.locator('.dance-group')).toHaveCount(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
