import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {deltaPoint,deltaSplit,deltaBranch,deltaSeaLevel,paintRiverDelta} from '../src/lib/river-delta';
import {LandscapeHistory,landscapeWindow} from '../src/lib/landscape';
import {partsForStyle} from '../src/lib/presets';
import {decodeSettings} from '../src/lib/sound-settings';
import {animationSettingsCopy} from '../src/lib/animation-settings';
import {landscapeVariantCopy} from '../src/lib/visualization';
import {chooseAnimation} from './animation-helpers';

test('rivers split continuously and bounded branches travel downstream without random state',()=>{
 for(let count=1;count<=9;count++)for(let rank=0;rank<count;rank++){
  expect(deltaPoint(rank,count,deltaSplit,12,-1)).toEqual(deltaPoint(rank,count,deltaSplit,12,1));
  expect(deltaPoint(rank,count,1,12,-1).y).toBeLessThan(deltaPoint(rank,count,1,12,1).y);
  for(const branch of [-1,0,1])for(let k=0;k<=20;k++){
   const point=deltaPoint(rank,count,k/20,48,branch,3);
   expect(point.x).toBeGreaterThanOrEqual(230);expect(point.x).toBeLessThanOrEqual(650);
   expect(point.y).toBeGreaterThan(70);expect(point.y).toBeLessThan(630);
  }
 }
 expect(deltaPoint(0,9,0).x).toBeGreaterThan(deltaPoint(0,9,1).x);
 expect(deltaBranch(0,7,1)).toBe(deltaBranch(0,7,1));
 for(let i=0;i<100;i++)expect([-1,0,1]).toContain(deltaBranch(i%9,i%24,i/10));
});
test('the sea receives only already-performed envelopes after the tempo-based journey',()=>{
 const h=new LandscapeHistory();h.record(0,{at:1,pitch:0,level:.2,length:2,glide:true,curve:[{offset:0,pitch:0,level:.2},{offset:1,pitch:12,level:1}]});
 expect(deltaSeaLevel(h,0,3.9,3)).toBe(0);expect(deltaSeaLevel(h,0,4.5,3)).toBeCloseTo(.6);
 h.release(0,1.5);expect(deltaSeaLevel(h,0,5.5,3)).toBeLessThan(.01);
 expect(landscapeWindow(80,4)).toBeGreaterThan(landscapeWindow(160,4));
});
test('tracers and arrival ripples honour onset timing, mute, volume, glow and reduced motion',()=>{
 const h=new LandscapeHistory();h.record(0,{at:1,pitch:7,level:.8,length:1});
 function draw(time:number,{volume=1,master=1,effect=1,mute=false,reduced=false,playing=true}={}){
  let lights=0,ripples=0;const gradient={addColorStop(){}};
  const ctx={save(){},restore(){},translate(){},scale(){},clip(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},fill(){},stroke(){},fillText(){},
   createLinearGradient(){return gradient;},createRadialGradient(){return gradient;},
   arc(x:number){if(x>200)lights++;},ellipse(x:number){if(x!==159)ripples++;}} as unknown as CanvasRenderingContext2D;
  paintRiverDelta(ctx,h,[{index:0,label:'7',color:'#55ccff',volume,mute,pitched:true}],time,160,4,true,playing,reduced,master,effect);
  return {lights,ripples};
 }
 expect(draw(.9).lights).toBe(0);expect(draw(1.2).lights).toBe(1);
 expect(draw(3.9).ripples).toBe(0);expect(draw(4.2).ripples).toBe(1);
 for(const options of [{mute:true},{volume:0},{master:0},{effect:0},{playing:false},{reduced:true}])expect(draw(4.2,options)).toEqual({lights:0,ripples:0});
});
function fixture(){return {version:2,visualization:'landscape',landscapeVariant:'delta',style:'pop',bpm:160,volume:.3,center:'ring',background:'off',orbit:'comet',tracks:partsForStyle('pop').map(p=>({enabled:true,mute:false,instrument:p.instrument,points:Array.from({length:16},(_,s)=>p.steps.includes(s)),grid:16,slots:16,pitch:p.pitch??0,volume:.5,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};}
async function load(page:Page,data:unknown){await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'delta.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();}
async function exported(page:Page){await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();const data=JSON.parse(await readFile((await(await pending).path())!,'utf8'));await page.locator('#files-close').click();return data;}

test('delta validates, retains music and persists independently of visualization without autoplay',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const f=fixture();
 expect(decodeSettings(JSON.stringify(f))?.landscapeVariant).toBe('delta');expect(decodeSettings(JSON.stringify({...f,landscapeVariant:'unknown'}))).toBeNull();
 await page.goto('/de/');await load(page,f);await expect(page.locator('#orbit')).toHaveAttribute('data-landscape-variant','delta');
 const before=await exported(page);await page.locator('#play').click();
 await chooseAnimation(page,'button[data-landscape-variant=rivers]');await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','landscape');
 await chooseAnimation(page,'button[data-landscape-variant=delta]');
 await chooseAnimation(page,'button[data-visualization=orbit]');await chooseAnimation(page,'button[data-visualization=landscape]');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#orbit')).toHaveAttribute('data-landscape-variant','delta');
 const after=await exported(page);for(const key of ['tracks','style','bpm','volume','center','orbit'])expect(after[key]).toEqual(before[key]);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('#orbit')).toHaveAttribute('data-landscape-variant','delta');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 const {landscapeVariant,...legacy}=f;await load(page,legacy);await expect(page.locator('#orbit')).toHaveAttribute('data-landscape-variant','rivers');expect(errors).toEqual([]);
});
for(const lang of ['de','en','es','fr'] as const)test('inline landscape gear and localized variants fit mobile: '+lang,async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/'+lang+'/');
 await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=sound]').click();
 await expect(page.locator('#landscape-settings-open')).toHaveAccessibleName(animationSettingsCopy[lang].landscape);
 await page.locator('#landscape-settings-open').click();await expect(page.locator('button[data-landscape-variant]:visible')).toHaveCount(2);
 await expect(page.locator('button[data-landscape-variant=delta]')).toContainText(landscapeVariantCopy[lang].delta);
 await page.locator('button[data-landscape-variant=delta]').click();await expect(page.locator('#orbit')).toHaveAttribute('aria-label',landscapeVariantCopy[lang].description);
 expect(await page.locator('#animation-settings').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.locator('#animation-settings-back').click();await expect(page.locator('[data-animation-panel=sound]')).toBeVisible();
 await page.locator('#animation-settings-close').click();await page.locator('#palette-dropdown summary').click();await page.locator('#theme-light').click();await page.locator('#preferences-close').click();
 await page.locator('#focus').click();await page.locator('#hide-focus-controls').click();await expect(page.locator('#orbit')).toBeVisible();await expect(page.locator('#orbit')).toHaveAttribute('data-landscape-variant','delta');
});
test('MP4 uses the delta canvas and its travelling notes with the original audio',async({page})=>{
 test.setTimeout(45000);
 await page.addInitScript(()=>{
  (window as any).deltaLabels=[];const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){if(this.canvas.id==='orbit'&&x===672)(window as any).deltaLabels.push(text);return fill.call(this,text,x,y,...args);};
 });
 await page.goto('/de/');await load(page,fixture());await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#video-record').click();await page.waitForTimeout(1400);const download=page.waitForEvent('download');await page.locator('#video-stop').click();
 const bytes=await readFile((await(await download).path())!);expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.includes(Buffer.from('vide'))).toBe(true);expect(bytes.includes(Buffer.from('soun'))).toBe(true);
 expect(await page.evaluate(()=>new Set((window as any).deltaLabels).size)).toBe(9);
});

test('the shared sea retains visible coloured water beyond the river mouths in both themes',async({page})=>{
 await page.goto('/de/');await load(page,fixture());await page.locator('#play').click();await page.waitForTimeout(3400);
 const colouredWater=()=>page.locator('#orbit').evaluate((canvas:HTMLCanvasElement)=>{
  const pixels=canvas.getContext('2d')!.getImageData(45,140,145,420).data;let warm=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>10&&pixels[i]>pixels[i+2]*1.2&&pixels[i]>80)warm++;
  return warm;
 });
 await expect.poll(colouredWater).toBeGreaterThan(30);
 await page.locator('#palette-dropdown summary').click();await page.locator('#theme-light').click();await page.locator('#preferences-close').click();
 await expect.poll(colouredWater).toBeGreaterThan(30);
});
