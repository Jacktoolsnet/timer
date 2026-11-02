import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {wavHeader,WAV_PROCESSOR} from '../src/lib/wav-export';
import {fileCopy} from '../src/lib/file-copy';

test('PCM WAVE header declares exact stereo frames, byte rate and bounded RIFF sizes',()=>{
 const bytes=Buffer.from(wavHeader(48000,48000));
 expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.readUInt32LE(4)).toBe(192036);
 expect(bytes.subarray(8,12).toString()).toBe('WAVE');expect(bytes.subarray(12,16).toString()).toBe('fmt ');
 expect(bytes.readUInt16LE(20)).toBe(1);expect(bytes.readUInt16LE(22)).toBe(2);
 expect(bytes.readUInt32LE(24)).toBe(48000);expect(bytes.readUInt32LE(28)).toBe(192000);
 expect(bytes.readUInt16LE(32)).toBe(4);expect(bytes.readUInt16LE(34)).toBe(16);
 expect(bytes.subarray(36,40).toString()).toBe('data');expect(bytes.readUInt32LE(40)).toBe(192000);
 for(const [rate,frames] of [[0,1],[48000,-1],[48000,1.5],[48000,2**30]])expect(()=>wavHeader(rate,frames)).toThrow();
});

test('audio-thread capture clips and interleaves stereo, flushes partial chunks, and stops exactly at its limit',()=>{
 let Processor:any;
 class Base {port={postMessage:(message:any)=>messages.push(message),onmessage:null as any};}
 const messages:any[]=[];
 new Function('AudioWorkletProcessor','registerProcessor',WAV_PROCESSOR)(Base,(_name:string,ctor:any)=>Processor=ctor);
 const p=new Processor({processorOptions:{maxFrames:3}});
 const input=[[new Float32Array([1,-1,.5,0]),new Float32Array([-2,2,-.25,0])]];
 expect(p.process(input,[[new Float32Array(4)]] )).toBe(false);
 expect(messages.map(m=>m.type)).toEqual(['chunk','done']);expect(messages[1].limited).toBe(true);
 const data=new DataView(messages[0].data);
 expect(data.byteLength).toBe(12);
 expect(Array.from({length:6},(_,i)=>data.getInt16(i*2,true))).toEqual([32767,-32768,-32768,32767,16384,-8192]);
 messages.length=0;
 const mono=new Processor({processorOptions:{maxFrames:100}});
 mono.process([[new Float32Array([.25])]],[[new Float32Array(1)]]);
 mono.port.onmessage({data:'stop'});mono.port.onmessage({data:'stop'});
 expect(messages.map(m=>m.type)).toEqual(['chunk','done']);expect(messages[1].limited).toBe(false);
 expect(new DataView(messages[0].data).getInt16(2,true)).toBe(8192);
 expect(mono.process([],[])).toBe(false);
});

test('WAV records actual music and silence, flushes its final block and can be repeated without an encoder package',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('#files-open').click();
 await expect(page.locator('#wav-record')).toBeEnabled();
 for(let take=0;take<2;take++){
  await page.locator('#wav-record').click();
  await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavRecording);
  await expect(page.locator('#files-dialog')).not.toBeVisible();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(2200);
  await page.locator('#files-open').click();
  await expect(page.locator('#video-record')).toBeDisabled();
  await expect(page.locator('#json-import')).toBeDisabled();
  await expect(page.locator('#wav-record')).toBeEnabled();
  await expect(page.locator('#wav-record')).toHaveAttribute('title',fileCopy.de.stop);
  const pending=page.waitForEvent('download');
  if(take===0){await page.locator('#files-close').click();await page.locator('#wav-stop').click();}
  else await page.locator('#wav-record').click();
  const download=await pending;expect(download.suggestedFilename()).toMatch(/\.wav$/);
  const data=await readFile((await download.path())!);
  expect(data.subarray(0,4).toString()).toBe('RIFF');expect(data.subarray(8,12).toString()).toBe('WAVE');
  expect(data.readUInt32LE(4)).toBe(data.length-8);expect(data.readUInt32LE(40)).toBe(data.length-44);
  expect(data.readUInt16LE(22)).toBe(2);expect(data.readUInt16LE(34)).toBe(16);
  const duration=(data.length-44)/4/data.readUInt32LE(24);expect(duration).toBeGreaterThan(1);
  let peak=0;for(let i=44;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));
  if(take===0)expect(peak).toBeGreaterThan(50);else expect(peak).toBe(0);
  await expect(page.locator('#wav-download')).toBeVisible();
  const decoded=await page.locator('#wav-download').evaluate(async(link)=>{
   const audio=new AudioContext(),bytes=await(await fetch((link as HTMLAnchorElement).href)).arrayBuffer();
   const buffer=await audio.decodeAudioData(bytes);const result={channels:buffer.numberOfChannels,duration:buffer.duration};
   await audio.close();return result;
  });
  expect(decoded.channels).toBe(2);expect(decoded.duration).toBeCloseTo(duration,2);
  await page.locator('#play').click();
  await page.locator('#volume').fill('0');await page.locator('#volume').dispatchEvent('input');
  await page.locator('#files-open').click();await expect(page.locator('#json-import')).toBeEnabled();
 }
 expect(errors).toEqual([]);
});

test('Random Play keeps evolving during WAV and hiding the tab finalizes the file',async({page})=>{
 await page.goto('/de/');await page.locator('#evolve').click();
 await page.locator('#files-open').click();await page.locator('#wav-record').click();
 await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavRecording);
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','true');
 await page.waitForTimeout(600);
 const pending=page.waitForEvent('download');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await pending;await expect(page.locator('#wav-download')).toBeVisible();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.locator('#wav-dismiss').click();await expect(page.locator('#wav-session')).toBeHidden();
});

for(const lang of ['de','en','es','fr'] as const)test('WAV availability and tooltips are localized independently of MP4: '+lang,async({page})=>{
 await page.addInitScript(()=>{if(typeof MediaRecorder!=='undefined')MediaRecorder.isTypeSupported=()=>false;});
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();
 await expect(page.locator('#wav-record')).toBeEnabled();
 await expect(page.locator('#wav-record')).toHaveAttribute('title',fileCopy[lang].wavRecord);
 await expect(page.locator('#video-record')).toBeDisabled();
 await expect(page.locator('#wav-record')).toHaveText('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('AudioWorklet loading errors are recoverable and an unsupported WAV browser keeps JSON available',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{AudioWorklet.prototype.addModule=async()=>{throw Error('Loading failed');};});
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#wav-record').click();
 await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavError);
 await expect(page.locator('#wav-support')).toHaveText(fileCopy.de.wavError);
 await expect(page.locator('#wav-record')).toBeEnabled();await expect(page.locator('#json-import')).toBeEnabled();
 expect(errors).toEqual([]);
});

test('WAV unsupported message does not disable JSON or MP4',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'AudioWorkletNode',{value:undefined});});
 await page.goto('/de/');await page.locator('#files-open').click();
 await expect(page.locator('#wav-support')).toHaveText(fileCopy.de.wavUnsupported);
 await expect(page.locator('#wav-record')).toBeDisabled();
 await expect(page.locator('#json-import')).toBeEnabled();await expect(page.locator('#json-export')).toBeEnabled();
});


test('stopping playback while the worklet loads cancels startup instead of starting a stale recording',async({page})=>{
 await page.addInitScript(()=>{
  const original=AudioWorklet.prototype.addModule;
  AudioWorklet.prototype.addModule=async function(url,options){
   await new Promise(r=>setTimeout(r,700));return original.call(this,url,options);
  };
 });
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#wav-record').click();
 await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavPreparing);
 await page.locator('#files-close').click();await page.locator('#play').click();
 await expect(page.locator('#wav-status')).toHaveText(fileCopy.de.wavCancelled);
 await expect(page.locator('#wav-download')).toBeHidden();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('#files-open').click();await expect(page.locator('#json-import')).toBeEnabled();
});
