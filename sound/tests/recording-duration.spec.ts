import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {recordingSeconds} from '../src/lib/recording-duration';
import {decodeSettings} from '../src/lib/sound-settings';
import {fileCopy} from '../src/lib/file-copy';
test('capture durations are bounded between one and ten minutes with safe defaults',()=>{
 expect(recordingSeconds()).toBe(600);
 for(const [input,want] of [[NaN,600],[Infinity,600],[-2,60],[0,60],[60,60],[180,180],[600,600],[900,600]])expect(recordingSeconds(input)).toBe(want);
});
for(const lang of ['de','en','es','fr'])test(`duration range is labelled, bounded and survives a JSON round-trip: ${lang}`,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();const range=page.locator('#recording-duration');
 await expect(range).toHaveAttribute('min','1');await expect(range).toHaveAttribute('max','10');await expect(range).toHaveAttribute('step','1');await expect(range).toHaveValue('10');
 await range.fill('3');await range.dispatchEvent('input');await expect(page.locator('#recording-duration-value')).toHaveText(/3 /);await expect(range).toHaveAttribute('aria-valuetext',/3 /);
 const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const raw=await readFile((await(await pending).path())!,'utf8'),saved=decodeSettings(raw)!;
 expect(saved.recording!.minutes).toBe(3);
 for(const minutes of [0,11,2.5,'3',null]){const bad=JSON.parse(raw);bad.recording.minutes=minutes;expect(decodeSettings(JSON.stringify(bad))).toBeNull();}
 await page.reload();await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'duration.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await expect(range).toHaveValue('3');await expect(page.locator('#recording-duration-value')).toHaveText(/3 /);
 const old=JSON.parse(raw);delete old.recording.minutes;
 await page.locator('#json-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});await expect(range).toHaveValue('10');
});
test('WAV receives the selected exact audio-frame limit and auto-saves at that limit',async({page})=>{
 await page.addInitScript(()=>{
  const Base=AudioWorkletNode;
  window.AudioWorkletNode=class extends Base{
   constructor(ctx:BaseAudioContext,name:string,options?:AudioWorkletNodeOptions){
    if(name==='jacktools-wav-capture'){
     (window as any).durationFrames=options!.processorOptions.maxFrames/ctx.sampleRate;
     // Exercise the real audio-thread limit without waiting a wall-clock minute.
     options!.processorOptions.maxFrames=Math.floor(ctx.sampleRate*.6);
    }
    super(ctx,name,options);
   }
  };
 });
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#recording-duration').fill('2');
 const download=page.waitForEvent('download');await page.locator('#wav-record').click();
 const file=await download;expect(file.suggestedFilename()).toMatch(/\.wav$/);
 expect(await page.evaluate(()=>(window as any).durationFrames)).toBe(120);
 await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavLimit);
 await expect(page.locator('#wav-stop')).toBeHidden();await page.locator('#files-open').click();await expect(page.locator('#recording-duration')).toBeEnabled();
});
test('MP4 receives selected wall-clock duration and automatically saves the recording',async({page})=>{
 await page.addInitScript(()=>{
  const native=window.setTimeout;
  window.setTimeout=((fn:TimerHandler,delay?:number,...args:any[])=>{
   if(delay===60000){(window as any).captureLimit=delay;return native(fn,700,...args);}
   return native(fn,delay,...args);
  }) as typeof window.setTimeout;
 });
 await page.goto('/de/');await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'Native MP4 unavailable');
 await page.locator('#recording-duration').fill('1');const download=page.waitForEvent('download');await page.locator('#video-record').click();
 expect((await download).suggestedFilename()).toMatch(/\.mp4$/);
 expect(await page.evaluate(()=>(window as any).captureLimit)).toBe(60000);
 await expect(page.locator('#video-status')).toHaveText(fileCopy.de.limit);
});
