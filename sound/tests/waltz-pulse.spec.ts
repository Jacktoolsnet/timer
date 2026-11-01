import {test,expect} from '@playwright/test';
import {waltzPulseRole,waltzVoicing,waltzPulseDuration,waltzPulseWave} from '../src/lib/waltz';
import {presets} from '../src/lib/presets';
import {dances} from '../src/lib/dances';
const points=(steps:number[])=>Array.from({length:16},(_,s)=>steps.includes(s));
test('waltz accompaniment separates a bass downbeat from two real close-position chords',()=>{
 expect(waltzPulseRole(3,'doublebass',points([0]))).toBe('bass');
 expect(waltzPulseRole(3,'piano',points([4,8]))).toBe('chord');
 expect(waltzPulseRole(4,'piano',points([4,8]))).toBeNull();
 expect(waltzPulseRole(3,'piano',points([0,6,10]))).toBeNull();
 expect(waltzPulseRole(3,'strings',points([0,4,8]))).toBeNull();
 for(const preset of [presets.slowwaltz,dances.viennese.preset]){
  expect(preset.parts[0].steps).toEqual([0]);
  for(const p of preset.parts.slice(1,4))expect(p.steps).toEqual([4,8]);
 }
 const triad=waltzVoicing('chord',0,4,0,'piano');expect(triad).toHaveLength(3);
 expect(triad[1].frequency/triad[0].frequency).toBeCloseTo(2**(4/12));expect(triad[2].frequency/triad[0].frequency).toBeCloseTo(2**(7/12));
 expect(waltzVoicing('chord',0,3,12,'piano')[0].frequency).toBeCloseTo(triad[0].frequency*2);
 for(const bpm of [40,86,180,220])for(const role of ['bass','chord'] as const)expect(waltzPulseDuration(role,bpm)).toBeLessThan(60/bpm*.6);
 for(const id of ['piano','guitar','harp'] as const){
  const data=waltzPulseWave(id,'chord',0,4,0,86,22050,.4);
  expect(data.every(Number.isFinite)).toBe(true);expect(data[0]).toBe(0);expect(Math.abs(data.at(-1)!)).toBeLessThan(.00001);
 }
});

test('rendered bass and chord strokes leave audible space between all three beats',async({page})=>{
 await page.goto('/de/');
 const metrics=await page.evaluate(async()=>{
  const url='/src/lib/waltz.ts';
  const {waltzPulseWave}=await import(url);
  const results=[];
  for(const bpm of [86,180]){
   const sr=22050,beat=60/bpm,ctx=new OfflineAudioContext(1,Math.ceil(sr*beat*6),sr);
   for(let s=0;s<6;s++){
    const bass=s%3===0,samples=waltzPulseWave(bass?'doublebass':'piano',bass?'bass':'chord',0,4,0,bpm,sr,.4);
    const buffer=ctx.createBuffer(1,samples.length,sr);buffer.getChannelData(0).set(samples);
    const source=ctx.createBufferSource(),gain=ctx.createGain();gain.gain.value=bass?.62:.5;
    source.buffer=buffer;source.connect(gain);gain.connect(ctx.destination);source.start(s*beat);
   }
   const data=(await ctx.startRendering()).getChannelData(0),rms=(a:number,b:number)=>{
    let sum=0;const start=Math.floor(a*sr),end=Math.floor(b*sr);for(let i=start;i<end;i++)sum+=data[i]**2;return Math.sqrt(sum/(end-start));
   };
   results.push({bpm,attacks:Array.from({length:6},(_,s)=>rms(s*beat+.015,s*beat+.06)),gaps:Array.from({length:6},(_,s)=>rms((s+.75)*beat,(s+.95)*beat))});
  }
  return results;
 });
 for(const result of metrics){for(const attack of result.attacks)expect(attack).toBeGreaterThan(.025);for(const gap of result.gaps)expect(gap).toBeLessThan(.00001);}
});

test('actual playback schedules short ONE-two-three buffers in normal and random play',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).pulseEvents=[];
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(when=0,...args:any[]){
   (window as any).pulseEvents.push({time:when,duration:this.buffer?.duration||0});
   return start.call(this,when,...args);
  };
 });
 await page.goto('/de/');await page.locator('[data-dance=slowwaltz]').click();
 for(let i=2;i<8;i++){const row=page.locator('[data-track="'+i+'"]');await row.locator('summary').click();await row.locator('.mute').check();}
 for(const button of ['#play','#evolve']){
  await page.evaluate(()=>(window as any).pulseEvents=[]);await page.locator(button).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).pulseEvents.length),{timeout:4000}).toBeGreaterThanOrEqual(3);
  const events=await page.evaluate(()=>(window as any).pulseEvents.slice(0,3)),beat=60/86;
  expect(events[1].time-events[0].time).toBeCloseTo(beat,3);expect(events[2].time-events[1].time).toBeCloseTo(beat,3);
  expect(events[0].duration).toBeCloseTo(waltzPulseDuration('bass',86),3);
  expect(events[1].duration).toBeCloseTo(waltzPulseDuration('chord',86),3);expect(events[2].duration).toBeCloseTo(events[1].duration,4);
  await page.locator('#play').click();
 }
});
