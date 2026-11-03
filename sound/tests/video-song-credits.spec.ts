import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {songVideoSeconds} from '../src/lib/video-credits';
import {decodeSettings} from '../src/lib/sound-settings';
const song={format:'jacktools-song',version:1,title:'Short song',bpm:220,style:'classical',loop:true,seed:42,tracks:[{id:'piano',instrument:'piano',volume:.4}],scenes:[{name:'Only scene',bars:2,parts:[{track:'piano',notes:[{at:0,duration:7.9,pitch:0,velocity:.5}]}]}]};
test('whole song duration is not rounded or bounded to fixed recording minutes',()=>{
 expect(songVideoSeconds(50,72)).toBeCloseTo(168.6666667);
 expect(songVideoSeconds(2,220)).toBeLessThan(5);
 expect(songVideoSeconds(512,40)).toBe(3074);
});
for(const lang of ['de','en','es','fr'])test('song length and editable credits round-trip safely: '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();
 const whole=page.locator('#video-length-mode input[value=song]');await expect(whole).toBeDisabled();
 await page.locator('#recording-restart').check();await page.locator('#recording-random').check();
 await page.locator('#song-script-upload').setInputFiles({name:'song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(song))});
 await expect(page.locator('#recording-random')).not.toBeChecked();await expect(page.locator('#recording-random')).toBeDisabled();
 await whole.check();await expect(page.locator('#recording-restart')).toBeDisabled();
 await page.locator('#video-credits-enabled').check();await page.locator('#video-credits-text').fill('Canon in D · Johann Pachelbel\nOriginalkomposition gemeinfrei (Deutschland)\nKI-gestützte Bearbeitung · mit jacktools Sound synthetisiert');
 const wait=page.waitForEvent('download');await page.locator('#json-export').click();const raw=await readFile((await(await wait).path())!,'utf8');
 const settings=decodeSettings(raw)!;expect(settings.recording!.videoLength).toBe('song');expect(settings.recording!.credits!.enabled).toBe(true);
 for(const bad of [{enabled:true,text:'x'.repeat(601)},null,{enabled:'yes',text:''}]){const data=JSON.parse(raw);data.recording.credits=bad;expect(decodeSettings(JSON.stringify(data))).toBeNull();}
 await page.reload();await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await expect(whole).toBeChecked();await expect(page.locator('#video-credits-text')).toHaveValue(settings.recording!.credits!.text);
 await page.locator('#song-script-leave').click();await expect(whole).toBeDisabled();
});
for(const loop of [false,true])test('MP4 captures one whole song without random music, then three seconds of credits: loop='+loop,async({page})=>{
 await page.addInitScript(()=>{
  const original=CanvasRenderingContext2D.prototype.fillText;(window as any).creditsFrames=[];
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(text==='VERIFIED CREDITS')(window as any).creditsFrames.push(performance.now());return original.call(this,text,x,y,...rest);};
 });
 await page.goto('/de/');await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#song-script-upload').setInputFiles({name:'song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...song,loop}))});
 await page.locator('#video-length-mode input[value=song]').check();await page.locator('#video-credits-enabled').check();await page.locator('#video-credits-text').fill('VERIFIED CREDITS');
 const wait=page.waitForEvent('download');const began=Date.now();await page.locator('#video-record').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','false');
 const file=await wait;expect(file.suggestedFilename()).toMatch(/\.mp4$/);expect(Date.now()-began).toBeGreaterThan(7300);expect(Date.now()-began).toBeLessThan(14000);
 const frames=await page.evaluate(()=>(window as any).creditsFrames as number[]);expect(frames.length).toBeGreaterThan(10);expect(frames.at(-1)!-frames[0]).toBeGreaterThan(2700);
 await page.locator('#files-open').click();await expect(page.locator('#song-script-export')).toBeEnabled();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('credits wrap long text within both video formats',async({page})=>{
 await page.goto('/de/');
 const results=await page.evaluate(async()=>{
  const path='/src/lib/video-credits.ts';const {paintVideoCredits}=await import(path);return [false,true].map(portrait=>{
   const canvas=document.createElement('canvas');canvas.width=portrait?720:1280;canvas.height=portrait?1280:720;const ctx=canvas.getContext('2d')!,texts:any[]=[];
   ctx.fillText=(text,x,y)=>texts.push({x,y,width:ctx.measureText(text).width});paintVideoCredits(ctx,'W'.repeat(600),'de',1);return {texts,width:canvas.width,height:canvas.height};
  });
 });
 for(const result of results)for(const text of result.texts){expect(text.width).toBeLessThan(result.width*.9);expect(text.y).toBeGreaterThan(0);expect(text.y).toBeLessThan(result.height);}
});
test('whole song without credits stops automatically after one pass and decay',async({page})=>{
 await page.goto('/de/');await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#song-script-upload').setInputFiles({name:'song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(song))});
 await page.locator('#video-length-mode input[value=song]').check();const download=page.waitForEvent('download'),began=Date.now();await page.locator('#video-record').click();await download;
 expect(Date.now()-began).toBeGreaterThan(4500);expect(Date.now()-began).toBeLessThan(10000);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('a finite script still receives credits when fixed duration is longer than the song',async({page})=>{
 await page.addInitScript(()=>{
  const original=CanvasRenderingContext2D.prototype.fillText;(window as any).sawCredits=false;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(text==='FINITE CREDITS')(window as any).sawCredits=true;return original.call(this,text,x,y,...rest);};
 });
 await page.goto('/de/');await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#song-script-upload').setInputFiles({name:'song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...song,loop:false}))});
 await page.locator('#video-credits-enabled').check();await page.locator('#video-credits-text').fill('FINITE CREDITS');
 const download=page.waitForEvent('download');await page.locator('#video-record').click();await download;
 expect(await page.evaluate(()=>(window as any).sawCredits)).toBe(true);
});
