import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {partsForStyle} from '../src/lib/presets';

function song(six=false){
 const numerator=six?6:3;
 return {format:'jacktools-song',version:3,title:'Section editing test',bpm:180,style:'coffeehouse',loop:false,seed:42,
  rights:{composition:'Project-authored section test.',arrangement:'Editor test.',recording:'Synthetic instruments.',license:'No separate usage license granted.',source:'Local test fixture.'},
  meter:{numerator,denominator:six?8:4,groups:six?[3,3]:[1,1,1]},tempoUnit:{denominator:4,dotted:six},
  tracks:[{id:'keys',instrument:'piano',volume:.35},{id:'layer',instrument:'epiano',volume:.2}],
  scenes:['Opening','Middle','Ending'].map((name,i)=>({name,bars:2,parts:[
   {track:'keys',notes:[{at:0,duration:.5,pitch:i*12,velocity:.7},{at:numerator,duration:.5,pitch:i*12+4,velocity:.6}]},
   {track:'layer',notes:[{at:0,duration:1,pitch:7,velocity:.4}]}
  ]}))};
}
async function load(page:Page,source:ReturnType<typeof song>){
 await page.goto('/de/');await page.locator('#files-open').click();
 await page.locator('#song-script-upload').setInputFiles({name:'section.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
 await expect(page.locator('#song-script-status')).toContainText('Geladen');await page.locator('#files-close').click();
 await page.locator('[data-pad-mode=notes]').click();
}
async function open(page:Page,index=0){
 await page.locator(`#score-instruments [data-score-track="${index}"]`).click();
 await expect(page.locator('#score-expanded-dialog')).toBeVisible();
 await expect(page.locator('#note-editor')).toHaveAttribute('data-section-loop','true');
}
const score=(page:Page)=>page.locator('#note-editor').evaluate(el=>JSON.parse((el as HTMLElement).dataset.score!));
async function edit(page:Page){
 const grid=page.locator('#score-grid'),box=(await grid.boundingBox())!;
 await page.mouse.click(box.x+box.width*.4,box.y+box.height*.55);
 await expect(page.locator('#note-editor')).toHaveAttribute('data-dirty','true');
}
async function exportProject(page:Page){
 await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const result=JSON.parse(await readFile((await (await pending).path())!,'utf8'));await page.locator('#files-close').click();return result;
}

test('3/4 opening keeps looping with audible repeated attacks, drafts and an open editor beyond the whole song length',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).sectionStarts=[];
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(when=0,...rest){if(when>0)(window as any).sectionStarts.push(when);return start.call(this,when,...rest);};
 });
 const source=song();await load(page,source);await page.locator('#play').click();await open(page);
 const original=await score(page);await edit(page);const draft=await score(page);
 await page.waitForTimeout(6500);
 await expect(page.locator('#score-expanded-dialog')).toBeVisible();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#song-script-status')).toContainText('Opening');expect(await score(page)).toEqual(draft);
 const starts=await page.evaluate(()=>(window as any).sectionStarts as number[]);
 expect(starts.length).toBeGreaterThan(9);expect(starts.some(a=>starts.some(b=>Math.abs(b-a-2)<.03))).toBe(true);
 await page.locator('#score-cancel').click();await expect(page.locator('#score-expanded-dialog')).not.toBeVisible();
 await expect(page.locator('#song-script-status')).toContainText('Middle',{timeout:3500});
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false',{timeout:6500});
 expect(original).not.toEqual(draft);
 expect((await exportProject(page)).songScript).toEqual(source);
});

test('6/8 loop survives companion selection and accepts live edits before continuing with the next section',async({page})=>{
 await load(page,song(true));await page.locator('#play').click();
 await expect(page.locator('#song-script-status')).toContainText('Middle',{timeout:3000});await open(page);
 await page.locator('#score-companions [data-score-track="1"]').click();
 await expect(page.locator('#note-editor')).toHaveAttribute('data-selected','1');
 await expect(page.locator('#note-editor')).toHaveAttribute('data-section-loop','true');
 await edit(page);const draft=await score(page);await page.waitForTimeout(4500);
 await expect(page.locator('#score-expanded-dialog')).toBeVisible();expect(await score(page)).toEqual(draft);
 await expect(page.locator('#song-script-status')).toContainText('Middle');
 await expect(page.locator('#score-grid .score-beat-name')).toHaveCount(12);
 await page.locator('#score-done').click();await expect(page.locator('#score-expanded-dialog')).not.toBeVisible();
 await expect(page.locator('#song-script-status')).toContainText('Ending',{timeout:2500});
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false',{timeout:5000});
});

test('the finite final section stays alive while editing and ends only after the editor is left',async({page})=>{
 const source=song();source.scenes=source.scenes.slice(0,1);source.scenes[0].name='Final section';
 await load(page,source);await page.locator('#play').click();await open(page);await page.waitForTimeout(3500);
 await expect(page.locator('#score-expanded-dialog')).toBeVisible();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#score-grid').focus();await page.keyboard.press('Escape');
 await expect(page.locator('#score-expanded-dialog')).not.toBeVisible();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false',{timeout:3500});
});

test('opening while stopped never starts audio; stop/restart during editing does not discard the selected section or draft',async({page})=>{
 await load(page,song());await open(page);await edit(page);const draft=await score(page);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 // External transport actions, e.g. page visibility/audio-session interruptions.
 await page.locator('#play').evaluate((button:HTMLButtonElement)=>button.click());
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(2300);
 await page.locator('#play').evaluate((button:HTMLButtonElement)=>button.click());
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('#play').evaluate((button:HTMLButtonElement)=>button.click());
 await page.waitForTimeout(2300);await expect(page.locator('#score-expanded-dialog')).toBeVisible();expect(await score(page)).toEqual(draft);
 await page.locator('#score-cancel').click();
});

test('a generated arrangement is frozen for editing; cancel restores raw scores and accept keeps only the edited lane',async({page})=>{
 await page.goto('/de/');await page.locator('#files-open').click();
 const settings={version:2,style:'pop',bpm:220,volume:.3,center:'off',background:'off',orbit:'dot',tracks:partsForStyle('pop').map((part,i)=>({
  score:null,enabled:i<2,mute:false,instrument:i===0?'piano':part.instrument,points:Array.from({length:16},(_,s)=>s===0),
  grid:16,slots:16,pitch:0,volume:.4,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null
 }))};
 await page.locator('#json-file').setInputFiles({name:'generated.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(settings))});
 await page.locator('#files-close').click();await page.locator('[data-pad-mode=notes]').click();await page.locator('#evolve').click();
 await open(page);const frozen=await score(page);await page.waitForTimeout(4700);expect(await score(page)).toEqual(frozen);
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','false');
 await page.locator('#score-cancel').click();await expect(page.locator('#score-expanded-dialog')).not.toBeVisible();
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','true',{timeout:3500});
 expect((await exportProject(page)).tracks.every((t:any)=>t.score===null)).toBe(true);
 await open(page);await edit(page);const accepted=await score(page);await page.locator('#score-done').click();
 await expect(page.locator('#score-expanded-dialog')).not.toBeVisible();
 const exported=await exportProject(page);expect(exported.tracks[0].score).toEqual(accepted);
 expect(exported.tracks.slice(1).every((t:any)=>t.score===null)).toBe(true);
});


test('audition mixer isolates companions, always hears the selected lane, supports keyboard and restores saved mutes',async({page})=>{
 const source=song();await load(page,source);await page.locator('#play').click();await open(page);
 const others=page.locator('#score-mute-others'),layer=page.locator('[data-score-mute="1"]');
 await expect(layer).toHaveAttribute('aria-pressed','false');
 await others.click();await expect(others).toHaveAttribute('aria-pressed','true');
 await expect(layer).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#score-companions [data-score-track="1"]')).toHaveAttribute('data-muted','true');
 await page.waitForTimeout(2200);
 await expect(page.locator('#score-companions [data-score-track="1"] [data-preview-hit]')).toHaveCount(0);
 // Individual toggles work without selecting the lane or closing/discarding a draft.
 await edit(page);const draft=await score(page);
 await layer.click();await expect(layer).toHaveAttribute('aria-pressed','false');
 await expect(others).toHaveAttribute('aria-pressed','false');expect(await score(page)).toEqual(draft);
 await expect(page.locator('#score-companions [data-score-track="1"][data-preview-hit]')).toHaveCount(1,{timeout:3500});
 await others.focus();await page.keyboard.press('Enter');await expect(others).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#score-expanded-dialog')).toBeVisible();expect(await score(page)).toEqual(draft);
 await page.locator('#score-cancel').click();await expect(page.locator('#score-expanded-dialog')).not.toBeVisible();
 await page.locator('#play').click(); // stop before checking saved mixer values
 const saved=await exportProject(page);expect(saved.tracks.every((tr:any)=>!tr.mute)).toBe(true);
 // An originally muted selected lane must still actually produce audio.
 saved.tracks[0].mute=true;delete saved.songScript;
 saved.tracks[0].instrument='piano';saved.tracks[0].enabled=true;saved.tracks[0].volume=.5;
 saved.tracks[0].score=[{start:0,duration:.1,points:[{offset:0,pitch:0,velocity:.7}]}];
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'muted.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await page.locator('#files-close').click();
 await page.evaluate(()=>{
  (window as any).auditionStarts=0;const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){(window as any).auditionStarts++;return start.apply(this,args);};
 });
 await open(page);await others.click();
 await page.evaluate(()=>document.querySelector<HTMLButtonElement>('#play')!.click());
 await expect.poll(()=>page.evaluate(()=>(window as any).auditionStarts)).toBeGreaterThan(0);
 // Switching to a companion keeps solo mode: the old selected orbit becomes muted.
 await page.locator('#score-companions [data-score-track="1"]').click();
 await expect(page.locator('#note-editor')).toHaveAttribute('data-selected','1');
 await expect(page.locator('[data-score-mute="0"]')).toHaveAttribute('aria-pressed','true');
 await expect(others).toHaveAttribute('aria-pressed','true');
 await others.click();await expect(page.locator('[data-score-mute="0"]')).toHaveAttribute('aria-pressed','false');
 await page.locator('#score-cancel').click();await expect(page.locator('#score-expanded-dialog')).not.toBeVisible();
 expect((await exportProject(page)).tracks[0].mute).toBe(true);
});
