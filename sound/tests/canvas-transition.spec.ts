import {test,expect} from '@playwright/test';
import {visualFadeProgress,visualFadeDuration} from '../src/lib/canvas-transition';
import {chooseAnimation} from './animation-helpers';

test('visual crossfades ease smoothly and reduced motion opts out',()=>{
 expect(visualFadeProgress(0)).toBe(0);expect(visualFadeProgress(visualFadeDuration/2)).toBe(.5);
 expect(visualFadeProgress(visualFadeDuration)).toBe(1);expect(visualFadeProgress(-1)).toBe(0);
 expect(visualFadeProgress(10,true)).toBe(1);
});

test('canvas crossfade blends actual pixels, handles interruptions and preserves opacity',async({page})=>{
 await page.goto('/de/');
 const result=await page.evaluate(async()=>{
  const path='/src/lib/canvas-transition.ts';const {CanvasTransition}=await import(path);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=8;
  const ctx=canvas.getContext('2d')!,fade=new CanvasTransition();
  const paint=(color:string)=>{ctx.clearRect(0,0,8,8);ctx.fillStyle=color;ctx.fillRect(0,0,8,8);};
  const pixel=()=>Array.from(ctx.getImageData(4,4,1,1).data);
  fade.begin(ctx,'red',0,false);paint('#ff0000');fade.finish(ctx,0,false);
  fade.begin(ctx,'blue',100,false);paint('#0000ff');fade.finish(ctx,100,false);const first=pixel();
  paint('#0000ff');fade.finish(ctx,650,false);const middle=pixel();
  fade.begin(ctx,'green',650,false);paint('#00ff00');fade.finish(ctx,650,false);const interrupted=pixel();
  paint('#00ff00');fade.finish(ctx,1750,false);const final=pixel();
  fade.begin(ctx,'white',1800,true);paint('#ffffff');fade.finish(ctx,1800,true);const reduced=pixel();
  return {first,middle,interrupted,final,reduced};
 });
 expect(result.first).toEqual([255,0,0,255]);expect(result.middle[0]).toBeCloseTo(128,-1);expect(result.middle[2]).toBeCloseTo(128,-1);expect(result.middle[3]).toBe(255);
 expect(result.interrupted).toEqual(result.middle);expect(result.final).toEqual([0,255,0,255]);expect(result.reduced).toEqual([255,255,255,255]);
});

test('manual visual changes use canvas transitions, including backgrounds fading off',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).visualSnapshots=0;const draw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(source:any,...args:any[]){
   if(source instanceof HTMLCanvasElement&&['orbit','sound-atmosphere'].includes(source.id)&&!this.canvas.id)(window as any).visualSnapshots++;
   return (draw as any).call(this,source,...args);
  };
 });
 await page.goto('/de/');await page.waitForTimeout(100);
 await chooseAnimation(page,'button[data-visualization=constellation]');
 await expect.poll(()=>page.evaluate(()=>(window as any).visualSnapshots)).toBeGreaterThan(0);
 await chooseAnimation(page,'button[data-background-mode=off]');await expect(page.locator('#sound-atmosphere')).toBeHidden();
});
