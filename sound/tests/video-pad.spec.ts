import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {videoPadLayout,videoDimensions} from '../src/lib/video-export';
import {defaultVideoInfo,videoTopInfoHeight} from '../src/lib/video-info';
import {paintVideoPad,videoPadCopy,type VideoPadTrack} from '../src/lib/video-pad';
import {decodeSettings} from '../src/lib/sound-settings';
const content={style:'House',tempo:'120 BPM',section:'Chorus',signature:'Created with JackTools Sound'};
test('both video orientations retain complete separated squares below all captions',()=>{
 for(const format of ['landscape','portrait'] as const)for(const enabled of [false,true]){
  const {width,height}=videoDimensions(format),header=videoTopInfoHeight({...defaultVideoInfo,enabled,title:'Session',section:true,tempo:true},content,height>width);
  const layout=videoPadLayout(width,height,header);
  for(const rect of [layout.orbit,layout.pad]){
   expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.y).toBeGreaterThanOrEqual(header);
   expect(rect.x+rect.size).toBeLessThanOrEqual(width);expect(rect.y+rect.size).toBeLessThanOrEqual(height);
  }
  if(format==='portrait')expect(layout.pad.y).toBeGreaterThan(layout.orbit.y+layout.orbit.size);
  else expect(layout.pad.x).toBeGreaterThan(layout.orbit.x+layout.orbit.size);
 }
});
test('pad visuals are read-only and actual audible onsets control tap rings',()=>{
 const track:VideoPadTrack={index:0,name:'Kick',color:'#55ccff',muted:false,pitched:false,position:.2,score:[{start:.2,duration:.1,points:[{offset:0,pitch:12,velocity:.8}]}],hits:[{age:.2,pitch:12,degree:3,position:.2,level:.8}]};
 const before=JSON.stringify(track);
 const draw=(tr:VideoPadTrack)=>{let circles=0;const ctx={save(){},restore(){},clearRect(){},beginPath(){},roundRect(){},rect(){},clip(){},fill(){},stroke(){},fillText(){},moveTo(){},lineTo(){},arc(){circles++;}} as unknown as CanvasRenderingContext2D;paintVideoPad(ctx,'tap',[tr],null,true,false);return circles;};
 expect(draw(track)).toBe(2);expect(draw({...track,muted:true})).toBe(0);expect(draw({...track,hits:[]})).toBe(0);expect(JSON.stringify(track)).toBe(before);
});
async function exported(page:Page){
 const download=page.waitForEvent('download');await page.locator('#json-export').click();return JSON.parse(await readFile((await(await download).path())!,'utf8'));
}
for(const lang of ['de','en','es','fr'] as const)test('video-pad options are localized, optional, persistent and validate legacy files: '+lang,async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/'+lang+'/');await page.locator('#files-open').click();
 await expect(page.locator('#video-pad input[value=none]')).toBeChecked();await expect(page.locator('#video-pad legend')).toHaveText(videoPadCopy[lang].label);
 for(const mode of ['none','tap','notes'] as const)await expect(page.locator('#video-pad label').filter({has:page.locator('input[value='+mode+']')})).toHaveText(videoPadCopy[lang][mode]);
 await expect(page.locator('#video-pad > p')).toHaveText(videoPadCopy[lang].hint);
 await page.locator('#video-pad label').filter({hasText:videoPadCopy[lang].tap}).click();await expect(page.locator('#video-pad input[value=tap]')).toBeChecked();
 await page.locator('#video-pad label').filter({hasText:videoPadCopy[lang].notes}).click();
 const data=await exported(page);expect(data.recording.videoPad).toBe('notes');expect(decodeSettings(JSON.stringify(data))!.recording!.videoPad).toBe('notes');
 const legacy=structuredClone(data);delete legacy.recording.videoPad;expect(decodeSettings(JSON.stringify(legacy))).not.toBeNull();
 const invalid=structuredClone(data);invalid.recording.videoPad='unknown';expect(decodeSettings(JSON.stringify(invalid))).toBeNull();
 await page.locator('#json-file').setInputFiles({name:'pads.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await expect(page.locator('#video-pad input[value=notes]')).toBeChecked();
 expect(await page.locator('#files-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});
for(const mode of ['tap','notes'] as const)test('native MP4 includes '+mode+' canvas and audio, with every caption above the orbit',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).padDraws=0;(window as any).padCircles=0;(window as any).videoOrbitTop=Infinity;(window as any).videoTextBottom=0;
  const draw=CanvasRenderingContext2D.prototype.drawImage,text=CanvasRenderingContext2D.prototype.fillText,arc=CanvasRenderingContext2D.prototype.arc;
  CanvasRenderingContext2D.prototype.drawImage=function(source:any,...args:any[]){
   if(this.canvas.width===720&&this.canvas.height===1280){
    if(source instanceof HTMLCanvasElement&&source.dataset.videoPad)(window as any).padDraws++;
    if(source instanceof HTMLCanvasElement&&source.id==='orbit')(window as any).videoOrbitTop=args[1];
   }
   return (draw as any).call(this,source,...args);
  };
  CanvasRenderingContext2D.prototype.fillText=function(value,x,y,...args){if(this.canvas.width===720&&this.canvas.height===1280)(window as any).videoTextBottom=Math.max((window as any).videoTextBottom,y);return text.call(this,value,x,y,...args);};
  CanvasRenderingContext2D.prototype.arc=function(...args:any[]){if(this.canvas.dataset.videoPad)(window as any).padCircles++;return (arc as any).apply(this,args);};
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await page.locator('#files-open').click();
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#video-format input[value=portrait]').check();await page.locator('#video-pad input[value='+mode+']').check();
 await page.locator('#video-info-enabled').check();await page.locator('#video-info-tempo').check();await page.locator('#video-info-section').check();
 await page.locator('#recording-restart').check();await page.locator('#video-record').click();
 if(mode==='notes'){await page.locator('[data-pad-mode=notes]').click();await page.locator('[data-score-track="4"]').first().click();await expect(page.locator('#score-expanded-dialog')).toBeVisible();}
 await page.waitForTimeout(1500);
 await expect.poll(()=>page.evaluate(()=>(window as any).padDraws)).toBeGreaterThan(0);await expect.poll(()=>page.evaluate(()=>(window as any).padCircles)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>(window as any).videoTextBottom<(window as any).videoOrbitTop)).toBe(true);
 if(mode==='notes'){await page.keyboard.press('Escape');await expect(page.locator('#score-expanded-dialog')).toBeHidden();}
 await page.locator('#files-open').click();await expect(page.locator('#video-pad input').first()).toBeDisabled();await page.locator('#files-close').click();
 const download=page.waitForEvent('download');await page.locator('#video-stop').click();const bytes=await readFile((await(await download).path())!);
 expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.includes(Buffer.from('vide'))).toBe(true);expect(bytes.includes(Buffer.from('soun'))).toBe(true);expect(errors).toEqual([]);
});
