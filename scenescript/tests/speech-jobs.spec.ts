import {openResources,closeResources} from './helpers/resources';
import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {demoProject,type Project} from '../src/lib/model';
import {defaultNarration} from '../src/lib/audio';
import {speechJobs} from '../src/lib/speech-jobs';
import {wav} from './audio-fixture';
function draft(){const p=demoProject();p.scenes.forEach((s,i)=>{s.duration=1;s.transition='none';s.elements.forEach(e=>e.animation='none');s.narration={...defaultNarration(),text:'Sentence '+i,instructions:'Calm delivery',speaker:'Narrator',at:i?0:.25};});return p;}
async function load(page:Page,p:unknown){await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();}
async function saved(page:Page):Promise<Project>{const pending=page.waitForEvent('download');await page.locator('#save-project').click();return JSON.parse(await readFile((await(await pending).path())!,'utf8'));}
async function reportClose(page:Page){await expect(page.locator('#speech-report')).toBeVisible();await page.locator('#close-speech-report').click();}
function storedEntries(bytes:Buffer){const result=new Map<string,string>();let offset=0;while(bytes.readUInt32LE(offset)===0x04034b50){expect(bytes.readUInt16LE(offset+8)).toBe(0);const n=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),size=bytes.readUInt32LE(offset+18);result.set(bytes.subarray(offset+30,offset+30+n).toString('utf8'),bytes.subarray(offset+30+n+extra,offset+30+n+extra+size).toString('utf8'));offset+=30+n+extra+size;}expect(bytes.readUInt32LE(offset)).toBe(0x02014b50);return result;}

test('save scripts before audio, cancel edits and export one named text file per narration in ZIP',async({page})=>{
 await page.goto('/en/');page.on('dialog',d=>d.accept());await page.locator('#project-narration').click();await expect(page.locator('[name=narrationText]')).toBeVisible();await page.locator('[name=narrationText]').fill('A project voice.');await page.locator('[name=narrationInstructions]').fill('Warm voice; do not read this.');await page.locator('[name=narrationSpeaker]').fill('Narrator');await page.locator('#narration-dialog button[type=submit]').click();
 await page.locator('#scene-narration').click();await page.locator('[name=narrationText]').fill('Hello 😀');await page.locator('#narration-dialog button[type=submit]').click();await page.locator('#scene-narration').click();await page.locator('[name=narrationText]').fill('Discard this');await page.locator('#close-narration').click();
 const p=await saved(page);expect(p.narration).toMatchObject({asset:'',text:'A project voice.',instructions:'Warm voice; do not read this.',speaker:'Narrator'});expect(p.scenes[0].narration?.text).toBe('Hello 😀');expect(p.audios).toEqual({});
 await openResources(page);const pending=page.waitForEvent('download');await page.locator('#export-speech-jobs').click();const dl=await pending;expect(dl.suggestedFilename()).toMatch(/-speech\.zip$/);const entries=storedEntries(await readFile((await dl.path())!)),jobs=await speechJobs(p);expect(entries.size).toBe(2);for(const j of jobs){const text=entries.get(j.textName)!;expect(text).toContain(j.audioName);expect(text).toContain('do NOT read');expect(text.endsWith(j.text)).toBe(true);}
 await closeResources(page);
 // The workflow also survives saving and loading the editable project.
 await load(page,p);await page.locator('#project-narration').click();await expect(page.locator('[name=narrationInstructions]')).toHaveValue('Warm voice; do not read this.');await page.locator('#close-narration').click();
});

test('batch assigns by stable filename after scene reordering, extends measured audio and supports undo/redo',async({page})=>{
 await page.goto('/en/');page.on('dialog',d=>d.accept());const p=draft(),jobs=await speechJobs(p);p.scenes.reverse();p.scenes[0].name='Renamed after export';await load(page,p);
 await page.locator('#speech-audio-files').setInputFiles([{name:jobs[0].stem+'.wav',mimeType:'application/octet-stream',buffer:wav(3)},{name:jobs[1].stem.toUpperCase()+'.WAV',mimeType:'audio/wav',buffer:wav(2)}]);await expect(page.locator('#speech-report-text')).toContainText('Speech files assigned: 2');await expect(page.locator('#speech-report-text')).toContainText('Automatically extended scenes: 2');await reportClose(page);
 const q=await saved(page),intro=q.scenes.find(s=>s.id==='intro')!,outro=q.scenes.find(s=>s.id==='outro')!;expect(intro.duration).toBeCloseTo(3.25,5);expect(outro.duration).toBeCloseTo(2,5);expect(q.audios[intro.narration!.asset].duration).toBeCloseTo(3,5);expect(q.audios[outro.narration!.asset].duration).toBeCloseTo(2,5);expect(intro.narration).toMatchObject({text:'Sentence 0',instructions:'Calm delivery',speaker:'Narrator',start:0,end:null});
 await page.locator('#undo-project').click();expect((await saved(page)).audios).toEqual({});expect((await saved(page)).scenes.map(s=>s.duration)).toEqual([1,1]);await page.locator('#redo-project').click();expect((await saved(page)).scenes.map(s=>s.duration)).toEqual([2,3.25]);
 // A shorter rerecording reuses the slot but does not shorten the scene.
 await page.locator('#speech-audio-files').setInputFiles({name:jobs[0].stem+'.wav',mimeType:'audio/wav',buffer:wav(1)});await reportClose(page);const again=await saved(page);expect(Object.keys(again.audios)).toHaveLength(2);expect(again.scenes.find(s=>s.id==='intro')!.duration).toBe(3.25);
});

test('unknown, duplicate, stale and undecodable imports leave the entire project unchanged, with copyable errors',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).speechError=text;}}}));await page.goto('/en/');page.on('dialog',d=>d.accept());const p=draft(),jobs=await speechJobs(p);await load(page,p);const before=await saved(page);
 for(const files of [
  [{name:'unknown.mp3',mimeType:'audio/mpeg',buffer:wav()}],
  [{name:jobs[0].stem+'.wav',mimeType:'audio/wav',buffer:wav()},{name:jobs[0].stem+'.mp3',mimeType:'audio/mpeg',buffer:wav()}],
  [{name:jobs[0].stem+'.wav',mimeType:'audio/wav',buffer:wav()},{name:jobs[1].stem+'.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('invalid mp3')}]
 ]){await page.locator('#speech-audio-files').setInputFiles(files);await expect(page.locator('#speech-report-text')).toContainText('Nothing was changed');await page.locator('#copy-speech-report').click();expect(await page.evaluate(()=>(window as any).speechError)).toContain('Nothing was changed');await reportClose(page);expect(await saved(page)).toEqual(before);}
 await page.locator('#scene-narration').click();await page.locator('[name=narrationText]').fill('Updated text');await page.locator('#narration-dialog button[type=submit]').click();await page.locator('#speech-audio-files').setInputFiles({name:jobs[0].stem+'.wav',mimeType:'audio/wav',buffer:wav()});await expect(page.locator('#speech-report-text')).toContainText('outdated filename');await reportClose(page);expect((await saved(page)).audios).toEqual({});
});

test('project-wide voice extends the final scene and timing cannot be shortened below assigned audio',async({page})=>{
 await page.goto('/en/');page.on('dialog',d=>d.accept());const p=draft();p.narration={...defaultNarration(),text:'Whole project voice'};const jobs=await speechJobs(p);await load(page,p);
 await page.locator('#speech-audio-files').setInputFiles({name:jobs[0].stem+'.wav',mimeType:'audio/wav',buffer:wav(6)});await reportClose(page);const q=await saved(page);expect(q.scenes[0].duration).toBe(1);expect(q.scenes[1].duration).toBe(5);
 await page.locator('#scene-list button').last().click();await page.locator('#scene-form [name=duration]').fill('1');await page.locator('#scene-form [name=duration]').press('Tab');await expect(page.locator('#editor-status')).toContainText('must not cut off');expect((await saved(page)).scenes[1].duration).toBe(5);
 await page.locator('#project-narration').click();await page.locator('[name=audioEnd]').fill('2');await page.locator('#narration-dialog button[type=submit]').click();await page.locator('#scene-form [name=duration]').fill('1');await page.locator('#scene-form [name=duration]').press('Tab');expect((await saved(page)).scenes[1].duration).toBe(1);
});

test('ordinary assignments extend scenes, deleting audio keeps the draft, and empty exports warn',async({page})=>{
 await page.goto('/en/');page.on('dialog',d=>d.accept());await openResources(page);await page.locator('#export-speech-jobs').click();await expect(page.locator('.app-toast')).toContainText('No speech scripts');await closeResources(page);const p=draft();p.scenes[0].narration!.text='Regenerate me';await load(page,p);
 await page.locator('#audio-file').setInputFiles({name:'ordinary.wav',mimeType:'audio/wav',buffer:wav(3)});await expect(page.locator('.audio-row')).toHaveCount(1);await page.locator('#scene-narration').click();await page.locator('[name=audioAsset]').selectOption({label:'ordinary.wav'});await page.locator('#narration-dialog button[type=submit]').click();expect((await saved(page)).scenes[0].duration).toBe(3.25);
 await openResources(page);await page.locator('[data-delete-audio]').click();await page.locator('#confirm-delete').click();await closeResources(page);const q=await saved(page);expect(q.audios).toEqual({});expect(q.scenes[0].narration).toMatchObject({asset:'',text:'Regenerate me',speaker:'Narrator'});expect((await speechJobs(q)).length).toBe(2);
});

test('a project change while decoding cancels a pending batch instead of overwriting edits',async({page})=>{
 await page.goto('/en/');page.on('dialog',d=>d.accept());const p=draft(),job=(await speechJobs(p))[0];await load(page,p);
 await page.evaluate(()=>{const original=OfflineAudioContext.prototype.decodeAudioData;OfflineAudioContext.prototype.decodeAudioData=async function(data:ArrayBuffer){const result=await original.call(this,data);await new Promise(r=>setTimeout(r,500));return result;};});
 await page.locator('#speech-audio-files').setInputFiles({name:job.stem+'.wav',mimeType:'audio/wav',buffer:wav()});await page.locator('#project-title').fill('Changed while importing');await expect(page.locator('#speech-report-text')).toContainText('project changed');await reportClose(page);const q=await saved(page);expect(q.title).toBe('Changed while importing');expect(q.audios).toEqual({});
});
