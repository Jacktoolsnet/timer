import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {decodeSettings} from '../src/lib/sound-settings';
import {fileCopy} from '../src/lib/file-copy';
for(const random of [false,true])test(`WAV restart records half a second of silence then starts ${random?'Random':'normal'} Play from the beginning`,async({page})=>{
 await page.goto('/de/');await page.locator('#evolve').click();await page.waitForTimeout(800);
 await page.locator('#files-open').click();await page.locator('#recording-restart').check();
 await page.locator('#recording-random').setChecked(random);
 await page.locator('#wav-record').click();await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavRecording);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed',String(random));
 await page.waitForTimeout(1500);
 const pending=page.waitForEvent('download');await page.locator('#wav-stop').click();
 const bytes=await readFile((await(await pending).path())!),sr=bytes.readUInt32LE(24);
 const rms=(from:number,to:number)=>{
  let sum=0,count=0;
  for(let i=Math.floor(from*sr)*4+44;i<Math.min(bytes.length,Math.floor(to*sr)*4+44);i+=2){const n=bytes.readInt16LE(i)/32768;sum+=n*n;count++;}
  return Math.sqrt(sum/Math.max(1,count));
 };
 expect(rms(.04,.4)).toBeLessThan(.00005);
 expect(rms(.6,1.3)).toBeGreaterThan(.0002);
 await page.locator('#files-open').click();await expect(page.locator('#recording-restart')).toBeEnabled();
 await expect(page.locator('#recording-random')).toBeEnabled();
});

test('MP4 begins before the newly scheduled first beat; fullscreen denial falls back to focus view',async({page})=>{
 await page.addInitScript(()=>{
  const Base=AudioContext,start=MediaRecorder.prototype.start,oscStart=OscillatorNode.prototype.start;
  (window as any).recordStart=null;(window as any).beats=[];(window as any).fullRequests=[];
  window.AudioContext=class extends Base{constructor(){super();(window as any).testAudio=this;}};
  Element.prototype.requestFullscreen=()=>{(window as any).fullRequests.push({active:navigator.userActivation.isActive,at:performance.now()});return Promise.reject(new Error('Denied for test'));};
  MediaRecorder.prototype.start=function(...args){(window as any).recordStart={at:performance.now(),audio:(window as any).testAudio.currentTime};return start.apply(this,args);};
  OscillatorNode.prototype.start=function(time=0){if((window as any).recordStart)(window as any).beats.push(time);return oscStart.call(this,time);};
 });
 await page.goto('/de/');await page.locator('#files-open').click();
 test.skip(await page.locator('#video-record').isDisabled(),'Native MP4 unavailable');
 await page.locator('#recording-restart').check();await page.locator('#recording-random').check();
 await page.locator('#recording-fullscreen').check();await page.locator('#video-record').click();
 await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await expect(page.locator('body')).toHaveClass(/focus-view/);await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','true');
 const timing=await page.evaluate(()=>({record:(window as any).recordStart,beats:(window as any).beats,full:(window as any).fullRequests}));
 expect(timing.full).toHaveLength(1);expect(timing.full[0].active).toBe(true);
 expect(timing.full[0].at).toBeLessThan(timing.record.at);
 // Voices are scheduled only when they enter the audio lookahead window.
 await expect.poll(async()=>page.evaluate(()=>(window as any).beats.length)).toBeGreaterThan(0);
 const first=await page.evaluate(()=>Math.min(...(window as any).beats)-(window as any).recordStart.audio);
 expect(first).toBeGreaterThanOrEqual(.48);expect(first).toBeLessThan(.8);
 await page.waitForTimeout(700);const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
});

test('cancel during delayed WAV preparation never launches music or downloads a partial take',async({page})=>{
 await page.addInitScript(()=>{
  const load=AudioWorklet.prototype.addModule;
  AudioWorklet.prototype.addModule=async function(url,options){await new Promise(r=>setTimeout(r,500));return load.call(this,url,options);};
 });
 const downloads:string[]=[];page.on('download',d=>downloads.push(d.suggestedFilename()));
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#recording-restart').check();
 await page.locator('#wav-record').click();await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavPreparing);
 await page.locator('#files-close').click();await page.locator('#wav-stop').click();
 await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavCancelled);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');expect(downloads).toEqual([]);
 await page.locator('#files-open').click();await expect(page.locator('#wav-record')).toBeEnabled();
});

for(const lang of ['de','en','es','fr'])test(`recording toggles are accessible and optional: ${lang}`,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();
 await expect(page.locator('#recording-options [role=switch]')).toHaveCount(3);
 await expect(page.locator('#recording-restart')).not.toBeChecked();await expect(page.locator('#recording-fullscreen')).not.toBeChecked();
 await expect(page.locator('#recording-random')).toBeDisabled();
 await page.locator('#recording-restart').check();await expect(page.locator('#recording-random')).toBeEnabled();
});

test('recording options round-trip in JSON and reject malformed switches without autoplay or fullscreen',async({page})=>{
 await page.goto('/de/');await page.locator('#files-open').click();
 for(const option of ['restart','random','fullscreen'])await page.locator('#recording-'+option).check();
 const download=page.waitForEvent('download');await page.locator('#json-export').click();
 const raw=await readFile((await(await download).path())!,'utf8');
 expect(decodeSettings(raw)!.recording).toEqual({restart:true,random:true,fullscreen:true,minutes:10});
 for(const value of [null,[],{},'yes',{restart:'true',random:false,fullscreen:false}]){
  const bad=JSON.parse(raw);bad.recording=value;expect(decodeSettings(JSON.stringify(bad))).toBeNull();
 }
 await page.reload();await page.locator('#files-open').click();
 await page.locator('#json-file').setInputFiles({name:'recording.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 for(const option of ['restart','random','fullscreen'])await expect(page.locator('#recording-'+option)).toBeChecked();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');await expect(page.locator('body')).not.toHaveClass(/focus-view/);
 const old=JSON.parse(raw);delete old.recording;
 await page.locator('#json-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
 await expect(page.locator('#recording-restart')).not.toBeChecked();
});

test('manual playback during slow restart preparation is never reset by a stale recording start',async({page})=>{
 await page.addInitScript(()=>{
  const load=AudioWorklet.prototype.addModule;
  AudioWorklet.prototype.addModule=async function(url,options){await new Promise(r=>setTimeout(r,1400));return load.call(this,url,options);};
 });
 const downloads:string[]=[];page.on('download',d=>downloads.push(d.suggestedFilename()));
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#recording-restart').check();
 await page.locator('#wav-record').click();await page.locator('#files-close').click();
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavError);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');expect(downloads).toEqual([]);
});
