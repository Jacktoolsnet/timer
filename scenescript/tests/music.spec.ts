import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
async function exported(page:import('@playwright/test').Page){const pending=page.waitForEvent('download');await page.locator('#save-project').click();return JSON.parse(await readFile((await (await pending).path())!,'utf8'));}
test('music dialog drafts cancel and apply; instruments and score editable',async({page})=>{
 await page.goto('/de/');await page.locator('#project-music').click();await page.locator('[name=musicEnabled]').check();await page.locator('#close-music').click();expect((await exported(page)).music).toBeNull();
 await page.locator('#project-music').click();await page.locator('[name=musicEnabled]').check();await page.locator('#music-form [name=mode]').selectOption('score');await page.locator('#music-form [name=name]').fill('Mein Klang');await page.locator('#music-form [name=wave]').selectOption('triangle');await page.locator('#music-form section').last().getByRole('button',{name:'Hinzufügen',exact:true}).click();await page.locator('#music-form [name=pitch]').fill('67');await page.locator('#music-form [name=pitch]').dispatchEvent('change');await page.locator('#apply-music').click();await expect(page.locator('#music-dialog')).not.toBeVisible();const p=await exported(page);expect(p.music.enabled).toBe(true);expect(p.music.instruments[0].name).toBe('Mein Klang');expect(p.music.instruments[0].wave).toBe('triangle');expect(p.music.notes[0].pitch).toBe(67);
 await page.locator('#play').click();await expect.poll(async()=>Number(await page.locator('#timeline').inputValue())).toBeGreaterThan(.1);await page.locator('#play').click();const paused=await page.locator('#timeline').inputValue();await page.waitForTimeout(250);expect(await page.locator('#timeline').inputValue()).toBe(paused);
});
test('synthetic note rendering has audible energy and effect tails',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const audio=await import('/src/scripts/music-audio.ts' as string),lib=await import('/src/lib/music.ts' as string);const instrument=lib.presetInstrument('bell');const note={instrument:instrument.id,at:0,duration:.5,pitch:69,velocity:.7};const b=await audio.renderNote(instrument,note,1);const data=b.getChannelData(0);let energy=0;for(const v of data)energy+=v*v;return {energy,duration:b.duration};
 });expect(result.energy).toBeGreaterThan(.01);expect(result.duration).toBeGreaterThan(2);
});
test('recording countdown is silent; pause and seeking restart from the correct offset',async({page})=>{
 await page.addInitScript(`window.audioStarts=[];const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.audioStarts.push(args);return original.apply(this,args);};`);
 await page.goto('/en/');const p=await exported(page);p.music={enabled:true,mode:'score',instruments:[{id:'pad'}],notes:[{instrument:'pad',at:0,duration:6,pitch:60,velocity:.7}]};
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();
 await page.locator('#timeline').fill('2');await page.locator('#timeline').dispatchEvent('input');await page.locator('#play').click();await expect.poll(()=>page.evaluate('window.audioStarts.length')).toBeGreaterThan(0);expect(await page.evaluate('window.audioStarts[0][1]')).toBeGreaterThanOrEqual(2);await page.locator('#play').click();
 await page.evaluate('window.audioStarts=[]');await page.locator('#focus').click();await page.locator('#start-recording').click();await page.waitForTimeout(800);expect(await page.evaluate('window.audioStarts.length')).toBe(0);await expect.poll(()=>page.evaluate('window.audioStarts.length'),{timeout:6000}).toBeGreaterThan(0);await page.keyboard.press('Space');const at=await page.locator('#timeline').inputValue();await page.waitForTimeout(200);expect(await page.locator('#timeline').inputValue()).toBe(at);await page.keyboard.press('Escape');
});
test('music draft escapes without changes and listening has a stop control',async({page})=>{
 await page.goto('/en/');await page.locator('#project-music').click();await page.locator('#listen-music').click();await expect(page.locator('#listen-music')).toHaveAttribute('aria-label','Pause');await page.locator('#listen-music').click();await expect(page.locator('#listen-music')).toHaveAttribute('aria-label','Listen');await page.locator('#music-form [name=name]').fill('Unsaved');await page.keyboard.press('Escape');expect((await exported(page)).music).toBeNull();
});
test('denied audio falls back to silent visual playback with a warning',async({page})=>{
 await page.addInitScript(`const Original=AudioContext;window.AudioContext=class extends Original {resume(){return Promise.reject(new Error('Denied'));}};`);
 await page.goto('/en/');await page.locator('#project-music').click();await page.locator('[name=musicEnabled]').check();await page.locator('#apply-music').click();await page.locator('#play').click();await expect(page.locator('.app-toast')).toContainText('Audio could not start');await expect.poll(async()=>Number(await page.locator('#timeline').inputValue())).toBeGreaterThan(.1);await page.locator('#play').click();
});
