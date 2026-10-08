import {applyPreset,matchingPreset,presetNames} from '../src/lib/presets.ts';
import {instrumentTone} from '../src/lib/instruments.ts';
import {naturalWind,randomWindGust,windStrengthAt,type WindGust} from '../src/lib/wind.ts';
import {summerRain,randomDrop,type RainDrop} from '../src/lib/rain.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize,defaults,randomGust,randomNote,randomGap,timeLabel} from '../src/lib/relax.ts';
test('normalizes persisted values safely',()=>{
 assert.deepEqual(normalize(null),defaults);
 const s=normalize({minutes:Infinity,density:100,noiseType:'oops',instrumentVolume:-5,safetySeen:'yes',background:false});
 assert.equal(s.minutes,15);assert.equal(s.density,10);assert.equal(s.noiseType,'pink');assert.equal(s.instrumentVolume,0);assert.equal(s.safetySeen,false);assert.equal(s.background,false);
});
test('random notes and intervals cover the palette',()=>{
 assert.equal(randomNote(()=>0).index,0);assert.equal(randomNote(()=>.999).index,7);
 assert(randomGap(1,()=>0)>randomGap(10,()=>0));assert(randomGap(5,()=>0)<randomGap(5,()=>1));
});
test('zero is unlimited and clocks round remaining time',()=>{
 assert.equal(normalize({minutes:0}).minutes,0);assert.equal(timeLabel(61.2),'1:02');assert.equal(timeLabel(-1),'0:00');
});

test('instrument selection is exclusive, including older settings',()=>{
 for(const value of [{chimes:true,bowls:true},{chimes:false,bowls:false},null]){
  const s=normalize(value);assert.equal(s.chimes,true);assert.equal(s.bowls,false);
 }
 const bowls=normalize({chimes:false,bowls:true});assert.equal(bowls.bowls,true);assert.equal(bowls.chimes,false);
});

test('wind gusts contain staggered tube strikes with a softening tail',()=>{
 for(const random of [()=>0,()=>.5,()=>.999]){
  const gust=randomGust(random);assert(gust.length>=3&&gust.length<=6);
  assert.equal(gust[0].offset,0);
  for(let i=1;i<gust.length;i++){
   assert(gust[i].offset>gust[i-1].offset);
   assert.notEqual(gust[i].index,gust[i-1].index);
   assert(gust[i].strength<gust[i-1].strength);
  }
 }
});

test('pitch defaults and limits are safe for persisted settings',()=>{
 assert.equal(normalize({}).pitch,0);assert.equal(normalize({pitch:NaN}).pitch,0);
 assert.equal(normalize({pitch:-99}).pitch,-12);assert.equal(normalize({pitch:99}).pitch,12);
 assert.equal(normalize({pitch:5}).pitch,5);
});

test('summer rain stays soft and has distinct quiet gaps between drops',()=>{
 let seed=12345;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const data=summerRain(8000,3,random);
 assert.equal(data.length,24000);
 assert(data.every(Number.isFinite));
 const peak=Math.max(...data.map(Math.abs));
 const rms=Math.sqrt(data.reduce((sum,n)=>sum+n*n,0)/data.length);
 assert(peak>.02&&peak<.3);assert(rms<.025);
 assert(peak>rms*5,'drops should stand out against a quiet background');
});

test('rain density is bounded and changes the number of drops',()=>{
 assert.equal(normalize({}).rainDensity,5);
 assert.equal(normalize({rainDensity:0}).rainDensity,1);
 assert.equal(normalize({rainDensity:100}).rainDensity,10);
 const sparse=summerRain(8000,3,()=>.7,1),dense=summerRain(8000,3,()=>.7,10);
 const energy=(a:Float32Array)=>a.reduce((sum,n)=>sum+n*n,0);
 assert(energy(dense)>energy(sparse));
});

test('rain drops mix four distinct non-metallic textures with bounded variation',()=>{
 const profiles=[0,.25,.5,.75].map(value=>randomDrop(()=>value));
 assert.equal(new Set(profiles.map(p=>p.index)).size,4);
 assert.equal(new Set(profiles.map(p=>p.cutoff)).size,4);
 assert.equal(new Set(profiles.map(p=>p.attack)).size,4);
 assert(profiles.some(p=>p.scatter));assert(profiles.some(p=>!p.scatter));
 assert(profiles.every(p=>p.duration>0&&p.duration<.15&&p.strength<.4));
});

test('wind activity affects gust strength and pauses, not constant volume',()=>{
 const gentle=randomWindGust(1,()=>.5),active=randomWindGust(10,()=>.5);
 assert(gentle.pause>active.pause);assert(gentle.strength<active.strength);
 assert.equal(normalize({}).windActivity,5);
 assert.equal(normalize({windActivity:100}).windActivity,10);
 assert.equal(normalize({windActivity:0}).windActivity,1);
});
test('natural wind has smooth gusts, real silent pauses and a soft loop ending',()=>{
 let seed=45;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const data=naturalWind(8000,40,random,5);
 assert(data.every(Number.isFinite));assert.equal(data[0],0);
 assert(data.some(n=>Math.abs(n)>.03));
 const quietWindows=Array.from({length:40},(_,i)=>data.slice(i*8000,(i+1)*8000).every(n=>n===0)).filter(Boolean);
 assert(quietWindows.length>=2);assert(Math.abs(data[data.length-1])<.0001);
});

test('rain animation defaults off and events match generated audio timing',()=>{
 assert.equal(normalize({}).rainAnimation,false);assert.equal(normalize({rainAnimation:true}).rainAnimation,true);
 const events:RainDrop[]=[];summerRain(8000,3,()=>.5,5,drop=>events.push(drop));
 assert(events.length>5);
 for(let i=0;i<events.length;i++){
  assert(events[i].time>=0&&events[i].time<3);assert(events[i].strength>0);
  if(i)assert(events[i].time>events[i-1].time);
 }
});

test('instrument animation defaults on and preserves an explicit off preference',()=>{
 assert.equal(normalize({}).instrumentAnimation,true);
 assert.equal(normalize({instrumentAnimation:false}).instrumentAnimation,false);
});

test('wind animation uses actual gust envelopes and stays still in lulls',()=>{
 assert.equal(normalize({}).windAnimation,false);
 assert.equal(normalize({windAnimation:true}).windAnimation,true);
 const gusts:WindGust[]=[];
 naturalWind(8000,40,()=>.5,5,g=>gusts.push(g));
 const gust=gusts[0];
 assert.equal(windStrengthAt(gust.time,gusts,40),0);
 assert(windStrengthAt(gust.time+gust.duration/2,gusts,40)>.2);
 assert.equal(windStrengthAt(gust.time+gust.duration+.1,gusts,40),0);
});

test('kalimba and handpan are exclusive and have distinct synthesis profiles',()=>{
 for(const instrument of ['kalimba','handpan'] as const){
  const settings=normalize({[instrument]:true,chimes:true,bowls:true});
  assert.equal(settings[instrument],true);assert.equal(settings.chimes,false);assert.equal(settings.bowls,false);
 }
 assert.equal(normalize({chimes:false,bowls:true}).bowls,true);
 const kalimba=instrumentTone('kalimba',0),handpan=instrumentTone('handpan',0);
 assert(kalimba.duration<handpan.duration);assert(kalimba.frequency>handpan.frequency);
 assert.notDeepEqual(kalimba.partials,handpan.partials);
});

test('bells, gong and harp have exclusive selection and distinct profiles',()=>{
 for(const instrument of ['bells','gong','harp'] as const){
  const settings=normalize({[instrument]:true});
  assert.equal(settings[instrument],true);
  assert.equal(settings.chimes,false);assert.equal(settings.bowls,false);
  const tone=instrumentTone(instrument,0);assert(tone.duration>0);assert(tone.peak<=.2);
 }
 assert(instrumentTone('gong',0).duration>instrumentTone('bells',0).duration);
 assert(instrumentTone('gong',0).frequency<instrumentTone('harp',0).frequency);
 assert.deepEqual(instrumentTone('harp',0).partials,[1,2,3,4,5]);
});

test('instruments can be off without losing selection and presets preserve general preferences',()=>{
 const off=normalize({...defaults,instrumentsEnabled:false,harp:true});
 assert.equal(off.instrumentsEnabled,false);assert.equal(off.harp,true);
 for(const name of presetNames){
  const original={...defaults,minutes:42,safetySeen:true,awake:true,motion:false};
  const s=applyPreset(original,name);assert.equal(matchingPreset(s),name);
  for(const key of ['minutes','safetySeen','awake','motion'] as const)assert.equal(s[key],original[key]);
 }
 const nature=applyPreset(defaults,'nature');
 assert.equal(nature.instrumentsEnabled,false);assert(nature.rain&&nature.wind);
 assert.equal(matchingPreset({...nature,rainDensity:10}),'custom');
});

test('gentle companion uses deep brown noise at ten percent',()=>{
 const settings=applyPreset(defaults,'focus');
 assert.equal(settings.noise,true);assert.equal(settings.noiseType,'brown');
 assert.equal(settings.noiseVolume,10);assert.equal(settings.kalimba,true);
});

test('summer garden uses pitch minus seven',()=>{
 assert.equal(applyPreset(defaults,'summer').pitch,-7);
});
