import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {videoInfoCopy} from '../src/lib/video-info';
import {decodeSettings} from '../src/lib/sound-settings';
import {fileCopy} from '../src/lib/file-copy';
test('video language defaults to English independently of the page and preserves custom titles',async({page})=>{
 await page.goto('/de/');await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=music]').click();await page.locator('[data-style-preset=classical]').click();await page.locator('#animation-settings-close').click();await page.locator('#files-open').click();await page.locator('#video-info-enabled').check();
 await expect(page.locator('#video-caption-language input[value=en]')).toBeChecked();
 await expect(page.locator('#video-info-title')).toHaveAttribute('placeholder','Random Classical Sound Session');
 await page.locator('#video-caption-language input[value=fr]').check();await expect(page.locator('#video-info-title')).toHaveAttribute('placeholder','Random Classique Sound Session');
 await page.locator('#video-info-title').fill('Mein eigener Titel');await page.locator('#video-caption-language input[value=es]').check();await expect(page.locator('#video-info-title')).toHaveValue('Mein eigener Titel');
 const download=page.waitForEvent('download');await page.locator('#json-export').click();const raw=await readFile((await(await download).path())!,'utf8');
 expect(decodeSettings(raw)!.recording!.videoInfo!.language).toBe('es');
 const bad=JSON.parse(raw);bad.recording.videoInfo.language='xx';expect(decodeSettings(JSON.stringify(bad))).toBeNull();
 await page.reload();await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'language.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await expect(page.locator('#video-caption-language input[value=es]')).toBeChecked();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 delete bad.recording.videoInfo.language;await page.locator('#json-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.locator('#video-caption-language input[value=en]')).toBeChecked();
});
for(const theme of ['dark','light'])test(`captions use tool typography and palette with localized provenance in ${theme} theme`,async({page})=>{
 await page.goto('/de/');
 const result=await page.evaluate(async theme=>{
  document.documentElement.dataset.theme=theme;document.documentElement.dataset.style='technical';
  const path='/src/lib/video-info.ts',{paintVideoInfo,defaultVideoInfo}=await import(path);
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;const ctx=canvas.getContext('2d')!;
  const texts:any[]=[];ctx.fillText=(text,x,y)=>{texts.push({text,x,y,font:ctx.font,color:ctx.fillStyle,stroke:ctx.strokeStyle});};
  paintVideoInfo(ctx,{...defaultVideoInfo,enabled:true,title:'A session',language:'fr'},{style:'Classique',tempo:'',section:'',signature:'Créé avec JackTools Sound'});
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();const accent=ctx.fillStyle;
  return {texts,accent};
 },theme);
 expect(result.texts[0].font).toContain('monospace');expect(result.texts[0].color).toBe(result.accent);
 expect(result.texts.map(t=>t.text)).toContain(videoInfoCopy.fr.randomNotice);expect(result.texts.map(t=>t.text)).toContain(videoInfoCopy.fr.syntheticNotice);
 expect(result.texts[2].y).toBeGreaterThan(980);
});
for(const lang of ['en','de','es','fr'] as const)test(`actual MP4 includes translated provenance and matching style/credit in ${lang}`,async({page})=>{
 await page.addInitScript(()=>{
  const fill=CanvasRenderingContext2D.prototype.fillText;(window as any).texts=[];
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(this.canvas.width===720&&this.canvas.height===1280)(window as any).texts.push(text);return fill.call(this,text,x,y,...rest);};
 });
 await page.goto('/de/');await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=music]').click();await page.locator('[data-style-preset=classical]').click();await page.locator('#animation-settings-close').click();await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#video-info-enabled').check();await page.locator('#video-caption-language input[value='+lang+']').check();await page.locator('#video-format input[value=portrait]').check();
 await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await expect.poll(async()=>page.evaluate(text=>(window as any).texts.includes(text),videoInfoCopy[lang].syntheticNotice)).toBe(true);
 const texts=await page.evaluate(()=>(window as any).texts as string[]);
 expect(texts).toContain(videoInfoCopy[lang].randomNotice);expect(texts).toContain(videoInfoCopy[lang].credit);
 const styles={en:'Classical',de:'Klassik',es:'Clásica',fr:'Classique'};expect(texts).toContain(styles[lang]);
 await page.waitForTimeout(600);const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
});
