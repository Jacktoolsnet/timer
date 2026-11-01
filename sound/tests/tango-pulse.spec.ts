import {test,expect} from '@playwright/test';
import {tangoBassSteps,tangoChordSteps,tangoPulseRole,tangoPulseDuration,tangoPulseWave,dancePulseClarity} from '../src/lib/tango';
import {waltzPulseDuration} from '../src/lib/waltz';
import {dances} from '../src/lib/dances';

test('tango has a clear marcato bass and dotted chord pattern, not a cloud of long notes',()=>{
 expect(dances.tango.preset.parts[0].steps).toEqual([0,4,8,12]);
 expect(dances.tango.preset.parts[1].steps).toEqual([0,6,8,12]);
 expect(tangoPulseRole('tango',0,'doublebass')).toBe('bass');expect(tangoPulseRole('tango',1,'piano')).toBe('chord');
 expect(tangoPulseRole('tango',6,'piano')).toBeNull();expect(tangoPulseRole('discofox',1,'piano')).toBeNull();expect(tangoPulseRole('tango',1,'strings')).toBeNull();
 for(const step of tangoChordSteps){
  const wave=tangoPulseWave('piano','chord',0,3,0,128,step,22050,.4);
  expect(wave.every(Number.isFinite)).toBe(true);expect(wave.length/22050).toBeLessThan(.23);
  expect(wave[0]).toBe(0);expect(Math.abs(wave.at(-1)!)).toBeLessThan(.00001);
 }
 expect(tangoPulseDuration('chord',128,6)).toBeLessThan(tangoPulseDuration('chord',128,0));
 for(const step of tangoBassSteps)expect(tangoPulseDuration('bass',128,step)).toBeLessThan(60/128*.5);
});

test('Viennese pulse is shorter and accompaniment yields at attacks without changing user ceilings',()=>{
 for(const role of ['bass','chord'] as const)expect(waltzPulseDuration(role,180,true)).toBeLessThan(waltzPulseDuration(role,180));
 expect(dances.viennese.preset.parts[0].volume).toBeGreaterThan(dances.slowwaltz.preset.parts[0].volume!);
 for(const dance of ['tango','viennese',null])for(let i=0;i<8;i++)for(let step=0;step<16;step++){
  const gain=dancePulseClarity(dance,i,step);expect(gain).toBeGreaterThan(0);expect(gain).toBeLessThanOrEqual(1);
  if(i<4||!dance)expect(gain).toBe(1);
 }
 expect(dancePulseClarity('viennese',4,0)).toBeLessThan(dancePulseClarity('viennese',4,3));
});

test('rendered tango chord attacks retain distinct gaps and a short pickup',async({page})=>{
 await page.goto('/de/');
 const metrics=await page.evaluate(async()=>{
  const url='/src/lib/tango.ts',module=await import(url),sr=22050,bpm=128,step=60/bpm/4;
  const ctx=new OfflineAudioContext(1,Math.ceil(sr*step*16),sr);
  for(const s of module.tangoChordSteps){
   const samples=module.tangoPulseWave('piano','chord',0,3,0,bpm,s,sr,.4),buffer=ctx.createBuffer(1,samples.length,sr);
   buffer.getChannelData(0).set(samples);const source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);source.start(s*step);
  }
  const data=(await ctx.startRendering()).getChannelData(0),rms=(start:number,end:number)=>{
   let sum=0;for(let i=Math.floor(start*sr);i<Math.floor(end*sr);i++)sum+=data[i]**2;return Math.sqrt(sum/((end-start)*sr));
  };
  return {attacks:module.tangoChordSteps.map((s:number)=>rms(s*step+.012,s*step+.06)),gaps:module.tangoChordSteps.map((s:number)=>rms(s*step+.205,s*step+.225))};
 });
 for(const attack of metrics.attacks)expect(attack).toBeGreaterThan(.025);for(const gap of metrics.gaps)expect(gap).toBeLessThan(.00001);
});

test('actual tango accompaniment keeps the new rhythm in normal and random play',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).pulseEvents=[];const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(when=0,...args:any[]){(window as any).pulseEvents.push({time:when,duration:this.buffer?.duration||0});return start.call(this,when,...args);};
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await page.locator('[data-dance=tango]').click();
 for(let i=0;i<8;i++){const row=page.locator('[data-track="'+i+'"]');await row.locator('summary').click();await row.locator('.mute').check();}
 for(const index of [0,1]){
  const row=page.locator('[data-track="'+index+'"]');await row.locator('.mute').uncheck();
  for(const button of ['#play','#evolve']){
   await page.evaluate(()=>(window as any).pulseEvents=[]);await page.locator(button).click();
   await expect.poll(()=>page.evaluate(()=>(window as any).pulseEvents.length),{timeout:4000}).toBeGreaterThanOrEqual(4);
   const events=await page.evaluate(()=>(window as any).pulseEvents.slice(0,4)),steps=index===0?tangoBassSteps:tangoChordSteps;
   for(let i=0;i<4;i++){
    expect(events[i].time-events[0].time).toBeCloseTo(steps[i]*60/128/4,3);
    expect(events[i].duration).toBeCloseTo(tangoPulseDuration(index===0?'bass':'chord',128,steps[i]),3);
   }
   await page.locator('#play').click();
  }
  await row.locator('.mute').check();
 }
 expect(errors).toEqual([]);
});

test('actual Viennese playback uses the crisper bass and chord envelopes',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).pulseEvents=[];const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(when=0,...args:any[]){(window as any).pulseEvents.push({time:when,duration:this.buffer?.duration||0});return start.call(this,when,...args);};
 });
 await page.goto('/de/');await page.locator('[data-dance=viennese]').click();
 for(let i=2;i<8;i++){const row=page.locator('[data-track="'+i+'"]');await row.locator('summary').click();await row.locator('.mute').check();}
 await page.locator('#play').click();await expect.poll(()=>page.evaluate(()=>(window as any).pulseEvents.length)).toBeGreaterThanOrEqual(3);
 const events=await page.evaluate(()=>(window as any).pulseEvents.slice(0,3));
 expect(events[0].duration).toBeCloseTo(waltzPulseDuration('bass',180,true),3);expect(events[1].duration).toBeCloseTo(waltzPulseDuration('chord',180,true),3);
 expect(events[1].time-events[0].time).toBeCloseTo(1/3,3);expect(events[2].time-events[1].time).toBeCloseTo(1/3,3);await page.locator('#play').click();
});
