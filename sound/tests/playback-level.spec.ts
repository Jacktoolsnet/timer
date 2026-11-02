import {test,expect} from '@playwright/test';
import {balancedMix,mixLevels,performanceVelocity} from '../src/lib/mixing';
import {sectionGain} from '../src/lib/song';
const track=(volume=.5,slots=16)=>({instrument:'marimba',enabled:true,mute:false,volume,slots,points:Array.from({length:16},(_,s)=>s<slots&&s%2===0)});
const power=(tracks:ReturnType<typeof track>[],levels:number[])=>tracks.reduce((sum,t,i)=>sum+(t.enabled&&!t.mute?t.volume**2*t.points.slice(0,t.slots).filter(Boolean).length/t.slots*levels[i]**2:0),0);

test('section and automatic mix reductions redistribute prominence without a mode-wide power loss',()=>{
 const tracks=[track(.8),track(.4,12),track(.2,8)],normal=balancedMix(tracks,[1,1,1]);
 for(const part of ['intro','verse','chorus','bridge'] as const){
  const raw=mixLevels(tracks,{start:0,lead:0,previousLead:0,rest:-1,variation:1},0,0,[]).map(g=>g*sectionGain(part,'marimba',0));
  const balanced=balancedMix(tracks,raw);expect(power(tracks,balanced)).toBeCloseTo(power(tracks,normal),10);expect(balanced[0]/balanced[1]).toBeCloseTo(raw[0]/raw[1],10);
 }
});
test('one audible voice keeps unity regardless of intro, accompaniment or protected rhythm attenuation',()=>{
 for(const gain of [.04,.12,.3,.36,.65,.9,1])expect(balancedMix([track()],[gain])[0]).toBeCloseTo(1,12);
 const tracks=[track(.8),track(.4),track(.2)];tracks[0].mute=true;tracks[1].enabled=false;
 expect(balancedMix(tracks,[.01,.2,.07]).slice(0,2)).toEqual([0,0]);expect(balancedMix(tracks,[.01,.2,.07])[2]).toBeCloseTo(1,12);tracks[2].points.fill(false);expect(balancedMix(tracks,[1,1,1])).toEqual([0,0,0]);
 expect(balancedMix([track(0)],[.1])).toEqual([0]);expect(balancedMix([track()],[0])).toEqual([0]);
});
test('the balance respects master-independent user volume and note density, and automatic touches are centered on unity',()=>{
 const tracks=[track(.8,16),track(.2,4)],raw=[.3,.8],balanced=balancedMix(tracks,raw);
 const quieter=tracks.map(t=>({...t,volume:t.volume*.25}));expect(balancedMix(quieter,raw)).toEqual(balanced);expect(power(quieter,balanced)).toBeCloseTo(power(tracks,balanced)/16);
 expect(performanceVelocity(1,()=>.5)).toBe(1);expect(performanceVelocity(1,()=>0)).toBe(.94);expect(performanceVelocity(1,()=>.999)).toBe(1.06);
 const targets=Array.from({length:1000},(_,i)=>performanceVelocity(1,()=>i/999));expect(targets.reduce((a,b)=>a+b)/targets.length).toBeCloseTo(1,8);
});

for(const ensemble of [false,true])test('actual output reference matches both play buttons: '+(ensemble?'default ensemble':'solo part'),async({page})=>{
 await page.addInitScript(()=>{
  Math.random=()=>.5;const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(...args:any[]){
   const result=(connect as any).apply(this,args);
   if(args[0] instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();analyser.fftSize=2048;(connect as any).call(this,analyser);(window as any).__output=analyser;}
   return result;
  };
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');if(!ensemble)await page.locator('#clear').click();
 if(!ensemble)await page.evaluate(()=>document.querySelectorAll<HTMLInputElement>('.track-enabled').forEach((el,i)=>{el.checked=i===0;el.dispatchEvent(new Event('change'));}));
 const row=page.locator('[data-track="0"]');await row.locator('summary').click();if(!ensemble)await row.locator('.instrument-select').selectOption('marimba',{force:true});await row.locator('.track-grid').selectOption('16',{force:true});
 if(!ensemble)for(const s of [0,4,8,12])await row.locator(`[data-step="${s}"]`).click();
 if(ensemble)await page.evaluate(()=>document.querySelectorAll<HTMLSelectElement>('.track-grid').forEach(el=>{el.value='16';el.dispatchEvent(new Event('change'));}));
 await page.locator('#tempo').fill('120');await page.locator('#tempo').dispatchEvent('input');
 const levels=[];
 for(const button of ['#play','#evolve']){
  await page.locator(button).click();await page.waitForTimeout(200);
  levels.push(await page.evaluate(async()=>{
   const a=(window as any).__output as AnalyserNode,data=new Float32Array(a.fftSize);let sum=0,count=0;
   for(let n=0;n<50;n++){a.getFloatTimeDomainData(data);for(const value of data){sum+=value*value;count++;}await new Promise(resolve=>setTimeout(resolve,30));}
   return Math.sqrt(sum/count);
  }));await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.locator('#play').click();await page.waitForTimeout(500);
 }
 expect(levels[0]).toBeGreaterThan(.001);expect(Math.abs(20*Math.log10(levels[1]/levels[0])),JSON.stringify(levels)).toBeLessThan(ensemble?2:1);
 await expect(page.locator('#volume')).toHaveValue('0.3');expect(errors).toEqual([]);
});

test('switching a held pad between normal and random does not retain a quiet intro envelope',async({page})=>{
 const gains:number[]=[];await page.addInitScript(()=>{
  Math.random=()=>.5;(window as any).__faders=[];
  const set=AudioParam.prototype.setTargetAtTime;AudioParam.prototype.setTargetAtTime=function(value:number,...args:any[]){(window as any).__faders.push(value);return (set as any).call(this,value,...args);};
 });await page.goto('/de/');await page.locator('#clear').click();await page.evaluate(()=>document.querySelectorAll<HTMLInputElement>('.track-enabled').forEach((el,i)=>{el.checked=i===0;el.dispatchEvent(new Event('change'));}));
 const row=page.locator('[data-track="0"]');await row.locator('summary').click();await row.locator('.instrument-select').selectOption('pad',{force:true});await row.locator('.track-grid').selectOption('16',{force:true});for(const s of [0,8])await row.locator(`[data-step="${s}"]`).click();
 await page.locator('#play').click();await page.waitForTimeout(400);await page.evaluate(()=>(window as any).__faders=[]);await page.locator('#evolve').click();await page.waitForTimeout(400);
 gains.push(...await page.evaluate(()=>(window as any).__faders.filter((n:number)=>n>=0&&n<=2)));expect(gains).toContain(1);expect(gains.some(n=>n>0&&n<.99)).toBe(false);
 await page.locator('#evolve').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.locator('#play').click();
});
