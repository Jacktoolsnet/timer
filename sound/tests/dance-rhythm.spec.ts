import {test,expect} from '@playwright/test';
import {rhythmDances,danceRhythmRole,danceRhythmWave,rhythmDuration,rhythmBassDegree,rhythmAccent,rhythmDrums,rhythmClarity,type PulseInstrument} from '../src/lib/dance-rhythm';
import {dances} from '../src/lib/dances';
import {voiceRecipe} from '../src/lib/voice-recipes';

test('dance foundations expose their own count instead of sharing one generic beat',()=>{
 expect(dances.chacha.preset.parts[0].steps).toEqual([0,4,8,12,14]);
 expect(dances.rumba.preset.parts[0].steps).toEqual([4,8,12]);
 expect(dances.samba.preset.parts[1].steps).toEqual([0,3,4,7]);
 expect(dances.discofox.preset.parts[0].steps).toEqual([0,4,8,12]);
 expect(dances.discofox.preset.parts[2].steps).toEqual([2,6,10,14]);
 expect(dances.jive.preset.swing).toBeGreaterThan(dances.quickstep.preset.swing!);
 expect(rhythmDuration('rumba','chord',100,12)).toBeGreaterThan(60/100);
 expect(rhythmDuration('samba','bass',100,3)).toBeLessThan(60/100/4);
 expect(rhythmDuration('quickstep','chord',200,0)).toBeLessThan(rhythmDuration('slowfox','chord',116,4));
 expect(rhythmAccent('samba',0,'kick',4,.8)).toBeGreaterThan(rhythmAccent('samba',0,'kick',0,.8));
 expect(rhythmAccent('jive',1,'snare',4,.8)).toBeGreaterThan(rhythmAccent('jive',1,'snare',0,.8));
 expect(rhythmBassDegree('discofox',4,4)-rhythmBassDegree('discofox',0,4)).toBe(12);
 expect(new Set([0,4,8,12].map(s=>rhythmBassDegree('jive',s,4))).size).toBe(4);
 expect(danceRhythmRole('tango',0,'piano')).toBeNull();expect(danceRhythmRole('chacha',4,'piano')).toBeNull();
 expect(danceRhythmRole('discofox',3,'synthbass')).toBe('bass');
});

test('all new pulse voices remain finite, gated and subordinate to user volume',()=>{
 for(const dance of rhythmDances){
  const preset=dances[dance].preset;
  preset.parts.slice(0,4).forEach((part,i)=>{
   const role=danceRhythmRole(dance,i,part.instrument);if(!role)return;
   for(const step of part.steps){
    const wave=danceRhythmWave(dance,part.instrument as PulseInstrument,role,0,4,0,preset.bpm,step,22050,.4);
    expect(wave.every(Number.isFinite)).toBe(true);expect(Math.abs(wave[0])).toBe(0);expect(Math.abs(wave.at(-1)!)).toBe(0);
    let peak=0,energy=0;for(const v of wave){peak=Math.max(peak,Math.abs(v));energy+=v*v;}
    expect(peak).toBeLessThan(1.3);expect(energy).toBeGreaterThan(.1);
    expect(wave.length/22050).toBeCloseTo(rhythmDuration(dance,role,preset.bpm,step),3);
   }
  });
  for(let s=0;s<16;s++)for(let i=0;i<9;i++){
   const gain=rhythmClarity(dance,i,s);expect(gain).toBeGreaterThan(0);expect(gain).toBeLessThanOrEqual(1);if(i<4)expect(gain).toBe(1);
  }
 }
 const original=voiceRecipe('snare',true,1),copy=JSON.stringify(original),short=rhythmDrums('quickstep',1,'snare',200,original);
 expect(Math.max(...short.noise.map(n=>n.duration))).toBeLessThan(.08);expect(JSON.stringify(original)).toBe(copy);
 expect(rhythmDrums(null,1,'snare',200,original)).toBe(original);
});

const cases=[['slowfox',3],['quickstep',3],['samba',1],['chacha',0],['rumba',0],['pasodoble',2],['jive',2],['discofox',2],['discofox',3]] as const;
for(const [dance,index] of cases)test('actual '+dance+' track '+index+' keeps characteristic timing in normal and random playback',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).pulseEvents=[];const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(when=0,...args:any[]){(window as any).pulseEvents.push({time:when,duration:this.buffer?.duration||0});return start.call(this,when,...args);};
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await page.locator('[data-dance="'+dance+'"]').click();
 for(let i=0;i<9;i++){const row=page.locator('[data-track="'+i+'"]');await row.locator('summary').click();if(i!==index)await row.locator('.mute').check();}
 const preset=dances[dance].preset,part=preset.parts[index],role=danceRhythmRole(dance,index,part.instrument)!;
 // Include the next bar's first attack to check 4-&-1 and each pattern's wrap gap.
 const steps=[...part.steps,part.steps[0]+dances[dance].beats*4],swing=preset.swing||0;
 const at=(step:number)=>Array.from({length:step},(_,s)=>60/preset.bpm/4*(s%4<2?1+swing:1-swing)).reduce((a,b)=>a+b,0);
 for(const button of ['#play','#evolve']){
  await page.evaluate(()=>(window as any).pulseEvents=[]);await page.locator(button).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).pulseEvents.length),{timeout:6000}).toBeGreaterThanOrEqual(steps.length);
  const events=await page.evaluate(()=>(window as any).pulseEvents),time=events[0].time;
  for(let i=0;i<steps.length;i++){
   expect(events[i].time-time).toBeCloseTo(at(steps[i])-at(steps[0]),3);
   expect(events[i].duration).toBeCloseTo(rhythmDuration(dance,role,preset.bpm,steps[i]%(dances[dance].beats*4)),3);
  }
  await expect(page.locator('#tempo')).toHaveValue(String(preset.bpm));await page.locator('#play').click();
 }
 expect(errors).toEqual([]);
});
