import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {defaultVideoInfo,videoInfoSize} from '../src/lib/video-info';
import {decodeSettings} from '../src/lib/sound-settings';
import {fileCopy} from '../src/lib/file-copy';
test('optional labels reserve landscape space while retaining portrait orbit size',()=>{
 expect(videoInfoSize(1280,720)).toBe(680);expect(videoInfoSize(1280,720,true)).toBe(540);expect(videoInfoSize(720,1280,true)).toBe(680);
});
for(const portrait of [false,true])test(`video text stays outside the orbit and fits long titles: ${portrait?'portrait':'landscape'}`,async({page})=>{
 await page.goto('/de/');
 const result=await page.evaluate(async portrait=>{
  const exportPath='/src/lib/video-export.ts',infoPath='/src/lib/video-info.ts';
  const {paintVideo}=await import(exportPath),{defaultVideoInfo}=await import(infoPath);
  const canvas=document.createElement('canvas');canvas.width=portrait?720:1280;canvas.height=portrait?1280:720;
  const ctx=canvas.getContext('2d')!,texts:any[]=[],images:any[]=[];
  const fill=ctx.fillText.bind(ctx),draw=ctx.drawImage.bind(ctx);
  ctx.fillText=(text,x,y)=>{texts.push({text,x,y,width:ctx.measureText(text).width});fill(text,x,y);};
  const orbit=document.querySelector<HTMLCanvasElement>('#orbit')!;
  ctx.drawImage=((source:any,...args:any[])=>{if(source===orbit)images.push(args);(draw as any)(source,...args);}) as typeof ctx.drawImage;
  const settings={...defaultVideoInfo,enabled:true,title:'W'.repeat(80),tempo:true,section:true};
  const content={style:'Jazz & Blues',tempo:'92 BPM',section:'Refrain',signature:'Erstellt mit JackTools Sound'};
  paintVideo(ctx,orbit,document.querySelector('#sound-atmosphere'),true,{settings,content});
  const shown=[...texts];texts.length=0;
  paintVideo(ctx,orbit,document.querySelector('#sound-atmosphere'),true,{settings:{...settings,enabled:false},content});
  const disabled=texts.length;texts.length=0;
  const clean={...settings,title:'Mein Orbit-Song'};
  paintVideo(ctx,orbit,document.querySelector('#sound-atmosphere'),true,{settings:clean,content});
  const screenshot=canvas.toDataURL().split(',')[1];
  return {texts:shown,orbit:images[0],disabled,screenshot};
 },portrait);
 if(portrait)expect(result.texts[0].text).toMatch(/…$/);for(const text of result.texts)expect(text.width).toBeLessThanOrEqual((portrait?720:1280)-80);
 const [,top,,size]=result.orbit;
 expect(result.texts[1].y).toBeLessThan(top);expect(result.texts[2].y).toBeGreaterThan(top+size);
 expect(result.texts.map(t=>t.text)).toContain('sound.jacktools.net');expect(result.disabled).toBe(0);
 await writeFile('test-results/video-info-'+(portrait?'portrait':'landscape')+'-'+test.info().project.name+'.png',Buffer.from(result.screenshot,'base64'));
});
for(const lang of ['de','en','es','fr'])test(`video info controls are optional, localized and project-safe: ${lang}`,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();
 await expect(page.locator('#video-info-options')).toBeHidden();await page.locator('#video-info-enabled').check();
 await page.locator('#video-info-title').fill('Mein Orbit-Song');await page.locator('#video-info-tempo').check();
 await expect(page.locator('#video-info-section')).not.toBeChecked();
 await expect(page.locator('#video-info-signature')).toBeChecked();
 const download=page.waitForEvent('download');await page.locator('#json-export').click();
 const raw=await readFile((await(await download).path())!,'utf8');
 expect(decodeSettings(raw)!.recording!.videoInfo).toEqual({...defaultVideoInfo,enabled:true,title:'Mein Orbit-Song',tempo:true});
 for(const badInfo of [null,{},'yes',{...defaultVideoInfo,title:'x'.repeat(81)},{...defaultVideoInfo,enabled:'yes'}]){
  const bad=JSON.parse(raw);bad.recording.videoInfo=badInfo;expect(decodeSettings(JSON.stringify(bad))).toBeNull();
 }
 await page.reload();await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'info.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await expect(page.locator('#video-info-title')).toHaveValue('Mein Orbit-Song');await expect(page.locator('#video-info-enabled')).toBeChecked();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 const old=JSON.parse(raw);delete old.recording.videoInfo;
 await page.locator('#json-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
 await expect(page.locator('#video-info-enabled')).not.toBeChecked();
});
test('actual portrait MP4 draws the selected title and live music metadata into its capture canvas only',async({page})=>{
 await page.addInitScript(()=>{
  const fill=CanvasRenderingContext2D.prototype.fillText;(window as any).videoTexts=[];
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(this.canvas.width===720&&this.canvas.height===1280)(window as any).videoTexts.push(text);return fill.call(this,text,x,y,...rest);};
 });
 await page.goto('/de/');await page.locator('#evolve').click();await page.locator('#files-open').click();
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#video-format input[value=portrait]').check();await page.locator('#video-info-enabled').check();
 await page.locator('#video-info-title').fill('Mein Orbit-Song');await page.locator('#video-info-tempo').check();await page.locator('#video-info-section').check();
 await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await expect.poll(async()=>page.evaluate(()=>[...(window as any).videoTexts].some(t=>(t as string).includes('BPM')))).toBe(true);
 const texts=await page.evaluate(()=>(window as any).videoTexts as string[]);
 expect(texts).toContain('Mein Orbit-Song');expect(texts).toContain('Created with JackTools Sound');expect(texts).toContain('sound.jacktools.net');expect(texts).toContain('Intro');
 await page.locator('#files-open').click();await expect(page.locator('#video-info-title')).toBeDisabled();await page.locator('#files-close').click();
 await page.waitForTimeout(900);const download=page.waitForEvent('download');await page.locator('#video-stop').click();expect((await download).suggestedFilename()).toMatch(/\.mp4$/);
});
