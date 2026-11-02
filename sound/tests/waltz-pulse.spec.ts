import {test,expect} from '@playwright/test';
import {waltzPulseRole,waltzVoicing,waltzPulseDuration,waltzPulseWave,slowWaltzSwell,slowWaltzMix} from '../src/lib/waltz';
import {presets} from '../src/lib/presets';
import {dances} from '../src/lib/dances';
import {balancedMix} from '../src/lib/mixing';
import {sectionGain} from '../src/lib/song';
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
 await page.goto('/de/');await page.locator('[data-style-preset=slowwaltz]').click();
 for(let i=2;i<9;i++){const row=page.locator('[data-track="'+i+'"]');await row.locator('summary').click();await row.locator('.mute').check();}
 for(const button of ['#play','#evolve']){
  await page.evaluate(()=>(window as any).pulseEvents=[]);await page.locator(button).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).pulseEvents.length),{timeout:4000}).toBeGreaterThanOrEqual(3);
  const events=await page.evaluate(()=>(window as any).pulseEvents.slice(0,3)),beat=60/86;
  expect(events[1].time-events[0].time).toBeCloseTo(beat,3);expect(events[2].time-events[1].time).toBeCloseTo(beat,3);
  expect(events[0].duration).toBeCloseTo(waltzPulseDuration('bass',86),3);
  expect(events[1].duration).toBeCloseTo(waltzPulseDuration('chord',86,false,4),3);expect(events[2].duration).toBeCloseTo(waltzPulseDuration('chord',86,false,8),4);
  await page.locator('#play').click();
 }
});

test('slow waltz lifts the second chord, settles the third, and keeps Vienna and the bass unchanged',()=>{
 const grounded=waltzVoicing('chord',0,4,0,'piano',8),lifted=waltzVoicing('chord',0,4,0,'piano',4);
 expect(lifted[0].frequency).toBeGreaterThan(grounded[0].frequency);expect(lifted.at(-1)!.frequency).toBeGreaterThan(grounded.at(-1)!.frequency);
 expect(waltzPulseDuration('chord',86,false,8)).toBeLessThan(waltzPulseDuration('chord',86,false,4));
 expect(waltzPulseDuration('chord',180,true,8)).toBe(waltzPulseDuration('chord',180,true,4));
 expect(waltzPulseDuration('bass',86,false,8)).toBe(waltzPulseDuration('bass',86,false,4));
 expect(slowWaltzSwell(1.8)).toBeGreaterThan(slowWaltzSwell(0));expect(slowWaltzSwell(2.9)).toBeLessThan(slowWaltzSwell(2.2));expect(slowWaltzSwell(3)).toBeCloseTo(slowWaltzSwell(0));
 const up=waltzPulseWave('piano','chord',0,4,0,86,22050,.4,false,4),down=waltzPulseWave('piano','chord',0,4,0,86,22050,.4,false,8);
 expect(up.length).toBeGreaterThan(down.length);for(const wave of [up,down]){expect(wave.every(Number.isFinite)).toBe(true);expect(wave[0]).toBe(0);expect(Math.abs(wave.at(-1)!)).toBeLessThan(.00001);}
});


test('slow waltz keeps a lyrical foreground in normal play and every random song section',()=>{
 const tracks=presets.slowwaltz.parts.map(p=>({instrument:p.instrument,points:points(p.steps),slots:12,volume:p.volume!,enabled:true,mute:false}));
 const roles=tracks.map(tr=>waltzPulseRole(3,tr.instrument,tr.points));
 expect(tracks[4].volume).toBeGreaterThan(tracks[1].volume);
 expect(tracks[4].points[2]).toBe(true); // a melodic pickup, not another chord stroke
 for(const section of [null,'intro','verse','chorus','bridge','outro'] as const){
  const raw=tracks.map((tr,i)=>slowWaltzMix(roles[i]?1:section?.32:1,roles[i])*(section?sectionGain(section,tr.instrument,.5):1));
  const gains=balancedMix(tracks,raw);
  // Even a backing melody stays ahead of the chord fader; the pulse remains audible.
  expect(gains[4]).toBeGreaterThan(gains[1]);
  expect(gains[0]).toBeGreaterThan(0);
  const energy=(levels:number[])=>tracks.reduce((sum,tr,i)=>sum+tr.volume**2*tr.points.filter(Boolean).length/12*levels[i]**2,0);
  expect(energy(gains)).toBeCloseTo(energy(tracks.map(()=>1)),8);
 }
 expect(slowWaltzMix(0,null)).toBe(0);expect(slowWaltzMix(0,'chord')).toBe(0);
 expect(slowWaltzMix(1,null)).toBeGreaterThan(slowWaltzMix(.32,null));
 const muted=tracks.map(tr=>({...tr,mute:true}));
 expect(balancedMix(muted,muted.map(()=>1))).toEqual(muted.map(()=>0));
});
